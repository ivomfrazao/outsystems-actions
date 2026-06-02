# ADR 001 — Custom i18n Module over Chrome's Native `chrome.i18n`

**Status:** Accepted  
**Date:** 2026-06-02

---

## Context

The extension needed a way for users to select their preferred display language from the Settings → Appearance tab. This required evaluating how to externalise strings and switch between locales at runtime.

Chrome provides a built-in internationalisation mechanism: a `_locales/` directory containing `messages.json` files per locale, accessed via `chrome.i18n.getMessage(key)`. This is the platform-native solution and is well documented. It was the first option considered.

---

## Problem with Chrome's Native `chrome.i18n`

`chrome.i18n.getMessage()` resolves strings using the **browser's UI language**, which is set in Chrome's own settings and reflects the user's operating system or browser language preference. There is no Chrome API to override this at runtime from within an extension.

This means an extension cannot tell `chrome.i18n` to return Portuguese strings while the browser is set to English. The locale used is fixed from the browser's perspective — the extension has no say.

As a result, `chrome.i18n` is incompatible with the requirement. It works well when you want the extension to follow the browser language automatically (a reasonable default for many extensions), but it cannot support a user-controlled language selector inside the extension's own UI.

Note: `_locales/` and `__MSG_key__` substitution in `manifest.json` (used for the extension's name and description in the Chrome Web Store) continue to work with the browser language and are unaffected by this decision. That use remains valid and separate.

---

## Decision

Use a custom i18n module (`src/shared/i18n.ts`) backed by flat JSON locale files in `src/locales/`.

The module exposes:

- `initI18n(locale)` — fetches the locale JSON via `chrome.runtime.getURL` and loads it into a module-level map. Falls back to English if the requested locale file cannot be loaded.
- `t(key)` — synchronous string lookup. Returns the key itself if the messages map is not yet populated, making it safe to call before `initI18n` resolves.
- `applyI18n()` — walks all `[data-i18n]` elements in the DOM and sets their `textContent` from the current locale. Called once after `initI18n` resolves, and again whenever the user changes language.
- `loadLanguagePreference()` / `saveLanguagePreference(locale)` — reads and writes the selected locale to `chrome.storage.local` under the key `language`, following the same pattern used for `darkMode`.

---

## How It Works at Runtime

**Popup open:**

1. `loadLanguagePreference()` reads the stored locale (or defaults to `'en'`).
2. `initI18n(locale)` fetches `locales/<locale>.json`.
3. `applyI18n()` replaces `textContent` on every `[data-i18n]` element in one DOM pass.
4. Dynamically-rendered card content (status tags, type labels, delete button labels) calls `t(key)` at card-build time, so cards always reflect the current locale.

**Language change (user interaction):**

1. The user picks a language from the dropdown; `saveLanguagePreference(lang)` writes it to storage.
2. `initI18n(lang)` fetches the new locale file.
3. `applyI18n()` re-applies all `[data-i18n]` labels in place — no popup reload needed.

**Background service worker:**

1. `loadLanguagePreference()` + `initI18n()` are called once at startup, making `t()` available synchronously when `createNotification` runs.
2. A `chrome.storage.onChanged` listener re-calls `initI18n()` when the `language` key changes, keeping notification text in sync with the user's language selection without requiring a service worker restart.

---

## Adding a New Language

1. Create `src/locales/<code>.json` with all keys from `en.json` translated.
2. Add the code to `SUPPORTED_LOCALES` in `src/shared/i18n.ts`.
3. Add an `<option value="<code>">` to the `#languageSelect` element in `src/popup.html`. Option labels should use the language's native name (e.g. "Português", not "Portuguese") so users can recognise their language regardless of the current UI language.

No other files need to change.

---

## Consequences

**Positive:**

- Language selection is fully under user control and takes effect immediately.
- Adding a new language requires no TypeScript changes — only a JSON file, an array entry, and an HTML `<option>`.
- The locale files are plain JSON, making them easy to hand off to translators or integrate with a translation management system.
- `t(key)` degrades gracefully: missing keys display the key name rather than crashing or showing nothing.

**Negative / Trade-offs:**

- Each locale file is loaded via `fetch` at runtime, adding one network round-trip per locale switch (within the extension's own origin — fast in practice, but not zero cost).
- Locale files must be copied to `dist/` as static assets during the build step; they cannot be bundled inline by esbuild without losing the ability to load them on demand.
- `chrome.i18n` cannot be used for popup strings, so the extension's manifest strings (name, description) and its runtime strings use separate mechanisms, which is a minor conceptual split.
- The `messages` map in `i18n.ts` is module-level state. In a service worker, this state persists only as long as the worker is alive; after a restart, `initI18n` must be called again before `t()` returns anything meaningful. The background's `loadLanguagePreference().then(initI18n)` call at startup handles this, but the window between worker restart and the first notification is a theoretical risk (practically zero, since a notification can only fire after a content script message is processed, which gives the worker time to initialise).
