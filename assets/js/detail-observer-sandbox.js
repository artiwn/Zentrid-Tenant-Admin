"use strict";
(() => {
    const page = document.body?.dataset.tenantPage || '';
    if (!['client-detail', 'plant-detail'].includes(page))
        return;
    const nativeObserver = window.MutationObserver;
    if (!nativeObserver)
        return;
    class FleetDetailNoopObserver {
        constructor(_callback) { }
        observe(_target, _options) { }
        disconnect() { }
        takeRecords() { return []; }
    }
    window.MutationObserver = FleetDetailNoopObserver;
    document.documentElement.dataset.detailObserverSandbox = 'active';
    window.addEventListener('load', () => {
        window.MutationObserver = nativeObserver;
        document.documentElement.dataset.detailObserverSandbox = 'released';
    }, { once: true });
})();
