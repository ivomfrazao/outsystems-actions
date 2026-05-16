import type {
  ActiveDeployments,
  BackgroundInboundMessage,
  DeploymentHistoryEntry,
  DeploymentUpdateMessage,
  FinalStatus,
  PopupResponseMessage,
  UserPreferences,
} from './types';
import {
  DeploymentStatus,
  HISTORY_MAX,
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

function addToHistory(entry: DeploymentHistoryEntry): void {
  deploymentHistory.unshift(entry);
  if (deploymentHistory.length > HISTORY_MAX) {
    deploymentHistory = deploymentHistory.slice(0, HISTORY_MAX);
  }
  saveHistory();
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

// ── Notifications & sound ─────────────────────────────────────────────────────

function playSound(status: FinalStatus, tabId: number): void {
  if (userPreferences[PREF_KEY_MAP[status]]) {
    chrome.tabs.sendMessage(tabId, { type: 'playSound' }, () => {
      void chrome.runtime.lastError;
    });
  }
}

function createNotification(entry: DeploymentHistoryEntry): void {
  if (!userPreferences[PREF_KEY_MAP[entry.status]]) {
    return;
  }
  const options: chrome.notifications.NotificationOptions<true> = {
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: `Deployment ${entry.status}`,
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

  const current = activeDeployments[tabId];
  if (!current || current.currentStatus !== payload.status) {
    activeDeployments[tabId] = {
      currentStatus: payload.status,
      lastUpdate: timestamp,
    };
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
        status: finalStatus,
        timestamp,
        url: payload.url,
      };
      updateBadge(finalStatus);
      playSound(finalStatus, tabId);
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
): void => {
  switch (message.type) {
    case 'deploymentUpdate':
      handleDeploymentUpdate(message, sender);
      break;
    case 'getHistory':
      sendResponse({ type: 'historyResponse', payload: { history: deploymentHistory } });
      break;
    case 'getPreferences':
      sendResponse({ type: 'preferencesResponse', payload: userPreferences });
      break;
    case 'updatePreferences':
      userPreferences = message.payload;
      savePreferences();
      sendResponse({ type: 'preferencesUpdated' });
      break;
    case 'clearBadge':
      clearBadge();
      break;
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
