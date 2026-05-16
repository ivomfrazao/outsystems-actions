import {
  type ContentInboundMessage,
  type DeploymentStatus,
  type DeploymentType,
  DeploymentStatus as Status,
  DeploymentType as DType,
  POLL_INTERVAL_MS,
} from './types';

// ── Lookup tables ─────────────────────────────────────────────────────────────

const URL_PATTERNS = [
  { pattern: 'eSpace_Publish.aspx',   type: DType.eSpace },
  { pattern: 'Solution_Publish.aspx', type: DType.Solution },
  { pattern: 'LifeTime',              type: DType.LifeTimeDeployment },
] as const satisfies ReadonlyArray<{ pattern: string; type: DeploymentType }>;

const STATUS_KEYWORDS = {
  [Status.InProgress]:   ['publishing', 'deploying', 'running deployment plan'],
  [Status.Success]:      ['published successfully', 'successfully published', 'completed successfully'],
  [Status.Warning]:      ['published with warnings', 'completed with warnings'],
  [Status.Error]:        ['compilation error', 'completed with errors', 'aborted'],
  [Status.Intervention]: ['waiting for user input', 'conflict detected', 'merge required', 'approval pending'],
} as const satisfies Record<DeploymentStatus, ReadonlyArray<string>>;

// ── State ─────────────────────────────────────────────────────────────────────

let currentStatus: DeploymentStatus | null = null;
let deploymentType: DeploymentType | null = null;
let deploymentName: string | null = null;
let environment: string | null = null;

// ── Detection ─────────────────────────────────────────────────────────────────

function detectDeploymentType(): DeploymentType | null {
  const url = window.location.href;
  return URL_PATTERNS.find(({ pattern }) => url.includes(pattern))?.type ?? null;
}

function extractMetadata(): void {
  const parts = document.title.trim().split(' - ');
  if (parts.length >= 3) {
    deploymentName = parts[0] ?? null;
    environment = parts[1] ?? null;
  } else if (parts.length === 2) {
    // "Environment - PageType" — no solution name in title
    deploymentName = null;
    environment = parts[0] ?? null;
  } else {
    deploymentName = null;
    environment = null;
  }
}

function detectStatus(): DeploymentStatus | null {
  const bodyText = document.body.innerText.toLowerCase();

  // Check final states first — their keywords persist after completion and
  // must not be masked by in-progress signals still present in the DOM.
  const finalOrder: DeploymentStatus[] = [
    Status.Success,
    Status.Warning,
    Status.Error,
    Status.Intervention,
  ];
  const finalStatus = finalOrder.find(s =>
    STATUS_KEYWORDS[s].some(kw => bodyText.includes(kw))
  );
  if (finalStatus) return finalStatus;

  // Progress bar without the stopped class = publish actively running.
  // This covers all 14 steps, not just the "Deploying" step at the end.
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

// ── Polling ───────────────────────────────────────────────────────────────────

let pollsSinceLastSend = 0;
// Resend current status every ~20 s even if unchanged, so the service worker
// stays alive and session storage stays current after a worker restart.
const KEEPALIVE_POLLS = Math.round(20_000 / POLL_INTERVAL_MS);

function sendUpdate(status: DeploymentStatus): void {
  extractMetadata();
  chrome.runtime.sendMessage(
    {
      type: 'deploymentUpdate',
      payload: {
        status,
        name: deploymentName,
        environment,
        deploymentType,
        url: window.location.href,
        tabId: null,
      },
    },
    () => { void chrome.runtime.lastError; }
  );
  pollsSinceLastSend = 0;
}

function checkForUpdates(): void {
  if (!deploymentType) return;

  const status = detectStatus();
  pollsSinceLastSend++;

  if (!status) return;

  const changed  = status !== currentStatus;
  const keepalive = status === Status.InProgress && pollsSinceLastSend >= KEEPALIVE_POLLS;

  if (changed || keepalive) {
    currentStatus = status;
    sendUpdate(status);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

deploymentType = detectDeploymentType();
extractMetadata();

setInterval(checkForUpdates, POLL_INTERVAL_MS);

chrome.runtime.onMessage.addListener((message: ContentInboundMessage) => {
  if (message.type === 'playSound') {
    const audio = new Audio(chrome.runtime.getURL('sounds/notification.wav'));
    audio.play().catch(() => {});
  }
});
