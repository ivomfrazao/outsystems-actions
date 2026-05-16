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
  [Status.Success]:      ['published successfully', 'completed successfully'],
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
  const title = document.title;
  deploymentName = title.split(' - ')[0] ?? null;
  const envMatch = title.match(/ - (\w+) - /);
  environment = envMatch ? envMatch[1] : null;
}

function detectStatus(): DeploymentStatus | null {
  const bodyText = document.body.innerText.toLowerCase();
  const statuses = Object.keys(STATUS_KEYWORDS) as DeploymentStatus[];
  return statuses.find(status =>
    STATUS_KEYWORDS[status].some(kw => bodyText.includes(kw))
  ) ?? null;
}

// ── Polling ───────────────────────────────────────────────────────────────────

function checkForUpdates(): void {
  if (!deploymentType) return;

  const status = detectStatus();
  if (status && status !== currentStatus) {
    currentStatus = status;
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
      () => {
        void chrome.runtime.lastError;
      }
    );
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
