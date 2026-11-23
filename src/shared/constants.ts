export const POLL_INTERVAL_MS = 2000;

export const REPO_URL = 'https://github.com/ivomfrazao/outsystems-actions';

export const STORAGE_KEYS = {
  deployments:  'deployments',
  preferences:  'preferences',
  debugLogging: 'debugLogging',
  debugLog:     'debugLog',
  language:     'language',
  darkMode:     'darkMode',
} as const;

// Keys of the old split storage format, read once by the migration and removed.
export const LEGACY_STORAGE_KEYS = {
  history:            'history',
  pendingDeployments: 'pendingDeployments',
  activeDeployments:  'activeDeployments',
} as const;

export const DEBUG_LOG_MAX_ENTRIES = 500;
