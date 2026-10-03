const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { HEADERS } = require('../js/google-sheets.js');
const { TeamStore, Bridge } = require('../js/team-sync.js');
const sheetId = '1SyJ5-TLBAC-lIKfJvBVxkzKoHNltD-DilKiYvsmWMRM';
const change = (revision, title = 'Task') => ({ revision, deleted: false, task: { id: 'task-1', title, status: 'Not Started', priority: 'Medium', description: '', assignee: '', dueDate: '', updatedAt: '2026-10-03T00:00:00Z' } });
function server(initial = []) {
  let rows = structuredClone(initial);
  let released = 0;
  const sheet = {
    getLastRow: () => rows.length, getMaxRows: () => 1000, insertRowsAfter() {},
    getRange(start, column, count) {
      return {
        getDisplayValues: () => structuredClone(rows.slice(start - 1, start - 1 + count)),
        setNumberFormat() {},
        setValues(values) {
          values.forEach((row, i) => { rows[start - 1 + i] = row.map(value => value.startsWith("'=") ? value.slice(1) : value); });
        }
      };
    }
  };
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => released++ }) }
  });
  vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), context);
  return { sync: (events, id = sheetId) => context.syncHistory(id, events), rows: () => rows, released: () => released };
}

test('anonymous service initializes headers and preserves history with idempotent retries', () => {
  const api = server();
  api.sync([change('r1', '=SUM(1,2)')]);
  api.sync([change('r1'), change('r2', 'Edited')]);
  api.sync([{ ...change('r3'), deleted: true }]);
  assert.equal(api.rows().length, 4);
  assert.equal(api.rows()[1][1], '=SUM(1,2)');
  assert.equal(api.rows()[2][1], 'Edited');
  assert.equal(api.rows()[3][8], 'true');
  assert.equal(api.released(), 3);
});

test('invalid requests and malformed existing history never write', () => {
  const api = server([HEADERS]);
  assert.throws(() => api.sync([change('r1')], 'other'), /Unexpected/);
  assert.throws(() => api.sync([{ ...change('r1'), deleted: 'false' }]), /Invalid/);
  assert.equal(api.rows().length, 1);
  const corrupt = server([['bad header']]);
  assert.throws(() => corrupt.sync([change('r1')]), /headers/);
  assert.equal(corrupt.rows().length, 1);
  assert.equal(corrupt.released(), 1);
});

test('team store saves and loads without a Google token, preserving legacy cache key', async () => {
  const api = server();
  const memory = new Map();
  const store = new TeamStore({ spreadsheetId: sheetId,
    storage: { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) },
    bridge: { sync: async (id, events) => api.sync(events, id) }
  });
  store.edit([change('unused').task]);
  await store.sync();
  assert.equal(store.state.pending.length, 0);
  assert.equal(store.state.tasks[0].title, 'Task');
  assert.ok(memory.has('npi_google_sheets_v1:' + sheetId));
});

test('team store drains edits created while a save is in flight', async () => {
  const api = server();
  let duringSave;
  const store = new TeamStore({ spreadsheetId: sheetId,
    storage: { getItem: () => null, setItem() {} },
    bridge: { sync: async (id, events) => {
      const result = api.sync(events, id);
      if (duringSave) { const action = duringSave; duringSave = null; action(); }
      return result;
    } }
  });
  store.edit([change('unused').task]);
  duringSave = () => store.edit([change('unused', 'Newer').task]);
  await store.sync();
  assert.equal(api.rows().length, 3);
  assert.equal(store.state.tasks[0].title, 'Newer');
  assert.equal(store.state.pending.length, 0);
});

test('bridge rejects unrelated messages and accepts the Apps Script iframe reply', async () => {
  let receive;
  let message;
  let frame;
  const target = { postMessage(data) { message = data; } };
  const browser = {
    TrackerSheets: globalThis.TrackerSheets,
    crypto: { randomUUID: () => 'nonce-1234567890123456' },
    location: { origin: 'https://one-shortcuts.github.io' },
    document: { createElement: () => ({ remove() {} }), body: { appendChild(element) { frame = element; } } },
    setTimeout: () => 1, clearTimeout() {}, addEventListener(name, fn) { receive = fn; }, removeEventListener() {}
  };
  const context = vm.createContext({ window: browser, URL });
  vm.runInContext(fs.readFileSync('js/team-sync.js', 'utf8'), context);
  const bridge = new browser.TrackerTeam.Bridge('https://script.google.com/macros/s/deployment/exec');
  const ready = bridge.connect();
  const data = { channel: 'npi-team-v1', nonce: 'nonce-1234567890123456', type: 'ready' };
  receive({ data, origin: 'https://evil.example', source: target });
  assert.equal(bridge.target, undefined);
  const origin = 'https://n-example-0lu-script.googleusercontent.com';
  receive({ data, origin, source: target });
  await ready;
  assert.match(frame.src, /origin=https%3A%2F%2Fone-shortcuts.github.io/);
  const pending = bridge.sync(sheetId, []);
  await Promise.resolve();
  receive({ data: { ...message, result: { values: [HEADERS] } }, origin, source: {} });
  assert.equal(bridge.pending.size, 1);
  receive({ data: { ...message, result: { values: [HEADERS] } }, origin, source: target });
  assert.deepEqual((await pending).values, [HEADERS]);
});
