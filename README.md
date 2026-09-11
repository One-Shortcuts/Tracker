# NPI Setup Checklist (Setup 2026)

A sleek, responsive NPI Setup Checklist built in pure HTML, CSS, and JavaScript. It saves every task change to the browser immediately and can optionally sync changes to GitHub for team collaboration.

---

## 📋 Columns Included

| Column | Description | Key Features |
| :--- | :--- | :--- |
| **Task** | Name / Title of work item | Clickable for detailed edit view |
| **Status** | Current state | `Not Started`, `In Progress`, `In Review`, `Done`, `Blocked` (1-click quick-cycle) |
| **Priority** | Urgency level | `Urgent` (Red), `High` (Orange), `Medium` (Blue), `Low` (Gray) |
| **Description** | Detailed notes & instructions | Clickable description cell opens an instant editing modal for any teammate |
| **Assignee** | Team member responsible | Auto-generated initials avatar + filter dropdown |
| **Due Date** | Target completion date | Intelligent labels: *Overdue*, *Due today*, *Tomorrow*, or *In X days* |

---

## 🚀 How to Host on GitHub Pages (Step-by-Step)

### Step 1: Initialize Git and Push to GitHub
Open your terminal in this project folder and run:

```bash
# 1. Initialize git repository
git init

# 2. Add all files
git add .

# 3. Commit files
git commit -m "Initial commit: NPI setup checklist"

# 4. Link to your GitHub repository
git branch -M main
git remote add origin https://github.com/One-Shortcuts/Tracker.git

# 5. Push to GitHub
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub: [https://github.com/One-Shortcuts/Tracker](https://github.com/One-Shortcuts/Tracker)
2. Click **Settings** (gear icon) > **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` and folder `/ (root)`.
4. Click **Save**.
5. Within 1–2 minutes, GitHub will display your live URL:
   ```
   https://one-shortcuts.github.io/Tracker/
   ```

---

## 👥 How Team Members Collaborate & Edit Descriptions (Using GitHub Gist)

The easiest and cleanest way to collaborate is with a **GitHub Gist**:

### Step 1: Create & Connect Your Gist
1. Open your live NPI Setup Checklist: `https://one-shortcuts.github.io/Tracker/`
2. Configure the GitHub Gist connection in the deployment/backend configuration:
   - Enter your [GitHub Personal Access Token](https://github.com/settings/tokens?type=beta) with the **`gist`** scope.
   - Click **`+ Create New Gist From Current Tasks`**.
   - Your Gist will be created instantly and the **Team Share Link** will appear!

### Step 2: Share With Your Team
1. Click **Copy** on the Team Share Link (it looks like `https://one-shortcuts.github.io/Tracker/?gist=YOUR_GIST_ID`).
2. Send this URL to your teammates.
3. **When teammates open the link**:
   - The shared tasks load automatically.
   - Teammates can enter their GitHub token (with `gist` scope) once to save edits.
   - Clicking on any task's **Description** opens the editor to update notes, requirements, or progress. Any edit saves directly to the shared Gist!

---

### Alternative: GitHub Repository Sync
If you prefer committing directly to the repo's `data/tasks.json`:
1. Configure the **GitHub Repository** connection in the deployment/backend configuration.
2. Provide a Personal Access Token with **Contents: Read and Write** permissions.
3. Edits will commit directly to `data/tasks.json` on the `main` branch.

---

## 🛠 Features

- **Table View**: Compact, high-density data grid with quick-status toggles and clickable description editor.
- **Kanban Board View**: Visual drag-free cards categorized by progress status.
- **Search & Filters**: Filter by status, priority, assignee, or keyword search across tasks and descriptions.
- **CSV Export**: 1-click download of the complete NPI checklist into an Excel/Sheets-compatible CSV file.
- **Light & Dark Theme**: Automatically adapts or toggles with persistent preference.
- **Zero External Dependencies**: Pure vanilla HTML5, CSS3, and JavaScript — loads instantly on mobile and desktop.
