# OutSystems Actions — Data Model Specification

**Version:** 1.2
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

Only final states are stored. Maximum 5 entries; oldest removed on overflow.

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
  "notifySuccess": "boolean",
  "notifyWarning": "boolean",
  "notifyError": "boolean",
  "notifyIntervention": "boolean"
}
```

Default:

```json
{
  "notifySuccess": true,
  "notifyWarning": true,
  "notifyError": true,
  "notifyIntervention": true
}
```

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

### 5.2 playSound (Background → Content Script)

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
