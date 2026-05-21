# OutSystems Actions — Main Specification

**Version:** 1.4
**Purpose:** Define the functional and architectural requirements for a Chromium-based extension that monitors OutSystems Service Center and LifeTime and notifies the user on relevant events.

---

## 1. Overview

The extension monitors deployment and publish operations in:

- OutSystems Service Center
- OutSystems LifeTime

When a deployment finishes or requires human intervention, the extension:

- Displays a browser notification
- Updates a badge on the extension icon
- Records the event in a short deployment history

The extension must activate only on Service Center and LifeTime domains.

The extension must also recognise **in-progress** states but must not notify on them.

---

## 2. Supported Domains

The extension must activate on URLs matching:

- `*/ServiceCenter/*`
- `*/LifeTime/*`

It must remain inactive on all other domains.

---

## 3. Functional Requirements

### 3.1 Deployment Detection

#### 3.1.1 Service Center

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

##### 3.1.1.1 eSpace Publish

The extension must detect states on the eSpace publish screen:

- `/ServiceCenter/eSpace_Publish.aspx?EspaceId=<id>`

##### 3.1.1.2 Solution Publish

The extension must detect states on the Solution publish screen:

- `/ServiceCenter/Solution_Publish.aspx?SolutionId=<id>`
- `/ServiceCenter/Solution_Publish.aspx?SolutionVersionId=<id>`

Solution publish operations may involve:

- Multiple applications
- Multiple eSpaces
- Multi-step processes

The solution name must be extracted from the page heading element (the element whose `id` ends with `wtTitle_wtTitle`), which contains text in the form `"Publish ... Solution <Name>"`. The page title is generic ("Upload/Publish Solution") and does not include the name.

#### 3.1.2 LifeTime

The extension must detect states of **Deployment Plan executions**.

It must detect and classify:

- `in_progress`
- `success`
- `warning`
- `error`
- `intervention`

#### 3.1.3 Multi-Tab Behaviour

Each browser tab must be treated independently.

A deployment in one tab must not interfere with detection in another.

---

## 4. Notifications

### 4.1 Browser Notifications

When a deployment reaches a **final state** (`success`, `warning`, `error`, `intervention`), the extension must display a notification containing:

- Deployment name (if available)
- Environment (if available)
- Final status
- Timestamp
- Link or reference to the originating tab

The notification **title** must follow the format `"<Type> <Action> <Status>"`, where:

| Field  | eSpace      | Solution    | LifeTime    |
|--------|-------------|-------------|-------------|
| Type   | Application | Solution    | LifeTime    |
| Action | Publish     | Publish     | Deployment  |
| Status | Successful  | Successful  | Successful  |

Status values (same for all types): `Successful`, `with Warnings`, `with Errors`, `Needs Intervention`.

Examples: `"Solution Publish Successful"`, `"Application Publish with Warnings"`, `"LifeTime Deployment with Errors"`.

No notification must be shown for `in_progress` states.

Clicking the notification must focus the corresponding tab.

### 4.2 Tab Attention Indicator

The extension must trigger a visual attention mechanism, such as flashing the tab title or any browser-supported attention indicator.

---

## 5. Badge Indicator

The extension icon must display a badge representing the most recent **final** status:

| Status       | Badge Text | Badge Colour |
|--------------|------------|--------------|
| success      | ✓          | Green        |
| warning      | !          | Yellow       |
| error        | !          | Red          |
| intervention | !          | Red          |

`in_progress` must not update the badge.

Badge must clear when:

- The user opens the extension popup
- The user clicks the notification

---

## 6. Deployment History

The extension must maintain a history of detected deployments that reached a **final** state.

Each entry must include:

- Deployment name
- Environment
- Final status
- Timestamp
- URL to the deployment result page

Storage requirements:

- Use `chrome.storage.local` for persistent storage across sessions
- Enforce limits automatically whenever a new entry is added or history settings change

### 6.1 History Limits

The user chooses **one** limit mode; only the selected mode is enforced at any time:

| Mode | Default value | Range | Behaviour |
| --- | --- | --- | --- |
| Max deployments | 5 | 1–100 | Keeps only the N most recent entries |
| Max days | 1 | 1–365 | Removes entries older than N days |

The default mode is **Max deployments**. Switching modes or changing the value enforces the new limit immediately on existing history.

### 6.2 Deployment List Ordering

- Active (in-progress) deployments appear first, sorted by start time descending (most recent first).
- Concluded (history) entries follow, sorted by completion timestamp descending (most recent first).
- This ordering must be maintained during live updates (auto-refresh): newly appearing cards must be inserted at their correct position in the list, not appended to the bottom.

### 6.3 Popup Display and Card Actions

The history must be displayed in the extension popup.

Each card in the deployment list must support the following actions:

#### Open / View

Clicking anywhere on the card must navigate to the deployment result page:

