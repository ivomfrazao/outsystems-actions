const PANEL_ORDER = ['deployments', 'settings'] as const;
type PanelName = typeof PANEL_ORDER[number];

let currentPanelIndex = 0;

export function showTab(tab: string): void {
  const idx = PANEL_ORDER.indexOf(tab as PanelName);
  if (idx === -1) return;
  currentPanelIndex = idx;

  const track = document.querySelector<HTMLElement>('.panels-track');
  if (track) track.style.transform = idx > 0 ? `translateX(${-idx * 360}px)` : '';

  document.querySelectorAll<HTMLElement>('[data-tab]').forEach(btn => {
    btn.classList.toggle('nav__item--active', btn.dataset['tab'] === tab);
  });
}

export function initNav(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset['tab'] ?? ''));
  });
}

export function initSwipe(): void {
  const container = document.querySelector<HTMLElement>('.panels');
  if (!container) return;
  let startX = 0;
  container.addEventListener('touchstart', (e: TouchEvent) => {
    startX = e.touches[0].clientX;
  }, { passive: true });
  container.addEventListener('touchend', (e: TouchEvent) => {
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) < container.clientWidth * 0.3) return;
    if (delta < 0 && currentPanelIndex < PANEL_ORDER.length - 1) showTab(PANEL_ORDER[currentPanelIndex + 1]);
    else if (delta > 0 && currentPanelIndex > 0) showTab(PANEL_ORDER[currentPanelIndex - 1]);
  }, { passive: true });
}
