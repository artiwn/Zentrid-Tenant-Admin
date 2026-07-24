/* Zentrid typed read repositories.
   Endpoint selection, pagination, source merging and DTO mapping live here.
   UI bridges consume normalized repository results instead of raw API payloads. */
(function () {
  type RepositoryRecord = Record<string, FleetLegacyCompat>;
  type RepositoryEntity = 'clients' | 'plants' | 'devices' | 'alerts' | 'integrations';
  type RepositoryIdentity = 'plant' | 'device' | 'alert' | 'generic';

  interface FleetRepositoryMapperContext extends FleetContractMapperContext {
    realDisplayName?(row: RepositoryRecord, entityLabel: string, typeHint?: unknown): string;
  }

  interface FleetRepositoryPagination {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  }

  type FleetRepositoryCacheState = 'network' | 'fresh' | 'stale' | 'persistent';

  interface FleetRepositoryCacheMeta {
    state: FleetRepositoryCacheState;
    key: string;
    ageMs: number;
    cachedAt: number;
    updatedAt: string;
    stale: boolean;
    revalidating: boolean;
    fallback: boolean;
  }

  interface FleetRepositoryListResult {
    entity: RepositoryEntity;
    items: RepositoryRecord[];
    rawItems: RepositoryRecord[];
    source: string;
    errors: unknown[];
    pagination: FleetRepositoryPagination;
    cache?: FleetRepositoryCacheMeta;
  }

  interface FleetRepositoryItemResult extends FleetRepositoryListResult {
    item: RepositoryRecord | null;
  }

  interface FleetRepositoryReadOptions {
    forceRefresh?: boolean;
    maxAgeMs?: number;
    staleMaxAgeMs?: number;
    staleWhileRevalidate?: boolean;
    persist?: boolean;
    requestGroup?: string;
    supersede?: boolean;
    cacheVariant?: string;
    timeoutMs?: number;
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }

  interface FleetRepositoryCacheStats {
    hits: number;
    misses: number;
    deduplicated: number;
    invalidations: number;
    staleHits: number;
    persistentHits: number;
    revalidations: number;
    cancellations: number;
    fallbacks: number;
  }

  interface FleetRepositoryCacheSnapshotEntry extends FleetRepositoryCacheStats {
    entity: RepositoryEntity;
    cached: boolean;
    persistent: boolean;
    inFlight: boolean;
    activeRequests: number;
    ageMs: number | null;
    ttlMs: number;
    staleMaxAgeMs: number;
  }

  interface FleetEntityReadRepository {
    list(options?: FleetRepositoryReadOptions): Promise<FleetRepositoryListResult>;
    get(id: string, options?: FleetRepositoryReadOptions): Promise<FleetRepositoryItemResult>;
  }

  interface FleetIntegrationReadRepository extends FleetEntityReadRepository {
    summary(options?: FleetRepositoryReadOptions): Promise<FleetRepositoryListResult>;
  }

  interface RepositoryCacheEntry {
    entity: RepositoryEntity;
    result: FleetRepositoryListResult;
    cachedAt: number;
    ttlMs: number;
    storage: 'memory' | 'session';
  }

  interface ActiveRepositoryRequest {
    entity: RepositoryEntity;
    key: string;
    group: string;
    controller: AbortController;
  }

  interface RepositoryCollectionPage {
    rows: RepositoryRecord[];
    pagination: FleetRepositoryPagination;
    payload: unknown;
  }

  const DEFAULT_CACHE_TTL_MS: Record<RepositoryEntity, number> = {
    clients: 30_000,
    plants: 15_000,
    devices: 15_000,
    alerts: 10_000,
    integrations: 20_000
  };

  const DEFAULT_STALE_MAX_AGE_MS: Record<RepositoryEntity, number> = {
    clients: 10 * 60_000,
    plants: 5 * 60_000,
    devices: 5 * 60_000,
    alerts: 2 * 60_000,
    integrations: 5 * 60_000
  };

  const PERSISTENT_CACHE_PREFIX = 'zentrid_repository_cache_v127:';
  const MAX_PERSISTED_ENTRY_BYTES = 1_500_000;
  const cacheEntries = new Map<string, RepositoryCacheEntry>();
  const inFlightReads = new Map<string, Promise<FleetRepositoryListResult>>();
  const activeRequests = new Map<string, ActiveRepositoryRequest>();
  const cacheGenerations = new Map<RepositoryEntity, number>();
  const cacheStats = new Map<RepositoryEntity, FleetRepositoryCacheStats>();
  let mapperContext: FleetRepositoryMapperContext | null = null;

  function requireContext(): FleetRepositoryMapperContext {
    if (!mapperContext) throw new Error('FleetAPIRepositories must be configured before reading data.');
    return mapperContext;
  }

  function statsFor(entity: RepositoryEntity): FleetRepositoryCacheStats {
    const existing = cacheStats.get(entity);
    if (existing) return existing;
    const created = {
      hits: 0,
      misses: 0,
      deduplicated: 0,
      invalidations: 0,
      staleHits: 0,
      persistentHits: 0,
      revalidations: 0,
      cancellations: 0,
      fallbacks: 0
    };
    cacheStats.set(entity, created);
    return created;
  }

  function cloneValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime()) as T;
    const source = value as object;
    const existing = seen.get(source);
    if (existing) return existing as T;
    if (Array.isArray(value)) {
      const output: unknown[] = [];
      seen.set(source, output);
      value.forEach(item => output.push(cloneValue(item, seen)));
      return output as T;
    }
    const output: Record<string, unknown> = {};
    seen.set(source, output);
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      output[key] = cloneValue(item, seen);
    });
    return output as T;
  }

  function cloneListResult(result: FleetRepositoryListResult): FleetRepositoryListResult {
    return {
      entity: result.entity,
      items: cloneValue(result.items),
      rawItems: cloneValue(result.rawItems),
      source: result.source,
      errors: result.errors.slice(),
      pagination: { ...result.pagination },
      ...(result.cache ? { cache: { ...result.cache } } : {})
    };
  }

  function normalizedPageOptions(options: FleetRepositoryReadOptions = {}): { page: number; pageSize: number } {
    const page = Number.isFinite(options.page) ? Math.max(1, Math.floor(Number(options.page))) : 1;
    const requestedSize = Number.isFinite(options.pageSize) ? Math.floor(Number(options.pageSize)) : 50;
    const pageSize = [20, 50, 100].includes(requestedSize) ? requestedSize : 50;
    return { page, pageSize };
  }

  function requestCacheKey(entity: RepositoryEntity, options: FleetRepositoryReadOptions = {}): string {
    const { page, pageSize } = normalizedPageOptions(options);
    const variant = String(options.cacheVariant || 'list').trim().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'list';
    return `${entity}|variant=${variant}|page=${page}|pageSize=${pageSize}`;
  }

  function persistentStorage(): Storage | null {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    } catch (_error) {
      return null;
    }
  }

  function persistentKey(key: string): string {
    return `${PERSISTENT_CACHE_PREFIX}${key}`;
  }

  function hasPersistentEntry(key: string): boolean {
    return Boolean(persistentStorage()?.getItem(persistentKey(key)));
  }

  function persistCacheEntry(key: string, entry: RepositoryCacheEntry): void {
    const storage = persistentStorage();
    if (!storage) return;
    try {
      const serializable = {
        entity: entry.entity,
        result: { ...cloneListResult(entry.result), errors: [], cache: undefined },
        cachedAt: entry.cachedAt,
        ttlMs: entry.ttlMs
      };
      const encoded = JSON.stringify(serializable);
      if (encoded.length > MAX_PERSISTED_ENTRY_BYTES) return;
      storage.setItem(persistentKey(key), encoded);
    } catch (_error) {
      // Quota and private-mode storage failures must not block live reads.
    }
  }

  function removePersistentEntries(entity?: RepositoryEntity): void {
    const storage = persistentStorage();
    if (!storage) return;
    const prefix = entity ? persistentKey(`${entity}|`) : PERSISTENT_CACHE_PREFIX;
    try {
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach(key => storage.removeItem(key));
    } catch (_error) {
      // Storage cleanup is best-effort.
    }
  }

  function validPersistedResult(value: unknown): value is FleetRepositoryListResult {
    if (!value || typeof value !== 'object') return false;
    const result = value as Partial<FleetRepositoryListResult>;
    return Array.isArray(result.items)
      && Array.isArray(result.rawItems)
      && Boolean(result.pagination && typeof result.pagination === 'object')
      && typeof result.source === 'string';
  }

  function recoverPersistentEntry(key: string, entity: RepositoryEntity, reason: string): void {
    persistentStorage()?.removeItem(persistentKey(key));
    dispatchRepositoryEvent('zentrid:cache-recovered', { entity, key, reason });
  }

  function hydratePersistentEntry(key: string, entity: RepositoryEntity): RepositoryCacheEntry | null {
    const existing = cacheEntries.get(key);
    if (existing) return existing;
    const storage = persistentStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(persistentKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<RepositoryCacheEntry>;
      const cachedAt = Number(parsed.cachedAt);
      if (parsed.entity !== entity || !validPersistedResult(parsed.result) || !Number.isFinite(cachedAt)) {
        recoverPersistentEntry(key, entity, 'invalid-payload');
        return null;
      }
      if (Date.now() - cachedAt > DEFAULT_STALE_MAX_AGE_MS[entity]) {
        recoverPersistentEntry(key, entity, 'expired');
        return null;
      }
      const hydrated: RepositoryCacheEntry = {
        entity,
        result: parsed.result as FleetRepositoryListResult,
        cachedAt,
        ttlMs: Number(parsed.ttlMs) || DEFAULT_CACHE_TTL_MS[entity],
        storage: 'session'
      };
      cacheEntries.set(key, hydrated);
      return hydrated;
    } catch (_error) {
      recoverPersistentEntry(key, entity, 'invalid-json');
      return null;
    }
  }

  function withCacheMeta(
    result: FleetRepositoryListResult,
    key: string,
    state: FleetRepositoryCacheState,
    cachedAt: number,
    revalidating = false,
    fallback = false
  ): FleetRepositoryListResult {
    const cloned = cloneListResult(result);
    const ageMs = Math.max(0, Date.now() - cachedAt);
    cloned.cache = {
      state,
      key,
      ageMs,
      cachedAt,
      updatedAt: new Date(cachedAt).toISOString(),
      stale: state === 'stale',
      revalidating,
      fallback
    };
    return cloned;
  }

  function dispatchRepositoryEvent(name: string, detail: Record<string, unknown>): void {
    if (typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function entityCacheKeys(entity: RepositoryEntity): string[] {
    const prefix = `${entity}|`;
    return [...new Set([...cacheEntries.keys(), ...inFlightReads.keys()])].filter(key => key.startsWith(prefix));
  }

  function cacheAgeMs(entity: RepositoryEntity, now = Date.now()): number | null {
    const ages = [...cacheEntries.values()]
      .filter(entry => entry.entity === entity)
      .map(entry => Math.max(0, now - entry.cachedAt));
    return ages.length ? Math.min(...ages) : null;
  }

  function cacheGeneration(entity: RepositoryEntity): number {
    return cacheGenerations.get(entity) || 0;
  }

  function invalidateCache(entity?: RepositoryEntity): void {
    const entities = entity ? [entity] : (Object.keys(DEFAULT_CACHE_TTL_MS) as RepositoryEntity[]);
    entities.forEach(name => {
      const keys = entityCacheKeys(name);
      let changed = false;
      keys.forEach(key => {
        changed = cacheEntries.delete(key) || changed;
        changed = inFlightReads.delete(key) || changed;
      });
      removePersistentEntries(name);
      cacheGenerations.set(name, cacheGeneration(name) + 1);
      if (changed || keys.length || hasPersistentEntry(`${name}|page=1|pageSize=50`)) statsFor(name).invalidations += 1;
    });
  }

  function invalidateMany(entities: RepositoryEntity[]): void {
    [...new Set(entities)].forEach(entity => invalidateCache(entity));
  }

  function mutationEntities(event: Event): RepositoryEntity[] {
    const detail = (event as CustomEvent<{ entities?: unknown }>).detail;
    if (!detail || !Array.isArray(detail.entities)) return [];
    const allowed = new Set<RepositoryEntity>(Object.keys(DEFAULT_CACHE_TTL_MS) as RepositoryEntity[]);
    return detail.entities.filter((value): value is RepositoryEntity => typeof value === 'string' && allowed.has(value as RepositoryEntity));
  }

  function cacheSnapshot(entity?: RepositoryEntity): FleetRepositoryCacheSnapshotEntry[] {
    const now = Date.now();
    const entities = entity ? [entity] : (Object.keys(DEFAULT_CACHE_TTL_MS) as RepositoryEntity[]);
    return entities.map(name => {
      const stats = statsFor(name);
      const keys = entityCacheKeys(name);
      return {
        entity: name,
        cached: keys.some(key => cacheEntries.has(key)),
        persistent: keys.some(key => hasPersistentEntry(key)),
        inFlight: keys.some(key => inFlightReads.has(key)),
        activeRequests: [...activeRequests.values()].filter(request => request.entity === name).length,
        ageMs: cacheAgeMs(name, now),
        ttlMs: DEFAULT_CACHE_TTL_MS[name],
        staleMaxAgeMs: DEFAULT_STALE_MAX_AGE_MS[name],
        ...stats
      };
    });
  }

  function linkedAbortController(signal?: AbortSignal): { controller: AbortController; cleanup: () => void } {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, { once: true });
    return {
      controller,
      cleanup: () => signal?.removeEventListener('abort', abort)
    };
  }

  function startNetworkRead(
    entity: RepositoryEntity,
    key: string,
    loader: (signal: AbortSignal) => Promise<FleetRepositoryListResult>,
    options: FleetRepositoryReadOptions,
    notify: boolean
  ): Promise<FleetRepositoryListResult> {
    const existing = inFlightReads.get(key);
    if (existing) {
      statsFor(entity).deduplicated += 1;
      return existing.then(cloneListResult);
    }

    const group = String(options.requestGroup || '').trim();
    if (group && options.supersede !== false) {
      const active = activeRequests.get(group);
      if (active && active.key !== key && !active.controller.signal.aborted) {
        active.controller.abort();
        statsFor(active.entity).cancellations += 1;
      }
    }

    const linked = linkedAbortController(options.signal);
    if (group) activeRequests.set(group, { entity, key, group, controller: linked.controller });
    const requestGeneration = cacheGeneration(entity);
    const request = loader(linked.controller.signal)
      .then(result => {
        const cachedAt = Date.now();
        if (cacheGeneration(entity) === requestGeneration) {
          const entry: RepositoryCacheEntry = {
            entity,
            result: cloneListResult(result),
            cachedAt,
            ttlMs: DEFAULT_CACHE_TTL_MS[entity],
            storage: 'memory'
          };
          cacheEntries.set(key, entry);
          if (options.persist !== false) persistCacheEntry(key, entry);
        }
        const networkResult = withCacheMeta(result, key, 'network', cachedAt);
        if (notify) dispatchRepositoryEvent('zentrid:repository-updated', {
          entity,
          key,
          result: cloneListResult(networkResult),
          reason: 'revalidated'
        });
        return networkResult;
      })
      .catch(error => {
        if (notify) dispatchRepositoryEvent('zentrid:repository-refresh-error', {
          entity,
          key,
          error,
          reason: 'revalidate-failed'
        });
        throw error;
      })
      .finally(() => {
        linked.cleanup();
        if (inFlightReads.get(key) === request) inFlightReads.delete(key);
        if (group && activeRequests.get(group)?.controller === linked.controller) activeRequests.delete(group);
      });
    inFlightReads.set(key, request);
    return request.then(cloneListResult);
  }

  async function readThroughCache(
    entity: RepositoryEntity,
    loader: (signal: AbortSignal) => Promise<FleetRepositoryListResult>,
    options: FleetRepositoryReadOptions = {}
  ): Promise<FleetRepositoryListResult> {
    const stats = statsFor(entity);
    const now = Date.now();
    const maxAgeMs = Number.isFinite(options.maxAgeMs)
      ? Math.max(0, Number(options.maxAgeMs))
      : DEFAULT_CACHE_TTL_MS[entity];
    const staleMaxAgeMs = Number.isFinite(options.staleMaxAgeMs)
      ? Math.max(maxAgeMs, Number(options.staleMaxAgeMs))
      : DEFAULT_STALE_MAX_AGE_MS[entity];
    const key = requestCacheKey(entity, options);
    const cached = cacheEntries.get(key) || (options.persist === false ? null : hydratePersistentEntry(key, entity));
    const ageMs = cached ? Math.max(0, now - cached.cachedAt) : Number.POSITIVE_INFINITY;

    if (!options.forceRefresh && cached && ageMs <= maxAgeMs) {
      stats.hits += 1;
      if (cached.storage === 'session') {
        stats.persistentHits += 1;
        if (options.staleWhileRevalidate && !inFlightReads.has(key)) {
          stats.revalidations += 1;
          void startNetworkRead(entity, key, loader, options, true).catch(() => undefined);
          return withCacheMeta(cached.result, key, 'persistent', cached.cachedAt, true);
        }
        return withCacheMeta(cached.result, key, 'persistent', cached.cachedAt);
      }
      return withCacheMeta(cached.result, key, 'fresh', cached.cachedAt);
    }

    if (!options.forceRefresh && cached && ageMs <= staleMaxAgeMs && options.staleWhileRevalidate) {
      stats.staleHits += 1;
      if (cached.storage === 'session') stats.persistentHits += 1;
      const alreadyRefreshing = inFlightReads.has(key);
      if (!alreadyRefreshing) {
        stats.revalidations += 1;
        void startNetworkRead(entity, key, loader, options, true).catch(() => undefined);
      } else {
        stats.deduplicated += 1;
      }
      return withCacheMeta(cached.result, key, 'stale', cached.cachedAt, true);
    }

    stats.misses += 1;
    try {
      return await startNetworkRead(entity, key, loader, options, false);
    } catch (error) {
      if (cached && ageMs <= staleMaxAgeMs && String((error as { code?: unknown })?.code || '').toUpperCase() !== 'ABORTED') {
        stats.fallbacks += 1;
        const fallback = withCacheMeta(cached.result, key, 'stale', cached.cachedAt, false, true);
        fallback.errors = [...fallback.errors, error];
        return fallback;
      }
      throw error;
    }
  }

  function asArray(value: unknown): RepositoryRecord[] {
    if (Array.isArray(value)) return value as RepositoryRecord[];
    if (!value || typeof value !== 'object') return [];
    const payload = value as RepositoryRecord;
    const keys = ['items', 'data', 'records', 'rows', 'results', 'content', 'value', 'values'];
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key] as RepositoryRecord[];
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

  function collectionTotal(payload: unknown): number {
    const data = payload as RepositoryRecord;
    const values = [data?.total, data?.totalCount, data?.totalItems, data?.totalRecords, data?.count, data?.pagination?.total, data?.meta?.total];
    const total = values.map(Number).find(value => Number.isFinite(value) && value > 0);
    return total || 0;
  }

  function collectionPageSize(payload: unknown, fallback: number): number {
    const data = payload as RepositoryRecord;
    const values = [data?.pageSize, data?.size, data?.limit, data?.take, data?.pagination?.pageSize, data?.meta?.pageSize];
    const size = values.map(Number).find(value => Number.isFinite(value) && value > 0);
    return size || fallback;
  }

  function collectionTotalPages(payload: unknown, rowCount: number, fallbackSize: number): number {
    const data = payload as RepositoryRecord;
    const values = [data?.totalPages, data?.pages, data?.pageCount, data?.pagination?.totalPages, data?.meta?.totalPages];
    const explicit = values.map(Number).find(value => Number.isFinite(value) && value > 0);
    if (explicit) return explicit;
    const total = collectionTotal(payload);
    const size = collectionPageSize(payload, fallbackSize || rowCount || 1);
    return total && size ? Math.ceil(total / size) : 1;
  }

  function identityValues(row: RepositoryRecord, entity: RepositoryIdentity = 'generic'): string[] {
    const context = requireContext();
    const plantKeys = ['sourcePlantId','plantId','externalId','plantCode','code','id','canonicalId','sourceEntityId','vendorPlantId','vendorExtensions.sourcePlantId','vendorExtensions.plantId','vendorExtensions.externalId'];
    const deviceKeys = ['sourceDeviceId','deviceId','externalId','serialNumber','serial','registrationNumber','code','id','canonicalId','sourceEntityId','vendorDeviceId','vendorExtensions.sourceDeviceId','vendorExtensions.deviceId','vendorExtensions.serialNumber'];
    const alertKeys = ['sourceAlertId','alertId','eventId','code','id','canonicalId','sourceEntityId','vendorExtensions.sourceAlertId'];
    const keys = entity === 'plant' ? plantKeys : entity === 'device' ? deviceKeys : entity === 'alert' ? alertKeys : [...plantKeys, ...deviceKeys, ...alertKeys];
    const values = keys
      .map(key => context.firstOf(row, [key], ''))
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value).trim());
    return [...new Set(values.filter(Boolean))];
  }

  function rowsShareIdentity(a: RepositoryRecord, b: RepositoryRecord, entity: RepositoryIdentity): boolean {
    const left = identityValues(a, entity).map(value => value.toLowerCase());
    const right = new Set(identityValues(b, entity).map(value => value.toLowerCase()));
    return left.some(value => right.has(value));
  }

  function uniqueByIdentity(rows: RepositoryRecord[], entity: RepositoryIdentity = 'generic'): RepositoryRecord[] {
    const output: RepositoryRecord[] = [];
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const key = identityValues(row, entity)[0] || `${entity}-${index}`;
      const normalized = String(key).trim().toLowerCase();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      output.push(row);
    });
    return output;
  }

  function realDisplayName(row: RepositoryRecord, entityLabel: string, typeHint?: unknown): string {
    const context = requireContext();
    return context.realDisplayName ? context.realDisplayName(row, entityLabel, typeHint) : '';
  }

  function mergePlantSources(liveRows: RepositoryRecord[], adminRows: RepositoryRecord[]): RepositoryRecord[] {
    const usedAdmin = new Set<number>();
    const merged = liveRows.map(liveRow => {
      const adminIndex = adminRows.findIndex(adminRow => rowsShareIdentity(liveRow, adminRow, 'plant'));
      if (adminIndex < 0) return liveRow;
      usedAdmin.add(adminIndex);
      const adminRow = adminRows[adminIndex];
      if (!adminRow) return liveRow;
      return {
        ...adminRow,
        ...liveRow,
        adminRecord: adminRow,
        liveRecord: liveRow,
        adminName: realDisplayName(adminRow, 'Plant', 'Plant'),
        liveName: realDisplayName(liveRow, 'Plant', 'Plant'),
        vendorExtensions: { ...(adminRow.vendorExtensions || {}), ...(liveRow.vendorExtensions || {}) }
      };
    });
    adminRows.forEach((adminRow, index) => {
      if (!usedAdmin.has(index)) {
        merged.push({ ...adminRow, adminRecord: adminRow, adminName: realDisplayName(adminRow, 'Plant', 'Plant') });
      }
    });
    return uniqueByIdentity(merged, 'plant');
  }

  function collectionPageNumber(payload: unknown, fallback: number): number {
    const data = payload as RepositoryRecord;
    const values = [data?.page, data?.pageNumber, data?.currentPage, data?.pagination?.page, data?.meta?.page];
    const page = values.map(Number).find(value => Number.isFinite(value) && value > 0);
    return page || fallback;
  }

  function collectionBoolean(payload: unknown, keys: string[], fallback: boolean): boolean {
    const data = payload as RepositoryRecord;
    for (const key of keys) {
      let value: unknown = data;
      for (const part of key.split('.')) {
        if (!value || typeof value !== 'object') { value = undefined; break; }
        value = (value as RepositoryRecord)[part];
      }
      if (typeof value === 'boolean') return value;
    }
    return fallback;
  }

  function paginationFromPayload(payload: unknown, rowCount: number, options: FleetRepositoryReadOptions = {}): FleetRepositoryPagination {
    const requested = normalizedPageOptions(options);
    const pageSize = collectionPageSize(payload, requested.pageSize || rowCount || 1);
    const totalCount = collectionTotal(payload) || rowCount;
    const totalPages = collectionTotalPages(payload, rowCount, pageSize);
    const page = Math.min(Math.max(1, collectionPageNumber(payload, requested.page)), Math.max(1, totalPages));
    return {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: collectionBoolean(payload, ['hasPreviousPage', 'pagination.hasPreviousPage', 'meta.hasPreviousPage'], page > 1),
      hasNextPage: collectionBoolean(payload, ['hasNextPage', 'pagination.hasNextPage', 'meta.hasNextPage'], page < totalPages)
    };
  }

  function fallbackPagination(rowCount: number, options: FleetRepositoryReadOptions = {}): FleetRepositoryPagination {
    const requested = normalizedPageOptions(options);
    const totalPages = Math.max(1, Math.ceil(rowCount / requested.pageSize));
    const page = Math.min(requested.page, totalPages);
    return {
      page,
      pageSize: requested.pageSize,
      totalCount: rowCount,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    };
  }

  async function fetchCollectionPage(
    path: string,
    direct: (options?: ZentridRequestOptions) => Promise<unknown>,
    entity: RepositoryIdentity = 'generic',
    options: FleetRepositoryReadOptions = {}
  ): Promise<RepositoryCollectionPage> {
    const { page, pageSize } = normalizedPageOptions(options);
    const requestOptions: ZentridRequestOptions = {
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.signal ? { signal: options.signal } : {})
    };
    let payload: unknown = null;
    let successfulResponse = false;
    let lastError: unknown = null;

    try {
      payload = await FleetAPI.request(`${path}?page=${page}&size=${pageSize}`, requestOptions);
      successfulResponse = true;
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted) throw error;
      try {
        payload = await direct(requestOptions);
        successfulResponse = true;
      } catch (directError) {
        lastError = directError;
      }
    }

    if (!successfulResponse) throw lastError || new Error(`${path} did not return a response.`);
    const rows = uniqueByIdentity(asArray(payload), entity);
    return { rows, pagination: paginationFromPayload(payload, rows.length, options), payload };
  }

  function mappedResult(
    entity: RepositoryEntity,
    rawItems: RepositoryRecord[],
    source: string,
    errors: unknown[] = [],
    pagination: FleetRepositoryPagination = fallbackPagination(rawItems.length)
  ): FleetRepositoryListResult {
    const contract = FleetAPIContracts[entity];
    return {
      entity,
      items: contract.mapList(rawItems, requireContext()),
      rawItems,
      source,
      errors,
      pagination
    };
  }

  function itemMatches(item: RepositoryRecord, id: string): boolean {
    const expected = String(id || '').trim().toLowerCase();
    if (!expected) return false;
    const candidates = [
      item.id, item.externalId, item.code, item.serial, item.fleetCode, item.vendorCode,
      item.raw?.id, item.raw?.sourceEntityId, item.raw?.sourcePlantId, item.raw?.sourceDeviceId, item.raw?.sourceAlertId
    ];
    return candidates.some(value => value !== undefined && value !== null && String(value).trim().toLowerCase() === expected);
  }

  function withGet(
    entity: RepositoryEntity,
    loader: (options?: FleetRepositoryReadOptions) => Promise<FleetRepositoryListResult>
  ): FleetEntityReadRepository {
    const list = (options: FleetRepositoryReadOptions = {}): Promise<FleetRepositoryListResult> =>
      readThroughCache(entity, signal => loader({ ...options, signal }), options);
    return {
      list,
      async get(id: string, options?: FleetRepositoryReadOptions): Promise<FleetRepositoryItemResult> {
        const result = await list(options);
        return { ...result, item: result.items.find(item => itemMatches(item, id)) || null };
      }
    };
  }

  const clientList = (options: FleetRepositoryReadOptions = {}): Promise<FleetRepositoryListResult> =>
    readThroughCache('clients', async signal => {
      const page = await fetchCollectionPage('/api/admin/clients', () => ZentridPlatformAPI.clients.list(), 'generic', { ...options, signal });
      return mappedResult('clients', page.rows, '/api/admin/clients', [], page.pagination);
    }, options);

  function singleRecordPayload(value: unknown): RepositoryRecord | null {
    if (Array.isArray(value)) return (value[0] as RepositoryRecord | undefined) || null;
    if (!value || typeof value !== 'object') return null;
    const row = value as RepositoryRecord;
    for (const key of ['item', 'data', 'result', 'record', 'value']) {
      const nested = row[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as RepositoryRecord;
      if (Array.isArray(nested) && nested[0] && typeof nested[0] === 'object') return nested[0] as RepositoryRecord;
    }
    return row;
  }

  const clients: FleetEntityReadRepository = {
    list: clientList,
    async get(id: string, options: FleetRepositoryReadOptions = {}): Promise<FleetRepositoryItemResult> {
      const cleanId = String(id || '').trim();
      if (!cleanId) {
        const result = await clientList(options);
        return { ...result, item: result.items[0] || null };
      }
      const detailSource = `/api/admin/clients/${encodeURIComponent(cleanId)}`;
      try {
        const detailOptions: FleetRepositoryReadOptions = { ...options, cacheVariant: `detail:${cleanId}` };
        const direct = await readThroughCache('clients', async () => {
          const payload = await ZentridPlatformAPI.clients.get(cleanId);
          const row = singleRecordPayload(payload);
          return mappedResult('clients', row ? [row] : [], detailSource, [], fallbackPagination(row ? 1 : 0, { ...detailOptions, page: 1, pageSize: 1 }));
        }, detailOptions);
        return { ...direct, item: direct.items[0] || null };
      } catch (directError) {
        const fallback = await clientList({ ...options, page: 1, pageSize: Math.max(100, Number(options.pageSize || 0)), cacheVariant: `detail-list:${cleanId}` });
        return {
          ...fallback,
          source: `${detailSource} → ${fallback.source}`,
          errors: [directError, ...fallback.errors],
          item: fallback.items.find(item => itemMatches(item, cleanId)) || null
        };
      }
    }
  };



  function selectPlantPagination(livePage: RepositoryCollectionPage | null, adminPage: RepositoryCollectionPage | null, rowCount: number, options: FleetRepositoryReadOptions): FleetRepositoryPagination {
    const candidates = [adminPage?.pagination, livePage?.pagination].filter((value): value is FleetRepositoryPagination => Boolean(value));
    if (!candidates.length) return fallbackPagination(rowCount, options);
    const requested = normalizedPageOptions(options);
    const totalCount = Math.max(...candidates.map(item => item.totalCount), rowCount);
    const pageSize = candidates.find(item => item.pageSize)?.pageSize || requested.pageSize;
    const totalPages = Math.max(...candidates.map(item => item.totalPages), Math.ceil(totalCount / pageSize), 1);
    const page = Math.min(Math.max(1, candidates[0]?.page || requested.page), totalPages);
    return {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    };
  }

  const plants = withGet('plants', async options => {
    const [liveResult, adminResult] = await Promise.allSettled([
      fetchCollectionPage('/api/plants', requestOptions => ZentridPlatformAPI.live.plants(requestOptions), 'plant', options),
      fetchCollectionPage('/api/admin/plants', () => ZentridPlatformAPI.plantRegistry.list(), 'plant', options)
    ]);
    const livePage = liveResult.status === 'fulfilled' ? liveResult.value : null;
    const adminPage = adminResult.status === 'fulfilled' ? adminResult.value : null;
    const liveRows = livePage?.rows || [];
    const adminRows = adminPage?.rows || [];
    const errors = [liveResult, adminResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);
    const requested = normalizedPageOptions(options);
    const mergedRows = mergePlantSources(liveRows, adminRows);
    const rawItems = mergedRows.slice(0, requested.pageSize);
    const source = liveRows.length && adminRows.length
      ? '/api/plants + /api/admin/plants'
      : liveRows.length ? '/api/plants' : adminRows.length ? '/api/admin/plants' : '/api/plants + /api/admin/plants';
    const pagination = selectPlantPagination(livePage, adminPage, rawItems.length, options || {});
    return mappedResult('plants', rawItems, source, errors, pagination);
  });

  const devices = withGet('devices', async options => {
    const page = await fetchCollectionPage('/api/devices', requestOptions => ZentridPlatformAPI.live.devices(requestOptions), 'device', options);
    return mappedResult('devices', page.rows, '/api/devices', [], page.pagination);
  });

  const alerts = withGet('alerts', async options => {
    const page = await fetchCollectionPage('/api/alerts', requestOptions => ZentridPlatformAPI.live.alerts(requestOptions), 'alert', options);
    return mappedResult('alerts', page.rows, '/api/alerts', [], page.pagination);
  });

  const integrationRegistry = withGet('integrations', async options => {
    const page = await fetchCollectionPage('/api/admin/provider-integrations', () => ZentridPlatformAPI.providerIntegrations.list(), 'generic', options);
    return mappedResult('integrations', page.rows, '/api/admin/provider-integrations', [], page.pagination);
  });

  const integrations: FleetIntegrationReadRepository = {
    ...integrationRegistry,
    async summary(options: FleetRepositoryReadOptions = {}): Promise<FleetRepositoryListResult> {
      const readOptions: FleetRepositoryReadOptions = {
        ...options,
        cacheVariant: 'summary',
        staleWhileRevalidate: options.staleWhileRevalidate !== false,
        persist: options.persist !== false,
        requestGroup: options.requestGroup || 'background:integration-summary',
        supersede: options.supersede !== false
      };
      return readThroughCache('integrations', async signal => {
        const page = await fetchCollectionPage(
          '/api/integrations',
          requestOptions => ZentridPlatformAPI.live.integrations(requestOptions),
          'generic',
          { ...readOptions, signal }
        );
        return mappedResult('integrations', page.rows, '/api/integrations', [], page.pagination);
      }, readOptions);
    }
  };

  const api = {
    configure(context: FleetRepositoryMapperContext): void {
      if (mapperContext && mapperContext !== context) invalidateCache();
      mapperContext = context;
    },
    isConfigured(): boolean {
      return Boolean(mapperContext);
    },
    cache: {
      invalidate(entity?: RepositoryEntity): void {
        invalidateCache(entity);
      },
      invalidateMany(entities: RepositoryEntity[]): void {
        invalidateMany(entities);
      },
      snapshot(entity?: RepositoryEntity): FleetRepositoryCacheSnapshotEntry[] {
        return cacheSnapshot(entity);
      },
      clearPersistent(entity?: RepositoryEntity): void {
        removePersistentEntries(entity);
      }
    },
    coordinator: {
      cancel(group: string): void {
        const active = activeRequests.get(String(group || '').trim());
        if (!active || active.controller.signal.aborted) return;
        active.controller.abort();
        statsFor(active.entity).cancellations += 1;
      },
      cancelAll(): void {
        activeRequests.forEach(active => {
          if (active.controller.signal.aborted) return;
          active.controller.abort();
          statsFor(active.entity).cancellations += 1;
        });
        activeRequests.clear();
      },
      snapshot(): Array<{ group: string; entity: RepositoryEntity; key: string; aborted: boolean }> {
        return [...activeRequests.values()].map(request => ({
          group: request.group,
          entity: request.entity,
          key: request.key,
          aborted: request.controller.signal.aborted
        }));
      }
    },
    clients,
    plants,
    devices,
    alerts,
    integrations
  };

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('zentrid:auth', () => invalidateCache());
    window.addEventListener('zentrid:session-expired', () => invalidateCache());
    window.addEventListener('zentrid:data-mutated', event => invalidateMany(mutationEntities(event)));
    window.addEventListener('pagehide', () => api.coordinator.cancelAll(), { once: true });
  }

  window.FleetAPIRepositories = api;
})();
