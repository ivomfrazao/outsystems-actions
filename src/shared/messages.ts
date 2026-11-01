import type { DeploymentEntry, DeploymentStatus, DeploymentType, UserPreferences } from './types';

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
  payload: { url: string; tabId?: number };
}

export interface DeleteDeploymentMessage {
  type: 'deleteDeployment';
  payload: { id: string };
}

export interface DebugLogMessage {
  type: 'debugLog';
  payload: { event: string; data?: Record<string, unknown> };
}

export interface ClearDebugLogMessage { type: 'clearDebugLog'; }

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
  | DeleteDeploymentMessage
  | DebugLogMessage
  | ClearDebugLogMessage;

export type PopupResponseMessage =
  | DeploymentsResponseMessage
  | PreferencesResponseMessage
  | PreferencesUpdatedMessage;
