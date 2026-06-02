import type { DeploymentEntry, FinalStatus, UserPreferences } from '../shared/types';
import { DeploymentStatus, DeploymentType } from '../shared/types';

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

const TYPE_LABEL: Record<string, string> = {
  [DeploymentType.eSpace]:             'Application',
  [DeploymentType.Solution]:           'Solution',
  [DeploymentType.LifeTimeDeployment]: 'LifeTime',
};

const ACTION_LABEL: Record<string, string> = {
  [DeploymentType.eSpace]:             'Publish',
  [DeploymentType.Solution]:           'Publish',
  [DeploymentType.LifeTimeDeployment]: 'Deployment',
};

const STATUS_LABEL: Record<FinalStatus, string> = {
  [DeploymentStatus.Success]:      'Successful',
  [DeploymentStatus.Warning]:      'with Warnings',
  [DeploymentStatus.Error]:        'with Errors',
  [DeploymentStatus.Intervention]: 'Needs Intervention',
  [DeploymentStatus.Unknown]:      'Outcome Unknown',
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
  const typeLabel   = TYPE_LABEL[entry.type]   ?? 'Deployment';
  const action      = ACTION_LABEL[entry.type]  ?? 'Deployment';
  const statusLabel = STATUS_LABEL[status];
  const options: chrome.notifications.NotificationOptions<true> = {
    type:               'basic',
    iconUrl:            'icons/icon-48.png',
    title:              `${typeLabel} ${action} ${statusLabel}`,
    message:            `${entry.name ?? 'Unknown'} in ${entry.environment ?? 'Unknown'} at ${new Date(entry.timestamp).toLocaleTimeString()}`,
    requireInteraction: false,
  };
  chrome.notifications.create(`deployment-${entry.id}`, options);
}
