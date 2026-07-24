/* Zentrid registry query state.
   URL parameters are the source of truth for server page/pageSize and current-page UI filters. */
(function () {
  type FleetRegistryEntity = 'clients' | 'plants' | 'devices' | 'alerts';
  type FleetRegistryPatch = Record<string, string | number | boolean | null | undefined>;

  interface FleetRegistryQueryState {
    entity: FleetRegistryEntity;
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc' | '';
    params: Record<string, string>;
  }

  interface FleetRegistryPaginationState {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    server: boolean;
    source?: string;
  }

  interface FleetRegistryUpdateOptions {
    replace?: boolean;
    emit?: boolean;
  }

  const supportedPageSizes = [20, 50, 100];
  const paginationByEntity = new Map<FleetRegistryEntity, FleetRegistryPaginationState>();

  function positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizePageSize(value: unknown): number {
    const parsed = positiveInteger(value, 50);
    return supportedPageSizes.includes(parsed) ? parsed : 50;
  }

  function read(entity: FleetRegistryEntity): FleetRegistryQueryState {
    const search = new URLSearchParams(location.search);
    const params: Record<string, string> = {};
    search.forEach((value, key) => { params[key] = value; });
    const direction = String(search.get('sortDirection') || '').toLowerCase();
    return {
      entity,
      page: positiveInteger(search.get('page'), 1),
      pageSize: normalizePageSize(search.get('pageSize')),
      search: search.get('search') || '',
      sortBy: search.get('sortBy') || '',
      sortDirection: direction === 'asc' || direction === 'desc' ? direction : '',
      params
    };
  }

  function urlForPatch(patch: FleetRegistryPatch): URL {
    const url = new URL(location.href);
    Object.entries(patch).forEach(([key, raw]) => {
      if (raw === undefined) return;
      if (raw === null || raw === '' || raw === false || (key === 'page' && Number(raw) === 1) || (key === 'pageSize' && Number(raw) === 50)) {
        url.searchParams.delete(key);
        return;
      }
      url.searchParams.set(key, String(raw));
    });
    return url;
  }

  function dispatch(entity: FleetRegistryEntity): void {
    window.dispatchEvent(new CustomEvent('zentrid:registry-query-change', {
      detail: { entity, state: read(entity) }
    }));
  }

  function update(entity: FleetRegistryEntity, patch: FleetRegistryPatch, options: FleetRegistryUpdateOptions = {}): FleetRegistryQueryState {
    const url = urlForPatch(patch);
    const method = options.replace === false ? 'pushState' : 'replaceState';
    history[method]({}, '', `${url.pathname}${url.search}${url.hash}`);
    if (options.emit !== false) dispatch(entity);
    return read(entity);
  }

  function setPagination(entity: FleetRegistryEntity, pagination: Partial<FleetRegistryPaginationState>): FleetRegistryPaginationState {
    const query = read(entity);
    const pageSize = normalizePageSize(pagination.pageSize ?? query.pageSize);
    const totalCount = Math.max(0, Number(pagination.totalCount) || 0);
    const totalPages = Math.max(1, Number(pagination.totalPages) || (totalCount ? Math.ceil(totalCount / pageSize) : 1));
    const page = Math.min(Math.max(1, positiveInteger(pagination.page, query.page)), totalPages);
    const state: FleetRegistryPaginationState = {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: pagination.hasPreviousPage ?? page > 1,
      hasNextPage: pagination.hasNextPage ?? page < totalPages,
      server: pagination.server !== false,
      ...(pagination.source ? { source: pagination.source } : {})
    };
    paginationByEntity.set(entity, state);
    return state;
  }

  function pagination(entity: FleetRegistryEntity): FleetRegistryPaginationState | null {
    return paginationByEntity.get(entity) || null;
  }

  function activeCurrentPageFilters(entity: FleetRegistryEntity): string[] {
    const state = read(entity);
    const ignored = new Set(['page', 'pageSize', 'sortBy', 'sortDirection', 'view', 'id']);
    return Object.entries(state.params)
      .filter(([key, value]) => !ignored.has(key) && String(value || '').trim() && String(value).toLowerCase() !== 'all')
      .map(([key]) => key);
  }

  function pagerHtml(entity: FleetRegistryEntity, fallbackTotal = 0): string {
    const state = pagination(entity);
    if (!state) {
      return `<div class="pagination-bar registry-pagination" data-registry-pagination="${entity}"><span>Showing ${fallbackTotal} row(s)</span></div>`;
    }
    const start = state.totalCount ? ((state.page - 1) * state.pageSize) + 1 : 0;
    const end = state.totalCount ? Math.min(state.page * state.pageSize, state.totalCount) : 0;
    const pageOptions = supportedPageSizes.map(size => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size}</option>`).join('');
    return `<div class="pagination-bar registry-pagination" data-registry-pagination="${entity}">
      <span>Showing ${start}-${end} of ${state.totalCount.toLocaleString()}</span>
      <div class="registry-pagination-actions">
        <div class="registry-pagination-group registry-page-size-group">
          <label class="registry-page-size"><span>Rows</span><select data-registry-page-size="${entity}" aria-label="Rows per page">${pageOptions}</select></label>
        </div>
        <div class="registry-pagination-group registry-pagination-nav registry-pagination-nav-start" aria-label="Previous page controls">
          <button type="button" data-registry-page="first" data-registry-entity="${entity}" ${state.hasPreviousPage ? '' : 'disabled'} aria-label="First page">«</button>
          <button type="button" data-registry-page="prev" data-registry-entity="${entity}" ${state.hasPreviousPage ? '' : 'disabled'}>Previous</button>
        </div>
        <div class="registry-pagination-group registry-page-jump-group">
          <label class="registry-page-jump"><span>Page</span><input type="number" min="1" max="${state.totalPages}" value="${state.page}" data-registry-page-jump="${entity}" aria-label="Go to page"></label>
          <strong>of ${state.totalPages.toLocaleString()}</strong>
        </div>
        <div class="registry-pagination-group registry-pagination-nav registry-pagination-nav-end" aria-label="Next page controls">
          <button type="button" data-registry-page="next" data-registry-entity="${entity}" ${state.hasNextPage ? '' : 'disabled'}>Next</button>
          <button type="button" data-registry-page="last" data-registry-entity="${entity}" ${state.hasNextPage ? '' : 'disabled'} aria-label="Last page">»</button>
        </div>
      </div>
    </div>`;
  }

  function filterScopeHtml(entity: FleetRegistryEntity): string {
    const active = activeCurrentPageFilters(entity);
    if (!active.length) return '';
    return `<p class="registry-filter-scope" role="status">Search and filters currently apply to the loaded server page. Active URL state: ${active.join(', ')}.</p>`;
  }

  function requestedPage(entity: FleetRegistryEntity, action: string): number {
    const current = pagination(entity) || setPagination(entity, {});
    if (action === 'first') return 1;
    if (action === 'last') return current.totalPages;
    if (action === 'prev') return Math.max(1, current.page - 1);
    if (action === 'next') return Math.min(current.totalPages, current.page + 1);
    return current.page;
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>('[data-registry-page][data-registry-entity]');
    if (!button || button.hasAttribute('disabled')) return;
    const entity = button.dataset.registryEntity as FleetRegistryEntity;
    const action = button.dataset.registryPage || '';
    update(entity, { page: requestedPage(entity, action) }, { replace: false, emit: true });
  });

  document.addEventListener('change', event => {
    const target = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!target) return;
    const pageSizeEntity = target.dataset.registryPageSize as FleetRegistryEntity | undefined;
    if (pageSizeEntity) {
      update(pageSizeEntity, { page: 1, pageSize: normalizePageSize(target.value) }, { replace: false, emit: true });
      return;
    }
    const jumpEntity = target.dataset.registryPageJump as FleetRegistryEntity | undefined;
    if (jumpEntity) {
      const current = pagination(jumpEntity);
      const page = Math.min(Math.max(1, positiveInteger(target.value, 1)), current?.totalPages || Number.MAX_SAFE_INTEGER);
      update(jumpEntity, { page }, { replace: false, emit: true });
    }
  });

  window.addEventListener('popstate', () => {
    const page = location.pathname.split('/').pop() || '';
    const entity = page === 'clients.html' ? 'clients' : page === 'plants.html' ? 'plants' : page === 'devices.html' ? 'devices' : page === 'alerts.html' ? 'alerts' : null;
    if (entity) dispatch(entity);
  });

  const api = { read, update, setPagination, pagination, pagerHtml, filterScopeHtml, activeCurrentPageFilters, supportedPageSizes };
  window.FleetRegistryQuery = api;
})();
