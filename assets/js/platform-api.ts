type ZentridHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | string;

type ZentridQueryParams = Record<string, string | number | boolean | null | undefined>;

type ZentridJsonOptions = {
  method: ZentridHttpMethod;
  body?: string;
};

type ZentridRawRequestOptions = {
  method?: ZentridHttpMethod;
  headers?: HeadersInit;
  body?: unknown;
};

type ZentridRawRequestResult = {
  ok: boolean;
  status: number | string;
  statusText: string;
  ms: number;
  path: string;
  method: string;
  source: string;
  count: number | null;
  data: unknown;
  bodyText?: string;
  error: string;
  skipped?: boolean;
  responseBytes?: number;
  contentType?: string;
  requestId?: string;
  pagination?: ZentridApiDiagnosticPagination;
};

type ZentridEndpointCatalogItem = {
  group: string;
  label: string;
  method: ZentridHttpMethod;
  path: string;
  safe: boolean;
  used: boolean;
  notes: string;
};

type ZentridMutationEntity = 'clients' | 'tenants' | 'plants' | 'devices' | 'alerts' | 'integrations';

type ZentridPlatformModule = {
  list(options?: ZentridRequestOptions): Promise<unknown>;
  get(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  create(payload: unknown): Promise<unknown>;
};

type ZentridAlertApiModule = {
  list(options?: ZentridRequestOptions): Promise<unknown>;
  get(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  exportCsv(query?: ZentridQueryParams): Promise<{ blob: Blob; filename: string; contentType: string }>;
  acknowledge(id: string, payload: unknown): Promise<unknown>;
  assign(id: string, payload: unknown): Promise<unknown>;
  escalate(id: string, payload: unknown): Promise<unknown>;
  resolve(id: string, payload: unknown): Promise<unknown>;
  timeline(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  related(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  telemetryCurve(id: string, query?: ZentridQueryParams, options?: ZentridRequestOptions): Promise<unknown>;
  sop(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  updateSop(id: string, payload: unknown): Promise<unknown>;
  createTask(id: string, payload?: unknown): Promise<unknown>;
};

type ZentridLiveDeviceApiModule = {
  list(query?: ZentridQueryParams, options?: ZentridRequestOptions): Promise<unknown>;
  get(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  connectivity(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  network(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  warranty(id: string, options?: ZentridRequestOptions): Promise<unknown>;
  telemetryLatest(id: string, options?: ZentridRequestOptions): Promise<unknown>;
};

type ZentridPlatformAPIShape = {
  auth: {
    me(): Promise<unknown>;
    validate(): Promise<unknown>;
    refresh(): Promise<ZentridSession>;
    logout(): Promise<unknown>;
    session(): ZentridSession;
    jwks(): Promise<unknown>;
  };
  live: {
    plants(options?: ZentridRequestOptions): Promise<unknown>;
    devices(options?: ZentridRequestOptions): Promise<unknown>;
    alerts(options?: ZentridRequestOptions): Promise<unknown>;
    integrations(options?: ZentridRequestOptions): Promise<unknown>;
    providers(options?: ZentridRequestOptions): Promise<unknown>;
    telemetry(options?: ZentridRequestOptions): Promise<unknown>;
  };
  liveDevices: ZentridLiveDeviceApiModule;
  liveAlerts: ZentridAlertApiModule;
  tenants: ZentridPlatformModule & {
    update(id: string, payload: unknown): Promise<unknown>;
    activate(id: string): Promise<unknown>;
    deactivate(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    uploadDocument(id: string, payload: FormData): Promise<unknown>;
    getDocument(id: string, documentId: string): Promise<unknown>;
    deleteDocument(id: string, documentId: string): Promise<unknown>;
  };
  clients: ZentridPlatformModule & {
    update(id: string, payload: unknown): Promise<unknown>;
    activate(id: string): Promise<unknown>;
    deactivate(id: string): Promise<unknown>;
    suspend(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    uploadDocument(id: string, payload: FormData): Promise<unknown>;
    getDocument(id: string, documentId: string): Promise<unknown>;
    deleteDocument(id: string, documentId: string): Promise<unknown>;
  };
  plantRegistry: ZentridPlatformModule & {
    search(search: string, options?: ZentridRequestOptions): Promise<unknown>;
    update(id: string, payload: unknown): Promise<unknown>;
    devices(plantId: string, options?: ZentridRequestOptions): Promise<unknown>;
    createDevice(plantId: string, payload: unknown): Promise<unknown>;
    activate(id: string): Promise<unknown>;
    deactivate(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    uploadDocument(id: string, payload: FormData): Promise<unknown>;
    getDocument(id: string, documentId: string): Promise<unknown>;
    deleteDocument(id: string, documentId: string): Promise<unknown>;
  };
  deviceRegistry: ZentridPlatformModule & {
    update(id: string, payload: unknown): Promise<unknown>;
    audit(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    linkedDevices(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    connectivity(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    network(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    warranty(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    telemetryLatest(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    command(id: string, payload: unknown): Promise<unknown>;
    activate(id: string): Promise<unknown>;
    deactivate(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    uploadDocument(id: string, payload: FormData): Promise<unknown>;
    getDocument(id: string, documentId: string): Promise<unknown>;
    deleteDocument(id: string, documentId: string): Promise<unknown>;
  };
  adminAlerts: ZentridAlertApiModule;
  providerPlantAssignments: {
    list(options?: ZentridRequestOptions): Promise<unknown>;
  };
  providerIntegrations: {
    templates(): Promise<unknown>;
    template(providerType: string): Promise<unknown>;
    list(options?: ZentridRequestOptions): Promise<unknown>;
    get(id: string, options?: ZentridRequestOptions): Promise<unknown>;
    create(payload: unknown): Promise<unknown>;
    validate(id: string): Promise<unknown>;
    testConnection(id: string): Promise<unknown>;
    testSampleData(id: string): Promise<unknown>;
    activate(id: string): Promise<unknown>;
    suspend(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    failed(id: string): Promise<unknown>;
  };
  endpointCatalog: ZentridEndpointCatalogItem[];
  allowedEndpointPatterns: RegExp[];
  isAllowedPath(path: string): boolean;
  checkCatalog(options?: { includeUnsafe?: boolean }): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>>;
  checkAllReadEndpoints(): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>>;
  rawRequest(path: string, options?: ZentridRawRequestOptions): Promise<ZentridRawRequestResult>;
  qs(params?: ZentridQueryParams): string;
};

/* Zentrid Platform/Admin API layer
   Scope is locked to the Swagger endpoints currently provided by backend. */
const ZentridPlatformAPI: ZentridPlatformAPIShape = (() => {
  const allowedEndpointPatterns: RegExp[] = [
    /^\/api\/Auth\/(login|register|refresh|logout|me|validate)$/,
    /^\/\.well-known\/jwks\.json$/,
    /^\/api\/admin\/clients(?:\/[^/]+)?(?:\/(activate|deactivate|suspend|archive))?$/,
    /^\/api\/admin\/clients\/[^/]+\/documents(?:\/[^/]+)?$/,
    /^\/api\/admin\/plants(?:\/[^/]+)?(?:\/(activate|deactivate|archive))?$/,
    /^\/api\/admin\/plants\/[^/]+\/documents(?:\/[^/]+)?$/,
    /^\/api\/admin\/plants\/[^/]+\/devices$/,
    /^\/api\/admin\/tenants(?:\/[^/]+)?(?:\/(activate|deactivate|archive))?$/,
    /^\/api\/admin\/tenants\/[^/]+\/documents(?:\/[^/]+)?$/,
    /^\/api\/admin\/devices(?:\/[^/]+)?(?:\/(audit|commands|linked-devices|connectivity|network|warranty|activate|deactivate|archive))?$/,
    /^\/api\/admin\/devices\/[^/]+\/telemetry\/latest$/,
    /^\/api\/admin\/devices\/[^/]+\/documents(?:\/[^/]+)?$/,
    /^\/api\/alerts(?:\/export|\/[^/]+(?:\/(acknowledge|assign|escalate|resolve|timeline|related|telemetry-curve|sop|tasks))?)?$/,
    /^\/api\/admin\/alerts(?:\/export|\/[^/]+(?:\/(acknowledge|assign|escalate|resolve|timeline|related|telemetry-curve|sop|tasks))?)?$/,
    /^\/api\/devices(?:\/[^/]+(?:\/(connectivity|network|warranty))?)?$/,
    /^\/api\/devices\/[^/]+\/telemetry\/latest$/,
    /^\/api\/integrations$/,
    /^\/api\/plants$/,
    /^\/api\/Providers$/,
    /^\/api\/telemetry$/,
    /^\/api\/admin\/provider-plant-assignments$/,
    /^\/api\/admin\/provider-integrations$/,
    /^\/api\/admin\/provider-integrations\/templates(?:\/[^/]+)?$/,
    /^\/api\/admin\/provider-integrations\/[^/]+(?:\/(validate|test-connection|test-sample-data|activate|suspend|archive|failed))?$/
  ];

  function isAllowedPath(path: string): boolean {
    const cleanPath = String(path || '').split('?')[0] ?? '';
    return allowedEndpointPatterns.some((pattern) => pattern.test(cleanPath));
  }

  function qs(params: ZentridQueryParams = {}): string {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
  }

  function jsonOptions(method: ZentridHttpMethod, body?: unknown): ZentridJsonOptions {
    return {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body || {}) })
    };
  }

  async function mutationRequest<T = unknown>(
    path: string,
    options: ZentridRequestOptions,
    entities: ZentridMutationEntity[],
    action: string
  ): Promise<T> {
    const result = await ZentridAPI.request<T>(path, options);
    const detail: ZentridDataMutationDetail = {
      action,
      path,
      method: String(options.method || 'POST').toUpperCase(),
      entities: [...new Set(entities)],
      completedAt: new Date().toISOString()
    };
    window.dispatchEvent(new CustomEvent<ZentridDataMutationDetail>('zentrid:data-mutated', { detail }));
    return result;
  }

  function sourceLabel(): string {
    return ZentridConfig.isLocalFrontend() ? 'Local proxy' : 'Vercel proxy';
  }

  function resolveApiUrl(path: string): string {
    const base = ZentridConfig.apiBaseUrl || '';
    return `${base}${path}`;
  }

  function authHeaders({ body, extraHeaders }: { body?: unknown; extraHeaders?: HeadersInit } = {}): Headers {
    const headers = new Headers(extraHeaders || {});
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (body !== undefined && body !== null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const token = ZentridAuth.getAccessToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function collectionCount(value: unknown, depth = 0): number | null {
    if (depth > 5) return null;
    if (Array.isArray(value)) return value.length;
    if (!isRecord(value)) return null;
    const collectionKeys = ['items', 'data', 'records', 'rows', 'results', 'content', 'telemetry', 'measurements', 'points', 'samples', 'value', 'values'];
    for (const key of collectionKeys) {
      const candidate = value[key];
      if (Array.isArray(candidate)) return candidate.length;
    }
    for (const key of ['data', 'result', 'payload']) {
      const nested = value[key];
      if (!isRecord(nested)) continue;
      const count = collectionCount(nested, depth + 1);
      if (count !== null) return count;
    }
    return null;
  }

  async function rawRequest(path: string, options: ZentridRawRequestOptions = {}): Promise<ZentridRawRequestResult> {
    const method = String(options.method || 'GET').toUpperCase();
    const body = options.body;
    const started = performance.now();

    if (!isAllowedPath(path)) {
      return {
        ok: false,
        status: 0,
        statusText: 'Endpoint not in active Swagger scope',
        ms: 0,
        path,
        method,
        source: sourceLabel(),
        count: null,
        data: null,
        bodyText: '',
        error: 'This endpoint was removed from the active frontend API layer because it is not present in the provided Swagger snapshot.'
      };
    }

    const headers = authHeaders({ body, ...(options.headers !== undefined ? { extraHeaders: options.headers } : {}) });
    let parsedBody: unknown = null;
    let responseText = '';
    try {
      const requestBody = body === undefined || body === null || method === 'GET' || method === 'HEAD'
        ? undefined
        : (typeof body === 'string' ? body : JSON.stringify(body));
      const response = await fetch(resolveApiUrl(path), {
        method,
        headers,
        ...(requestBody !== undefined ? { body: requestBody } : {})
      });
      responseText = await response.text();
      try { parsedBody = responseText ? JSON.parse(responseText) : null; } catch (e) { parsedBody = responseText; }
      const ms = Math.round(performance.now() - started);
      const responseBytes = typeof TextEncoder === 'undefined' ? responseText.length : new TextEncoder().encode(responseText).length;
      const contentType = response.headers.get('content-type') || '';
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || response.headers.get('traceparent') || response.headers.get('x-correlation-id') || '';
      const responsePagination = typeof ZentridAPIDiagnostics === 'undefined'
        ? { page: null, pageSize: null, totalCount: null, totalPages: null }
        : ZentridAPIDiagnostics.pagination(parsedBody);
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || '',
        ms,
        path,
        method,
        source: sourceLabel(),
        count: collectionCount(parsedBody),
        data: parsedBody,
        bodyText: responseText,
        error: response.ok ? '' : `${response.statusText || 'Request failed'} (${response.status})`,
        responseBytes,
        contentType,
        requestId,
        pagination: responsePagination
      };
    } catch (error) {
      const ms = Math.round(performance.now() - started);
      return {
        ok: false,
        status: 0,
        statusText: 'Network/Fetch Error',
        ms,
        path,
        method,
        source: sourceLabel(),
        count: null,
        data: null,
        bodyText: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  const auth = {
    me: () => ZentridAuth.me(),
    validate: () => ZentridAuth.validate(),
    refresh: () => ZentridAuth.refresh(),
    logout: () => ZentridAuth.request('/api/Auth/logout', { method: 'POST' }),
    session: () => ZentridAuth.getSession(),
    jwks: () => ZentridAPI.request('/.well-known/jwks.json')
  };

  async function downloadDocument(path: string): Promise<unknown> {
    const headers = new Headers({ Accept: 'application/octet-stream, application/pdf, text/plain, application/json;q=0.9, */*;q=0.8' });
    const token = ZentridAPI.auth.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${ZentridAPI.config.apiBaseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) throw new Error(`Unable to download document (${response.status})`);
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const text = await response.text();
      try { return text ? JSON.parse(text) : null; } catch (_error) { return text; }
    }
    return response.blob();
  }

  async function exportCsv(path: string, fallbackPrefix: string): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const headers = new Headers({ Accept: 'text/csv, */*;q=0.8' });
    const token = ZentridAPI.auth.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${ZentridAPI.config.apiBaseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) throw new Error(`Unable to export alerts (${response.status})`);
    const disposition = response.headers.get('content-disposition') || '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = disposition.match(/filename=\"?([^;\"]+)/i)?.[1];
    const filename = decodeURIComponent(encoded || plain || `${fallbackPrefix}-${Date.now()}.csv`);
    return { blob: await response.blob(), filename, contentType: response.headers.get('content-type') || 'text/csv' };
  }

  const live = {
    plants: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/plants', options),
    devices: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/devices', options),
    alerts: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/alerts', options),
    integrations: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/integrations', options),
    providers: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/Providers', options),
    telemetry: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/telemetry', options)
  };

  const liveDevices: ZentridLiveDeviceApiModule = {
    list: (query: ZentridQueryParams = {}, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices${qs(query)}`, options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices/${encodeURIComponent(id)}`, options),
    connectivity: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices/${encodeURIComponent(id)}/connectivity`, options),
    network: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices/${encodeURIComponent(id)}/network`, options),
    warranty: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices/${encodeURIComponent(id)}/warranty`, options),
    telemetryLatest: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/devices/${encodeURIComponent(id)}/telemetry/latest`, options)
  };

  const liveAlerts: ZentridAlertApiModule = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/alerts', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/alerts/${encodeURIComponent(id)}`, options),
    exportCsv: (query: ZentridQueryParams = {}) => exportCsv(`/api/alerts/export${qs(query)}`, 'alerts-export'),
    acknowledge: (id: string, payload: unknown) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, jsonOptions('POST', payload), ['alerts'], 'live-alert.acknowledge'),
    assign: (id: string, payload: unknown) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/assign`, jsonOptions('POST', payload), ['alerts'], 'live-alert.assign'),
    escalate: (id: string, payload: unknown) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/escalate`, jsonOptions('POST', payload), ['alerts'], 'live-alert.escalate'),
    resolve: (id: string, payload: unknown) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/resolve`, jsonOptions('POST', payload), ['alerts'], 'live-alert.resolve'),
    timeline: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/alerts/${encodeURIComponent(id)}/timeline`, options),
    related: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/alerts/${encodeURIComponent(id)}/related`, options),
    telemetryCurve: (id: string, query: ZentridQueryParams = {}, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/alerts/${encodeURIComponent(id)}/telemetry-curve${qs(query)}`, options),
    sop: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/alerts/${encodeURIComponent(id)}/sop`, options),
    updateSop: (id: string, payload: unknown) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/sop`, jsonOptions('PUT', payload), ['alerts'], 'live-alert.sop.update'),
    createTask: (id: string, payload: unknown = {}) => mutationRequest(`/api/alerts/${encodeURIComponent(id)}/tasks`, jsonOptions('POST', payload), ['alerts'], 'live-alert.task.create')
  };

  const tenants = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/tenants', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/tenants/${encodeURIComponent(id)}`, options),
    create: (payload: unknown) => mutationRequest('/api/admin/tenants', jsonOptions('POST', payload), ['tenants'], 'tenant.create'),
    update: (id: string, payload: unknown) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}`, jsonOptions('PUT', payload), ['tenants'], 'tenant.update'),
    activate: (id: string) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}/activate`, { method: 'POST' }, ['tenants'], 'tenant.activate'),
    deactivate: (id: string) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }, ['tenants'], 'tenant.deactivate'),
    archive: (id: string) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}/archive`, { method: 'POST' }, ['tenants'], 'tenant.archive'),
    uploadDocument: (id: string, payload: FormData) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}/documents`, { method: 'POST', body: payload }, ['tenants'], 'tenant.document.upload'),
    getDocument: (id: string, documentId: string) => downloadDocument(`/api/admin/tenants/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`),
    deleteDocument: (id: string, documentId: string) => mutationRequest(`/api/admin/tenants/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }, ['tenants'], 'tenant.document.delete')
  };

  const clients = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/clients', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/clients/${encodeURIComponent(id)}`, options),
    create: (payload: unknown) => mutationRequest('/api/admin/clients', jsonOptions('POST', payload), ['clients'], 'client.create'),
    update: (id: string, payload: unknown) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}`, jsonOptions('PUT', payload), ['clients'], 'client.update'),
    activate: (id: string) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/activate`, { method: 'POST' }, ['clients'], 'client.activate'),
    deactivate: (id: string) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }, ['clients'], 'client.deactivate'),
    suspend: (id: string) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/suspend`, { method: 'POST' }, ['clients'], 'client.suspend'),
    archive: (id: string) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/archive`, { method: 'POST' }, ['clients'], 'client.archive'),
    uploadDocument: (id: string, payload: FormData) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/documents`, { method: 'POST', body: payload }, ['clients'], 'client.document.upload'),
    getDocument: (id: string, documentId: string) => downloadDocument(`/api/admin/clients/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`),
    deleteDocument: (id: string, documentId: string) => mutationRequest(`/api/admin/clients/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }, ['clients'], 'client.document.delete')
  };

  const plantRegistry = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/plants', options),
    search: (search: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/plants?search=${encodeURIComponent(search)}&page=1&pageSize=50`, options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/plants/${encodeURIComponent(id)}`, options),
    create: (payload: unknown) => mutationRequest('/api/admin/plants', jsonOptions('POST', payload), ['plants'], 'plant.create'),
    update: (id: string, payload: unknown) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}`, jsonOptions('PUT', payload), ['plants'], 'plant.update'),
    devices: (plantId: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/plants/${encodeURIComponent(plantId)}/devices`, options),
    createDevice: (plantId: string, payload: unknown) => mutationRequest(`/api/admin/plants/${encodeURIComponent(plantId)}/devices`, jsonOptions('POST', payload), ['plants', 'devices'], 'plant.device.create'),
    activate: (id: string) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}/activate`, { method: 'POST' }, ['plants'], 'plant.activate'),
    deactivate: (id: string) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }, ['plants'], 'plant.deactivate'),
    archive: (id: string) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}/archive`, { method: 'POST' }, ['plants'], 'plant.archive'),
    uploadDocument: (id: string, payload: FormData) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}/documents`, { method: 'POST', body: payload }, ['plants'], 'plant.document.upload'),
    getDocument: (id: string, documentId: string) => downloadDocument(`/api/admin/plants/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`),
    deleteDocument: (id: string, documentId: string) => mutationRequest(`/api/admin/plants/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }, ['plants'], 'plant.document.delete')
  };


  const deviceRegistry = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/devices', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}`, options),
    create: (payload: unknown) => mutationRequest('/api/admin/devices', jsonOptions('POST', payload), ['devices'], 'device.create'),
    update: (id: string, payload: unknown) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}`, jsonOptions('PUT', payload), ['devices'], 'device.update'),
    audit: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/audit`, options),
    linkedDevices: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/linked-devices`, options),
    connectivity: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/connectivity`, options),
    network: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/network`, options),
    warranty: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/warranty`, options),
    telemetryLatest: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/devices/${encodeURIComponent(id)}/telemetry/latest`, options),
    command: (id: string, payload: unknown) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/commands`, jsonOptions('POST', payload), ['devices'], 'device.command'),
    activate: (id: string) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/activate`, { method: 'POST' }, ['devices'], 'device.activate'),
    deactivate: (id: string) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }, ['devices'], 'device.deactivate'),
    archive: (id: string) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/archive`, { method: 'POST' }, ['devices'], 'device.archive'),
    uploadDocument: (id: string, payload: FormData) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/documents`, { method: 'POST', body: payload }, ['devices'], 'device.document.upload'),
    getDocument: (id: string, documentId: string) => downloadDocument(`/api/admin/devices/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`),
    deleteDocument: (id: string, documentId: string) => mutationRequest(`/api/admin/devices/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }, ['devices'], 'device.document.delete')
  };

  const adminAlerts = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/alerts', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/alerts/${encodeURIComponent(id)}`, options),
    exportCsv: (query: ZentridQueryParams = {}) => exportCsv(`/api/admin/alerts/export${qs(query)}`, 'admin-alerts-export'),
    acknowledge: (id: string, payload: unknown) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/acknowledge`, jsonOptions('POST', payload), ['alerts'], 'alert.acknowledge'),
    assign: (id: string, payload: unknown) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/assign`, jsonOptions('POST', payload), ['alerts'], 'alert.assign'),
    escalate: (id: string, payload: unknown) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/escalate`, jsonOptions('POST', payload), ['alerts'], 'alert.escalate'),
    resolve: (id: string, payload: unknown) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/resolve`, jsonOptions('POST', payload), ['alerts'], 'alert.resolve'),
    timeline: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/alerts/${encodeURIComponent(id)}/timeline`, options),
    related: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/alerts/${encodeURIComponent(id)}/related`, options),
    telemetryCurve: (id: string, query: ZentridQueryParams = {}, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/alerts/${encodeURIComponent(id)}/telemetry-curve${qs(query)}`, options),
    sop: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/alerts/${encodeURIComponent(id)}/sop`, options),
    updateSop: (id: string, payload: unknown) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/sop`, jsonOptions('PUT', payload), ['alerts'], 'alert.sop.update'),
    createTask: (id: string, payload: unknown = {}) => mutationRequest(`/api/admin/alerts/${encodeURIComponent(id)}/tasks`, jsonOptions('POST', payload), ['alerts'], 'alert.task.create')
  };

  const providerPlantAssignments = {
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/provider-plant-assignments', options)
  };

  const providerIntegrations = {
    templates: () => ZentridAPI.request('/api/admin/provider-integrations/templates'),
    template: (providerType: string) => ZentridAPI.request(`/api/admin/provider-integrations/templates/${encodeURIComponent(providerType)}`),
    list: (options: ZentridRequestOptions = {}) => ZentridAPI.request('/api/admin/provider-integrations', options),
    get: (id: string, options: ZentridRequestOptions = {}) => ZentridAPI.request(`/api/admin/provider-integrations/${encodeURIComponent(id)}`, options),
    create: (payload: unknown) => mutationRequest('/api/admin/provider-integrations', jsonOptions('POST', payload), ['integrations'], 'integration.create'),
    validate: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/validate`, { method: 'POST' }, ['integrations'], 'integration.validate'),
    testConnection: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/test-connection`, { method: 'POST' }, ['integrations'], 'integration.test-connection'),
    testSampleData: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/test-sample-data`, { method: 'POST' }, ['integrations'], 'integration.test-sample-data'),
    activate: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/activate`, { method: 'POST' }, ['integrations', 'plants', 'devices', 'alerts'], 'integration.activate'),
    suspend: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/suspend`, { method: 'POST' }, ['integrations', 'plants', 'devices', 'alerts'], 'integration.suspend'),
    archive: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/archive`, { method: 'POST' }, ['integrations', 'plants', 'devices', 'alerts'], 'integration.archive'),
    failed: (id: string) => mutationRequest(`/api/admin/provider-integrations/${encodeURIComponent(id)}/failed`, { method: 'POST' }, ['integrations', 'plants', 'devices', 'alerts'], 'integration.failed')
  };

  const endpointCatalog: ZentridEndpointCatalogItem[] = [
    { group: 'Auth', label: 'Login', method: 'POST', path: '/api/Auth/login', safe: false, used: true, notes: 'Used by login page.' },
    { group: 'Auth', label: 'Register', method: 'POST', path: '/api/Auth/register', safe: false, used: false, notes: 'Manual only. Creates a user/account.' },
    { group: 'Auth', label: 'Refresh Token', method: 'POST', path: '/api/Auth/refresh', safe: false, used: true, notes: 'Used automatically after eligible 401 responses and available manually in API Console.' },
    { group: 'Auth', label: 'Logout', method: 'POST', path: '/api/Auth/logout', safe: false, used: true, notes: 'Used by the global profile Logout action; local session is always cleared even when backend logout is unavailable.' },
    { group: 'Auth', label: 'Current User', method: 'GET', path: '/api/Auth/me', safe: true, used: true, notes: 'Returns current authenticated user/profile.' },
    { group: 'Auth', label: 'Validate Token', method: 'POST', path: '/api/Auth/validate', safe: true, used: true, notes: 'Validates current Bearer token.' },
    { group: 'Jwks', label: 'JWKS', method: 'GET', path: '/.well-known/jwks.json', safe: true, used: false, notes: 'Public JSON Web Key Set endpoint.' },

    { group: 'Clients', label: 'List Clients', method: 'GET', path: '/api/admin/clients', safe: true, used: true, notes: 'Global Admin client registry list.' },
    { group: 'Clients', label: 'Create Client', method: 'POST', path: '/api/admin/clients', safe: false, used: true, notes: 'Used by the existing Create Client wizard.' },
    { group: 'Clients', label: 'Get Client by ID', method: 'GET', path: '/api/admin/clients/{id}', safe: false, used: true, notes: 'Used by Client Detail. Requires the selected client id.' },
    { group: 'Clients', label: 'Update Client', method: 'PUT', path: '/api/admin/clients/{id}', safe: false, used: true, notes: 'Used by Client Detail Save Changes for backend-managed clients.' },
    { group: 'Clients', label: 'Activate Client', method: 'POST', path: '/api/admin/clients/{id}/activate', safe: false, used: true, notes: 'Used by Client Detail lifecycle actions.' },
    { group: 'Clients', label: 'Deactivate Client', method: 'POST', path: '/api/admin/clients/{id}/deactivate', safe: false, used: true, notes: 'Used by Client Detail lifecycle actions.' },
    { group: 'Clients', label: 'Suspend Client', method: 'POST', path: '/api/admin/clients/{id}/suspend', safe: false, used: true, notes: 'Used by Client Detail lifecycle actions.' },
    { group: 'Clients', label: 'Archive Client', method: 'POST', path: '/api/admin/clients/{id}/archive', safe: false, used: true, notes: 'Used by Client Detail lifecycle actions.' },
    { group: 'Clients', label: 'Upload Client Document', method: 'POST', path: '/api/admin/clients/{id}/documents', safe: false, used: true, notes: 'Used by Create Client after the client UUID is returned. Sends multipart/form-data fields file, name, type and optional expiry.' },
    { group: 'Clients', label: 'Get Client Document', method: 'GET', path: '/api/admin/clients/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Client Detail to download persisted backend documents.' },
    { group: 'Clients', label: 'Delete Client Document', method: 'DELETE', path: '/api/admin/clients/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Client Detail for persisted document deletion.' },

    { group: 'PlantRegistry', label: 'List Admin Plants', method: 'GET', path: '/api/admin/plants', safe: true, used: true, notes: 'Admin plant registry list.' },
    { group: 'PlantRegistry', label: 'Create Admin Plant', method: 'POST', path: '/api/admin/plants', safe: false, used: true, notes: 'Used by the existing Create Plant wizard.' },
    { group: 'PlantRegistry', label: 'Get Admin Plant by ID', method: 'GET', path: '/api/admin/plants/{id}', safe: false, used: true, notes: 'Used by Plant Detail. Requires the selected plant id.' },
    { group: 'PlantRegistry', label: 'Update Admin Plant', method: 'PUT', path: '/api/admin/plants/{id}', safe: false, used: true, notes: 'Used by Plant Detail editing for live backend-managed plant records.' },
    { group: 'PlantRegistry', label: 'Create Device in Plant', method: 'POST', path: '/api/admin/plants/{plantId}/devices', safe: false, used: false, notes: 'Integrated as plantRegistry.createDevice(). Plant id comes from the URL; use from a plant-scoped Add Device flow.' },
    { group: 'PlantRegistry', label: 'Activate Admin Plant', method: 'POST', path: '/api/admin/plants/{id}/activate', safe: false, used: true, notes: 'Used by Plant Detail lifecycle controls.' },
    { group: 'PlantRegistry', label: 'Deactivate Admin Plant', method: 'POST', path: '/api/admin/plants/{id}/deactivate', safe: false, used: true, notes: 'Used by Plant Detail lifecycle controls.' },
    { group: 'PlantRegistry', label: 'Archive Admin Plant', method: 'POST', path: '/api/admin/plants/{id}/archive', safe: false, used: true, notes: 'Used by Plant Detail lifecycle controls.' },
    { group: 'PlantRegistry', label: 'Upload Plant Document', method: 'POST', path: '/api/admin/plants/{id}/documents', safe: false, used: true, notes: 'Used by Plant Detail Reports & Documents.' },
    { group: 'PlantRegistry', label: 'Get Plant Document', method: 'GET', path: '/api/admin/plants/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Plant Detail document actions.' },
    { group: 'PlantRegistry', label: 'Delete Plant Document', method: 'DELETE', path: '/api/admin/plants/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Plant Detail document actions.' },

    { group: 'Platform Live API', label: 'Live Alerts', method: 'GET', path: '/api/alerts', safe: true, used: true, notes: 'Used for operational alert snapshots and Overview enrichment; the Global Admin registry list remains /api/admin/alerts.' },
    { group: 'Platform Live API', label: 'Live Alert Export', method: 'GET', path: '/api/alerts/export', safe: false, used: true, notes: 'Used by Alerts export; verified CSV attachment response.' },
    { group: 'Platform Live API', label: 'Live Alert Detail', method: 'GET', path: '/api/alerts/{id}', safe: false, used: true, notes: 'Mapped into Alert Detail operational context alongside the admin registry record.' },
    { group: 'Platform Live API', label: 'Live Alert Acknowledge', method: 'POST', path: '/api/alerts/{id}/acknowledge', safe: false, used: false, notes: 'Connected operational mutation API; not auto-invoked from Global Admin while admin workflow actions remain authoritative there.' },
    { group: 'Platform Live API', label: 'Live Alert Assign', method: 'POST', path: '/api/alerts/{id}/assign', safe: false, used: false, notes: 'Connected operational mutation API; current Global Admin action uses the admin branch.' },
    { group: 'Platform Live API', label: 'Live Alert Escalate', method: 'POST', path: '/api/alerts/{id}/escalate', safe: false, used: false, notes: 'Connected operational mutation API; current Global Admin action uses the admin branch.' },
    { group: 'Platform Live API', label: 'Live Alert Resolve', method: 'POST', path: '/api/alerts/{id}/resolve', safe: false, used: false, notes: 'Connected operational mutation API; current Global Admin action uses the admin branch.' },
    { group: 'Platform Live API', label: 'Live Alert Timeline', method: 'GET', path: '/api/alerts/{id}/timeline', safe: false, used: true, notes: 'Mapped into Alert Detail timeline.' },
    { group: 'Platform Live API', label: 'Live Alert Related', method: 'GET', path: '/api/alerts/{id}/related', safe: false, used: true, notes: 'Mapped into Alert Detail related-object context.' },
    { group: 'Platform Live API', label: 'Live Alert Telemetry Curve', method: 'GET', path: '/api/alerts/{id}/telemetry-curve', safe: false, used: true, notes: 'Mapped into Alert Detail event-window telemetry.' },
    { group: 'Platform Live API', label: 'Live Alert SOP', method: 'GET', path: '/api/alerts/{id}/sop', safe: false, used: true, notes: 'Mapped into Alert Detail SOP checklist.' },
    { group: 'Platform Live API', label: 'Update Live Alert SOP', method: 'PUT', path: '/api/alerts/{id}/sop', safe: false, used: false, notes: 'Connected operational SOP mutation API; role-specific UI invocation remains separate from Global Admin.' },
    { group: 'Platform Live API', label: 'Create Live Alert Task', method: 'POST', path: '/api/alerts/{id}/tasks', safe: false, used: false, notes: 'Connected operational task creation API; not automatically invoked by Global Admin.' },
    { group: 'DeviceRegistry', label: 'List Admin Devices', method: 'GET', path: '/api/admin/devices', safe: true, used: true, notes: 'Primary Global Admin Device Registry list. Supports page and pageSize plus device filters.' },
    { group: 'DeviceRegistry', label: 'Get Admin Device', method: 'GET', path: '/api/admin/devices/{id}', safe: false, used: true, notes: 'Device Detail core administrative record.' },
    { group: 'DeviceRegistry', label: 'Create Admin Device', method: 'POST', path: '/api/admin/devices', safe: false, used: true, notes: 'Used by Device Registry Add Device.' },
    { group: 'DeviceRegistry', label: 'Update Admin Device', method: 'PUT', path: '/api/admin/devices/{id}', safe: false, used: true, notes: 'Used by Device Detail edit flow.' },
    { group: 'DeviceRegistry', label: 'Send Device Command', method: 'POST', path: '/api/admin/devices/{id}/commands', safe: false, used: false, notes: 'Typed API method is connected. UI command execution remains disabled until backend publishes allowed commandType values and approval rules.' },
    { group: 'DeviceRegistry', label: 'Activate Device', method: 'POST', path: '/api/admin/devices/{id}/activate', safe: false, used: true, notes: 'Used by Device Detail lifecycle controls. Verified Draft/Inactive → Active.' },
    { group: 'DeviceRegistry', label: 'Deactivate Device', method: 'POST', path: '/api/admin/devices/{id}/deactivate', safe: false, used: true, notes: 'Used by Device Detail lifecycle controls. Verified Active → Inactive.' },
    { group: 'DeviceRegistry', label: 'Archive Device', method: 'POST', path: '/api/admin/devices/{id}/archive', safe: false, used: true, notes: 'Used by Device Detail lifecycle controls. Verified soft archive with Archived lifecycle status.' },
    { group: 'DeviceRegistry', label: 'Upload Device Document', method: 'POST', path: '/api/admin/devices/{id}/documents', safe: false, used: true, notes: 'Used by Device Detail document upload.' },
    { group: 'DeviceRegistry', label: 'Get Device Document', method: 'GET', path: '/api/admin/devices/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Device Detail download through binary-aware API helper.' },
    { group: 'DeviceRegistry', label: 'Delete Device Document', method: 'DELETE', path: '/api/admin/devices/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Device Detail document delete.' },
    { group: 'DeviceRegistry', label: 'Device Audit', method: 'GET', path: '/api/admin/devices/{id}/audit', safe: false, used: true, notes: 'Device Detail audit timeline.' },
    { group: 'DeviceRegistry', label: 'Linked Devices', method: 'GET', path: '/api/admin/devices/{id}/linked-devices', safe: false, used: true, notes: 'Logger, gateway and topology linked-device records.' },
    { group: 'DeviceRegistry', label: 'Device Connectivity', method: 'GET', path: '/api/admin/devices/{id}/connectivity', safe: false, used: true, notes: 'Connectivity summary for Device Detail.' },
    { group: 'DeviceRegistry', label: 'Device Network', method: 'GET', path: '/api/admin/devices/{id}/network', safe: false, used: true, notes: 'Network configuration and status for Device Detail.' },
    { group: 'DeviceRegistry', label: 'Device Warranty', method: 'GET', path: '/api/admin/devices/{id}/warranty', safe: false, used: true, notes: 'Warranty and lifecycle metadata for Device Detail.' },
    { group: 'DeviceRegistry', label: 'Latest Device Telemetry', method: 'GET', path: '/api/admin/devices/{id}/telemetry/latest', safe: false, used: true, notes: 'Latest normalized type-specific telemetry snapshot.' },
    { group: 'Platform Live API', label: 'Live Devices', method: 'GET', path: '/api/devices', safe: true, used: true, notes: 'Used by Device Detail to resolve the public Device UUID by provider + sourceDeviceId.' },
    { group: 'Platform Live API', label: 'Live Device Detail', method: 'GET', path: '/api/devices/{id}', safe: false, used: true, notes: 'Mapped into Device Detail Source & Sync and operational KPI context.' },
    { group: 'Platform Live API', label: 'Live Device Connectivity', method: 'GET', path: '/api/devices/{id}/connectivity', safe: false, used: true, notes: 'Mapped into Device Detail Connectivity alongside DeviceRegistry connectivity.' },
    { group: 'Platform Live API', label: 'Live Device Network', method: 'GET', path: '/api/devices/{id}/network', safe: false, used: true, notes: 'Mapped into Device Detail Connectivity alongside DeviceRegistry network data.' },
    { group: 'Platform Live API', label: 'Live Device Warranty', method: 'GET', path: '/api/devices/{id}/warranty', safe: false, used: true, notes: 'Mapped into Device Detail Passport and Lifecycle alongside DeviceRegistry warranty.' },
    { group: 'Platform Live API', label: 'Live Device Latest Telemetry', method: 'GET', path: '/api/devices/{id}/telemetry/latest', safe: false, used: true, notes: 'Mapped into Device Detail Telemetry; an empty object remains a valid no-snapshot state.' },
    { group: 'Platform Live API', label: 'Live Integrations', method: 'GET', path: '/api/integrations', safe: true, used: true, notes: 'Returns provider integration summary list.' },
    { group: 'Platform Live API', label: 'Live Plants', method: 'GET', path: '/api/plants', safe: true, used: true, notes: 'Returns normalized plant list.' },
    { group: 'Platform Live API', label: 'Providers', method: 'GET', path: '/api/Providers', safe: true, used: true, notes: 'Returns provider registry.' },
    { group: 'Platform Live API', label: 'Telemetry', method: 'GET', path: '/api/telemetry', safe: true, used: true, notes: 'Used by Telemetry Governance through the typed telemetry repository with server pagination and preserved raw payloads.' },

    { group: 'Admin Alerts', label: 'List Alerts', method: 'GET', path: '/api/admin/alerts', safe: true, used: true, notes: 'Primary Alerts registry endpoint with filters, KPI and server pagination.' },
    { group: 'Admin Alerts', label: 'Export Alerts', method: 'GET', path: '/api/admin/alerts/export', safe: false, used: true, notes: 'Downloads filtered CSV output.' },
    { group: 'Admin Alerts', label: 'Get Alert by ID', method: 'GET', path: '/api/admin/alerts/{id}', safe: false, used: true, notes: 'Primary Alert Detail endpoint.' },
    { group: 'Admin Alerts', label: 'Acknowledge Alert', method: 'POST', path: '/api/admin/alerts/{id}/acknowledge', safe: false, used: true, notes: 'Operational mutation from Alert Detail.' },
    { group: 'Admin Alerts', label: 'Assign Alert', method: 'POST', path: '/api/admin/alerts/{id}/assign', safe: false, used: true, notes: 'Operational mutation from Alert Detail.' },
    { group: 'Admin Alerts', label: 'Escalate Alert', method: 'POST', path: '/api/admin/alerts/{id}/escalate', safe: false, used: true, notes: 'Operational mutation from Alert Detail.' },
    { group: 'Admin Alerts', label: 'Resolve Alert', method: 'POST', path: '/api/admin/alerts/{id}/resolve', safe: false, used: true, notes: 'Operational mutation from Alert Detail.' },
    { group: 'Admin Alerts', label: 'Alert Timeline', method: 'GET', path: '/api/admin/alerts/{id}/timeline', safe: false, used: true, notes: 'Lazy Alert Detail timeline.' },
    { group: 'Admin Alerts', label: 'Alert Related Objects', method: 'GET', path: '/api/admin/alerts/{id}/related', safe: false, used: true, notes: 'Lazy Alert Detail related objects.' },
    { group: 'Admin Alerts', label: 'Alert Telemetry Curve', method: 'GET', path: '/api/admin/alerts/{id}/telemetry-curve', safe: false, used: true, notes: 'Lazy telemetry curve around alert time.' },
    { group: 'Admin Alerts', label: 'Get Alert SOP', method: 'GET', path: '/api/admin/alerts/{id}/sop', safe: false, used: true, notes: 'Lazy SOP read.' },
    { group: 'Admin Alerts', label: 'Update Alert SOP', method: 'PUT', path: '/api/admin/alerts/{id}/sop', safe: false, used: true, notes: 'Persists Alert SOP state.' },
    { group: 'Admin Alerts', label: 'Create Alert Task', method: 'POST', path: '/api/admin/alerts/{id}/tasks', safe: false, used: true, notes: 'Creates a task linked to an alert; request DTO remains backend-defined.' },

    { group: 'ProviderPlantAssignments', label: 'List Provider Plant Assignments', method: 'GET', path: '/api/admin/provider-plant-assignments', safe: true, used: true, notes: 'Read-only vendor sourcePlantId → Plant Registry UUID mapping used for canonical identity resolution.' },

    { group: 'ProviderIntegrations', label: 'List Provider Templates', method: 'GET', path: '/api/admin/provider-integrations/templates', safe: true, used: true, notes: 'Returns available provider template names.' },
    { group: 'ProviderIntegrations', label: 'Provider Template by Type', method: 'GET', path: '/api/admin/provider-integrations/templates/{providerType}', safe: false, used: true, notes: 'Used by the existing Connector Wizard after provider selection.' },
    { group: 'ProviderIntegrations', label: 'List Provider Integrations', method: 'GET', path: '/api/admin/provider-integrations', safe: true, used: true, notes: 'Provider integration registry list.' },
    { group: 'ProviderIntegrations', label: 'Create Provider Integration', method: 'POST', path: '/api/admin/provider-integrations', safe: false, used: true, notes: 'Used by the existing Create Connector wizard.' },
    { group: 'ProviderIntegrations', label: 'Get Provider Integration by ID', method: 'GET', path: '/api/admin/provider-integrations/{id}', safe: false, used: true, notes: 'Used by Integration Detail. Requires provider integration id.' },
    { group: 'ProviderIntegrations', label: 'Validate Provider Integration', method: 'POST', path: '/api/admin/provider-integrations/{id}/validate', safe: false, used: true, notes: 'Used by the existing Integration Detail validation action.' },
    { group: 'ProviderIntegrations', label: 'Test Provider Connection', method: 'POST', path: '/api/admin/provider-integrations/{id}/test-connection', safe: false, used: true, notes: 'Used by the existing Integration Detail connection test action.' },
    { group: 'ProviderIntegrations', label: 'Test Provider Sample Data', method: 'POST', path: '/api/admin/provider-integrations/{id}/test-sample-data', safe: false, used: true, notes: 'Used by the existing Integration Detail sample-data test action.' },
    { group: 'ProviderIntegrations', label: 'Activate Provider Integration', method: 'POST', path: '/api/admin/provider-integrations/{id}/activate', safe: false, used: true, notes: 'Used by the existing Integration Detail lifecycle action.' },
    { group: 'ProviderIntegrations', label: 'Suspend Provider Integration', method: 'POST', path: '/api/admin/provider-integrations/{id}/suspend', safe: false, used: true, notes: 'Used by the existing Integration Detail lifecycle action.' },
    { group: 'ProviderIntegrations', label: 'Archive Provider Integration', method: 'POST', path: '/api/admin/provider-integrations/{id}/archive', safe: false, used: true, notes: 'Used by the existing Integration Detail lifecycle action.' },
    { group: 'ProviderIntegrations', label: 'Mark Provider Integration Failed', method: 'POST', path: '/api/admin/provider-integrations/{id}/failed', safe: false, used: false, notes: 'Manual only. Lifecycle/error-state write action.' },

    { group: 'Tenants', label: 'List Tenants', method: 'GET', path: '/api/admin/tenants', safe: true, used: true, notes: 'Global Admin tenant registry list.' },
    { group: 'Tenants', label: 'Create Tenant', method: 'POST', path: '/api/admin/tenants', safe: false, used: true, notes: 'Used by the existing Tenant Provisioning Wizard.' },
    { group: 'Tenants', label: 'Get Tenant by ID', method: 'GET', path: '/api/admin/tenants/{id}', safe: false, used: true, notes: 'Used by Tenant Detail. Requires the selected tenant id.' },
    { group: 'Tenants', label: 'Update Tenant', method: 'PUT', path: '/api/admin/tenants/{id}', safe: false, used: true, notes: 'Used by Tenant Detail editing with the nested tenant update DTO.' },
    { group: 'Tenants', label: 'Activate Tenant', method: 'POST', path: '/api/admin/tenants/{id}/activate', safe: false, used: true, notes: 'Used by the existing Tenant Detail lifecycle action.' },
    { group: 'Tenants', label: 'Deactivate Tenant', method: 'POST', path: '/api/admin/tenants/{id}/deactivate', safe: false, used: true, notes: 'Used by the existing Tenant Detail lifecycle action.' },
    { group: 'Tenants', label: 'Archive Tenant', method: 'POST', path: '/api/admin/tenants/{id}/archive', safe: false, used: true, notes: 'Used by the existing Tenant Detail lifecycle action.' },
    { group: 'Tenants', label: 'Upload Tenant Document', method: 'POST', path: '/api/admin/tenants/{id}/documents', safe: false, used: true, notes: 'Used by Tenant create/detail document upload flows.' },
    { group: 'Tenants', label: 'Get Tenant Document', method: 'GET', path: '/api/admin/tenants/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Tenant Detail to download persisted backend documents.' },
    { group: 'Tenants', label: 'Delete Tenant Document', method: 'DELETE', path: '/api/admin/tenants/{id}/documents/{documentId}', safe: false, used: true, notes: 'Used by Tenant Detail for persisted document deletion.' }
  ];

  async function checkCatalog({ includeUnsafe = false }: { includeUnsafe?: boolean } = {}): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>> {
    const checks = endpointCatalog.filter(item => item.safe || includeUnsafe);
    const results: Array<ZentridEndpointCatalogItem & ZentridRawRequestResult> = [];
    for (const endpoint of checks) {
      if (!endpoint.safe || endpoint.path.includes('{')) {
        results.push({ ...endpoint, ok: false, skipped: true, status: 'Skipped', statusText: 'Skipped', ms: 0, count: null, data: null, error: 'Manual endpoint. Use Manual Request Runner with concrete id/body.', path: endpoint.path, method: String(endpoint.method), source: sourceLabel() });
        continue;
      }
      const diagnosticPath = endpoint.path === '/api/integrations'
        ? '/api/integrations?page=1&pageSize=1'
        : endpoint.path;
      const result = await rawRequest(diagnosticPath, { method: endpoint.method });
      results.push({ ...endpoint, ...result, notes: endpoint.path === '/api/integrations'
        ? `${endpoint.notes} Health check uses pageSize=1 because the current backend summary query times out on larger/unpaged reads.`
        : endpoint.notes });
    }
    return results;
  }

  async function checkAllReadEndpoints(): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>> {
    return checkCatalog({ includeUnsafe: false });
  }

  return {
    auth,
    live,
    liveDevices,
    liveAlerts,
    tenants,
    clients,
    plantRegistry,
    deviceRegistry,
    adminAlerts,
    providerPlantAssignments,
    providerIntegrations,
    endpointCatalog,
    allowedEndpointPatterns,
    isAllowedPath,
    checkCatalog,
    checkAllReadEndpoints,
    rawRequest,
    qs
  };
})();

window.ZentridPlatformAPI = ZentridPlatformAPI;
