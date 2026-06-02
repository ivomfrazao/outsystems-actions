import type { BackgroundInboundMessage, PopupResponseMessage } from '../shared/messages';
import type { DeploymentEntry, UserPreferences } from '../shared/types';
import { DeploymentStatus } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { getDeployments, setDeployments, saveDeployments } from './deployments/store';
import { handleDeploymentUpdate } from './deployments/handler';
import { handleUpdatePreferences } from './preferences/handler';
import { clearBadge } from './notifications';

function openByUrl(url: string): void {
  chrome.tabs.query({}, (tabs) => {
    const tab = tabs.find(t => t.url !== undefined && (() => {
      try {
        const ua = new URL(t.url!);
        const ub = new URL(url);
        return ua.pathname === ub.pathname && ua.search === ub.search;
      } catch { return t.url === url; }
    })());
    if (tab?.id !== undefined) {
      chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId !== undefined) chrome.windows.update(tab.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
}

// When tabId is provided (in_progress entries), we attempt to focus it directly
// instead of relying on URL matching, which can fail if the stored URL differs
// from the live tab URL after a redirect.
function openDeploymentUrl(url: string, tabId?: number): void {
  if (tabId !== undefined) {
    chrome.tabs.get(tabId, (tab) => {
      if (!chrome.runtime.lastError && tab) {
        chrome.tabs.update(tabId, { active: true });
        if (tab.windowId !== undefined) chrome.windows.update(tab.windowId, { focused: true });
        return;
      }
      openByUrl(url);
    });
    return;
  }
  openByUrl(url);
}

export function registerMessageRouter(getPreferences: () => UserPreferences): void {
  chrome.runtime.onMessage.addListener((
    message: BackgroundInboundMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: PopupResponseMessage) => void,
  ): boolean | void => {
    switch (message.type) {
      case 'deploymentUpdate':
        handleDeploymentUpdate(message, sender, getPreferences);
        break;
      case 'getDeployments':
        // Read from storage directly: in-memory deployments may be empty if the
        // service worker was just restarted and the async init hasn't completed.
        chrome.storage.local.get(
          [STORAGE_KEYS.deployments],
          (result: { deployments?: DeploymentEntry[] }) => {
            const stored = result.deployments ?? getDeployments();
            sendResponse({ type: 'deploymentsResponse', payload: { deployments: stored } });
          }
        );
        return true;
      case 'getPreferences':
        sendResponse({ type: 'preferencesResponse', payload: getPreferences() });
        break;
      case 'updatePreferences':
        handleUpdatePreferences(message);
        sendResponse({ type: 'preferencesUpdated' });
        break;
      case 'clearBadge':
        clearBadge();
        break;
      case 'openDeployment':
        openDeploymentUrl(message.payload.url, message.payload.tabId);
        break;
      case 'deleteDeployment': {
        const { id } = message.payload;
        setDeployments(getDeployments().filter(e => e.id !== id));
        saveDeployments();
        break;
      }
    }
  });

  chrome.notifications.onClicked.addListener((notificationId: string) => {
    if (notificationId.startsWith('deployment-')) {
      const id    = notificationId.replace(/^deployment-/, '');
      const entry = getDeployments().find(d => d.id === id);
      if (entry) {
        if (entry.status === DeploymentStatus.Unknown) {
          chrome.action.openPopup?.();
        } else {
          openDeploymentUrl(entry.url);
        }
      }
      clearBadge();
    }
    chrome.notifications.clear(notificationId);
  });
}
