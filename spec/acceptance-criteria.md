# OutSystems Actions — Acceptance Criteria

**Version:** 1.2

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
- [ ] Stores at most the last 5 entries.
- [ ] Oldest entries removed automatically on overflow.
- [ ] Popup displays history correctly.

---

## 7. User Preferences

- [ ] User can enable/disable notifications per final state.
- [ ] Preferences persist across browser sessions.

---

## 8. Resilience

- [ ] Extension works across tab switches.
- [ ] Extension works if a page is open long-term.
- [ ] Extension works across multiple environments simultaneously.
- [ ] If the service worker restarts mid-deployment (while `in_progress`), the transition to a final state is still detected and notified.
