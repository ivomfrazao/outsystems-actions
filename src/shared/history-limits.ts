import type { DeploymentEntry, UserPreferences } from './types';
import { DeploymentStatus } from './types';

export type HistoryLimits = Pick<UserPreferences, 'historyLimitType' | 'historyMaxCount' | 'historyMaxDays'>;

// Shared by the background (to enforce limits) and the popup (to preview how
// many entries a settings change would delete before it is applied).
export function applyHistoryLimits(all: DeploymentEntry[], limits: HistoryLimits): DeploymentEntry[] {
  const active   = all.filter(d => d.status === DeploymentStatus.InProgress);
  let concluded  = all
    .filter(d => d.status !== DeploymentStatus.InProgress)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (limits.historyLimitType === 'days') {
    const cutoff = Date.now() - limits.historyMaxDays * 86_400_000;
    concluded = concluded.filter(e => e.timestamp >= cutoff);
  } else {
    concluded = concluded.slice(0, limits.historyMaxCount);
  }

  return [...active, ...concluded];
}
