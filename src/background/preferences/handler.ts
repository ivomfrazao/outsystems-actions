import type { UpdatePreferencesMessage } from '../../shared/messages';
import { setPreferences, savePreferences } from './store';
import { enforceHistoryLimits } from '../deployments/history';

export function handleUpdatePreferences(message: UpdatePreferencesMessage): void {
  setPreferences(message.payload);
  savePreferences();
  enforceHistoryLimits(message.payload);
}
