# OutSystems Actions — Main Specification

**Version:** 1.6
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
- `*/Servicecenter/*`
- `*/servicecenter/*`
- `*/LifeTime/*`
- `*/Lifetime/*`
- `*/lifetime/*`

Both path segments are case-insensitive across OutSystems installations; all three casing variants of each must be covered. It must remain inactive on all other domains.

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

Final-state keywords (success, warning, error, intervention) must be searched using `textContent` (not `innerText`), because eSpace publish stores the final status message in a collapsed sub-step row (`display: none`) that `innerText` skips. In-progress keyword detection must continue to use `innerText` to avoid matching hidden in-progress text that persists in the DOM after completion.

##### 3.1.1.1 eSpace Publish

The extension must detect states on the eSpace publish screen:

- `/ServiceCenter/eSpace_Publish.aspx?EspaceId=<id>`

Start and end times must be extracted from `MessagesTable` by finding all `<td>` cells whose text content begins with an `HH:MM:SS` pattern. The first such cell provides the start time and the last provides the end time.

##### 3.1.1.2 Solution Publish

The extension must detect states on the Solution publish screen:

- `/ServiceCenter/Solution_Publish.aspx?SolutionId=<id>`
- `/ServiceCenter/Solution_Publish.aspx?SolutionVersionId=<id>`

Start and end times must be extracted using the same `MessagesTable` approach as eSpace publish (see §3.1.1.1).

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

LifeTime deployment execution pages have the URL path `Staging_Progress.aspx` (e.g. `/lifetime/Staging_Progress.aspx?StagingId=…`). The content script must match this path case-insensitively to distinguish execution pages from list pages (e.g. `Stagings_List.aspx`) that must not be monitored. The manifest host permissions continue to cover all LifeTime paths (`*/LifeTime/*`, `*/Lifetime/*`, `*/lifetime/*`) so the content script can run and then self-restrict by URL.

The success state is signalled by the text `"Deployment finished with success"` inside the finish-box element. The environment name must be extracted from the `<span class="TitleIdentifier">` element in the page heading (the page title format `"Deployment to <Env>"` does not use the `" - "` separator used by Service Center pages).

The deployment name must be extracted from the deployed-applications list (`wtListApplications`). Each deployed-app row contains an element whose `id` includes `_wtListApplications_ctl` and ends with `_wtOperation`; the app name lives in a `span[style*="font-size: 13"]` within the same enclosing `<table>`. (The separate `wtListOutdated` widget lists republished dependents and must not be used as a source.) If one application is listed, the name is taken verbatim. If multiple applications are listed, the name is formatted as `"<first app> +<N>"` where N is the count of additional apps. If no application names can be found, the name field is left null.

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

Status values (same for all types): `Successful`, `with Warnings`, `with Errors`, `Needs Intervention`, `Outcome Unknown`.

Examples: `"Solution Publish Successful"`, `"Application Publish with Warnings"`, `"LifeTime Deployment with Errors"`.

No notification must be shown for `in_progress` states.

Clicking the notification must focus the corresponding tab. For `unknown` entries (see §6.3), clicking the notification must open the extension popup instead, so the user can navigate to the deployment page from there.

### 4.2 Tab Attention Indicator

The content script prefixes the browser tab title with a status indicator as soon as a deployment state is detected. The prefix appears at the start of the title so it remains visible even when the tab is narrow.

| State        | Prefix | Meaning                      |
|--------------|--------|------------------------------|
| in_progress  | 🔵     | Deployment actively running  |
| success      | 🟢     | Completed successfully       |
| warning      | 🟡     | Completed with warnings      |
| error        | 🔴     | Failed                       |
| intervention | ⚠️     | Waiting for user action      |

The original title is captured once on script load and reused for metadata extraction, so the emoji prefix never corrupts the deployment name parsed from the title.

---

## 5. Badge Indicator

The extension icon must display a badge representing the most recent **final** status:

| Status       | Badge Text | Badge Colour |
|--------------|------------|--------------|
| success      | ✓          | Green        |
| warning      | !          | Yellow       |
| error        | !          | Red          |
| intervention | !          | Red          |
| unknown      | ?          | Gray         |

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
- Start time and end time (extracted from `MessagesTable` when available)
- URL to the deployment result page

When the deployment name is unavailable, the card displays a type-based fallback label: `"Deploy"` for LifeTime deployments and `"Solution"` for Solution publishes. eSpace publishes always have a name extracted from the page.

Cards display metadata on two lines:

