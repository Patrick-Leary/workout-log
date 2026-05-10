# Lift Log

A lightweight workout tracker. Logs to your browser + syncs to Google Sheets.

## File Structure

```
lift-log/
├── index.html       ← App markup
├── style.css        ← All styles and design tokens
├── app.js           ← All application logic
├── appsscript.js    ← Paste this into Google Apps Script (see below)
└── README.md
```

## Local Development

Open `index.html` directly in your browser — no build step needed.
Or use VS Code's Live Server extension for auto-reload.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Settings → Pages → Source: main branch / root
3. Your app will be live at `https://yourusername.github.io/repo-name`

## Google Sheets Sync Setup

See the full instructions at the top of `appsscript.js`.
Short version:
1. Create a Google Sheet, copy its ID
2. Paste `appsscript.js` into script.google.com, fill in your Sheet ID
3. Deploy as a Web App (Anyone can access)
4. Paste the deployment URL into Settings inside the app

## Data Storage

- **Local:** `localStorage` under keys `ll_workouts`, `ll_queue`, `ll_sheets_url`
- **Remote:** Google Sheets (one tab per exercise, one row per set)
- **Export:** Settings → Export JSON (backup anytime)
