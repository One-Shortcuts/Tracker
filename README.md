# Project Tracker (Setup 2026)

A sleek, responsive, and collaborative Project Tracker built in pure HTML, CSS, and JavaScript. Designed to be hosted for free on **GitHub Pages**, allowing team members to view, add, and edit tasks and descriptions in real time.

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
git commit -m "Initial commit: Project tracker with GitHub sync"

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

## 👥 How Team Members Collaborate & Edit Descriptions

Because GitHub Pages is a static host without a traditional database, the tracker includes a **direct GitHub Repository Sync** engine:

### For Each Team Member:
1. Open the hosted project tracker URL.
2. Click the **GitHub Sync** button in the top right.
3. Enter:
   - **Repo Owner**: The GitHub username or organization name.
   - **Repository Name**: The repository name (e.g. `setup-2026-checklist`).
   - **Personal Access Token (PAT)**:
     - Generate a fine-grained token at [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens?type=beta).
     - Under **Repository access**, select your tracker repository.
     - Under **Permissions > Repository permissions**, set **Contents** to **Read and write**.
4. Click **Connect & Sync**.

### How It Syncs:
- **Instant Save**: Whenever a teammate creates a task or clicks a description to edit it, the change is committed directly to `data/tasks.json` in the GitHub repo.
- **Team Updates**: When opening the page, the tracker automatically pulls the latest `data/tasks.json` from GitHub.
- **Local Fallback**: If a teammate doesn't have a GitHub account or token, changes are stored safely in their browser's `localStorage` and can be exported as CSV or JSON.

---

## 🛠 Features

- **Table View**: Compact, high-density data grid with quick-status toggles and clickable description editor.
- **Kanban Board View**: Visual drag-free cards categorized by progress status.
- **Search & Filters**: Filter by status, priority, assignee, or keyword search across tasks and descriptions.
- **CSV Export**: 1-click download of the complete project tracker table into an Excel/Sheets-compatible CSV file.
- **Light & Dark Theme**: Automatically adapts or toggles with persistent preference.
- **Zero External Dependencies**: Pure vanilla HTML5, CSS3, and JavaScript — loads instantly on mobile and desktop.
