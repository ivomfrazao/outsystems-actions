import type { UserPreferences } from '../../shared/types';
import { applyHistoryLimits } from '../../shared/history-limits';
import { getDeployments, setDeployments, saveDeployments } from './store';

export function enforceHistoryLimits(prefs: UserPreferences): void {
  setDeployments(applyHistoryLimits(getDeployments(), prefs));
  saveDeployments();
}
