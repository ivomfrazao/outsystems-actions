import type { UserPreferences } from '../../shared/types';

type DarkModePreference = 'on' | 'off' | 'system';

export function applyAnimations(enabled: boolean): void {
  document.body.classList.toggle('popup--animated', enabled);
}

export function applyTheme(mode: DarkModePreference): void {
  const isDark = mode === 'on' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('popup--dark', isDark);
  document.querySelectorAll<HTMLElement>('#darkModeSeg .seg__btn').forEach(btn => {
    btn.classList.toggle('seg__btn--active', btn.dataset['value'] === mode);
  });
}

// Dark mode is stored separately from UserPreferences (legacy key). It must be
// initialized immediately on load so the correct theme is applied before any
// content renders, independent of the async preferences fetch.
export function initTheme(): void {
  chrome.storage.local.get('darkMode', (result) => {
    const stored = result['darkMode'];
    // Migrate from the old boolean format (true → 'on', false → 'off').
    let mode: DarkModePreference;
    if      (stored === true)                                         mode = 'on';
    else if (stored === false)                                        mode = 'off';
    else if (stored === 'on' || stored === 'off' || stored === 'system') mode = stored;
    else                                                              mode = 'system';
    applyTheme(mode);
  });

  document.querySelectorAll<HTMLButtonElement>('#darkModeSeg .seg__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset['value'] as DarkModePreference;
      applyTheme(mode);
      chrome.storage.local.set({ darkMode: mode });
    });
  });
}

export function initAppearanceTab(prefs: UserPreferences, onSave: () => void): void {
  applyAnimations(prefs.animationsEnabled);
  const el = document.getElementById('animationsEnabled') as HTMLInputElement | null;
  if (!el) return;
  el.checked = prefs.animationsEnabled;
  el.addEventListener('change', () => {
    applyAnimations(el.checked);
    onSave();
  });
}
