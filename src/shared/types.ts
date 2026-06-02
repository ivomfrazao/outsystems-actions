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
  tabId?: number;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  notifySuccess:        boolean;
  notifyWarning:        boolean;
  notifyError:          boolean;
  notifyIntervention:   boolean;
  notifyUnknown:        boolean;
  animationsEnabled:    boolean;
  historyLimitType:     'count' | 'days';
  historyMaxCount:      number;
  historyMaxDays:       number;
}
