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
} as const;
export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export type FinalStatus = Exclude<DeploymentStatus, typeof DeploymentStatus.InProgress>;

// ── Domain constants ──────────────────────────────────────────────────────────

export const POLL_INTERVAL_MS = 2000;

export const STORAGE_KEYS = {
  activeDeployments: 'activeDeployments',
  preferences:       'preferences',
  history:           'history',
} as const;

// ── Data model interfaces ─────────────────────────────────────────────────────

export interface DeploymentHistoryEntry {
  id: string;
  type: DeploymentType;
  name: string | null;
  environment: string | null;
  server: string | null;
  status: FinalStatus;
  timestamp: number;
  url: string;
}

export interface UserPreferences {
  notifySuccess:      boolean;
  notifyWarning:      boolean;
  notifyError:        boolean;
  notifyIntervention: boolean;
  animationsEnabled:  boolean;
  historyLimitType:   'count' | 'days';
  historyMaxCount:    number;
  historyMaxDays:     number;
}

export interface ActiveDeploymentState {
  currentStatus: DeploymentStatus | null;
  lastUpdate: number;
  name: string | null;
  environment: string | null;
  server: string | null;
  url: string;
  deploymentType: DeploymentType;
}

export type ActiveDeployments = Record<number, ActiveDeploymentState>;

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
  };
}

export interface PlaySoundMessage             { type: 'playSound'; }
export interface GetHistoryMessage            { type: 'getHistory'; }
export interface GetActiveDeploymentsMessage  { type: 'getActiveDeployments'; }
export interface GetPreferencesMessage        { type: 'getPreferences'; }
export interface ClearBadgeMessage            { type: 'clearBadge'; }

export interface UpdatePreferencesMessage {
  type: 'updatePreferences';
  payload: UserPreferences;
}

export interface OpenDeploymentMessage {
  type: 'openDeployment';
  payload: { url: string };
}

export interface DeleteHistoryEntryMessage {
  type: 'deleteHistoryEntry';
  payload: { id: string };
}

export interface HistoryResponseMessage {
  type: 'historyResponse';
  payload: { history: DeploymentHistoryEntry[] };
}

export interface ActiveDeploymentsResponseMessage {
  type: 'activeDeploymentsResponse';
  payload: { active: ActiveDeploymentState[] };
}

export interface PreferencesResponseMessage {
  type: 'preferencesResponse';
  payload: UserPreferences;
}

export interface PreferencesUpdatedMessage { type: 'preferencesUpdated'; }

export type BackgroundInboundMessage =
  | DeploymentUpdateMessage
  | GetHistoryMessage
  | GetActiveDeploymentsMessage
  | GetPreferencesMessage
  | UpdatePreferencesMessage
  | ClearBadgeMessage
  | OpenDeploymentMessage
  | DeleteHistoryEntryMessage;

export type ContentInboundMessage = PlaySoundMessage;

export type PopupResponseMessage =
  | HistoryResponseMessage
  | ActiveDeploymentsResponseMessage
  | PreferencesResponseMessage
  | PreferencesUpdatedMessage;
