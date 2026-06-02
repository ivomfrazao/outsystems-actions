# OutSystems Actions

A Chromium extension that monitors OutSystems Service Center and LifeTime and notifies users upon relevant events such as deployments, publishes, and required interventions.

## Features

- Detects deployment statuses in real-time
- Browser notifications for final states (success, warning, error, intervention)
- Stale deployment detection: if the browser is closed while a deployment is running, an "Unknown" history entry and notification are created on the next browser start; reopening the deployment page resolves the entry to its real status
- Badge indicator on extension icon
- Deployment history with configurable limits (max count and max age in days)
- Click any card to open the deployment — reuses an existing tab when possible
- Delete individual history entries from the popup
- Card enter/leave animations (can be disabled in Settings)
- Swipe or click the bottom nav to slide between Deployments and Settings; click animation mirrors the swipe motion
- User-configurable notification preferences — master "All Notifications" toggle plus per-outcome filters (success, warning, error, intervention, unknown)
- Cards show a type label in the meta row (`Deploy` / `Solution`) so you can distinguish LifeTime deployments from Solution publishes at a glance
- LifeTime cards show the deployed application name(s) extracted from the deployment plan (e.g. `MyApp +2`); when no names are available the card falls back to `Deploy`

## Installation

Install from the [Microsoft Edge Add-ons store](https://microsoftedge.microsoft.com/addons/detail/outsystems-actions/ilcbffhgicjjmghfcelmndbfjjilmomg) or the Chrome Web Store.

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

```bash
npm run bump 1.1.0              # sync version in package.json and src/manifest.json
git add package.json src/manifest.json
git commit -m "chore: bump to v1.1.0"
git tag v1.1.0
git push origin main --tags
```

Then build and package for store submission:

```bash
npm run build
cd dist && zip -r ../extension.zip .
```

Upload `extension.zip` manually to the [Edge Add-ons Partner Center](https://partner.microsoft.com/en-us/dashboard/microsoftedge) and submit for review.

## Files

- `src/manifest.json` — extension configuration
- `src/background.ts` — service worker for notifications and state management
- `src/content.ts` — content script for status detection
- `src/popup.ts` / `src/popup.html` — popup UI and logic
- `src/types.ts` — shared TypeScript types
- `src/icons/` — icon files (16, 32, 48, 128 px PNG)
- `scripts/bump-version.mjs` — version sync script
- `spec/` — specification documents

## Notes

- Tested on Chromium-based browsers.
- Permissions required: notifications, storage, tabs, scripting, host access to Service Center and LifeTime domains.

## Disclaimer

This project is not affiliated with, endorsed by, or associated with OutSystems in any way. OutSystems is a trademark of OutSystems, S.A.

## License

[MIT](LICENSE)
