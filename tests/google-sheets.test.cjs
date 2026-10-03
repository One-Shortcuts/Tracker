const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { Store, HEADERS, decode } = require('../js/google-sheets.js');
const task = (id, title = id) => ({ id, title, status: 'Not Started', priority: 'Medium', description: '', assignee: '', dueDate: '', updatedAt: '2026-10-03T00:00:00Z' });
const row = (t, revision, deleted = false) => [...HEADERS.slice(0, 8).map(k => t[k]), String(deleted), revision];

test('default fetch uses the browser window as its receiver', async () => {
  let calls = 0;
  const browser = {};
  browser.fetch = function () {
    if (this !== browser) throw new TypeError('Illegal invocation');
    calls++;
    return Promise.resolve({ ok: true, json: async () => ({ values: [HEADERS] }) });
  };
  const context = vm.createContext({ window: browser, fetch: browser.fetch, AbortSignal });
  vm.runInContext(fs.readFileSync(require.resolve('../js/google-sheets.js'), 'utf8'), context);
  const store = new browser.TrackerSheets.Store({
    spreadsheetId: 'sheet', storage: { getItem: () => null, setItem() {} }
  });
  store.token = 'token';
  await store.sync();
  assert.equal(calls, 1);
  assert.equal(store.state.tasks.length, 0);
});
function fixture(rows = []) {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  const api = { rows: [HEADERS, ...rows], posts: 0, fail: 0, loseResponse: false, duringWrite: null };
  const fetcher = async (url, options) => {
    assert.match(options.headers.Authorization, /^Bearer /);
    if (api.fail) return { ok: false, status: api.fail };
    if (options.method === 'POST') {
      assert.match(url, /valueInputOption=RAW/);
      api.posts++;
      api.rows.push(...JSON.parse(options.body).values);
      if (api.duringWrite) { const fn = api.duringWrite; api.duringWrite = null; fn(); }
      if (api.loseResponse) { api.loseResponse = false; throw new Error('Lost response'); }
      return { ok: true, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({ values: structuredClone(api.rows) }) };
  };
  const make = (id = 'sheet') => { const store = new Store({ spreadsheetId: id, storage, fetcher }); store.token = 'token'; return store; };
  return { api, storage, make, store: make() };
}

test('empty sheet remains empty; remote tasks load without writing', async () => {
  const { store, api } = fixture();
  await store.sync();
  assert.deepEqual(store.state.tasks, []);
  assert.equal(api.posts, 0);
  api.rows.push(row(task('a'), 'r1'));
  await store.sync();
  assert.equal(store.state.tasks[0].id, 'a');
});

test('create, edit, delete retain all history and a deletion marker', async () => {
  const { store, api } = fixture();
  store.edit([task('a', '=SUM(1,2)')]);
  await store.sync();
  store.edit([task('a', 'edited')]);
  await store.sync();
  store.edit([]);
  await store.sync();
  assert.equal(api.rows.length, 4);
  assert.equal(api.rows[1][1], '=SUM(1,2)');
  assert.equal(api.rows[3][8], 'true');
  assert.equal(store.state.tasks.length, 0);
  assert.equal(store.state.pending.length, 0);
});

test('a lost append response is reconciled without duplicating the write', async () => {
  const { store, api, make } = fixture();
  store.edit([task('a')]);
  api.loseResponse = true;
  await assert.rejects(store.sync(), /Lost response/);
  assert.equal(store.state.pending.length, 1);
  const reopened = make();
  await reopened.sync();
  assert.equal(api.posts, 1);
  assert.equal(reopened.state.pending.length, 0);
});

test('another task edited remotely is preserved when an offline change syncs', async () => {
  const { store, api } = fixture([row(task('a'), 'r1'), row(task('b'), 'r2')]);
  await store.sync();
  store.edit([task('a', 'local'), task('b')]);
  api.rows.push(row(task('b', 'remote'), 'r3'));
  await store.sync();
  assert.deepEqual(store.state.tasks.map(t => t.title), ['local', 'remote']);
});

test('edits made during upload save automatically in the same sync cycle', async () => {
  const { store, api, make } = fixture();
  store.edit([task('a')]);
  api.duringWrite = () => store.edit([task('a', 'newer')]);
  await store.sync();
  assert.equal(store.state.tasks[0].title, 'newer');
  assert.equal(store.state.pending.length, 0);
  assert.equal(api.posts, 2);
  const reopened = make();
  await reopened.sync();
  assert.equal(reopened.state.pending.length, 0);
  assert.equal(decode(api.rows).tasks[0].title, 'newer');
});

test('permission errors and expiry keep the outbox', async () => {
  const { store, api } = fixture();
  store.edit([task('a')]);
  api.fail = 403;
  await assert.rejects(store.sync(), /denied access/);
  assert.equal(store.state.pending.length, 1);
  api.fail = 401;
  await assert.rejects(store.sync(), /session expired/);
  assert.equal(store.token, '');
  assert.equal(store.state.pending.length, 1);
});

test('invalid remote data stops writes and preserves local pending tasks', async () => {
  const { store, api } = fixture();
  store.edit([task('a')]);
  api.rows = [['wrong headers']];
  await assert.rejects(store.sync(), /headers/);
  assert.equal(api.posts, 0);
  assert.equal(store.state.pending.length, 1);
});

test('cache is isolated by spreadsheet and storage failure rejects an edit', () => {
  const { store, make, storage } = fixture();
  store.edit([task('a')]);
  assert.equal(make('other').state.tasks.length, 0);
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => store.edit([]), /quota/);
  assert.equal(store.state.tasks.length, 1);
});

test('duplicate revisions cannot resurrect an earlier state', () => {
  const rows = [HEADERS, row(task('a'), 'r1'), row(task('a', 'new'), 'r2'), row(task('a'), 'r1')];
  assert.equal(decode(rows).tasks[0].title, 'new');
});

test('invalid sheet fields are rejected before they can reach HTML templates', () => {
  assert.throws(() => decode([HEADERS, row(task("bad'id"), 'r1')]), /invalid task fields/);
});
