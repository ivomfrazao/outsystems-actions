import type { PopupResponseMessage } from '../../shared/messages';
import { MessageType } from '../../shared/messages';
import { renderDeployments } from './renderer';

export function refresh(): void {
  chrome.runtime.sendMessage({ type: MessageType.GetDeployments }, (response: PopupResponseMessage) => {
    if (response?.type === MessageType.DeploymentsResponse) {
      renderDeployments(response.payload.deployments);
    }
  });
}
