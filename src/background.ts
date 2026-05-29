import type {
  BackgroundInboundMessage,
  DeploymentEntry,
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
  [DeploymentStatus.Unknown]:      'notifyUnknown',
} as const satisfies Record<FinalStatus, keyof UserPreferences>;

const BADGE_CONFIG = {
  [DeploymentStatus.Success]:      { text: '✓', color: '#00FF00' },
  [DeploymentStatus.Warning]:      { text: '!', color: '#FFFF00' },
  [DeploymentStatus.Error]:        { text: '!', color: '#FF0000' },
  [DeploymentStatus.Intervention]: { text: '!', color: '#FF0000' },
  [DeploymentStatus.Unknown]:      { text: '?', color: '#808080' },
} as const satisfies Record<FinalStatus, { text: string; color: string }>;

// ── State ─────────────────────────────────────────────────────────────────────

let deployments: DeploymentEntry[] = [];

let userPreferences: UserPreferences = {
  notificationsEnabled: true,
  notifySuccess:        true,
  notifyWarning:        true,
  notifyError:          true,
  notifyIntervention:   true,
  notifyUnknown:        true,
  animationsEnabled:    true,
  historyLimitType:     'count',
  historyMaxCount:      5,
  historyMaxDays:       1,
};

// Load persisted state. Also handles one-time migration from the old split
// storage format (history + pendingDeployments + activeDeployments keys).
chrome.storage.local.get(
  [STORAGE_KEYS.deployments, STORAGE_KEYS.preferences, 'history', 'pendingDeployments'],
  (result: Record<string, unknown>) => {
    if (result[STORAGE_KEYS.preferences]) {
      userPreferences = { ...userPreferences, ...result[STORAGE_KEYS.preferences] as UserPreferences };
    }

    if (result[STORAGE_KEYS.deployments]) {
      deployments = result[STORAGE_KEYS.deployments] as DeploymentEntry[];
    } else {
      // ── One-time migration from the old split format ──────────────────────
      type OldHistoryEntry = {
        id: string; type: string; name: string | null; environment: string | null;
        server: string | null; status: string; timestamp: number; url: string;
        startTime: string | null; endTime: string | null;
      };
      type OldPendingEntry = {
        type: string; name: string | null; environment: string | null;
        server: string | null; url: string; startTime: string | null;
      };

      const oldHistory = (result['history'] as OldHistoryEntry[] | undefined) ?? [];
      deployments = oldHistory.map(h => ({
        id: h.id,
        type: h.type as DeploymentEntry['type'],
        name: h.name,
        environment: h.environment,
        server: h.server,
        url: h.url,
        status: h.status as DeploymentEntry['status'],
        timestamp: h.timestamp,
        startTime: h.startTime,
        endTime: h.endTime,
      }));

      const oldPending = result['pendingDeployments'] as Record<string, OldPendingEntry> | undefined;
      if (oldPending) {
        const ts = Date.now();
        for (const entry of Object.values(oldPending)) {
          deployments.unshift({
            id: `${ts}-unknown-${entry.url}`,
            type: entry.type as DeploymentEntry['type'],
            name: entry.name,
            environment: entry.environment,
            server: entry.server,
            url: entry.url,
            status: DeploymentStatus.Unknown,
            timestamp: ts,
            startTime: entry.startTime,
            endTime: null,
          });
        }
      }

      if (oldHistory.length > 0 || oldPending) {
        saveDeployments();
        chrome.storage.local.remove(['history', 'pendingDeployments', 'activeDeployments']);
      }
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

function hasUnknownEntryForUrl(url: string): boolean {
  return deployments.some(
    d => d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, url)
  );
}

// ── Persistence ───────────────────────────────────────────────────────────────

function saveDeployments(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.deployments]: deployments });
}

function savePreferences(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.preferences]: userPreferences });
}

// Called both when a new entry is added and when preferences change, so limits
// are applied immediately whenever they tighten.
// Only concluded (non-in_progress) entries count toward the history limit.
function enforceHistoryLimits(): void {
  const active    = deployments.filter(d => d.status === DeploymentStatus.InProgress);
  let   concluded = deployments
    .filter(d => d.status !== DeploymentStatus.InProgress)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (userPreferences.historyLimitType === 'days') {
    const cutoff = Date.now() - userPreferences.historyMaxDays * 86_400_000;
    concluded = concluded.filter(e => e.timestamp >= cutoff);
  } else {
    concluded = concluded.slice(0, userPreferences.historyMaxCount);
  }

  deployments = [...active, ...concluded];
  saveDeployments();
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

// ── Notifications ─────────────────────────────────────────────────────────────

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
  [DeploymentStatus.Unknown]:      'Outcome Unknown',
};

