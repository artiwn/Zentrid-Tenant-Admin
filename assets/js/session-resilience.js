"use strict";
/* Zentrid error recovery and cross-tab session resilience.
   Coordinates auth state, connectivity UX and cache invalidation without exposing tokens. */
(function () {
    const CHANNEL_NAME = 'zentrid-session-v137';
    const STORAGE_MESSAGE_KEY = 'zentrid_session_message_v137';
    const REPOSITORY_CACHE_PREFIX = 'zentrid_repository_cache_v127:';
    const tabId = (() => {
        try {
            const existing = sessionStorage.getItem('zentrid_tab_id_v137');
            if (existing)
                return existing;
            const created = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            sessionStorage.setItem('zentrid_tab_id_v137', created);
            return created;
        }
        catch (_error) {
            return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
    })();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    let retriesObserved = 0;
    let lastEvent = 'initialized';
    let lastEventAt = new Date().toISOString();
    let bannerTimer = null;
    let suppressAuthBroadcast = false;
    let disposed = false;
    let previousAuthFingerprint = '';
    function authFingerprint() {
        const session = window.ZentridAuth?.getSession?.();
        if (!session?.accessToken)
            return 'signed-out';
        const username = String(session.user?.username || session.user?.email || 'authenticated');
        return `${username}|${session.roles.join(',')}|${session.expiresAt}`;
    }
    function record(event) {
        lastEvent = event;
        lastEventAt = new Date().toISOString();
    }
    function message(type, entities) {
        return {
            type,
            sender: tabId,
            at: Date.now(),
            nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            ...(entities?.length ? { entities: [...new Set(entities)] } : {})
        };
    }
    function publish(payload) {
        if (disposed)
            return;
        channel?.postMessage(payload);
        try {
            localStorage.setItem(STORAGE_MESSAGE_KEY, JSON.stringify(payload));
            localStorage.removeItem(STORAGE_MESSAGE_KEY);
        }
        catch (_error) {
            // BroadcastChannel or native auth-key storage events still keep tabs synchronized.
        }
    }
    function clearPersistedRepositoryCache(entities) {
        try {
            const entitySet = entities?.length ? new Set(entities) : null;
            const keys = [];
            for (let index = 0; index < sessionStorage.length; index += 1) {
                const key = sessionStorage.key(index);
                if (!key?.startsWith(REPOSITORY_CACHE_PREFIX))
                    continue;
                if (!entitySet)
                    keys.push(key);
                else {
                    const suffix = key.slice(REPOSITORY_CACHE_PREFIX.length);
                    if ([...entitySet].some(entity => suffix.startsWith(`${entity}|`)))
                        keys.push(key);
                }
            }
            keys.forEach(key => sessionStorage.removeItem(key));
        }
        catch (_error) {
            // Session storage recovery remains best-effort.
        }
    }
    function invalidateRepositoryCache(entities) {
        clearPersistedRepositoryCache(entities);
        const cache = window.FleetAPIRepositories?.cache;
        if (!cache)
            return;
        if (entities?.length)
            cache.invalidateMany(entities);
        else
            cache.invalidate();
    }
    function ensureBanner() {
        if (!document.body)
            return null;
        let banner = document.querySelector('[data-fleet-recovery-banner]');
        if (banner)
            return banner;
        banner = document.createElement('div');
        banner.className = 'fleet-recovery-banner';
        banner.dataset.fleetRecoveryBanner = 'true';
        banner.hidden = true;
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = '<span class="fleet-recovery-banner-icon" aria-hidden="true">●</span><div><strong></strong><small></small></div>';
        document.body.append(banner);
        return banner;
    }
    function hideBanner(delayMs = 0) {
        if (bannerTimer !== null)
            window.clearTimeout(bannerTimer);
        const hide = () => {
            bannerTimer = null;
            const banner = document.querySelector('[data-fleet-recovery-banner]');
            if (banner && navigator.onLine !== false)
                banner.hidden = true;
        };
        if (delayMs > 0)
            bannerTimer = window.setTimeout(hide, delayMs);
        else
            hide();
    }
    function showBanner(state, title, detail, persist = false) {
        const banner = ensureBanner();
        if (!banner)
            return;
        banner.hidden = false;
        banner.dataset.state = state;
        banner.querySelector('strong').textContent = title;
        banner.querySelector('small').textContent = detail;
        banner.setAttribute('role', state === 'offline' || state === 'warning' ? 'alert' : 'status');
        document.body.dataset.fleetConnectivity = state === 'offline' ? 'offline' : 'online';
        if (persist) {
            if (bannerTimer !== null)
                window.clearTimeout(bannerTimer);
            bannerTimer = null;
        }
        else
            hideBanner(3200);
    }
    function dispatchRemoteAuth(source) {
        suppressAuthBroadcast = true;
        try {
            window.dispatchEvent(new CustomEvent('zentrid:auth', { detail: window.ZentridAuth?.getSession?.() || null }));
            window.dispatchEvent(new CustomEvent('zentrid:session-sync', { detail: { source } }));
        }
        finally {
            queueMicrotask(() => { suppressAuthBroadcast = false; });
        }
    }
    function handleMessage(payload, source) {
        if (!payload || payload.sender === tabId || !payload.type)
            return;
        if (payload.type === 'cache-invalidate') {
            invalidateRepositoryCache(payload.entities);
            record(`remote-cache-invalidate:${source}`);
            return;
        }
        if (payload.type === 'session-cleared') {
            invalidateRepositoryCache();
            suppressAuthBroadcast = true;
            try {
                window.ZentridAuth?.logout?.(false);
            }
            finally {
                queueMicrotask(() => { suppressAuthBroadcast = false; });
            }
            dispatchRemoteAuth(source);
            record(`remote-session-cleared:${source}`);
            return;
        }
        invalidateRepositoryCache();
        dispatchRemoteAuth(source);
        record(`remote-session-updated:${source}`);
    }
    function parseMessage(value) {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (!parsed || typeof parsed !== 'object')
                return null;
            return parsed;
        }
        catch (_error) {
            return null;
        }
    }
    function onAuthChanged() {
        const fingerprint = authFingerprint();
        if (fingerprint === previousAuthFingerprint)
            return;
        const previous = previousAuthFingerprint;
        previousAuthFingerprint = fingerprint;
        invalidateRepositoryCache();
        record(fingerprint === 'signed-out' ? 'session-cleared' : 'session-updated');
        if (!suppressAuthBroadcast)
            publish(message(fingerprint === 'signed-out' ? 'session-cleared' : 'session-updated'));
        if (previous && previous !== fingerprint && fingerprint !== 'signed-out') {
            showBanner('session', 'Session synchronized', 'Authentication state was updated safely across Zentrid tabs.');
        }
    }
    function onDataMutated(event) {
        const detail = event.detail;
        const entities = Array.isArray(detail?.entities) ? detail.entities : [];
        if (!entities.length)
            return;
        publish(message('cache-invalidate', entities));
        record('cache-invalidate-published');
    }
    function onStorage(event) {
        if (event.key === STORAGE_MESSAGE_KEY && event.newValue) {
            const payload = parseMessage(event.newValue);
            if (payload)
                handleMessage(payload, 'storage');
            return;
        }
    }
    function onOffline() {
        record('offline');
        window.FleetAPIRepositories?.coordinator.cancelAll();
        showBanner('offline', 'Zentrid is offline', 'Showing the last successful data where available. Live requests are paused.', true);
    }
    function onOnline() {
        record('online');
        showBanner('restored', 'Connection restored', 'Refreshing the current live section without reloading the page.');
        window.setTimeout(() => window.FleetDataFreshness?.requestRefresh('retry'), 250);
    }
    function onRequestRetry(event) {
        const detail = event.detail || {};
        retriesObserved += 1;
        record('request-retry');
        showBanner('retrying', 'Temporary API issue', `Retrying ${detail.path || 'request'} (${detail.attempt || 1}/${detail.maxAttempts || 1}) after ${detail.reason || 'transient failure'}.`);
    }
    function onRequestSuccess() {
        if (navigator.onLine !== false)
            hideBanner(700);
    }
    function onSessionRefreshed() {
        record('session-refreshed');
        showBanner('session', 'Session renewed', 'Your work can continue without signing in again.');
    }
    function onStorageRecovered(event) {
        const detail = event.detail || {};
        record('storage-recovered');
        showBanner('warning', 'Saved browser data recovered', `${detail.key || 'A stored value'} was invalid and has been reset safely.`);
    }
    function snapshot() {
        return {
            tabId,
            online: navigator.onLine !== false,
            channel: channel ? 'broadcast-channel' : 'storage-fallback',
            retriesObserved,
            lastEvent,
            lastEventAt
        };
    }
    function broadcastInvalidation(entities) {
        const unique = [...new Set(entities)];
        if (!unique.length)
            return;
        invalidateRepositoryCache(unique);
        publish(message('cache-invalidate', unique));
    }
    function dispose() {
        if (disposed)
            return;
        disposed = true;
        if (bannerTimer !== null)
            window.clearTimeout(bannerTimer);
        channel?.close();
    }
    previousAuthFingerprint = authFingerprint();
    channel?.addEventListener('message', event => {
        const payload = parseMessage(event.data);
        if (payload)
            handleMessage(payload, 'broadcast-channel');
    });
    window.addEventListener('zentrid:auth', onAuthChanged);
    window.addEventListener('zentrid:data-mutated', onDataMutated);
    window.addEventListener('zentrid:request-retry', onRequestRetry);
    window.addEventListener('zentrid:request-success', onRequestSuccess);
    window.addEventListener('zentrid:session-refreshed', onSessionRefreshed);
    window.addEventListener('zentrid:storage-recovered', onStorageRecovered);
    window.addEventListener('zentrid:cache-recovered', onStorageRecovered);
    window.addEventListener('storage', onStorage);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', dispose, { once: true });
    if (navigator.onLine === false) {
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', onOffline, { once: true });
        else
            onOffline();
    }
    window.FleetSessionResilience = { snapshot, broadcastInvalidation, dispose };
})();
