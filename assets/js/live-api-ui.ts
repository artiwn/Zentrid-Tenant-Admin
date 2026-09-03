/* Zentrid live API UI bridge
   Uses working Swagger endpoints as the source of truth for API-driven screens.
   Tenant Overview never falls back to prototype business records. */
(function () {
  const SOURCE_LABEL = 'Live API';
  const SLOW_ENDPOINT_TIMEOUT_MS = 15_000;
  const LIVE_LOADING_WATCHDOG_MS = 18_000;
  let liveLoadingWatchdog: number | null = null;

  type AnyRecord = Record<string, FleetLegacyCompat>;


  type LiveDataState = 'loading' | 'live' | 'partial' | 'empty' | 'timeout' | 'unauthorized' | 'forbidden' | 'unavailable' | 'fallback';

  type LiveDataStateOptions = {
    title?: string;
    source?: string;
    details?: string;
    dataOrigin?: FleetDataOrigin;
    recordCount?: number;
    freshnessStatus?: FleetFreshnessStatus;
    freshnessUpdatedAt?: string;
    freshnessCacheAgeMs?: number;
  };

  type RequestErrorShape = {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    path?: unknown;
  };

  type LiveSummaryItem = { label: unknown; value: unknown; meta?: unknown };

  type LiveSnapshotPayload = {
    plants?: AnyRecord[];
    devices?: AnyRecord[];
    alerts?: AnyRecord[];
    integrations?: AnyRecord[];
    providers?: unknown[];
    templates?: unknown[];
    plantTotalCount?: number | null;
    deviceTotalCount?: number | null;
    alertTotalCount?: number | null;
    integrationTotalCount?: number | null;
  };

  type RegistryEntity = 'clients' | 'plants' | 'devices' | 'alerts';
  const registryRequestVersions = new Map<RegistryEntity, number>();

  function isRegistryPage(entity: RegistryEntity): boolean {
    return location.pathname.endsWith(`/${entity}.html`) || location.pathname.endsWith(`${entity}.html`);
  }

  function registryReadOptions(entity: RegistryEntity, forceRefresh = false): FleetRepositoryReadOptions {
    const state = window.FleetRegistryQuery?.read(entity);
    const newestFirst = entity === 'clients' || entity === 'plants';
    const plantFilters = entity === 'plants' ? {
      search: state?.search || '',
      status: state?.params?.plantStatus || '',
      vendor: state?.params?.plantVendor || ''
    } : {};
    const deviceFilters = entity === 'devices' ? {
      search: state?.search || '',
      deviceType: state?.params?.deviceType || '',
      deviceStatus: state?.params?.deviceStatus || '',
      plantId: state?.params?.plantId || localStorage.getItem('zentrid_device_filter_plant') || ''
    } : {};
    let alertContext: Record<string, string> = {};
    if (entity === 'alerts') {
      try {
        const stored = JSON.parse(localStorage.getItem('zentrid_alert_context') || '{}') as Record<string, unknown>;
        alertContext = Object.fromEntries(Object.entries(stored)
          .filter(([, value]) => typeof value === 'string' && value.trim())
          .map(([key, value]) => [key, String(value).trim()]));
      } catch {
        alertContext = {};
      }
    }
    const rawAlertVendor = state?.params?.vendor || '';
    const normalizedAlertVendor = (() => {
      const value = String(rawAlertVendor || '').trim();
      const key = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key === 'solax') return 'solarx';
      if (key === 'deye' || key === 'deyecloud') return 'deyecloud';
      if (key === 'sungrow') return 'sungrow';
      if (key === 'huawei') return 'huawei';
      return value;
    })();
    const alertFilters = entity === 'alerts' ? {
      search: state?.search || '',
      severity: state?.params?.severity || alertContext.severity || '',
      alertStatus: state?.params?.alertStatus || alertContext.status || '',
      tenant: state?.params?.tenant || alertContext.tenant || '',
      plant: state?.params?.plant || '',
      vendor: normalizedAlertVendor,
      plantId: state?.params?.plantId || alertContext.plantId || '',
      deviceId: state?.params?.deviceId || alertContext.deviceId || '',
      tenantId: state?.params?.tenantId || ''
    } : {};
    return {
      page: state?.page || 1,
      pageSize: state?.pageSize || 50,
      ...plantFilters,
      ...deviceFilters,
      ...alertFilters,
      ...(newestFirst ? {
        sortBy: state?.sortBy || 'createdAtUtc',
        sortDirection: state?.sortDirection || 'desc'
      } : {}),
      staleWhileRevalidate: true,
      persist: true,
      requestGroup: `registry:${entity}`,
      supersede: true,
      forceRefresh,
      ...(entity === 'plants' ? { cacheVariant: 'admin-registry' } : {})
    };
  }

  function detailReadOptions(entity: string, pageSize = 100, forceRefresh = false): FleetRepositoryReadOptions {
    return {
      page: 1,
      pageSize,
      staleWhileRevalidate: true,
      persist: true,
      requestGroup: `detail:${entity}`,
      supersede: true,
      forceRefresh,
      ...(entity === 'plants' ? { cacheVariant: 'admin-registry' } : {})
    };
  }

  function cacheAgeLabel(ageMs: number): string {
    if (ageMs < 1_000) return 'just now';
    if (ageMs < 60_000) return `${Math.max(1, Math.round(ageMs / 1_000))} sec ago`;
    return `${Math.max(1, Math.round(ageMs / 60_000))} min ago`;
  }

  function repositoryCachePresentation(result: FleetRepositoryListResult): {
    state: LiveDataState;
    prefix: string;
    details: string;
    freshnessStatus: FleetFreshnessStatus;
    updatedAt?: string;
    ageMs?: number;
  } {
    const cache = result.cache;
    if (!cache) return { state: 'live', prefix: '', details: '', freshnessStatus: 'live' };
    if (cache.state === 'stale' || cache.state === 'persistent' || cache.fallback) {
      const source = cache.state === 'persistent' ? 'Saved page' : 'Cached page';
      const action = cache.revalidating ? 'refreshing in background' : cache.fallback ? 'live refresh failed' : 'shown from cache';
      return {
        state: 'partial',
        prefix: `${source} from ${cacheAgeLabel(cache.ageMs)} is visible; ${action}. `,
        details: `${cache.state} cache · ${cacheAgeLabel(cache.ageMs)}`,
        freshnessStatus: cache.fallback ? 'stale' : 'cached',
        updatedAt: cache.updatedAt,
        ageMs: cache.ageMs
      };
    }
    if (cache.state === 'fresh') {
      return { state: 'live', prefix: '', details: `Memory cache · ${cacheAgeLabel(cache.ageMs)}`, freshnessStatus: 'cached', updatedAt: cache.updatedAt, ageMs: cache.ageMs };
    }
    return { state: 'live', prefix: '', details: 'Live network response', freshnessStatus: 'live', updatedAt: cache.updatedAt, ageMs: cache.ageMs };
  }


  function cacheFreshnessOptions(cacheInfo: ReturnType<typeof repositoryCachePresentation>): Pick<LiveDataStateOptions, 'freshnessStatus' | 'freshnessUpdatedAt' | 'freshnessCacheAgeMs'> {
    return {
      freshnessStatus: cacheInfo.freshnessStatus,
      ...(cacheInfo.updatedAt ? { freshnessUpdatedAt: cacheInfo.updatedAt } : {}),
      ...(Number.isFinite(cacheInfo.ageMs) ? { freshnessCacheAgeMs: cacheInfo.ageMs } : {})
    };
  }

  function publishRegistryPagination(entity: RegistryEntity, result: FleetRepositoryListResult): void {
    const fallbackCount = Array.isArray(result.items) ? result.items.length : 0;
    const pagination = result.pagination || {
      page: 1,
      pageSize: Math.max(1, fallbackCount || 50),
      totalCount: fallbackCount,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    };
    (result as FleetRepositoryListResult & { pagination: FleetRepositoryPagination }).pagination = pagination;
    window.FleetRegistryQuery?.setPagination(entity, {
      ...pagination,
      server: true,
      source: result.source
    });
  }

  function beginRegistryRequest(entity: RegistryEntity): number {
    const next = (registryRequestVersions.get(entity) || 0) + 1;
    registryRequestVersions.set(entity, next);
    return next;
  }

  function isCurrentRegistryRequest(entity: RegistryEntity, version: number): boolean {
    return registryRequestVersions.get(entity) === version;
  }

  function contractDiagnosticsApi(): FleetContractDiagnosticsApi | null {
    return typeof FleetAPIContracts === 'undefined' ? null : FleetAPIContracts.diagnostics;
  }

  contractDiagnosticsApi()?.clear();

  function asArray(value: unknown): AnyRecord[] {
    if (Array.isArray(value)) return value as AnyRecord[];
    if (!value || typeof value !== 'object') return [];
    const payload = value as AnyRecord;
    const keys = ['items', 'data', 'records', 'rows', 'results', 'content', 'value', 'values'];
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key] as AnyRecord[];
    }
    if (payload.data && typeof payload.data === 'object') {
      const nested = asArray(payload.data);
      if (nested.length) return nested;
    }
    if (payload.result && typeof payload.result === 'object') {
      const nested = asArray(payload.result);
      if (nested.length) return nested;
    }
    return [];
  }

  function safeText(value: unknown, fallback: unknown = '—'): string {
    return value === undefined || value === null || value === '' ? String(fallback) : String(value);
  }

  function requestErrorShape(error: unknown): RequestErrorShape {
    if (error instanceof Error) {
      const enriched = error as Error & RequestErrorShape;
      return { message: enriched.message, status: enriched.status, code: enriched.code, path: enriched.path };
    }
    if (error && typeof error === 'object') return error as RequestErrorShape;
    return { message: String(error || 'Unknown request error') };
  }

  function liveErrorMessage(error: unknown): string {
    const shaped = requestErrorShape(error);
    return String(shaped.message || 'Request failed.');
  }

  function liveErrorState(error: unknown): LiveDataState {
    const shaped = requestErrorShape(error);
    const status = Number(shaped.status || 0);
    const code = String(shaped.code || '').toUpperCase();
    if (code === 'TIMEOUT') return 'timeout';
    if (status === 401 || code === 'SESSION_EXPIRED' || code === 'NO_REFRESH_TOKEN') return 'unauthorized';
    if (status === 403) return 'forbidden';
    return 'unavailable';
  }

  const LIVE_STATE_TITLES: Record<LiveDataState, string> = {
    loading: 'Loading live data',
    live: 'Live data connected',
    partial: 'Partial live data',
    empty: 'No live records',
    timeout: 'Live API timed out',
    unauthorized: 'Session expired',
    forbidden: 'Access denied',
    unavailable: 'Backend unavailable',
    fallback: 'Mock fallback active'
  };

  const LIVE_STATE_ICONS: Record<LiveDataState, string> = {
    loading: '↻',
    live: '✓',
    partial: '◐',
    empty: '∅',
    timeout: '◷',
    unauthorized: '⌁',
    forbidden: '×',
    unavailable: '!',
    fallback: '↺'
  };

  const DATA_SOURCE_MESSAGES: Record<FleetDataOrigin, string> = {
    live: 'Displayed records come from live backend responses.',
    mock: 'Displayed records are prototype fallback data.',
    local: 'Displayed records were created or changed in this browser.',
    mixed: 'The current page combines records from more than one source.'
  };

  function renderedDataOrigin(): FleetDataOrigin {
    const chips = Array.from(document.querySelectorAll<HTMLElement>('.record-origin-chip[data-record-origin]'))
      .filter(chip => !chip.closest('.data-source-summary'));
    const origins = new Set<FleetDataOrigin>();
    for (const chip of chips) {
      const origin = chip.dataset.recordOrigin;
      if (origin === 'live' || origin === 'mock' || origin === 'local' || origin === 'mixed') origins.add(origin);
    }
    if (origins.size > 1) return 'mixed';
    return origins.values().next().value || 'mock';
  }

  function removeDataSourceSummary(): void {
    document.querySelector('.data-source-summary')?.remove();
  }

  function setDataSourceSummary(origin: FleetDataOrigin, options: LiveDataStateOptions = {}): void {
    const main = document.querySelector('.main-content');
    if (!main || !window.FleetDataSource) return;

    let summary = main.querySelector<HTMLElement>('.data-source-summary');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'data-source-summary';
      const stateBanner = main.querySelector('.live-data-state');
      if (stateBanner) stateBanner.insertAdjacentElement('afterend', summary);
      else {
        const hero = main.querySelector('.page-hero');
        if (hero) hero.insertAdjacentElement('afterend', summary);
        else main.prepend(summary);
      }
    }

    summary.className = `data-source-summary ${origin}`;
    summary.dataset.dataOrigin = origin;
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-label', `Displayed data source: ${FleetDataSource.label(origin)}`);
    summary.replaceChildren();

    const primary = document.createElement('div');
    primary.className = 'data-source-summary-primary';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'data-source-summary-label';
    eyebrow.textContent = 'Displayed data';
    const chip = document.createElement('span');
    chip.className = `record-origin-chip ${origin}`;
    chip.dataset.recordOrigin = origin;
    chip.textContent = FleetDataSource.label(origin);
    const description = document.createElement('small');
    description.textContent = DATA_SOURCE_MESSAGES[origin];
    primary.append(eyebrow, chip, description);

    const meta = document.createElement('div');
    meta.className = 'data-source-summary-meta';
    const metaParts = [
      options.recordCount !== undefined ? `${options.recordCount} record(s)` : '',
      options.source || '',
      options.details || ''
    ].filter(Boolean);
    meta.textContent = metaParts.join(' · ') || 'Source is identified per visible record.';

    const legend = document.createElement('div');
    legend.className = 'data-source-legend';
    (['live', 'mock', 'local', 'mixed'] as FleetDataOrigin[]).forEach(value => {
      const item = document.createElement('span');
      item.className = `record-origin-chip ${value} compact`;
      item.dataset.recordOrigin = value;
      item.textContent = FleetDataSource.label(value);
      legend.append(item);
    });

    summary.append(primary, meta, legend);
  }

  function removeContractDiagnostics(): void {
    document.querySelector('.contract-diagnostics')?.remove();
  }

  function contractIssueTitle(issue: FleetContractIssue): string {
    return `${issue.entityLabel} #${issue.index + 1} · ${issue.field}`;
  }

  function syncContractDiagnostics(state: LiveDataState): void {
    if (state === 'loading') {
      contractDiagnosticsApi()?.clear();
      removeContractDiagnostics();
      return;
    }
    if (state !== 'live' && state !== 'partial') {
      removeContractDiagnostics();
      return;
    }

    const diagnostics = contractDiagnosticsApi();
    if (!diagnostics) {
      removeContractDiagnostics();
      return;
    }
    const issues = diagnostics.list();
    if (!issues.length) {
      removeContractDiagnostics();
      return;
    }

    const main = document.querySelector('.main-content');
    if (!main) return;
    const summary = diagnostics.summary();
    let panel = main.querySelector<HTMLElement>('.contract-diagnostics');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'contract-diagnostics';
      const sourceSummary = main.querySelector('.data-source-summary');
      const stateBanner = main.querySelector('.live-data-state');
      if (sourceSummary) sourceSummary.insertAdjacentElement('afterend', panel);
      else if (stateBanner) stateBanner.insertAdjacentElement('afterend', panel);
      else main.prepend(panel);
    }

    panel.className = `contract-diagnostics ${summary.errors ? 'error' : 'warning'}`;
    panel.dataset.contractIssueCount = String(summary.total);
    panel.setAttribute('role', summary.errors ? 'alert' : 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'contract-diagnostics-heading';
    const icon = document.createElement('span');
    icon.className = 'contract-diagnostics-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = summary.errors ? '!' : '△';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = summary.errors ? 'API contract mismatch' : 'API contract warning';
    const description = document.createElement('span');
    const entityCount = summary.affectedEntities.length;
    description.textContent = `${summary.errors} required-field error(s) and ${summary.warnings} warning(s) across ${entityCount} entity type(s). Zentrid applied safe fallback values and preserved each raw payload.`;
    copy.append(title, description);
    heading.append(icon, copy);

    const details = document.createElement('details');
    details.className = 'contract-diagnostics-details';
    const detailsSummary = document.createElement('summary');
    detailsSummary.textContent = `Review ${summary.total} contract issue(s)`;
    const list = document.createElement('div');
    list.className = 'contract-diagnostics-list';
    const visibleIssues = issues.slice(0, 12);
    visibleIssues.forEach(issue => {
      const item = document.createElement('div');
      item.className = issue.severity;
      const label = document.createElement('strong');
      label.textContent = contractIssueTitle(issue);
      const message = document.createElement('span');
      message.textContent = issue.message;
      item.append(label, message);
      list.append(item);
    });
    if (issues.length > visibleIssues.length) {
      const remaining = document.createElement('div');
      remaining.className = 'more';
      remaining.textContent = `${issues.length - visibleIssues.length} additional issue(s) are available through FleetAPIContracts.diagnostics.list().`;
      list.append(remaining);
    }
    details.append(detailsSummary, list);
    panel.append(heading, details);
  }

  function syncDataSourceForState(state: LiveDataState, options: LiveDataStateOptions): void {
    if (state === 'loading') {
      removeDataSourceSummary();
      return;
    }
    const origin = options.dataOrigin
      || (state === 'live' ? 'live' : state === 'partial' ? 'mixed' : renderedDataOrigin());
    setDataSourceSummary(origin, options);
  }

  function setLiveDataState(state: LiveDataState, message: string, options: LiveDataStateOptions = {}): void {
    const main = document.querySelector('.main-content');
    if (!main) return;

    if (liveLoadingWatchdog !== null) {
      window.clearTimeout(liveLoadingWatchdog);
      liveLoadingWatchdog = null;
    }
    if (state === 'loading') {
      liveLoadingWatchdog = window.setTimeout(() => {
        liveLoadingWatchdog = null;
        const current = document.querySelector<HTMLElement>('.live-data-state[data-live-state="loading"]');
        if (!current) return;
        setLiveDataState('timeout', 'The live request took too long. The page remains available with its local or cached data.', {
          source: options.source || 'Live API',
          details: 'Loading watchdog · fallback content preserved'
        });
      }, LIVE_LOADING_WATCHDOG_MS);
    }

    let banner = main.querySelector<HTMLElement>('.live-data-state');
    if (!banner) {
      banner = document.createElement('section');
      banner.className = 'live-data-state';
      const hero = main.querySelector('.page-hero');
      if (hero) hero.insertAdjacentElement('afterend', banner);
      else main.prepend(banner);
    }

    banner.className = `live-data-state ${state}`;
    banner.dataset.liveState = state;
    banner.setAttribute('role', ['timeout', 'unauthorized', 'forbidden', 'unavailable'].includes(state) ? 'alert' : 'status');
    banner.setAttribute('aria-live', state === 'loading' ? 'polite' : 'assertive');
    banner.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    banner.replaceChildren();

    const icon = document.createElement('span');
    icon.className = 'live-data-state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = LIVE_STATE_ICONS[state];

    const content = document.createElement('div');
    content.className = 'live-data-state-content';
    const title = document.createElement('strong');
    title.textContent = options.title || LIVE_STATE_TITLES[state];
    const body = document.createElement('span');
    body.textContent = message;
    content.append(title, body);

    const metaParts = [options.source, options.details].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement('small');
      meta.className = 'live-data-state-meta';
      meta.textContent = metaParts.join(' · ');
      content.append(meta);
    }

    banner.append(icon, content);
    window.FleetDataFreshness?.sync({
      liveState: state,
      message,
      ...(options.title ? { title: options.title } : {}),
      ...(options.source ? { source: options.source } : {}),
      ...(options.details ? { details: options.details } : {}),
      ...(options.freshnessStatus ? { status: options.freshnessStatus } : {}),
      ...(options.freshnessUpdatedAt ? { updatedAt: options.freshnessUpdatedAt } : {}),
      ...(Number.isFinite(options.freshnessCacheAgeMs) ? { cacheAgeMs: options.freshnessCacheAgeMs } : {})
    } as FleetFreshnessSyncInput);
    syncDataSourceForState(state, options);
    syncContractDiagnostics(state);
  }

  function setRequestFailure(endpoint: string, error: unknown, fallbackMessage: string): void {
    const state = liveErrorState(error);
    const shaped = requestErrorShape(error);
    const messages: Record<'timeout' | 'unauthorized' | 'forbidden' | 'unavailable', string> = {
      timeout: `${endpoint} did not respond within the configured timeout. ${fallbackMessage}`,
      unauthorized: `Your session is no longer valid. Zentrid will return to the sign-in page.`,
      forbidden: `The current account is not allowed to read ${endpoint}. ${fallbackMessage}`,
      unavailable: `${endpoint} could not be reached or returned an error. ${fallbackMessage}`
    };
    const normalized = state === 'timeout' || state === 'unauthorized' || state === 'forbidden' ? state : 'unavailable';
    const status = Number(shaped.status || 0);
    const code = String(shaped.code || 'REQUEST_FAILED');
    const detail = status ? `${code} · HTTP ${status}` : code;
    setLiveDataState(normalized, messages[normalized], {
      source: endpoint,
      details: `${detail} · ${liveErrorMessage(error)}`
    });
  }

  function fmtDate(value: unknown, fallback: string = 'No data'): string {
    if (!value) return fallback;
    try {
      const date = new Date(value as string | number | Date);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(value);
    }
  }

  function badge(status: unknown): string {
    const value = String(status || '').toLowerCase();
    if (value.includes('ok') || value.includes('active') || value.includes('online') || value.includes('normal')) return 'success';
    if (value.includes('fail') || value.includes('fault') || value.includes('offline') || value.includes('critical')) return 'danger';
    if (value.includes('warn') || value.includes('unknown') || value.includes('stale') || value.includes('delayed')) return 'warning';
    return 'neutral';
  }

  function insertIntegrationLiveSummary(items: LiveSummaryItem[] = []): void {
    const main = document.querySelector('.main-content');
    if (!main) return;
    const rows = items.map(item => `
      <article>
        <span>${safeText(item.label, 'Endpoint')}</span>
        <strong>${safeText(item.value, '—')}</strong>
        <small>${safeText(item.meta, '')}</small>
      </article>`).join('');
    let section = document.querySelector<HTMLElement>('.integration-live-summary');
    if (!section) {
      section = document.createElement('section');
      section.className = 'integration-live-summary glass-card';
      const context = main.querySelector('.context-bar');
      if (context && context.nextSibling) main.insertBefore(section, context.nextSibling);
      else main.appendChild(section);
    }
    section.innerHTML = `
      <div>
        <p class="eyebrow">Backend live source</p>
        <h3>Connected API snapshot</h3>
      </div>
      <div class="integration-live-summary-grid">${rows}</div>`;
  }

  function sum(values: unknown[]): number {
    return values.reduce<number>((acc, value) => acc + Number(value || 0), 0);
  }

  function compactNumber(value: unknown, suffix: string = ''): string {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return `0${suffix}`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k${suffix}`;
    return `${n}${suffix}`;
  }

  function knownCollectionTotal(totalCount: number | null | undefined, rows: unknown[]): number | null {
    if (typeof totalCount !== 'number' || !Number.isFinite(totalCount) || totalCount < 0) return null;
    return Math.max(totalCount, rows.length);
  }

  function overviewCoverageLabel(loaded: number, totalCount: number | null, noun: string): string {
    if (totalCount === null) return `${loaded} ${noun} row(s) loaded`;
    if (loaded >= totalCount) return `All ${compactNumber(totalCount)} ${noun} row(s) loaded`;
    return `Page sample · ${loaded} of ${compactNumber(totalCount)} ${noun}`;
  }

  function uniqueOverviewStrings(values: unknown[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    values.forEach(value => {
      const text = safeText(value, '').trim();
      const key = text.toLowerCase();
      if (!key || key === '—' || seen.has(key)) return;
      seen.add(key);
      output.push(text);
    });
    return output;
  }

  function overviewProviderNames(providers: unknown[], integrations: AnyRecord[]): string[] {
    const providerRows = providers.map(value => {
      if (!value || typeof value !== 'object') return value;
      return firstOf(value as AnyRecord, ['displayName', 'providerName', 'provider', 'name', 'vendor', 'providerType'], '');
    });
    const integrationRows = integrations.map(row => firstOf(row, ['displayName', 'name', 'provider', 'vendor', 'providerType'], ''));
    return uniqueOverviewStrings(providerRows.length ? providerRows : integrationRows);
  }

  function overviewStatusBucket(value: unknown): string {
    const status = safeText(value, 'Unknown').trim().toLowerCase();
    if (/offline|disconnected|inactive|unavailable/.test(status)) return 'Offline';
    if (/critical|fault|failed|failure|error/.test(status)) return 'Fault';
    if (/warning|warn|delayed|stale|degraded|attention/.test(status)) return 'Warning';
    if (/normal|healthy|active|online|ok|operational|available/.test(status)) return 'Normal';
    return 'Unknown';
  }

  function overviewFleetHealth(plants: AnyRecord[]): Array<{ label: string; count: number; percent: number }> {
    if (!plants.length) return [];
    const counts = new Map<string, number>();
    plants.forEach(row => {
      const status = firstOf(row, ['status', 'recordStatus', 'dataQualityStatus', 'adminRecord.recordStatus', 'vendorExtensions.status'], 'Unknown');
      const bucket = overviewStatusBucket(status);
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    });
    const order = ['Normal', 'Warning', 'Fault', 'Offline', 'Unknown'];
    return order.filter(label => counts.has(label)).map(label => {
      const count = counts.get(label) || 0;
      return { label, count, percent: Math.round((count / plants.length) * 100) };
    });
  }

  function snapshotFromLive({
    plants = [], devices = [], alerts = [], integrations = [], providers = [], templates = [],
    plantTotalCount = null, deviceTotalCount = null, alertTotalCount = null, integrationTotalCount = null
  }: LiveSnapshotPayload) {
    const knownPlantTotal = knownCollectionTotal(plantTotalCount, plants);
    const knownDeviceTotal = knownCollectionTotal(deviceTotalCount, devices);
    const knownAlertTotal = knownCollectionTotal(alertTotalCount, alerts);
    const knownIntegrationTotal = knownCollectionTotal(integrationTotalCount, integrations);
    const plantCount = knownPlantTotal ?? (plants.length || sum(integrations.map(row => row.plantsCount || row.plants)));
    const deviceCount = knownDeviceTotal ?? (devices.length || sum(integrations.map(row => row.devicesCount || row.devices)));
    const alertCount = knownAlertTotal ?? (alerts.length || sum(integrations.map(row => row.alertsCount || row.alerts)));
    const currentPowerValues = plants.map(row => firstOf(row, ['currentPowerKw', 'raw.currentPowerKw', 'liveRecord.currentPowerKw'], 0));
    const currentPowerAvailable = plants.some(row => firstOf(row, ['currentPowerKw', 'raw.currentPowerKw', 'liveRecord.currentPowerKw'], null) !== null);
    const currentPowerKw = sum(currentPowerValues);
    const providerNames = overviewProviderNames(providers, integrations);
    const staleValues = integrations.map(row => firstOf(row, ['stalePlantsCount', 'stalePlants', 'liveSummary.raw.stalePlantsCount'], null));
    const staleAvailable = staleValues.some(value => value !== null && value !== undefined && value !== '');
    const staleCount = sum(staleValues);
    const errorValues = integrations
      .map(row => firstOf(row, ['errorRatePct', 'errorRate', 'liveSummary.raw.errorRatePct'], null))
      .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)));
    const errorRate = errorValues.length ? sum(errorValues) / errorValues.length : 0;
    return {
      plantCount,
      deviceCount,
      alertCount,
      currentPowerKw,
      currentPowerAvailable,
      providerNames,
      staleCount,
      staleAvailable,
      errorRate,
      errorRateAvailable: errorValues.length > 0,
      integrationCount: knownIntegrationTotal ?? integrations.length,
      templateCount: templates.length,
      plantTotalCount: knownPlantTotal,
      deviceTotalCount: knownDeviceTotal,
      alertTotalCount: knownAlertTotal,
      integrationTotalCount: knownIntegrationTotal
    };
  }

  function clearOverviewData(): void {
    const store = window.TenantOverviewData;
    if (!store) return;
    store.kpis = [];
    store.fleetHealth = [];
    store.alerts = [];
    store.integrations = [];
    store.quality = [];
    store.plants = [];
  }

  function applyOverviewDataFromLive(payload: Required<LiveSnapshotPayload>): void {
    const store = window.TenantOverviewData;
    if (!store) return;
    const snap = snapshotFromLive(payload);
    const currentPowerText = snap.currentPowerAvailable ? `${compactNumber(snap.currentPowerKw)} kW` : '—';

    store.kpis = [
      { label: 'Live Providers', value: String(snap.providerNames.length || snap.integrationCount), delta: snap.providerNames.join(', ') || 'No provider names returned', icon: '🔗', tone: 'cyan', route: 'integrations' },
      { label: 'Plants', value: compactNumber(snap.plantCount), delta: overviewCoverageLabel(payload.plants.length, snap.plantTotalCount, 'plant'), icon: '🏭', tone: 'green', route: 'plants' },
      { label: 'Devices', value: compactNumber(snap.deviceCount), delta: overviewCoverageLabel(payload.devices.length, snap.deviceTotalCount, 'device'), icon: '🔌', tone: 'blue', route: 'devices' },
      { label: 'Live Power', value: currentPowerText, delta: payload.plants.length ? `Current API page · ${payload.plants.length} plant row(s)` : 'No plant power rows returned', icon: '⚡', tone: 'yellow', route: 'telemetry' },
      { label: 'Alerts', value: compactNumber(snap.alertCount), delta: overviewCoverageLabel(payload.alerts.length, snap.alertTotalCount, 'alert'), icon: '🚨', tone: 'red', route: 'alerts' },
      { label: 'Templates', value: compactNumber(snap.templateCount), delta: 'Provider integration templates returned by API', icon: '🧩', tone: 'violet', route: 'integrations' }
    ];

    store.fleetHealth = overviewFleetHealth(payload.plants);

    store.integrations = payload.integrations.slice(0, 6).map(row => ({
      name: safeText(firstOf(row, ['displayName', 'name', 'integrationName', 'provider', 'vendor'], '—'), '—'),
      status: safeText(firstOf(row, ['operationalStatus', 'status', 'health'], '—'), '—'),
      sync: safeText(firstOf(row, ['lastSyncText', 'lastSync'], fmtDate(firstOf(row, ['lastSyncAtUtc', 'updatedAt', 'createdAtUtc'], null), '—')), '—'),
      errors: firstOf(row, ['vendorExtensions.errorsCount', 'errorsCount', 'errorRatePct', 'errorRate'], '—')
    }));

    store.alerts = payload.alerts.slice(0, 6).map(row => ({
      title: safeText(firstOf(row, ['title', 'message', 'sourceAlertId', 'id'], '—'), '—'),
      plant: safeText(firstOf(row, ['plantName', 'sourcePlantName', 'stationName', 'sourcePlantId'], '—'), '—'),
      device: safeText(firstOf(row, ['deviceName', 'sourceDeviceName', 'sourceDeviceId'], '—'), '—'),
      severity: safeText(firstOf(row, ['severity', 'status'], '—'), '—'),
      time: fmtDate(firstOf(row, ['occurredAtUtc', 'createdAtUtc', 'lastSyncAt'], null), '—')
    }));

    store.quality = [
      { label: 'Providers', value: String(snap.providerNames.length || snap.integrationCount) },
      { label: 'Templates', value: String(snap.templateCount) },
      { label: 'Stale Plants', value: snap.staleAvailable ? String(snap.staleCount) : '—' },
      { label: 'Avg Error Rate', value: snap.errorRateAvailable ? `${snap.errorRate.toFixed(1)}%` : '—' }
    ];

    store.plants = payload.plants.slice(0, 6).map((row, index) => {
      const installedPowerKw = Number(firstOf(row, ['installedPowerKw', 'raw.installedPowerKw', 'adminRecord.installedPowerKw'], 0) || 0);
      const todayEnergyKwh = Number(firstOf(row, ['todayEnergyKwh', 'raw.todayEnergyKwh', 'liveRecord.todayEnergyKwh'], 0) || 0);
      return {
        name: safeText(firstOf(row, ['plantName', 'stationName', 'siteName', 'displayName', 'name', 'sourcePlantName', 'sourcePlantId', 'id'], `Plant ${index + 1}`), `Plant ${index + 1}`),
        capacity: installedPowerKw > 0 ? `${(installedPowerKw / 1000).toFixed(2)} MWp` : '—',
        energy: todayEnergyKwh > 0 ? `${todayEnergyKwh.toFixed(1)} kWh today` : '—',
        health: safeText(firstOf(row, ['status', 'recordStatus', 'dataQualityStatus', 'adminRecord.recordStatus'], '—'), '—')
      };
    });
  }

  function integrationVendor(provider: unknown): string {
    const p = String(provider || '').trim();
    if (/deye/i.test(p)) return 'DeyeCloud';
    if (/solax/i.test(p)) return 'SolaX';
    return p || 'Unknown';
  }

  function integrationSoftware(provider: unknown): string {
    const p = integrationVendor(provider);
    if (/deye/i.test(p)) return 'DeyeCloud';
    if (/solax/i.test(p)) return 'SolaX Cloud';
    return p;
  }


  const contractMapperContext: FleetContractMapperContext = {
    safeText,
    firstOf,
    displayName: liveDisplayName,
    formatDate: fmtDate,
    integrationVendor,
    integrationSoftware
  };

  function sameId(a: unknown, b: unknown): boolean {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    const aa = String(a).trim();
    const bb = String(b).trim();
    return aa !== '' && bb !== '' && aa === bb;
  }

  function plantMatchesDevice(plant: AnyRecord, device: AnyRecord): boolean {
    return sameId(device.plantId, plant.externalId) || sameId(device.plantId, plant.id) || sameId(device.raw?.sourcePlantId, plant.externalId) || sameId(device.raw?.sourcePlantId, plant.id);
  }

  function plantMatchesAlert(plant: AnyRecord, alert: AnyRecord): boolean {
    return sameId(alert.plantId, plant.externalId) || sameId(alert.plantId, plant.id) || sameId(alert.raw?.sourcePlantId, plant.externalId) || sameId(alert.raw?.sourcePlantId, plant.id);
  }

  function deviceMatchesAlert(device: AnyRecord, alert: AnyRecord): boolean {
    return sameId(alert.deviceId, device.externalId) || sameId(alert.deviceId, device.id) || sameId(alert.raw?.sourceDeviceId, device.externalId) || sameId(alert.raw?.sourceDeviceId, device.id);
  }

  function sameLabel(a: unknown, b: unknown): boolean {
    const left = safeText(a, '').trim().toLowerCase();
    const right = safeText(b, '').trim().toLowerCase();
    return Boolean(left && right && left === right && left !== '—');
  }

  function plantMatchesTelemetry(plant: AnyRecord, telemetry: AnyRecord): boolean {
    const canonicalPlantId = firstOf(plant, ['operationalId', 'canonicalPlantId', 'raw.operationalData.canonicalPlantId', 'raw.liveRecord.id'], '');
    return sameId(telemetry.plantId, canonicalPlantId)
      || sameId(telemetry.plantId, plant.externalId)
      || sameId(telemetry.plantId, plant.id)
      || sameId(telemetry.raw?.sourcePlantId, plant.externalId)
      || sameId(telemetry.raw?.sourcePlantId, plant.sourcePlantId)
      || sameId(telemetry.raw?.sourcePlantId, plant.id)
      || sameLabel(telemetry.plant, plant.name);
  }

  function publishPlantDetailTelemetry(record: AnyRecord, rows: AnyRecord[]): void {
    const keys = [record?.id, record?.externalId, record?.code, record?.operationalId, record?.canonicalPlantId]
      .map(value => safeText(value, '').trim())
      .filter(Boolean);
    if (!keys.length) return;
    const telemetryStore = { ...(window.ZentridLiveTelemetryByPlant || {}) } as Record<string, AnyRecord[]>;
    const loadedStore = { ...(window.ZentridLiveTelemetryLoadedPlants || {}) } as Record<string, boolean>;
    keys.forEach(key => { telemetryStore[key] = rows; loadedStore[key] = true; });
    window.ZentridLiveTelemetryByPlant = telemetryStore;
    window.ZentridLiveTelemetryLoadedPlants = loadedStore;
  }

  function mergePlantDetailRows(rows: AnyRecord[]): AnyRecord[] {
    const output: AnyRecord[] = [];
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const key = safeText(firstOf(row, ['id', 'externalId', 'code', 'serial', 'raw.id', 'raw.sourceDeviceId'], `row-${index}`), `row-${index}`).trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      output.push(row);
    });
    return output;
  }

  function mappedPlantDeviceRows(payload: unknown): AnyRecord[] {
    return FleetAPIContracts.devices.mapList(asArray(payload), contractMapperContext) as AnyRecord[];
  }

  async function loadTenantPlantDeviceRelations(plant: AnyRecord, forceRefresh: boolean): Promise<{ rows: AnyRecord[]; errors: unknown[]; sources: string[] }> {
    const errors: unknown[] = [];
    const sources: string[] = [];
    const rows: AnyRecord[] = [];
    const registryPlantId = safeText(firstOf(plant, ['adminId', 'registryPlantId', 'raw.adminRecord.id', 'raw.adminRecord.plantId', 'id'], ''), '').trim();
    const canonicalPlantId = safeText(firstOf(plant, ['operationalId', 'canonicalPlantId', 'raw.operationalData.canonicalPlantId', 'raw.liveRecord.id'], ''), '').trim();
    const externalId = safeText(firstOf(plant, ['sourcePlantId', 'operationalExternalId', 'externalId', 'code'], ''), '').trim();

    if (registryPlantId && window.ZentridPlatformAPI?.plantRegistry?.devices) {
      try {
        const payload = await window.ZentridPlatformAPI.plantRegistry.devices(registryPlantId, detailReadOptions('plant-detail:admin-plant-devices', 100, forceRefresh));
        rows.push(...mappedPlantDeviceRows(payload));
        sources.push(`/api/admin/plants/${encodeURIComponent(registryPlantId)}/devices`);
        return { rows: mergePlantDetailRows(rows), errors, sources };
      } catch (error) {
        errors.push(error);
      }
    }

    if (registryPlantId) {
      try {
        const result = await FleetAPIRepositories.devices.list({ ...detailReadOptions('plant-detail:devices-by-registry-plant', 100, forceRefresh), plantId: registryPlantId });
        rows.push(...result.items.filter(row => plantMatchesDevice(plant, row)));
        errors.push(...result.errors);
        sources.push(`${result.source}?plantId=${encodeURIComponent(registryPlantId)}`);
      } catch (error) {
        errors.push(error);
      }
    }

    if (!rows.length && window.ZentridPlatformAPI?.liveDevices?.list && canonicalPlantId) {
      try {
        const payload = await window.ZentridPlatformAPI.liveDevices.list({ page: 1, pageSize: 100, plantId: canonicalPlantId }, detailReadOptions('plant-detail:live-devices-by-plant', 100, forceRefresh));
        rows.push(...mappedPlantDeviceRows(payload).filter(row => plantMatchesDevice(plant, row)));
        sources.push(`/api/devices?plantId=${encodeURIComponent(canonicalPlantId)}`);
      } catch (error) {
        errors.push(error);
      }
    }

    if (!rows.length && window.ZentridPlatformAPI?.liveDevices?.list && externalId && externalId !== '—') {
      try {
        const payload = await window.ZentridPlatformAPI.liveDevices.list({ page: 1, pageSize: 100, search: externalId }, detailReadOptions('plant-detail:live-devices-search', 100, forceRefresh));
        rows.push(...mappedPlantDeviceRows(payload).filter(row => plantMatchesDevice(plant, row)));
        sources.push(`/api/devices?search=${encodeURIComponent(externalId)}`);
      } catch (error) {
        errors.push(error);
      }
    }

    return { rows: mergePlantDetailRows(rows), errors, sources };
  }

  async function loadTenantPlantAlertRelations(plant: AnyRecord, forceRefresh: boolean): Promise<{ rows: AnyRecord[]; errors: unknown[]; source: string }> {
    const canonicalPlantId = safeText(firstOf(plant, ['operationalId', 'canonicalPlantId', 'raw.operationalData.canonicalPlantId', 'raw.liveRecord.id', 'externalId'], ''), '').trim();
    if (!canonicalPlantId || canonicalPlantId === '—') {
      return { rows: [], errors: [new Error('No Platform Live plant identifier is available for plant-scoped alerts.')], source: '/api/admin/alerts' };
    }
    try {
      const result = await FleetAPIRepositories.alerts.list({
        ...detailReadOptions(`plant-detail:alerts-${canonicalPlantId}`, 100, forceRefresh),
        timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS,
        plantId: canonicalPlantId
      });
      return { rows: result.items.filter(row => plantMatchesAlert(plant, row)), errors: result.errors, source: `${result.source}?plantId=${encodeURIComponent(canonicalPlantId)}` };
    } catch (error) {
      return { rows: [], errors: [error], source: `/api/admin/alerts?plantId=${encodeURIComponent(canonicalPlantId)}` };
    }
  }

  function enrichPlantRelations(plants: AnyRecord[], devices: AnyRecord[], alerts: AnyRecord[]): AnyRecord[] {
    return plants.map(plant => {
      const relatedDevices = devices.filter(device => plantMatchesDevice(plant, device));
      const relatedAlerts = alerts.filter(alert => plantMatchesAlert(plant, alert));
      const typeCounts = relatedDevices.reduce((acc, device) => {
        const key = String(device.type || '').toLowerCase();
        if (key.includes('invert')) acc.inverters += 1;
        else if (key.includes('meter')) acc.meters += 1;
        else if (key.includes('logger') || key.includes('collector') || key.includes('gateway')) acc.loggers += 1;
        else acc.other += 1;
        return acc;
      }, { inverters: 0, meters: 0, loggers: 0, other: 0 });
      return {
        ...plant,
        devices: relatedDevices.length || plant.devices,
        alerts: relatedAlerts.length || plant.alerts,
        inverters: typeCounts.inverters || plant.inverters,
        meters: typeCounts.meters || plant.meters,
        loggers: typeCounts.loggers,
        relatedDevices,
        relatedAlerts
      };
    });
  }

  function enrichDeviceRelations(devices: AnyRecord[], plants: AnyRecord[], alerts: AnyRecord[]): AnyRecord[] {
    return devices.map(device => {
      const plant = plants.find(p => plantMatchesDevice(p, device));
      const relatedAlerts = alerts.filter(alert => deviceMatchesAlert(device, alert) || (plant && plantMatchesAlert(plant, alert)));
      return {
        ...device,
        plant: plant?.name || device.plant,
        plantFleetId: plant?.id || '',
        tenant: plant?.tenant || device.tenant,
        alerts: relatedAlerts.length || device.alerts,
        relatedPlant: plant || null,
        relatedAlerts
      };
    });
  }

  function liveTable(title: string, subtitle: string, columns: string[], rows: string[][], emptyText?: string): string {
    const body = rows.length ? rows.map(row => `<div class="data-row">${row.map((cell, index) => `<div>${index === 0 ? FleetDataSource.badge('live', 'record') : ''}${cell}</div>`).join('')}</div>`).join('') : `<div class="data-row"><div><strong>${htmlEscape(emptyText || 'No related records')}</strong><small>Backend returned no matching records for this relation.</small></div></div>`;
    return `<section class="glass-card live-related-card"><div class="panel-head compact"><div><h3>${htmlEscape(title)}</h3><p class="muted">${htmlEscape(subtitle)}</p></div></div><div class="data-table compact-table live-related-table"><div class="data-head">${columns.map(c => `<span>${htmlEscape(c)}</span>`).join('')}</div>${body}</div></section>`;
  }

  function relatedDevicesTable(devices: AnyRecord[], plant: AnyRecord): string {
    const rows = devices.slice(0, 25).map(d => [
      `<strong>${htmlEscape(d.name)}</strong><small>${htmlEscape(d.externalId)} · ${htmlEscape(d.serial)}</small>`,
      `<strong>${htmlEscape(d.type)}</strong><small>${htmlEscape(d.vendor)} · ${htmlEscape(d.sourceStatus)}</small>`,
      `<span class="badge ${badge(d.status)}">${htmlEscape(d.status)}</span><small>${htmlEscape(d.lastSeen)}</small>`,
      `<button class="small-btn" type="button" onclick="localStorage.setItem('zentrid_selected_device','${htmlEscape(d.id)}');location.href='device-detail.html'">Open</button>`
    ]);
    return liveTable('Plant Devices', `${devices.length} matched by sourcePlantId / plant id. Showing first ${Math.min(25, devices.length)}.`, ['Device', 'Type / Source', 'Status', 'Action'], rows, `No devices matched ${plant.externalId || plant.id}`);
  }

  function relatedAlertsTable(alerts: AnyRecord[], contextLabel: string): string {
    const rows = alerts.slice(0, 25).map(a => [
      `<strong>${htmlEscape(a.title)}</strong><small>${htmlEscape(a.description)}</small>`,
      `<span class="badge ${badge(a.severity)}">${htmlEscape(a.severity)}</span><small>${htmlEscape(a.status)}</small>`,
      `<strong>${htmlEscape(a.plant)}</strong><small>${htmlEscape(a.device)}</small>`,
      `<button class="small-btn" type="button" onclick="localStorage.setItem('zentrid_selected_alert','${htmlEscape(a.id)}');location.href='alert-detail.html'">Open</button>`
    ]);
    return liveTable('Related Alerts', `${alerts.length} matched for ${contextLabel}. Showing first ${Math.min(25, alerts.length)}.`, ['Alert', 'Severity / Status', 'Object', 'Action'], rows, 'No related alerts found');
  }

  function integrationMatchKey(row: AnyRecord): string {
    return safeText(firstOf(row, ['vendor', 'provider', 'providerName', 'vendorName', 'raw.provider', 'raw.providerName', 'raw.vendorName'], ''), '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function mergeIntegrationSummaries(registry: AnyRecord[], summaries: AnyRecord[]): AnyRecord[] {
    if (!summaries.length) return registry;
    return registry.map(record => {
      const key = integrationMatchKey(record);
      const summary = summaries.find(item => integrationMatchKey(item) === key);
      if (!summary) return record;
      return {
        ...record,
        plants: Number(summary.plants || record.plants || 0),
        devices: Number(summary.devices || record.devices || 0),
        alerts: Number(summary.alerts || record.alerts || 0),
        activeIntegrations: Number(summary.activeIntegrations || record.activeIntegrations || 0),
        health: summary.health || record.health,
        operationalStatus: summary.status || summary.health || '',
        lastSync: summary.lastSync || record.lastSync,
        lastActivity: summary.lastActivity || record.lastActivity,
        lastSuccessfulSync: summary.lastSuccessfulSync || record.lastSuccessfulSync,
        lastErrorMessage: summary.lastErrorMessage || record.lastErrorMessage,
        liveSummary: summary
      };
    });
  }

  function renderOverviewLiveSnapshot(payload: Required<LiveSnapshotPayload>): void {
    applyOverviewDataFromLive(payload);
    const overviewRenderer = window.renderOverview;
    const overviewWireHandler = window.wireOverview;
    if (typeof overviewRenderer === 'function' && typeof overviewWireHandler === 'function') {
      FleetLayout.mount(overviewRenderer());
      overviewWireHandler();
    }
  }

  function renderEmptyOverview(): void {
    clearOverviewData();
    const overviewRenderer = window.renderOverview;
    const overviewWireHandler = window.wireOverview;
    if (typeof overviewRenderer === 'function' && typeof overviewWireHandler === 'function') {
      FleetLayout.mount(overviewRenderer());
      overviewWireHandler();
    }
  }

  async function applyOverview(forceRefresh = false): Promise<void> {
    if (!/(^|\/)index\.html$/.test(location.pathname) && !/\/$/.test(location.pathname)) return;
    setLiveDataState('loading', 'Loading core tenant records first. Alerts and operational integration summaries will continue in the background.', { source: 'Zentrid Platform APIs' });

    const payload: Required<LiveSnapshotPayload> = {
      plants: [], devices: [], alerts: [], integrations: [], providers: [], templates: [],
      plantTotalCount: null, deviceTotalCount: null, alertTotalCount: null, integrationTotalCount: null
    };
    const errors: unknown[] = [];
    const pending = new Set(['alerts', 'integration summaries']);

    const updateState = (): void => {
      const populatedGroups = [payload.plants, payload.devices, payload.alerts, payload.integrations, payload.providers, payload.templates]
        .filter(rows => Array.isArray(rows) && rows.length > 0).length;
      const snap = snapshotFromLive(payload);
      const totalRecords = snap.plantCount + snap.deviceCount + snap.alertCount + snap.integrationCount + payload.providers.length + payload.templates.length;
      const pendingText = [...pending].join(' and ');
      const state: LiveDataState = pending.size || errors.length ? 'partial' : 'live';
      const message = pending.size
        ? `Core dashboard data is ready. ${pendingText} ${pending.size === 1 ? 'is' : 'are'} still loading without blocking the page.`
        : errors.length
          ? 'Available backend records were applied. Sections whose endpoints failed remain empty.'
          : 'Core and background backend records were applied progressively.';
      setLiveDataState(state, message, {
        source: 'Zentrid Platform APIs',
        dataOrigin: 'live',
        recordCount: totalRecords,
        details: pending.size ? `Background: ${pendingText}` : errors.length ? `${errors.length} request failure(s)` : `API-only · ${populatedGroups} populated data group(s)`
      });
      insertIntegrationLiveSummary([
        { label: 'Plants / Devices', value: `${compactNumber(snap.plantCount)}/${compactNumber(snap.deviceCount)}`, meta: `${payload.plants.length}/${payload.devices.length} API page row(s) loaded` },
        { label: 'Alerts', value: pending.has('alerts') ? 'Loading…' : compactNumber(snap.alertCount), meta: pending.has('alerts') ? 'Background request' : `${payload.alerts.length} API page row(s) loaded` },
        { label: 'Integrations', value: compactNumber(snap.integrationCount), meta: pending.has('integration summaries') ? `${payload.integrations.length} registry row(s); summary loading` : `${payload.integrations.length} registry row(s) enriched` }
      ]);
    };

    try {
      const results = await Promise.allSettled([
        FleetAPIRepositories.plants.list(detailReadOptions('overview:plants', 100, forceRefresh)),
        FleetAPIRepositories.devices.list(detailReadOptions('overview:devices', 100, forceRefresh)),
        FleetAPIRepositories.integrations.list(detailReadOptions('overview:integrations', 50, forceRefresh)),
        ZentridPlatformAPI.live.providers(),
        ZentridPlatformAPI.providerIntegrations.templates()
      ]);
      const [plantsResult, devicesResult, registryResult, providersResult, templatesResult] = results;
      payload.plants = plantsResult.status === 'fulfilled' ? plantsResult.value.rawItems : [];
      payload.plantTotalCount = plantsResult.status === 'fulfilled' ? plantsResult.value.pagination.totalCount : null;
      payload.devices = devicesResult.status === 'fulfilled' ? devicesResult.value.rawItems : [];
      payload.deviceTotalCount = devicesResult.status === 'fulfilled' ? devicesResult.value.pagination.totalCount : null;
      payload.integrations = registryResult.status === 'fulfilled' ? registryResult.value.items : [];
      payload.integrationTotalCount = registryResult.status === 'fulfilled' ? registryResult.value.pagination.totalCount : null;
      payload.providers = providersResult.status === 'fulfilled' ? asArray(providersResult.value) : [];
      payload.templates = templatesResult.status === 'fulfilled' ? asArray(templatesResult.value) : [];
      results.forEach(result => { if (result.status === 'rejected') errors.push(result.reason); });
      if (plantsResult.status === 'fulfilled') errors.push(...plantsResult.value.errors);
      if (devicesResult.status === 'fulfilled') errors.push(...devicesResult.value.errors);
      if (registryResult.status === 'fulfilled') errors.push(...registryResult.value.errors);

      const hasCoreSignal = Boolean(payload.plants.length || payload.devices.length || payload.integrations.length || payload.providers.length || payload.templates.length);
      if (!hasCoreSignal) {
        renderEmptyOverview();
        if (errors.length) setRequestFailure('Overview core endpoints', errors[0], 'No prototype fallback is displayed.');
        else setLiveDataState('empty', 'Core endpoints returned no records. The dashboard remains empty while background checks continue.', { source: 'Zentrid Platform APIs', dataOrigin: 'live', recordCount: 0 });
      } else {
        renderOverviewLiveSnapshot(payload);
        updateState();
      }
    } catch (error) {
      errors.push(error);
      renderEmptyOverview();
      setRequestFailure('Overview core endpoints', error, 'No prototype fallback is displayed.');
    }

    void FleetAPIRepositories.alerts.list({ ...detailReadOptions('overview:alerts', 100, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS })
      .then(result => {
        payload.alerts = result.rawItems;
        payload.alertTotalCount = result.pagination.totalCount;
        errors.push(...result.errors);
        renderOverviewLiveSnapshot(payload);
      })
      .catch(error => {
        errors.push(error);
        payload.alerts = [];
        payload.alertTotalCount = null;
        renderOverviewLiveSnapshot(payload);
      })
      .finally(() => { pending.delete('alerts'); updateState(); });

    void FleetAPIRepositories.integrations.summary({ ...detailReadOptions('overview:integration-summary', 50, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS })
      .then(result => {
        payload.integrations = mergeIntegrationSummaries(payload.integrations || [], result.items);
        errors.push(...result.errors);
        renderOverviewLiveSnapshot(payload);
      })
      .catch(error => errors.push(error))
      .finally(() => { pending.delete('integration summaries'); updateState(); });
  }

  async function applyPlants(backgroundRefresh = false, forceRefresh = false): Promise<void> {
    if (!/plants\.html$/.test(location.pathname)) return;
    const requestVersion = beginRegistryRequest('plants');
    if (!backgroundRefresh) setLiveDataState('loading', 'Loading the requested plant page first. Device and alert relations will be attached in the background.', { source: '/api/plants + /api/admin/plants' });
    try {
      const live = await FleetAPIRepositories.plants.list(registryReadOptions('plants', forceRefresh));
      if (!isCurrentRegistryRequest('plants', requestVersion)) return;
      publishRegistryPagination('plants', live);
      const data = live.items;
      if (!data.length) {
        window.ZentridLivePlants = [];
        window.ZentridLiveDevices = [];
        window.ZentridLiveAlerts = [];
        FleetLayout.mount(renderPlants());
        wirePlants();
        if (live.errors.length) setRequestFailure(live.source, live.errors[0], 'No browser-local or prototype plant records are displayed.');
        else setLiveDataState('empty', 'The requested plant page returned no records.', { source: live.source, recordCount: live.pagination.totalCount });
        return;
      }

      let relatedDevices: AnyRecord[] = [];
      let relatedAlerts: AnyRecord[] = [];
      const relationErrors: unknown[] = [...live.errors];
      const pending = new Set(['devices', 'alerts']);
      const render = (): void => {
        if (!isCurrentRegistryRequest('plants', requestVersion)) return;
        window.ZentridLiveDevices = relatedDevices;
        window.ZentridLiveAlerts = relatedAlerts;
        window.ZentridLivePlants = enrichPlantRelations(data, relatedDevices, relatedAlerts);
        syncLiveClientModel(window.ZentridLivePlants, relatedDevices);
        FleetLayout.mount(renderPlants());
        wirePlants();
        const pendingText = [...pending].join(' and ');
        const cacheInfo = repositoryCachePresentation(live);
        const state: LiveDataState = pending.size || relationErrors.length || cacheInfo.state === 'partial' ? 'partial' : 'live';
        const baseMessage = pending.size
          ? `Plant page ${live.pagination.page} is ready. ${pendingText} relations continue loading without blocking the registry.`
          : relationErrors.length
            ? `Plant page ${live.pagination.page} is visible, but some related data could not be loaded.`
            : `Plant page ${live.pagination.page} and its available relations were applied.`;
        const detailParts = [
          pending.size ? `Background: ${pendingText}` : '',
          relationErrors.length ? `${relationErrors.length} relation error(s)` : '',
          cacheInfo.details,
          `Page ${live.pagination.page} of ${live.pagination.totalPages}`
        ].filter(Boolean);
        setLiveDataState(state, `${cacheInfo.prefix}${baseMessage}`, {
          source: live.source,
          details: detailParts.join(' · '),
          recordCount: live.pagination.totalCount,
          ...cacheFreshnessOptions(cacheInfo)
        });
      };
      render();

      void FleetAPIRepositories.devices.list(detailReadOptions('plant-relations:devices', 100, forceRefresh))
        .then(result => { if (isCurrentRegistryRequest('plants', requestVersion)) { relatedDevices = result.items; relationErrors.push(...result.errors); } })
        .catch(error => { if (isCurrentRegistryRequest('plants', requestVersion)) relationErrors.push(error); })
        .finally(() => { if (isCurrentRegistryRequest('plants', requestVersion)) { pending.delete('devices'); render(); } });

      void FleetAPIRepositories.alerts.list({ ...detailReadOptions('plant-relations:alerts', 100, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS })
        .then(result => { if (isCurrentRegistryRequest('plants', requestVersion)) { relatedAlerts = result.items; relationErrors.push(...result.errors); } })
        .catch(error => { if (isCurrentRegistryRequest('plants', requestVersion)) relationErrors.push(error); })
        .finally(() => { if (isCurrentRegistryRequest('plants', requestVersion)) { pending.delete('alerts'); render(); } });
    } catch (error) {
      if (isCurrentRegistryRequest('plants', requestVersion)) {
        window.ZentridLivePlants = [];
        window.ZentridLiveDevices = [];
        window.ZentridLiveAlerts = [];
        FleetLayout.mount(renderPlants());
        wirePlants();
        setRequestFailure('/api/plants', error, 'No browser-local or prototype plant records are displayed.');
      }
    }
  }

  async function applyDevices(backgroundRefresh = false, forceRefresh = false): Promise<void> {
    if (!/devices\.html$/.test(location.pathname)) return;
    const requestVersion = beginRegistryRequest('devices');
    if (!backgroundRefresh) setLiveDataState('loading', 'Loading the requested device page first. Plant and alert relations will be attached in the background.', { source: '/api/devices' });
    try {
      const live = await FleetAPIRepositories.devices.list(registryReadOptions('devices', forceRefresh));
      if (!isCurrentRegistryRequest('devices', requestVersion)) return;
      publishRegistryPagination('devices', live);
      const data = live.items;
      if (!data.length) {
        window.ZentridLiveDevices = [];
        window.ZentridLivePlants = [];
        window.ZentridLiveAlerts = [];
        FleetLayout.mount(renderDevices());
        wireDevices();
        setLiveDataState('empty', 'The requested device page returned no records. No browser-local or prototype device records are displayed.', { source: live.source, recordCount: live.pagination.totalCount });
        return;
      }

      let relatedPlants: AnyRecord[] = [];
      let relatedAlerts: AnyRecord[] = [];
      const relationErrors: unknown[] = [...live.errors];
      const pending = new Set(['plants', 'alerts']);
      const render = (): void => {
        if (!isCurrentRegistryRequest('devices', requestVersion)) return;
        window.ZentridLivePlants = relatedPlants;
        window.ZentridLiveAlerts = relatedAlerts;
        window.ZentridLiveDevices = enrichDeviceRelations(data, relatedPlants, relatedAlerts);
        syncLiveClientModel(relatedPlants, window.ZentridLiveDevices);
        FleetLayout.mount(renderDevices());
        wireDevices();
        const pendingText = [...pending].join(' and ');
        const cacheInfo = repositoryCachePresentation(live);
        const state: LiveDataState = pending.size || relationErrors.length || cacheInfo.state === 'partial' ? 'partial' : 'live';
        const baseMessage = pending.size
          ? `Device page ${live.pagination.page} is ready. ${pendingText} relations continue loading without blocking the list.`
          : relationErrors.length
            ? `Device page ${live.pagination.page} is visible, but some related data could not be loaded.`
            : `Device page ${live.pagination.page} and its available relations were applied.`;
        const detailParts = [
          pending.size ? `Background: ${pendingText}` : '',
          relationErrors.length ? `${relationErrors.length} relation error(s)` : '',
          cacheInfo.details,
          `Page ${live.pagination.page} of ${live.pagination.totalPages}`
        ].filter(Boolean);
        setLiveDataState(state, `${cacheInfo.prefix}${baseMessage}`, {
          source: live.source,
          details: detailParts.join(' · '),
          recordCount: live.pagination.totalCount,
          ...cacheFreshnessOptions(cacheInfo)
        });
      };
      render();

      void FleetAPIRepositories.plants.list(detailReadOptions('device-relations:plants', 100, forceRefresh))
        .then(result => { if (isCurrentRegistryRequest('devices', requestVersion)) { relatedPlants = result.items; relationErrors.push(...result.errors); } })
        .catch(error => { if (isCurrentRegistryRequest('devices', requestVersion)) relationErrors.push(error); })
        .finally(() => { if (isCurrentRegistryRequest('devices', requestVersion)) { pending.delete('plants'); render(); } });

      void FleetAPIRepositories.alerts.list({ ...detailReadOptions('device-relations:alerts', 100, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS })
        .then(result => { if (isCurrentRegistryRequest('devices', requestVersion)) { relatedAlerts = result.items; relationErrors.push(...result.errors); } })
        .catch(error => { if (isCurrentRegistryRequest('devices', requestVersion)) relationErrors.push(error); })
        .finally(() => { if (isCurrentRegistryRequest('devices', requestVersion)) { pending.delete('alerts'); render(); } });
    } catch (error) {
      if (isCurrentRegistryRequest('devices', requestVersion)) {
        window.ZentridLiveDevices = [];
        window.ZentridLivePlants = [];
        window.ZentridLiveAlerts = [];
        FleetLayout.mount(renderDevices());
        wireDevices();
        setRequestFailure('/api/devices', error, 'No browser-local or prototype device records are displayed.');
      }
    }
  }

  async function applyAlerts(backgroundRefresh = false, forceRefresh = false): Promise<void> {
    if (!/alerts\.html$/.test(location.pathname)) return;
    const requestVersion = beginRegistryRequest('alerts');
    if (!backgroundRefresh) setLiveDataState('loading', 'Loading the requested alert page.', { source: '/api/alerts' });
    try {
      const result = await FleetAPIRepositories.alerts.list({ ...registryReadOptions('alerts', forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS });
      if (!isCurrentRegistryRequest('alerts', requestVersion)) return;
      publishRegistryPagination('alerts', result);
      const data = result.items.filter(item => item?.dataOrigin === 'live');
      window.ZentridLiveAlerts = data;
      FleetLayout.mount(renderAlertsPage());
      wireAlertsPage();
      if (!data.length) {
        setLiveDataState('empty', 'The requested alert page returned no records.', { source: '/api/alerts', recordCount: result.pagination.totalCount });
        return;
      }
      const cacheInfo = repositoryCachePresentation(result);
      setLiveDataState(cacheInfo.state, `${cacheInfo.prefix}Alert page ${result.pagination.page} of ${result.pagination.totalPages} was applied.`, {
        source: '/api/alerts',
        details: [`Server pagination · ${result.pagination.pageSize} rows per page`, cacheInfo.details].filter(Boolean).join(' · '),
        recordCount: result.pagination.totalCount,
        ...cacheFreshnessOptions(cacheInfo)
      });
    } catch (error) {
      if (isCurrentRegistryRequest('alerts', requestVersion)) {
        window.ZentridLiveAlerts = [];
        FleetLayout.mount(renderAlertsPage());
        wireAlertsPage();
        setRequestFailure('/api/alerts', error, 'No browser-local or prototype alert records are displayed.');
      }
    }
  }

  function identityValues(row: AnyRecord, entity: 'plant' | 'device' | 'alert' | 'generic' = 'generic'): string[] {
    const plantKeys = ['sourcePlantId','plantId','externalId','plantCode','code','id','canonicalId','sourceEntityId','vendorPlantId','vendorExtensions.sourcePlantId','vendorExtensions.plantId','vendorExtensions.externalId'];
    const deviceKeys = ['sourceDeviceId','deviceId','externalId','serialNumber','serial','registrationNumber','code','id','canonicalId','sourceEntityId','vendorDeviceId','vendorExtensions.sourceDeviceId','vendorExtensions.deviceId','vendorExtensions.serialNumber'];
    const alertKeys = ['sourceAlertId','alertId','eventId','code','id','canonicalId','sourceEntityId','vendorExtensions.sourceAlertId'];
    const keys = entity === 'plant' ? plantKeys : entity === 'device' ? deviceKeys : entity === 'alert' ? alertKeys : [...plantKeys, ...deviceKeys, ...alertKeys];
    const values = keys.map(key => firstOf(row, [key], '')).filter(value => value !== undefined && value !== null && value !== '').map(value => String(value).trim());
    return [...new Set(values.filter(Boolean))];
  }

  function realNameFromRow(row: AnyRecord, entityLabel: string, typeHint?: unknown): string {
    const candidates = collectNameCandidates(row, entityLabel);
    const real = candidates.find(value => isUsefulDisplayName(value, row, entityLabel, typeHint));
    return real ? safeText(real) : '';
  }

  FleetAPIRepositories.configure({
    ...contractMapperContext,
    realDisplayName: realNameFromRow
  });

  function htmlEscape(value: unknown): string {
    const entities: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'};
    return String(value ?? '—').replace(/[&<>\"']/g, ch => entities[ch] || ch);
  }

  function firstOf(row: AnyRecord, keys: string[], fallback: unknown = ''): unknown {
    for (const key of keys) {
      let value: unknown = row;
      for (const part of String(key).split('.')) {
        if (!value || typeof value !== 'object') {
          value = undefined;
          break;
        }
        value = (value as Record<string, unknown>)[part];
      }
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function cleanLabelToken(value: unknown, fallback: string): string {
    const text = safeText(value, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return fallback;
    return text.split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part).join(' ');
  }

  function isGeneratedLiveName(value: unknown): boolean {
    const text = safeText(value, '').trim();
    return /(^|[^a-z0-9])(tenant|plant|device|alarm|alert|battery|inverter|meter|logger|bess|pcs)[-_]load[-_]\d+/i.test(text)
      || /^[A-Z]+[-_]load[-_]\d+[-_][A-Z0-9]+(?:[-_][A-Z0-9]+)?(?:\s+\w+)?$/i.test(text);
  }

  function looksLikeTechnicalId(value: unknown): boolean {
    const text = safeText(value, '').trim();
    if (!text) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return true;
    if (/^[A-Z]{2,}[-_][A-Z0-9]{3,}[-_]?\d*$/i.test(text)) return true;
    if (/^\d{5,}$/.test(text)) return true;
    return false;
  }

  function collectNameCandidates(row: AnyRecord, entityLabel: string, explicitKeys: string[] = []): unknown[] {
    const result: unknown[] = [];
    explicitKeys.forEach(key => result.push(firstOf(row, [key], '')));
    const allowKey = (key: string): boolean => {
      const k = key.toLowerCase();
      if (/id$|uuid|guid|status|type|provider|vendor|source|serial|code|capacity|power|energy|date|time|count|number|url|uri|ref/.test(k)) return false;
      if (entityLabel === 'Plant' && /(plantname|plant_name|stationname|station_name|sitename|site_name|displayname|display_name|name|alias|label|title)/.test(k)) return true;
      if (entityLabel === 'Device' && /(devicename|device_name|equipmentname|equipment_name|displayname|display_name|name|alias|label|title)/.test(k)) return true;
      if (/Alert|Alarm/i.test(entityLabel) && /(alertname|alert_name|alarmname|alarm_name|eventname|event_name|displayname|display_name|title|message|name|alias|label)/.test(k)) return true;
      if (entityLabel === 'Tenant' && /(tenantname|tenant_name|organizationname|organization_name|companyname|company_name|legalname|legal_name|displayname|display_name|name|alias|label|title)/.test(k)) return true;
      if (entityLabel === 'Client' && /(clientname|client_name|customername|customer_name|companyname|company_name|legalname|legal_name|fullname|full_name|displayname|display_name|name|alias|label|title)/.test(k)) return true;
      return false;
    };
    const walk = (value: unknown, depth: number): void => {
      if (!value || depth > 5) return;
      if (Array.isArray(value)) {
        value.slice(0, 20).forEach(item => walk(item, depth + 1));
        return;
      }
      if (typeof value !== 'object') return;
      Object.entries(value as AnyRecord).forEach(([key, child]) => {
        if (allowKey(key) && child !== undefined && child !== null && child !== '') result.push(child);
        if (child && typeof child === 'object') walk(child, depth + 1);
      });
    };
    walk(row, 0);
    const seen = new Set<string>();
    return result.filter(value => {
      const text = safeText(value, '').trim();
      if (!text || seen.has(text.toLowerCase())) return false;
      seen.add(text.toLowerCase());
      return true;
    });
  }

  function isUsefulDisplayName(value: unknown, row: AnyRecord, entityLabel: string, typeHint?: unknown): boolean {
    const text = safeText(value, '').trim();
    if (!text || text === '—') return false;
    if (isGeneratedLiveName(text) || looksLikeTechnicalId(text)) return false;
    const typeText = safeText(typeHint, '').trim().toLowerCase();
    if (typeText && text.toLowerCase() === typeText) return false;
    const provider = safeText(firstOf(row, ['provider','vendor','sourceSystem'], ''), '').trim().toLowerCase();
    if (provider && text.toLowerCase() === provider) return false;
    const ids = identityValues(row, /plant/i.test(entityLabel) ? 'plant' : /device/i.test(entityLabel) ? 'device' : /alert|alarm/i.test(entityLabel) ? 'alert' : 'generic').map(x => x.toLowerCase());
    return !ids.includes(text.toLowerCase());
  }

  function shortenGeneratedLiveName(value: unknown, entityLabel: string, index: number, typeHint?: unknown): string {
    const text = safeText(value, '').trim();
    const loadMatch = text.match(/^([A-Z]+)[-_]load[-_]\d+[-_]([A-Z0-9]+)(?:[-_]([A-Z0-9]+))?(?:\s+(.+))?$/i);
    const suffix = loadMatch ? (loadMatch[3] || loadMatch[2]) : String(index + 1).padStart(2, '0');
    const trailingType = loadMatch?.[4];
    const prefix = loadMatch?.[1];
    const kind = cleanLabelToken(typeHint || trailingType || prefix || entityLabel, entityLabel);
    if (/alert|alarm/i.test(entityLabel) && !/alert|alarm/i.test(kind)) return `${kind} Alert ${suffix}`;
    return `${kind} ${suffix}`;
  }

  function liveDisplayName(row: AnyRecord, keys: string[], entityLabel: string, index: number, typeHint?: unknown): string {
    const candidates = collectNameCandidates(row, entityLabel, keys);
    const vendorName = candidates.find(value => isUsefulDisplayName(value, row, entityLabel, typeHint));
    if (vendorName) return safeText(vendorName);
    const generated = candidates.find(value => isGeneratedLiveName(value));
    if (generated) return shortenGeneratedLiveName(generated, entityLabel, index, typeHint);
    return `${cleanLabelToken(typeHint || entityLabel, entityLabel)} ${index + 1}`;
  }



  function setLiveClients(rows: AnyRecord[]): boolean {
    const clientModel = window.FleetClientModel || (typeof FleetClientModel !== 'undefined' ? FleetClientModel : null);
    if (!clientModel || !Array.isArray(clientModel.clients)) return false;
    const normalized = rows.map((row, index) => ({
      ...row,
      dataOrigin: 'live',
      id: safeText(row.id, `LIVE-CLIENT-${index + 1}`),
      code: safeText(row.code, safeText(row.id, `LIVE-CLIENT-${index + 1}`)),
      name: safeText(row.name, `Client ${index + 1}`),
      type: safeText(row.type, 'Not provided'),
      legalForm: safeText(row.legalForm, 'Not provided'),
      registrationNo: safeText(row.registrationNo, 'Not provided'),
      taxId: safeText(row.taxId, 'Not provided'),
      country: safeText(row.country, '—'),
      region: safeText(row.region, '—'),
      city: safeText(row.city, '—'),
      address: safeText(row.address, '—'),
      status: safeText(row.status, 'Unknown'),
      verification: safeText(row.verification, 'Not provided'),
      account: safeText(row.account, 'Not provided'),
      primaryContact: safeText(row.primaryContact, 'Not provided'),
      contactEmail: safeText(row.contactEmail, 'Not provided'),
      contactPhone: safeText(row.contactPhone, 'Not provided'),
      phone2: safeText(row.phone2, ''),
      username: safeText(row.username, ''),
      tenant: safeText(row.tenant, safeText(FleetLayout.state.tenant, 'Not provided')),
      plants: Array.isArray(row.plants) ? row.plants.map(String) : [],
      users: Number(row.users || 0),
      documents: Number(row.documents || 0),
      billing: safeText(row.billing, 'Not provided'),
      supportTier: safeText(row.supportTier, 'Not provided'),
      accessScope: safeText(row.accessScope, 'Not provided'),
      exportPolicy: safeText(row.exportPolicy, 'Not provided'),
      assignmentRole: safeText(row.assignmentRole, 'Not provided'),
      onboarding: safeText(row.onboarding, 'Not provided'),
      bankAccounts: Array.isArray(row.bankAccounts) ? row.bankAccounts : Array.isArray(row.raw?.bankAccounts) ? row.raw.bankAccounts : [],
      documentRecords: Array.isArray(row.documentRecords) ? row.documentRecords : Array.isArray(row.raw?.documentRecords) ? row.raw.documentRecords : Array.isArray(row.raw?.documents) ? row.raw.documents : [],
      portalUsers: Array.isArray(row.portalUsers) ? row.portalUsers : Array.isArray(row.raw?.portalUsers) ? row.raw.portalUsers : Array.isArray(row.raw?.users) ? row.raw.users : [],
      raw: row.raw || row
    })) as unknown as FleetClientLegacyClient[];
    clientModel.clients.splice(0, clientModel.clients.length, ...normalized);
    return true;
  }

  function setLiveTenants(rows: AnyRecord[]): boolean {
    try {
      window.ZentridLiveTenants = rows;
      return true;
    } catch (e) { return false; }
  }



  function upsertLiveRecord(target: AnyRecord[] | undefined, record: AnyRecord): void {
    if (!Array.isArray(target) || !record?.id) return;
    const index = target.findIndex(item => item?.id === record.id || item?.externalId === record.externalId);
    if (index >= 0) target[index] = { ...target[index], ...record };
    else target.unshift(record);
  }

  function liveCapacity(value: unknown, unit: string): string {
    const text = safeText(value, '').trim();
    if (!text || text === '—') return `0 ${unit}`;
    if (/[a-z]/i.test(text)) return text;
    return `${text} ${unit}`;
  }

  function ensureLiveClientModelPlant(plant: AnyRecord, devices: AnyRecord[] = []): void {
    const model = window.FleetClientModel;
    if (!model || !Array.isArray(model.plants) || !Array.isArray(model.devices)) return;
    const liveClients = Array.isArray(model.clients) ? model.clients.filter(client => (client as AnyRecord)?.dataOrigin === 'live') : [];
    const client = liveClients.find(client => sameId(client.id, plant.clientId) || safeText(client.name, '') === safeText(plant.owner, '')) || null;
    const clientId = safeText(plant.clientId || client?.id, '');
    const livePlant = {
      id: plant.id,
      code: plant.code || plant.externalId || plant.id,
      externalId: plant.externalId || '—',
      name: plant.name,
      clientId,
      tenantId: plant.tenantId || '',
      portfolio: plant.portfolio || plant.vendor || '—',
      status: plant.status || 'Unknown',
      type: plant.type || '—',
      country: plant.country || '—',
      region: plant.region || '—',
      city: plant.city || '—',
      address: plant.address || '—',
      timezone: plant.timezone || '—',
      capacityDc: liveCapacity(plant.capacityDc, 'MWp'),
      capacityAc: liveCapacity(plant.capacityAc, 'MW'),
      gridCapacity: liveCapacity(plant.gridCapacity, 'MW'),
      commissioning: plant.commissioned || plant.commissioning || plant.commissionedAt || '—',
      owner: plant.owner || client?.name || '—',
      operator: plant.operator || plant.tenant || '—',
      om: plant.om || '—',
      powerNow: plant.livePower || '—',
      energyToday: plant.today || '—',
      alerts: Number(plant.alerts || 0),
      health: plant.status || plant.health || 'Unknown',
      panels: Number(plant.panels || 0),
      inverters: Number(plant.inverters || 0),
      strings: Number(plant.strings || 0),
      transformers: Number(plant.transformers || 0),
      meters: Number(plant.meters || 0),
      battery: plant.battery || 'Unknown',
      devices: devices.map(device => device.id).filter(Boolean),
      relatedAlerts: Array.isArray(plant.relatedAlerts) ? plant.relatedAlerts.filter(alert => alert?.dataOrigin === 'live') : [],
      relatedTelemetry: Array.isArray(plant.relatedTelemetry) ? plant.relatedTelemetry : [],
      devicesLoaded: Boolean(plant.devicesLoaded),
      alertsLoaded: Boolean(plant.alertsLoaded),
      telemetryLoaded: Boolean(plant.telemetryLoaded),
      adminId: plant.adminId || plant.registryPlantId || '',
      registryPlantId: plant.registryPlantId || plant.adminId || '',
      operationalId: plant.operationalId || plant.canonicalPlantId || '',
      canonicalPlantId: plant.canonicalPlantId || plant.operationalId || '',
      sourcePlantId: plant.sourcePlantId || plant.externalId || '',
      totalEnergy: plant.totalEnergy ?? null,
      dataQualityStatus: plant.dataQualityStatus || plant.freshness || '—',
      lastDataAt: plant.lastDataAt || plant.lastData || '',
      dataOrigin: 'live',
      lastSyncAt: plant.lastSyncAt || plant.lastData || plant.updatedAt || '',
      sourceSystem: plant.vendor || plant.sourceSystem || plant.integration || '—',
      integration: plant.integration || '—',
      latitude: plant.latitude || plant.lat || '',
      longitude: plant.longitude || plant.lng || '',
      raw: plant.raw || undefined
    };
    upsertLiveRecord(model.plants, livePlant);
    devices.filter(device => device?.dataOrigin === 'live').forEach(device => {
      upsertLiveRecord(model.devices, {
        id: device.id,
        plantId: livePlant.id,
        type: device.type || 'Device',
        name: device.name || device.id,
        vendor: device.vendor || device.manufacturer || '—',
        model: device.model || '—',
        serial: device.serial || device.externalId || '—',
        capacity: device.capacity || device.power || '—',
        firmware: device.firmware || '—',
        status: device.status || 'Unknown',
        location: device.parent || device.location || '—',
        lastSeen: device.lastSeen || 'No live data',
        children: device.children || device.subtype || '—',
        manufacturer: device.manufacturer || device.vendor || '—',
        tenant: livePlant.operator,
        plant: livePlant.name,
        integration: device.integration || '—',
        sourceStatus: 'Live API',
        dataOrigin: 'live'
      });
    });
    if (typeof model.selectPlant === 'function') model.selectPlant(livePlant.id);
  }

  function syncLiveClientRecords(clients: AnyRecord[]): void {
    const model = window.FleetClientModel;
    if (!model || !Array.isArray(model.clients)) return;
    clients.filter(client => client?.dataOrigin === 'live').forEach(client => upsertLiveRecord(model.clients, client));
    window.ZentridLiveClients = clients.filter(client => client?.dataOrigin === 'live');
  }

  function clearLivePlantDetailModel(): void {
    const model = window.FleetClientModel;
    if (!model) return;
    if (Array.isArray(model.plants)) {
      const retained = model.plants.filter(item => (item as AnyRecord)?.dataOrigin !== 'live');
      model.plants.splice(0, model.plants.length, ...retained);
    }
    if (Array.isArray(model.devices)) {
      const retained = model.devices.filter(item => (item as AnyRecord)?.dataOrigin !== 'live' && (item as AnyRecord)?.sourceStatus !== 'Live API');
      model.devices.splice(0, model.devices.length, ...retained);
    }
    window.ZentridLivePlants = [];
    window.ZentridLiveDevices = [];
    window.ZentridLiveAlerts = [];
  }

  function syncLiveClientModel(plants: AnyRecord[], devices: AnyRecord[] = []): void {
    const model = window.FleetClientModel;
    if (!model || !Array.isArray(model.plants) || !Array.isArray(model.devices)) return;
    const previousPlantId = localStorage.getItem('zentrid_selected_plant');
    plants.forEach(plant => {
      const related = Array.isArray(plant.relatedDevices) ? plant.relatedDevices : devices.filter(device => plantMatchesDevice(plant, device));
      ensureLiveClientModelPlant(plant, related);
    });
    if (previousPlantId && typeof model.selectPlant === 'function') model.selectPlant(previousPlantId);
  }

  function mountExistingRenderer(renderName: string, wireName: string): boolean {
    const renderer = window[renderName];
    const wirer = window[wireName];
    if (typeof renderer !== 'function') return false;
    const rendered = renderer();
    if (typeof rendered === 'string') FleetLayout.mount(rendered);
    if (typeof wirer === 'function') wirer();
    return true;
  }

  function liveDetailGrid(row: AnyRecord, fields: Array<[string, unknown]>): string {
    return `<div class="info-grid">${fields.map(([label, value]) => `<div><span>${htmlEscape(label)}</span><strong>${htmlEscape(value)}</strong></div>`).join('')}</div>`;
  }

  function liveRawPanel(row: AnyRecord): string {
    return `<details class="panel-lite" open><summary>Raw API payload</summary><pre class="api-json-preview">${htmlEscape(JSON.stringify(row?.raw || row || {}, null, 2))}</pre></details>`;
  }

  function renderLivePlantDetail(plant: AnyRecord): void {
    const relatedDevices = Array.isArray(plant.relatedDevices) ? plant.relatedDevices : [];
    const relatedAlerts = Array.isArray(plant.relatedAlerts) ? plant.relatedAlerts : [];
    FleetLayout.mount(`
      <section class="page-hero plant-hero-v17">
        <div><p class="eyebrow">Plant Detail · Live API</p><h1>${htmlEscape(plant.name)}</h1><p class="muted">${htmlEscape(plant.code)} · ${htmlEscape(plant.vendor)} · ${htmlEscape(plant.country)}, ${htmlEscape(plant.city)}</p></div>
        <button class="freshness-card" onclick="location.href='plants.html'"><span class="pulse"></span><div><strong>Back to Plants</strong><small>/api/plants</small></div></button>
      </section>
      <section class="context-bar plant-context-v17"><div><span>Provider</span><strong>${htmlEscape(plant.vendor)}</strong></div><div><span>External ID</span><strong>${htmlEscape(plant.externalId)}</strong></div><div><span>Status</span><strong>${htmlEscape(plant.status)}</strong></div><div><span>Last Data</span><strong>${htmlEscape(plant.lastData)}</strong></div></section>
      <section class="kpi-grid plant-kpi-grid-v17">
        <article class="kpi-card cyan"><span class="kpi-label">Current Power</span><div class="kpi-value">${htmlEscape(plant.livePower)}</div><small class="kpi-delta">From /api/plants</small></article>
        <article class="kpi-card green"><span class="kpi-label">Linked Devices</span><div class="kpi-value">${htmlEscape(relatedDevices.length || plant.devices || 0)}</div><small class="kpi-delta">Matched from /api/devices</small></article>
        <article class="kpi-card blue"><span class="kpi-label">Capacity DC</span><div class="kpi-value">${htmlEscape(plant.capacityDc)} MWp</div><small class="kpi-delta">Installed capacity</small></article>
        <article class="kpi-card yellow"><span class="kpi-label">Related Alerts</span><div class="kpi-value">${htmlEscape(relatedAlerts.length || plant.alerts || 0)}</div><small class="kpi-delta">Matched from /api/alerts</small></article>
      </section>
      <section class="plant-workspace-v17">
        <aside class="glass-card plant-side-card-v17"><h3>Live Plant</h3><button class="active">Overview</button><button onclick="location.href='devices.html'">Devices</button><button onclick="location.href='alerts.html'">Alerts</button><button onclick="location.href='telemetry.html'">Telemetry</button></aside>
        <section class="glass-card plant-main-card-v17">
          <h2>Backend Plant Record</h2>
          ${liveDetailGrid(plant, [['Zentrid ID', plant.id], ['External Plant ID', plant.externalId], ['Provider', plant.vendor], ['Status', plant.status], ['Data Quality', plant.freshness], ['Timezone', plant.timezone], ['Address', plant.address], ['Current Power', plant.livePower], ['Today Energy', plant.today], ['Total Energy', plant.totalEnergy || '—']])}
          ${liveRawPanel(plant)}
        </section>
      </section>
      ${relatedDevicesTable(relatedDevices, plant)}
      ${relatedAlertsTable(relatedAlerts, plant.name)}
    `);
  }

  function renderLiveDeviceDetail(device: AnyRecord): void {
    const plant = device.relatedPlant || null;
    const alerts = Array.isArray(device.relatedAlerts) ? device.relatedAlerts : [];
    FleetLayout.mount(`
      <section class="page-hero device-hero-v58 device-hero-v59">
        <div><p class="eyebrow">Device Detail · Live API</p><h1>${htmlEscape(device.name)}</h1><p class="muted">${htmlEscape(device.type)} · ${htmlEscape(device.vendor)} · ${htmlEscape(device.serial)}</p></div>
        <div class="hero-actions"><button class="secondary-action" onclick="location.href='devices.html'">Back to Devices</button></div>
      </section>
      <section class="context-bar glass-card device-context-v58"><div><span>Plant</span><strong>${htmlEscape(device.plant)}</strong></div><div><span>Source Plant ID</span><strong>${htmlEscape(device.plantId)}</strong></div><div><span>Device Type</span><strong>${htmlEscape(device.type)}</strong></div><div><span>Last Communication</span><strong>${htmlEscape(device.lastSeen)}</strong></div></section>
      <section class="kpi-grid plant-kpi-grid-v17">
        <article class="kpi-card cyan"><span class="kpi-label">Status</span><div class="kpi-value">${htmlEscape(device.status)}</div><small class="kpi-delta">From /api/devices</small></article>
        <article class="kpi-card green"><span class="kpi-label">Related Plant</span><div class="kpi-value">${plant ? '1' : '0'}</div><small class="kpi-delta">Matched from /api/plants</small></article>
        <article class="kpi-card yellow"><span class="kpi-label">Related Alerts</span><div class="kpi-value">${alerts.length}</div><small class="kpi-delta">Matched from /api/alerts</small></article>
        <article class="kpi-card blue"><span class="kpi-label">Data Quality</span><div class="kpi-value">${htmlEscape(device.sourceStatus)}</div><small class="kpi-delta">Backend normalized record</small></article>
      </section>
      <section class="glass-card plant-main-card-v17">
        <h2>Backend Device Record</h2>
        ${liveDetailGrid(device, [['Zentrid ID', device.id], ['External Device ID', device.externalId], ['Serial Number', device.serial], ['Provider', device.vendor], ['Type', device.type], ['Status', device.status], ['Plant', device.plant], ['Source Plant ID', device.plantId], ['Last Seen', device.lastSeen], ['Last Sync / Quality', device.sourceStatus]])}
        ${liveRawPanel(device)}
      </section>
      ${plant ? liveTable('Parent Plant', 'Matched by sourcePlantId.', ['Plant', 'Status / Power', 'Location', 'Action'], [[`<strong>${htmlEscape(plant.name)}</strong><small>${htmlEscape(plant.externalId)}</small>`, `<span class="badge ${badge(plant.status)}">${htmlEscape(plant.status)}</span><small>${htmlEscape(plant.livePower)}</small>`, `<strong>${htmlEscape(plant.country)}</strong><small>${htmlEscape(plant.address)}</small>`, `<button class="small-btn" type="button" onclick="localStorage.setItem('zentrid_selected_plant','${htmlEscape(plant.id)}');location.href='plant-detail.html'">Open</button>`]], 'No parent plant matched') : liveTable('Parent Plant', 'No plant matched this device sourcePlantId.', ['Plant'], [], 'No parent plant matched')}
      ${relatedAlertsTable(alerts, device.name)}
    `);
  }


  function normalizedDeviceSourceKey(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  function normalizedDeviceProvider(value: unknown): string {
    const key = normalizedDeviceSourceKey(value).replace(/[\s_-]+/g, '');
    if (key === 'deye' || key === 'deyecloud') return 'deyecloud';
    if (key === 'solarx' || key === 'solax') return 'solax';
    return key;
  }

  function tenantLiveDeviceMatchesRegistry(candidate: AnyRecord, device: AnyRecord): boolean {
    const sourceDeviceId = normalizedDeviceSourceKey(firstOf(candidate, ['sourceDeviceId', 'sourceReference.sourceEntityId', 'vendorExtensions.sourceDeviceId', 'vendorExtensions.deviceId', 'deviceId'], ''));
    const registrySourceDeviceId = normalizedDeviceSourceKey(firstOf(device, ['externalId', 'raw.source.sourceDeviceId', 'raw.sourceDeviceId', 'serial'], ''));
    if (!sourceDeviceId || !registrySourceDeviceId || sourceDeviceId !== registrySourceDeviceId) return false;
    const liveProvider = normalizedDeviceProvider(firstOf(candidate, ['provider', 'sourceReference.sourceSystem', 'vendorExtensions.sourceSystem'], ''));
    const registryProvider = normalizedDeviceProvider(firstOf(device, ['vendor', 'raw.source.provider'], ''));
    return !liveProvider || !registryProvider || liveProvider === registryProvider;
  }

  async function loadTenantLiveDeviceDetail(device: AnyRecord, forceRefresh: boolean): Promise<{ id: string; detail: AnyRecord } | null> {
    const explicitLiveId = String(firstOf(device, ['liveId'], '') || '').trim();
    if (explicitLiveId) {
      try {
        const direct = await window.ZentridPlatformAPI?.liveDevices?.get(explicitLiveId, detailReadOptions('tenant-device-detail:live-direct', 20, forceRefresh));
        if (direct && typeof direct === 'object') return { id: explicitLiveId, detail: direct as AnyRecord };
      } catch (_error) { /* re-resolve below */ }
    }

    const registryPlantId = String(firstOf(device, ['plantId', 'raw.plantRelation.plantId'], '') || '').trim();
    if (registryPlantId && window.ZentridPlatformAPI?.plantRegistry?.devices) {
      try {
        const payload = await window.ZentridPlatformAPI.plantRegistry.devices(registryPlantId, detailReadOptions('tenant-device-detail:canonical-by-plant', 100, forceRefresh));
        const match = asArray(payload).find(candidate => tenantLiveDeviceMatchesRegistry(candidate, device));
        const liveId = String(firstOf(match || {}, ['deviceId', 'id'], '') || '').trim();
        if (match && liveId) {
          try {
            const detail = await window.ZentridPlatformAPI?.liveDevices?.get(liveId, detailReadOptions('tenant-device-detail:live-core', 20, forceRefresh));
            return { id: liveId, detail: detail && typeof detail === 'object' ? detail as AnyRecord : match };
          } catch (_error) { return { id: liveId, detail: match }; }
        }
      } catch (_error) { /* list-search fallback below */ }
    }

    const sourceDeviceId = String(firstOf(device, ['externalId', 'raw.source.sourceDeviceId', 'raw.sourceDeviceId', 'serial'], '') || '').trim();
    if (!sourceDeviceId || sourceDeviceId === '—') return null;
    try {
      const payload = await window.ZentridPlatformAPI?.liveDevices?.list({ page: 1, pageSize: 50, search: sourceDeviceId }, detailReadOptions('tenant-device-detail:live-match', 50, forceRefresh));
      const match = asArray(payload).find(candidate => tenantLiveDeviceMatchesRegistry(candidate, device));
      const liveId = String(firstOf(match || {}, ['deviceId', 'id', 'sourceDeviceId'], '') || '').trim();
      if (!match || !liveId) return null;
      try {
        const detail = await window.ZentridPlatformAPI?.liveDevices?.get(liveId, detailReadOptions('tenant-device-detail:live-detail', 20, forceRefresh));
        return { id: liveId, detail: detail && typeof detail === 'object' ? detail as AnyRecord : match };
      } catch (_error) { return { id: liveId, detail: match }; }
    } catch (_error) { return null; }
  }

  function clearLiveDeviceDetailModel(): void {
    window.ZentridLiveDevices = [];
    window.ZentridLivePlants = [];
    window.ZentridLiveAlerts = [];
  }

  async function applyDeviceDetail(forceRefresh = false): Promise<void> {
    if (!/device-detail\.html$/.test(location.pathname)) return;
    setLiveDataState('loading', 'Loading Device Registry detail. Operational subresources load only when their tabs are opened.', { source: '/api/admin/devices' });
    const selectedId = new URLSearchParams(location.search).get('id') || localStorage.getItem('zentrid_selected_device') || '';
    try {
      const deviceResult = await FleetAPIRepositories.devices.get(selectedId, detailReadOptions('device-detail:core', 20, forceRefresh));
      const deviceRows = deviceResult.items;
      const selectedRecord = deviceResult.item || deviceRows[0] || null;
      if (!selectedRecord) {
        clearLiveDeviceDetailModel();
        mountExistingRenderer('renderDeviceDetail', 'wireDeviceDetail');
        if (deviceResult.errors.length) setRequestFailure(deviceResult.source || '/api/admin/devices', deviceResult.errors[0], 'No Tenant device detail is displayed.');
        else setLiveDataState('empty', selectedId ? 'The Device Registry endpoint returned no record matching the selected ID.' : 'The Device Registry endpoint returned no records.', { source: deviceResult.source || '/api/admin/devices', recordCount: 0 });
        return;
      }

      let plantRows: AnyRecord[] = [];
      let alertRows: AnyRecord[] = [];
      const relationErrors: unknown[] = [...deviceResult.errors];
      const sync = (): AnyRecord | null => {
        const mappedDevices = enrichDeviceRelations(deviceRows, plantRows, alertRows);
        window.ZentridLivePlants = plantRows;
        window.ZentridLiveDevices = mappedDevices;
        window.ZentridLiveAlerts = alertRows;
        const device = mappedDevices.find(item => sameId(item.id, selectedRecord.id) || sameId(item.externalId, selectedRecord.id) || sameId(item.serial, selectedRecord.id)) || mappedDevices[0] || null;
        if (device) localStorage.setItem('zentrid_selected_device', device.id);
        return device;
      };
      let device = sync();
      const selectedAdminDeviceId = String(device?.adminId || device?.id || selectedId || '').trim();
      let selectedLiveDeviceId = '';
      const applyDeviceResource = (field: string, payload: unknown): AnyRecord | null => {
        const target = deviceRows.find(item => sameId(item.id, selectedRecord.id) || sameId(item.externalId, selectedRecord.id) || sameId(item.serial, selectedRecord.id)) || deviceRows[0];
        if (target) target[field] = payload;
        device = sync();
        return device;
      };

      try {
        const liveMatch = device ? await loadTenantLiveDeviceDetail(device, forceRefresh) : null;
        if (liveMatch) {
          selectedLiveDeviceId = liveMatch.id;
          applyDeviceResource('liveLookupStatus', 'matched');
          applyDeviceResource('liveId', liveMatch.id);
          applyDeviceResource('liveDetail', liveMatch.detail);
        } else applyDeviceResource('liveLookupStatus', 'not-linked');
      } catch (error) { relationErrors.push(error); }

      window.FleetDetailLazyTabs?.register('device', [
        {
          key: 'parent-plant',
          tabs: ['architecture', 'related'],
          label: 'Parent plant and topology',
          loader: async () => {
            const parentPlantId = String(firstOf(device || {}, ['plantId', 'raw.plantRelation.plantId'], '') || '').trim();
            const result = parentPlantId
              ? await FleetAPIRepositories.plants.get(parentPlantId, detailReadOptions('device-detail:parent-plant', 20, forceRefresh))
              : await FleetAPIRepositories.plants.list(detailReadOptions('device-detail:parent-plant', 20, forceRefresh));
            plantRows = result.items;
            relationErrors.push(...result.errors);
            if (!plantRows.length && result.errors.length) throw result.errors[0];
            sync();
          }
        },
        {
          key: 'alerts',
          tabs: ['alerts'],
          label: 'Device alerts',
          loader: async () => {
            const scopedDeviceId = selectedLiveDeviceId || String(firstOf(device || {}, ['externalId', 'serial'], '') || '').trim();
            const result = await FleetAPIRepositories.alerts.list({ ...detailReadOptions('device-detail:alerts', 100, forceRefresh), ...(scopedDeviceId ? { deviceId: scopedDeviceId } : {}), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS });
            alertRows = result.items;
            relationErrors.push(...result.errors);
            if (!alertRows.length && result.errors.length) throw result.errors[0];
            applyDeviceResource('relatedAlerts', alertRows);
            sync();
          }
        },
        {
          key: 'telemetry',
          tabs: ['telemetry', 'monitoring', 'operating'],
          label: 'Latest device telemetry',
          loader: async () => {
            if (!selectedAdminDeviceId) throw new Error('A Device Registry id is required for latest telemetry.');
            const [adminTelemetry, liveTelemetry] = await Promise.all([
              window.ZentridPlatformAPI?.deviceRegistry?.telemetryLatest(selectedAdminDeviceId, detailReadOptions('device-detail:telemetry-latest', 20, forceRefresh)),
              selectedLiveDeviceId ? window.ZentridPlatformAPI?.liveDevices?.telemetryLatest(selectedLiveDeviceId, detailReadOptions('device-detail:live-telemetry-latest', 20, forceRefresh)).catch((error: unknown) => { relationErrors.push(error); return null; }) : Promise.resolve(null)
            ]);
            applyDeviceResource('telemetryLatest', adminTelemetry);
            applyDeviceResource('liveTelemetryLatest', liveTelemetry);
            setLiveDataState(relationErrors.length ? 'partial' : 'live', 'Latest Device Registry telemetry and matching Platform Live telemetry were loaded for Tenant Device Detail.', { source: selectedLiveDeviceId ? `/api/admin/devices/${encodeURIComponent(selectedAdminDeviceId)}/telemetry/latest + /api/devices/${encodeURIComponent(selectedLiveDeviceId)}/telemetry/latest` : `/api/admin/devices/${encodeURIComponent(selectedAdminDeviceId)}/telemetry/latest`, recordCount: 1, dataOrigin: selectedLiveDeviceId ? 'mixed' : 'live' });
          }
        },
        {
          key: 'connectivity',
          tabs: ['connectivity', 'connectivity-full', 'configuration'],
          label: 'Connectivity, network and linked devices',
          loader: async () => {
            if (!selectedAdminDeviceId) throw new Error('A Device Registry id is required for connectivity.');
            const [connectivity, network, linked, liveConnectivity, liveNetwork] = await Promise.all([
              window.ZentridPlatformAPI?.deviceRegistry?.connectivity(selectedAdminDeviceId, detailReadOptions('device-detail:connectivity', 20, forceRefresh)),
              window.ZentridPlatformAPI?.deviceRegistry?.network(selectedAdminDeviceId, detailReadOptions('device-detail:network', 20, forceRefresh)),
              window.ZentridPlatformAPI?.deviceRegistry?.linkedDevices(selectedAdminDeviceId, detailReadOptions('device-detail:linked-devices', 100, forceRefresh)),
              selectedLiveDeviceId ? window.ZentridPlatformAPI?.liveDevices?.connectivity(selectedLiveDeviceId, detailReadOptions('device-detail:live-connectivity', 20, forceRefresh)).catch((error: unknown) => { relationErrors.push(error); return null; }) : Promise.resolve(null),
              selectedLiveDeviceId ? window.ZentridPlatformAPI?.liveDevices?.network(selectedLiveDeviceId, detailReadOptions('device-detail:live-network', 20, forceRefresh)).catch((error: unknown) => { relationErrors.push(error); return null; }) : Promise.resolve(null)
            ]);
            applyDeviceResource('connectivityDetail', connectivity);
            applyDeviceResource('networkDetail', network);
            applyDeviceResource('linkedDevices', linked);
            applyDeviceResource('liveConnectivityDetail', liveConnectivity);
            applyDeviceResource('liveNetworkDetail', liveNetwork);
          }
        },
        {
          key: 'warranty',
          tabs: ['passport', 'lifecycle', 'information'],
          label: 'Warranty',
          loader: async () => {
            if (!selectedAdminDeviceId) throw new Error('A Device Registry id is required for warranty.');
            const [adminWarranty, liveWarranty] = await Promise.all([
              window.ZentridPlatformAPI?.deviceRegistry?.warranty(selectedAdminDeviceId, detailReadOptions('device-detail:warranty', 20, forceRefresh)),
              selectedLiveDeviceId ? window.ZentridPlatformAPI?.liveDevices?.warranty(selectedLiveDeviceId, detailReadOptions('device-detail:live-warranty', 20, forceRefresh)).catch((error: unknown) => { relationErrors.push(error); return null; }) : Promise.resolve(null)
            ]);
            applyDeviceResource('warrantyDetail', adminWarranty);
            applyDeviceResource('liveWarrantyDetail', liveWarranty);
          }
        },
        {
          key: 'audit',
          tabs: ['audit', 'activity'],
          label: 'Device audit',
          loader: async () => {
            if (!selectedAdminDeviceId) throw new Error('A Device Registry id is required for audit history.');
            const audit=await window.ZentridPlatformAPI?.deviceRegistry?.audit(selectedAdminDeviceId, detailReadOptions('device-detail:audit', 100, forceRefresh));
            applyDeviceResource('auditDetail', audit);
          }
        }
      ]);

      if (!mountExistingRenderer('renderDeviceDetail', 'wireDeviceDetail')) console.warn('Zentrid Tenant: Device Detail renderer was not found.');
      const cacheInfo = repositoryCachePresentation(deviceResult);
      setLiveDataState(relationErrors.length ? 'partial' : cacheInfo.state, `${cacheInfo.prefix}Device Registry detail is ready. Telemetry, connectivity/network/linked devices, warranty and audit load when their tabs are opened.`, {
        source: deviceResult.source || '/api/admin/devices',
        details: [`Platform Live match: ${selectedLiveDeviceId || 'not linked'}`, 'Lazy sections: telemetry · connectivity · network · linked devices · warranty · audit', cacheInfo.details].filter(Boolean).join(' · '),
        recordCount: 1,
        dataOrigin: selectedLiveDeviceId ? 'mixed' : 'live',
        ...cacheFreshnessOptions(cacheInfo)
      });
    } catch (error) {
      clearLiveDeviceDetailModel();
      mountExistingRenderer('renderDeviceDetail', 'wireDeviceDetail');
      setRequestFailure('/api/admin/devices', error, 'No Tenant device detail is displayed.');
    }
  }

  async function applyPlantDetail(forceRefresh = false): Promise<void> {
    if (!/plant-detail\.html$/.test(location.pathname) || window.__zentridDisableLiveDetailCore) return;
    setLiveDataState('loading', 'Loading the selected Plant Registry record and operational enrichment. Related devices, alerts and telemetry will load only when their tabs are opened.', { source: '/api/admin/plants/{id} + /api/plants' });
    const selectedId = new URLSearchParams(location.search).get('id') || localStorage.getItem('zentrid_selected_plant') || '';
    try {
      const [plantResult, clientResult] = await Promise.all([
        FleetAPIRepositories.plants.get(selectedId, detailReadOptions('plant-detail:core', 100, forceRefresh)),
        FleetAPIRepositories.clients.list(detailReadOptions('plant-detail:clients', 100, forceRefresh)).catch(error => ({ entity:'clients', items:[], rawItems:[], source:'/api/admin/clients', errors:[error], pagination:{ page:1, pageSize:100, totalCount:0, totalPages:1, hasPreviousPage:false, hasNextPage:false } } as FleetRepositoryListResult))
      ]);
      const data = plantResult.items;
      const selectedPlant = plantResult.item || data[0] || null;
      syncLiveClientRecords(clientResult.items);
      if (!selectedPlant) {
        clearLivePlantDetailModel();
        mountExistingRenderer('renderPlantDetailPage', '');
        if (plantResult.errors.length) setRequestFailure(plantResult.source, plantResult.errors[0], 'No Tenant plant detail is displayed.');
        else setLiveDataState('empty', 'The Plant Registry endpoint returned no matching record.', { source: plantResult.source, recordCount: 0 });
        return;
      }

      let deviceRows: AnyRecord[] = [];
      let alertRows: AnyRecord[] = [];
      let telemetryRows: AnyRecord[] = [];
      let devicesLoaded = false;
      let alertsLoaded = false;
      let telemetryLoaded = false;
      const relationErrors: unknown[] = [...plantResult.errors, ...clientResult.errors];
      const sync = (): AnyRecord | undefined => {
        const relationAwareData = data.map(item => ({ ...item, devicesLoaded, alertsLoaded, telemetryLoaded }));
        const mapped: AnyRecord[] = enrichPlantRelations(relationAwareData as AnyRecord[], deviceRows, alertRows).map(item => ({
          ...item,
          devicesLoaded,
          alertsLoaded,
          telemetryLoaded,
          relatedTelemetry: telemetryRows
        }));
        window.ZentridLivePlants = mapped;
        window.ZentridLiveDevices = deviceRows;
        window.ZentridLiveAlerts = alertRows;
        syncLiveClientModel(mapped, deviceRows);
        const plant = mapped.find(p => sameId(p.id, selectedPlant.id) || sameId(p.externalId, selectedPlant.id) || sameId(p.code, selectedPlant.id) || sameId(p.adminId, selectedId) || sameId(p.registryPlantId, selectedId)) || mapped[0];
        if (plant) {
          localStorage.setItem('zentrid_selected_plant', safeText(plant.id, selectedId));
          localStorage.removeItem('zentrid_selected_plant_record');
          const adminId = safeText(firstOf(plant, ['adminId', 'registryPlantId', 'raw.adminRecord.id', 'raw.adminRecord.plantId'], ''), '').trim();
          if (adminId) localStorage.setItem('zentrid_selected_plant_context', JSON.stringify({ selectedId: safeText(plant.id, selectedId), adminId }));
          ensureLiveClientModelPlant(plant, Array.isArray(plant.relatedDevices) ? plant.relatedDevices : []);
          if (telemetryLoaded) publishPlantDetailTelemetry(plant, telemetryRows);
        }
        return plant;
      };
      sync();

      window.FleetDetailLazyTabs?.register('plant', [
        {
          key: 'devices',
          tabs: ['structure', 'device', 'inverters', 'batteries', 'metering', 'gateways'],
          label: 'Plant devices and topology',
          loader: async () => {
            const plant = sync();
            if (!plant) throw new Error('The selected plant is not available for device matching.');
            const relation = await loadTenantPlantDeviceRelations(plant, forceRefresh);
            deviceRows = relation.rows;
            devicesLoaded = true;
            relationErrors.push(...relation.errors);
            if (!deviceRows.length && relation.errors.length) throw relation.errors[0];
            sync();
            setLiveDataState(relation.errors.length ? 'partial' : 'live', 'Plant devices were loaded from the dedicated plant-scoped API.', {
              source: relation.sources.join(' + ') || '/api/admin/plants/{id}/devices',
              details: relation.errors.length ? `${relation.errors.length} device relation error(s) · ${deviceRows.length} mapped device record(s)` : `${deviceRows.length} device record(s) mapped for this plant`,
              recordCount: deviceRows.length,
              dataOrigin: 'live'
            });
          }
        },
        {
          key: 'alerts',
          tabs: ['alerts'],
          label: 'Plant alerts',
          loader: async () => {
            const plant = sync();
            if (!plant) throw new Error('The selected plant is not available for alert matching.');
            const relation = await loadTenantPlantAlertRelations(plant, forceRefresh);
            alertRows = relation.rows;
            alertsLoaded = true;
            relationErrors.push(...relation.errors);
            if (!alertRows.length && relation.errors.length) throw relation.errors[0];
            sync();
            setLiveDataState(relation.errors.length ? 'partial' : 'live', 'Plant alerts were loaded using the selected plant operational scope.', {
              source: relation.source,
              details: relation.errors.length ? `${relation.errors.length} alert relation error(s) · ${alertRows.length} mapped alert record(s)` : `${alertRows.length} alert record(s) mapped for this plant`,
              recordCount: alertRows.length,
              dataOrigin: 'live'
            });
          }
        },
        {
          key: 'telemetry',
          tabs: ['energy'],
          label: 'Plant telemetry',
          loader: async () => {
            const plant = sync();
            if (!plant) throw new Error('The selected plant is not available for telemetry matching.');
            const telemetryPlantId = safeText(firstOf(plant, ['operationalId', 'canonicalPlantId', 'raw.operationalData.canonicalPlantId', 'raw.liveRecord.id', 'externalId', 'sourcePlantId'], ''), '').trim();
            const result = await FleetAPIRepositories.telemetry.list({
              ...detailReadOptions('plant-detail:telemetry', 100, forceRefresh),
              timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS,
              ...(telemetryPlantId && telemetryPlantId !== '—' ? { plantId: telemetryPlantId } : {})
            });
            telemetryRows = result.items.filter((row: AnyRecord) => plantMatchesTelemetry(plant, row));
            telemetryLoaded = true;
            relationErrors.push(...result.errors);
            if (!result.items.length && result.errors.length) throw result.errors[0];
            publishPlantDetailTelemetry(plant, telemetryRows);
            sync();
            setLiveDataState(result.errors.length ? 'partial' : 'live', 'Plant telemetry was loaded from /api/telemetry after Energy & Telemetry was opened.', {
              source: result.source,
              details: telemetryRows.length
                ? `${telemetryRows.length} matching telemetry record(s) across the returned API page`
                : `Telemetry request completed, but no returned record matched this plant`,
              recordCount: telemetryRows.length,
              dataOrigin: 'live'
            });
          }
        }
      ]);

      if (!mountExistingRenderer('renderPlantDetailPage', '')) {
        console.warn('Zentrid Tenant: Plant Detail renderer was not found.');
      }
      const renderedPlant = sync();
      const cacheInfo = repositoryCachePresentation(plantResult);
      setLiveDataState(relationErrors.length ? 'partial' : cacheInfo.state, `${cacheInfo.prefix}Plant Registry detail is ready. Devices, alerts and telemetry remain idle until their tabs are opened.`, {
        source: plantResult.source,
        details: [
          safeText(renderedPlant?.operationalId, '').trim() ? 'Plant Registry is enriched with a matching Platform Live plant.' : 'Plant Registry record loaded; no Platform Live plant was matched.',
          'Lazy sections: direct plant devices · plant-scoped alerts · plant telemetry',
          relationErrors.length ? `${relationErrors.length} enrichment/core error(s)` : '',
          cacheInfo.details
        ].filter(Boolean).join(' · '),
        recordCount: 1,
        dataOrigin: safeText(renderedPlant?.operationalId, '').trim() ? 'mixed' : 'live',
        ...cacheFreshnessOptions(cacheInfo)
      });
    } catch (error) {
      clearLivePlantDetailModel();
      mountExistingRenderer('renderPlantDetailPage', '');
      setRequestFailure('/api/admin/plants/{id} + /api/plants', error, 'No Tenant plant detail is displayed.');
    }
  }

  async function applyAlertDetail(forceRefresh = false): Promise<void> {
    if (!/alert-detail\.html$/.test(location.pathname)) return;
    const selectedId = String(new URLSearchParams(location.search).get('id') || localStorage.getItem('zentrid_selected_alert') || '').trim();
    setLiveDataState('loading', 'Loading the selected alert record from the backend.', { source: '/api/alerts' });
    try {
      const result = await FleetAPIRepositories.alerts.get(selectedId, { ...detailReadOptions('alert-detail', 100, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS });
      const data = result.items.filter(item => item?.dataOrigin === 'live');
      const selectedRecord = result.item?.dataOrigin === 'live'
        ? result.item
        : (!selectedId ? data[0] || null : null);
      window.ZentridLiveAlerts = data;
      if (!selectedRecord) {
        FleetLayout.mount(renderAlertDetailUnavailable(selectedId ? 'The alert endpoint returned no record matching the selected ID.' : 'The alert endpoint returned no records.'));
        if (result.errors.length) setRequestFailure(result.source || '/api/alerts', result.errors[0], 'No prototype or browser-local alert record is displayed.');
        else setLiveDataState('empty', selectedId ? 'The alert endpoint returned no record matching the selected ID.' : 'The alert endpoint returned no records.', { source: result.source || '/api/alerts', recordCount: 0 });
        return;
      }
      localStorage.setItem('zentrid_selected_alert', String(selectedRecord.id));
      FleetLayout.mount(renderAlertDetailContent(selectedRecord as FleetAlertRecord));
      wireAlertDetailPage();
      const cacheInfo = repositoryCachePresentation(result);
      setLiveDataState(cacheInfo.state, `${cacheInfo.prefix}The selected alert record was loaded from the backend.`, {
        source: result.source || '/api/alerts',
        details: cacheInfo.details,
        recordCount: 1,
        ...cacheFreshnessOptions(cacheInfo)
      });
    } catch (error) {
      window.ZentridLiveAlerts = [];
      FleetLayout.mount(renderAlertDetailUnavailable());
      setRequestFailure('/api/alerts', error, 'No prototype or browser-local alert record is displayed.');
    }
  }


  function clientMatchesPlant(client: AnyRecord, plant: AnyRecord): boolean {
    if (sameId(plant.clientId, client.id) || sameId(plant.raw?.clientId, client.id) || sameId(plant.raw?.adminRecord?.clientId, client.id)) return true;
    const assigned = Array.isArray(client.plants) ? client.plants : [];
    if (assigned.some((id: unknown) => sameId(id, plant.id) || sameId(id, plant.externalId) || sameId(id, plant.code))) return true;
    const clientName = safeText(client.name, '').trim().toLowerCase();
    const ownerName = safeText(plant.owner || plant.raw?.clientName || plant.raw?.client, '').trim().toLowerCase();
    return Boolean(clientName && ownerName && clientName === ownerName);
  }

  async function applyClients(backgroundRefresh = false, forceRefresh = false): Promise<void> {
    if (!/clients\.html$/.test(location.pathname) && !/client-detail\.html$/.test(location.pathname)) return;
    const registry = /clients\.html$/.test(location.pathname);
    const requestVersion = registry ? beginRegistryRequest('clients') : 0;
    const selectedId = registry ? '' : String(new URLSearchParams(location.search).get('id') || localStorage.getItem('zentrid_selected_client') || '').trim();
    const detailSource = selectedId ? `/api/admin/clients/${encodeURIComponent(selectedId)}` : '/api/admin/clients';
    if (!backgroundRefresh) setLiveDataState('loading', registry ? 'Loading the requested Tenant Admin client page.' : selectedId ? 'Loading the selected Tenant Admin client record.' : 'Loading Tenant Admin client records.', { source: registry ? '/api/admin/clients' : detailSource });
    try {
      const result = registry
        ? await FleetAPIRepositories.clients.list(registryReadOptions('clients', forceRefresh))
        : selectedId
          ? await FleetAPIRepositories.clients.get(selectedId, detailReadOptions('client-detail', 100, forceRefresh))
          : await FleetAPIRepositories.clients.list(detailReadOptions('client-detail:fallback', 100, forceRefresh));
      if (registry && !isCurrentRegistryRequest('clients', requestVersion)) return;
      if (registry) publishRegistryPagination('clients', result);
      const data: AnyRecord[] = registry
        ? result.items as AnyRecord[]
        : ('item' in result && result.item ? [result.item as AnyRecord] : (result.items as AnyRecord[]).slice(0, 1));
      if (!data.length) {
        setLiveClients([]);
        if (registry) renderClientsPage();
        else {
          const model = window.FleetClientModel;
          if (model?.plants) model.plants.splice(0, model.plants.length);
          if (model?.devices) model.devices.splice(0, model.devices.length);
          renderClientDetailPage();
        }
        if (result.errors.length) setRequestFailure(detailSource, result.errors[0], 'No prototype or browser-local client record is displayed.');
        else setLiveDataState('empty', selectedId ? 'The selected client endpoint returned no matching record.' : 'The client endpoint returned no records.', { source: detailSource, recordCount: registry ? result.pagination.totalCount : 0 });
        return;
      }
      if (!setLiveClients(data)) {
        setLiveDataState('unavailable', 'Live client records were returned, but the client model was unavailable.', { source: result.source || detailSource });
        return;
      }
      const clientModel = window.FleetClientModel || (typeof FleetClientModel !== 'undefined' ? FleetClientModel : null);
      const selected = data[0]!;
      if (registry) {
        const currentSelectedId = localStorage.getItem('zentrid_selected_client');
        if (!data.some(item => item.id === currentSelectedId) && data[0]) clientModel?.selectClient(data[0].id);
        renderClientsPage();
      } else {
        if (selected?.id) clientModel?.selectClient(selected.id);
        const relationResults = await Promise.allSettled([
          FleetAPIRepositories.plants.list({ ...detailReadOptions('client-detail:plants', 200, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS }),
          FleetAPIRepositories.devices.list({ ...detailReadOptions('client-detail:devices', 200, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS }),
          FleetAPIRepositories.alerts.list({ ...detailReadOptions('client-detail:alerts', 200, forceRefresh), timeoutMs: SLOW_ENDPOINT_TIMEOUT_MS })
        ]);
        const plantResult = relationResults[0].status === 'fulfilled' ? relationResults[0].value : null;
        const deviceResult = relationResults[1].status === 'fulfilled' ? relationResults[1].value : null;
        const alertResult = relationResults[2].status === 'fulfilled' ? relationResults[2].value : null;
        const allPlants = (plantResult?.items || []) as AnyRecord[];
        const clientPlants = allPlants.filter(plant => clientMatchesPlant(selected, plant));
        const allDevices = (deviceResult?.items || []) as AnyRecord[];
        const clientDevices = allDevices.filter(device => clientPlants.some(plant => plantMatchesDevice(plant, device)));
        const allAlerts = (alertResult?.items || []) as AnyRecord[];
        const clientAlerts = allAlerts.filter(alert => clientPlants.some(plant => plantMatchesAlert(plant, alert)));
        const enrichedPlants = enrichPlantRelations(clientPlants, clientDevices, clientAlerts);
        if (clientModel?.plants) clientModel.plants.splice(0, clientModel.plants.length);
        if (clientModel?.devices) clientModel.devices.splice(0, clientModel.devices.length);
        syncLiveClientModel(enrichedPlants, clientDevices);
        const selectedRecord = clientModel?.clients.find(client => client.id === selected.id) as AnyRecord | undefined;
        if (selectedRecord) {
          selectedRecord.plants = enrichedPlants.map(plant => plant.id);
          selectedRecord.plantCount = enrichedPlants.length || Number(selectedRecord.plantCount || 0);
          selectedRecord.deviceCount = clientDevices.length || Number(selectedRecord.deviceCount || 0);
          selectedRecord.linkedAlerts = clientAlerts;
          selectedRecord.relationSources = {
            plants: plantResult?.source || '/api/plants + /api/admin/plants',
            devices: deviceResult?.source || '/api/devices',
            alerts: alertResult?.source || '/api/alerts'
          };
        }
        renderClientDetailPage();
        const relationErrors = relationResults.filter((item): item is PromiseRejectedResult => item.status === 'rejected').map(item => item.reason);
        const nestedErrors = [plantResult, deviceResult, alertResult].flatMap(item => item?.errors || []);
        const allErrors = [...result.errors, ...relationErrors, ...nestedErrors];
        const cacheInfo = repositoryCachePresentation(result);
        setLiveDataState(allErrors.length ? 'partial' : cacheInfo.state, `${cacheInfo.prefix}${selectedId ? 'The selected client record was loaded by ID.' : 'A client record was loaded from the API list.'}`, {
          source: [result.source || detailSource, plantResult?.source, deviceResult?.source, alertResult?.source].filter(Boolean).join(' + '),
          details: [
            selectedId ? 'Direct client detail endpoint with API list fallback' : 'Client list lookup',
            `${enrichedPlants.length} related plant(s)`,
            `${clientDevices.length} related device(s)`,
            `${clientAlerts.length} related alert(s)`,
            allErrors.length ? `${allErrors.length} related request error(s)` : '',
            cacheInfo.details
          ].filter(Boolean).join(' · '),
          recordCount: 1,
          ...cacheFreshnessOptions(cacheInfo)
        });
        return;
      }
      const cacheInfo = repositoryCachePresentation(result);
      setLiveDataState(result.errors.length ? 'partial' : cacheInfo.state, `${cacheInfo.prefix}Client page ${result.pagination.page} of ${result.pagination.totalPages} was applied.`, {
        source: result.source || '/api/admin/clients',
        details: [`Server pagination · ${result.pagination.pageSize} rows per page`, cacheInfo.details].filter(Boolean).join(' · '),
        recordCount: result.pagination.totalCount,
        ...cacheFreshnessOptions(cacheInfo)
      });
    } catch (error) {
      if (!registry || isCurrentRegistryRequest('clients', requestVersion)) {
        if (registry) {
          setLiveClients([]);
          renderClientsPage();
        } else {
          setLiveClients([]);
          const model = window.FleetClientModel;
          if (model?.plants) model.plants.splice(0, model.plants.length);
          if (model?.devices) model.devices.splice(0, model.devices.length);
          renderClientDetailPage();
        }
        setRequestFailure(registry ? '/api/admin/clients' : detailSource, error, 'No prototype or browser-local client records are displayed.');
      }
    }
  }


  const repositoryRefreshTimers = new Map<RegistryEntity, number>();

  function handleRepositoryUpdated(event: Event): void {
    const detail = (event as CustomEvent<{ entity?: RegistryEntity; reason?: string; result?: FleetRepositoryListResult }>).detail;
    const entity = detail?.entity;
    if (!entity || detail?.reason !== 'revalidated' || !isRegistryPage(entity)) return;
    const current = window.FleetRegistryQuery?.read(entity);
    const result = detail.result;
    if (result && current && (result.pagination.page !== current.page || result.pagination.pageSize !== current.pageSize)) return;
    const existing = repositoryRefreshTimers.get(entity);
    if (existing) window.clearTimeout(existing);
    repositoryRefreshTimers.set(entity, window.setTimeout(() => {
      repositoryRefreshTimers.delete(entity);
      if (entity === 'clients') void applyClients(true);
      if (entity === 'plants') void applyPlants(true);
      if (entity === 'devices') void applyDevices(true);
      if (entity === 'alerts') void applyAlerts(true);
    }, 40));
  }

  function handleRegistryQueryChange(event: Event): void {
    const detail = (event as CustomEvent<{ entity?: RegistryEntity }>).detail;
    const entity = detail?.entity;
    if (!entity || !isRegistryPage(entity)) return;
    if (entity === 'clients') void applyClients();
    if (entity === 'plants') void applyPlants();
    if (entity === 'devices') void applyDevices();
    if (entity === 'alerts') void applyAlerts();
  }

  function handleDataRefreshRequest(event: Event): void {
    const detail = (event as CustomEvent<{ resource?: FleetFreshnessResource; forceRefresh?: boolean }>).detail;
    const resource = detail?.resource || window.FleetDataFreshness?.inferResource();
    const forceRefresh = detail?.forceRefresh !== false;
    if (resource === 'overview') void applyOverview(forceRefresh);
    if (resource === 'clients') void applyClients(true, forceRefresh);
    if (resource === 'client-detail') void applyClients(false, forceRefresh);
    if (resource === 'plants') void applyPlants(true, forceRefresh);
    if (resource === 'plant-detail') void applyPlantDetail(forceRefresh);
    if (resource === 'devices') void applyDevices(true, forceRefresh);
    if (resource === 'device-detail') void applyDeviceDetail(forceRefresh);
    if (resource === 'alerts') void applyAlerts(true, forceRefresh);
    if (resource === 'alert-detail') void applyAlertDetail(forceRefresh);
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('zentrid:registry-query-change', handleRegistryQueryChange);
    window.addEventListener('zentrid:repository-updated', handleRepositoryUpdated);
    window.addEventListener('zentrid:data-refresh-request', handleDataRefreshRequest);
  }

  async function run(): Promise<void> {
    if (!window.ZentridPlatformAPI || !window.FleetAPI || !window.FleetAPIRepositories || !FleetAPIRepositories.isConfigured()) return;
    await Promise.allSettled([applyOverview(), applyPlants(), applyDevices(), applyAlerts(), applyDeviceDetail(), applyPlantDetail(), applyAlertDetail(), applyClients()]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else setTimeout(run, 0);
})();
