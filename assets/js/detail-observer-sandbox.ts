export {};

(() => {
  const page = document.body?.dataset.tenantPage || '';
  if (!['client-detail', 'plant-detail'].includes(page)) return;

  const nativeObserver = window.MutationObserver;
  if (!nativeObserver) return;

  class FleetDetailNoopObserver {
    constructor(_callback: MutationCallback) {}
    observe(_target: Node, _options?: MutationObserverInit): void {}
    disconnect(): void {}
    takeRecords(): MutationRecord[] { return []; }
  }

  (window as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver = FleetDetailNoopObserver as unknown as typeof MutationObserver;
  document.documentElement.dataset.detailObserverSandbox = 'active';

  window.addEventListener('load', () => {
    (window as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver = nativeObserver;
    document.documentElement.dataset.detailObserverSandbox = 'released';
  }, { once: true });
})();
