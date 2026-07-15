# Daymark

Daymark is a private, installable personal-improvement dashboard built around fixed 28-day cycles. The first cycle begins Sunday, 12 July 2026; every later cycle is calculated automatically in consecutive four-week blocks.

## What is included

- Premium responsive dashboard, full Today checklist, Cycle analysis, History, and Settings views
- Sunday-aware schedules and fair points-based scoring that excludes future and not-scheduled habits
- Temple ritual and Kegel sub-checks with partial credit
- Automatic one-hour learning completion with manual correction
- Mutually exclusive swimming/walking details
- Private-goal naming control and streak history
- Daily weight measurements, target progress, cycle trend, and previous-cycle comparison
- Custom habits, one-time tasks, notes, configurable schedules, icons, ordering, active status, and scoring weights
- 28-day heatmaps, four weekly summaries, habit details, real data-derived insights, and lifetime statistics
- Offline-capable PWA with export/import backups

## Architecture

This remains a dependency-free static web app:

- `index.html` — accessible application shell and dialogs
- `app.js` — views and user interactions
- `model.js` — deterministic cycle, schedule, scoring, streak, and measurement calculations
- `storage.js` — versioned local-storage repository, migration, backup, and uniqueness rules
- `icons.js` — reusable SVG icon system
- `styles.css` — mobile-first theme and responsive layouts
- `service-worker.js` and `manifest.webmanifest` — installation and offline behavior

There is no backend, account, or cloud synchronization. Data is stored in the current browser under `daymark-v3`. The previous `daymark-v1` dataset is never deleted; compatible personal data is migrated without treating the former sample checklist as genuine history.

## Run and verify locally

No package installation is required. Use any static server from the repository root:

```bash
python -m http.server 4173
```

Open `http://localhost:4173`.

The optional Node scripts have no third-party dependencies:

```bash
npm test
npm run check
```

## Deploy with GitHub Pages

1. Commit these files to the repository's `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main`, choose `/ (root)`, and save.
5. Open the HTTPS address GitHub displays after deployment finishes.

## Install on a device

- Android/Chrome: open the deployed HTTPS site, open the browser menu, and choose **Install app** or **Add to Home screen**.
- iPhone/Safari: open the site, tap **Share**, then **Add to Home Screen**.
- Desktop Chrome/Edge: use the install icon in the address bar or the browser's **Install Daymark** command.

The service worker makes the app available offline after a successful online visit.

## Data safety

Use **Settings → Export backup** regularly. Import validates a Daymark backup before replacing the current `daymark-v3` dataset. Local browser storage is device- and browser-specific, so clearing site data removes the active local copy unless it has been exported.
