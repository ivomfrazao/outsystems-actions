import { POLL_INTERVAL_MS } from '../shared/constants';
import { initNav, initSwipe } from './navigation';
import { refresh } from './deployments/service';
import { initTheme } from './settings/appearance';
import { initSettings } from './settings/service';
import { initI18n, applyI18n, loadLanguagePreference } from '../shared/i18n';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  const lang = await loadLanguagePreference();
  await initI18n(lang);
  applyI18n();

  initNav();
  initSwipe();

  chrome.runtime.sendMessage({ type: 'clearBadge' });
  initSettings(lang);

  refresh();
  setInterval(refresh, POLL_INTERVAL_MS);
});
