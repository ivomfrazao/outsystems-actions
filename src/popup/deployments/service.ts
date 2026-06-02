import type { PopupResponseMessage } from '../../shared/messages';
import { renderDeployments } from './renderer';

export function refresh(): void {
  chrome.runtime.sendMessage({ type: 'getDeployments' }, (response: PopupResponseMessage) => {
    if (response?.type === 'deploymentsResponse') {
      renderDeployments(response.payload.deployments);
    }
  });
}
