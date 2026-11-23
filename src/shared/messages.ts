import type { DeploymentEntry, DeploymentStatus, DeploymentType, LogEvent, UserPreferences } from './types';

export const MessageType = {
  DeploymentUpdate:    'deploymentUpdate',
  GetDeployments:      'getDeployments',
  GetPreferences:      'getPreferences',
  UpdatePreferences:   'updatePreferences',
  ClearBadge:          'clearBadge',
  OpenDeployment:      'openDeployment',
  DeleteDeployment:    'deleteDeployment',
  DebugLog:            'debugLog',
  ClearDebugLog:       'clearDebugLog',
  DeploymentsResponse: 'deploymentsResponse',
  PreferencesResponse: 'preferencesResponse',
  PreferencesUpdated:  'preferencesUpdated',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface DeploymentUpdateMessage {
  type: typeof MessageType.DeploymentUpdate;
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
    date: string | null;
  };
}

export interface GetDeploymentsMessage   { type: typeof MessageType.GetDeployments; }
export interface GetPreferencesMessage   { type: typeof MessageType.GetPreferences; }
export interface ClearBadgeMessage       { type: typeof MessageType.ClearBadge; }

export interface UpdatePreferencesMessage {
  type: typeof MessageType.UpdatePreferences;
  payload: UserPreferences;
}

export interface OpenDeploymentMessage {
  type: typeof MessageType.OpenDeployment;
  payload: { url: string; tabId?: number };
}

export interface DeleteDeploymentMessage {
  type: typeof MessageType.DeleteDeployment;
  payload: { id: string };
}

export interface DebugLogMessage {
  type: typeof MessageType.DebugLog;
  payload: { event: LogEvent; data?: Record<string, unknown> };
}

export interface ClearDebugLogMessage { type: typeof MessageType.ClearDebugLog; }

export interface DeploymentsResponseMessage {
  type: typeof MessageType.DeploymentsResponse;
  payload: { deployments: DeploymentEntry[] };
}

export interface PreferencesResponseMessage {
  type: typeof MessageType.PreferencesResponse;
  payload: UserPreferences;
}

export interface PreferencesUpdatedMessage { type: typeof MessageType.PreferencesUpdated; }

export type BackgroundInboundMessage =
  | DeploymentUpdateMessage
  | GetDeploymentsMessage
  | GetPreferencesMessage
  | UpdatePreferencesMessage
  | ClearBadgeMessage
  | OpenDeploymentMessage
  | DeleteDeploymentMessage
  | DebugLogMessage
  | ClearDebugLogMessage;

export type PopupResponseMessage =
  | DeploymentsResponseMessage
  | PreferencesResponseMessage
  | PreferencesUpdatedMessage;
