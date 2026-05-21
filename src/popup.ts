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

type DarkModePreference = 'on' | 'off' | 'system';

function applyTheme(mode: DarkModePreference): void {
  const isDark = mode === 'on' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('popup--dark', isDark);
  document.querySelectorAll<HTMLElement>('#darkModeSeg .seg__btn').forEach(btn => {
    btn.classList.toggle('seg__btn--active', btn.dataset['value'] === mode);
  });
}

function initTheme(): void {
  chrome.storage.local.get('darkMode', (result) => {
    const stored = result['darkMode'];
    // Migrate from the old boolean format (true → 'on', false → 'off').
    let mode: DarkModePreference;
    if (stored === true)                                    mode = 'on';
    else if (stored === false)                              mode = 'off';
    else if (stored === 'on' || stored === 'off' || stored === 'system') mode = stored;
    else                                                    mode = 'system';
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

// ── Animations ───────────────────────────────────────────────────────────────

// Toggling .popup--animated on <body> gates all CSS card animations. When the
// class is absent, @keyframes rules under .popup--animated never fire.
let animationsEnabled = true;

function applyAnimations(enabled: boolean): void {
  animationsEnabled = enabled;
  document.body.classList.toggle('popup--animated', enabled);
}

// ── Deployments rendering ────────────────────────────────────────────────────

// Tracks which card IDs are currently in the DOM so we can diff on each render.
const renderedCardIds = new Set<string>();

function buildCard(
  id: string,
  name: string | null,
  status: string,
  environment: string | null,
  server: string | null,
  timestamp: number,
  url: string,
  isHistory: boolean,
  startTime: string | null,
  endTime: string | null,
): HTMLElement {
  const t = TAG_LABELS[status];

  const card = document.createElement('div');
  card.className = 'card';
  card.dataset['cardId'] = id;

  const accent = document.createElement('div');
  accent.className = `card__accent${t ? ` card__accent--${t.style}` : ''}`;

  const body = document.createElement('div');
  body.className = 'card__body';

  // Top row: name | tag | delete (history only)
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

  // History cards get a delete button that stops propagation so it doesn't
  // also trigger the card's open action.
  if (isHistory) {
    const del = document.createElement('button');
    del.className = 'btn-delete';
    del.title = 'Delete from history';
    del.setAttribute('aria-label', 'Delete from history');
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'deleteHistoryEntry', payload: { id } });
      // Optimistically remove the card from the DOM immediately.
      if (animationsEnabled) {
        card.classList.remove('card--entering');
        card.classList.add('card--leaving');
        card.addEventListener('animationend', () => {
          card.remove();
          renderedCardIds.delete(id);
        }, { once: true });
      } else {
        card.remove();
        renderedCardIds.delete(id);
      }
    });
    top.appendChild(del);
  }

  // Meta row: server · environment · time (omit nulls)
  const metaParts = [server, environment].filter((p): p is string => p != null && p !== '');
  if (startTime && endTime) {
    metaParts.push(`${startTime} → ${endTime}`);
  } else if (startTime) {
    metaParts.push(startTime);
  } else {
    metaParts.push(new Date(timestamp).toLocaleTimeString());
  }

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.textContent = metaParts.join(' · ');

  body.appendChild(top);
  body.appendChild(meta);

  card.appendChild(accent);
  card.appendChild(body);

  // Clicking anywhere on the card opens the deployment, reusing the existing
  // browser tab when possible (handled by the background service worker).
  card.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'openDeployment', payload: { url } });
  });

  return card;
}

