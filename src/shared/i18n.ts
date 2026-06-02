export type SupportedLocale = 'en' | 'pt';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'pt'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

let messages: Record<string, string> = {};

export async function initI18n(locale: SupportedLocale = DEFAULT_LOCALE): Promise<void> {
  try {
    const res = await fetch(chrome.runtime.getURL(`locales/${locale}.json`));
    messages = await res.json() as Record<string, string>;
  } catch {
    if (locale !== DEFAULT_LOCALE) {
      const res = await fetch(chrome.runtime.getURL(`locales/${DEFAULT_LOCALE}.json`));
      messages = await res.json() as Record<string, string>;
    }
  }
}

export function t(key: string): string {
  return messages[key] ?? key;
}

// Walks all [data-i18n] elements and sets their textContent from the loaded locale.
export function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset['i18n'] ?? '';
    const text = t(key);
    if (text !== key) el.textContent = text;
  });
}

export function loadLanguagePreference(): Promise<SupportedLocale> {
  return new Promise(resolve => {
    chrome.storage.local.get('language', result => {
      const lang = result['language'] as string;
      resolve((SUPPORTED_LOCALES as readonly string[]).includes(lang)
        ? lang as SupportedLocale
        : DEFAULT_LOCALE);
    });
  });
}

export function saveLanguagePreference(locale: SupportedLocale): void {
  chrome.storage.local.set({ language: locale });
}
