import type { UserPreferences } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/constants';

export const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  notifySuccess:        true,
  notifyWarning:        true,
  notifyError:          true,
  notifyIntervention:   true,
  notifyUnknown:        true,
  animationsEnabled:    true,
  historyLimitType:     'count',
  historyMaxCount:      5,
  historyMaxDays:       1,
};

let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

export function getPreferences(): UserPreferences {
  return userPreferences;
}

export function setPreferences(prefs: UserPreferences): void {
  userPreferences = prefs;
}

export function savePreferences(): void {
  chrome.storage.local.set({ [STORAGE_KEYS.preferences]: userPreferences });
}
