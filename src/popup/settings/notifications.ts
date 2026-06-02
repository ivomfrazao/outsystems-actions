import type { UserPreferences } from '../../shared/types';

const NOTIFY_SUB_IDS = [
  'notifySuccess', 'notifyWarning', 'notifyError', 'notifyIntervention', 'notifyUnknown',
] as const;

const BOOL_IDS = ['notificationsEnabled', ...NOTIFY_SUB_IDS] as const;

function applyMasterToggle(enabled: boolean): void {
  for (const id of NOTIFY_SUB_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    el.disabled = !enabled;
    el.closest<HTMLElement>('.pref')?.classList.toggle('pref--disabled', !enabled);
  }
}

export function initNotificationsTab(prefs: UserPreferences, onSave: () => void): void {
  for (const id of BOOL_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    el.checked = prefs[id] as boolean;
    el.addEventListener('change', onSave);
  }

  applyMasterToggle(prefs.notificationsEnabled);

  const master = document.getElementById('notificationsEnabled') as HTMLInputElement | null;
  if (master) {
    master.addEventListener('change', () => applyMasterToggle(master.checked));
  }
}
