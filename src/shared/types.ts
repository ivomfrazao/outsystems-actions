export const DeploymentType = {
  eSpace:             'eSpace',
  Solution:           'Solution',
  LifeTimeDeployment: 'LifeTimeDeployment',
} as const;
export type DeploymentType = (typeof DeploymentType)[keyof typeof DeploymentType];

export const DeploymentStatus = {
  InProgress:   'in_progress',
  Success:      'success',
  Warning:      'warning',
  Error:        'error',
  Intervention: 'intervention',
  Unknown:      'unknown',
} as const;
export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export type FinalStatus = Exclude<DeploymentStatus, typeof DeploymentStatus.InProgress>;

export const LogSource = {
  Content:    'content',
  Background: 'background',
} as const;
export type LogSource = (typeof LogSource)[keyof typeof LogSource];

export const LogEvent = {
  // Content script
  PageDetected:   'page-detected',
  PageIgnored:    'page-ignored',
  StatusDetected: 'status-detected',
  UpdateSent:     'update-sent',
  // Background
  WorkerStarted:          'worker-started',
  UpdateHandled:          'update-handled',
  MarkedUnknown:          'marked-unknown',
  NotificationSuppressed: 'notification-suppressed',
  NotificationShown:      'notification-shown',
} as const;
export type LogEvent = (typeof LogEvent)[keyof typeof LogEvent];

export interface DebugLogEntry {
  time: number;
  source: LogSource;
  event: LogEvent;
  tabId?: number;
  data?: Record<string, unknown>;
}

export interface DeploymentEntry {
  id: string;
  type: DeploymentType;
  name: string | null;
  environment: string | null;
  server: string | null;
  url: string;
  status: DeploymentStatus;
  timestamp: number;
  startTime: string | null;
  endTime: string | null;
  // YYYY-MM-DD of the first log entry, when the page's log carries a date.
  // Display only: `timestamp` still drives ordering and history expiry.
  date?: string | null;
  tabId?: number;
}

export const HistoryLimitType = {
  Count: 'count',
  Days:  'days',
} as const;
export type HistoryLimitType = (typeof HistoryLimitType)[keyof typeof HistoryLimitType];

// Stored on its own under STORAGE_KEYS.darkMode, not in UserPreferences.
export const DarkMode = {
  On:     'on',
  Off:    'off',
  System: 'system',
} as const;
export type DarkMode = (typeof DarkMode)[keyof typeof DarkMode];

export interface UserPreferences {
  notificationsEnabled: boolean;
  notifySuccess:        boolean;
  notifyWarning:        boolean;
  notifyError:          boolean;
  notifyIntervention:   boolean;
  notifyUnknown:        boolean;
  animationsEnabled:    boolean;
  historyLimitType:     HistoryLimitType;
  historyMaxCount:      number;
  historyMaxDays:       number;
}
