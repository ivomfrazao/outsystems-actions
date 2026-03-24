# OutSystems Deployment Notifier — Message Flow Specification
**Version:** 1.1  
**Purpose:** Define communication patterns between content scripts, background worker, and popup UI.

---

# 1. Overview

The extension uses message passing to coordinate:
- Deployment detection  
- Notification and history management  
- User interactions  

All messages follow the formats in `data-model.md`.

---

# 2. Content Script → Background Worker

## 2.1 deploymentUpdate

```json
{
  "type": "deploymentUpdate",
  "payload": {
    "status": "string",                   // "in_progress", "success", "warning", "error", "intervention"
    "name": "string | null",
    "environment": "string | null",
    "deploymentType": "string",
    "url": "string",
    "tabId": "number"
  }
}
```

Background responsibilities:
- Track `in_progress`  
- Detect transitions to final states  
- Trigger notifications, sounds, badges  
- Store final states in history  

---

# 3. Background Worker → Content Script

## 3.1 focusTab

```json
{
  "type": "focusTab"
}
```

---

# 4. Popup UI → Background Worker

## 4.1 getHistory

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

## 4.2 getPreferences

Request:

```json
{ "type": "getPreferences" }
```

Response:

```json
{
  "type": "preferencesResponse",
  "payload": {
    "notifySuccess": true,
    "notifyWarning": true,
    "notifyError": true,
    "notifyIntervention": true
  }
}
```

---

## 4.3 updatePreferences

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

# 5. Background Worker → Popup UI

## 5.1 badgeCleared

```json
{ "type": "badgeCleared" }
```

---

# 6. Notification Click Flow

1. User clicks notification  
2. Background focuses tab  
3. Background optionally sends `focusTab`  

---

# 7. Error Handling

- Malformed messages ignored  
- No user-facing errors  
- No notifications from malformed messages  
