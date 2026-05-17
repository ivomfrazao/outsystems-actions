# OutSystems Actions — Data Model Specification

**Version:** 1.4
**Purpose:** Define the data structures used across the extension.

---

## 1. Deployment Event Object

```json
{
  "id": "string",
  "type": "string",
  "name": "string | null",
  "environment": "string | null",
  "status": "string",
  "timestamp": "number",
  "url": "string",
  "tabId": "number"
}
```

- `id`: composite key `"<timestamp>-<tabId>"`
- `type`: `"eSpace"`, `"Solution"`, or `"LifeTimeDeployment"`
- `status`: `"in_progress"`, `"success"`, `"warning"`, `"error"`, `"intervention"`

---

## 2. Deployment History Entry

Only final states are stored. Limits are governed by the `historyMaxCount` and `historyMaxDays` user preferences (see §3).

Persisted in `chrome.storage.local`.

```json
{
  "id": "string",
  "type": "string",
  "name": "string | null",
  "environment": "string | null",
  "status": "string",
  "timestamp": "number",
  "url": "string"
}
```

- `status`: `"success"`, `"warning"`, `"error"`, `"intervention"`

---

## 3. User Preferences

Persisted in `chrome.storage.local`.

```json
{
  "notifySuccess":      "boolean",
  "notifyWarning":      "boolean",
  "notifyError":        "boolean",
  "notifyIntervention": "boolean",
  "animationsEnabled":  "boolean",
  "historyLimitType":   "\"count\" | \"days\"",
  "historyMaxCount":    "number",
  "historyMaxDays":     "number"
}
```

Default:

```json
{
  "notifySuccess":      true,
  "notifyWarning":      true,
  "notifyError":        true,
  "notifyIntervention": true,
  "animationsEnabled":  true,
  "historyLimitType":   "count",
  "historyMaxCount":    5,
  "historyMaxDays":     1
}
```

- `animationsEnabled` — when `true`, card enter/leave animations play in the popup; when `false`, cards appear and disappear instantly.
- `historyLimitType` — which limit mode is active: `"count"` (keep last N entries) or `"days"` (remove entries older than N days). Only the active mode is enforced.
- `historyMaxCount` — used when `historyLimitType` is `"count"`. Integer, range 1–100.
- `historyMaxDays` — used when `historyLimitType` is `"days"`. Integer, range 1–365.

### Dark Mode

Stored separately in `chrome.storage.local` under the key `darkMode` (not part of `UserPreferences`).

Value: `"on"` | `"off"` | `"system"`. Default (when absent): `"system"`.

Legacy boolean values (`true` / `false`) are migrated on read to `"on"` / `"off"`.

---

## 4. Active Deployments (Background Worker State)

Keyed by tab ID. Persisted in `chrome.storage.session` so state survives service worker restarts within the same browser session. Cleared on browser close.

```json
{
  "<tabId>": {
    "currentStatus": "string | null",
    "lastUpdate": "number"
  }
}
```

---

## 5. Message Payloads

### 5.1 deploymentUpdate (Content Script → Background)

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

### 5.2 openDeployment (Popup → Background)

```json
{
  "type": "openDeployment",
  "payload": { "url": "string" }
}
```

No response is returned. The background searches for an existing tab whose URL matches `url` (path + query string comparison). If found, it focuses the tab and its window. If not found, it opens a new tab.

### 5.3 deleteHistoryEntry (Popup → Background)

```json
{
  "type": "deleteHistoryEntry",
  "payload": { "id": "string" }
}
```

No response is returned. The background removes the matching entry from history and persists the change.

### 5.4 playSound (Background → Content Script)

No payload. The background applies user preference filtering before sending; the content script plays the sound unconditionally on receipt.

```json
{
  "type": "playSound"
}
```

---

## 6. Badge State

| Status       | Text | Colour  |
|--------------|------|---------|
| success      | ✓    | #00FF00 |
| warning      | !    | #FFFF00 |
| error        | !    | #FF0000 |
| intervention | !    | #FF0000 |

Badge text is cleared (empty string) when the popup is opened or a notification is clicked.
