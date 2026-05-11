# 🏋️ Lift Log

A lightweight, mobile-friendly workout tracker that runs entirely in your browser — no account, no backend, no app store required. Built as a static site hosted on GitHub Pages.

**Live app:** [https://patrick-leary.github.io/workout-log](https://patrick-leary.github.io/workout-log)

> Anyone can use the live app directly — just open the link and start logging. Your data stays on your own device.

***

## Features

- **Log workouts** — track sets, reps, and weight for 6 exercises (Leg Press, Chest Press, Pull-Ups, Overhead Press, Dumbbell Rows, Bicep Curls)
- **Last session reference** — automatically shows your best weight/reps from the previous session as a guide
- **History** — browse every past workout with a collapsible set-by-set breakdown
- **Progress tracking** — all-time personal bests, session count, and streak counter per exercise
- **Google Sheets sync** *(optional)* — automatically push every saved workout to a Google Sheet via Apps Script
- **Export / Import JSON** — back up your data or move it between devices
- **Light & dark mode** — respects your system preference with a manual toggle
- **Works offline** — no internet required after the first load

***

## Using the App

Open the live link above on any device. No sign-in needed.

- **Log tab** — select a date, fill in your sets, and hit Save Workout
- **History tab** — tap "View" on any session to see the full breakdown
- **Progress tab** — see your personal bests and workout streak
- **Settings tab** — configure Google Sheets sync, export/import data

Your workout history is stored in your browser's `localStorage`. It persists between sessions on the same device and browser, but is not shared across devices automatically. Use **Export/Import JSON** to move data between devices, or set up Google Sheets sync to have a cloud backup.

***

## Google Sheets Sync (Optional)

Connect the app to a Google Sheet for two-way sync. On every app load the latest data is fetched from Sheets, and every saved workout is pushed back — so both sides stay in sync. The sheet is also great for visualizing your data with charts and filters.

### 1. Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Rename the first tab to **Workouts** (exact spelling)
3. Add these headers in row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Date | Exercise | Set | Weight (lbs) | Reps | Saved At |

> **Tip:** Format column A as **Plain text** (Format → Number → Plain text) to prevent Sheets from converting dates automatically.

### 2. Create the Apps Script

1. In your Sheet, click **Extensions → Apps Script**
2. Delete all default code and paste the contents of [`appsscript.js`](appsscript.js) from this repo
3. Click **Save** and give the project any name (e.g. "Lift Log Sync")

### 3. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Click the ⚙️ gear icon next to "Type" and select **Web app**
3. Configure:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and authorize when prompted
5. Copy the deployment URL — it looks like:
   `https://script.google.com/macros/s/AKfycbx.../exec`

### 4. Connect in the App

1. Open the app and go to the **Settings** tab
2. Paste the URL into the **Deployment URL** field
3. Click **Save**, then **Test connection**
4. You should see "Connection successful ✓"

Next time you open the app, it will automatically fetch the latest data from Sheets on load.

> **Note:** Any time you update `appsscript.js`, open the Apps Script editor, paste the new code, and create a **new deployment version** (Deploy → Manage deployments → edit the existing deployment → select "New version"). The URL stays the same.

***

## Running Your Own Copy

If you want your own hosted version at your own URL:

### Option A — Fork on GitHub (recommended)

1. Click **Fork** at the top right of this repository
2. Go to your fork's **Settings → Pages**
3. Under **Source**, select **Deploy from a branch → main**
4. Your app will be live at `https://YOUR-USERNAME.github.io/workout-log`
5. Set up your own Google Sheet and Apps Script following the steps above

### Option B — Download and host yourself

1. Click **Code → Download ZIP** and extract it
2. Host on any static service — GitHub Pages, Netlify, Vercel, Cloudflare Pages (all free)
3. No build step required — plain HTML, CSS, and JS

***

## Project Structure

```
workout-log/
├── index.html          # App shell and markup
├── styles/
│   └── style.css       # All styles and design tokens
└── scripts/
    └── app.js          # All application logic
```

No frameworks, no build tools, no dependencies. Runs directly in the browser.

***

## Tech Stack

- **HTML / CSS / JS** — no frameworks
- **localStorage** — client-side data persistence
- **Google Apps Script** — optional Sheets sync endpoint
- **GitHub Pages** — free static hosting

***

## License

MIT — fork it, modify it, use it however you like.