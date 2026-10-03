(function (root) {
  'use strict';
  const HEADERS = ['id', 'title', 'status', 'priority', 'description', 'assignee', 'dueDate', 'updatedAt', 'deleted', 'revision'];
  const RANGE = "'TaskHistory'!A:J";

  function decode(rows) {
    if (!rows.length || HEADERS.some((header, i) => rows[0][i] !== header)) {
      throw new Error('TaskHistory headers do not match. Follow the Google Sheets setup guide.');
    }
    const latest = new Map();
    const revisions = new Set();
    for (const row of rows.slice(1)) {
      if (row.every(value => value === '')) continue;
      if (!row[0] || !row[9] || !['true', 'false'].includes(String(row[8]).toLowerCase())) {
        throw new Error('TaskHistory contains an invalid row. Restore its original values before syncing.');
      }
      if (revisions.has(row[9])) continue;
      revisions.add(row[9]);
      const task = Object.fromEntries(HEADERS.slice(0, 8).map((key, i) => [key, String(row[i] ?? '')]));
      if (!/^[a-zA-Z0-9_-]+$/.test(task.id)
        || !['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked'].includes(task.status)
        || !['Low', 'Medium', 'High', 'Urgent'].includes(task.priority)
        || (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))) {
        throw new Error('TaskHistory contains invalid task fields. Restore the original row before syncing.');
      }
      latest.set(task.id, String(row[8]).toLowerCase() === 'true' ? null : task);
    }
    return { tasks: [...latest.values()].filter(Boolean), revisions };
  }

  function merge(tasks, pending) {
    const latest = new Map(tasks.map(task => [task.id, task]));
    for (const event of pending) {
      if (event.deleted) latest.delete(event.task.id);
      else latest.set(event.task.id, event.task);
    }
    return [...latest.values()];
  }

  class Store {
    constructor({ spreadsheetId, storage, fetcher = (...args) => root.fetch(...args), uuid = () => crypto.randomUUID() }) {
      this.spreadsheetId = spreadsheetId;
      this.storage = storage;
      this.fetcher = fetcher;
      this.uuid = uuid;
      this.key = 'npi_google_sheets_v1:' + spreadsheetId;
      const saved = storage.getItem(this.key);
      this.state = saved ? JSON.parse(saved) : { tasks: [], pending: [] };
      if (!Array.isArray(this.state.tasks) || !Array.isArray(this.state.pending)) {
        throw new Error('The saved checklist is invalid. Preserve your browser data before continuing.');
      }
      this.token = '';
      this.running = null;
    }

    commit(state) {
      // Save both the visible tasks and outbox together before accepting changes.
      this.storage.setItem(this.key, JSON.stringify(state));
      this.state = state;
    }

    edit(tasks) {
      const before = new Map(this.state.tasks.map(task => [task.id, task]));
      const after = new Map(tasks.map(task => [task.id, task]));
      const pending = [...this.state.pending];
      for (const task of tasks) {
        if (JSON.stringify(before.get(task.id)) !== JSON.stringify(task)) {
          pending.push({ task: { ...task }, deleted: false, revision: this.uuid() });
        }
      }
      for (const [id, task] of before) {
        if (!after.has(id)) pending.push({ task: { ...task, updatedAt: new Date().toISOString() }, deleted: true, revision: this.uuid() });
      }
      this.commit({ tasks: tasks.map(task => ({ ...task })), pending });
    }

    async request(path, options = {}) {
      if (!this.token) throw new Error('Connect Google to sync. Your pending changes stay on this device.');
      const response = await this.fetcher('https://sheets.googleapis.com/v4/spreadsheets/' + this.spreadsheetId + path, {
        ...options,
        headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000)
      });
      if (response.status === 401) {
        this.token = '';
        throw new Error('Google session expired. Connect Google again to save pending changes.');
      }
      if (!response.ok) {
        const messages = {
          400: 'Check that the spreadsheet has a TaskHistory tab with the required headers.',
          403: 'Google denied access. Check Sheet Editor sharing, Sheets API enablement, and consent.',
          404: 'Spreadsheet not found. Check its link and your Google account.',
          429: 'Google is busy. Pending changes are saved locally; retry shortly.'
        };
        throw new Error(messages[response.status] || 'Google Sheets is unavailable. Pending changes remain on this device.');
      }
      return response.json();
    }

    async read() {
      const result = await this.request('/values/' + encodeURIComponent(RANGE));
      return decode(result.values || []);
    }

    sync() {
      if (!this.running) this.running = this.performSync().finally(() => { this.running = null; });
      return this.running;
    }

    async performSync() {
      let remote = await this.read();
      const batch = this.state.pending.filter(event => !remote.revisions.has(event.revision));
      if (batch.length) {
        const values = batch.map(event => [
          ...HEADERS.slice(0, 8).map(key => String(event.task[key] ?? '')),
          String(event.deleted), event.revision
        ]);
        // RAW keeps descriptions/titles beginning with '=' as text, not formulas.
        // Appending avoids two devices choosing and overwriting the same row.
        await this.request('/values/' + encodeURIComponent(RANGE) + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
          method: 'POST', body: JSON.stringify({ values })
        });
        remote = await this.read();
      }
      // Use the current outbox: edits may have happened during the network calls.
      const pending = this.state.pending.filter(event => !remote.revisions.has(event.revision));
      this.commit({ tasks: merge(remote.tasks, pending), pending });
      return this.state;
    }
  }

  root.TrackerSheets = { Store, HEADERS, decode, merge };
  if (typeof module !== 'undefined') module.exports = root.TrackerSheets;
})(typeof window !== 'undefined' ? window : globalThis);
