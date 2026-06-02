import type { DeploymentStatus, DeploymentType } from '../shared/types';
import { DeploymentStatus as Status } from '../shared/types';
import { POLL_INTERVAL_MS } from '../shared/constants';
import { detectPageType } from './page-detector';
import { detectStatus } from './status-detector';
import { extractMetadata, extractTimestamps } from './metadata-extractor';

const STATUS_INDICATORS: Record<DeploymentStatus, string> = {
  [Status.InProgress]:   '🔵',
  [Status.Success]:      '🟢',
  [Status.Warning]:      '🟡',
  [Status.Error]:        '🔴',
  [Status.Intervention]: '⚠️',
  [Status.Unknown]:      '❓',
};

// ── State ─────────────────────────────────────────────────────────────────────

const originalTitle                  = document.title;
const deploymentType: DeploymentType | null = detectPageType();

let currentStatus: DeploymentStatus | null = null;
let startTime: string | null               = null;
let endTime: string | null                 = null;
let pollsSinceLastSend                     = 0;

// Resend current status every ~20 s even if unchanged, to keep the service
// worker alive and session storage current after a worker restart.
const KEEPALIVE_POLLS = Math.round(20_000 / POLL_INTERVAL_MS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toHHMMSS(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function updateTabTitle(status: DeploymentStatus): void {
  document.title = `${STATUS_INDICATORS[status]} ${originalTitle}`;
}

// ── Send ──────────────────────────────────────────────────────────────────────

function sendUpdate(status: DeploymentStatus): void {
  const { name, environment, server } = extractMetadata(originalTitle, deploymentType);
  const timestamps = extractTimestamps();

  // Use page timestamps when available; fall back to wall-clock on first
  // observation of each phase (e.g. Application Pack publishes have no table).
  if (timestamps.startTime) {
    startTime = timestamps.startTime;
  } else if (status === Status.InProgress && startTime === null) {
    startTime = toHHMMSS(new Date());
  }

  if (timestamps.endTime) {
    endTime = timestamps.endTime;
  } else if (status !== Status.InProgress && endTime === null) {
    endTime = toHHMMSS(new Date());
  }

  chrome.runtime.sendMessage(
    {
      type: 'deploymentUpdate',
      payload: {
        status,
        name,
        environment,
        server,
        deploymentType,
        url:       window.location.href,
        tabId:     null,
        startTime,
        endTime,
      },
    },
    () => { void chrome.runtime.lastError; }
  );
  pollsSinceLastSend = 0;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

function checkForUpdates(): void {
  if (!deploymentType) return;

  const status = detectStatus();
  pollsSinceLastSend++;

  if (!status) return;

  const changed   = status !== currentStatus;
  const keepalive = status === Status.InProgress && pollsSinceLastSend >= KEEPALIVE_POLLS;

  if (changed || keepalive) {
    currentStatus = status;
    updateTabTitle(status);
    sendUpdate(status);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

extractMetadata(originalTitle, deploymentType);
setInterval(checkForUpdates, POLL_INTERVAL_MS);
