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
  pagination?: FleetApiDiagnosticPagination;
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

type ZentridMutationEntity = 'clients' | 'plants' | 'devices' | 'alerts' | 'integrations';

type ZentridPlatformModule = {
  list(): Promise<unknown>;
  get(id: string): Promise<unknown>;
  create(payload: unknown): Promise<unknown>;
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
  clients: ZentridPlatformModule;
  plantRegistry: ZentridPlatformModule;
  providerIntegrations: {
    templates(): Promise<unknown>;
    template(providerType: string): Promise<unknown>;
    list(): Promise<unknown>;
    get(id: string): Promise<unknown>;
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
    /^\/api\/admin\/clients(?:\/[^/]+)?$/,
    /^\/api\/admin\/plants(?:\/[^/]+)?$/,
    /^\/api\/alerts$/,
    /^\/api\/devices$/,
    /^\/api\/integrations$/,
    /^\/api\/plants$/,
    /^\/api\/Providers$/,
    /^\/api\/telemetry$/,
    /^\/api\/admin\/provider-integrations$/,
    /^\/api\/admin\/provider-integrations\/templates(?:\/[^/]+)?$/,
    /^\/api\/admin\/provider-integrations\/[^/]+$/
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
    const result = await FleetAPI.request<T>(path, options);
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

  function collectionCount(value: unknown): number | null {
    if (Array.isArray(value)) return value.length;
    if (!isRecord(value)) return null;
    const items = value.items;
    const data = value.data;
    if (Array.isArray(items)) return items.length;
    if (Array.isArray(data)) return data.length;
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
      const responsePagination = typeof FleetAPIDiagnostics === 'undefined'
        ? { page: null, pageSize: null, totalCount: null, totalPages: null }
        : FleetAPIDiagnostics.pagination(parsedBody);
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
    jwks: () => FleetAPI.request('/.well-known/jwks.json')
  };

  const live = {
    plants: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/plants', options),
    devices: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/devices', options),
    alerts: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/alerts', options),
    integrations: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/integrations', options),
    providers: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/Providers', options),
    telemetry: (options: ZentridRequestOptions = {}) => FleetAPI.request('/api/telemetry', options)
  };



  const clients = {
    list: () => FleetAPI.request('/api/admin/clients'),
    get: (id: string) => FleetAPI.request(`/api/admin/clients/${encodeURIComponent(id)}`),
    create: (payload: unknown) => mutationRequest('/api/admin/clients', jsonOptions('POST', payload), ['clients'], 'client.create')
  };

  const plantRegistry = {
    list: () => FleetAPI.request('/api/admin/plants'),
    get: (id: string) => FleetAPI.request(`/api/admin/plants/${encodeURIComponent(id)}`),
    create: (payload: unknown) => mutationRequest('/api/admin/plants', jsonOptions('POST', payload), ['plants'], 'plant.create')
  };

  const providerIntegrations = {
    templates: () => FleetAPI.request('/api/admin/provider-integrations/templates'),
    template: (providerType: string) => FleetAPI.request(`/api/admin/provider-integrations/templates/${encodeURIComponent(providerType)}`),
    list: () => FleetAPI.request('/api/admin/provider-integrations'),
    get: (id: string) => FleetAPI.request(`/api/admin/provider-integrations/${encodeURIComponent(id)}`),
  };

  const endpointCatalog: ZentridEndpointCatalogItem[] = [
    { group: 'Auth', label: 'Login', method: 'POST', path: '/api/Auth/login', safe: false, used: true, notes: 'Used by login page.' },
    { group: 'Auth', label: 'Register', method: 'POST', path: '/api/Auth/register', safe: false, used: false, notes: 'Manual only. Creates a user/account.' },
    { group: 'Auth', label: 'Refresh Token', method: 'POST', path: '/api/Auth/refresh', safe: false, used: true, notes: 'Manual only. Refreshes session.' },
    { group: 'Auth', label: 'Logout', method: 'POST', path: '/api/Auth/logout', safe: false, used: true, notes: 'Manual only. Ends backend session.' },
    { group: 'Auth', label: 'Current User', method: 'GET', path: '/api/Auth/me', safe: true, used: true, notes: 'Returns current authenticated user/profile.' },
    { group: 'Auth', label: 'Validate Token', method: 'POST', path: '/api/Auth/validate', safe: true, used: true, notes: 'Validates current Bearer token.' },
    { group: 'Jwks', label: 'JWKS', method: 'GET', path: '/.well-known/jwks.json', safe: true, used: false, notes: 'Public JSON Web Key Set endpoint.' },

    { group: 'Clients', label: 'List Clients', method: 'GET', path: '/api/admin/clients', safe: true, used: true, notes: 'Tenant-scoped client registry list.' },
    { group: 'Clients', label: 'Create Client', method: 'POST', path: '/api/admin/clients', safe: false, used: false, notes: 'Manual only. Creates a client.' },
    { group: 'Clients', label: 'Get Client by ID', method: 'GET', path: '/api/admin/clients/{id}', safe: false, used: false, notes: 'Manual only. Requires client id.' },

    { group: 'PlantRegistry', label: 'List Admin Plants', method: 'GET', path: '/api/admin/plants', safe: true, used: true, notes: 'Admin plant registry list.' },
    { group: 'PlantRegistry', label: 'Create Admin Plant', method: 'POST', path: '/api/admin/plants', safe: false, used: false, notes: 'Manual only. Creates a plant.' },
    { group: 'PlantRegistry', label: 'Get Admin Plant by ID', method: 'GET', path: '/api/admin/plants/{id}', safe: false, used: false, notes: 'Manual only. Requires plant id.' },

    { group: 'Platform Live API', label: 'Live Alerts', method: 'GET', path: '/api/alerts', safe: true, used: true, notes: 'Returns normalized alert list.' },
    { group: 'Platform Live API', label: 'Live Devices', method: 'GET', path: '/api/devices', safe: true, used: true, notes: 'Returns normalized device list.' },
    { group: 'Platform Live API', label: 'Live Integrations', method: 'GET', path: '/api/integrations', safe: true, used: true, notes: 'Returns provider integration summary list.' },
    { group: 'Platform Live API', label: 'Live Plants', method: 'GET', path: '/api/plants', safe: true, used: true, notes: 'Returns normalized plant list.' },
    { group: 'Platform Live API', label: 'Providers', method: 'GET', path: '/api/Providers', safe: true, used: true, notes: 'Returns provider registry.' },
    { group: 'Platform Live API', label: 'Telemetry', method: 'GET', path: '/api/telemetry', safe: true, used: true, notes: 'Returns tenant-scoped telemetry records.' },

    { group: 'ProviderIntegrations', label: 'List Provider Templates', method: 'GET', path: '/api/admin/provider-integrations/templates', safe: true, used: true, notes: 'Returns available provider template names.' },
    { group: 'ProviderIntegrations', label: 'Provider Template by Type', method: 'GET', path: '/api/admin/provider-integrations/templates/{providerType}', safe: false, used: false, notes: 'Manual only. Requires provider type.' },
    { group: 'ProviderIntegrations', label: 'List Provider Integrations', method: 'GET', path: '/api/admin/provider-integrations', safe: true, used: true, notes: 'Provider integration registry list.' },
    { group: 'ProviderIntegrations', label: 'Get Provider Integration by ID', method: 'GET', path: '/api/admin/provider-integrations/{id}', safe: false, used: false, notes: 'Manual only. Requires provider integration id.' },

  ];

  async function checkCatalog({ includeUnsafe = false }: { includeUnsafe?: boolean } = {}): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>> {
    const checks = endpointCatalog.filter(item => item.safe || includeUnsafe);
    const results: Array<ZentridEndpointCatalogItem & ZentridRawRequestResult> = [];
    for (const endpoint of checks) {
      if (!endpoint.safe || endpoint.path.includes('{')) {
        results.push({ ...endpoint, ok: false, skipped: true, status: 'Skipped', statusText: 'Skipped', ms: 0, count: null, data: null, error: 'Manual endpoint. Use Manual Request Runner with concrete id/body.', path: endpoint.path, method: String(endpoint.method), source: sourceLabel() });
        continue;
      }
      const result = await rawRequest(endpoint.path, { method: endpoint.method });
      results.push({ ...endpoint, ...result });
    }
    return results;
  }

  async function checkAllReadEndpoints(): Promise<Array<ZentridEndpointCatalogItem & ZentridRawRequestResult>> {
    return checkCatalog({ includeUnsafe: false });
  }

  return {
    auth,
    live,
    clients,
    plantRegistry,
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
