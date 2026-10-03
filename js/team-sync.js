(function (root) {
  'use strict';
  class Bridge {
    constructor(endpoint) {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint)) {
        throw new Error('The team connection needs a deployed Apps Script /exec URL.');
      }
      this.endpoint = endpoint;
      this.pending = new Map();
      this.ready = null;
    }

    connect() {
      if (this.ready) return this.ready;
      this.ready = new Promise((resolve, reject) => {
        const nonce = root.crypto.randomUUID();
        const frame = root.document.createElement('iframe');
        frame.hidden = true;
        frame.title = 'Team spreadsheet connection';
        const url = new URL(this.endpoint);
        url.searchParams.set('origin', root.location.origin);
        url.searchParams.set('nonce', nonce);
        const timer = root.setTimeout(() => {
          root.removeEventListener('message', receive);
          frame.remove();
          this.ready = null;
          reject(new Error('Team connection timed out. The owner must deploy the script with access set to Anyone. Changes remain saved locally.'));
        }, 60000);
        const receive = event => {
          const data = event.data;
          if (!data || data.channel !== 'npi-team-v1' || data.nonce !== nonce) return;
          if (!/^https:\/\/([a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(event.origin)
            && event.origin !== 'https://script.google.com') return;
          if (data.type === 'ready' && !this.target) {
            root.clearTimeout(timer);
            this.target = event.source;
            this.origin = event.origin;
            resolve();
          } else if (event.source === this.target && event.origin === this.origin) {
            const request = this.pending.get(data.id);
            if (!request) return;
            this.pending.delete(data.id);
            root.clearTimeout(request.timer);
            if (data.error) request.reject(new Error(data.error));
            else request.resolve(data.result);
          }
        };
        this.nonce = nonce;
        root.addEventListener('message', receive);
        frame.src = url.href;
        root.document.body.appendChild(frame);
      });
      return this.ready;
    }

    async sync(spreadsheetId, events) {
      await this.connect();
      return new Promise((resolve, reject) => {
        const id = root.crypto.randomUUID();
        const timer = root.setTimeout(() => {
          this.pending.delete(id);
          reject(new Error('Saving took too long. Changes remain queued and will retry automatically.'));
        }, 60000);
        this.pending.set(id, { resolve, reject, timer });
        this.target.postMessage({ channel: 'npi-team-v1', nonce: this.nonce, id, spreadsheetId, events }, this.origin);
      });
    }
  }

  class TeamStore extends root.TrackerSheets.Store {
    constructor(options) {
      super(options);
      this.bridge = options.bridge || new Bridge(options.endpoint);
      this.token = 'team-connection'; // Compatibility with the shared sync scheduler; not a credential.
    }

    async performSync() {
      const batch = this.state.pending.slice(0, 100);
      const result = await this.bridge.sync(this.spreadsheetId, batch);
      const remote = root.TrackerSheets.decode(result.values || []);
      if (result.spreadsheetId !== this.spreadsheetId) throw new Error('Team connection points to a different spreadsheet.');
      if (batch.some(event => !remote.revisions.has(event.revision))) {
        throw new Error('The team connection did not confirm every change. They remain queued for retry.');
      }
      const pending = this.state.pending.filter(event => !remote.revisions.has(event.revision));
      this.commit({ tasks: root.TrackerSheets.merge(remote.tasks, pending), pending });
      return this.state;
    }
  }
  root.TrackerTeam = { Bridge, TeamStore };
  if (typeof module !== 'undefined') module.exports = root.TrackerTeam;
})(typeof window !== 'undefined' ? window : globalThis);
