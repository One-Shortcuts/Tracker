const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
function boot() {
  const elements = new Map();
  const element = () => ({ style: {}, value: '', textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, focus() {}, setAttribute() {} });
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements.set(match[1], element());
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
  let oauth;
  const ctx = vm.createContext({
    console, structuredClone, crypto: globalThis.crypto,
    TrackerSheets: require('../js/google-sheets.js'),
    document: { getElementById: id => elements.get(id), createElement: element, documentElement: element() },
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
