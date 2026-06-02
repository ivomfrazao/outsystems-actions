import type { DeploymentEntry } from '../../shared/types';
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
