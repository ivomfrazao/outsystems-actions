# OutSystems Actions — Specification Package

This directory contains the specification files for **OutSystems Actions**, a Chromium-based browser extension that detects deployment and publish events in OutSystems Service Center and LifeTime, and notifies the user when they finish or require intervention.

This package is designed for **spec-driven development**, meaning:

- No implementation details are included.
- Requirements are explicit, testable, and unambiguous.
- Another AI or engineer should be able to generate the full implementation from these files.

## Files

- **extension-spec.md** — Main functional and architectural specification.
- **message-flow.md** — Communication patterns between components (message types, payloads, flows).
- **data-model.md** — Data structures used across the extension (events, history, preferences, state).
- **acceptance-criteria.md** — Independent acceptance criteria for validation and QA.

## Architecture Decision Records

The `adr/` directory contains Architecture Decision Records for non-obvious design choices.

- **[adr/001-custom-i18n.md](adr/001-custom-i18n.md)** — Why a custom i18n module is used instead of Chrome's native `chrome.i18n` API.

## Scope

This spec covers:

- Deployment detection
- Notifications
- Badge indicators
- Sound alerts
- Deployment history
- User preferences
- Multi-tab behaviour
- Service worker resilience

It does *not* cover:

- Custom sound uploads
- Analytics or dashboards
- Syncing across devices
- OutSystems API integrations beyond browser-visible data
