type ZentridJson = null | boolean | number | string | ZentridJson[] | { [key: string]: ZentridJson };
type ZentridUnknownRecord = Record<string, unknown> & {
  token?: string;
  accessToken?: string;
  access_token?: string;
  jwt?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: ZentridUnknownRecord;
  profile?: ZentridUnknownRecord;
  data?: ZentridUnknownRecord;
  result?: ZentridUnknownRecord;
  expiresIn?: string | number;
  expires_in?: string | number;
  expiresAt?: string | number;
  expires_at?: string | number;
  username?: string;
  role?: string | string[];
  roles?: string | string[];
};

type ZentridRequestOptions = RequestInit & {
  auth?: boolean;
  baseUrl?: string;
  timeoutMs?: number;
  retryAuth?: boolean;
  retry?: boolean | number;
  retryDelayMs?: number;
  retryStatuses?: number[];
};

type ZentridJwtClaims = ZentridUnknownRecord;

type ZentridUser = ZentridUnknownRecord | null;

type ZentridSession = {
  accessToken: string;
  refreshToken: string;
  user: ZentridUser;
  claims: ZentridJwtClaims;
  role: string | string[];
  roles: string[];
  expiresAt: string;
  expired: boolean;
};

type ZentridConfigAPI = {
  readonly authBaseUrl: string;
  readonly apiBaseUrl: string;
  setAuthBaseUrl(value: string): void;
  setApiBaseUrl(value: string): void;
  isLocalFrontend(): boolean;
  defaultBaseUrl(): string;
};

type ZentridAuthAPI = {
  login(username: string, password: string): Promise<ZentridSession>;
  register(data?: ZentridUnknownRecord): Promise<unknown>;
  refresh(): Promise<ZentridSession>;
  me(): Promise<unknown>;
  validate(): Promise<unknown>;
  ensureSession(requiredRole?: string): Promise<boolean>;
  logout(redirect?: boolean): Promise<void>;
  request<T = unknown>(path: string, options?: ZentridRequestOptions): Promise<T>;
  getAccessToken(): string;
  getRefreshToken(): string;
  getUser(): ZentridUser;
  getSession(): ZentridSession;
  getJwtClaims(): ZentridJwtClaims;
  getRoles(): string[];
  hasRole(role: string): boolean;
  readRoleFromClaims(claims?: ZentridJwtClaims): string | string[];
  decodeJwtPayload(token?: string): ZentridJwtClaims | null;
  isTokenExpired(skewSeconds?: number): boolean;
  isAuthenticated(): boolean;
};

type ZentridAPIClient = {
  request<T = unknown>(path: string, options?: ZentridRequestOptions): Promise<T>;
  auth: ZentridAuthAPI;
  config: ZentridConfigAPI;
};

class ZentridRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path: string;
  readonly responseBody: unknown;

  constructor(message: string, status: number, code: string, path: string, responseBody: unknown = null) {
    super(message);
    this.name = 'ZentridRequestError';
    this.status = status;
    this.code = code;
    this.path = path;
    this.responseBody = responseBody;
  }
}

const ZentridConfig: ZentridConfigAPI = (() => {
  const LOCAL_PROXY_BASE_URL = 'http://localhost:5050';
  function isLegacyDirectBackend(value: string): boolean {
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      return new URL(value).hostname.toLowerCase().endsWith('.unisys.am');
    } catch (_error) {
      return false;
    }
  }

  function isLocalFrontend(): boolean {
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  }

  function defaultBaseUrl(): string {
    // Local Live Server runs on 127.0.0.1:5500, while the API proxy runs on localhost:5050.
    // Vercel must stay relative so vercel.json rewrites /api/* to the real Swagger backends.
    return isLocalFrontend() ? LOCAL_PROXY_BASE_URL : '';
  }

  function clean(value: unknown): string {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function get(key: string): string {
    const stored = clean(localStorage.getItem(key));

    // Previous patches may have stored the real Swagger domains in localStorage.
    // That bypasses the proxy and causes browser OPTIONS/CORS errors, so ignore them.
    if (isLegacyDirectBackend(stored)) return defaultBaseUrl();

    return stored || defaultBaseUrl();
  }

  function set(key: string, value: string): void {
    const next = clean(value);
    if (!next || isLegacyDirectBackend(next)) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
  }

  return {
    get authBaseUrl() { return get('zentrid_auth_base_url'); },
    get apiBaseUrl() { return get('zentrid_api_base_url'); },
    setAuthBaseUrl(value: string) { set('zentrid_auth_base_url', value); },
    setApiBaseUrl(value: string) { set('zentrid_api_base_url', value); },
    isLocalFrontend,
    defaultBaseUrl
  };
})();

