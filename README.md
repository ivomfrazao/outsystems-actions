# OutSystems Deployment Notifier

A Chromium extension that monitors OutSystems Service Center and LifeTime for deployment statuses and notifies users upon completion or when intervention is required.

## Features

- Detects deployment statuses in real-time
- Browser notifications for final states (success, warning, error, intervention)
- Sound alerts
- Badge indicator on extension icon
- History of last 5 deployments
- User-configurable notification preferences

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the `src/` directory.
5. The extension should now be installed.

## Usage

- Navigate to any OutSystems Service Center or LifeTime page.
- The extension will automatically monitor for deployments.
- Notifications will appear for final states based on your preferences.
- Click the extension icon to view recent history and adjust settings.

## Files

- `src/manifest.json`: Extension configuration
- `src/content.js`: Content script for status detection
- `src/background.js`: Service worker for notifications and state management
- `src/popup.html`: Popup UI
- `src/popup.js`: Popup logic
- `src/icons/`: Icon files (16x16, 32x32, 48x48, 128x128 PNG)
- `src/sounds/notification.wav`: Default alert sound
- `spec/`: Specification documents

## Notes

- Icons (PNG files) and sound file (`src/sounds/notification.wav`) need to be added manually (free resources). Sound attribution: Notify.wav by InfiniteLifespan -- https://freesound.org/s/266455/ -- License: Creative Commons 0
- Tested on Chromium-based browsers.
- Permissions required: notifications, storage, tabs, scripting, host access to Service Center and LifeTime domains.
