const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
function boot({ team = false, bridge } = {}) {
  const elements = new Map();
  const element = () => ({ style: {}, value: '', textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, focus() {}, setAttribute() {} });
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements.set(match[1], element());
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
  let oauth;
  const ctx = vm.createContext({
    console, structuredClone, crypto: globalThis.crypto,
    TrackerSheets: require('../js/google-sheets.js'),
    TRACKER_TEAM_CONFIG: { endpoint: team ? 'https://script.google.com/macros/s/test/exec' : '' },
    TrackerTeam: { TeamStore: class extends require('../js/team-sync.js').TeamStore {
      constructor(options) { super({ ...options, bridge }); }
    } },
    document: { getElementById: id => elements.get(id), createElement: element, documentElement: element(), addEventListener() {} },
    localStorage: storage, sessionStorage: storage,
    addEventListener() {}, setInterval() {}, setTimeout() {}, confirm: () => true,
    google: { accounts: { oauth2: { initTokenClient(options) { oauth = options; return { requestAccessToken() {} }; }, revoke() {} } } }
  });
  ctx.window = ctx;
  vm.runInContext(script, ctx);
  return { ctx, elements, storage, oauth: () => oauth };
}

test('tracker initializes without old backend or broken DOM references', () => {
  const { ctx, elements } = boot();
  assert.equal(elements.get('metricTotal').textContent, 0);
  vm.runInContext('openSyncModal()', ctx);
  assert.match(elements.get('sheetsUrlInput').value, /1SyJ5-TLBAC/);
  assert.doesNotMatch(html, /supabase|api.github.com/);
});

test('connect settings, offline CRUD, and disconnect preserve pending work', async () => {
  const { ctx, elements, oauth } = boot();
  vm.runInContext('openSyncModal()', ctx);
  elements.get('googleClientInput').value = 'test.apps.googleusercontent.com';
  vm.runInContext('saveSyncSettings()', ctx);
  assert.equal(oauth().scope, 'https://www.googleapis.com/auth/spreadsheets');
  elements.get('taskTitleInput').value = 'Test task';
  elements.get('taskStatusInput').value = 'Not Started';
  elements.get('taskPriorityInput').value = 'Medium';
  await vm.runInContext('handleTaskFormSubmit({preventDefault(){}})', ctx);
  assert.equal(vm.runInContext('sheetsStore.state.pending.length', ctx), 1);
  assert.equal(vm.runInContext('tasks[0].title', ctx), 'Test task');
  await vm.runInContext('updateTaskStatus(tasks[0].id, "Done")', ctx);
  assert.equal(vm.runInContext('sheetsStore.state.pending.length', ctx), 2);
  await vm.runInContext('deleteTask(tasks[0].id)', ctx);
  assert.equal(vm.runInContext('tasks.length', ctx), 0);
  await vm.runInContext('disconnectSync()', ctx);
  assert.equal(vm.runInContext('sheetsStore.state.pending.length', ctx), 3);
  assert.equal(vm.runInContext('sheetsStore.token', ctx), '');
});


test('team mode loads automatically and saves creates, edits and descriptions without sign-in or manual sync', async () => {
  const { HEADERS } = require('../js/google-sheets.js');
  const rows = [HEADERS];
  const bridge = { sync: async (spreadsheetId, events) => {
    for (const event of events) rows.push([...HEADERS.slice(0, 8).map(key => event.task[key] || ''), String(event.deleted), event.revision]);
    return { spreadsheetId, values: structuredClone(rows) };
  } };
  const { ctx, elements, oauth } = boot({ team: true, bridge });
  await vm.runInContext('sheetsStore.running', ctx);
  assert.equal(oauth(), undefined);
  assert.equal(elements.get('openSyncBtn').hidden, true);
  elements.get('taskTitleInput').value = 'Automatic create';
  elements.get('taskStatusInput').value = 'Not Started';
  elements.get('taskPriorityInput').value = 'Medium';
  await vm.runInContext('handleTaskFormSubmit({preventDefault(){}})', ctx);
  assert.equal(rows[1][1], 'Automatic create');
  vm.runInContext('editTask(tasks[0].id)', ctx);
  elements.get('taskTitleInput').value = 'Automatic edit';
  await vm.runInContext('handleTaskFormSubmit({preventDefault(){}})', ctx);
  assert.equal(rows[2][1], 'Automatic edit');
  vm.runInContext('openDescEditor(tasks[0].id)', ctx);
  elements.get('quickDescInput').value = 'Automatic description';
  await vm.runInContext('saveQuickDescription()', ctx);
  assert.equal(rows[3][4], 'Automatic description');
  assert.equal(vm.runInContext('sheetsStore.state.pending.length', ctx), 0);
  assert.equal(elements.get('syncStatus').textContent, 'Saved to Google Sheets');
});