function createNotification(entry: DeploymentEntry): void {
  if (!userPreferences.notificationsEnabled) return;
  const status = entry.status as FinalStatus;
  if (!userPreferences[PREF_KEY_MAP[status]]) return;
  const typeLabel   = TYPE_LABEL[entry.type]   ?? 'Deployment';
  const action      = ACTION_LABEL[entry.type]  ?? 'Deployment';
  const statusLabel = STATUS_LABEL[status];
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

  const payload   = message.payload;
  const timestamp = Date.now();

  const currentIdx = deployments.findIndex(d => d.tabId === tabId);
  const current    = currentIdx >= 0 ? deployments[currentIdx] : undefined;

  // Name patch: status unchanged but name just became available — update silently.
  if (current && current.status === payload.status && current.name === null && payload.name !== null) {
    deployments[currentIdx] = { ...current, name: payload.name };
    saveDeployments();
    return;
  }

  // No-op: same status, name already known.
  if (current && current.status === payload.status) return;

  // Early return: first InProgress message for a URL that already has a conclusive
  // history entry (the page is loading and the tab is not yet tracking this deployment).
  // Unknown entries are not conclusive — the user may be reopening to resolve one.
  if (!current && payload.status === DeploymentStatus.InProgress) {
    const hasConclusive = deployments.some(
      d => sameDeploymentUrl(d.url, payload.url) &&
           d.status !== DeploymentStatus.InProgress &&
           d.status !== DeploymentStatus.Unknown
    );
    if (hasConclusive) return;
  }

  // Remove stale entries for the same URL being tracked in other tabs (e.g. the
  // user opened the page in a new tab via the View button or a manual refresh).
  // Preserve timing so the card doesn't reset.
  let inheritedTimestamp: number | undefined;
  let inheritedStartTime: string | null | undefined;
  for (const stale of deployments.filter(
    d => d.tabId !== undefined && d.tabId !== tabId && sameDeploymentUrl(d.url, payload.url)
  )) {
    if (stale.status === payload.status) {
      inheritedTimestamp = stale.timestamp;
      inheritedStartTime = stale.startTime;
    }
    deployments = deployments.filter(d => d !== stale);
  }

  if (payload.status === DeploymentStatus.InProgress) {
    // Remove any Unknown placeholder — we are now actively tracking this deployment.
    if (hasUnknownEntryForUrl(payload.url)) {
      deployments = deployments.filter(
        d => !(d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url))
      );
    }

    const id = current?.id ?? `${timestamp}-${tabId}`;
    const entry: DeploymentEntry = {
      id,
      type: payload.deploymentType,
      name: payload.name,
      environment: payload.environment,
      server: payload.server,
      url: payload.url,
      status: DeploymentStatus.InProgress,
      timestamp: inheritedTimestamp ?? timestamp,
      startTime: payload.startTime ?? inheritedStartTime ?? current?.startTime ?? null,
      endTime: null,
      tabId,
    };
    if (currentIdx >= 0) {
      deployments[currentIdx] = entry;
    } else {
      deployments.unshift(entry);
    }
    saveDeployments();
    return;
  }

  // ── Final status ──────────────────────────────────────────────────────────

  // Clear any pending Unknown OS notifications and remove the placeholder entries.
  for (const u of deployments.filter(
    d => d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url)
  )) {
    chrome.notifications.clear(`deployment-${u.id}`);
  }
  deployments = deployments.filter(
    d => !(d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url))
  );

  if (current) {
    // Transition from InProgress → final: update in place.
    const finalEntry: DeploymentEntry = {
      ...current,
      status: payload.status,
      timestamp,
      name: payload.name ?? current.name,
      endTime: payload.endTime,
      tabId: undefined,
    };
    deployments[currentIdx] = finalEntry;
    updateBadge(payload.status as FinalStatus);
    createNotification(finalEntry);
    enforceHistoryLimits();
  } else {
    // firstMessageIsFinal: the tab opened on a page that was already at a final
    // state (no InProgress phase observed), and there is no conclusive prior
    // record (or an Unknown placeholder existed — already removed above).
    const hasConclusive = deployments.some(
      d => sameDeploymentUrl(d.url, payload.url) &&
           d.status !== DeploymentStatus.InProgress &&
           d.status !== DeploymentStatus.Unknown
    );
    if (hasConclusive) return;

    const finalEntry: DeploymentEntry = {
      id: `${timestamp}-${tabId}`,
      type: payload.deploymentType,
      name: payload.name,
      environment: payload.environment,
      server: payload.server,
      url: payload.url,
      status: payload.status,
      timestamp,
      startTime: payload.startTime ?? null,
      endTime: payload.endTime,
    };
    deployments.unshift(finalEntry);
    updateBadge(payload.status as FinalStatus);
    createNotification(finalEntry);
    enforceHistoryLimits();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// chrome.tabs.query({}) (without a url pattern) is required here because
// match patterns don't support query strings, so we filter manually with
// sameDeploymentUrl instead.
function openDeploymentUrl(url: string): void {
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
    case 'getDeployments':
      // Read from storage directly: in-memory deployments may be empty if the
      // service worker was just restarted and the async init hasn't completed.
      chrome.storage.local.get(
        [STORAGE_KEYS.deployments],
        (result: { deployments?: DeploymentEntry[] }) => {
          const stored = result.deployments ?? deployments;
          sendResponse({ type: 'deploymentsResponse', payload: { deployments: stored } });
        }
      );
      return true;
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
    case 'openDeployment': {
      const { url } = message.payload;
      openDeploymentUrl(url);
      break;
    }
    case 'deleteDeployment': {
      const { id } = message.payload;
      deployments = deployments.filter(e => e.id !== id);
      saveDeployments();
      break;
    }
  }
});

