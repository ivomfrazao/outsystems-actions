# OutSystems Deployment Notifier — Data Model Specification
**Version:** 1.1  
**Purpose:** Define the data structures used across the extension.

---

# 1. Deployment Event Object

```json
{
  "id": "string",
  "type": "string",                   // "eSpace", "Solution", "LifeTimeDeployment"
  "name": "string | null",
  "environment": "string | null",
  "status": "string",                 // "in_progress", "success", "warning", "error", "intervention"
  "timestamp": "number",
  "url": "string",
  "tabId": "number"
}
```

---

# 2. Deployment History Entry

Only final states are stored.

```json
{
  "id": "string",
  "type": "string",
  "name": "string | null",
  "environment": "string | null",
  "status": "string",                 // "success", "warning", "error", "intervention"
  "timestamp": "number",
  "url": "string"
}
```

---

# 3. User Preferences

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

# 4. Internal State (Background Worker)

```json
{
  "activeDeployments": {
    "<tabId>": {
      "currentStatus": "string | null",
      "lastUpdate": "number"
    }
  }
}
```

---

# 5. Message Payloads

## 5.1 deploymentUpdate

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

## 5.2 focusTab

```json
{
  "type": "focusTab"
}
```

---

# 6. Badge State

```json
{
  "text": "string | null",
  "color": "string | null"
}
```

---

# 7. Sound Event

```json
{
  "type": "sound",
  "status": "string"
}
```
