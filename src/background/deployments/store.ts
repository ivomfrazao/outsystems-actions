import type { DeploymentEntry } from '../../shared/types';
import { DeploymentStatus } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/constants';

let deployments: DeploymentEntry[] = [];

export function getDeployments(): DeploymentEntry[] {
  return deployments;
}

export function setDeployments(entries: DeploymentEntry[]): void {
  deployments = entries;
}

export function saveDeployments(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.deployments]: deployments });
}

export function sameDeploymentUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.pathname === ub.pathname && ua.search === ub.search;
  } catch {
    return a === b;
  }
}

// Marks candidate InProgress entries as Unknown, unless a conclusive status for
// the same URL already exists (race-condition guard).
export function markAsUnknown(
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
