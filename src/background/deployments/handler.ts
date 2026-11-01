import type { DeploymentUpdateMessage } from '../../shared/messages';
import type { FinalStatus, UserPreferences } from '../../shared/types';
import { applyDeploymentUpdate } from './updater';
import { enforceHistoryLimits } from './history';
import { saveDeployments } from './store';
import { updateBadge, createNotification } from '../notifications';
import { debugLog } from '../debug-log';

export function handleDeploymentUpdate(
  message: DeploymentUpdateMessage,
  sender: chrome.runtime.MessageSender,
  getPreferences: () => UserPreferences,
): void {
  if (sender.tab?.id === undefined) return;
  const tabId = sender.tab.id;

  const outcome = applyDeploymentUpdate(message, tabId);

  // Unchanged updates are keepalives; logging them would flood the log.
  if (!(outcome.kind === 'noop' && outcome.reason === 'unchanged')) {
    debugLog('background', 'update-handled', {
      status:  message.payload.status,
      outcome: outcome.kind === 'noop' ? `noop (${outcome.reason})` : outcome.kind,
    }, tabId);
  }

  switch (outcome.kind) {
    case 'noop':
      break;
    case 'name-patch':
    case 'in-progress':
      saveDeployments();
      break;
    case 'final': {
      const prefs = getPreferences();
      updateBadge(outcome.entry.status as FinalStatus);
      createNotification(outcome.entry, prefs);
      enforceHistoryLimits(prefs);
      break;
    }
  }
}
