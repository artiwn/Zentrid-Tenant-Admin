"use strict";
/* Zentrid typed read repositories.
   Endpoint selection, pagination, source merging and DTO mapping live here.
   UI bridges consume normalized repository results instead of raw API payloads. */
(function () {
    const DEFAULT_CACHE_TTL_MS = {
        clients: 30_000,
        tenants: 30_000,
        plants: 15_000,
        devices: 15_000,
        alerts: 10_000,
        telemetry: 10_000,
        integrations: 20_000
    };
    const DEFAULT_STALE_MAX_AGE_MS = {
        clients: 10 * 60_000,
        tenants: 10 * 60_000,
        plants: 5 * 60_000,
        devices: 5 * 60_000,
        alerts: 2 * 60_000,
        telemetry: 2 * 60_000,
        integrations: 5 * 60_000
    };
    const PERSISTENT_CACHE_PREFIX = 'zentrid_repository_cache_v127:';
    const MAX_PERSISTED_ENTRY_BYTES = 1_500_000;
    const cacheEntries = new Map();
    const inFlightReads = new Map();
    const activeRequests = new Map();
    const cacheGenerations = new Map();
    const cacheStats = new Map();
    let mapperContext = null;
    function requireContext() {
        if (!mapperContext)
            throw new Error('ZentridAPIRepositories must be configured before reading data.');
        return mapperContext;
    }
    function statsFor(entity) {
        const existing = cacheStats.get(entity);
        if (existing)
            return existing;
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
    function cloneValue(value, seen = new WeakMap()) {
        if (value === null || typeof value !== 'object')
            return value;
        if (value instanceof Date)
            return new Date(value.getTime());
        const source = value;
        const existing = seen.get(source);
        if (existing)
            return existing;
        if (Array.isArray(value)) {
            const output = [];
            seen.set(source, output);
            value.forEach(item => output.push(cloneValue(item, seen)));
            return output;
        }
        const output = {};
        seen.set(source, output);
        Object.entries(value).forEach(([key, item]) => {
            output[key] = cloneValue(item, seen);
        });
        return output;
    }
    function cloneListResult(result) {
        return {
            entity: result.entity,
            items: cloneValue(result.items),
            rawItems: cloneValue(result.rawItems),
            source: result.source,
            errors: result.errors.slice(),
            pagination: { ...result.pagination },
            ...(result.kpi ? { kpi: cloneValue(result.kpi) } : {}),
            ...(result.cache ? { cache: { ...result.cache } } : {})
        };
    }
    function normalizedPageOptions(options = {}) {
        const page = Number.isFinite(options.page) ? Math.max(1, Math.floor(Number(options.page))) : 1;
        const requestedSize = Number.isFinite(options.pageSize) ? Math.floor(Number(options.pageSize)) : 50;
        const pageSize = [20, 50, 100].includes(requestedSize) ? requestedSize : 50;
        return { page, pageSize };
    }
    function requestCacheKey(entity, options = {}) {
        const { page, pageSize } = normalizedPageOptions(options);
        const variant = String(options.cacheVariant || 'list').trim().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'list';
        const sortBy = String(options.sortBy || '').trim();
        const sortDirection = options.sortDirection === 'asc' || options.sortDirection === 'desc' ? options.sortDirection : '';
        const queryIdentityKeys = [
            'search', 'deviceType', 'deviceStatus', 'plantId', 'deviceId', 'metric', 'tenantId',
            'severity', 'alertStatus', 'status', 'tenant', 'plant', 'vendor', 'cursor', 'format'
        ];
        const queryIdentity = queryIdentityKeys
            .map(key => [String(key), String(options[key] ?? '').trim()])
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        return `${entity}|variant=${variant}|page=${page}|pageSize=${pageSize}|sortBy=${encodeURIComponent(sortBy)}|sortDirection=${sortDirection}|query=${queryIdentity}`;
    }
    function persistentStorage() {
        try {
            return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
        }
        catch (_error) {
            return null;
        }
    }
    function persistentKey(key) {
        return `${PERSISTENT_CACHE_PREFIX}${key}`;
    }
    function hasPersistentEntry(key) {
        return Boolean(persistentStorage()?.getItem(persistentKey(key)));
    }
    function persistCacheEntry(key, entry) {
        const storage = persistentStorage();
        if (!storage)
            return;
        try {
            const serializable = {
                entity: entry.entity,
                result: { ...cloneListResult(entry.result), errors: [], cache: undefined },
                cachedAt: entry.cachedAt,
                ttlMs: entry.ttlMs
            };
            const encoded = JSON.stringify(serializable);
            if (encoded.length > MAX_PERSISTED_ENTRY_BYTES)
                return;
            storage.setItem(persistentKey(key), encoded);
        }
        catch (_error) {
            // Quota and private-mode storage failures must not block live reads.
        }
    }
    function removePersistentEntries(entity) {
        const storage = persistentStorage();
        if (!storage)
            return;
        const prefix = entity ? persistentKey(`${entity}|`) : PERSISTENT_CACHE_PREFIX;
        try {
            const keys = [];
            for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index);
                if (key?.startsWith(prefix))
                    keys.push(key);
            }
            keys.forEach(key => storage.removeItem(key));
        }
        catch (_error) {
            // Storage cleanup is best-effort.
        }
    }
    function validPersistedResult(value) {
        if (!value || typeof value !== 'object')
            return false;
        const result = value;
        return Array.isArray(result.items)
            && Array.isArray(result.rawItems)
            && Boolean(result.pagination && typeof result.pagination === 'object')
            && typeof result.source === 'string';
    }
    function recoverPersistentEntry(key, entity, reason) {
        persistentStorage()?.removeItem(persistentKey(key));
        dispatchRepositoryEvent('zentrid:cache-recovered', { entity, key, reason });
    }
    function hydratePersistentEntry(key, entity) {
        const existing = cacheEntries.get(key);
        if (existing)
            return existing;
        const storage = persistentStorage();
        if (!storage)
            return null;
        try {
            const raw = storage.getItem(persistentKey(key));
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            const cachedAt = Number(parsed.cachedAt);
            if (parsed.entity !== entity || !validPersistedResult(parsed.result) || !Number.isFinite(cachedAt)) {
                recoverPersistentEntry(key, entity, 'invalid-payload');
                return null;
            }
            if (Date.now() - cachedAt > DEFAULT_STALE_MAX_AGE_MS[entity]) {
                recoverPersistentEntry(key, entity, 'expired');
                return null;
            }
            const hydrated = {
                entity,
                result: parsed.result,
                cachedAt,
                ttlMs: Number(parsed.ttlMs) || DEFAULT_CACHE_TTL_MS[entity],
                storage: 'session'
            };
            cacheEntries.set(key, hydrated);
            return hydrated;
        }
        catch (_error) {
            recoverPersistentEntry(key, entity, 'invalid-json');
            return null;
        }
    }
    function withCacheMeta(result, key, state, cachedAt, revalidating = false, fallback = false) {
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
    function dispatchRepositoryEvent(name, detail) {
        if (typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function')
            return;
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }
    function entityCacheKeys(entity) {
        const prefix = `${entity}|`;
        return [...new Set([...cacheEntries.keys(), ...inFlightReads.keys()])].filter(key => key.startsWith(prefix));
    }
    function cacheAgeMs(entity, now = Date.now()) {
        const ages = [...cacheEntries.values()]
            .filter(entry => entry.entity === entity)
            .map(entry => Math.max(0, now - entry.cachedAt));
        return ages.length ? Math.min(...ages) : null;
    }
    function cacheGeneration(entity) {
        return cacheGenerations.get(entity) || 0;
    }
    function invalidateCache(entity) {
        const entities = entity ? [entity] : Object.keys(DEFAULT_CACHE_TTL_MS);
        entities.forEach(name => {
            const keys = entityCacheKeys(name);
            let changed = false;
            keys.forEach(key => {
                changed = cacheEntries.delete(key) || changed;
                changed = inFlightReads.delete(key) || changed;
            });
            removePersistentEntries(name);
            cacheGenerations.set(name, cacheGeneration(name) + 1);
            if (changed || keys.length || hasPersistentEntry(`${name}|page=1|pageSize=50`))
                statsFor(name).invalidations += 1;
        });
    }
    function invalidateMany(entities) {
        [...new Set(entities)].forEach(entity => invalidateCache(entity));
    }
    function mutationEntities(event) {
        const detail = event.detail;
        if (!detail || !Array.isArray(detail.entities))
            return [];
        const allowed = new Set(Object.keys(DEFAULT_CACHE_TTL_MS));
        return detail.entities.filter((value) => typeof value === 'string' && allowed.has(value));
    }
    function cacheSnapshot(entity) {
        const now = Date.now();
        const entities = entity ? [entity] : Object.keys(DEFAULT_CACHE_TTL_MS);
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
    function linkedAbortController(signal) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (signal?.aborted)
            controller.abort();
        else
            signal?.addEventListener('abort', abort, { once: true });
        return {
            controller,
            cleanup: () => signal?.removeEventListener('abort', abort)
        };
    }
    function startNetworkRead(entity, key, loader, options, notify) {
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
        const linked = linkedAbortController(options?.signal);
        if (group)
            activeRequests.set(group, { entity, key, group, controller: linked.controller });
        const requestGeneration = cacheGeneration(entity);
        const request = loader(linked.controller.signal)
            .then(result => {
            const cachedAt = Date.now();
            if (cacheGeneration(entity) === requestGeneration) {
                const entry = {
                    entity,
                    result: cloneListResult(result),
                    cachedAt,
                    ttlMs: DEFAULT_CACHE_TTL_MS[entity],
                    storage: 'memory'
                };
                cacheEntries.set(key, entry);
                if (options.persist !== false)
                    persistCacheEntry(key, entry);
            }
            const networkResult = withCacheMeta(result, key, 'network', cachedAt);
            if (notify)
                dispatchRepositoryEvent('zentrid:repository-updated', {
                    entity,
                    key,
                    result: cloneListResult(networkResult),
                    reason: 'revalidated'
                });
            return networkResult;
        })
            .catch(error => {
            if (notify)
                dispatchRepositoryEvent('zentrid:repository-refresh-error', {
                    entity,
                    key,
                    error,
                    reason: 'revalidate-failed'
                });
            throw error;
        })
            .finally(() => {
            linked.cleanup();
            if (inFlightReads.get(key) === request)
                inFlightReads.delete(key);
            if (group && activeRequests.get(group)?.controller === linked.controller)
                activeRequests.delete(group);
        });
        inFlightReads.set(key, request);
        return request.then(cloneListResult);
    }
    async function readThroughCache(entity, loader, options = {}) {
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
            if (cached.storage === 'session')
                stats.persistentHits += 1;
            const alreadyRefreshing = inFlightReads.has(key);
            if (!alreadyRefreshing) {
                stats.revalidations += 1;
                void startNetworkRead(entity, key, loader, options, true).catch(() => undefined);
            }
            else {
                stats.deduplicated += 1;
            }
            return withCacheMeta(cached.result, key, 'stale', cached.cachedAt, true);
        }
        stats.misses += 1;
        try {
            return await startNetworkRead(entity, key, loader, options, false);
        }
        catch (error) {
            if (cached && ageMs <= staleMaxAgeMs && String(error?.code || '').toUpperCase() !== 'ABORTED') {
                stats.fallbacks += 1;
                const fallback = withCacheMeta(cached.result, key, 'stale', cached.cachedAt, false, true);
                fallback.errors = [...fallback.errors, error];
                return fallback;
            }
            throw error;
        }
    }
    function asArray(value) {
        if (Array.isArray(value))
            return value;
        if (!value || typeof value !== 'object')
            return [];
        const payload = value;
        const keys = ['items', 'data', 'records', 'rows', 'results', 'content', 'telemetry', 'measurements', 'points', 'samples', 'value', 'values'];
        for (const key of keys) {
            if (Array.isArray(payload[key]))
                return payload[key];
        }
        if (payload.data && typeof payload.data === 'object') {
            const nested = asArray(payload.data);
            if (nested.length)
                return nested;
        }
        if (payload.result && typeof payload.result === 'object') {
            const nested = asArray(payload.result);
            if (nested.length)
                return nested;
        }
        return [];
    }
    function collectionTotal(payload) {
        const data = payload;
        const values = [data?.total, data?.totalCount, data?.totalItems, data?.totalRecords, data?.count, data?.pagination?.total, data?.meta?.total];
        const total = values.map(Number).find(value => Number.isFinite(value) && value > 0);
        return total || 0;
    }
    function collectionPageSize(payload, fallback) {
        const data = payload;
        const values = [data?.pageSize, data?.size, data?.limit, data?.take, data?.pagination?.pageSize, data?.meta?.pageSize];
        const size = values.map(Number).find(value => Number.isFinite(value) && value > 0);
        return size || fallback;
    }
    function collectionTotalPages(payload, rowCount, fallbackSize) {
        const data = payload;
        const values = [data?.totalPages, data?.pages, data?.pageCount, data?.pagination?.totalPages, data?.meta?.totalPages];
        const explicit = values.map(Number).find(value => Number.isFinite(value) && value > 0);
        if (explicit)
            return explicit;
        const total = collectionTotal(payload);
        const size = collectionPageSize(payload, fallbackSize || rowCount || 1);
        return total && size ? Math.ceil(total / size) : 1;
    }
    function identityValues(row, entity = 'generic') {
        const context = requireContext();
        const plantKeys = ['sourcePlantId', 'plantId', 'externalId', 'plantCode', 'code', 'id', 'canonicalId', 'sourceEntityId', 'vendorPlantId', 'vendorExtensions.sourcePlantId', 'vendorExtensions.plantId', 'vendorExtensions.externalId'];
        const deviceKeys = ['sourceDeviceId', 'deviceId', 'externalId', 'serialNumber', 'serial', 'registrationNumber', 'code', 'id', 'canonicalId', 'sourceEntityId', 'vendorDeviceId', 'vendorExtensions.sourceDeviceId', 'vendorExtensions.deviceId', 'vendorExtensions.serialNumber'];
        const alertKeys = ['sourceAlertId', 'alertId', 'eventId', 'code', 'id', 'canonicalId', 'sourceEntityId', 'vendorExtensions.sourceAlertId'];
        if (entity === 'telemetry') {
            const explicit = context.firstOf(row, ['telemetryId', 'metricId', 'id', 'canonicalId', 'sourceEntityId', 'telemetry.id', 'measurement.id', 'reading.id', 'data.id', 'payload.id'], '');
            if (explicit !== undefined && explicit !== null && String(explicit).trim())
                return [String(explicit).trim()];
            const parts = [
                context.firstOf(row, ['source.provider', 'source.vendor', 'source.system', 'provider', 'vendor', 'sourceSystem', 'providerName'], ''),
                context.firstOf(row, ['plant.id', 'plant.plantId', 'plant.sourcePlantId', 'sourcePlantId', 'plantId'], ''),
                context.firstOf(row, ['device.id', 'device.deviceId', 'device.sourceDeviceId', 'device.serialNumber', 'sourceDeviceId', 'deviceId', 'serialNumber'], ''),
                context.firstOf(row, ['metricName', 'metric.name', 'metric.key', 'metric.code', 'measurement.name', 'measurement.metricName', 'reading.metricName', 'telemetry.metricName', 'data.metricName', 'payload.metricName', 'name', 'key', 'parameter', 'measurementName', 'field', 'metric'], ''),
                context.firstOf(row, ['measurement.timestamp', 'measurement.measuredAtUtc', 'reading.timestamp', 'reading.measuredAtUtc', 'telemetry.timestamp', 'data.timestamp', 'payload.timestamp', 'latest.timestamp', 'point.timestamp', 'sample.timestamp', 'timestamp', 'occurredAtUtc', 'measuredAtUtc', 'recordedAtUtc', 'collectedAtUtc', 'capturedAtUtc', 'createdAtUtc', 'lastDataAt', 'lastSyncAt'], '')
            ].map(value => String(value ?? '').trim());
            const composite = parts.join('|');
            return composite.replace(/\|/g, '') ? [composite] : [];
        }
        const keys = entity === 'plant' ? plantKeys : entity === 'device' ? deviceKeys : entity === 'alert' ? alertKeys : [...plantKeys, ...deviceKeys, ...alertKeys];
        const values = keys
            .map(key => context.firstOf(row, [key], ''))
            .filter(value => value !== undefined && value !== null && value !== '')
            .map(value => String(value).trim());
        return [...new Set(values.filter(Boolean))];
    }
    function rowsShareIdentity(a, b, entity) {
        const left = identityValues(a, entity).map(value => value.toLowerCase());
        const right = new Set(identityValues(b, entity).map(value => value.toLowerCase()));
        return left.some(value => right.has(value));
    }
    function uniqueByIdentity(rows, entity = 'generic') {
        const output = [];
        const seen = new Set();
        rows.forEach((row, index) => {
            const key = identityValues(row, entity)[0] || `${entity}-${index}`;
            const normalized = String(key).trim().toLowerCase();
            if (!normalized || seen.has(normalized))
                return;
            seen.add(normalized);
            output.push(row);
        });
        return output;
    }
    function realDisplayName(row, entityLabel, typeHint) {
        const context = requireContext();
        return context.realDisplayName ? context.realDisplayName(row, entityLabel, typeHint) : '';
    }
    function mergePlantSources(liveRows, adminRows) {
        const usedAdmin = new Set();
        const merged = liveRows.map(liveRow => {
            const adminIndex = adminRows.findIndex(adminRow => rowsShareIdentity(liveRow, adminRow, 'plant'));
            if (adminIndex < 0)
                return liveRow;
            usedAdmin.add(adminIndex);
            const adminRow = adminRows[adminIndex];
            if (!adminRow)
                return liveRow;
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
    function collectionPageNumber(payload, fallback) {
        const data = payload;
        const values = [data?.page, data?.pageNumber, data?.currentPage, data?.pagination?.page, data?.meta?.page];
        const page = values.map(Number).find(value => Number.isFinite(value) && value > 0);
        return page || fallback;
    }
    function collectionBoolean(payload, keys, fallback) {
        const data = payload;
        for (const key of keys) {
            let value = data;
            for (const part of key.split('.')) {
                if (!value || typeof value !== 'object') {
                    value = undefined;
                    break;
                }
                value = value[part];
            }
            if (typeof value === 'boolean')
                return value;
        }
        return fallback;
    }
    function paginationFromPayload(payload, rowCount, options = {}) {
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
    function fallbackPagination(rowCount, options = {}) {
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
    async function fetchCollectionPage(path, direct, entity = 'generic', options = {}) {
        const { page, pageSize } = normalizedPageOptions(options);
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options?.timeoutMs } : {}),
            ...(options?.signal ? { signal: options.signal } : {})
        };
        let payload = null;
        let successfulResponse = false;
        let lastError = null;
        const search = String(options.search || '').trim();
        const sortBy = String(options.sortBy || '').trim();
        const sortDirection = options.sortDirection === 'asc' || options.sortDirection === 'desc' ? options.sortDirection : '';
        try {
            // Server pagination contract: ?page=${page}&pageSize=${pageSize}
            const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
            if (search)
                query.set('search', search);
            if (sortBy)
                query.set('sortBy', sortBy);
            if (sortDirection)
                query.set('sortDirection', sortDirection);
            payload = await ZentridAPI.request(`${path}?${query}`, requestOptions);
            successfulResponse = true;
        }
        catch (error) {
            lastError = error;
            if (options.signal?.aborted)
                throw error;
            const canUseUnpagedCompatibilityRead = page === 1 && !search && !sortBy && !sortDirection;
            if (canUseUnpagedCompatibilityRead) {
                try {
                    payload = await direct(requestOptions);
                    successfulResponse = true;
                }
                catch (directError) {
                    lastError = directError;
                }
            }
        }
        if (!successfulResponse)
            throw lastError || new Error(`${path} did not return a response.`);
        const rows = uniqueByIdentity(asArray(payload), entity);
        return { rows, pagination: paginationFromPayload(payload, rows.length, options), payload };
    }
    function kpiFromPayload(payload) {
        if (!payload || typeof payload !== 'object')
            return undefined;
        const record = payload;
        const candidate = record.kpi;
        return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
            ? candidate
            : undefined;
    }
    function mappedResult(entity, rawItems, source, errors = [], pagination = fallbackPagination(rawItems.length), kpi) {
        const contract = ZentridAPIContracts[entity];
        return {
            entity,
            items: contract.mapList(rawItems, requireContext()),
            rawItems,
            source,
            errors,
            pagination,
            ...(kpi ? { kpi } : {})
        };
    }
    function itemMatches(item, id) {
        const expected = String(id || '').trim().toLowerCase();
        if (!expected)
            return false;
        const candidates = [
            item.id, item.externalId, item.code, item.serial, item.zentridCode, item.vendorCode,
            item.raw?.id, item.raw?.telemetryId, item.raw?.metricId, item.raw?.sourceEntityId, item.raw?.sourcePlantId, item.raw?.sourceDeviceId, item.raw?.sourceAlertId
        ];
        return candidates.some(value => value !== undefined && value !== null && String(value).trim().toLowerCase() === expected);
    }
    function directRecord(payload) {
        if (Array.isArray(payload)) {
            const first = payload.find(item => item && typeof item === 'object');
            return first ? first : null;
        }
        if (!payload || typeof payload !== 'object')
            return null;
        const record = payload;
        // A real detail DTO can legitimately contain nested objects named tenant, plant,
        // integration, etc. If the top-level object already has its own identity, it is
        // the record itself and must not be mistaken for an API envelope.
        const directIdentityKeys = [
            'id', 'clientId', 'tenantId', 'plantId', 'deviceId', 'alertId',
            'integrationId', 'sourceAlertId', 'sourcePlantId', 'sourceDeviceId'
        ];
        if (directIdentityKeys.some(key => {
            const value = record[key];
            return value !== undefined && value !== null && String(value).trim() !== '';
        }))
            return record;
        const envelopeKeys = ['item', 'data', 'record', 'result', 'client', 'tenant', 'plant', 'integration', 'value'];
        for (const key of envelopeKeys) {
            const nested = record[key];
            if (!nested || typeof nested !== 'object')
                continue;
            const resolved = directRecord(nested);
            if (resolved)
                return resolved;
        }
        const rows = asArray(payload);
        if (rows[0])
            return rows[0];
        return record;
    }
    function itemCacheVariant(entity, id) {
        const normalized = String(id || '').trim().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'unknown';
        return `${entity}-detail-${normalized}`;
    }
    function withGet(entity, loader, itemLoader) {
        const list = (options = {}) => readThroughCache(entity, signal => loader({ ...options, signal }), options);
        return {
            list,
            async get(id, options = {}) {
                const expected = String(id || '').trim();
                if (!expected || !itemLoader) {
                    const result = await list(options);
                    return { ...result, item: result.items.find(item => itemMatches(item, expected)) || null };
                }
                const detailOptions = {
                    ...options,
                    page: 1,
                    pageSize: 20,
                    cacheVariant: itemCacheVariant(entity, expected)
                };
                try {
                    const result = await readThroughCache(entity, signal => itemLoader(expected, { ...detailOptions, signal }), detailOptions);
                    const item = result.items.find(candidate => itemMatches(candidate, expected)) || result.items[0] || null;
                    if (item)
                        return { ...result, item };
                    if (options.allowListFallback === false)
                        return { ...result, item: null };
                    const fallback = await list(options);
                    return { ...fallback, item: fallback.items.find(candidate => itemMatches(candidate, expected)) || null };
                }
                catch (error) {
                    if (options.signal?.aborted)
                        throw error;
                    if (options.allowListFallback === false)
                        throw error;
                    const fallback = await list(options);
                    return {
                        ...fallback,
                        errors: [...fallback.errors, error],
                        item: fallback.items.find(candidate => itemMatches(candidate, expected)) || null
                    };
                }
            }
        };
    }
    const clients = withGet('clients', async (options) => {
        const page = await fetchCollectionPage('/api/admin/clients', requestOptions => ZentridPlatformAPI.clients.list(requestOptions), 'generic', options);
        return mappedResult('clients', page.rows, '/api/admin/clients', [], page.pagination);
    }, async (id, options = {}) => {
        const cleanId = String(id || '').trim();
        const requestOptions = {
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridPlatformAPI.clients.get(cleanId);
        const record = directRecord(payload);
        const rawItems = record ? [record] : [];
        return mappedResult('clients', rawItems, `/api/admin/clients/${encodeURIComponent(cleanId)}`, [], fallbackPagination(rawItems.length, { page: 1, pageSize: 20 }));
    });
    const tenants = withGet('tenants', async (options) => {
        const { page, pageSize } = normalizedPageOptions(options);
        const queryParts = [
            `page=${encodeURIComponent(String(page))}`,
            `pageSize=${encodeURIComponent(String(pageSize))}`
        ];
        const search = String(options?.search || '').trim();
        if (search)
            queryParts.push(`search=${encodeURIComponent(search)}`);
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options?.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridAPI.request(`/api/admin/tenants?${queryParts.join('&')}`, requestOptions);
        const rows = uniqueByIdentity(asArray(payload), 'generic');
        return mappedResult('tenants', rows, '/api/admin/tenants', [], paginationFromPayload(payload, rows.length, options));
    }, async (id, options = {}) => {
        const requestOptions = {
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridPlatformAPI.tenants.get(id, requestOptions);
        const record = directRecord(payload);
        const rawItems = record ? [record] : [];
        return mappedResult('tenants', rawItems, `/api/admin/tenants/${encodeURIComponent(id)}`, [], fallbackPagination(rawItems.length, { page: 1, pageSize: 20 }));
    });
    function selectPlantPagination(livePage, adminPage, rowCount, options) {
        const candidates = [adminPage?.pagination, livePage?.pagination].filter((value) => Boolean(value));
        if (!candidates.length)
            return fallbackPagination(rowCount, options);
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
    const plants = withGet('plants', async (options) => {
        if (options?.cacheVariant === 'live') {
            const livePage = await fetchCollectionPage('/api/plants', requestOptions => ZentridPlatformAPI.live.plants(requestOptions), 'plant', options);
            return mappedResult('plants', livePage.rows, '/api/plants', [], livePage.pagination);
        }
        // Registry-first by default. List pages from /api/admin/plants and /api/plants
        // are independently paginated/sorted, so implicitly merging their current
        // pages can attach live values to the wrong administrative row. Live data
        // must be requested explicitly with cacheVariant='live'.
        const adminPage = await fetchCollectionPage('/api/admin/plants', requestOptions => ZentridPlatformAPI.plantRegistry.list(requestOptions), 'plant', options);
        return mappedResult('plants', adminPage.rows, '/api/admin/plants', [], adminPage.pagination);
    }, async (id, options = {}) => {
        const requestOptions = {
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridPlatformAPI.plantRegistry.get(id, requestOptions);
        const adminRecord = directRecord(payload);
        if (!adminRecord) {
            return mappedResult('plants', [], `/api/admin/plants/${encodeURIComponent(id)}`, [], fallbackPagination(0, { page: 1, pageSize: 20 }));
        }
        if (options.cacheVariant === 'admin-registry') {
            return mappedResult('plants', [adminRecord], `/api/admin/plants/${encodeURIComponent(id)}`, [], fallbackPagination(1, { page: 1, pageSize: 20 }));
        }
        let liveRecord = null;
        const errors = [];
        try {
            const livePage = await fetchCollectionPage('/api/plants', liveOptions => ZentridPlatformAPI.live.plants(liveOptions), 'plant', { ...options, page: 1, pageSize: 100 });
            liveRecord = livePage.rows.find(row => rowsShareIdentity(row, adminRecord, 'plant')) ||
                livePage.rows.find(row => itemMatches(row, id)) ||
                null;
        }
        catch (error) {
            if (options.signal?.aborted)
                throw error;
            errors.push(error);
        }
        const mergedRows = mergePlantSources(liveRecord ? [liveRecord] : [], [adminRecord]);
        const source = liveRecord
            ? `/api/admin/plants/${encodeURIComponent(id)} + /api/plants`
            : `/api/admin/plants/${encodeURIComponent(id)}`;
        return mappedResult('plants', mergedRows.slice(0, 1), source, errors, fallbackPagination(mergedRows.length ? 1 : 0, { page: 1, pageSize: 20 }));
    });
    const devices = withGet('devices', async (options) => {
        if (options?.cacheVariant === 'live') {
            const livePage = await fetchCollectionPage('/api/devices', requestOptions => ZentridPlatformAPI.live.devices(requestOptions), 'device', options);
            return mappedResult('devices', livePage.rows, '/api/devices', [], livePage.pagination, kpiFromPayload(livePage.payload));
        }
        const { page, pageSize } = normalizedPageOptions(options);
        // Keep the shared pagination marker used by repository diagnostics: ?page=${page}&size=${pageSize}
        const queryParts = [
            `page=${encodeURIComponent(String(page))}`,
            `pageSize=${encodeURIComponent(String(pageSize))}`
        ];
        const search = String(options?.search || '').trim();
        const deviceType = String(options?.deviceType || '').trim();
        const deviceStatus = String(options?.deviceStatus || '').trim();
        const plantId = String(options?.plantId || '').trim();
        if (search)
            queryParts.push(`search=${encodeURIComponent(search)}`);
        if (deviceType)
            queryParts.push(`deviceType=${encodeURIComponent(deviceType)}`);
        if (deviceStatus)
            queryParts.push(`deviceStatus=${encodeURIComponent(deviceStatus)}`);
        if (plantId)
            queryParts.push(`plantId=${encodeURIComponent(plantId)}`);
        const query = queryParts.join('&');
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options?.timeoutMs } : {}),
            ...(options?.signal ? { signal: options?.signal } : {})
        };
        const payload = await ZentridAPI.request(`/api/admin/devices?${query}`, requestOptions);
        const rows = uniqueByIdentity(asArray(payload), 'device');
        return mappedResult('devices', rows, '/api/admin/devices', [], paginationFromPayload(payload, rows.length, options), kpiFromPayload(payload));
    }, async (id, options = {}) => {
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options?.timeoutMs } : {}),
            ...(options?.signal ? { signal: options?.signal } : {})
        };
        const payload = await ZentridPlatformAPI.deviceRegistry.get(id, requestOptions);
        const record = directRecord(payload);
        const rawItems = record ? [record] : [];
        return mappedResult('devices', rawItems, `/api/admin/devices/${encodeURIComponent(id)}`, [], fallbackPagination(rawItems.length, { page: 1, pageSize: 20 }));
    });
    const alerts = withGet('alerts', async (options) => {
        if (options?.cacheVariant === 'live') {
            const livePage = await fetchCollectionPage('/api/alerts', requestOptions => ZentridPlatformAPI.live.alerts(requestOptions), 'alert', options);
            return mappedResult('alerts', livePage.rows, '/api/alerts', [], livePage.pagination, kpiFromPayload(livePage.payload));
        }
        const { page, pageSize } = normalizedPageOptions(options);
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        const keys = ['severity', 'alertStatus', 'status', 'tenant', 'plant', 'vendor', 'plantId', 'deviceId', 'tenantId', 'format', 'cursor', 'search'];
        keys.forEach(key => {
            const value = String(options?.[key] || '').trim();
            if (value)
                query.set(String(key), value);
        });
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options?.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridAPI.request(`/api/admin/alerts?${query.toString()}`, requestOptions);
        const rows = uniqueByIdentity(asArray(payload), 'alert');
        return mappedResult('alerts', rows, '/api/admin/alerts', [], paginationFromPayload(payload, rows.length, options), kpiFromPayload(payload));
    }, async (id, options = {}) => {
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options?.signal ? { signal: options.signal } : {})
        };
        const payload = await ZentridPlatformAPI.adminAlerts.get(id, requestOptions);
        const [timelineResult, relatedResult, sopResult, telemetryCurveResult] = await Promise.allSettled([
            ZentridPlatformAPI.adminAlerts.timeline(id, requestOptions),
            ZentridPlatformAPI.adminAlerts.related(id, requestOptions),
            ZentridPlatformAPI.adminAlerts.sop(id, requestOptions),
            ZentridPlatformAPI.adminAlerts.telemetryCurve(id, { windowMinutes: 60 }, requestOptions)
        ]);
        const errors = [];
        const record = directRecord(payload);
        let enrichedRecord = record ? { ...record } : null;
        const attach = (key, loadedKey, result) => {
            if (!enrichedRecord)
                return;
            if (result.status === 'fulfilled') {
                enrichedRecord[key] = result.value;
                enrichedRecord[loadedKey] = true;
            }
            else {
                errors.push(result.reason);
            }
        };
        attach('__timeline', '__timelineLoaded', timelineResult);
        attach('__related', '__relatedLoaded', relatedResult);
        attach('__sop', '__sopLoaded', sopResult);
        attach('__telemetryCurve', '__telemetryCurveLoaded', telemetryCurveResult);
        const rawItems = enrichedRecord ? [enrichedRecord] : [];
        return mappedResult('alerts', rawItems, `/api/admin/alerts/${encodeURIComponent(id)}`, errors, fallbackPagination(rawItems.length, { page: 1, pageSize: 1 }));
    });
    const telemetry = withGet('telemetry', async (options) => {
        const query = new URLSearchParams({
            page: String(Math.max(1, Number(options?.page || 1))),
            pageSize: String(Math.max(1, Number(options?.pageSize || 100)))
        });
        if (options?.plantId)
            query.set('plantId', options.plantId);
        if (options?.deviceId)
            query.set('deviceId', options.deviceId);
        if (options?.metric)
            query.set('metric', options.metric);
        if (options?.search)
            query.set('search', options.search);
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            ...(options?.signal ? { signal: options.signal } : {})
        };
        const source = `/api/telemetry?${query.toString()}`;
        const payload = await ZentridAPI.request(source, requestOptions);
        const rows = uniqueByIdentity(asArray(payload), 'telemetry');
        return mappedResult('telemetry', rows, source, [], paginationFromPayload(payload, rows.length, options));
    });
    const integrationRegistry = withGet('integrations', async (options) => {
        const page = await fetchCollectionPage('/api/admin/provider-integrations', requestOptions => ZentridPlatformAPI.providerIntegrations.list(requestOptions), 'generic', options);
        return mappedResult('integrations', page.rows, '/api/admin/provider-integrations', [], page.pagination);
    }, async (id, options = {}) => {
        const requestOptions = {
            ...(options?.timeoutMs ? { timeoutMs: options?.timeoutMs } : {}),
            ...(options?.signal ? { signal: options?.signal } : {})
        };
        const payload = await ZentridPlatformAPI.providerIntegrations.get(id, requestOptions);
        const record = directRecord(payload);
        const rawItems = record ? [record] : [];
        return mappedResult('integrations', rawItems, `/api/admin/provider-integrations/${encodeURIComponent(id)}`, [], fallbackPagination(rawItems.length, { page: 1, pageSize: 20 }));
    });
    async function fetchIntegrationSummaryPageOneByOne(options, signal) {
        const requestOptions = {
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            signal
        };
        const firstPayload = await ZentridAPI.request('/api/integrations?page=1&pageSize=1', requestOptions);
        const firstRows = uniqueByIdentity(asArray(firstPayload), 'generic');
        const firstPagination = paginationFromPayload(firstPayload, firstRows.length, { ...options, page: 1, pageSize: 1 });
        const totalPages = Math.max(1, firstPagination.totalPages);
        // The backend integration-summary query is currently much more reliable with a tiny page.
        // For the small integration registry used by Platform Overview, collect all rows this way.
        // If the registry grows beyond 10 pages, fall back to the normal paged endpoint instead of
        // issuing an unbounded number of requests.
        if (totalPages > 10) {
            const normalPage = await fetchCollectionPage('/api/integrations', directOptions => ZentridPlatformAPI.live.integrations(directOptions), 'generic', { ...options, page: 1, pageSize: 20, signal });
            return mappedResult('integrations', normalPage.rows, '/api/integrations', [], normalPage.pagination);
        }
        const pageNumbers = Array.from({ length: Math.max(0, totalPages - 1) }, (_value, index) => index + 2);
        const settled = await Promise.allSettled(pageNumbers.map(page => ZentridAPI.request(`/api/integrations?page=${page}&pageSize=1`, requestOptions)));
        const rows = [...firstRows];
        const errors = [];
        settled.forEach(result => {
            if (result.status === 'fulfilled')
                rows.push(...asArray(result.value));
            else
                errors.push(result.reason);
        });
        const uniqueRows = uniqueByIdentity(rows, 'generic');
        return mappedResult('integrations', uniqueRows, '/api/integrations?pageSize=1', errors, {
            page: 1,
            pageSize: 1,
            totalCount: firstPagination.totalCount,
            totalPages: firstPagination.totalPages,
            hasPreviousPage: false,
            hasNextPage: false
        });
    }
    const integrations = {
        ...integrationRegistry,
        async summary(options = {}) {
            const readOptions = {
                ...options,
                cacheVariant: 'summary',
                staleWhileRevalidate: options.staleWhileRevalidate !== false,
                persist: options.persist !== false,
                requestGroup: options.requestGroup || 'background:integration-summary',
                supersede: options.supersede !== false
            };
            return readThroughCache('integrations', async (signal) => {
                return fetchIntegrationSummaryPageOneByOne(readOptions, signal);
            }, readOptions);
        }
    };
    const api = {
        configure(context) {
            if (mapperContext && mapperContext !== context)
                invalidateCache();
            mapperContext = context;
        },
        isConfigured() {
            return Boolean(mapperContext);
        },
        cache: {
            invalidate(entity) {
                invalidateCache(entity);
            },
            invalidateMany(entities) {
                invalidateMany(entities);
            },
            snapshot(entity) {
                return cacheSnapshot(entity);
            },
            clearPersistent(entity) {
                removePersistentEntries(entity);
            }
        },
        coordinator: {
            cancel(group) {
                const active = activeRequests.get(String(group || '').trim());
                if (!active || active.controller.signal.aborted)
                    return;
                active.controller.abort();
                statsFor(active.entity).cancellations += 1;
            },
            cancelAll() {
                activeRequests.forEach(active => {
                    if (active.controller.signal.aborted)
                        return;
                    active.controller.abort();
                    statsFor(active.entity).cancellations += 1;
                });
                activeRequests.clear();
            },
            snapshot() {
                return [...activeRequests.values()].map(request => ({
                    group: request.group,
                    entity: request.entity,
                    key: request.key,
                    aborted: request.controller.signal.aborted
                }));
            }
        },
        clients,
        tenants,
        plants,
        devices,
        alerts,
        telemetry,
        integrations
    };
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('zentrid:auth', () => invalidateCache());
        window.addEventListener('zentrid:session-expired', () => invalidateCache());
        window.addEventListener('zentrid:data-mutated', event => invalidateMany(mutationEntities(event)));
        window.addEventListener('pagehide', () => api.coordinator.cancelAll(), { once: true });
    }
    window.ZentridAPIRepositories = api;
    window.FleetAPIRepositories = api;
})();