- **Line 1** — type label · server · environment. The type label is `"Deploy"` for LifeTime deployments and `"Solution"` for Solution publishes; it is omitted for eSpace publishes. Server and environment are omitted if unavailable.
- **Line 2** — date derived from the entry's timestamp, followed by the time range: `D Mon · HH:MM:SS → HH:MM:SS` when both times are known, `D Mon · HH:MM:SS` when only the start time is available, or `D Mon · HH:MM:SS` (locale-formatted completion time) as a fallback.

Start and end times are sourced in order of preference:

1. `MessagesTable` DOM cells beginning with `HH:MM:SS` (Service Center eSpace and Solution publishes).
2. Wall-clock time recorded by the content script on first observation of each phase — used when the DOM table has no timestamped cells (e.g. Application Pack publish pages that use a step-based table without explicit timestamps).

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

**Revisit suppression**: if the newly-opened tab's content script reports an `InProgress` status as its first message but history already contains a **conclusive** completed entry for the same URL, the background must ignore that message. This prevents a transient `InProgress` detection during page load from creating a false active card alongside the existing history card. `unknown` entries are not considered conclusive for this purpose — reopening the page should resolve the entry (see §6.4).

#### Delete from History

Each history card must include a dedicated **delete button** (×).

- Clicking the delete button removes that entry from history immediately.
- The delete button must **not** trigger the open action.
- The button must stop click event propagation.

### 6.4 Stale Deployment Detection

When the content script stops polling (tab closed or browser closed), the background cannot receive a final status. Two events trigger the `in_progress` → `unknown` transition; only one sends a notification.

#### Tab-Close Check

On `chrome.tabs.onRemoved`, the background must:

1. Read `deployments` from `chrome.storage.local`.
2. Find entries with `status === in_progress` whose `tabId` matches the removed tab.
3. Skip any entry where a non-`unknown`, non-`in_progress` entry already exists for the same URL (race-condition guard: the content script may have sent a final status just before the tab was closed).
4. For each remaining entry, transition it to `unknown` in place (update `status`, `timestamp`, clear `tabId` and `endTime`).
5. Enforce history limits.
6. **No notification is sent.** The user intentionally closed the tab; no interruption occurred.

#### Startup Check

On `chrome.runtime.onStartup` (fires once per browser profile start, not on service worker restarts), the background must:

1. Read `deployments` and `preferences` from `chrome.storage.local`.
2. For each entry with `status === in_progress`, skip it if a non-`unknown`, non-`in_progress` entry already exists for the same URL (race-condition guard: a restored-session tab may have reported its outcome before this callback fires).
3. For each remaining `in_progress` entry, transition it to `unknown` in place (update `status`, `timestamp`, clear `tabId` and `endTime`).
4. Enforce history limits.
5. Send a browser notification for each newly-unknown entry (subject to the `notifyError` preference). Because `onStartup` fires on browser open — not during close — sending immediately is correct.

#### Resolving an Unknown Entry

When the user opens a deployment URL that has an `unknown` entry:

- The content script detects the current state and sends a `deploymentUpdate` message.
- If the first message is `in_progress`, the `unknown` entry is removed immediately so only the active InProgress card is shown for that URL.
- When a real final state is received, the `unknown` entry is removed and replaced with the actual result. Any OS notification for the `unknown` entry is cleared via `chrome.notifications.clear`.

---

## 7. User Preferences

The extension must allow the user to configure the following settings. All preferences persist across sessions via `chrome.storage.local`.

### 7.0 Appearance — Language

The popup allows the user to select the display language via a segmented control in the Appearance tab. The set of supported languages is defined by the locale files present in `src/locales/`; adding a new language requires only a new JSON file there and a corresponding button in the control.

Default: **English** (`en`). The selected locale persists across sessions, stored as a BCP 47 language tag in `chrome.storage.local` under the key `language`. When no value is stored, English is used.

Changing the language must take effect immediately — all UI strings update in place without closing and reopening the popup. The background service worker must also use the selected language for notification text, re-initialising when the preference changes.

### 7.1 Appearance — Dark Mode

The popup supports three theme modes, selectable via a segmented control:

| Mode | Behaviour |
| --- | --- |
| Light | Always uses the light theme |
| System | Follows the OS/browser dark-mode preference |
| Dark | Always uses the dark theme |

Default: **System**. The selected mode persists across sessions, stored as `'on'`, `'off'`, or `'system'` in `chrome.storage.local` under the key `darkMode`. When reading a stored boolean (legacy format), `true` maps to `'on'` and `false` maps to `'off'`.

