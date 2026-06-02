import type { DeploymentEntry } from '../../shared/types';
import { DeploymentStatus, DeploymentType } from '../../shared/types';

type TagStyle = 'in-progress' | 'success' | 'warning' | 'error' | 'intervention' | 'unknown';

const TAG_LABELS: Record<string, { label: string; style: TagStyle }> = {
  [DeploymentStatus.InProgress]:   { label: 'In Progress',  style: 'in-progress'  },
  [DeploymentStatus.Success]:      { label: 'Success',      style: 'success'      },
  [DeploymentStatus.Warning]:      { label: 'Warning',      style: 'warning'      },
  [DeploymentStatus.Error]:        { label: 'Error',        style: 'error'        },
  [DeploymentStatus.Intervention]: { label: 'Intervention', style: 'intervention' },
  [DeploymentStatus.Unknown]:      { label: 'Unknown',      style: 'unknown'      },
};

const TYPE_LABELS: Partial<Record<string, string>> = {
  [DeploymentType.LifeTimeDeployment]: 'Deploy',
  [DeploymentType.Solution]:           'Solution',
};

// Tracks which card IDs are currently in the DOM so we can diff on each render.
const renderedCardIds = new Set<string>();

function animationsEnabled(): boolean {
  return document.body.classList.contains('popup--animated');
}

function buildCard(entry: DeploymentEntry, isHistory: boolean): HTMLElement {
  const { id, name, status, type: deploymentType, environment, server, timestamp, url, startTime, endTime, tabId } = entry;
  const t         = TAG_LABELS[status];
  const typeLabel = TYPE_LABELS[deploymentType] ?? null;

  const card = document.createElement('div');
  card.className       = 'card';
  card.dataset['cardId'] = id;

  const accent = document.createElement('div');
  accent.className = `card__accent${t ? ` card__accent--${t.style}` : ''}`;

  const body = document.createElement('div');
  body.className = 'card__body';

  // Top row: name | tag | delete (history only)
  const top = document.createElement('div');
  top.className = 'card__top';

  const nameEl = document.createElement('span');
  nameEl.className   = 'card__name';
  nameEl.textContent = name ?? typeLabel ?? 'Unknown';
  top.appendChild(nameEl);

  if (t) {
    const tagEl = document.createElement('span');
    tagEl.className   = `card__tag card__tag--${t.style}`;
    tagEl.textContent = t.label;
    top.appendChild(tagEl);
  }

  if (isHistory) {
    const del = document.createElement('button');
    del.className = 'btn-delete';
    del.title     = 'Delete from history';
    del.setAttribute('aria-label', 'Delete from history');
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'deleteDeployment', payload: { id } });
      if (animationsEnabled()) {
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

  // Meta row: type label · server · environment (omit nulls)
  const metaParts = [typeLabel, server, environment].filter((p): p is string => p != null && p !== '');
  if (metaParts.length > 0) {
    const meta = document.createElement('div');
    meta.className   = 'card__meta';
    meta.textContent = metaParts.join(' · ');
    body.appendChild(top);
    body.appendChild(meta);
  } else {
    body.appendChild(top);
  }

  // Time row: date + start → end times
  const d       = new Date(timestamp);
  const dateStr = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  let timeContent: string;
  if (startTime && endTime) {
    timeContent = `${dateStr} · ${startTime} → ${endTime}`;
  } else if (startTime) {
    timeContent = `${dateStr} · ${startTime}`;
  } else {
    timeContent = `${dateStr} · ${d.toLocaleTimeString()}`;
  }
  const time = document.createElement('div');
  time.className   = 'card__time';
  time.textContent = timeContent;
  body.appendChild(time);

  card.appendChild(accent);
  card.appendChild(body);

  card.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'openDeployment', payload: { url, tabId } });
  });

  return card;
}

export function renderDeployments(allDeployments: DeploymentEntry[]): void {
  const list  = document.querySelector<HTMLElement>('[data-list="deployments"]');
  const badge = document.querySelector<HTMLElement>('[data-badge="deployments"]');
  const empty = document.querySelector<HTMLElement>('[data-empty="deployments"]');
  if (!list) return;

  const inProgress = allDeployments
    .filter(d => d.status === DeploymentStatus.InProgress)
    .sort((a, b) => b.timestamp - a.timestamp);

  const history = allDeployments
    .filter(d => d.status !== DeploymentStatus.InProgress)
    .sort((a, b) => b.timestamp - a.timestamp);

  const total = inProgress.length + history.length;
  if (badge) badge.textContent = String(total);
  if (empty) empty.style.display = total > 0 ? 'none' : '';

  const desired: Array<{ id: string; build: () => HTMLElement }> = [
    ...inProgress.map(item => ({ id: item.id, build: () => buildCard(item, false) })),
    ...history.map(item => ({ id: item.id, build: () => buildCard(item, true) })),
  ];

  const desiredIds = new Set(desired.map(d => d.id));

  // Remove cards that are no longer in the desired set.
  for (const cardId of [...renderedCardIds]) {
    if (!desiredIds.has(cardId)) {
      const el = list.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(cardId)}"]`);
      if (el) {
        renderedCardIds.delete(cardId);
        if (animationsEnabled()) {
          el.classList.add('card--leaving');
          el.addEventListener('animationend', () => el.remove(), { once: true });
        } else {
          el.remove();
        }
      }
    }
  }

  // Add new cards at the correct position so in-progress always lands above history.
  for (let i = 0; i < desired.length; i++) {
    const { id, build } = desired[i];
    if (!renderedCardIds.has(id)) {
      const el = build();
      if (animationsEnabled()) el.classList.add('card--entering');
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
