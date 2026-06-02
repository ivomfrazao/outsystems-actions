import type { DeploymentEntry, UserPreferences } from '../shared/types';
import { DeploymentStatus } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { getDeployments, setDeployments, saveDeployments } from './deployments/store';
import { getPreferences, setPreferences, DEFAULT_PREFERENCES } from './preferences/store';
import { registerMessageRouter } from './router';
import { registerLifecycleListeners } from './lifecycle';

// Load persisted state. Also handles one-time migration from the old split
// storage format (history + pendingDeployments + activeDeployments keys).
chrome.storage.local.get(
  [STORAGE_KEYS.deployments, STORAGE_KEYS.preferences, 'history', 'pendingDeployments'],
  (result: Record<string, unknown>) => {
    if (result[STORAGE_KEYS.preferences]) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...result[STORAGE_KEYS.preferences] as UserPreferences });
    }

    if (result[STORAGE_KEYS.deployments]) {
      setDeployments(result[STORAGE_KEYS.deployments] as DeploymentEntry[]);
      return;
    }

    // ── One-time migration from the old split format ──────────────────────────
    type OldHistoryEntry = {
      id: string; type: string; name: string | null; environment: string | null;
      server: string | null; status: string; timestamp: number; url: string;
      startTime: string | null; endTime: string | null;
    };
    type OldPendingEntry = {
      type: string; name: string | null; environment: string | null;
      server: string | null; url: string; startTime: string | null;
    };

    const oldHistory = (result['history'] as OldHistoryEntry[] | undefined) ?? [];
    const migrated: DeploymentEntry[] = oldHistory.map(h => ({
      id:          h.id,
      type:        h.type as DeploymentEntry['type'],
      name:        h.name,
      environment: h.environment,
      server:      h.server,
      url:         h.url,
      status:      h.status as DeploymentEntry['status'],
      timestamp:   h.timestamp,
      startTime:   h.startTime,
      endTime:     h.endTime,
    }));

    const oldPending = result['pendingDeployments'] as Record<string, OldPendingEntry> | undefined;
    if (oldPending) {
      const ts = Date.now();
      for (const entry of Object.values(oldPending)) {
        migrated.unshift({
          id:          `${ts}-unknown-${entry.url}`,
          type:        entry.type as DeploymentEntry['type'],
          name:        entry.name,
          environment: entry.environment,
          server:      entry.server,
          url:         entry.url,
          status:      DeploymentStatus.Unknown,
          timestamp:   ts,
          startTime:   entry.startTime,
          endTime:     null,
        });
      }
    }

    if (oldHistory.length > 0 || oldPending) {
      setDeployments(migrated);
      saveDeployments();
      chrome.storage.local.remove(['history', 'pendingDeployments', 'activeDeployments']);
    }
  }
);

registerMessageRouter(getPreferences);
registerLifecycleListeners(getPreferences);