function renderDeployments(active: ActiveDeploymentState[], history: DeploymentHistoryEntry[]): void {
  const list  = document.querySelector<HTMLElement>('[data-list="deployments"]');
  const badge = document.querySelector<HTMLElement>('[data-badge="deployments"]');
  const empty = document.querySelector<HTMLElement>('[data-empty="deployments"]');
  if (!list) return;

  const inProgress = active
    .filter(d => d.currentStatus === DeploymentStatus.InProgress)
    .sort((a, b) => b.lastUpdate - a.lastUpdate);

  const total = inProgress.length + history.length;
  if (badge) badge.textContent = String(total);
  if (empty) empty.style.display = total > 0 ? 'none' : '';

  // Concluded entries are sorted descending by timestamp regardless of storage order.
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  // Build desired state as ordered list of { id, buildFn }
  const desired: Array<{ id: string; build: () => HTMLElement }> = [
    ...inProgress.map(item => ({
      id: item.url,
      build: () => buildCard(item.url, item.name, DeploymentStatus.InProgress, item.environment, item.server, item.lastUpdate, item.url, false, item.startTime, null),
    })),
    ...sortedHistory.map(item => ({
      id: item.id,
      build: () => buildCard(item.id, item.name, item.status, item.environment, item.server, item.timestamp, item.url, true, item.startTime, item.endTime),
    })),
  ];

  const desiredIds = new Set(desired.map(d => d.id));

  // Remove cards that are no longer in the desired set.
  for (const cardId of [...renderedCardIds]) {
    if (!desiredIds.has(cardId)) {
      const el = list.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(cardId)}"]`);
      if (el) {
        renderedCardIds.delete(cardId);
        if (animationsEnabled) {
          el.classList.add('card--leaving');
          el.addEventListener('animationend', () => el.remove(), { once: true });
        } else {
          el.remove();
        }
      }
    }
  }

  // Add cards that are new to the desired set, inserted at the correct position
  // so inProgress cards always land above history cards without a full re-render.
  for (let i = 0; i < desired.length; i++) {
    const { id, build } = desired[i];
    if (!renderedCardIds.has(id)) {
      const el = build();
      if (animationsEnabled) el.classList.add('card--entering');
      let referenceNode: HTMLElement | null = null;
      for (let j = i + 1; j < desired.length; j++) {
        const next = list.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(desired[j].id)}"]`);
        if (next) { referenceNode = next; break; }
      }
      list.insertBefore(el, referenceNode);
      renderedCardIds.add(id);
    }
  }
}

// ── Preferences ──────────────────────────────────────────────────────────────

const BOOL_PREF_IDS = ['notifySuccess', 'notifyWarning', 'notifyError', 'notifyIntervention', 'animationsEnabled'] as const;

function getCheckbox(id: string): HTMLInputElement | null {
  return document.getElementById(id) as HTMLInputElement | null;
}

function getNumberInput(id: string): HTMLInputElement | null {
  return document.getElementById(id) as HTMLInputElement | null;
}

function updateHistoryInputStates(type: 'count' | 'days'): void {
  const countInput = getNumberInput('historyMaxCount');
  const daysInput  = getNumberInput('historyMaxDays');
  if (countInput) countInput.disabled = type !== 'count';
  if (daysInput)  daysInput.disabled  = type !== 'days';
}

function setPreferences(prefs: UserPreferences): void {
  for (const id of BOOL_PREF_IDS) {
    const el = getCheckbox(id);
    if (el) {
      el.checked = prefs[id] as boolean;
      el.addEventListener('change', updatePreferences);
    }
  }

  applyAnimations(prefs.animationsEnabled);

  // History limit type: select the correct radio and wire up change events.
  const limitType = prefs.historyLimitType;
  const limitRadio = document.querySelector<HTMLInputElement>(`input[name="historyLimitType"][value="${limitType}"]`);
  if (limitRadio) limitRadio.checked = true;
  updateHistoryInputStates(limitType);

  document.querySelectorAll<HTMLInputElement>('input[name="historyLimitType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateHistoryInputStates(radio.value as 'count' | 'days');
      updatePreferences();
    });
  });

  const countEl = getNumberInput('historyMaxCount');
  if (countEl) {
    countEl.value = String(prefs.historyMaxCount);
    countEl.addEventListener('change', updatePreferences);
  }

  const daysEl = getNumberInput('historyMaxDays');
  if (daysEl) {
    daysEl.value = String(prefs.historyMaxDays);
    daysEl.addEventListener('change', updatePreferences);
  }
}

function updatePreferences(): void {
  const limitType = (document.querySelector<HTMLInputElement>('input[name="historyLimitType"]:checked')?.value ?? 'count') as 'count' | 'days';
  const prefs: UserPreferences = {
    notifySuccess:      getCheckbox('notifySuccess')?.checked      ?? true,
    notifyWarning:      getCheckbox('notifyWarning')?.checked      ?? true,
    notifyError:        getCheckbox('notifyError')?.checked        ?? true,
    notifyIntervention: getCheckbox('notifyIntervention')?.checked ?? true,
    animationsEnabled:  getCheckbox('animationsEnabled')?.checked  ?? true,
    historyLimitType:   limitType,
    historyMaxCount:    parseInt(getNumberInput('historyMaxCount')?.value ?? '5', 10) || 5,
    historyMaxDays:     parseInt(getNumberInput('historyMaxDays')?.value  ?? '1', 10) || 1,
  };
  applyAnimations(prefs.animationsEnabled);
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
