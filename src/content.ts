import {
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
  [Status.Success]:      ['published successfully', 'successfully published', 'completed successfully', 'finished with success'],
  [Status.Warning]:      ['published with warnings', 'completed with warnings'],
  [Status.Error]:        ['compilation error', 'completed with errors', 'aborted'],
  [Status.Intervention]: ['waiting for user input', 'conflict detected', 'merge required', 'approval pending'],
  // 'unknown' is synthesised by the background on startup; the content script never detects it.
  [Status.Unknown]: [],
} as const satisfies Record<DeploymentStatus, ReadonlyArray<string>>;

const STATUS_INDICATORS: Record<DeploymentStatus, string> = {
  [Status.InProgress]:   '🔵',
  [Status.Success]:      '🟢',
  [Status.Warning]:      '🟡',
  [Status.Error]:        '🔴',
  [Status.Intervention]: '⚠️',
  [Status.Unknown]:      '❓',
};

// ── State ─────────────────────────────────────────────────────────────────────

const originalTitle = document.title;
let currentStatus: DeploymentStatus | null = null;
let deploymentType: DeploymentType | null = null;
let deploymentName: string | null = null;
let environment: string | null = null;
let serverName: string | null = null;
let startTime: string | null = null;
let endTime: string | null = null;

// ── Detection ─────────────────────────────────────────────────────────────────

function detectDeploymentType(): DeploymentType | null {
  const urlLower = window.location.href.toLowerCase();
  return URL_PATTERNS.find(({ pattern }) => urlLower.includes(pattern.toLowerCase()))?.type ?? null;
}

function extractMetadata(): void {
  const parts = originalTitle.trim().split(' - ');
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

  // For Application publishes the title doesn't include the app name; extract it
  // from the progress table. Use textContent (not innerText) so collapsed/hidden
  // rows are included — the sub-step row is display:none when the step is collapsed.
  if (!deploymentName) {
    const tableText = document.getElementById('MessagesTable')?.textContent ?? '';
    const match = tableText.match(/Creating Application '([^']+)'/);
    deploymentName = match?.[1] ?? null;
  }

  // For Solution publishes the title is generic ("Upload/Publish Solution"); the
  // name is in the page heading: "Publish Running Version of Solution <Name>".
  // The heading element's id is dynamic but always ends with wtTitle_wtTitle.
  if (!deploymentName && deploymentType === DType.Solution) {
    const headingText = document.querySelector('[id$="wtTitle_wtTitle"]')?.textContent?.trim() ?? '';
    const match = headingText.match(/Solution\s+(.+)$/i);
    deploymentName = match?.[1]?.trim() ?? null;
  }

  // For LifeTime deployments the name is not in the title; extract app names
  // from the deployment plan list. Each deployed-app row has a stable
  // [id*="_wtListApplications_ctl"][id$="_wtOperation"] element; the app name
  // is in a `span[style*="font-size: 13"]` within the same enclosing table.
  // (The dependents section uses [id$="wtApplicationName"] — a different widget.)
  if (!deploymentName && deploymentType === DType.LifeTimeDeployment) {
    const opEls = Array.from(document.querySelectorAll('[id*="_wtListApplications_ctl"][id$="_wtOperation"]'));
    const appNames = opEls
      .map(el => el.closest('table')?.querySelector<HTMLElement>('span[style*="font-size: 13"]')?.textContent?.trim() ?? null)
      .filter(Boolean) as string[];
    if (appNames.length > 0) {
      deploymentName = appNames.length > 1
        ? `${appNames[0]} +${appNames.length - 1}`
        : appNames[0];
    }
  }

  // Server name from the sidebar's server info block — more stable than hostname.
  // Targets: .sc-content-left .margin-top-base > div:first-child
  serverName = document.querySelector('.sc-content-left .margin-top-base > div:first-child')
    ?.textContent?.trim() ?? null;

  // LifeTime titles are "Deployment to <Env>" with no " - " separator; extract
  // the environment from the .TitleIdentifier span in the page heading instead.
  if (!environment && deploymentType === DType.LifeTimeDeployment) {
    environment = document.querySelector('.TitleIdentifier')?.textContent?.trim() ?? null;
  }
}

function extractTimestamps(): void {
  const table = document.getElementById('MessagesTable');
  if (!table) return;
  const timeRe = /^\d{2}:\d{2}:\d{2}/;
  const cells = Array.from(table.querySelectorAll<HTMLElement>('td'))
    .filter(td => timeRe.test(td.textContent?.trim() ?? ''));
  if (cells.length === 0) return;
  startTime = cells[0].textContent!.trim().slice(0, 8);
  endTime   = cells[cells.length - 1].textContent!.trim().slice(0, 8);
}

function detectStatus(): DeploymentStatus | null {
  // Use textContent (not innerText) for final-state detection: eSpace publish
  // stores the "successfully published" message in a collapsed sub-step row
  // (display:none), which innerText skips. textContent includes all DOM text
  // regardless of visibility, so collapsed rows are always checked.
  // innerText is kept for the in-progress fallback to avoid matching hidden
  // in-progress text that persists from earlier steps after completion.
  const bodyAllText  = (document.body.textContent ?? '').toLowerCase();
  const bodyText     = document.body.innerText.toLowerCase();

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

function updateTabTitle(status: DeploymentStatus): void {
  document.title = `${STATUS_INDICATORS[status]} ${originalTitle}`;
}

// ── Polling ───────────────────────────────────────────────────────────────────

let pollsSinceLastSend = 0;
// Resend current status every ~20 s even if unchanged, so the service worker
// stays alive and session storage stays current after a worker restart.
const KEEPALIVE_POLLS = Math.round(20_000 / POLL_INTERVAL_MS);

function toHHMMSS(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function sendUpdate(status: DeploymentStatus): void {
  extractMetadata();
  extractTimestamps();
  // Fallback: when the page has no timestamped cells (e.g. Application Pack
  // publish), record wall-clock times on first observation of each phase.
  if (status === Status.InProgress && startTime === null) {
    startTime = toHHMMSS(new Date());
  } else if (status !== Status.InProgress && endTime === null) {
    endTime = toHHMMSS(new Date());
  }
  chrome.runtime.sendMessage(
    {
      type: 'deploymentUpdate',
      payload: {
        status,
        name: deploymentName,
        environment,
        server: serverName,
        deploymentType,
        url: window.location.href,
        tabId: null,
        startTime,
        endTime,
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
    updateTabTitle(status);
    sendUpdate(status);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

deploymentType = detectDeploymentType();
extractMetadata();

setInterval(checkForUpdates, POLL_INTERVAL_MS);

