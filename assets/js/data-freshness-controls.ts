/* Zentrid data freshness and refresh controls.
   Keeps freshness UX separate from backend contracts and never invents mutations. */
(function () {
  type FleetFreshnessStatus = 'live' | 'cached' | 'refreshing' | 'stale' | 'partial' | 'unavailable';
  type FleetFreshnessResource = 'overview' | 'clients' | 'tenants' | 'plants' | 'devices' | 'alerts' | 'integrations' | 'client-detail' | 'tenant-detail' | 'plant-detail' | 'device-detail' | 'alert-detail' | 'integration-detail' | 'unknown';

  interface FleetFreshnessSyncInput {
    liveState: string;
    title?: string;
    message?: string;
    source?: string;
    details?: string;
    updatedAt?: string;
    cacheAgeMs?: number;
    status?: FleetFreshnessStatus;
    resource?: FleetFreshnessResource;
  }

  interface FleetFreshnessSnapshot {
    resource: FleetFreshnessResource;
    status: FleetFreshnessStatus;
    updatedAt: string | null;
    ageMs: number | null;
    autoRefreshMs: number;
    refreshing: boolean;
    source: string;
    details: string;
    online: boolean;
    visible: boolean;
  }

  interface FleetFreshnessResourceConfig {
    resource: FleetFreshnessResource;
    label: string;
    staleAfterMs: number;
    autoRefreshAllowed: boolean;
  }

  const AUTO_OPTIONS = [0, 30_000, 60_000, 300_000];
  const STORAGE_PREFIX = 'zentrid_data_refresh_interval_v135:';
  const DEFAULT_STALE_AFTER_MS = 60_000;
  const stateByResource = new Map<FleetFreshnessResource, FleetFreshnessSnapshot>();
  let activeResource: FleetFreshnessResource = 'unknown';
  let timerId: number | null = null;
  let tickerId: number | null = null;

  function inferConfig(pathname = location.pathname): FleetFreshnessResourceConfig {
    const page = pathname.split('/').pop() || 'index.html';
    const configs: Record<string, FleetFreshnessResourceConfig> = {
      'index.html': { resource: 'overview', label: 'Overview', staleAfterMs: 60_000, autoRefreshAllowed: true },
      'clients.html': { resource: 'clients', label: 'Clients', staleAfterMs: 60_000, autoRefreshAllowed: true },
      'client-detail.html': { resource: 'client-detail', label: 'Client Detail', staleAfterMs: 120_000, autoRefreshAllowed: true },
      'plants.html': { resource: 'plants', label: 'Plants', staleAfterMs: 45_000, autoRefreshAllowed: true },
      'plant-detail.html': { resource: 'plant-detail', label: 'Plant Detail', staleAfterMs: 60_000, autoRefreshAllowed: true },
      'devices.html': { resource: 'devices', label: 'Devices', staleAfterMs: 45_000, autoRefreshAllowed: true },
      'device-detail.html': { resource: 'device-detail', label: 'Device Detail', staleAfterMs: 60_000, autoRefreshAllowed: true },
      'alerts.html': { resource: 'alerts', label: 'Alerts', staleAfterMs: 30_000, autoRefreshAllowed: true },
      'alert-detail.html': { resource: 'alert-detail', label: 'Alert Detail', staleAfterMs: 45_000, autoRefreshAllowed: true },
      'integrations.html': { resource: 'integrations', label: 'Integration Health', staleAfterMs: 120_000, autoRefreshAllowed: true }
    };
    return configs[page] || { resource: 'unknown', label: 'Current data', staleAfterMs: DEFAULT_STALE_AFTER_MS, autoRefreshAllowed: false };
  }

  function storage(): Storage | null {
    try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; }
    catch (_error) { return null; }
  }

  function normalizedAutoRefresh(value: unknown): number {
    const parsed = Number(value);
    return AUTO_OPTIONS.includes(parsed) ? parsed : 0;
  }

  function autoRefreshFor(resource: FleetFreshnessResource): number {
    const raw = storage()?.getItem(`${STORAGE_PREFIX}${resource}`);
    return normalizedAutoRefresh(raw);
  }

  function storeAutoRefresh(resource: FleetFreshnessResource, intervalMs: number): void {
    const safe = normalizedAutoRefresh(intervalMs);
    try {
      if (safe) storage()?.setItem(`${STORAGE_PREFIX}${resource}`, String(safe));
      else storage()?.removeItem(`${STORAGE_PREFIX}${resource}`);
    } catch (_error) {
      // Storage failure must not block refresh controls.
    }
  }

  function currentSnapshot(resource = activeResource): FleetFreshnessSnapshot {
    const existing = stateByResource.get(resource);
    if (existing) return existing;
    const created: FleetFreshnessSnapshot = {
      resource,
      status: 'refreshing',
      updatedAt: null,
      ageMs: null,
      autoRefreshMs: autoRefreshFor(resource),
      refreshing: false,
      source: '',
      details: '',
      online: navigator.onLine !== false,
      visible: document.visibilityState !== 'hidden'
    };
    stateByResource.set(resource, created);
    return created;
  }

  function parseDate(value?: string): number | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function relativeAge(ageMs: number | null): string {
    if (ageMs === null) return 'Not updated yet';
    if (ageMs < 5_000) return 'Updated just now';
    if (ageMs < 60_000) return `Updated ${Math.max(1, Math.floor(ageMs / 1_000))} sec ago`;
    if (ageMs < 3_600_000) return `Updated ${Math.max(1, Math.floor(ageMs / 60_000))} min ago`;
    return `Updated ${Math.max(1, Math.floor(ageMs / 3_600_000))} hr ago`;
  }

  function statusLabel(status: FleetFreshnessStatus): string {
    const labels: Record<FleetFreshnessStatus, string> = {
      live: 'Live',
      cached: 'Cached',
      refreshing: 'Refreshing',
      stale: 'Stale',
      partial: 'Partial',
      unavailable: 'Unavailable'
    };
    return labels[status];
  }

  function autoLabel(intervalMs: number): string {
    if (!intervalMs) return 'Off';
    if (intervalMs < 60_000) return `${Math.round(intervalMs / 1_000)} sec`;
    return `${Math.round(intervalMs / 60_000)} min`;
  }

  function derivedStatus(input: FleetFreshnessSyncInput, previous: FleetFreshnessSnapshot): FleetFreshnessStatus {
    if (input.status) return input.status;
    const detailText = `${input.message || ''} ${input.details || ''}`.toLowerCase();
    if (input.liveState === 'loading') return 'refreshing';
    if (input.liveState === 'live' || input.liveState === 'empty') {
      if (detailText.includes('cache') || detailText.includes('saved page')) return 'cached';
      return 'live';
    }
    if (input.liveState === 'partial') {
      if (detailText.includes('cache') || detailText.includes('saved page')) return 'cached';
      return 'partial';
    }
    if (input.liveState === 'fallback') return previous.updatedAt ? 'stale' : 'partial';
    if (input.liveState === 'timeout' || input.liveState === 'unavailable' || input.liveState === 'forbidden' || input.liveState === 'unauthorized') {
      return previous.updatedAt ? 'stale' : 'unavailable';
    }
    return previous.status;
  }

  function effectiveStatus(snapshot: FleetFreshnessSnapshot): FleetFreshnessStatus {
    if (!snapshot.online) return snapshot.updatedAt ? 'stale' : 'unavailable';
    if (snapshot.refreshing) return 'refreshing';
    const config = inferConfig();
    const updatedAt = parseDate(snapshot.updatedAt || undefined);
    const ageMs = updatedAt === null ? null : Math.max(0, Date.now() - updatedAt);
    if ((snapshot.status === 'live' || snapshot.status === 'cached') && ageMs !== null && ageMs > config.staleAfterMs) return 'stale';
    return snapshot.status;
  }

  function setBannerState(status: FleetFreshnessStatus): void {
    const banner = document.querySelector<HTMLElement>('.live-data-state');
    if (!banner) return;
    banner.dataset.freshnessStatus = status;
  }

  function controlsRoot(): HTMLElement | null {
    const banner = document.querySelector<HTMLElement>('.live-data-state');
    if (!banner) return null;
    let root = banner.querySelector<HTMLElement>('.fleet-freshness-controls');
    if (!root) {
      root = document.createElement('div');
      root.className = 'fleet-freshness-controls';
      root.dataset.fleetFreshnessControls = 'true';
      banner.append(root);
    }
    return root;
  }

  function render(): void {
    const config = inferConfig();
    activeResource = config.resource;
    const snapshot = currentSnapshot(activeResource);
    snapshot.online = navigator.onLine !== false;
    snapshot.visible = document.visibilityState !== 'hidden';
    const updatedTimestamp = parseDate(snapshot.updatedAt || undefined);
    snapshot.ageMs = updatedTimestamp === null ? null : Math.max(0, Date.now() - updatedTimestamp);
    const status = effectiveStatus(snapshot);
    setBannerState(status);
    const root = controlsRoot();
    if (!root) return;

    const retryVisible = status === 'partial' || status === 'stale' || status === 'unavailable';
    const autoOptions = AUTO_OPTIONS.map(interval => `<option value="${interval}" ${interval === snapshot.autoRefreshMs ? 'selected' : ''}>${autoLabel(interval)}</option>`).join('');
    root.innerHTML = `
      <div class="fleet-freshness-summary">
        <span class="fleet-freshness-badge ${status}" data-freshness-badge>${statusLabel(status)}</span>
        <small data-freshness-age>${relativeAge(snapshot.ageMs)}</small>
        ${!snapshot.online ? '<small class="fleet-freshness-note">Offline · refresh paused</small>' : ''}
        ${!snapshot.visible && snapshot.autoRefreshMs ? '<small class="fleet-freshness-note">Hidden tab · auto refresh paused</small>' : ''}
      </div>
      <div class="fleet-freshness-actions">
        <button type="button" class="secondary-btn compact" data-freshness-refresh ${snapshot.refreshing || !snapshot.online ? 'disabled' : ''}>${snapshot.refreshing ? 'Refreshing…' : 'Refresh'}</button>
        ${retryVisible ? `<button type="button" class="secondary-btn compact" data-freshness-retry ${snapshot.refreshing || !snapshot.online ? 'disabled' : ''}>Retry failed section</button>` : ''}
        ${config.autoRefreshAllowed ? `<label class="fleet-auto-refresh"><span>Auto refresh</span><select data-freshness-auto aria-label="Auto refresh interval">${autoOptions}</select></label>` : ''}
      </div>`;
    scheduleAutoRefresh();
  }

  function requestRefresh(reason: 'manual' | 'retry' | 'auto'): void {
    const snapshot = currentSnapshot();
    if (snapshot.refreshing || navigator.onLine === false) return;
    snapshot.refreshing = true;
    snapshot.status = 'refreshing';
    stateByResource.set(snapshot.resource, snapshot);
    render();
    window.dispatchEvent(new CustomEvent('zentrid:data-refresh-request', {
      detail: { resource: snapshot.resource, reason, forceRefresh: true }
    }));
  }

  function clearTimer(): void {
    if (timerId !== null) window.clearTimeout(timerId);
    timerId = null;
  }

  function scheduleAutoRefresh(): void {
    clearTimer();
    const snapshot = currentSnapshot();
    if (!snapshot.autoRefreshMs || snapshot.refreshing || navigator.onLine === false || document.visibilityState === 'hidden') return;
    timerId = window.setTimeout(() => requestRefresh('auto'), snapshot.autoRefreshMs);
  }

  function sync(input: FleetFreshnessSyncInput): FleetFreshnessSnapshot {
    const config = inferConfig();
    activeResource = input.resource || config.resource;
    const previous = currentSnapshot(activeResource);
    const status = derivedStatus(input, previous);
    const explicitUpdatedAt = parseDate(input.updatedAt);
    const cacheUpdatedAt = Number.isFinite(input.cacheAgeMs) ? Date.now() - Math.max(0, Number(input.cacheAgeMs)) : null;
    const successfulVisibleState = input.liveState === 'live' || input.liveState === 'partial' || input.liveState === 'empty' || input.liveState === 'fallback';
    const updatedAt = explicitUpdatedAt ?? cacheUpdatedAt ?? (successfulVisibleState && status !== 'stale' && status !== 'unavailable' ? Date.now() : parseDate(previous.updatedAt || undefined));
    const next: FleetFreshnessSnapshot = {
      ...previous,
      resource: activeResource,
      status,
      updatedAt: updatedAt === null ? previous.updatedAt : new Date(updatedAt).toISOString(),
      ageMs: updatedAt === null ? previous.ageMs : Math.max(0, Date.now() - updatedAt),
      autoRefreshMs: autoRefreshFor(activeResource),
      refreshing: input.liveState === 'loading',
      source: input.source || previous.source,
      details: input.details || previous.details,
      online: navigator.onLine !== false,
      visible: document.visibilityState !== 'hidden'
    };
    stateByResource.set(activeResource, next);
    render();
    return { ...next };
  }

  function markRefreshComplete(success = true): void {
    const snapshot = currentSnapshot();
    snapshot.refreshing = false;
    if (!success && snapshot.status === 'refreshing') snapshot.status = snapshot.updatedAt ? 'stale' : 'unavailable';
    stateByResource.set(snapshot.resource, snapshot);
    render();
  }

  function setAutoRefresh(intervalMs: number): void {
    const snapshot = currentSnapshot();
    snapshot.autoRefreshMs = normalizedAutoRefresh(intervalMs);
    storeAutoRefresh(snapshot.resource, snapshot.autoRefreshMs);
    stateByResource.set(snapshot.resource, snapshot);
    render();
  }

  function snapshot(resource?: FleetFreshnessResource): FleetFreshnessSnapshot {
    const value = currentSnapshot(resource || activeResource);
    const updated = { ...value };
    const timestamp = parseDate(updated.updatedAt || undefined);
    updated.ageMs = timestamp === null ? null : Math.max(0, Date.now() - timestamp);
    updated.status = effectiveStatus(updated);
    return updated;
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-freshness-refresh]')) requestRefresh('manual');
    if (target?.closest('[data-freshness-retry]')) requestRefresh('retry');
  });

  document.addEventListener('change', event => {
    const target = event.target instanceof HTMLSelectElement ? event.target : null;
    if (target && typeof target.matches === 'function' && target.matches('[data-freshness-auto]')) setAutoRefresh(Number(target.value));
  });

  window.addEventListener('online', () => { render(); scheduleAutoRefresh(); });
  window.addEventListener('offline', () => { clearTimer(); render(); });
  document.addEventListener('visibilitychange', () => { render(); scheduleAutoRefresh(); });
  window.addEventListener('pagehide', () => {
    clearTimer();
    if (tickerId !== null) window.clearInterval(tickerId);
    tickerId = null;
  }, { once: true });

  tickerId = window.setInterval(render, 15_000);

  const api = {
    sync,
    markRefreshComplete,
    requestRefresh,
    setAutoRefresh,
    snapshot,
    inferResource(): FleetFreshnessResource { return inferConfig().resource; },
    intervals: AUTO_OPTIONS.slice()
  };
  window.FleetDataFreshness = api;
})();
