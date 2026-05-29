// ── Domain value objects ──────────────────────────────────────────────────────

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

// ── Domain constants ──────────────────────────────────────────────────────────

export const POLL_INTERVAL_MS = 2000;

export const STORAGE_KEYS = {
  deployments: 'deployments',
  preferences: 'preferences',
} as const;

// ── Data model interfaces ─────────────────────────────────────────────────────

// Single unified record for every deployment, active or concluded.
// `tabId` is present only while the deployment is actively tracked (in_progress in a live tab).
// `timestamp` is the last-keepalive time while in_progress and the completion time once concluded.
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

// ── Message interfaces ────────────────────────────────────────────────────────

export interface DeploymentUpdateMessage {
  type: 'deploymentUpdate';
  payload: {
    status: DeploymentStatus;
    name: string | null;
    environment: string | null;
    server: string | null;
    deploymentType: DeploymentType;
    url: string;
    tabId: null;
    startTime: string | null;
    endTime: string | null;
  };
}

export interface GetDeploymentsMessage   { type: 'getDeployments'; }
export interface GetPreferencesMessage   { type: 'getPreferences'; }
export interface ClearBadgeMessage       { type: 'clearBadge'; }

export interface UpdatePreferencesMessage {
  type: 'updatePreferences';
  payload: UserPreferences;
}

export interface OpenDeploymentMessage {
  type: 'openDeployment';
  payload: { url: string };
}

export interface DeleteDeploymentMessage {
  type: 'deleteDeployment';
  payload: { id: string };
}

export interface DeploymentsResponseMessage {
  type: 'deploymentsResponse';
  payload: { deployments: DeploymentEntry[] };
}

export interface PreferencesResponseMessage {
  type: 'preferencesResponse';
  payload: UserPreferences;
}

export interface PreferencesUpdatedMessage { type: 'preferencesUpdated'; }

export type BackgroundInboundMessage =
  | DeploymentUpdateMessage
  | GetDeploymentsMessage
  | GetPreferencesMessage
  | UpdatePreferencesMessage
  | ClearBadgeMessage
  | OpenDeploymentMessage
  | DeleteDeploymentMessage;

export type PopupResponseMessage =
  | DeploymentsResponseMessage
  | PreferencesResponseMessage
  | PreferencesUpdatedMessage;
