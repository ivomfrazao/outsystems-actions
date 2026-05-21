import type {
  ActiveDeployments,
  ActiveDeploymentState,
  BackgroundInboundMessage,
  DeploymentHistoryEntry,
  DeploymentUpdateMessage,
  FinalStatus,
  PopupResponseMessage,
  UserPreferences,
} from './types';
import {
  DeploymentStatus,
  DeploymentType,
  STORAGE_KEYS,
} from './types';

// ── Lookup tables ─────────────────────────────────────────────────────────────

const PREF_KEY_MAP = {
  [DeploymentStatus.Success]:      'notifySuccess',
  [DeploymentStatus.Warning]:      'notifyWarning',
  [DeploymentStatus.Error]:        'notifyError',
  [DeploymentStatus.Intervention]: 'notifyIntervention',
} as const satisfies Record<FinalStatus, keyof UserPreferences>;

const BADGE_CONFIG = {
  [DeploymentStatus.Success]:      { text: '✓', color: '#00FF00' },
  [DeploymentStatus.Warning]:      { text: '!', color: '#FFFF00' },
  [DeploymentStatus.Error]:        { text: '!', color: '#FF0000' },
  [DeploymentStatus.Intervention]: { text: '!', color: '#FF0000' },
} as const satisfies Record<FinalStatus, { text: string; color: string }>;

// ── State ─────────────────────────────────────────────────────────────────────

let activeDeployments: ActiveDeployments = {};

chrome.storage.session.get(
  [STORAGE_KEYS.activeDeployments],
  (result: { activeDeployments?: ActiveDeployments }) => {
    if (result.activeDeployments) {
      activeDeployments = result.activeDeployments;
    }
  }
);

let userPreferences: UserPreferences = {
  notifySuccess:      true,
  notifyWarning:      true,
  notifyError:        true,
  notifyIntervention: true,
  animationsEnabled:  true,
  historyLimitType:   'count',
  historyMaxCount:    5,
  historyMaxDays:     1,
};

chrome.storage.local.get(
  [STORAGE_KEYS.preferences],
  (result: { preferences?: UserPreferences }) => {
    if (result.preferences) {
      userPreferences = result.preferences;
    }
  }
);

let deploymentHistory: DeploymentHistoryEntry[] = [];

chrome.storage.local.get(
  [STORAGE_KEYS.history],
  (result: { history?: DeploymentHistoryEntry[] }) => {
    if (result.history) {
      deploymentHistory = result.history;
    }
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function sameDeploymentUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.pathname === ub.pathname && ua.search === ub.search;
  } catch {
    return a === b;
  }
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function saveHistory(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.history]: deploymentHistory });
}

function savePreferences(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.preferences]: userPreferences });
}

function persistActiveDeployments(): void {
  chrome.storage.session.set({ [STORAGE_KEYS.activeDeployments]: activeDeployments });
}

// Called both when a new entry is added and when preferences change, so limits
// are applied immediately whenever they tighten.
function enforceHistoryLimits(): void {
  if (userPreferences.historyLimitType === 'days') {
    const cutoff = Date.now() - userPreferences.historyMaxDays * 86_400_000;
    deploymentHistory = deploymentHistory.filter(e => e.timestamp >= cutoff);
  } else {
    deploymentHistory = deploymentHistory.slice(0, userPreferences.historyMaxCount);
  }
  saveHistory();
}

