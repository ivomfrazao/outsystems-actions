import type {
  ActiveDeploymentState,
  DeploymentHistoryEntry,
  PopupResponseMessage,
  UserPreferences,
} from './types';
import { DeploymentStatus } from './types';

type TagStyle = 'in-progress' | 'success' | 'warning' | 'error' | 'intervention';

const TAG_LABELS: Record<string, { label: string; style: TagStyle }> = {
  [DeploymentStatus.InProgress]:   { label: 'In Progress',  style: 'in-progress'  },
  [DeploymentStatus.Success]:      { label: 'Success',      style: 'success'      },
  [DeploymentStatus.Warning]:      { label: 'Warning',      style: 'warning'      },
  [DeploymentStatus.Error]:        { label: 'Error',        style: 'error'        },
  [DeploymentStatus.Intervention]: { label: 'Intervention', style: 'intervention' },
};

// ── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(isDark: boolean): void {
  document.body.classList.toggle('popup--dark', isDark);
  const checkbox = document.getElementById('darkModeToggle') as HTMLInputElement | null;
  if (checkbox) checkbox.checked = isDark;
}

function initTheme(): void {
  chrome.storage.local.get('darkMode', (result) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = 'darkMode' in result ? (result['darkMode'] as boolean) : prefersDark;
    applyTheme(isDark);
  });

  document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
    const isDark = (e.target as HTMLInputElement).checked;
    applyTheme(isDark);
    chrome.storage.local.set({ darkMode: isDark });
  });
}

// ── Tab navigation ───────────────────────────────────────────────────────────

function showTab(tab: string): void {
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => {
    panel.classList.toggle('panel--hidden', panel.dataset['panel'] !== tab);
  });
  document.querySelectorAll<HTMLElement>('[data-tab]').forEach(btn => {
    btn.classList.toggle('nav__item--active', btn.dataset['tab'] === tab);
  });
}

function initNav(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset['tab'] ?? ''));
  });
}

// ── Deployments rendering ────────────────────────────────────────────────────

function buildCard(
  name: string | null,
  status: string,
  environment: string | null,
  server: string | null,
  timestamp: number,
  url: string,
): HTMLElement {
  const t = TAG_LABELS[status];

  const card = document.createElement('div');
  card.className = 'card';

  const accent = document.createElement('div');
  accent.className = `card__accent${t ? ` card__accent--${t.style}` : ''}`;

  const body = document.createElement('div');
  body.className = 'card__body';

  // Top row: name | tag | view — all in the same flex line for natural alignment
  const top = document.createElement('div');
  top.className = 'card__top';

  const nameEl = document.createElement('span');
  nameEl.className = 'card__name';
  nameEl.textContent = name ?? 'Unknown';
  top.appendChild(nameEl);

  if (t) {
    const tagEl = document.createElement('span');
    tagEl.className = `card__tag card__tag--${t.style}`;
    tagEl.textContent = t.label;
    top.appendChild(tagEl);
  }

  const link = document.createElement('a');
  link.className = 'btn-view';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View';
  top.appendChild(link);

  // Meta row: server · environment · time (omit nulls)
  const metaParts = [server, environment].filter((p): p is string => p != null && p !== '');
  metaParts.push(new Date(timestamp).toLocaleTimeString());

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.textContent = metaParts.join(' · ');

  body.appendChild(top);
  body.appendChild(meta);

  card.appendChild(accent);
  card.appendChild(body);

  return card;
}

function renderDeployments(active: ActiveDeploymentState[], history: DeploymentHistoryEntry[]): void {
  const list  = document.querySelector<HTMLElement>('[data-list="deployments"]');
  const badge = document.querySelector<HTMLElement>('[data-badge="deployments"]');
  const empty = document.querySelector<HTMLElement>('[data-empty="deployments"]');
  if (!list) return;

  // Remove existing cards but keep the empty-state element in place.
  list.querySelectorAll('.card').forEach(el => el.remove());

  const inProgress = active
    .filter(d => d.currentStatus === DeploymentStatus.InProgress)
    .sort((a, b) => b.lastUpdate - a.lastUpdate);

  const total = inProgress.length + history.length;
  if (badge) badge.textContent = String(total);
  if (empty) empty.style.display = total > 0 ? 'none' : '';

  inProgress.forEach(item =>
    list.appendChild(buildCard(item.name, DeploymentStatus.InProgress, item.environment, item.server, item.lastUpdate, item.url)),
  );
  history.forEach(item =>
    list.appendChild(buildCard(item.name, item.status, item.environment, item.server, item.timestamp, item.url)),
  );
}

// ── Preferences ──────────────────────────────────────────────────────────────

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

// ── Entry point ──────────────────────────────────────────────────────────────

function refresh(): void {
  let active: ActiveDeploymentState[] = [];
  let history: DeploymentHistoryEntry[] = [];
  let loaded = 0;

  function tryRender(): void {
    if (++loaded === 2) renderDeployments(active, history);
  }

  chrome.runtime.sendMessage({ type: 'getActiveDeployments' }, (response: PopupResponseMessage) => {
    if (response?.type === 'activeDeploymentsResponse') active = response.payload.active;
    tryRender();
  });

  chrome.runtime.sendMessage({ type: 'getHistory' }, (response: PopupResponseMessage) => {
    if (response?.type === 'historyResponse') history = response.payload.history;
    tryRender();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();

  chrome.runtime.sendMessage({ type: 'clearBadge' });
  chrome.runtime.sendMessage({ type: 'getPreferences' }, (response: PopupResponseMessage) => {
    if (response?.type === 'preferencesResponse') setPreferences(response.payload);
  });

  refresh();
  setInterval(refresh, 2000);
});