### 7.2 Notification Filters

A global **All Notifications** master toggle silences all browser notifications in one action. When disabled, no notification fires regardless of the per-outcome settings below; when re-enabled, the individual settings are restored exactly as they were — the master toggle does not modify them.

The individual per-outcome toggles are visually disabled (dimmed, non-interactive) while the master toggle is off, so the user can see their saved configuration at a glance without being able to accidentally change it.

Controls which **final** outcomes trigger browser notifications (subject to the master toggle):

- success
- warning
- error
- intervention

`in_progress` is never user-configurable and never triggers a notification.

### 7.3 Animations

A global **Animations** toggle controls whether animations play in the popup.

- When enabled:
  - Cards animate in when they appear and animate out when they are removed.
  - Navigating between the Deployments and Settings panels uses a smooth horizontal scroll (identical to the motion produced by a touch swipe).
- When disabled, all elements appear and disappear instantly with no transition.
- The toggle must be respected everywhere animations could occur; there must be no animation bypass.
- Default: enabled.

### 7.4 History Limits

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

- Track all deployment state (active and concluded) in a single `deployments` array persisted to `chrome.storage.local`
- Update entries in place as status transitions occur (e.g. `in_progress` → `success`)
- On `chrome.tabs.onRemoved`, immediately transition any `in_progress` entry for the closed tab to `unknown` (no notification)
- On `chrome.runtime.onStartup`, transition any remaining `in_progress` entries to `unknown` and send notifications
- Apply user preferences before triggering any output
- Generate browser notifications for final states; clear `unknown` notifications when a real status replaces them
- Update badge indicators
- Enforce history limits (count or age) on concluded entries after each update
- Handle notification click events by focusing the originating tab via `chrome.tabs.update`; for `unknown` entries, open the extension popup instead

#### 8.1.3 Popup UI

Responsibilities:

- Display active (in-progress) and history deployments as clickable cards (the panel is labelled "Processes" in the UI, reflecting that it covers both publish and deployment operations)
- Card click opens the deployment, reusing an existing tab when possible (see §6.2)
- History cards expose a delete button to remove individual entries
- Animate cards in/out when they appear or disappear (gated by the Animations preference)
- Provide notification preference toggles
- Provide a Language dropdown (`<select>`) in the Appearance tab; adding a new language requires only a new `<option>` element and a locale file — no structural HTML change; changing the language takes effect immediately without reopening the popup
- Provide a Dark Mode segmented control (Light / System / Dark)
- Provide an Animations toggle
- Provide history limit settings (mode: max count or max days)
- The Deployments and Settings panels sit side-by-side in a horizontal scroll container; the bottom nav bar both indicates and controls the active panel — clicking a nav item scrolls to that panel (smooth when animations are enabled, instant when not); touch users can also swipe directly between panels
- Clear badge when opened

### 8.2 Internationalisation

All user-visible strings — popup labels, settings, card status tags, and browser notification text — are externalised into locale JSON files under `locales/`. Each file is a flat key-to-string map for one language. Adding a new language requires only a new JSON file and a new button in the Language segmented control.

At popup open, the extension fetches the active locale file (via `chrome.runtime.getURL`) and applies all translations in a single DOM pass against `[data-i18n]` attributes before any content renders. Strings in dynamically-rendered card content (status tags, type labels, delete button labels) are resolved at card-build time via the same `t(key)` lookup function, so cards built after a language change automatically use the current locale.

The background service worker initialises the same locale at startup and re-initialises it via a `chrome.storage.onChanged` listener whenever the user selects a different language, so browser notification text stays in sync without requiring a service worker restart.

Chrome's native `chrome.i18n` API is intentionally not used for runtime UI strings. See [ADR 001](adr/001-custom-i18n.md) for the full rationale.

### 8.3 Permissions

The extension requires:

- `notifications` — for browser notifications
- `tabs` — for tab focus and querying
- `scripting` — for dynamic script injection
- `storage` — for `chrome.storage.local` (all deployment state and preferences)
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

### 9.6 Unknown (Outcome Not Observed)

Assigned by the background service worker when a deployment was `in_progress` and the content script can no longer report back. Two triggers:

- **Tab closed** (`chrome.tabs.onRemoved`): immediate transition, no notification.
- **Browser startup** (`chrome.runtime.onStartup`): transition with notification (the browser was closed while tracking was active).

Not detected by the content script — synthesised internally by the background.

Mapped to: `unknown`.

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
