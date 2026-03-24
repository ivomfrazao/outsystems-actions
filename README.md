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
4. Click "Load unpacked" and select the project directory.
5. The extension should now be installed.

## Usage

- Navigate to any OutSystems Service Center or LifeTime page.
- The extension will automatically monitor for deployments.
- Notifications will appear for final states based on your preferences.
- Click the extension icon to view recent history and adjust settings.

## Files

- `manifest.json`: Extension configuration
- `content.js`: Content script for status detection
- `background.js`: Service worker for notifications and state management
- `popup.html`: Popup UI
- `popup.js`: Popup logic
- `icons/`: Icon files (16x16, 32x32, 48x48, 128x128 PNG)
- `notification.mp3`: Default alert sound
- `spec/`: Specification documents

## Notes

- Icons and sound file need to be added manually (free resources).
- Tested on Chromium-based browsers.
- Permissions required: notifications, storage, tabs, scripting, host access to Service Center and LifeTime domains.
