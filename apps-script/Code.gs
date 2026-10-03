// Deploy as a Web app: Execute as Me; Who has access: Anyone.
// Anyone who has the tracker link can read and edit its tasks.
const SPREADSHEET_ID = '1SyJ5-TLBAC-lIKfJvBVxkzKoHNltD-DilKiYvsmWMRM';
const HEADERS = ['id', 'title', 'status', 'priority', 'description', 'assignee', 'dueDate', 'updatedAt', 'deleted', 'revision'];

function doGet(e) {
  const origin = String((e.parameter || {}).origin || '');
  const nonce = String((e.parameter || {}).nonce || '');
  if (!['https://one-shortcuts.github.io', 'http://localhost:8000'].includes(origin) || !/^[a-zA-Z0-9-]{16,80}$/.test(nonce)) {
    return HtmlService.createHtmlOutput('The tracker service is deployed. Open https://one-shortcuts.github.io/Tracker/ to use it.');
  }
  const html = `<!doctype html><html><body><script>
    const origin = ${JSON.stringify(origin)};
    const nonce = ${JSON.stringify(nonce)};
    function send(message) {
      window.top.postMessage(Object.assign({ channel: 'npi-team-v1', nonce: nonce }, message), origin);
    }
    window.addEventListener('message', function(event) {
      const data = event.data;
      if (event.source !== window.top || event.origin !== origin || !data || data.channel !== 'npi-team-v1' || data.nonce !== nonce) return;
      google.script.run
        .withSuccessHandler(function(result) { send({ id: data.id, result: result }); })
        .withFailureHandler(function(error) { send({ id: data.id, error: error.message || 'Team save failed. Retry shortly.' }); })
        .syncHistory(data.spreadsheetId, data.events);
    });
    send({ type: 'ready' });
  </script></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function syncHistory(spreadsheetId, events) {
  if (spreadsheetId !== SPREADSHEET_ID) throw new Error('Unexpected spreadsheet.');
  if (!Array.isArray(events) || events.length > 100) throw new Error('Invalid change batch.');
  const incoming = events.map(validateEvent_);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Another teammate is saving. Your changes will retry automatically.');
  try {
    const book = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = book.getSheetByName('TaskHistory');
    if (!sheet) sheet = book.insertSheet('TaskHistory');
    if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    let rows = sheet.getRange(1, 1, sheet.getLastRow(), HEADERS.length).getDisplayValues();
    if (HEADERS.some((header, i) => rows[0][i] !== header)) throw new Error('TaskHistory headers do not match. Repair row 1 before syncing.');
    // Stop before writing if existing history is malformed.
    rows.slice(1).filter(row => row.some(value => value !== '')).forEach(validateRow_);
    const revisions = new Set(rows.slice(1).map(row => row[9]));
    const added = [];
    incoming.forEach(row => {
      if (!revisions.has(row[9])) {
        revisions.add(row[9]);
        added.push(row);
      }
    });
    if (added.length) {
      const extraRows = sheet.getLastRow() + added.length - sheet.getMaxRows();
      if (extraRows > 0) sheet.insertRowsAfter(sheet.getMaxRows(), Math.max(extraRows, 100));
      const range = sheet.getRange(sheet.getLastRow() + 1, 1, added.length, HEADERS.length);
      // Treat titles/descriptions as text, including strings beginning with '='.
      range.setNumberFormat('@');
      range.setValues(added.map(row => row.map(value => value.startsWith('=') ? "'" + value : value)));
      SpreadsheetApp.flush();
      rows = sheet.getRange(1, 1, sheet.getLastRow(), HEADERS.length).getDisplayValues();
    }
    return { spreadsheetId: SPREADSHEET_ID, values: rows };
  } finally {
    lock.releaseLock();
  }
}

function validateEvent_(event) {
  if (!event || !event.task || typeof event.deleted !== 'boolean' || typeof event.revision !== 'string') throw new Error('Invalid task change.');
  const row = HEADERS.slice(0, 8).map(key => event.task[key] == null ? '' : event.task[key]);
  row.push(String(event.deleted), event.revision);
  validateRow_(row);
  return row;
}

function validateRow_(row) {
  if (row.length !== 10 || row.some(value => typeof value !== 'string' || value.length > 20000)
    || !/^[a-zA-Z0-9_-]+$/.test(row[0]) || !row[9]
    || !['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked'].includes(row[2])
    || !['Low', 'Medium', 'High', 'Urgent'].includes(row[3])
    || (row[6] && !/^\d{4}-\d{2}-\d{2}$/.test(row[6]))
    || !['true', 'false'].includes(row[8].toLowerCase())) {
    throw new Error('Invalid task history fields. No changes were saved.');
  }
}
