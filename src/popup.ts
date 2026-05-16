import type {
  DeploymentHistoryEntry,
  PopupResponseMessage,
  UserPreferences,
} from './types';

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'clearBadge' });

  chrome.runtime.sendMessage({ type: 'getHistory' }, (response: PopupResponseMessage) => {
    if (response.type === 'historyResponse') {
      displayHistory(response.payload.history);
    }
  });

  chrome.runtime.sendMessage({ type: 'getPreferences' }, (response: PopupResponseMessage) => {
    if (response.type === 'preferencesResponse') {
      setPreferences(response.payload);
    }
  });
});

function displayHistory(history: DeploymentHistoryEntry[]): void {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) return;

  historyDiv.innerHTML = '';
  if (history.length === 0) {
    historyDiv.innerHTML = '<p>No recent deployments.</p>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <strong>${item.name ?? 'Unknown'}</strong> (${item.environment ?? 'Unknown'})<br>
      ${item.status} at ${new Date(item.timestamp).toLocaleString()}<br>
      <a href="${item.url}" target="_blank">View</a>
    `;
    historyDiv.appendChild(div);
  });
}

const PREF_IDS = ['notifySuccess', 'notifyWarning', 'notifyError', 'notifyIntervention'] as const;

function getCheckbox(id: keyof UserPreferences): HTMLInputElement | null {
  return document.getElementById(id) as HTMLInputElement | null;
}

function setPreferences(prefs: UserPreferences): void {
  for (const id of PREF_IDS) {
    const el = getCheckbox(id);
    if (el) {
      el.checked = prefs[id];
      el.addEventListener('change', updatePreferences);
    }
  }
}

function updatePreferences(): void {
  const prefs: UserPreferences = {
    notifySuccess:      getCheckbox('notifySuccess')?.checked      ?? true,
    notifyWarning:      getCheckbox('notifyWarning')?.checked      ?? true,
    notifyError:        getCheckbox('notifyError')?.checked        ?? true,
    notifyIntervention: getCheckbox('notifyIntervention')?.checked ?? true,
  };
  chrome.runtime.sendMessage({ type: 'updatePreferences', payload: prefs });
}
