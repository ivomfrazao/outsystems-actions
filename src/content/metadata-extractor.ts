import type { DeploymentType } from '../shared/types';
import { DeploymentType as DType } from '../shared/types';

export interface Metadata {
  name: string | null;
  environment: string | null;
  server: string | null;
}

export interface Timestamps {
  startTime: string | null;
  endTime: string | null;
}

export function extractMetadata(originalTitle: string, deploymentType: DeploymentType | null): Metadata {
  const parts = originalTitle.trim().split(' - ');
  let name: string | null        = null;
  let environment: string | null = null;

  if (parts.length >= 3) {
    name        = parts[0] ?? null;
    environment = parts[1] ?? null;
  } else if (parts.length === 2) {
    // "Environment - PageType" — no solution name in title.
    environment = parts[0] ?? null;
  }

  // For Application publishes the title doesn't include the app name; extract it
  // from the progress table. Use textContent so collapsed/hidden rows are included.
  if (!name) {
    const tableText = document.getElementById('MessagesTable')?.textContent ?? '';
    const match = tableText.match(/Creating Application '([^']+)'/);
    name = match?.[1] ?? null;
  }

  // For Solution publishes the title is generic; the name is in the page heading.
  if (!name && deploymentType === DType.Solution) {
    const headingText = document.querySelector('[id$="wtTitle_wtTitle"]')?.textContent?.trim() ?? '';
    const match = headingText.match(/Solution\s+(.+)$/i);
    name = match?.[1]?.trim() ?? null;
  }

  // For LifeTime deployments, extract app names from the deployment plan list.
  if (!name && deploymentType === DType.LifeTimeDeployment) {
    const opEls = Array.from(document.querySelectorAll('[id*="_wtListApplications_ctl"][id$="_wtOperation"]'));
    const appNames = opEls
      .map(el => el.closest('table')?.querySelector<HTMLElement>('span[style*="font-size: 13"]')?.textContent?.trim() ?? null)
      .filter(Boolean) as string[];
    if (appNames.length > 0) {
      name = appNames.length > 1 ? `${appNames[0]} +${appNames.length - 1}` : appNames[0];
    }
  }

  // Server name from the sidebar's server info block.
  const server = document.querySelector('.sc-content-left .margin-top-base > div:first-child')
    ?.textContent?.trim() ?? null;

  // LifeTime titles are "Deployment to <Env>" with no " - " separator.
  if (!environment && deploymentType === DType.LifeTimeDeployment) {
    environment = document.querySelector('.TitleIdentifier')?.textContent?.trim() ?? null;
  }

  return { name, environment, server };
}

export function extractTimestamps(): Timestamps {
  const table = document.getElementById('MessagesTable');
  if (!table) return { startTime: null, endTime: null };
  const timeRe = /^\d{2}:\d{2}:\d{2}/;
  const cells = Array.from(table.querySelectorAll<HTMLElement>('td'))
    .filter(td => timeRe.test(td.textContent?.trim() ?? ''));
  if (cells.length === 0) return { startTime: null, endTime: null };
  return {
    startTime: cells[0].textContent!.trim().slice(0, 8),
    endTime:   cells[cells.length - 1].textContent!.trim().slice(0, 8),
  };
}
