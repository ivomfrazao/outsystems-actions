import type { UserPreferences } from '../../shared/types';
import { DarkMode } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/constants';
import type { SupportedLocale } from '../../shared/i18n';
import { initI18n, applyI18n, saveLanguagePreference } from '../../shared/i18n';

export function applyAnimations(enabled: boolean): void {
  document.body.classList.toggle('popup--animated', enabled);
}

export function applyTheme(mode: DarkMode): void {
  const isDark = mode === DarkMode.On || (mode === DarkMode.System && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('popup--dark', isDark);
  document.querySelectorAll<HTMLElement>('#darkModeSeg .seg__btn').forEach(btn => {
    btn.classList.toggle('seg__btn--active', btn.dataset['value'] === mode);
  });
}

// Dark mode is stored separately from UserPreferences (legacy key). It must be
// initialized immediately on load so the correct theme is applied before any
// content renders, independent of the async preferences fetch.
export function initTheme(): void {
  chrome.storage.local.get(STORAGE_KEYS.darkMode, (result) => {
    const stored = result[STORAGE_KEYS.darkMode];
    // Migrate from the old boolean format (true → On, false → Off).
    let mode: DarkMode;
    if      (stored === true)                                         mode = DarkMode.On;
    else if (stored === false)                                        mode = DarkMode.Off;
    else if ((Object.values(DarkMode) as unknown[]).includes(stored)) mode = stored as DarkMode;
    else                                                              mode = DarkMode.System;
    applyTheme(mode);
  });

  document.querySelectorAll<HTMLButtonElement>('#darkModeSeg .seg__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset['value'] as DarkMode;
      applyTheme(mode);
      chrome.storage.local.set({ [STORAGE_KEYS.darkMode]: mode });
    });
  });
}

function initLanguageSelector(currentLang: SupportedLocale): void {
  const select = document.getElementById('languageSelect') as HTMLSelectElement | null;
  if (!select) return;
  select.value = currentLang;
  select.addEventListener('change', async () => {
    const lang = select.value as SupportedLocale;
    saveLanguagePreference(lang);
    await initI18n(lang);
    applyI18n();
    select.value = lang;
  });
}

export function initAppearanceTab(prefs: UserPreferences, currentLang: SupportedLocale, onSave: () => void): void {
  applyAnimations(prefs.animationsEnabled);
  const el = document.getElementById('animationsEnabled') as HTMLInputElement | null;
  if (el) {
    el.checked = prefs.animationsEnabled;
    el.addEventListener('change', () => {
      applyAnimations(el.checked);
      onSave();
    });
  }

  initLanguageSelector(currentLang);
}
