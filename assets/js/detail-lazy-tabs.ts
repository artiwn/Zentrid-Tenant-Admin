(() => {
  type DetailLazyStatus = 'idle' | 'loading' | 'loaded' | 'error';
  type DetailLazyLoader = () => Promise<void> | void;
  type DetailLazyResourceDefinition = {
    key: string;
    tabs: string[];
    label: string;
    description?: string;
    loader: DetailLazyLoader;
  };
  type DetailLazyResourceState = DetailLazyResourceDefinition & {
    status: DetailLazyStatus;
    errorMessage: string;
    promise: Promise<void> | null;
  };
  type DetailLazyPageState = {
    resources: Map<string, DetailLazyResourceState>;
    tabToResource: Map<string, string>;
    observers: Map<string, () => void>;
  };

  const pages = new Map<string, DetailLazyPageState>();

  function pageState(page: string): DetailLazyPageState {
    const normalized = String(page || '').trim().toLowerCase();
    const existing = pages.get(normalized);
    if (existing) return existing;
    const created: DetailLazyPageState = {
      resources: new Map(),
      tabToResource: new Map(),
      observers: new Map()
    };
    pages.set(normalized, created);
    return created;
  }

  function message(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Unable to load this section.');
    return String(error || 'Unable to load this section.');
  }

  function escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function notify(page: string, resource: DetailLazyResourceState): void {
    const state = pageState(page);
    state.observers.forEach(callback => {
      try { callback(); } catch (error) { console.warn('Zentrid lazy detail observer failed.', error); }
    });
    document.dispatchEvent(new CustomEvent('zentrid:detail-lazy-state', {
      detail: {
        page,
        resource: resource.key,
        status: resource.status,
        errorMessage: resource.errorMessage
      }
    }));
  }

  function register(page: string, definitions: DetailLazyResourceDefinition[]): void {
    const state = pageState(page);
    definitions.forEach(definition => {
      const key = String(definition.key || '').trim();
      if (!key) return;
      const previous = state.resources.get(key);
      const resource: DetailLazyResourceState = previous
        ? { ...previous, ...definition, tabs: [...definition.tabs] }
        : { ...definition, tabs: [...definition.tabs], status: 'idle', errorMessage: '', promise: null };
      state.resources.set(key, resource);
      definition.tabs.forEach(tab => state.tabToResource.set(String(tab), key));
    });
  }

  function resourceFor(page: string, tabOrResource: string): DetailLazyResourceState | null {
    const state = pageState(page);
    const direct = state.resources.get(tabOrResource);
    if (direct) return direct;
    const key = state.tabToResource.get(tabOrResource);
    return key ? state.resources.get(key) || null : null;
  }

  async function load(page: string, tabOrResource: string, force = false): Promise<void> {
    const resource = resourceFor(page, tabOrResource);
    if (!resource) return;
    if (!force && resource.status === 'loaded') return;
    if (!force && resource.promise) return resource.promise;

    resource.status = 'loading';
    resource.errorMessage = '';
    notify(page, resource);

    const promise = Promise.resolve()
      .then(() => resource.loader())
      .then(() => {
        resource.status = 'loaded';
        resource.errorMessage = '';
      })
      .catch(error => {
        resource.status = 'error';
        resource.errorMessage = message(error);
      })
      .finally(() => {
        resource.promise = null;
        notify(page, resource);
      });
    resource.promise = promise;
    return promise;
  }

  function activate(page: string, tab: string): void {
    void load(page, tab);
  }

  function snapshot(page: string, tabOrResource: string): FleetDetailLazySnapshot | null {
    const resource = resourceFor(page, tabOrResource);
    if (!resource) return null;
    return {
      page,
      resource: resource.key,
      label: resource.label,
      status: resource.status,
      errorMessage: resource.errorMessage
    };
  }

  function panel(page: string, tab: string, content: string): string {
    const state = snapshot(page, tab);
    if (!state) return content;
    const pageAttr = escapeHtml(page);
    const resourceAttr = escapeHtml(state.resource);
    const label = escapeHtml(state.label);
    if (state.status === 'loaded') {
      return `<section class="detail-lazy-panel loaded" data-detail-lazy-page="${pageAttr}" data-detail-lazy-resource="${resourceAttr}" data-detail-lazy-status="loaded"><div class="detail-lazy-status-line"><span class="detail-lazy-dot"></span><small>${label} loaded on demand</small></div>${content}</section>`;
    }
    if (state.status === 'error') {
      return `<section class="detail-lazy-panel error" data-detail-lazy-page="${pageAttr}" data-detail-lazy-resource="${resourceAttr}" data-detail-lazy-status="error" role="alert"><div class="detail-lazy-state-card"><span class="detail-lazy-icon">!</span><div><strong>${label} could not be loaded</strong><small>${escapeHtml(state.errorMessage || 'The optional section request failed.')}</small></div><button type="button" class="secondary-action" data-detail-lazy-retry="${resourceAttr}" data-detail-lazy-page="${pageAttr}">Retry</button></div></section>`;
    }
    const loading = state.status === 'loading';
    return `<section class="detail-lazy-panel ${loading ? 'loading' : 'idle'}" data-detail-lazy-page="${pageAttr}" data-detail-lazy-resource="${resourceAttr}" data-detail-lazy-status="${loading ? 'loading' : 'idle'}" aria-busy="${loading ? 'true' : 'false'}"><div class="detail-lazy-state-card"><span class="detail-lazy-icon">${loading ? '↻' : '○'}</span><div><strong>${loading ? `Loading ${label}` : `${label} loads when opened`}</strong><small>${loading ? 'The main detail record remains available while this section loads.' : 'Open this section to request only the related data it needs.'}</small></div>${loading ? '<span class="detail-lazy-spinner" aria-hidden="true"></span>' : `<button type="button" class="secondary-action" data-detail-lazy-retry="${resourceAttr}" data-detail-lazy-page="${pageAttr}">Load section</button>`}</div></section>`;
  }

  function observe(page: string, key: string, callback: () => void): void {
    pageState(page).observers.set(key, callback);
  }

  function unobserve(page: string, key: string): void {
    pages.get(String(page || '').trim().toLowerCase())?.observers.delete(key);
  }

  function dispose(page?: string): void {
    if (page) {
      pages.delete(String(page).trim().toLowerCase());
      return;
    }
    pages.clear();
  }

  function reset(page: string, resourceKey?: string): void {
    const state = pageState(page);
    const resources = resourceKey ? [state.resources.get(resourceKey)].filter(Boolean) as DetailLazyResourceState[] : [...state.resources.values()];
    resources.forEach(resource => {
      resource.status = 'idle';
      resource.errorMessage = '';
      resource.promise = null;
      notify(page, resource);
    });
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const retry = target.closest<HTMLElement>('[data-detail-lazy-retry][data-detail-lazy-page]');
    if (!retry) return;
    const page = retry.dataset.detailLazyPage || '';
    const resource = retry.dataset.detailLazyRetry || '';
    if (page && resource) void load(page, resource, true);
  });

  if (typeof window.addEventListener === 'function') window.addEventListener('pagehide', () => dispose(), { once: true });

  const api: FleetDetailLazyTabsApi = { register, activate, load, snapshot, panel, observe, unobserve, reset, dispose };
  window.FleetDetailLazyTabs = api;
})();
