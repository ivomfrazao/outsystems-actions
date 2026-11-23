import type { LogEvent } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { MessageType } from '../shared/messages';

let enabled = false;

// Entries logged before the flag is read (e.g. page detection at load) wait on this.
const ready = chrome.storage.local.get(STORAGE_KEYS.debugLogging).then(result => {
  enabled = result[STORAGE_KEYS.debugLogging] === true;
});

chrome.storage.onChanged.addListener((changes) => {
  if (STORAGE_KEYS.debugLogging in changes) {
    enabled = changes[STORAGE_KEYS.debugLogging].newValue === true;
  }
});

export function debugLog(event: LogEvent, data?: Record<string, unknown>): void {
  void ready.then(() => {
    if (!enabled) return;
    chrome.runtime.sendMessage(
      { type: MessageType.DebugLog, payload: { event, data } },
      () => { void chrome.runtime.lastError; },
    );
  });
}
