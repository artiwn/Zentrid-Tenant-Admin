/* Zentrid release readiness and production observability.
   Captures frontend failures, exposes safe diagnostics and reports build metadata without storing credentials. */
(function () {
  type FleetReleaseHealth = 'healthy' | 'attention' | 'offline';
  type FleetObservedIssueKind = 'runtime-error' | 'unhandled-rejection' | 'resource-error';
  type FleetObservedIssue = {
    id: string;
    kind: FleetObservedIssueKind;
    message: string;
    source: string;
    line: number | null;
    column: number | null;
    route: string;
    at: string;
    count: number;
  };
  type FleetObservedEvent = {
    type: string;
    at: string;
    detail: unknown;
  };
  type FleetReleaseManifest = {
    schemaVersion: number;
    app: string;
    version: string;
    release: string;
    channel: string;
    environment: string;
    target: string;
    buildId: string;
    builtAt: string;
    commit: string | null;
    commitShort: string | null;
  };
  type FleetReleaseSnapshot = {
    release: FleetReleaseManifest;
    collectedAt: string;
    health: FleetReleaseHealth;
    route: string;
    online: boolean;
    visibility: DocumentVisibilityState;
    viewport: { width: number; height: number; devicePixelRatio: number };
    browser: { userAgent: string; language: string; timezone: string };
    authentication: { authenticated: boolean; roles: string[]; expired: boolean };
    navigation: Record<string, unknown>;
    paint: Record<string, number>;
    resources: Record<string, unknown>;
    storage: { localKeys: number; sessionKeys: number };
    runtime: unknown;
    session: unknown;
    security: unknown;
    freshness: unknown;
    forms: unknown;
    contractDiagnostics: unknown;
    fieldAudit: unknown;
    recentIssues: FleetObservedIssue[];
    recentEvents: FleetObservedEvent[];
  };

  const FALLBACK_MANIFEST: FleetReleaseManifest = {
    schemaVersion: 1,
    app: 'Zentrid Tenant Admin',
    version: '1.39.0',
    release: 'v139',
    channel: 'prototype',
    environment: 'unknown',
    target: 'browser',
    buildId: 'v139-runtime-fallback',
    builtAt: '',
    commit: null,
    commitShort: null
  };
  const MAX_ISSUES = 25;
  const MAX_EVENTS = 50;
  const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const SENSITIVE_KEY = /(token|password|passcode|secret|api[-_]?key|authorization|credential|private[-_]?key|cookie|sessionid|refresh)/i;
  const currentScript = document.currentScript instanceof HTMLScriptElement ? document.currentScript : null;
  const manifestUrl = currentScript?.src
    ? new URL('../release-manifest.json', currentScript.src).toString()
    : new URL('assets/release-manifest.json', window.location.href).toString();

  let manifest: FleetReleaseManifest = { ...FALLBACK_MANIFEST };
  let issues: FleetObservedIssue[] = [];
  let events: FleetObservedEvent[] = [];
  let chip: HTMLButtonElement | null = null;
  let panel: HTMLElement | null = null;
  let notice: HTMLElement | null = null;
  let lastUpdateCheckAt = 0;
  let incidentNoticeShown = false;
  let disposed = false;

  function safeRoute(): string {
    const keys = Array.from(new URLSearchParams(window.location.search).keys()).sort();
    return `${window.location.pathname}${keys.length ? `?${keys.join('&')}` : ''}`;
  }

  function safeSource(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      return `${url.origin === window.location.origin ? '' : url.origin}${url.pathname}`;
    } catch (_error) {
      return raw.split(/[?#]/, 1)[0]?.slice(0, 240) || '';
    }
  }

  function escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readableError(value: unknown): string {
    if (value instanceof Error) return value.message || value.name;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (_error) { return String(value); }
  }

  function sanitize(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'function' || typeof value === 'symbol') return `[${typeof value}]`;
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack ? value.stack.split('\n').slice(0, 8).join('\n') : ''
      };
    }
    if (depth >= 6) return '[max-depth]';
    if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitize(item, depth + 1, seen));
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    Object.keys(source).sort().slice(0, 80).forEach(key => {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(source[key], depth + 1, seen);
    });
    return output;
  }

  function nowIso(): string {
    return new Date().toISOString();
  }

  function recordEvent(type: string, detail: unknown): void {
    events.push({ type, at: nowIso(), detail: sanitize(detail) });
    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  }

  function recordIssue(input: Omit<FleetObservedIssue, 'id' | 'at' | 'count' | 'route'>): FleetObservedIssue {
    const signature = `${input.kind}|${input.message}|${input.source}|${input.line || 0}|${input.column || 0}`;
    const existing = issues.find(issue => issue.id === signature);
    if (existing) {
      existing.count += 1;
      existing.at = nowIso();
      existing.route = safeRoute();
      updateChip();
      return existing;
    }
    const issue: FleetObservedIssue = {
      id: signature,
      kind: input.kind,
      message: input.message.slice(0, 500),
      source: input.source,
      line: input.line,
      column: input.column,
      route: safeRoute(),
      at: nowIso(),
      count: 1
    };
    issues.push(issue);
    if (issues.length > MAX_ISSUES) issues = issues.slice(-MAX_ISSUES);
    recordEvent('frontend-issue', issue);
    updateChip();
    if (!incidentNoticeShown) {
      incidentNoticeShown = true;
      showNotice('A frontend error was detected. A safe diagnostic report is available.', 'Open diagnostics', openPanel);
    }
    return issue;
  }

  function health(): FleetReleaseHealth {
    if (!navigator.onLine) return 'offline';
    return issues.length ? 'attention' : 'healthy';
  }

  function manifestIsValid(value: unknown): value is FleetReleaseManifest {
    if (!value || typeof value !== 'object') return false;
    const row = value as Record<string, unknown>;
    return typeof row.version === 'string'
      && typeof row.release === 'string'
      && typeof row.buildId === 'string'
      && typeof row.builtAt === 'string';
  }

  async function fetchManifest(): Promise<FleetReleaseManifest> {
    const response = await fetch(manifestUrl, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Release manifest unavailable (${response.status})`);
    const value: unknown = await response.json();
    if (!manifestIsValid(value)) throw new Error('Release manifest has an invalid shape.');
    return value;
  }

  async function loadManifest(): Promise<void> {
    try {
      manifest = await fetchManifest();
      recordEvent('release-manifest-loaded', { release: manifest.release, buildId: manifest.buildId, target: manifest.target });
    } catch (error) {
      recordEvent('release-manifest-fallback', { message: readableError(error), url: safeSource(manifestUrl) });
    }
    updateChip();
    updatePanel();
  }

  function navigationMetrics(): Record<string, unknown> {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!entry) return {};
    return {
      type: entry.type,
      durationMs: Math.round(entry.duration),
      domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
      loadEventMs: Math.round(entry.loadEventEnd),
      responseMs: Math.round(entry.responseEnd),
      transferBytes: entry.transferSize,
      encodedBodyBytes: entry.encodedBodySize
    };
  }

  function paintMetrics(): Record<string, number> {
    const output: Record<string, number> = {};
    performance.getEntriesByType('paint').forEach(entry => { output[entry.name] = Math.round(entry.startTime); });
    return output;
  }

  function resourceMetrics(): Record<string, unknown> {
    const entries = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter(entry => !entry.name.includes('release-manifest.json'));
    const slowest = [...entries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(entry => ({
        path: safeSource(entry.name),
        type: entry.initiatorType,
        durationMs: Math.round(entry.duration),
        transferBytes: entry.transferSize
      }));
    return {
      count: entries.length,
      transferBytes: entries.reduce((total, entry) => total + (entry.transferSize || 0), 0),
      slowest
    };
  }

  function snapshot(): FleetReleaseSnapshot {
    const session = window.ZentridAuth?.getSession?.();
    const roles = session?.roles ? [...session.roles] : [];
    return {
      release: { ...manifest },
      collectedAt: nowIso(),
      health: health(),
      route: safeRoute(),
      online: navigator.onLine,
      visibility: document.visibilityState,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      },
      authentication: {
        authenticated: Boolean(session?.accessToken),
        roles,
        expired: Boolean(session?.expired)
      },
      navigation: navigationMetrics(),
      paint: paintMetrics(),
      resources: resourceMetrics(),
      storage: {
        localKeys: localStorage.length,
        sessionKeys: sessionStorage.length
      },
      runtime: sanitize(window.FleetRuntimeStability?.snapshot?.() || null),
      session: sanitize(window.FleetSessionResilience?.snapshot?.() || null),
      security: sanitize(window.FleetBrowserSecurity?.snapshot?.() || null),
      freshness: sanitize(window.FleetDataFreshness?.snapshot?.() || null),
      forms: sanitize(window.FleetFormReadiness?.snapshot?.() || []),
      contractDiagnostics: sanitize(window.FleetAPIContracts?.diagnostics?.summary?.() || null),
      fieldAudit: sanitize(window.FleetAPIContracts?.fieldAudit?.summary?.() || null),
      recentIssues: issues.map(issue => ({ ...issue })),
      recentEvents: events.map(event => ({ ...event }))
    };
  }

  function reportJson(): string {
    return JSON.stringify(sanitize(snapshot()), null, 2);
  }

  function findOrCreate<K extends keyof HTMLElementTagNameMap>(tag: K, id: string): HTMLElementTagNameMap[K] {
    const existing = document.getElementById(id);
    if (existing instanceof HTMLElement) return existing as HTMLElementTagNameMap[K];
    const created = document.createElement(tag);
    created.id = id;
    return created;
  }

  function createChip(): HTMLButtonElement {
    const button = findOrCreate('button', 'fleetReleaseChip');
    button.type = 'button';
    button.className = 'fleet-release-chip';
    button.setAttribute('aria-label', 'Open Zentrid release and diagnostics information');
    button.addEventListener('click', openPanel);
    chip = button;
    updateChip();
    return button;
  }

  function mountChip(): void {
    const button = chip || createChip();
    const topbar = document.querySelector<HTMLElement>('.topbar-actions');
    if (topbar) {
      button.classList.remove('is-floating');
      if (button.parentElement !== topbar) topbar.prepend(button);
    } else {
      button.classList.add('is-floating');
      if (button.parentElement !== document.body) document.body.appendChild(button);
    }
  }

  function updateChip(): void {
    if (!chip) return;
    const state = health();
    chip.dataset.health = state;
    const label = manifest.release || manifest.version;
    chip.innerHTML = `<span class="fleet-release-dot" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
    chip.title = `${manifest.app} ${manifest.version} · ${state}`;
  }

  function createPanel(): HTMLElement {
    const overlay = findOrCreate('div', 'fleetReleasePanel');
    overlay.className = 'fleet-release-panel';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="fleet-release-panel-backdrop" data-release-close></div>
      <section class="fleet-release-dialog" role="dialog" aria-modal="true" aria-labelledby="fleetReleaseTitle">
        <header class="fleet-release-dialog-header">
          <div>
            <span class="fleet-release-eyebrow">Release & diagnostics</span>
            <h2 id="fleetReleaseTitle">Zentrid runtime health</h2>
          </div>
          <button type="button" class="icon-btn fleet-release-close" data-release-close aria-label="Close diagnostics">×</button>
        </header>
        <div class="fleet-release-summary" id="fleetReleaseSummary"></div>
        <div class="fleet-release-actions">
          <button type="button" class="primary-action" data-release-copy>Copy safe report</button>
          <button type="button" class="secondary-action" data-release-download>Download JSON</button>
          <button type="button" class="secondary-action" data-release-check>Check deployment</button>
          <button type="button" class="secondary-action" data-release-clear>Clear local issues</button>
        </div>
        <details class="fleet-release-report-shell">
          <summary>Safe diagnostic payload</summary>
          <pre id="fleetReleaseReport"></pre>
        </details>
      </section>`;
    overlay.querySelectorAll<HTMLElement>('[data-release-close]').forEach(element => element.addEventListener('click', closePanel));
    overlay.querySelector<HTMLElement>('[data-release-copy]')?.addEventListener('click', () => { void copySafeReport(); });
    overlay.querySelector<HTMLElement>('[data-release-download]')?.addEventListener('click', downloadReport);
    overlay.querySelector<HTMLElement>('[data-release-check]')?.addEventListener('click', () => { void checkForUpdate(true); });
    overlay.querySelector<HTMLElement>('[data-release-clear]')?.addEventListener('click', () => {
      issues = [];
      incidentNoticeShown = false;
      recordEvent('local-issues-cleared', {});
      updateChip();
      updatePanel();
    });
    document.body.appendChild(overlay);
    panel = overlay;
    return overlay;
  }

  function summaryCard(label: string, value: string, tone = ''): string {
    const safeTone = tone ? ` data-tone="${tone}"` : '';
    return `<div class="fleet-release-summary-card"${safeTone}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function updatePanel(): void {
    if (!panel) return;
    const summary = panel.querySelector<HTMLElement>('#fleetReleaseSummary');
    if (summary) {
      const state = health();
      summary.innerHTML = [
        summaryCard('Health', state, state),
        summaryCard('Release', `${manifest.release} · ${manifest.version}`),
        summaryCard('Build', manifest.buildId || 'Unavailable'),
        summaryCard('Environment', `${manifest.environment} · ${manifest.target}`),
        summaryCard('Route', safeRoute()),
        summaryCard('Frontend issues', String(issues.reduce((total, issue) => total + issue.count, 0)), issues.length ? 'attention' : 'healthy')
      ].join('');
    }
    const report = panel.querySelector<HTMLElement>('#fleetReleaseReport');
    if (report) report.textContent = reportJson();
  }

  function openPanel(): void {
    const activePanel = panel || createPanel();
    updatePanel();
    activePanel.hidden = false;
    document.body.classList.add('fleet-release-dialog-open');
    activePanel.querySelector<HTMLElement>('[data-release-close]')?.focus();
  }

  function closePanel(): void {
    if (!panel) return;
    panel.hidden = true;
    document.body.classList.remove('fleet-release-dialog-open');
    chip?.focus({ preventScroll: true });
  }

  function showNotice(message: string, actionLabel?: string, action?: () => void): void {
    const banner = notice || findOrCreate('div', 'fleetReleaseNotice');
    banner.className = 'fleet-release-notice';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.replaceChildren();
    const copy = document.createElement('span');
    copy.textContent = message;
    banner.appendChild(copy);
    if (actionLabel && action) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'secondary-action';
      actionButton.textContent = actionLabel;
      actionButton.addEventListener('click', action);
      banner.appendChild(actionButton);
    }
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'icon-btn';
    dismiss.setAttribute('aria-label', 'Dismiss release notification');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => banner.remove());
    banner.appendChild(dismiss);
    document.body.appendChild(banner);
    notice = banner;
  }

  async function copySafeReport(): Promise<boolean> {
    const value = reportJson();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.className = 'fleet-release-copy-buffer';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      recordEvent('diagnostic-report-copied', { release: manifest.release });
      window.FleetLayout?.toast?.('Safe diagnostic report copied.');
      updatePanel();
      return true;
    } catch (error) {
      recordEvent('diagnostic-copy-failed', { message: readableError(error) });
      window.FleetLayout?.toast?.('Could not copy the diagnostic report.');
      return false;
    }
  }

  function downloadReport(): void {
    const blob = new Blob([reportJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `zentrid-diagnostics-${manifest.release}-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    recordEvent('diagnostic-report-downloaded', { release: manifest.release });
    updatePanel();
  }

  async function checkForUpdate(manual = false): Promise<boolean> {
    const startedAt = Date.now();
    if (!manual && startedAt - lastUpdateCheckAt < UPDATE_CHECK_INTERVAL_MS) return false;
    lastUpdateCheckAt = startedAt;
    try {
      const latest = await fetchManifest();
      const changed = Boolean(manifest.buildId && latest.buildId && latest.buildId !== manifest.buildId);
      recordEvent('release-update-check', { changed, current: manifest.buildId, latest: latest.buildId });
      if (changed) {
        showNotice(`A newer Zentrid deployment is available (${latest.release}).`, 'Reload', () => window.location.reload());
      } else if (manual) {
        showNotice(`You are using the current Zentrid deployment (${manifest.release}).`);
      }
      return changed;
    } catch (error) {
      recordEvent('release-update-check-failed', { message: readableError(error) });
      if (manual) showNotice('Deployment status could not be checked.');
      return false;
    } finally {
      updatePanel();
    }
  }

  function onWindowError(event: Event): void {
    if (event instanceof ErrorEvent) {
      recordIssue({
        kind: 'runtime-error',
        message: event.message || readableError(event.error),
        source: safeSource(event.filename),
        line: Number.isFinite(event.lineno) ? event.lineno : null,
        column: Number.isFinite(event.colno) ? event.colno : null
      });
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const source = target.getAttribute('src') || target.getAttribute('href') || target.tagName.toLowerCase();
    recordIssue({
      kind: 'resource-error',
      message: `Failed to load ${target.tagName.toLowerCase()} resource`,
      source: safeSource(source),
      line: null,
      column: null
    });
  }

  function onUnhandledRejection(event: PromiseRejectionEvent): void {
    recordIssue({
      kind: 'unhandled-rejection',
      message: readableError(event.reason),
      source: '',
      line: null,
      column: null
    });
  }

  function onConnectivityChanged(): void {
    recordEvent(navigator.onLine ? 'browser-online' : 'browser-offline', {});
    updateChip();
    updatePanel();
  }

  function onVisibilityChanged(): void {
    if (document.visibilityState === 'visible') void checkForUpdate(false);
  }

  function listenToRuntimeEvents(): void {
    const names = [
      'zentrid:request-error',
      'zentrid:request-retry',
      'zentrid:request-success',
      'zentrid:session-expired',
      'zentrid:session-refreshed',
      'zentrid:session-sync',
      'zentrid:storage-recovered',
      'zentrid:cache-recovered',
      'zentrid:mutation-result',
      'zentrid:data-refresh-request',
      'zentrid:security-blocked-navigation',
      'zentrid:csp-violation',
      'zentrid:auth-storage-migrated'
    ];
    names.forEach(name => window.addEventListener(name, event => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      recordEvent(name, detail);
      updatePanel();
    }));
  }

  function mount(): void {
    if (disposed || !document.body) return;
    mountChip();
    if (!['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || '')) {
      const observer = new MutationObserver(() => {
        if (document.querySelector('.topbar-actions')) {
          mountChip();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.FleetRuntimeStability?.registerCleanup?.('release-observability:topbar-observer', () => observer.disconnect());
    }
    void loadManifest();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('error', onWindowError, true);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    window.removeEventListener('online', onConnectivityChanged);
    window.removeEventListener('offline', onConnectivityChanged);
    document.removeEventListener('visibilitychange', onVisibilityChanged);
  }

  window.addEventListener('error', onWindowError, true);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('online', onConnectivityChanged);
  window.addEventListener('offline', onConnectivityChanged);
  document.addEventListener('visibilitychange', onVisibilityChanged);
  window.addEventListener('pagehide', dispose, { once: true });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel && !panel.hidden) closePanel();
  });
  listenToRuntimeEvents();

  const api = {
    snapshot,
    copySafeReport,
    downloadReport,
    openPanel,
    closePanel,
    checkForUpdate,
    clearIssues(): void {
      issues = [];
      incidentNoticeShown = false;
      updateChip();
      updatePanel();
    },
    manifest(): FleetReleaseManifest { return { ...manifest }; }
  };
  window.FleetReleaseObservability = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
