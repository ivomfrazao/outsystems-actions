import type {
  ActiveDeploymentState,
  DeploymentHistoryEntry,
  PopupResponseMessage,
  UserPreferences,
} from './types';
import { DeploymentStatus } from './types';

type TagStyle = 'in-progress' | 'success' | 'warning' | 'error' | 'intervention';

const TAG_LABELS: Record<string, { label: string; style: TagStyle }> = {
  [DeploymentStatus.InProgress]:   { label: 'In Progress',   style: 'in-progress'  },
  [DeploymentStatus.Success]:      { label: 'Success',       style: 'success'      },
  [DeploymentStatus.Warning]:      { label: 'Warning',       style: 'warning'      },
  [DeploymentStatus.Error]:        { label: 'Error',         style: 'error'        },
  [DeploymentStatus.Intervention]: { label: 'Intervention',  style: 'intervention' },
};

function tag(status: string): string {
  const t = TAG_LABELS[status];
  if (!t) return '';
  return `<span class="tag tag-${t.style}">${t.label}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'clearBadge' });

  let active: ActiveDeploymentState[] = [];
  let history: DeploymentHistoryEntry[] = [];
  let loaded = 0;

  function tryRender(): void {
    if (++loaded === 2) renderDeployments(active, history);
  }

  chrome.runtime.sendMessage({ type: 'getActiveDeployments' }, (response: PopupResponseMessage) => {
    if (response?.type === 'activeDeploymentsResponse') {
      active = response.payload.active;
    }
    tryRender();
  });

  chrome.runtime.sendMessage({ type: 'getHistory' }, (response: PopupResponseMessage) => {
    if (response?.type === 'historyResponse') {
      history = response.payload.history;
    }
    tryRender();
  });

  chrome.runtime.sendMessage({ type: 'getPreferences' }, (response: PopupResponseMessage) => {
    if (response?.type === 'preferencesResponse') {
      setPreferences(response.payload);
    }
  });
});

function renderDeployments(active: ActiveDeploymentState[], history: DeploymentHistoryEntry[]): void {
  const container = document.getElementById('deployments');
  if (!container) return;

  const inProgress = active
    .filter(d => d.currentStatus === DeploymentStatus.InProgress)
    .sort((a, b) => b.lastUpdate - a.lastUpdate);

  if (inProgress.length === 0 && history.length === 0) {
    container.innerHTML = '<p class="empty">No recent deployments.</p>';
    return;
  }

  container.innerHTML = '';

  inProgress.forEach(item => {
    const div = document.createElement('div');
    div.className = 'deployment-item';
    div.innerHTML = `
      <strong>${item.name ?? 'Unknown'}</strong>${tag(DeploymentStatus.InProgress)}
      <div class="deployment-meta">
        ${item.environment ?? 'Unknown'} &middot; started ${new Date(item.lastUpdate).toLocaleTimeString()}
      </div>
      <div class="deployment-link"><a href="${item.url}" target="_blank">View</a></div>
    `;
    container.appendChild(div);
  });

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'deployment-item';
    div.innerHTML = `
      <strong>${item.name ?? 'Unknown'}</strong>${tag(item.status)}
      <div class="deployment-meta">
        ${item.environment ?? 'Unknown'} &middot; ${new Date(item.timestamp).toLocaleTimeString()}
      </div>
      <div class="deployment-link"><a href="${item.url}" target="_blank">View</a></div>
    `;
    container.appendChild(div);
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
