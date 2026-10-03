# Automatic saving for anyone with the tracker link

This mode lets anyone with the tracker link read, create, edit, and delete tasks without Google sign-in. The Google Sheet can remain private. A Google Apps Script Web app runs as the Sheet owner and writes to TaskHistory on behalf of visitors.

The website and script are ready, but team mode activates only after the owner deploys the script and its Web app URL is added to `js/team-config.js`. Until then, the existing Google sign-in connection keeps working.

## One-time owner setup

1. Open [your spreadsheet](https://docs.google.com/spreadsheets/d/1SyJ5-TLBAC-lIKfJvBVxkzKoHNltD-DilKiYvsmWMRM/edit), then choose **Extensions → Apps Script**.
2. If this opens an existing project with scripts you use, create a separate project at [script.google.com](https://script.google.com/) instead. In a new project, replace the sample contents of **Code.gs** with the complete contents of [apps-script/Code.gs](apps-script/Code.gs). The spreadsheet ID is already set. Save the project.
3. Choose **Deploy → New deployment**, select **Web app**, and set:
   - **Execute as:** Me (your Sheet owner account).
   - **Who has access:** Anyone. Do not choose “Anyone with Google account.”
4. Click **Deploy**, review and authorize the spreadsheet access Google requests, then copy the **Web app URL** ending in `/exec`. Google may show an unverified-app notice for your own new script; review the project and permissions before authorizing it. If your Workspace policy does not allow “Anyone,” ask the administrator or use an account where that deployment option is available.
5. Send the Web app URL back to the person updating the tracker, or put it in `endpoint` in **js/team-config.js** and publish that file to GitHub Pages.

Example configuration:

```javascript
window.TRACKER_TEAM_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};
```

You do not need to share the spreadsheet itself with teammates, change the OAuth client, or make the spreadsheet public. You are granting public access to tracker task data through the service, as requested. Treat the tracker link as something that can be forwarded: it does not identify or restrict visitors.

Google's instructions: [deploying Apps Script Web apps](https://developers.google.com/apps-script/guides/web).

## What happens automatically

- Opening the tracker loads the current shared tasks; no sign-in or Connect step is shown.
- Creating a task, saving a task edit, updating a status, or saving a description immediately saves to the Sheet. Deletion also saves automatically as a history entry.
- Edits made during another save are sent automatically afterward.
- Shared changes refresh every 30 seconds and when you return to the tab.
- Failed uploads stay queued on the device and retry while the tab is open, visible, and connected. They also retry when internet access returns. Keep browser storage enabled and do not clear it while changes are pending.
- Share the website URL directly with teammates. The header shows sync status; saving and retries run automatically.
- Every revision stays in **TaskHistory**. Concurrent saves use a server lock, and repeated requests are deduplicated by revision ID. If two people edit the same task, the last synced revision determines the current task; older versions remain in the history.

Use the website for task edits. Do not sort or remove TaskHistory rows, because row order identifies the latest revision. History is in the same Sheet, so keep independent exports/backups as well.

## Check after activation

1. Open the tracker in a private/incognito browser window. It should load tasks without a Google login.
2. Create a test task. Wait for **Saved to Google Sheets** and confirm a new TaskHistory row.
3. Edit its title and description; each save should create a new history row automatically.
4. Open the tracker on a second device. The task should appear, and changes should become visible within 30 seconds.
5. Disable your connection, make an edit, then reconnect. The pending edit should upload automatically.

These live checks require the owner's deployed Apps Script. Automated tests cover the save flow using a simulated service, including task creation/editing, history preservation, retries, and message validation.

## Updating the script later

After changing Code.gs, use **Deploy → Manage deployments → Edit → New version → Deploy**. This keeps the existing `/exec` URL. Saving the script alone does not update an existing versioned deployment.

If connection times out, verify the deployment uses **Execute as Me**, access **Anyone**, and the `/exec` URL. The embedded bridge uses Apps Script's supported `google.script.run` interface instead of an unreadable cross-origin fetch response. Quotas and availability follow your Google Apps Script account limits.
