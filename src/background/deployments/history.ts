import type { UserPreferences } from '../../shared/types';
import { DeploymentStatus } from '../../shared/types';
import { getDeployments, setDeployments, saveDeployments } from './store';

export function enforceHistoryLimits(prefs: UserPreferences): void {
  const all      = getDeployments();
  const active   = all.filter(d => d.status === DeploymentStatus.InProgress);
  let concluded  = all
    .filter(d => d.status !== DeploymentStatus.InProgress)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (prefs.historyLimitType === 'days') {
    const cutoff = Date.now() - prefs.historyMaxDays * 86_400_000;
    concluded = concluded.filter(e => e.timestamp >= cutoff);
  } else {
    concluded = concluded.slice(0, prefs.historyMaxCount);
  }

  setDeployments([...active, ...concluded]);
  saveDeployments();
}
