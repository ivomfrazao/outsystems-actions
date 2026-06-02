import type { DeploymentUpdateMessage } from '../../shared/messages';
import type { FinalStatus, UserPreferences } from '../../shared/types';
import { applyDeploymentUpdate } from './updater';
import { enforceHistoryLimits } from './history';
import { saveDeployments } from './store';
import { updateBadge, createNotification } from '../notifications';

export function handleDeploymentUpdate(
  message: DeploymentUpdateMessage,
  sender: chrome.runtime.MessageSender,
  getPreferences: () => UserPreferences,
): void {
  if (sender.tab?.id === undefined) return;
  const tabId = sender.tab.id;

  const outcome = applyDeploymentUpdate(message, tabId);

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
