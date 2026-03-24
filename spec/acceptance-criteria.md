# OutSystems Deployment Notifier — Acceptance Criteria
**Version:** 1.1

---

# 1. Activation

- [ ] Extension activates only on Service Center and LifeTime pages.  
- [ ] Extension remains inactive on all other domains.  

---

# 2. Deployment Detection

## 2.1 Service Center — eSpace Publish

- [ ] Detects `in_progress` states.  
- [ ] Detects `success`.  
- [ ] Detects `warning`.  
- [ ] Detects `error`.  
- [ ] Detects `intervention`.  

## 2.2 Service Center — Solution Publish

- [ ] Detects `in_progress` states.  
- [ ] Detects `success`.  
- [ ] Detects `warning`.  
- [ ] Detects `error`.  
- [ ] Detects `intervention`.  

## 2.3 LifeTime — Deployment Plans

- [ ] Detects `in_progress` states.  
- [ ] Detects `success`.  
- [ ] Detects `warning`.  
- [ ] Detects `error`.  
- [ ] Detects `intervention`.  

## 2.4 Multi-Tab Behavior

- [ ] Deployments in different tabs are handled independently.  
- [ ] Notifications reference the correct tab.  

---

# 3. Notifications

- [ ] No notifications for `in_progress`.  
- [ ] Notification appears within 2 seconds of final state detection.  
- [ ] Notification includes name, environment, status, timestamp.  
- [ ] Clicking notification focuses correct tab.  

---

# 4. Badge Indicator

- [ ] Badge not updated for `in_progress`.  
- [ ] Badge displays correct text and color for final states.  
- [ ] Badge clears when popup opens or notification is clicked.  

---

# 5. Sound Alerts

- [ ] No sound for `in_progress`.  
- [ ] Sound plays for all final states.  
- [ ] Sound respects user preferences.  

---

# 6. Deployment History

- [ ] Only final states stored.  
- [ ] Stores last 5 entries.  
- [ ] Oldest entries removed automatically.  
- [ ] Popup displays history correctly.  

---

# 7. User Preferences

- [ ] User can enable/disable notifications for final states.  
- [ ] Preferences persist across sessions.  

---

# 8. Resilience

- [ ] Works across tab switches.  
- [ ] Works if page is open long-term.  
- [ ] Works across multiple environments.  