const ZentridAuth: ZentridAuthAPI = (() => {
  const ACCESS_TOKEN_KEY = 'zentrid_access_token';
  const REFRESH_TOKEN_KEY = 'zentrid_refresh_token';
  const USER_KEY = 'zentrid_auth_user';
  const EXPIRES_AT_KEY = 'zentrid_token_expires_at';
  const DEFAULT_TIMEOUT_MS = 15_000;
  const TOKEN_EXPIRY_SKEW_SECONDS = 30;
  const DEFAULT_SAFE_RETRIES = 2;
  const DEFAULT_RETRY_DELAY_MS = 350;
  const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];
  const REFRESH_LOCK_KEY = 'zentrid_refresh_lock_v137';
  const REFRESH_LOCK_TTL_MS = 10_000;
  const REFRESH_WAIT_MS = 8_000;
  const TAB_ID = (() => {
    try {
      const existing = sessionStorage.getItem('zentrid_tab_id_v137');
      if (existing) return existing;
      const created = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('zentrid_tab_id_v137', created);
      return created;
    } catch (_error) {
      return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  })();
  const AUTH_STORAGE_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, EXPIRES_AT_KEY] as const;
  const authStorage: Storage = (() => {
    try {
      sessionStorage.setItem('zentrid_auth_storage_v139', 'sessionStorage');
      return sessionStorage;
    } catch (_error) {
      return localStorage;
    }
  })();

  function migrateLegacyAuthStorage(): void {
    if (authStorage === localStorage) return;
    let migrated = false;
    AUTH_STORAGE_KEYS.forEach(key => {
      try {
        const legacy = localStorage.getItem(key);
        if (legacy !== null && authStorage.getItem(key) === null) {
          authStorage.setItem(key, legacy);
          migrated = true;
        }
        localStorage.removeItem(key);
      } catch (_error) {
        // Storage migration remains best-effort in privacy-restricted contexts.
      }
    });
    if (migrated) window.dispatchEvent(new CustomEvent('zentrid:auth-storage-migrated', { detail: { storage: 'sessionStorage' } }));
  }

  migrateLegacyAuthStorage();
  let refreshPromise: Promise<ZentridSession> | null = null;

  function isRecord(value: unknown): value is ZentridUnknownRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function textValue(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  function readTokenFromPayload(payload: ZentridUnknownRecord | null | undefined): string {
    return payload?.token || payload?.accessToken || payload?.access_token || payload?.jwt || payload?.data?.token || payload?.data?.accessToken || payload?.result?.token || payload?.result?.accessToken || '';
  }

  function readRefreshTokenFromPayload(payload: ZentridUnknownRecord | null | undefined): string {
    return payload?.refreshToken || payload?.refresh_token || payload?.data?.refreshToken || payload?.data?.refresh_token || payload?.result?.refreshToken || payload?.result?.refresh_token || '';
  }

  function payloadRole(payload: ZentridUnknownRecord | null | undefined): string | string[] {
    return payload?.role
      || payload?.roles
      || payload?.data?.role
      || payload?.data?.roles
      || payload?.result?.role
      || payload?.result?.roles
      || '';
  }

  function readUserFromPayload(payload: ZentridUnknownRecord | null | undefined, username: string, fallbackUser: ZentridUser = null): ZentridUnknownRecord {
    const user = payload?.user || payload?.data?.user || payload?.result?.user || payload?.profile;
    const role = payloadRole(payload);
    if (user) {
      if (role && !user.role && !user.roles) return { ...user, role };
      return user;
    }
    if (fallbackUser) return fallbackUser;
    return role ? { username, role } : { username };
  }

  function decodeJwtPayload(token = getAccessToken()): ZentridJwtClaims | null {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes)) as ZentridJwtClaims;
    } catch (error) {
      return null;
    }
  }

  function expirationFromValue(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value < 10_000_000_000 ? value * 1000 : value;
    }
    if (typeof value !== 'string' || !value.trim()) return 0;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function tokenExpirationMs(token = getAccessToken()): number {
    const stored = expirationFromValue(authStorage.getItem(EXPIRES_AT_KEY));
    if (stored) return stored;
    const claims = decodeJwtPayload(token);
    return expirationFromValue(claims?.exp);
  }

  function clearSession(): void {
    authStorage.removeItem(ACCESS_TOKEN_KEY);
    authStorage.removeItem(REFRESH_TOKEN_KEY);
    authStorage.removeItem(USER_KEY);
    authStorage.removeItem(EXPIRES_AT_KEY);
    if (authStorage !== localStorage) AUTH_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent('zentrid:auth', { detail: getSession() }));
  }

  function storeSession(payload: ZentridUnknownRecord | null | undefined, username: string, preserveRefreshToken = false): ZentridSession {
    const accessToken = readTokenFromPayload(payload);
    const refreshToken = readRefreshTokenFromPayload(payload);
    if (!accessToken) throw new ZentridRequestError('Login response does not contain access token.', 0, 'INVALID_AUTH_RESPONSE', '/api/Auth/login');

    authStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) authStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else if (!preserveRefreshToken) authStorage.removeItem(REFRESH_TOKEN_KEY);
    authStorage.setItem(USER_KEY, JSON.stringify(readUserFromPayload(payload, username, preserveRefreshToken ? getUser() : null)));

    const expiresIn = payload?.expiresIn || payload?.expires_in || payload?.data?.expiresIn || payload?.result?.expiresIn;
    const expiresAt = payload?.expiresAt || payload?.expires_at || payload?.data?.expiresAt || payload?.result?.expiresAt;
    const jwtExpiresAt = expirationFromValue(decodeJwtPayload(accessToken)?.exp);
    if (expiresAt) authStorage.setItem(EXPIRES_AT_KEY, String(expirationFromValue(expiresAt) || expiresAt));
    else if (expiresIn) authStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + Number(expiresIn) * 1000));
    else if (jwtExpiresAt) authStorage.setItem(EXPIRES_AT_KEY, String(jwtExpiresAt));
    else authStorage.removeItem(EXPIRES_AT_KEY);

    window.dispatchEvent(new CustomEvent('zentrid:auth', { detail: getSession() }));
    return getSession();
  }

  function responseMessage(body: unknown, response: Response): string {
    if (!isRecord(body)) return textValue(body) || response.statusText || 'Request failed';
    return textValue(body.message) || textValue(body.error) || textValue(body.title) || response.statusText || 'Request failed';
  }


  function clientMutationDebugEnabled(path: string, method: string): boolean {
    return (path.startsWith('/api/admin/clients') || path.startsWith('/api/admin/plants')) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  }

  function mutationDiagnosticEntity(path: string): 'Client' | 'Plant' {
    return path.startsWith('/api/admin/plants') ? 'Plant' : 'Client';
  }

  type ClientMutationDiagnosticContext = {
    requestId: string;
    url: string;
    path: string;
    method: string;
    startedAt: number;
    startedAtIso: string;
    payload: unknown;
    payloadJson: string | null;
  };

  let activeClientMutationDiagnostic: ClientMutationDiagnosticContext | null = null;

  function clientDebugPayload(body: BodyInit | null | undefined): unknown {
    if (typeof body !== 'string') return body || null;
    try { return JSON.parse(body); } catch (_error) { return body; }
  }

  function clientDiagnosticRequestId(path = ''): string {
    const prefix = mutationDiagnosticEntity(path).toLowerCase();
    try { return crypto.randomUUID(); }
    catch (_error) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  }

  function clientPayloadSummary(payload: unknown): ZentridUnknownRecord {
    if (!isRecord(payload)) return { payloadType: typeof payload };
    const tenantLink = isRecord(payload.tenantLink) ? payload.tenantLink : {};
    const identity = isRecord(payload.identity) ? payload.identity : {};
    const address = isRecord(payload.address) ? payload.address : {};
    const primaryContact = isRecord(payload.primaryContact) ? payload.primaryContact : {};
    const portalAccount = isRecord(payload.portalAccount) ? payload.portalAccount : {};
    return {
      topLevelKeys: Object.keys(payload),
      clientName: payload.clientName || null,
      managingTenantId: tenantLink.managingTenantId || null,
      clientType: tenantLink.clientType || null,
      status: tenantLink.status || null,
      identityKeys: Object.keys(identity),
      addressKeys: Object.keys(address),
      primaryContactKeys: Object.keys(primaryContact),
      portalAccountKeys: Object.keys(portalAccount),
      bankAccountCount: Array.isArray(payload.bankAccounts) ? payload.bankAccounts.length : null
    };
  }

  function beginClientMutationDiagnostic(url: string, path: string, method: string, body: BodyInit | null | undefined): ClientMutationDiagnosticContext | null {
    if (!clientMutationDebugEnabled(path, method)) return null;
    const payload = clientDebugPayload(body);
    const context: ClientMutationDiagnosticContext = {
      requestId: clientDiagnosticRequestId(path),
      url,
      path,
      method,
      startedAt: performance.now(),
      startedAtIso: new Date().toISOString(),
      payload,
      payloadJson: typeof body === 'string' ? body : null
    };
    activeClientMutationDiagnostic = context;
    const entity = mutationDiagnosticEntity(path);
    console.groupCollapsed(`[${entity} API Diagnostic] ${method} ${path} · ${context.requestId}`);
    console.log('Request ID:', context.requestId);
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Started at:', context.startedAtIso);
    console.log('Payload summary:', clientPayloadSummary(payload));
    if (entity === 'Plant' && isRecord(payload)) {
      console.log('Plant payload keys:', Object.keys(payload));
      console.log('Plant required-value candidates:', {
        plantName: payload.plantName ?? payload.name ?? null,
        plantCode: payload.plantCode ?? payload.code ?? null,
        clientId: payload.clientId ?? null,
        plantType: payload.plantType ?? null,
        countryRegion: payload.countryRegion ?? null,
        plantTimeZone: payload.plantTimeZone ?? null,
        sourceScheme: payload.sourceScheme ?? null
      });
      console.log('Plant canonical DTO sections:', {
        location: isRecord(payload.location) ? payload.location : null,
        technical: isRecord(payload.technical) ? payload.technical : null,
        commercial: isRecord(payload.commercial) ? payload.commercial : null,
        vendorPayloadKeys: isRecord(payload.vendorPayload) ? Object.keys(payload.vendorPayload) : []
      });
    }
    console.log('Request payload:', payload);
    console.log('Request payload JSON:', context.payloadJson || '(non-string body)');
    console.log('Browser:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
    console.groupEnd();
    return context;
  }

  function clientBackendReportHints(status: number, body: unknown, context: ClientMutationDiagnosticContext): string[] {
    const message = isRecord(body) ? textValue(body.message) || textValue(body.error) || textValue(body.title) : textValue(body);
    const hints: string[] = [];
    if (status === 400) {
      const entity = mutationDiagnosticEntity(context.path);
      hints.push(`Backend returned 400. Compare the request payload below with the ${entity} create/update DTO expected by Swagger/backend.`);
      if (message) hints.push(`Backend message: ${message}`);
    }
    if (status >= 500) hints.push('Backend returned a server error. Search backend logs using the request ID and timestamp below.');
    if (context.method === 'PUT') hints.push(`Route entity ID: ${context.path.split('/').pop() || '(missing)'}`);
    return hints;
  }

  function finishClientMutationDiagnostic(path: string, method: string, response: Response, body: unknown): void {
    if (!clientMutationDebugEnabled(path, method)) return;
    const context = activeClientMutationDiagnostic || {
      requestId: '(unavailable)', url: '', path, method, startedAt: performance.now(), startedAtIso: new Date().toISOString(), payload: null, payloadJson: null
    };
    const completedAtIso = new Date().toISOString();
    const durationMs = Math.max(0, Math.round(performance.now() - context.startedAt));
    const headers = Object.fromEntries(response.headers.entries());
    const diagnosticEntity = mutationDiagnosticEntity(path);
    const report = {
      title: `FleetOS ${diagnosticEntity} API Diagnostic Report`,
      requestId: context.requestId,
      request: {
        method: context.method,
        url: context.url,
        path: context.path,
        startedAt: context.startedAtIso,
        payloadSummary: clientPayloadSummary(context.payload),
        payload: context.payload
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        completedAt: completedAtIso,
        durationMs,
        headers,
        body
      },
      analysisHints: clientBackendReportHints(response.status, body, context)
    };
    if (diagnosticEntity === 'Plant') {
      (window as unknown as { __FLEETOS_LAST_PLANT_API_REPORT__?: unknown }).__FLEETOS_LAST_PLANT_API_REPORT__ = report;
      try { sessionStorage.setItem('__FLEETOS_LAST_PLANT_API_REPORT__', JSON.stringify(report)); } catch (_error) { /* diagnostic backup is best-effort */ }
    } else {
      (window as unknown as { __FLEETOS_LAST_CLIENT_API_REPORT__?: unknown }).__FLEETOS_LAST_CLIENT_API_REPORT__ = report;
      try { sessionStorage.setItem('__FLEETOS_LAST_CLIENT_API_REPORT__', JSON.stringify(report)); } catch (_error) { /* diagnostic backup is best-effort */ }
    }
    const logger = response.ok ? console.log : console.error;
    console.group(`[${diagnosticEntity} API FULL REPORT] ${method} ${path} → ${response.status} · ${context.requestId}`);
    logger('COPY THIS OBJECT FOR FRONTEND/BACKEND TEAM:', report);
    logger('COPYABLE JSON:', JSON.stringify(report, null, 2));
    logger('Request ID / correlation key:', context.requestId);
    logger('Duration:', `${durationMs} ms`);
    logger('Response body:', body);
    logger('Response headers:', headers);
    const hints = clientBackendReportHints(response.status, body, context);
    if (hints.length) console.warn('Diagnostic hints:', hints);
    console.info(`Retrieve this report later with: window.__FLEETOS_LAST_${diagnosticEntity.toUpperCase()}_API_REPORT__`);
    console.groupEnd();
    activeClientMutationDiagnostic = null;
  }

  async function parseResponse<T = unknown>(response: Response, path: string, method = 'GET'): Promise<T> {
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch (error) { body = text; }
    finishClientMutationDiagnostic(path, method, response, body);
    if (!response.ok) {
      throw new ZentridRequestError(`${responseMessage(body, response)} (${response.status})`, response.status, `HTTP_${response.status}`, path, body);
    }
    return body as T;
  }

  function dispatchRequestError(error: ZentridRequestError): void {
    window.dispatchEvent(new CustomEvent('zentrid:request-error', {
      detail: { message: error.message, status: error.status, code: error.code, path: error.path }
    }));
  }

  function expireSession(path: string): ZentridRequestError {
    clearSession();
    const error = new ZentridRequestError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED', path);
    window.dispatchEvent(new CustomEvent('zentrid:session-expired', { detail: { path } }));
    return error;
  }

  async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, path: string): Promise<Response> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ZentridRequestError('The browser is offline.', 0, 'OFFLINE', path);
    }
    const controller = new AbortController();
    const externalSignal = init.signal;
    let timedOut = false;

    const abortFromExternal = (): void => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, Math.max(1, timeoutMs));

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error: unknown) {
      if (timedOut) {
        throw new ZentridRequestError(`Request timed out after ${timeoutMs} ms.`, 0, 'TIMEOUT', path);
      }
      if (controller.signal.aborted) {
        throw new ZentridRequestError('Request was cancelled.', 0, 'ABORTED', path);
      }
      const message = error instanceof Error ? error.message : 'Network request failed.';
      throw new ZentridRequestError(message, 0, 'NETWORK_ERROR', path);
    } finally {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abortFromExternal);
    }
  }

  function delay(ms: number, signal: AbortSignal | null | undefined, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new ZentridRequestError('Request was cancelled.', 0, 'ABORTED', path));
        return;
      }
      const timer = window.setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, Math.max(0, ms));
      const abort = (): void => {
        window.clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(new ZentridRequestError('Request was cancelled.', 0, 'ABORTED', path));
      };
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  function retryAfterMs(response: Response, fallbackMs: number): number {
    const raw = response.headers.get('Retry-After');
    if (!raw) return fallbackMs;
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, seconds * 1000);
    const date = Date.parse(raw);
    if (!Number.isFinite(date)) return fallbackMs;
    return Math.min(30_000, Math.max(0, date - Date.now()));
  }

  function safeMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method);
  }

  function transientError(error: ZentridRequestError): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code);
  }

  function dispatchRequestRetry(path: string, attempt: number, maxAttempts: number, delayMs: number, reason: string): void {
    window.dispatchEvent(new CustomEvent('zentrid:request-retry', {
      detail: { path, attempt, maxAttempts, delayMs, reason }
    }));
  }

  function dispatchRequestSuccess(path: string, status: number, attempts: number): void {
    window.dispatchEvent(new CustomEvent('zentrid:request-success', {
      detail: { path, status, attempts }
    }));
  }

  type RefreshLock = { owner: string; expiresAt: number };

  function readRefreshLock(): RefreshLock | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(REFRESH_LOCK_KEY) || 'null') as Partial<RefreshLock> | null;
      if (!parsed || typeof parsed.owner !== 'string' || !Number.isFinite(parsed.expiresAt)) return null;
      if (Number(parsed.expiresAt) <= Date.now()) {
        localStorage.removeItem(REFRESH_LOCK_KEY);
        return null;
      }
      return { owner: parsed.owner, expiresAt: Number(parsed.expiresAt) };
    } catch (_error) {
      localStorage.removeItem(REFRESH_LOCK_KEY);
      return null;
    }
  }

  function acquireRefreshLock(): boolean {
    try {
      const existing = readRefreshLock();
      if (existing && existing.owner !== TAB_ID) return false;
      localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: TAB_ID, expiresAt: Date.now() + REFRESH_LOCK_TTL_MS }));
      return readRefreshLock()?.owner === TAB_ID;
    } catch (_error) {
      return true;
    }
  }

  function releaseRefreshLock(): void {
    try {
      if (readRefreshLock()?.owner === TAB_ID) localStorage.removeItem(REFRESH_LOCK_KEY);
    } catch (_error) {
      // Cross-tab coordination is best-effort.
    }
  }

  async function waitForPeerRefresh(previousToken: string, previousExpiry: string): Promise<ZentridSession | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < REFRESH_WAIT_MS) {
      await delay(120, null, '/api/Auth/refresh');
      const currentToken = getAccessToken();
      const currentExpiry = authStorage.getItem(EXPIRES_AT_KEY) || '';
      if (currentToken && !isTokenExpired(0) && (currentToken !== previousToken || currentExpiry !== previousExpiry)) return getSession();
      if (!readRefreshLock()) return null;
    }
    return null;
  }

  async function coordinatedRefresh(task: () => Promise<ZentridSession>): Promise<ZentridSession> {
    // Tab-scoped credentials cannot be refreshed by another tab without exposing token values.
    if (authStorage === sessionStorage) return task();
    const previousToken = getAccessToken();
    const previousExpiry = authStorage.getItem(EXPIRES_AT_KEY) || '';
    if (!acquireRefreshLock()) {
      const peerSession = await waitForPeerRefresh(previousToken, previousExpiry);
      if (peerSession) return peerSession;
      if (!acquireRefreshLock()) return task();
    }
    try { return await task(); }
    finally { releaseRefreshLock(); }
  }

  async function refreshSession(): Promise<ZentridSession> {
    if (!refreshPromise) {
      refreshPromise = coordinatedRefresh(async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new ZentridRequestError('Refresh token is not available.', 401, 'NO_REFRESH_TOKEN', '/api/Auth/refresh');
        const payload = await request<ZentridUnknownRecord>('/api/Auth/refresh', {
          method: 'POST',
          auth: false,
          retryAuth: false,
          retry: false,
          body: JSON.stringify({ refreshToken })
        });
        const session = storeSession(payload, getUser()?.username || 'globaladmin', true);
        window.dispatchEvent(new CustomEvent('zentrid:session-refreshed', { detail: session }));
        return session;
      }).finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  async function request<T = ZentridUnknownRecord | null | string>(path: string, options: ZentridRequestOptions = {}): Promise<T> {
    const {
      auth = true,
      baseUrl = ZentridConfig.authBaseUrl,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      retryAuth = true,
      retry = true,
      retryDelayMs = DEFAULT_RETRY_DELAY_MS,
      retryStatuses = DEFAULT_RETRY_STATUSES,
      ...fetchOptions
    } = options;

    const headers = new Headers(fetchOptions.headers || {});
    const multipartBody = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    if (!headers.has('Content-Type') && fetchOptions.body && !multipartBody) headers.set('Content-Type', 'application/json');
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    const token = getAccessToken();
    if (token && auth) headers.set('Authorization', `Bearer ${token}`);

    const method = String(fetchOptions.method || 'GET').toUpperCase();
    const retryCount = safeMethod(method) && !path.startsWith('/api/Auth/')
      ? (retry === false ? 0 : typeof retry === 'number' ? Math.max(0, Math.floor(retry)) : DEFAULT_SAFE_RETRIES)
      : 0;
    let attempt = 0;

    while (true) {
      try {
        const requestUrl = `${baseUrl}${path}`;
        const clientDiagnostic = beginClientMutationDiagnostic(requestUrl, path, method, fetchOptions.body);
        if (clientDiagnostic) headers.set('X-Client-Request-Id', clientDiagnostic.requestId);
        const response = await fetchWithTimeout(requestUrl, { ...fetchOptions, headers }, timeoutMs, path);
        if (response.status === 401 && auth) {
          if (retryAuth && getRefreshToken() && path !== '/api/Auth/refresh') {
            try {
              await refreshSession();
              return request<T>(path, { ...options, retryAuth: false });
            } catch (_refreshError) {
              throw expireSession(path);
            }
          }
          throw expireSession(path);
        }
        if (!response.ok && retryStatuses.includes(response.status) && attempt < retryCount) {
          attempt += 1;
          const retryDelay = retryAfterMs(response, Math.min(4_000, retryDelayMs * (2 ** (attempt - 1))));
          dispatchRequestRetry(path, attempt, retryCount + 1, retryDelay, `HTTP_${response.status}`);
          await delay(retryDelay, fetchOptions.signal, path);
          continue;
        }
        const result = await parseResponse<T>(response, path, method);
        dispatchRequestSuccess(path, response.status, attempt + 1);
        return result;
      } catch (error: unknown) {
        const normalized = error instanceof ZentridRequestError
          ? error
          : new ZentridRequestError(error instanceof Error ? error.message : 'Request failed.', 0, 'UNKNOWN_ERROR', path);
        if (transientError(normalized) && attempt < retryCount && !fetchOptions.signal?.aborted) {
          attempt += 1;
          const retryDelay = Math.min(4_000, retryDelayMs * (2 ** (attempt - 1)));
          dispatchRequestRetry(path, attempt, retryCount + 1, retryDelay, normalized.code);
          await delay(retryDelay, fetchOptions.signal, path);
          continue;
        }
        dispatchRequestError(normalized);
        throw normalized;
      }
    }
  }

  async function login(username: string, password: string): Promise<ZentridSession> {
    const payload = await request<ZentridUnknownRecord>('/api/Auth/login', {
      method: 'POST',
      auth: false,
      retryAuth: false,
      body: JSON.stringify({ username, password })
    });
    return storeSession(payload, username, false);
  }

  async function register(data: ZentridUnknownRecord = {}): Promise<unknown> {
    return request<unknown>('/api/Auth/register', { method: 'POST', auth: false, retryAuth: false, body: JSON.stringify(data || {}) });
  }

  async function refresh(): Promise<ZentridSession> {
    return refreshSession();
  }

  async function me(): Promise<unknown> {
    const payload = await request<ZentridUnknownRecord>('/api/Auth/me', { method: 'GET' });
    const user = payload?.user || payload?.data || payload?.result || payload;
    if (user) {
      authStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('zentrid:auth', { detail: getSession() }));
    }
    return user;
  }

  async function validate(): Promise<unknown> {
    return request<unknown>('/api/Auth/validate', { method: 'POST' });
  }

  function getJwtClaims(): ZentridJwtClaims { return decodeJwtPayload(getAccessToken()) || {}; }

  function readRoleFromClaims(claims = getJwtClaims()): string | string[] {
    const roleValue = claims.role
      || claims.roles
      || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role']
      || '';
    if (Array.isArray(roleValue)) return roleValue.map(item => String(item));
    return String(roleValue || '');
  }

  function roleList(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(item => roleList(item));
    if (typeof value !== 'string') return [];
    return value.split(/[;,]/).map(item => item.trim()).filter(Boolean);
  }

  function getRoles(): string[] {
    const claimsRoles = roleList(readRoleFromClaims());
    const user = getUser();
    const userRoles = roleList(user?.role || user?.roles);
    return [...new Set([...claimsRoles, ...userRoles])];
  }

  function hasRole(role: string): boolean {
    const expected = role.trim().toLowerCase();
    return getRoles().some(item => item.toLowerCase() === expected);
  }

  function getAccessToken(): string { return authStorage.getItem(ACCESS_TOKEN_KEY) || ''; }
  function getRefreshToken(): string { return authStorage.getItem(REFRESH_TOKEN_KEY) || ''; }
  function getUser(): ZentridUser {
    try { return JSON.parse(authStorage.getItem(USER_KEY) || 'null') as ZentridUser; }
    catch (_error) {
      authStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent('zentrid:storage-recovered', { detail: { key: USER_KEY, reason: 'invalid-json' } }));
      return null;
    }
  }

  function isTokenExpired(skewSeconds = TOKEN_EXPIRY_SKEW_SECONDS): boolean {
    if (!getAccessToken()) return true;
    const expiresAt = tokenExpirationMs();
    if (!expiresAt) return false;
    return Date.now() + Math.max(0, skewSeconds) * 1000 >= expiresAt;
  }

  function getSession(): ZentridSession {
    return {
      accessToken: getAccessToken(),
      refreshToken: getRefreshToken(),
      user: getUser(),
      claims: getJwtClaims(),
      role: readRoleFromClaims(),
      roles: getRoles(),
      expiresAt: authStorage.getItem(EXPIRES_AT_KEY) || '',
      expired: isTokenExpired(0)
    };
  }

  function isAuthenticated(): boolean {
    return Boolean(getAccessToken()) && !isTokenExpired();
  }

  async function ensureSession(requiredRole = ''): Promise<boolean> {
    if (!getAccessToken()) return false;
    if (isTokenExpired()) {
      if (!getRefreshToken()) {
        clearSession();
        return false;
      }
      try { await refreshSession(); } catch (error) {
        clearSession();
        return false;
      }
    }

    if (!requiredRole) return true;
    if (hasRole(requiredRole)) return true;

    try { await me(); } catch (error) { return false; }
    return hasRole(requiredRole);
  }

  async function logout(redirect = true): Promise<void> {
    const accessToken = getAccessToken();
    clearSession();

    let backendLogout: Promise<void> = Promise.resolve();
    if (accessToken) {
      const headers = new Headers({
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      });
      backendLogout = fetch(`${ZentridConfig.authBaseUrl}/api/Auth/logout`, {
        method: 'POST',
        headers,
        cache: 'no-store',
        keepalive: true
      }).then(response => {
        window.dispatchEvent(new CustomEvent('zentrid:backend-logout', {
          detail: { ok: response.ok, status: response.status }
        }));
      }).catch((error: unknown) => {
        window.dispatchEvent(new CustomEvent('zentrid:backend-logout', {
          detail: {
            ok: false,
            status: 0,
            message: error instanceof Error ? error.message : 'Backend logout request failed.'
          }
        }));
      });
    }

    if (redirect) {
      const prefix = window.location.pathname.includes('/pages/') ? '../' : '';
      window.location.href = `${prefix}login.html`;
    }

    await backendLogout;
  }

  return {
    login,
    register,
    refresh,
    me,
    validate,
    ensureSession,
    logout,
    request,
    getAccessToken,
    getRefreshToken,
    getUser,
    getSession,
    getJwtClaims,
    getRoles,
    hasRole,
    readRoleFromClaims,
    decodeJwtPayload,
    isTokenExpired,
    isAuthenticated
  };
})();

const ZentridAPI: ZentridAPIClient = (() => {
  async function request<T = unknown>(path: string, options: ZentridRequestOptions = {}): Promise<T> {
    return ZentridAuth.request<T>(path, { ...options, baseUrl: options.baseUrl || ZentridConfig.apiBaseUrl });
  }

  return {
    request,
    auth: ZentridAuth,
    config: ZentridConfig
  };
})();

window.ZentridRequestError = ZentridRequestError;
window.ZentridConfig = ZentridConfig;
window.ZentridAuth = ZentridAuth;
window.ZentridAPI = ZentridAPI;
const FleetAPI = ZentridAPI;
window.FleetAPI = FleetAPI;
