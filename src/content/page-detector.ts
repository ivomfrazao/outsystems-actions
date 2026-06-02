import type { DeploymentType } from '../shared/types';
import { DeploymentType as DType } from '../shared/types';

const URL_PATTERNS = [
  { pattern: 'eSpace_Publish.aspx',   type: DType.eSpace },
  { pattern: 'Solution_Publish.aspx', type: DType.Solution },
  { pattern: 'Staging_Progress.aspx', type: DType.LifeTimeDeployment },
] as const satisfies ReadonlyArray<{ pattern: string; type: DeploymentType }>;

export function detectPageType(): DeploymentType | null {
  const urlLower = window.location.href.toLowerCase();
  return URL_PATTERNS.find(({ pattern }) => urlLower.includes(pattern.toLowerCase()))?.type ?? null;
}