// ── Tab-close stale check ─────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId: number) => {
  chrome.storage.local.get(
    [STORAGE_KEYS.deployments],
    (result: { deployments?: DeploymentEntry[] }) => {
      const stored = result.deployments ?? deployments;
      const stale  = stored.filter(d => d.tabId === tabId && d.status === DeploymentStatus.InProgress);
      if (stale.length === 0) return;

      deployments = stored;

      const timestamp = Date.now();
      for (const entry of stale) {
        if (deployments.some(
          d => sameDeploymentUrl(d.url, entry.url) &&
               d.status !== DeploymentStatus.InProgress &&
               d.status !== DeploymentStatus.Unknown
        )) continue;

        const idx = deployments.indexOf(entry);
        deployments[idx] = {
          ...entry,
          status: DeploymentStatus.Unknown,
          timestamp,
          endTime: null,
          tabId: undefined,
        };
      }

      enforceHistoryLimits();
      // No notification — unknown notifications only fire at browser startup.
    }
  );
});

// ── Startup stale check ───────────────────────────────────────────────────────

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(
    [STORAGE_KEYS.deployments, STORAGE_KEYS.preferences],
    (result: { deployments?: DeploymentEntry[]; preferences?: UserPreferences }) => {
      if (result.preferences) userPreferences = result.preferences;

      const stored = result.deployments ?? [];
      const stale  = stored.filter(d => d.status === DeploymentStatus.InProgress);
      if (stale.length === 0) return;

      // Sync in-memory state (async init may not have completed at startup time).
      deployments = stored;

      const timestamp = Date.now();
      for (const entry of stale) {
        // Skip if a real status was already recorded for this URL (race-condition guard:
        // a restored-session tab may have reported its outcome before this callback fired).
        if (deployments.some(
          d => sameDeploymentUrl(d.url, entry.url) &&
               d.status !== DeploymentStatus.InProgress &&
               d.status !== DeploymentStatus.Unknown
        )) continue;

        const idx = deployments.indexOf(entry);
        deployments[idx] = {
          ...entry,
          status: DeploymentStatus.Unknown,
          timestamp,
          endTime: null,
          tabId: undefined,
        };
      }

      enforceHistoryLimits();
      for (const entry of deployments.filter(d => d.status === DeploymentStatus.Unknown)) {
        createNotification(entry);
      }
    }
  );
});

// ── Notification click ────────────────────────────────────────────────────────

chrome.notifications.onClicked.addListener((notificationId: string) => {
  if (notificationId.startsWith('deployment-')) {
    const id    = notificationId.replace(/^deployment-/, '');
    const entry = deployments.find(d => d.id === id);
    if (entry) {
      if (entry.status === DeploymentStatus.Unknown) {
        // Open the popup so the user can navigate to the deployment page from there.
        chrome.action.openPopup?.();
      } else {
        openDeploymentUrl(entry.url);
      }
    }
    clearBadge();
  }
  chrome.notifications.clear(notificationId);
});
