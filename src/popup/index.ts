import { POLL_INTERVAL_MS } from '../shared/constants';
import { initNav, initSwipe } from './navigation';
import { refresh } from './deployments/service';
import { initTheme } from './settings/appearance';
import { initSettings } from './settings/service';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initSwipe();

  chrome.runtime.sendMessage({ type: 'clearBadge' });
  initSettings();

  refresh();
  setInterval(refresh, POLL_INTERVAL_MS);
});
