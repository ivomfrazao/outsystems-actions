import type { DeploymentEntry, UserPreferences } from '../shared/types';
import { DeploymentStatus } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { getDeployments, setDeployments, sameDeploymentUrl } from './deployments/store';
import { enforceHistoryLimits } from './deployments/history';
import { setPreferences } from './preferences/store';
import { createNotification } from './notifications';

// Marks candidate InProgress entries as Unknown, unless a conclusive status for
// the same URL already exists (race-condition guard).
function markAsUnknown(
  entries: DeploymentEntry[],
  isCandidate: (d: DeploymentEntry) => boolean,
): DeploymentEntry[] {
  const timestamp = Date.now();
  return entries.map(entry => {
    if (!isCandidate(entry)) return entry;
    const hasConclusive = entries.some(
      d => sameDeploymentUrl(d.url, entry.url) &&
           d.status !== DeploymentStatus.InProgress &&
           d.status !== DeploymentStatus.Unknown
    );
    if (hasConclusive) return entry;
    return { ...entry, status: DeploymentStatus.Unknown, timestamp, endTime: null, tabId: undefined };
  });
}

export function registerLifecycleListeners(getPreferences: () => UserPreferences): void {
  chrome.tabs.onRemoved.addListener((tabId: number) => {
    chrome.storage.local.get(
      [STORAGE_KEYS.deployments],
      (result: { deployments?: DeploymentEntry[] }) => {
        const stored = result.deployments ?? getDeployments();
        const hasStale = stored.some(d => d.tabId === tabId && d.status === DeploymentStatus.InProgress);
        if (!hasStale) return;

        const updated = markAsUnknown(
          stored,
          d => d.tabId === tabId && d.status === DeploymentStatus.InProgress,
        );
        setDeployments(updated);
        enforceHistoryLimits(getPreferences());
        // Unknown notifications only fire at browser startup, not on tab close.
      }
    );
  });

  chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(
      [STORAGE_KEYS.deployments, STORAGE_KEYS.preferences],
      (result: { deployments?: DeploymentEntry[]; preferences?: UserPreferences }) => {
        if (result.preferences) setPreferences(result.preferences);

        const stored = result.deployments ?? [];
        const hasStale = stored.some(d => d.status === DeploymentStatus.InProgress);
        if (!hasStale) return;

        const updated = markAsUnknown(stored, d => d.status === DeploymentStatus.InProgress);
        setDeployments(updated);
        enforceHistoryLimits(getPreferences());

        for (const entry of updated.filter(d => d.status === DeploymentStatus.Unknown)) {
          createNotification(entry, getPreferences());
        }
      }
    );
  });
}
