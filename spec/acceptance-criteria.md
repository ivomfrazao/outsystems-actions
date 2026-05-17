# OutSystems Actions — Acceptance Criteria

**Version:** 1.4

---

## 1. Activation

- [ ] Extension activates only on Service Center and LifeTime pages.
- [ ] Extension remains inactive on all other domains.

---

## 2. Deployment Detection

### 2.1 Service Center — eSpace Publish

- [ ] Detects `in_progress` state.
- [ ] Detects `success`.
- [ ] Detects `warning`.
- [ ] Detects `error`.
- [ ] Detects `intervention`.

### 2.2 Service Center — Solution Publish

- [ ] Detects `in_progress` state.
- [ ] Detects `success`.
- [ ] Detects `warning`.
- [ ] Detects `error`.
- [ ] Detects `intervention`.

### 2.3 LifeTime — Deployment Plans

- [ ] Detects `in_progress` state.
- [ ] Detects `success`.
- [ ] Detects `warning`.
- [ ] Detects `error`.
- [ ] Detects `intervention`.

### 2.4 Multi-Tab Behaviour

- [ ] Deployments in different tabs are handled independently.
- [ ] Notifications reference the correct tab.

---

## 3. Notifications

- [ ] No notification shown for `in_progress`.
- [ ] Notification appears within 2 seconds of final state detection.
- [ ] Notification includes name, environment, status, and timestamp.
- [ ] Clicking the notification focuses the correct tab.
- [ ] Clicking the notification clears the badge.

---

## 4. Badge Indicator

- [ ] Badge not updated for `in_progress`.
- [ ] Badge displays correct text and colour for each final state.
- [ ] Badge clears when the popup is opened.
- [ ] Badge clears when a notification is clicked.

---

## 5. Sound Alerts

- [ ] No sound for `in_progress`.
- [ ] Sound plays for all enabled final states.
- [ ] Sound respects user preferences (disabled states produce no sound).
- [ ] Sound playback failure (e.g. autoplay blocked) does not produce an error.

---

## 6. Deployment History

- [ ] Only final states are stored.
- [ ] Active (in-progress) deployments appear above concluded history entries.
- [ ] Concluded entries are ordered by completion timestamp, newest first.
- [ ] When limit mode is "max deployments", only the N most recent entries are kept; oldest are removed.
- [ ] When limit mode is "max days", entries older than N days are removed.
- [ ] Only the active mode's limit is enforced at any time.
- [ ] Limits are enforced on every add and immediately when the mode or value changes.
- [ ] Popup displays history correctly.

### 6.1 Card Actions — Open / View

- [ ] Clicking anywhere on a card triggers the open action.
- [ ] If a browser tab with a matching deployment URL already exists, it is focused and its window is brought to the foreground; no new tab is opened.
- [ ] If no matching tab exists, a new tab is opened with the deployment URL.
- [ ] URL matching compares path and query string; minor hostname differences on the same server do not prevent a match.

### 6.2 Card Actions — Delete from History

- [ ] Each history card displays a delete (×) button.
- [ ] Clicking the delete button removes that entry from history immediately.
- [ ] Clicking the delete button does not trigger the open action.
- [ ] In-progress (active) cards do not show a delete button.

---

## 7. User Preferences

- [ ] User can enable/disable notifications per final state.
- [ ] Preferences persist across browser sessions.

### 7.0 Dark Mode

- [ ] Settings panel shows a three-option segmented control: Light / System / Dark.
- [ ] Selecting "Light" always applies the light theme.
- [ ] Selecting "Dark" always applies the dark theme.
- [ ] Selecting "System" follows the OS/browser dark-mode preference.
- [ ] The selected mode persists across browser sessions.
- [ ] An existing stored boolean value (`true`/`false`) is treated as `'on'`/`'off'` without error.

### 7.1 Animations

- [ ] Settings panel exposes an Animations toggle.
- [ ] When Animations is on, cards animate in when they appear.
- [ ] When Animations is on, cards animate out when they are removed or deleted.
- [ ] When Animations is off, cards appear and disappear instantly with no transition.
- [ ] The toggle is respected immediately without a page reload.
- [ ] Default value is enabled (on).

### 7.2 History Limits

- [ ] Settings panel shows two radio options: "Max deployments" and "Max days".
- [ ] Selecting a radio enables its associated number input and disables the other.
- [ ] "Max deployments" input: integer, range 1–100, default 5.
- [ ] "Max days" input: integer, range 1–365, default 1.
- [ ] Default mode on first install is "Max deployments".
- [ ] Changing the mode or value immediately enforces the new limit on existing history.
- [ ] History limit settings persist across browser sessions.

---

## 8. Resilience

- [ ] Extension works across tab switches.
- [ ] Extension works if a page is open long-term.
- [ ] Extension works across multiple environments simultaneously.
- [ ] If the service worker restarts mid-deployment (while `in_progress`), the transition to a final state is still detected and notified.