function addToHistory(entry: DeploymentHistoryEntry): void {
  deploymentHistory.unshift(entry);
  enforceHistoryLimits();
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function updateBadge(status: FinalStatus): void {
  const { text, color } = BADGE_CONFIG[status];
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

// ── Notifications ────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  [DeploymentType.eSpace]:             'Application',
  [DeploymentType.Solution]:           'Solution',
  [DeploymentType.LifeTimeDeployment]: 'LifeTime',
};

const ACTION_LABEL: Record<string, string> = {
  [DeploymentType.eSpace]:             'Publish',
  [DeploymentType.Solution]:           'Publish',
  [DeploymentType.LifeTimeDeployment]: 'Deployment',
};

const STATUS_LABEL: Record<FinalStatus, string> = {
  [DeploymentStatus.Success]:      'Successful',
  [DeploymentStatus.Warning]:      'with Warnings',
  [DeploymentStatus.Error]:        'with Errors',
  [DeploymentStatus.Intervention]: 'Needs Intervention',
};

function createNotification(entry: DeploymentHistoryEntry): void {
  if (!userPreferences[PREF_KEY_MAP[entry.status]]) {
    return;
  }
  const typeLabel   = TYPE_LABEL[entry.type]   ?? 'Deployment';
  const action      = ACTION_LABEL[entry.type]  ?? 'Deployment';
  const statusLabel = STATUS_LABEL[entry.status];
  const options: chrome.notifications.NotificationOptions<true> = {
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: `${typeLabel} ${action} ${statusLabel}`,
    message: `${entry.name ?? 'Unknown'} in ${entry.environment ?? 'Unknown'} at ${new Date(entry.timestamp).toLocaleTimeString()}`,
    requireInteraction: false,
  };
  chrome.notifications.create(`deployment-${entry.id}`, options);
}

// ── Deployment update handling ────────────────────────────────────────────────

function handleDeploymentUpdate(
  message: DeploymentUpdateMessage,
  sender: chrome.runtime.MessageSender
): void {
  if (sender.tab?.id === undefined) return;
  const tabId: number = sender.tab.id;

  const payload = message.payload;
  const timestamp = Date.now();
  const id = `${timestamp}-${tabId}`;

  // If history already has a result for this URL and this is the first message
  // from the new tab, the page is still loading — skip to avoid a false
  // in_progress card appearing alongside the existing history card.
  if (!activeDeployments[tabId] && payload.status === DeploymentStatus.InProgress &&
      deploymentHistory.some(h => sameDeploymentUrl(h.url, payload.url))) {
    return;
  }

  // Remove stale entries for the same deployment URL from other tabs (e.g. the
  // user opened the page in a new tab via the View button or a manual refresh).
  // Preserve the original lastUpdate and startTime so the card times don't reset.
  let inheritedUpdate: number | undefined;
  let inheritedStartTime: string | null | undefined;
  for (const existingId of Object.keys(activeDeployments).map(Number)) {
    if (existingId !== tabId && sameDeploymentUrl(activeDeployments[existingId].url, payload.url)) {
      const stale = activeDeployments[existingId];
      if (stale.currentStatus === payload.status) {
        inheritedUpdate    = stale.lastUpdate;
        inheritedStartTime = stale.startTime;
      }
      delete activeDeployments[existingId];
    }
  }

  const current = activeDeployments[tabId];

  // Name can arrive null on the first message (before the progress table renders)
  // and become available on a later keepalive. Patch it in without a full state change.
  if (current && current.currentStatus === payload.status && current.name === null && payload.name !== null) {
    activeDeployments[tabId] = { ...current, name: payload.name };
    persistActiveDeployments();
  }

  if (!current || current.currentStatus !== payload.status) {
    const next: ActiveDeploymentState = {
      currentStatus: payload.status,
      lastUpdate: inheritedUpdate ?? timestamp,
      name: payload.name,
      environment: payload.environment,
      server: payload.server,
      url: payload.url,
      deploymentType: payload.deploymentType,
      startTime: payload.startTime ?? inheritedStartTime ?? null,
      endTime: payload.endTime,
    };
    activeDeployments[tabId] = next;
    persistActiveDeployments();

    if (
      payload.status !== DeploymentStatus.InProgress &&
      current &&
      current.currentStatus === DeploymentStatus.InProgress
    ) {
      const finalStatus = payload.status;
      const entry: DeploymentHistoryEntry = {
        id,
        type: payload.deploymentType,
        name: payload.name,
        environment: payload.environment,
        server: payload.server,
        status: finalStatus,
        timestamp,
        url: payload.url,
        startTime: current.startTime ?? payload.startTime,
        endTime: payload.endTime,
      };
      updateBadge(finalStatus);
      createNotification(entry);
      addToHistory(entry);
    }
  }
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((
  message: BackgroundInboundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: PopupResponseMessage) => void
): boolean | void => {
  switch (message.type) {
    case 'deploymentUpdate':
      handleDeploymentUpdate(message, sender);
      break;
    case 'getHistory':
      sendResponse({ type: 'historyResponse', payload: { history: deploymentHistory } });
      break;
    case 'getActiveDeployments':
      // Read from session storage directly: the in-memory activeDeployments may be
      // empty if the service worker was terminated and just restarted (async restore
      // not yet complete). Session storage survives service worker restarts.
      chrome.storage.session.get(
        [STORAGE_KEYS.activeDeployments],
        (result: { activeDeployments?: ActiveDeployments }) => {
          const stored = result.activeDeployments ?? activeDeployments;
          sendResponse({ type: 'activeDeploymentsResponse', payload: { active: Object.values(stored) } });
        }
      );
      return true; // keep channel open until async sendResponse fires
    case 'getPreferences':
      sendResponse({ type: 'preferencesResponse', payload: userPreferences });
      break;
    case 'updatePreferences':
      userPreferences = message.payload;
      savePreferences();
      enforceHistoryLimits();
      sendResponse({ type: 'preferencesUpdated' });
      break;
    case 'clearBadge':
      clearBadge();
      break;
    // chrome.tabs.query({}) (without a url pattern) is required here because
    // match patterns don't support query strings, so we filter manually with
    // sameDeploymentUrl instead.
    case 'openDeployment': {
      const { url } = message.payload;
      chrome.tabs.query({}, (tabs) => {
        const tab = tabs.find(t => t.url !== undefined && sameDeploymentUrl(t.url, url));
        if (tab?.id !== undefined) {
          chrome.tabs.update(tab.id, { active: true });
          if (tab.windowId !== undefined) {
            chrome.windows.update(tab.windowId, { focused: true });
          }
        } else {
          chrome.tabs.create({ url });
        }
      });
      break;
    }
    case 'deleteHistoryEntry': {
      const { id } = message.payload;
      deploymentHistory = deploymentHistory.filter(e => e.id !== id);
      saveHistory();
      break;
    }
  }
});

// ── Notification click ────────────────────────────────────────────────────────

chrome.notifications.onClicked.addListener((notificationId: string) => {
  if (notificationId.startsWith('deployment-')) {
    const id = notificationId.replace(/^deployment-/, '');
    const entry = deploymentHistory.find(h => h.id === id);
    if (entry) {
      chrome.tabs.query({ url: entry.url }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id !== undefined) {
          chrome.tabs.update(tab.id, { active: true });
        }
      });
    }
    clearBadge();
  }
  chrome.notifications.clear(notificationId);
});
