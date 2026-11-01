import type { DeploymentStatus } from '../shared/types';
import { DeploymentStatus as Status } from '../shared/types';

const STATUS_KEYWORDS = {
  [Status.InProgress]:   ['publishing', 'deploying', 'running deployment plan'],
  [Status.Success]:      ['published successfully', 'successfully published', 'completed successfully', 'finished with success'],
  [Status.Warning]:      ['published with warnings', 'completed with warnings'],
  [Status.Error]:        ['compilation error', 'completed with errors', 'aborted'],
  [Status.Intervention]: ['waiting for user input', 'conflict detected', 'merge required', 'approval pending'],
  [Status.Unknown]:      [],
} as const satisfies Record<DeploymentStatus, ReadonlyArray<string>>;

export interface StatusDetection {
  status: DeploymentStatus;
  // Which signal matched, recorded in the debug log.
  reason: string;
}

export function detectStatus(): StatusDetection | null {
  // Use textContent (not innerText) for final-state detection: eSpace publish
  // stores the "successfully published" message in a collapsed sub-step row
  // (display:none), which innerText skips. textContent includes all DOM text
  // regardless of visibility, so collapsed rows are always checked.
  // innerText is kept for the in-progress fallback to avoid matching hidden
  // in-progress text that persists from earlier steps after completion.
  const bodyAllText = (document.body.textContent ?? '').toLowerCase();
  const bodyText    = document.body.innerText.toLowerCase();

  // Check final states first — their keywords persist after completion and
  // must not be masked by in-progress signals still present in the DOM.
  const finalOrder: DeploymentStatus[] = [
    Status.Success,
    Status.Warning,
    Status.Error,
    Status.Intervention,
  ];
  for (const status of finalOrder) {
    const keyword = STATUS_KEYWORDS[status].find(kw => bodyAllText.includes(kw));
    if (keyword) return { status, reason: `keyword "${keyword}"` };
  }

  // Progress bar without the stopped class = publish actively running.
  if (document.querySelector('.progress-bar:not(.progress-bar-stopped)')) {
    return { status: Status.InProgress, reason: 'active progress bar' };
  }

  // Fallback keyword check for LifeTime or other non-ServiceCenter pages
  // that don't use the same progress bar markup.
  const keyword = STATUS_KEYWORDS[Status.InProgress].find(kw => bodyText.includes(kw));
  if (keyword) {
    return { status: Status.InProgress, reason: `visible keyword "${keyword}"` };
  }

  return null;
}
