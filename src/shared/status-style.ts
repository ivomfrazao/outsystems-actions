import type { DeploymentStatus } from './types';
import { DeploymentStatus as Status } from './types';

// Single source of truth for per-status colours. The tab-title emoji and the
// toolbar badge are driven from here. The popup stylesheet (src/popup.html,
// .card__accent--* / .card__tag--*) cannot import TS, so keep its hex values
// in sync with STATUS_COLORS by hand.

export const STATUS_INDICATORS: Record<DeploymentStatus, string> = {
  [Status.InProgress]:   '🔵',
  [Status.Success]:      '🟢',
  [Status.Warning]:      '🟡',
  [Status.Error]:        '🔴',
  [Status.Intervention]: '🟣',
  [Status.Unknown]:      '⚪',
};

export const STATUS_COLORS: Record<DeploymentStatus, string> = {
  [Status.InProgress]:   '#3b82f6',
  [Status.Success]:      '#22c55e',
  [Status.Warning]:      '#eab308',
  [Status.Error]:        '#ef4444',
  [Status.Intervention]: '#a855f7',
  [Status.Unknown]:      '#9ca3af',
};
