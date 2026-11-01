import type { DebugLogEntry } from '../shared/types';
import { STORAGE_KEYS, DEBUG_LOG_MAX_ENTRIES } from '../shared/constants';

// The background is the only writer of the log, so appends from several tabs
// can't overwrite each other. Writes are chained so each read-modify-write
// completes before the next starts. The enabled flag is read inside the chain
// rather than cached, so nothing is lost while a restarted worker initialises.
let queue: Promise<void> = Promise.resolve();

export function debugLog(
  source: DebugLogEntry['source'],
  event: string,
  data?: Record<string, unknown>,
  tabId?: number,
): void {
  const entry: DebugLogEntry = { time: Date.now(), source, event, tabId, data };
  queue = queue.then(async () => {
    const result = await chrome.storage.local.get([STORAGE_KEYS.debugLogging, STORAGE_KEYS.debugLog]);
    if (result[STORAGE_KEYS.debugLogging] !== true) return;
    const entries = (result[STORAGE_KEYS.debugLog] as DebugLogEntry[] | undefined) ?? [];
    entries.push(entry);
    await chrome.storage.local.set({ [STORAGE_KEYS.debugLog]: entries.slice(-DEBUG_LOG_MAX_ENTRIES) });
  }).catch(() => {});
}

export function clearDebugLog(): void {
  queue = queue.then(() => chrome.storage.local.set({ [STORAGE_KEYS.debugLog]: [] })).catch(() => {});
}
