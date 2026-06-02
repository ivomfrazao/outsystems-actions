import type { UserPreferences } from '../../shared/types';
import type { PopupResponseMessage } from '../../shared/messages';
import { initNotificationsTab } from './notifications';
import { initHistoryTab } from './history';
import { initAppearanceTab } from './appearance';

function showSettingsTab(tab: string): void {
  document.querySelectorAll<HTMLElement>('[data-settings-pane]').forEach(pane => {
    pane.classList.toggle('settings-pane--hidden', pane.dataset['settingsPane'] !== tab);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(btn => {
    btn.classList.toggle('settings-tab--active', btn.dataset['settingsTab'] === tab);
  });
}

function initSettingsTabNav(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(btn => {
    btn.addEventListener('click', () => showSettingsTab(btn.dataset['settingsTab'] ?? ''));
  });
}

// Reads the current form state across all settings panes and persists to background.
// Called by each sub-tab controller whenever any value changes.
function saveCurrentPreferences(): void {
  const limitType = (
    document.querySelector<HTMLInputElement>('input[name="historyLimitType"]:checked')?.value ?? 'count'
  ) as 'count' | 'days';

  const prefs: UserPreferences = {
    notificationsEnabled: (document.getElementById('notificationsEnabled') as HTMLInputElement)?.checked ?? true,
    notifySuccess:        (document.getElementById('notifySuccess')        as HTMLInputElement)?.checked ?? true,
    notifyWarning:        (document.getElementById('notifyWarning')        as HTMLInputElement)?.checked ?? true,
    notifyError:          (document.getElementById('notifyError')          as HTMLInputElement)?.checked ?? true,
    notifyIntervention:   (document.getElementById('notifyIntervention')   as HTMLInputElement)?.checked ?? true,
    notifyUnknown:        (document.getElementById('notifyUnknown')        as HTMLInputElement)?.checked ?? true,
    animationsEnabled:    (document.getElementById('animationsEnabled')    as HTMLInputElement)?.checked ?? true,
    historyLimitType:     limitType,
    historyMaxCount:      parseInt((document.getElementById('historyMaxCount') as HTMLInputElement)?.value ?? '5',  10) || 5,
    historyMaxDays:       parseInt((document.getElementById('historyMaxDays')  as HTMLInputElement)?.value ?? '1',  10) || 1,
  };

  chrome.runtime.sendMessage({ type: 'updatePreferences', payload: prefs });
}

export function initSettings(): void {
  showSettingsTab('notifications');
  initSettingsTabNav();

  chrome.runtime.sendMessage({ type: 'getPreferences' }, (response: PopupResponseMessage) => {
    if (response?.type !== 'preferencesResponse') return;
    const prefs = response.payload;
    initNotificationsTab(prefs, saveCurrentPreferences);
    initHistoryTab(prefs, saveCurrentPreferences);
    initAppearanceTab(prefs, saveCurrentPreferences);
  });
}
