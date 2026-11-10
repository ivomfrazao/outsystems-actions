import type { DeploymentStatus, DeploymentType } from '../shared/types';
import { DeploymentStatus as Status } from '../shared/types';
import { POLL_INTERVAL_MS } from '../shared/constants';
import { STATUS_INDICATORS } from '../shared/status-style';
import { detectPageType } from './page-detector';
import { detectStatus } from './status-detector';
import { extractMetadata, extractTimestamps } from './metadata-extractor';
import { debugLog } from './debug-log';

// ── State ─────────────────────────────────────────────────────────────────────

const originalTitle                  = document.title;
const deploymentType: DeploymentType | null = detectPageType();

let currentStatus: DeploymentStatus | null = null;
let startTime: string | null               = null;
let endTime: string | null                 = null;
let pollsSinceLastSend                     = 0;
let lastDetection: string | null           = null;

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

function sendUpdate(status: DeploymentStatus, keepalive: boolean): void {
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
  if (!keepalive) {
    debugLog('update-sent', { status, name, environment, server, startTime, endTime });
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

function checkForUpdates(): void {
  if (!deploymentType) return;

  const detection = detectStatus(deploymentType);
  pollsSinceLastSend++;

  // Log only when the detection outcome changes, not on every poll.
  const detectionKey = detection ? `${detection.status}|${detection.reason}` : null;
  if (detectionKey !== lastDetection) {
    debugLog('status-detected', detection
      ? { status: detection.status, reason: detection.reason }
      : { status: null, reason: 'no status signal on page' });
    lastDetection = detectionKey;
  }

  if (!detection) return;
  const status = detection.status;

  const changed   = status !== currentStatus;
  const keepalive = status === Status.InProgress && pollsSinceLastSend >= KEEPALIVE_POLLS;

  if (changed || keepalive) {
    currentStatus = status;
    updateTabTitle(status);
    sendUpdate(status, keepalive && !changed);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

extractMetadata(originalTitle, deploymentType);
debugLog(deploymentType ? 'page-detected' : 'page-ignored', {
  deploymentType,
  url:   window.location.href,
  title: originalTitle,
});
setInterval(checkForUpdates, POLL_INTERVAL_MS);
