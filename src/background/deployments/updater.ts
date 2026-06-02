import type { DeploymentEntry } from '../../shared/types';
import type { DeploymentUpdateMessage } from '../../shared/messages';
import { DeploymentStatus } from '../../shared/types';
import { getDeployments, setDeployments, sameDeploymentUrl } from './store';

export type UpdateOutcome =
  | { kind: 'noop' }
  | { kind: 'name-patch' }
  | { kind: 'in-progress' }
  | { kind: 'final'; entry: DeploymentEntry };

export function applyDeploymentUpdate(
  message: DeploymentUpdateMessage,
  tabId: number,
): UpdateOutcome {
  const payload   = message.payload;
  const timestamp = Date.now();
  let   current   = getDeployments();

  const currentIdx = current.findIndex(d => d.tabId === tabId);
  const existing   = currentIdx >= 0 ? current[currentIdx] : undefined;

  // Name patch: status unchanged but name just became available — update silently.
  if (existing && existing.status === payload.status && existing.name === null && payload.name !== null) {
    current = current.slice();
    current[currentIdx] = { ...existing, name: payload.name };
    setDeployments(current);
    return { kind: 'name-patch' };
  }

  // No-op: same status, name already known.
  if (existing && existing.status === payload.status) return { kind: 'noop' };

  // Skip: first InProgress for a URL that already has a conclusive history entry.
  // Unknown entries are not conclusive — the user may be reopening to resolve one.
  if (!existing && payload.status === DeploymentStatus.InProgress) {
    const hasConclusive = current.some(
      d => sameDeploymentUrl(d.url, payload.url) &&
           d.status !== DeploymentStatus.InProgress &&
           d.status !== DeploymentStatus.Unknown
    );
    if (hasConclusive) return { kind: 'noop' };
  }

  // Remove stale entries for the same URL tracked in other tabs (e.g. user opened
  // the page in a new tab). Preserve timing so the card doesn't reset.
  let inheritedTimestamp: number | undefined;
  let inheritedStartTime: string | null | undefined;
  for (const stale of current.filter(
    d => d.tabId !== undefined && d.tabId !== tabId && sameDeploymentUrl(d.url, payload.url)
  )) {
    if (stale.status === payload.status) {
      inheritedTimestamp = stale.timestamp;
      inheritedStartTime = stale.startTime;
    }
    current = current.filter(d => d !== stale);
  }

  if (payload.status === DeploymentStatus.InProgress) {
    // Remove any Unknown placeholder — we are now actively tracking this deployment.
    current = current.filter(
      d => !(d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url))
    );

    const id = existing?.id ?? `${timestamp}-${tabId}`;
    const entry: DeploymentEntry = {
      id,
      type:        payload.deploymentType,
      name:        payload.name,
      environment: payload.environment,
      server:      payload.server,
      url:         payload.url,
      status:      DeploymentStatus.InProgress,
      timestamp:   inheritedTimestamp ?? timestamp,
      startTime:   payload.startTime ?? inheritedStartTime ?? existing?.startTime ?? null,
      endTime:     null,
      tabId,
    };
    if (currentIdx >= 0) {
      current = current.slice();
      current[currentIdx] = entry;
    } else {
      current = [entry, ...current];
    }
    setDeployments(current);
    return { kind: 'in-progress' };
  }

  // ── Final status ──────────────────────────────────────────────────────────────

  // Clear stale Unknown notifications and remove their placeholder entries.
  for (const u of current.filter(
    d => d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url)
  )) {
    chrome.notifications.clear(`deployment-${u.id}`);
  }
  current = current.filter(
    d => !(d.status === DeploymentStatus.Unknown && sameDeploymentUrl(d.url, payload.url))
  );

  if (existing) {
    // Transition from InProgress → final: update in place.
    const finalEntry: DeploymentEntry = {
      ...existing,
      status:    payload.status,
      timestamp,
      name:      payload.name ?? existing.name,
      endTime:   payload.endTime,
      tabId:     undefined,
    };
    current = current.slice();
    current[currentIdx] = finalEntry;
    setDeployments(current);
    return { kind: 'final', entry: finalEntry };
  }

  // firstMessageIsFinal: tab opened on a page already at a final state with no
  // prior conclusive record.
  const hasConclusive = current.some(
    d => sameDeploymentUrl(d.url, payload.url) &&
         d.status !== DeploymentStatus.InProgress &&
         d.status !== DeploymentStatus.Unknown
  );
  if (hasConclusive) {
    setDeployments(current);
    return { kind: 'noop' };
  }

  const finalEntry: DeploymentEntry = {
    id:          `${timestamp}-${tabId}`,
    type:        payload.deploymentType,
    name:        payload.name,
    environment: payload.environment,
    server:      payload.server,
    url:         payload.url,
    status:      payload.status,
    timestamp,
    startTime:   payload.startTime ?? null,
    endTime:     payload.endTime,
  };
  setDeployments([finalEntry, ...current]);
  return { kind: 'final', entry: finalEntry };
}
