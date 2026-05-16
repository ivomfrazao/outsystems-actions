# OutSystems Actions

A Chromium extension that monitors OutSystems Service Center and LifeTime and notifies users upon relevant events such as deployments, publishes, and required interventions.

## Features

- Detects deployment statuses in real-time
- Browser notifications for final states (success, warning, error, intervention)
- Sound alerts
- Badge indicator on extension icon
- History of last 5 deployments
- User-configurable notification preferences

## Installation

Install from the Chrome Web Store or Microsoft Edge Add-ons store.

To install manually from source:

1. Clone this repository and run `npm ci && npm run build`.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the `dist/` folder.

## Usage

- Navigate to any OutSystems Service Center or LifeTime page.
- The extension will automatically monitor for deployments.
- Notifications will appear for final states based on your preferences.
- Click the extension icon to view recent history and adjust settings.

## Development

```bash
npm ci          # install dependencies
npm run build   # full build (typecheck + compile + copy assets)
npm run watch   # rebuild on file changes
```

Source files live in `src/` (TypeScript). The `dist/` folder is the build output and is not committed.

## Releasing

Releases are published automatically to the Chrome Web Store and Edge Add-ons store via GitHub Actions when a version tag is pushed.

**Release flow:**

```bash
npm run bump 1.2.0              # sync version in package.json and src/manifest.json
git add package.json src/manifest.json
git commit -m "chore: bump to v1.2.0"
git tag v1.2.0
git push origin main --tags     # triggers the publish workflow
```

The publish workflow (`.github/workflows/publish.yml`) builds the extension, packages `dist/` into a ZIP, and uploads to both stores.

### Required GitHub secrets

| Secret | Source |
| --- | --- |
| `CHROME_EXTENSION_ID` | Chrome Developer Dashboard |
| `CHROME_CLIENT_ID` | Google API Console → OAuth 2.0 credentials |
| `CHROME_CLIENT_SECRET` | Same |
| `CHROME_REFRESH_TOKEN` | One-time flow: `npx chrome-webstore-upload-cli` |
| `EDGE_TENANT_ID` | Azure portal → Azure Active Directory |
| `EDGE_CLIENT_ID` | Azure portal → App registrations |
| `EDGE_CLIENT_SECRET` | Same |
| `EDGE_PRODUCT_ID` | Partner Center → extension details page |

## Files

- `src/manifest.json` — extension configuration
- `src/background.ts` — service worker for notifications and state management
- `src/content.ts` — content script for status detection
- `src/popup.ts` / `src/popup.html` — popup UI and logic
- `src/types.ts` — shared TypeScript types
- `src/icons/` — icon files (16, 32, 48, 128 px PNG)
- `src/sounds/notification.wav` — alert sound
- `scripts/bump-version.mjs` — version sync script
- `spec/` — specification documents

## Notes

- Sound file (`src/sounds/notification.wav`) must be added manually. Attribution: Notify.wav by InfiniteLifespan — <https://freesound.org/s/266455/> — License: Creative Commons 0
- Tested on Chromium-based browsers.
- Permissions required: notifications, storage, tabs, scripting, host access to Service Center and LifeTime domains.
