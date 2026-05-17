# OutSystems Actions — Message Flow Specification

**Version:** 1.4
**Purpose:** Define communication patterns between content scripts, background worker, and popup UI.

---

## 1. Overview

The extension uses message passing to coordinate:

- Deployment detection
- Notification and history management
- User interactions

All message payload schemas are defined in `data-model.md`.

---

## 2. Content Script → Background Worker

### 2.1 deploymentUpdate

Sent whenever the detected deployment status changes.

```json
{
  "type": "deploymentUpdate",
  "payload": {
    "status": "string",
    "name": "string | null",
    "environment": "string | null",
    "deploymentType": "string",
    "url": "string",
    "tabId": "number"
  }
}
```

`status` values: `"in_progress"`, `"success"`, `"warning"`, `"error"`, `"intervention"`.

Background responsibilities on receipt:

- Track `in_progress` per tab (persisted to `chrome.storage.session`)
- Detect transitions to final states
- Trigger notifications, sounds, and badge updates on transition
- Store final states in history

---

## 3. Background Worker → Content Script

### 3.1 playSound

Sent when a deployment reaches a final state and the user preference allows notification for that status. The content script plays `sounds/notification.wav` on receipt.

Sound playback is delegated to the content script because MV3 service workers do not have access to the Web Audio API.

```json
{
  "type": "playSound"
}
```

---

## 4. Popup UI → Background Worker

### 4.1 getHistory

Request:

```json
{ "type": "getHistory" }
```

Response:

```json
{
  "type": "historyResponse",
  "payload": { "history": [ ... ] }
}
```

---

### 4.2 getPreferences

Request:

```json
{ "type": "getPreferences" }
```

Response:

```json
{
  "type": "preferencesResponse",
  "payload": {
    "notifySuccess":      true,
    "notifyWarning":      true,
    "notifyError":        true,
    "notifyIntervention": true,
    "animationsEnabled":  true,
    "historyLimitType":   "count",
    "historyMaxCount":    5,
    "historyMaxDays":     1
  }
}
```

---

### 4.3 updatePreferences

Request:

```json
{
  "type": "updatePreferences",
  "payload": { ... }
}
```

Response:

```json
{ "type": "preferencesUpdated" }
```

---

### 4.4 clearBadge

Sent by the popup when it opens. No response is returned.

```json
{ "type": "clearBadge" }
```

---

### 4.5 openDeployment

Sent when the user clicks a deployment card. No response is returned.

```json
{
  "type": "openDeployment",
  "payload": { "url": "string" }
}
```

Background responsibilities on receipt:

1. Query all open tabs via `chrome.tabs.query({})` (url-pattern form is not used because match patterns do not support query strings).
2. Find a tab whose URL matches `url` using path + query string comparison (`sameDeploymentUrl` helper).
3. If found: focus the tab via `chrome.tabs.update` and bring its window to the foreground via `chrome.windows.update`.
4. If not found: open a new tab via `chrome.tabs.create`.

---

### 4.6 deleteHistoryEntry

Sent when the user clicks the delete button on a history card. No response is returned.

```json
{
  "type": "deleteHistoryEntry",
  "payload": { "id": "string" }
}
```

Background responsibilities on receipt:

1. Remove the entry with the matching `id` from `deploymentHistory`.
2. Persist the updated history to `chrome.storage.local`.

---

## 5. Notification Click Flow

1. User clicks a browser notification.
2. Background extracts the deployment ID from the notification ID string.
3. Background looks up the matching URL from deployment history.
4. Background focuses the originating tab via `chrome.tabs.update` and its window via `chrome.windows.update`.
5. Background clears the notification via `chrome.notifications.clear`.
6. Badge is cleared.

---

## 6. Error Handling

- Unrecognised message types are ignored silently.
- No user-facing errors are exposed.
- The content script suppresses `chrome.runtime.lastError` when the service worker is temporarily unavailable between polling cycles.
- The background suppresses `chrome.runtime.lastError` when sending `playSound` if the content script tab is no longer available.
