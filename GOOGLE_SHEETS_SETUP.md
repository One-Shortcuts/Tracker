# Connect the tracker to Google Sheets

For the new **anyone-with-the-link, no-sign-in** mode, use [the team sharing setup](TEAM_SHARING_SETUP.md). The instructions below describe the existing per-user Google sign-in mode, which remains active until a team endpoint is configured.

The tracker keeps its existing website, table, Kanban board, task editor, and CSV export. Google Sheets replaces Supabase. Each teammate signs in to Google from the tracker; the spreadsheet stays private and must be shared with them as an Editor.

## 1. Create the spreadsheet

1. Open [your selected Google Sheet](https://docs.google.com/spreadsheets/d/1SyJ5-TLBAC-lIKfJvBVxkzKoHNltD-DilKiYvsmWMRM/edit). Its link is already prefilled in the tracker. You can also choose a different spreadsheet.
2. Add a blank tab named **TaskHistory** (exact spelling), or rename an existing blank tab. Preserve any existing data in other tabs.
3. Copy the following tab-separated line into cell **A1**. It must fill columns A through J:

```text
id	title	status	priority	description	assignee	dueDate	updatedAt	deleted	revision
```

4. Share the spreadsheet with each teammate's Google account as **Editor**. Do not publish it to the web.
5. Copy the spreadsheet URL.

Start with only the header row. The website adds tasks as you work; it does not load starter tasks or upload old browser copies automatically.

## 2. Enable Google's API and sign-in

This is a one-time setup by the tracker owner, following [Google's browser integration guide](https://developers.google.com/workspace/sheets/api/quickstart/js).

Your supplied OAuth client ID is already configured as the default in the website. Use the steps below to check its Google project settings or to configure a replacement.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Under **APIs & Services → Library**, enable **Google Sheets API**.
3. Configure **Google Auth Platform**: enter the application name and contact email under **Branding**. Choose an **Internal** audience if you have a suitable Workspace organization, or **External** for personal Gmail accounts.
4. For an External app in Testing, add yourself and every teammate under **Audience → Test users**. Broader production use may require Google verification.
5. Under **Data Access**, add `https://www.googleapis.com/auth/spreadsheets`. This scope allows reading and writing spreadsheets accessible to the signed-in account; Google does not limit it to the one configured spreadsheet. The tracker sends requests only to the selected spreadsheet.
6. Under **Clients**, create an OAuth client with type **Web application**.
7. Add **Authorized JavaScript origins** for where the tracker runs. For this project's GitHub Pages site, use `https://one-shortcuts.github.io` (no `/Tracker/` path). For local testing, add `http://localhost:8000`.
8. Copy the **client ID**, which ends in `.apps.googleusercontent.com`. Do not copy or place a client secret in this website. This integration uses OAuth directly and does not require an API key.

## 3. Connect from the website

1. Publish the updated project files to your existing website host, including `js/google-sheets.js` and this guide. Supabase is no longer contacted by the updated site.
2. Open the updated tracker and click **Google Sheets**.
3. The supplied spreadsheet link and OAuth client ID are prefilled. Check them, then click **Connect Google**. Previously saved browser settings take precedence over these defaults.
4. Choose an account with Editor access and grant the requested permission.
5. Add a task. Check for **Saved to Google Sheets** and a new row in **TaskHistory**.
6. Open the tracker on a second device, connect using the prefilled settings, and sign in. Use **Sync now** to check shared changes immediately.

The connection settings are saved per browser. Access tokens stay in memory, so reconnect after reloading or when Google authorization expires. The Google sign-in popup must be allowed. Serve the site over HTTPS or localhost, not by opening `index.html` as a local file.

## How saving and history work

- Each change appends a task revision to **TaskHistory**, including all task fields. Deletion appends a revision with `deleted` set to `true`. Old revisions remain in the sheet.
- The last appended revision for each task ID determines its current state. If two teammates change the same task, the last synced revision wins; earlier revisions remain available. Edits to different tasks do not replace one another.
- Keep task editing in the website. Do not sort, delete, or change rows in **TaskHistory**: row order determines the latest revision. Use a separate tab if you want spreadsheet reports.
- Changes are saved on the device before upload. A failed upload stays pending for retry. Pending changes survive a browser restart if browser storage is available and is not cleared. Settings and local task copies are separated by spreadsheet ID.
- **Sync now** retries pending changes; connected, visible tabs also refresh every 30 seconds. This is periodic sync, not Supabase realtime.
- For recovery, find an earlier revision of the task, copy its A–I values into a new row at the bottom, set `deleted` to `false`, and give column J a new unique revision value (for example `restore-2026-10-03-task-name-1`). Then sync the tracker. Preserve the original rows.
- Export CSV periodically and keep a separate copy of the spreadsheet. History in the same spreadsheet is useful but is not an independent backup.

The website does not import the previous Supabase export. Its old browser storage keys are left untouched. Switching to Sheets cannot recover data already lost from Supabase.

## Troubleshooting

- **Origin mismatch:** the OAuth client's authorized origin must exactly match the site's scheme, hostname, and port. Paths are not part of an origin.
- **Google denied access:** check the signed-in account has Editor access, the Sheets API is enabled, the account is an allowed test user if applicable, and spreadsheet access was granted during consent.
- **Headers do not match / invalid row:** check the TaskHistory name and A1:J1 header values. Repair malformed rows before retrying; the tracker stops rather than overwriting the sheet.
- **Session expired:** click Google Sheets and connect again. Pending edits remain queued.
- **Browser storage unavailable:** the tracker will reject edits it cannot save locally. Export before closing the tab and enable browser storage.

## Verify locally

```bash
node --test tests/google-sheets.test.cjs tests/tracker-ui.test.cjs
python3 -m http.server 8000
```

Open `http://localhost:8000`. Real OAuth and Sheets access require your Google project and spreadsheet; automated tests use a simulated Sheets API.
