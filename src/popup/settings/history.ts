import type { DeploymentEntry, UserPreferences } from '../../shared/types';
import type { HistoryLimits } from '../../shared/history-limits';
import { applyHistoryLimits } from '../../shared/history-limits';
import { STORAGE_KEYS } from '../../shared/constants';
import { t } from '../../shared/i18n';

// Limits currently in effect. The form may hold different, unconfirmed values;
// saving another settings pane must persist these, not the form.
let committed: HistoryLimits;

export function getCommittedHistoryLimits(): HistoryLimits {
  return committed;
}

function applyLimitType(type: 'count' | 'days'): void {
  const countInput = document.getElementById('historyMaxCount') as HTMLInputElement | null;
  const daysInput  = document.getElementById('historyMaxDays')  as HTMLInputElement | null;
  if (countInput) countInput.disabled = type !== 'count';
  if (daysInput)  daysInput.disabled  = type !== 'days';
}

function readForm(): HistoryLimits {
  const limitType = (
    document.querySelector<HTMLInputElement>('input[name="historyLimitType"]:checked')?.value ?? 'count'
  ) as 'count' | 'days';
  return {
    historyLimitType: limitType,
    historyMaxCount:  parseInt((document.getElementById('historyMaxCount') as HTMLInputElement)?.value ?? '5', 10) || committed.historyMaxCount,
    historyMaxDays:   parseInt((document.getElementById('historyMaxDays')  as HTMLInputElement)?.value ?? '1', 10) || committed.historyMaxDays,
  };
}

function writeForm(limits: HistoryLimits): void {
  const radio = document.querySelector<HTMLInputElement>(`input[name="historyLimitType"][value="${limits.historyLimitType}"]`);
  if (radio) radio.checked = true;
  const countEl = document.getElementById('historyMaxCount') as HTMLInputElement | null;
  const daysEl  = document.getElementById('historyMaxDays')  as HTMLInputElement | null;
  if (countEl) countEl.value = String(limits.historyMaxCount);
  if (daysEl)  daysEl.value  = String(limits.historyMaxDays);
  applyLimitType(limits.historyLimitType);
}

function sameLimits(a: HistoryLimits, b: HistoryLimits): boolean {
  return a.historyLimitType === b.historyLimitType &&
         a.historyMaxCount  === b.historyMaxCount &&
         a.historyMaxDays   === b.historyMaxDays;
}

// null = no pending change: buttons disabled, no message.
function showConfirm(removeCount: number | null): void {
  const text = document.getElementById('historyConfirmText');
  if (text) {
    text.textContent = removeCount === null
      ? ''
      : t(removeCount === 1 ? 'history_confirm_one' : 'history_confirm_other', { count: String(removeCount) });
  }
  for (const id of ['historyApply', 'historyCancel']) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = removeCount === null;
  }
}

export function initHistoryTab(prefs: UserPreferences, onSave: () => void): void {
  committed = {
    historyLimitType: prefs.historyLimitType,
    historyMaxCount:  prefs.historyMaxCount,
    historyMaxDays:   prefs.historyMaxDays,
  };
  writeForm(committed);
  showConfirm(null);

  const commit = (limits: HistoryLimits): void => {
    committed = limits;
    showConfirm(null);
    onSave();
  };

  // Every change waits for Apply, with a preview of how many entries it deletes.
  const onFormChange = (): void => {
    const pending = readForm();
    applyLimitType(pending.historyLimitType);
    if (sameLimits(pending, committed)) {
      showConfirm(null);
      return;
    }
    chrome.storage.local.get([STORAGE_KEYS.deployments], (result) => {
      const all = (result[STORAGE_KEYS.deployments] as DeploymentEntry[] | undefined) ?? [];
      showConfirm(all.length - applyHistoryLimits(all, pending).length);
    });
  };

  document.querySelectorAll<HTMLInputElement>('input[name="historyLimitType"]').forEach(radio => {
    radio.addEventListener('change', onFormChange);
  });
  document.getElementById('historyMaxCount')?.addEventListener('input', onFormChange);
  document.getElementById('historyMaxDays')?.addEventListener('input', onFormChange);

  document.getElementById('historyApply')?.addEventListener('click', () => commit(readForm()));
  document.getElementById('historyCancel')?.addEventListener('click', () => {
    writeForm(committed);
    showConfirm(null);
  });
}
