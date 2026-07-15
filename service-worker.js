# Daymark

A polished, mobile-first daily and weekly checklist. Daymark is a Progressive Web App (PWA), so it can be installed on Android or iPhone from the browser and works offline after its first load.

## Features

- Daily, weekday, and once-a-week tasks
- Categories, optional times, icons, and filters
- Seven-day navigation and daily notes
- Completion percentage, streak, weekly chart, and category progress
- Dark mode, data export, and on-device storage
- Installable PWA with offline support

## Run locally

From this folder, start a local server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Open it on your phone

Deploy the folder to any static host such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages. Open its HTTPS URL on your phone and choose **Add to Home Screen** from the browser menu.

## Data and privacy

The current version stores all tasks, notes, preferences, and completion history in the browser's local storage. There is no login or cloud synchronization yet. Clearing browser data removes local information, so use **Settings → Export my data** for a backup.

## Suggested next phase

Add Supabase authentication and database storage for cross-device synchronization, shared lists, reminders, and push notifications.
