import type { DebugLogEntry } from '../../shared/types';
import { REPO_URL, STORAGE_KEYS } from '../../shared/constants';
import { t } from '../../shared/i18n';

// Issue bodies stay in English regardless of UI language so the maintainer can read them.
function issueUrl(label: string, body: string): string {
  const params = new URLSearchParams({ labels: label, body });
  return `${REPO_URL}/issues/new?${params}`;
}

// Bundles the log with the context needed to read it: version, browser,
// settings and current deployment state.
async function buildLogExport(): Promise<string> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.debugLog, STORAGE_KEYS.preferences, STORAGE_KEYS.deployments, 'language',
  ]);
  const entries = (result[STORAGE_KEYS.debugLog] as DebugLogEntry[] | undefined) ?? [];
  return JSON.stringify({
    extensionVersion: chrome.runtime.getManifest().version,
    userAgent:        navigator.userAgent,
    language:         result['language'] ?? null,
    exportedAt:       new Date().toISOString(),
    preferences:      result[STORAGE_KEYS.preferences] ?? null,
    deployments:      result[STORAGE_KEYS.deployments] ?? [],
    entries:          entries.map(e => ({ ...e, time: new Date(e.time).toISOString() })),
  }, null, 2);
}

function initDiagnostics(): void {
  const toggle   = document.getElementById('debugLogging')     as HTMLInputElement  | null;
  const countEl  = document.getElementById('debugLogCount');
  const download = document.getElementById('debugLogDownload') as HTMLButtonElement | null;
  const copy     = document.getElementById('debugLogCopy')     as HTMLButtonElement | null;
  const clear    = document.getElementById('debugLogClear')    as HTMLButtonElement | null;

  const renderCount = (entries: DebugLogEntry[] | undefined): void => {
    const count = entries?.length ?? 0;
    if (countEl) countEl.textContent = String(count);
    for (const btn of [download, copy, clear]) if (btn) btn.disabled = count === 0;
  };

  chrome.storage.local.get([STORAGE_KEYS.debugLogging, STORAGE_KEYS.debugLog], (result) => {
    if (toggle) toggle.checked = result[STORAGE_KEYS.debugLogging] === true;
    renderCount(result[STORAGE_KEYS.debugLog] as DebugLogEntry[] | undefined);
  });

  // The log keeps growing while the popup is open (e.g. a deploy finishing).
  chrome.storage.onChanged.addListener((changes) => {
    if (STORAGE_KEYS.debugLog in changes) {
      renderCount(changes[STORAGE_KEYS.debugLog].newValue as DebugLogEntry[] | undefined);
    }
  });

  toggle?.addEventListener('change', () => {
    chrome.storage.local.set({ [STORAGE_KEYS.debugLogging]: toggle.checked });
  });

  download?.addEventListener('click', async () => {
    const blob = new Blob([await buildLogExport()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `outsystems-actions-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  copy?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(await buildLogExport());
    copy.textContent = t('about_log_copied');
    setTimeout(() => { copy.textContent = t('about_log_copy'); }, 1500);
  });

  clear?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'clearDebugLog' });
  });
}

export function initAboutTab(): void {
  const version = chrome.runtime.getManifest().version;
  const env = `**Extension version:** ${version}\n**Browser:** ${navigator.userAgent}\n\n`;

  const versionEl = document.getElementById('aboutVersion');
  if (versionEl) versionEl.textContent = version;

  const bugBody = `${env}**What happened?**\n\n**What did you expect?**\n\n**Steps to reproduce**\n1. \n\n` +
    `**Debug log** (optional): turn on Settings → About → Debug logging, reproduce, then download the log and drag it here.\n`;

  const links: Record<string, string> = {
    aboutRepo:      REPO_URL,
    aboutChangelog: `${REPO_URL}/releases`,
    aboutBug:       issueUrl('bug', bugBody),
    aboutFeature:   issueUrl('enhancement', `${env}**What would you like the extension to do?**\n\n**Why would it help?**\n`),
  };
  for (const [id, href] of Object.entries(links)) {
    const a = document.getElementById(id) as HTMLAnchorElement | null;
    if (a) a.href = href;
  }

  initDiagnostics();
}
