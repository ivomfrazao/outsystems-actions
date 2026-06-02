import type { UserPreferences } from '../../shared/types';

function applyLimitType(type: 'count' | 'days'): void {
  const countInput = document.getElementById('historyMaxCount') as HTMLInputElement | null;
  const daysInput  = document.getElementById('historyMaxDays')  as HTMLInputElement | null;
  if (countInput) countInput.disabled = type !== 'count';
  if (daysInput)  daysInput.disabled  = type !== 'days';
}

export function initHistoryTab(prefs: UserPreferences, onSave: () => void): void {
  const limitType = prefs.historyLimitType;

  const limitRadio = document.querySelector<HTMLInputElement>(`input[name="historyLimitType"][value="${limitType}"]`);
  if (limitRadio) limitRadio.checked = true;
  applyLimitType(limitType);

  document.querySelectorAll<HTMLInputElement>('input[name="historyLimitType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      applyLimitType(radio.value as 'count' | 'days');
      onSave();
    });
  });

  const countEl = document.getElementById('historyMaxCount') as HTMLInputElement | null;
  if (countEl) {
    countEl.value = String(prefs.historyMaxCount);
    countEl.addEventListener('change', onSave);
  }

  const daysEl = document.getElementById('historyMaxDays') as HTMLInputElement | null;
  if (daysEl) {
    daysEl.value = String(prefs.historyMaxDays);
    daysEl.addEventListener('change', onSave);
  }
}
