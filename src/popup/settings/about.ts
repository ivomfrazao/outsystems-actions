import { REPO_URL } from '../../shared/constants';

// Issue bodies stay in English regardless of UI language so the maintainer can read them.
function issueUrl(label: string, body: string): string {
  const params = new URLSearchParams({ labels: label, body });
  return `${REPO_URL}/issues/new?${params}`;
}

export function initAboutTab(): void {
  const version = chrome.runtime.getManifest().version;
  const env = `**Extension version:** ${version}\n**Browser:** ${navigator.userAgent}\n\n`;

  const versionEl = document.getElementById('aboutVersion');
  if (versionEl) versionEl.textContent = version;

  const links: Record<string, string> = {
    aboutRepo:      REPO_URL,
    aboutChangelog: `${REPO_URL}/releases`,
    aboutBug:       issueUrl('bug', `${env}**What happened?**\n\n**What did you expect?**\n\n**Steps to reproduce**\n1. `),
    aboutFeature:   issueUrl('enhancement', `${env}**What would you like the extension to do?**\n\n**Why would it help?**\n`),
  };
  for (const [id, href] of Object.entries(links)) {
    const a = document.getElementById(id) as HTMLAnchorElement | null;
    if (a) a.href = href;
  }
}
