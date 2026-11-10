# Changelog

## Unreleased

### Changed

- **Consistent status colors** — the tab prefix, popup labels and toolbar badge now use the same color for each status (in progress is blue, warning is yellow, intervention is purple).

---

## 1.2.1 — 2026-11-01

### Changed

- Removed the unused `scripting` permission.

---

## 1.2.0 — 2026-11-01

### Added

- **About tab** — Settings → About shows the installed version and links to the GitHub repository, release notes, and pre-filled forms to report a bug or suggest a feature.
- **Debug logging** — an opt-in switch in Settings → About records what the extension detects on Service Center and LifeTime pages and how it handles each update. The log can be downloaded or copied to attach to a bug report, and stays on the device until deleted.

### Changed

- **History limit changes need confirmation** — changes in Settings → History are no longer applied immediately. **Apply** becomes available once a value changes, and a message shows how many entries will be deleted.
- **Larger default history limits** — 20 entries or 7 days (previously 5 entries or 1 day). Existing saved settings are not changed.

### Fixed

- Browser notifications could show translation keys (e.g. `notif_type_module`) instead of text. The notification body is now also translated.
- After the browser idled, the first event could be handled before saved state had loaded, which could overwrite history, ignore notification filters, or show default settings in the popup.
- Module publishes now show the correct module name and label.

---

## 1.1.0 — 2026-06-02

### Added

- **Internationalisation** — all UI strings, settings labels, card status tags, and browser notification text are now externalised into locale JSON files.
- **Language setting** — a Language dropdown in Settings → Appearance lets the user switch between English and Portuguese immediately, without reopening the popup. The choice persists across sessions.
- **Portuguese translation** — full translation of all user-facing strings.

### Changed

- The main panel is now labelled **Processes** (previously Deployments) to better reflect that the extension covers both publish and deployment operations.

---

## 1.0.0

Initial release.
