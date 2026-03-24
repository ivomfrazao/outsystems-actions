# OutSystems Deployment Notifier — Main Specification
**Version:** 1.1  
**Purpose:** Define the functional and architectural requirements for a Chromium-based extension that monitors OutSystems deployments and notifies the user.

---

# 1. Overview

The extension monitors deployment and publish operations in:
- OutSystems Service Center
- OutSystems LifeTime

When a deployment finishes or requires human intervention, the extension:
- Displays a browser notification  
- Plays a default sound  
- Updates a badge on the extension icon  
- Records the event in a short deployment history  

The extension must activate only on Service Center and LifeTime domains.

The extension must also recognize **in-progress** states but must not notify on them.

---

# 2. Supported Domains

The extension must activate on URLs matching:

- `*/ServiceCenter/*`
- `*/LifeTime/*`

It must remain inactive on all other domains.

---

# 3. Functional Requirements

## 3.1 Deployment Detection

### 3.1.1 Service Center

The extension must detect completion of both **eSpace publish operations** and **Solution publish operations**.

It must detect and classify the following states for both publish types:
- `in_progress`
- `success`
- `warning`
- `error`
- `intervention`

Detection sources may include:
- DOM elements representing publish status  
- AJAX polling responses  
- Any structured status indicators available on the page  

#### 3.1.1.1 eSpace Publish

The extension must detect states on the eSpace publish screen:
- `/ServiceCenter/eSpace_Publish.aspx?EspaceId=<id>`

#### 3.1.1.2 Solution Publish

The extension must detect states on the Solution publish screen:
- `/ServiceCenter/Solution_Publish.aspx?SolutionId=<id>`
- `/ServiceCenter/Solution_Publish.aspx?SolutionVersionId=<id>`

Solution publish operations may involve:
- Multiple applications  
- Multiple eSpaces  
- Multi-step processes  

### 3.1.2 LifeTime

The extension must detect states of **Deployment Plan executions**.

It must detect and classify:
- `in_progress`
- `success`
- `warning`
- `error`
- `intervention`

### 3.1.3 Multi-Tab Behavior

Each browser tab must be treated independently.

A deployment in one tab must not interfere with detection in another.

---

# 4. Notifications

## 4.1 Browser Notifications

When a deployment reaches a **final state** (`success`, `warning`, `error`, `intervention`), the extension must display a notification containing:
- Deployment name (if available)
- Environment (if available)
- Final status
- Timestamp
- Link or reference to the originating tab

No notification must be shown for `in_progress` states.

Clicking the notification must:
- Focus the corresponding tab  
- Optionally scroll to the relevant section  

## 4.2 Sound Alerts

A default sound must play when:
- A deployment reaches a final state  
- A deployment requires manual intervention  

Custom sounds are out of scope.

## 4.3 Tab Attention Indicator

The extension must trigger a visual attention mechanism, such as:
- Flashing the tab title  
- Any browser-supported attention indicator  

---

# 5. Badge Indicator

The extension icon must display a badge representing the most recent **final** status:

| Status       | Badge Text | Badge Color |
|--------------|------------|-------------|
| success      | ✓          | Green       |
| warning      | !          | Yellow      |
| error        | !          | Red         |
| intervention | !          | Red         |

`in_progress` must not update the badge.

Badge must clear when:
- The user opens the extension popup  
- The user clicks the notification  

---

# 6. Deployment History

The extension must maintain a history of the **last 5 detected deployments** that reached a **final** state.

Each entry must include:
- Deployment name  
- Environment  
- Final status  
- Timestamp  
- URL to the deployment result page  

Storage:
- Use persistent browser storage  
- Automatically remove oldest entries when exceeding 5  

The history must be displayed in the extension popup.

---

# 7. User Preferences

The extension must allow the user to configure which **final** outcomes trigger notifications.

Supported filters:
- success  
- warning  
- error  
- intervention  

Preferences must persist across sessions.

`in_progress` is never user-configurable and never notifies.

---

# 8. Architecture

## 8.1 Components

### 8.1.1 Content Scripts

Injected only into Service Center and LifeTime pages.

Responsibilities:
- Detect deployment status changes (including `in_progress` and final states)  
- Extract metadata  
- Send events to the background service worker  

### 8.1.2 Background Service Worker

Responsibilities:
- Track `in_progress` vs final states  
- Detect transitions from `in_progress` to final  
- Apply user preferences  
- Generate notifications for final states  
- Play sound alerts  
- Update badge indicators  
- Maintain deployment history  
- Handle notification click events  

### 8.1.3 Popup UI

Responsibilities:
- Display last 5 deployments  
- Provide configuration options  
- Clear badge when opened  

## 8.2 Permissions

The extension requires:
- Notifications  
- Tab access  
- Scripting  
- Storage  
- Host permissions for Service Center and LifeTime domains  

---

# 9. State Classification

## 9.1 In Progress

Examples:
- “Publishing…”  
- “Deploying…”  
- “Running deployment plan…”  

Mapped to: `in_progress`.

## 9.2 Success

Examples:
- “Published successfully”  
- “Completed successfully”  

Mapped to: `success`.

## 9.3 Warning

Examples:
- “Published with warnings”  
- “Completed with warnings”  

Mapped to: `warning`.

## 9.4 Error

Examples:
- “Compilation error”  
- “Completed with errors”  
- “Aborted”  

Mapped to: `error`.

## 9.5 Manual Intervention Required

Examples:
- “Waiting for user input”  
- “Conflict detected”  
- “Merge required”  
- “Approval pending”  

Mapped to: `intervention`.

---

# 10. Non-Goals

Out of scope:
- Custom sound uploads  
- Deployment analytics  
- Syncing history across devices  
- OutSystems API integrations  
- Modifying OutSystems UI  
