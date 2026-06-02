import type { DeploymentEntry, FinalStatus, UserPreferences } from '../shared/types';
import { DeploymentStatus, DeploymentType } from '../shared/types';
import { t } from '../shared/i18n';

const PREF_KEY_MAP = {
  [DeploymentStatus.Success]:      'notifySuccess',
  [DeploymentStatus.Warning]:      'notifyWarning',
  [DeploymentStatus.Error]:        'notifyError',
  [DeploymentStatus.Intervention]: 'notifyIntervention',
  [DeploymentStatus.Unknown]:      'notifyUnknown',
} as const satisfies Record<FinalStatus, keyof UserPreferences>;

const BADGE_CONFIG = {
  [DeploymentStatus.Success]:      { text: '✓', color: '#00FF00' },
  [DeploymentStatus.Warning]:      { text: '!', color: '#FFFF00' },
  [DeploymentStatus.Error]:        { text: '!', color: '#FF0000' },
  [DeploymentStatus.Intervention]: { text: '!', color: '#FF0000' },
  [DeploymentStatus.Unknown]:      { text: '?', color: '#808080' },
} as const satisfies Record<FinalStatus, { text: string; color: string }>;

const TYPE_KEY: Record<string, string> = {
  [DeploymentType.eSpace]:             'notif_type_application',
  [DeploymentType.Solution]:           'notif_type_solution',
  [DeploymentType.LifeTimeDeployment]: 'notif_type_lifetime',
};

const ACTION_KEY: Record<string, string> = {
  [DeploymentType.eSpace]:             'notif_action_publish',
  [DeploymentType.Solution]:           'notif_action_publish',
  [DeploymentType.LifeTimeDeployment]: 'notif_action_deployment',
};

const STATUS_KEY: Record<FinalStatus, string> = {
  [DeploymentStatus.Success]:      'notif_status_successful',
  [DeploymentStatus.Warning]:      'notif_status_warnings',
  [DeploymentStatus.Error]:        'notif_status_errors',
  [DeploymentStatus.Intervention]: 'notif_status_intervention',
  [DeploymentStatus.Unknown]:      'notif_status_unknown',
};

export function updateBadge(status: FinalStatus): void {
  const { text, color } = BADGE_CONFIG[status];
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

export function clearBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

export function createNotification(entry: DeploymentEntry, prefs: UserPreferences): void {
  if (!prefs.notificationsEnabled) return;
  const status = entry.status as FinalStatus;
  if (!prefs[PREF_KEY_MAP[status]]) return;
  const typeLabel   = t(TYPE_KEY[entry.type]   ?? 'notif_type_application');
  const action      = t(ACTION_KEY[entry.type]  ?? 'notif_action_deployment');
  const statusLabel = t(STATUS_KEY[status]);
  const name        = entry.name        ?? t('notif_name_unknown');
  const environment = entry.environment ?? t('notif_env_unknown');
  const options: chrome.notifications.NotificationOptions<true> = {
    type:               'basic',
    iconUrl:            'icons/icon-48.png',
    title:              `${typeLabel} ${action} ${statusLabel}`,
    message:            `${name} in ${environment} at ${new Date(entry.timestamp).toLocaleTimeString()}`,
    requireInteraction: false,
  };
  chrome.notifications.create(`deployment-${entry.id}`, options);
}
