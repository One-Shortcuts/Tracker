# NPI Setup Checklist (Setup 2026)

A sleek, responsive NPI Setup Checklist built in pure HTML, CSS, and JavaScript. It saves changes locally and syncs the shared checklist across team devices through Supabase realtime.

---

## 📋 Columns Included

| Column | Description | Key Features |
| :--- | :--- | :--- |
| **Task** | Name / Title of work item | Clickable for detailed edit view |
| **Status** | Current state | Dropdown options: `Not Started`, `In Progress`, `In Review`, `Done`, `Blocked` |
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

## 👥 Shared Team Sync (Supabase)

The live checklist uses Supabase as its shared backend. Additions, edits, status changes, and deletions sync across team devices in realtime.

### One-time Supabase setup

1. Open the Supabase SQL Editor for the project.
2. Create a new query and paste the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**.
4. Open the live tracker: `https://one-shortcuts.github.io/Tracker/`

The SQL creates the shared state table, Row Level Security policies, and realtime publication. Team members do not need to configure sync settings in the tracker.

### Security note

The frontend uses a Supabase publishable key, which is intended for browser use. The included policies allow anyone with the tracker URL to read and edit the checklist. For a private team, add Supabase Authentication and restrict the policies to authenticated users. Never put a Supabase service-role key in the frontend.

---

## 🛠 Features

- **Table View**: Compact, high-density data grid with quick-status toggles and clickable description editor.
- **Kanban Board View**: Visual drag-free cards categorized by progress status.
- **Search & Filters**: Filter by status, priority, assignee, or keyword search across tasks and descriptions.
- **CSV Export**: 1-click download of the complete NPI checklist into an Excel/Sheets-compatible CSV file.
- **Light & Dark Theme**: Automatically adapts or toggles with persistent preference.
- **Lightweight Frontend**: Vanilla HTML5, CSS3, and JavaScript with Supabase realtime sync.