1. The extension first searches for an **existing browser tab** whose URL matches the deployment URL (using path and query string comparison, ignoring protocol and host differences on the same server).
2. If a matching tab is found, it must be **focused** and its browser window brought to the foreground. No new tab is opened.
3. If no matching tab exists, a **new tab** must be opened with the deployment URL.

**Revisit suppression**: if the newly-opened tab's content script reports an `InProgress` status as its first message but history already contains a completed entry for the same URL, the background must ignore that message. This prevents a transient `InProgress` detection during page load from creating a false active card alongside the existing history card.

#### Delete from History

Each history card must include a dedicated **delete button** (×).

- Clicking the delete button removes that entry from history immediately.
- The delete button must **not** trigger the open action.
- The button must stop click event propagation.

---

## 7. User Preferences

The extension must allow the user to configure the following settings. All preferences persist across sessions via `chrome.storage.local`.

### 7.0 Appearance — Dark Mode

The popup supports three theme modes, selectable via a segmented control:

| Mode | Behaviour |
| --- | --- |
| Light | Always uses the light theme |
| System | Follows the OS/browser dark-mode preference |
| Dark | Always uses the dark theme |

Default: **System**. The selected mode persists across sessions, stored as `'on'`, `'off'`, or `'system'` in `chrome.storage.local` under the key `darkMode`. When reading a stored boolean (legacy format), `true` maps to `'on'` and `false` maps to `'off'`.

### 7.1 Notification Filters

Controls which **final** outcomes trigger browser notifications:

- success
- warning
- error
- intervention

`in_progress` is never user-configurable and never triggers a notification.

### 7.2 Animations

A global **Animations** toggle controls whether card enter/leave animations play in the popup.

- When enabled, cards animate in when they appear and animate out when they are removed.
- When disabled, cards appear and disappear instantly with no transition.
- The toggle must be respected everywhere animations could occur; there must be no animation bypass.
- Default: enabled.

### 7.3 History Limits

The user selects one limit mode (see §6.1) and sets the corresponding value:

- **Mode: Max deployments** — integer, default 5, range 1–100. Only the N most recent entries are kept.
- **Mode: Max days** — integer, default 1, range 1–365. Entries older than N days are removed.

Only the active mode is enforced. Changing the mode or the value applies immediately to existing history.

---

## 8. Architecture

### 8.1 Components

#### 8.1.1 Content Scripts

Injected only into Service Center and LifeTime pages.

Responsibilities:

- Detect deployment status changes (including `in_progress` and final states)
- Extract metadata (deployment name, environment)
- Send status events to the background service worker

#### 8.1.2 Background Service Worker

Responsibilities:

- Track `in_progress` vs final states per tab
- Persist active deployment state to `chrome.storage.session` to survive service worker restarts within the browser session
- Detect transitions from `in_progress` to a final state
- Apply user preferences before triggering any output
- Generate browser notifications for final states
- Update badge indicators
- Maintain deployment history in `chrome.storage.local`
- Handle notification click events by focusing the originating tab via `chrome.tabs.update`

#### 8.1.3 Popup UI

Responsibilities:

- Display active (in-progress) and history deployments as clickable cards
- Card click opens the deployment, reusing an existing tab when possible (see §6.2)
- History cards expose a delete button to remove individual entries
- Animate cards in/out when they appear or disappear (gated by the Animations preference)
- Provide notification preference toggles
- Provide a Dark Mode segmented control (Light / System / Dark)
- Provide an Animations toggle
- Provide history limit settings (mode: max count or max days)
- Clear badge when opened

### 8.2 Permissions

The extension requires:

- `notifications` — for browser notifications
- `tabs` — for tab focus and querying
- `scripting` — for dynamic script injection
- `storage` — for `chrome.storage.local` (preferences, history) and `chrome.storage.session` (active deployment state)
- Host permissions for Service Center and LifeTime domains

---

## 9. State Classification

### 9.1 In Progress

Examples:

- "Publishing…"
- "Deploying…"
- "Running deployment plan…"

Mapped to: `in_progress`.

### 9.2 Success

Examples:

- "Published successfully"
- "Completed successfully"

Mapped to: `success`.

### 9.3 Warning

Examples:

- "Published with warnings"
- "Completed with warnings"

Mapped to: `warning`.

### 9.4 Error

Examples:

- "Compilation error"
- "Completed with errors"
- "Aborted"

Mapped to: `error`.

### 9.5 Manual Intervention Required

Examples:

- "Waiting for user input"
- "Conflict detected"
- "Merge required"
- "Approval pending"

Mapped to: `intervention`.

---

## 10. Non-Goals

Out of scope:

- Deployment analytics
- Syncing history across devices
- OutSystems API integrations
- Modifying OutSystems UI

---

## 11. Considered but Not Implemented

### Sound Alerts

Playing a sound on deployment completion was considered but is not feasible in MV3 extensions. Chrome's autoplay policy blocks audio in background tabs — the sound would only fire when the user manually focuses the tab, at which point the result is already visible. The browser popup notification covers this use case reliably, so sound alerts were ruled out.
