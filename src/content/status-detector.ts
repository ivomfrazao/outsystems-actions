import type { DeploymentStatus, DeploymentType } from '../shared/types';
import { DeploymentStatus as Status, DeploymentType as DType } from '../shared/types';

const STATUS_KEYWORDS = {
  [Status.InProgress]:   ['publishing', 'deploying', 'running deployment plan'],
  [Status.Success]:      ['published successfully', 'successfully published', 'completed successfully', 'finished with success'],
  [Status.Warning]:      ['published with warnings', 'completed with warnings', 'finished with warnings'],
  [Status.Error]:        ['compilation error', 'completed with errors', 'finished with errors', 'aborted'],
  [Status.Intervention]: ['waiting for user input', 'conflict detected', 'merge required', 'approval pending'],
  [Status.Unknown]:      [],
} as const satisfies Record<DeploymentStatus, ReadonlyArray<string>>;

export interface StatusDetection {
  status: DeploymentStatus;
  // Which signal matched, recorded in the debug log.
  reason: string;
}

// LifeTime renders a banner in #…wtStagingFinishBox only once the deployment has
// ended ("Deployment finished with warnings", …). Its text is authoritative.
const LIFETIME_FINISH_TEXT: ReadonlyArray<{ status: DeploymentStatus; keywords: readonly string[] }> = [
  { status: Status.Success, keywords: ['finished with success'] },
  { status: Status.Warning, keywords: ['finished with warnings'] },
  { status: Status.Error,   keywords: ['finished with errors', 'aborted', 'failed'] },
];

const LIFETIME_FINISH_CLASS: Record<string, DeploymentStatus> = {
  success: Status.Success,
  warning: Status.Warning,
  error:   Status.Error,
};

function detectLifeTimeStatus(): StatusDetection | null {
  const finishBox = document.querySelector('[id$="wtStagingFinishBox"]');
  const finishText = (finishBox?.textContent ?? '').trim().toLowerCase();

  if (finishBox && finishText) {
    for (const { status, keywords } of LIFETIME_FINISH_TEXT) {
      const keyword = keywords.find(kw => finishText.includes(kw));
      if (keyword) return { status, reason: `finish banner "${keyword}"` };
    }
    for (const [cls, status] of Object.entries(LIFETIME_FINISH_CLASS)) {
      if (finishBox.querySelector(`.warning-box.${cls}`)) {
        return { status, reason: `finish banner class "${cls}"` };
      }
    }
    // A populated banner means the deployment ended; never report it as running.
    return { status: Status.Warning, reason: 'unrecognised finish banner' };
  }

  // No banner yet. Only positive signals count: the stage list always contains
  // "hot-deploying", so the generic "deploying" keyword would match a finished page.
  if (document.querySelector('.loading-spinner, .StagingProgressHighLevelMessageInProgress')) {
    return { status: Status.InProgress, reason: 'active stage spinner' };
  }
  if (document.body.innerText.toLowerCase().includes('running deployment plan')) {
    return { status: Status.InProgress, reason: 'visible keyword "running deployment plan"' };
  }

  return null;
}

export function detectStatus(deploymentType: DeploymentType | null = null): StatusDetection | null {
  if (deploymentType === DType.LifeTimeDeployment) return detectLifeTimeStatus();

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

  // Fallback keyword check for other non-ServiceCenter pages
  // that don't use the same progress bar markup.
  const keyword = STATUS_KEYWORDS[Status.InProgress].find(kw => bodyText.includes(kw));
  if (keyword) {
    return { status: Status.InProgress, reason: `visible keyword "${keyword}"` };
  }

  return null;
}
