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

export function detectStatus(): DeploymentStatus | null {
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
  const finalStatus = finalOrder.find(s =>
    STATUS_KEYWORDS[s].some(kw => bodyAllText.includes(kw))
  );
  if (finalStatus) return finalStatus;

  // Progress bar without the stopped class = publish actively running.
  if (document.querySelector('.progress-bar:not(.progress-bar-stopped)')) {
    return Status.InProgress;
  }

  // Fallback keyword check for LifeTime or other non-ServiceCenter pages
  // that don't use the same progress bar markup.
  if (STATUS_KEYWORDS[Status.InProgress].some(kw => bodyText.includes(kw))) {
    return Status.InProgress;
  }

  return null;
}
