interface FleetExpressApp {
  use(...args: unknown[]): void;
  get(...args: unknown[]): void;
  listen(port: string | number, callback?: () => void): void;
}
interface FleetExpressFactory {
  (): FleetExpressApp;
  json(options?: { limit?: string }): unknown;
  static(root: string): unknown;
}
interface FleetCorsFactory {
  (...args: unknown[]): unknown;
}
declare function require(id: 'express'): FleetExpressFactory;
declare function require(id: 'cors'): FleetCorsFactory;
declare function require(id: string): unknown;
declare const process: { env: Record<string, string | undefined> };
declare const __dirname: string;

type FleetLegacyCompat = any;

declare interface Window {
  __zentridDisableLiveDetailCore?: boolean;
  [key: string]: FleetLegacyCompat;
}

declare interface Element {
  onclick: ((event: Event) => void) | null;
}

declare interface EventTarget {
  closest?: FleetLegacyCompat;
  dataset?: FleetLegacyCompat;
}

declare interface Event {
  detail?: FleetLegacyCompat;
}

// Legacy DOM conveniences used by the non-module prototype scripts.
declare interface Element {
  hidden: boolean;
  disabled?: boolean;
  blur?: () => void;
  innerText?: string;
}

declare interface HTMLElement {
  value?: string;
  checked?: boolean;
  disabled: boolean;
  readOnly?: boolean;
  placeholder?: string;
  files?: FileList | null;
  options?: HTMLOptionsCollection;
  innerText?: string;
}

declare interface EventTarget {
  id?: string;
  value?: string;
  checked?: boolean;
}

// Additional legacy DOM conveniences for integration prototype scripts.
declare interface Element {
  matches?: FleetLegacyCompat;
}

declare interface HTMLElement {
  selectedIndex?: number;
}

declare interface EventTarget {
  matches?: FleetLegacyCompat;
}


interface FleetDeviceCatalogLegacyApi {
  catalog: Array<{ kind: string; vendor: string; model: string; rating: string; protocol: string; shared: string; individual: string }>;
  compatibility: Array<{ from: string; to: string; type: string; status: string; rule: string }>;
}

interface SettlementCenterLegacyApi {
  createRun(): void;
  saveRun(): void;
  openDetail(id: string): void;
  createAgreement(): void;
  saveAgreement(): void;
  closeModal(): void;
  closeDrawer(): void;
}

interface FleetCommercialAgreementsLegacyApi {
  toast(message: string): void;
  open(type: string, title: string, meta: string): void;
}

// Runtime globals produced by legacy non-module browser scripts.
declare const FleetClientModel: FleetClientModelLegacyApi;
declare const FleetDeviceCatalog: FleetDeviceCatalogLegacyApi;
declare function renderClientsPage(): void;
declare function renderClientDetailPage(): void;
declare function renderClientPlantAssignmentPage(): void;
declare function renderClientOnboardingPage(): void;

// Commercial / settlement prototype globals exposed by non-module scripts.
declare const SettlementCenter: SettlementCenterLegacyApi;
declare const FleetCommercialAgreementsV125: FleetCommercialAgreementsLegacyApi;

// Detail and registry renderers exposed by legacy page scripts.
declare function renderPlantDetailPage(): void;
declare function renderDeviceDetail(): string;
declare function wireDeviceDetail(): void;
declare function renderPlants(): string;
declare function wirePlants(): void;
declare function renderTenantDetail(): string;
declare function wireTenantDetail(): void;

interface EnergyAccountingApi {
  openCorrection(): void;
  saveCorrection(): void;
  runAccounting(): void;
  startRun(): void;
  closeModal(): void;
  closeDrawer(): void;
}

interface Window {
  EnergyAccounting: EnergyAccountingApi;
}


// Narrow legacy API contracts used while the browser prototype is still non-module based.
interface FleetLayoutDrawerApi {
  (title: string, details?: Record<string, unknown>, bodyHtml?: string): void;
}

interface FleetLayoutLegacyApi {
  mount(html: string): void;
  toast(message: string): void;
  pathFor(route: string): string;
  state: { tenant: string; time: string; region: string };
  enhanceActionMenus?(root?: Document | Element | null): void;
  drawer?: FleetLayoutDrawerApi;
}


interface FleetClientLegacyClient {
  id: string;
  name: string;
  code?: unknown;
  tenant?: unknown;
  type?: unknown;
  legalForm?: unknown;
  verification?: unknown;
  country?: unknown;
  city?: unknown;
  assignmentRole?: unknown;
  status?: unknown;
  users?: unknown;
  billing?: unknown;
  registrationNo?: unknown;
  taxId?: unknown;
  address?: unknown;
  account?: unknown;
  supportTier?: unknown;
  accessScope?: unknown;
  exportPolicy?: unknown;
  onboarding?: unknown;
  primaryContact?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  plants?: unknown[];
  documents?: unknown;
}

interface FleetClientLegacyPlant {
  id: string;
  clientId: string;
  name: string;
  code?: unknown;
  owner?: unknown;
  tenant?: unknown;
  country?: unknown;
  city?: unknown;
  health?: unknown;
  capacityDc?: unknown;
  capacityAc?: unknown;
  alerts?: unknown;
  energyToday?: unknown;
  portfolio?: unknown;
  operator?: unknown;
}

interface FleetClientLegacyDevice {
  id: string;
  plantId: string;
  name: string;
  type?: unknown;
  vendor?: unknown;
  status?: unknown;
  serial?: unknown;
  model?: unknown;
  capacity?: unknown;
  location?: unknown;
  lastSeen?: unknown;
  children?: unknown;
}

interface FleetClientModelLegacyApi {
  clients: FleetClientLegacyClient[];
  plants: FleetClientLegacyPlant[];
  devices: FleetClientLegacyDevice[];
  badge(value: unknown): string;
  getClient(id?: string | null): FleetClientLegacyClient | undefined;
  getPlant(id?: string | null): FleetClientLegacyPlant | undefined;
  plantsForClient(clientId: string): FleetClientLegacyPlant[];
  devicesForPlant(plantId: string): FleetClientLegacyDevice[];
  countsForClient(clientId: string): { plants: number; devices: number; capacity: string; alerts: number };
  selectClient(id: string): void;
  selectPlant(id: string): void;
  selectedClient(): FleetClientLegacyClient;
  selectedPlant(): FleetClientLegacyPlant;
}

interface Window {
  FleetLayout: FleetLayoutLegacyApi;
  FleetClientModel: FleetClientModelLegacyApi;
}

// Additional page shell renderers used by strict page-script checks.
declare function renderArchivedIntegrations(): string;
declare function wireArchivedIntegrations(): void;
declare function renderIntegrationArchive(): string;
declare function wireIntegrationArchive(): void;
declare function renderProduction(): string;
declare function wireProduction(): void;

interface Window {
  FleetDataSource: FleetDataSourceApi;
  ZentridLiveTenants?: Array<Record<string, unknown>>;
  ZentridLiveIntegrations?: Array<Record<string, unknown>>;
}

declare const FleetDataSource: FleetDataSourceApi;

type FleetContractRecord = Record<string, FleetLegacyCompat>;
interface FleetContractMapperContext {
  safeText(value: unknown, fallback?: unknown): string;
  firstOf(row: FleetContractRecord, keys: string[], fallback?: unknown): unknown;
  displayName(row: FleetContractRecord, keys: string[], entityLabel: string, index: number, typeHint?: unknown): string;
  formatDate(value: unknown, fallback?: string): string;
  integrationVendor(value: unknown): string;
  integrationSoftware(value: unknown): string;
}
type FleetContractEntity = 'clients' | 'plants' | 'devices' | 'alerts' | 'integrations';
type FleetContractSeverity = 'error' | 'warning';
interface FleetContractIssue {
  entity: FleetContractEntity;
  entityLabel: string;
  index: number;
  severity: FleetContractSeverity;
  code: 'INVALID_RECORD' | 'MISSING_REQUIRED_FIELD' | 'INVALID_FIELD_TYPE';
  field: string;
  aliases: string[];
  message: string;
}
interface FleetContractValidation {
  entity: FleetContractEntity;
  valid: boolean;
  issues: FleetContractIssue[];
}
interface FleetContractDiagnosticSummary {
  total: number;
  errors: number;
  warnings: number;
  affectedEntities: FleetContractEntity[];
}

type FleetFieldFormat = 'identifier' | 'text' | 'status' | 'date' | 'count' | 'email' | 'phone' | 'relation' | 'power' | 'energy' | 'boolean' | 'raw';
interface FleetFieldMappingDefinition {
  canonicalField: string;
  aliases: string[];
  uiTargets: string[];
  format: FleetFieldFormat;
  fallback: string;
  required?: FleetContractSeverity;
}
interface FleetFieldAuditRecord {
  entity: FleetContractEntity;
  index: number;
  mappedFields: string[];
  fallbackFields: string[];
  missingExpectedFields: string[];
  unmappedFields: string[];
  sourceByCanonical: Record<string, string>;
  rawFieldCount: number;
}
interface FleetFieldAuditEntitySummary {
  entity: FleetContractEntity;
  records: number;
  rawFields: number;
  mappedFields: number;
  fallbackFields: number;
  missingExpectedFields: number;
  unmappedFields: number;
}
interface FleetFieldAuditSummary {
  records: number;
  rawFields: number;
  mappedFields: number;
  fallbackFields: number;
  missingExpectedFields: number;
  unmappedFields: number;
  affectedEntities: FleetContractEntity[];
  byEntity: FleetFieldAuditEntitySummary[];
}
interface FleetFieldAuditApi {
  clear(entity?: FleetContractEntity): void;
  manifest(entity?: FleetContractEntity): FleetFieldMappingDefinition[] | Record<FleetContractEntity, FleetFieldMappingDefinition[]>;
  list(entity?: FleetContractEntity): FleetFieldAuditRecord[];
  summary(entity?: FleetContractEntity): FleetFieldAuditSummary;
}
interface FleetContractDiagnosticsApi {
  clear(entity?: FleetContractEntity): void;
  report(issues: FleetContractIssue[]): void;
  list(entity?: FleetContractEntity): FleetContractIssue[];
  summary(entity?: FleetContractEntity): FleetContractDiagnosticSummary;
}
interface FleetEntityContractApi {
  parse(value: unknown): FleetContractRecord | null;
  validate(value: unknown, index?: number): FleetContractValidation;
  map(value: unknown, index: number, context: FleetContractMapperContext): FleetContractRecord;
  mapList(values: unknown[], context: FleetContractMapperContext): FleetContractRecord[];
}
interface FleetAPIContractsApi {
  clients: FleetEntityContractApi;
  plants: FleetEntityContractApi;
  devices: FleetEntityContractApi;
  alerts: FleetEntityContractApi;
  integrations: FleetEntityContractApi;
  diagnostics: FleetContractDiagnosticsApi;
  fieldAudit: FleetFieldAuditApi;
}
declare const FleetAPIContracts: FleetAPIContractsApi;
interface Window { FleetAPIContracts: FleetAPIContractsApi; }



interface FleetDetailLazySnapshot {
  page: string;
  resource: string;
  label: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  errorMessage: string;
}
interface FleetDetailLazyResourceDefinition {
  key: string;
  tabs: string[];
  label: string;
  description?: string;
  loader: () => Promise<void> | void;
}
interface FleetDetailLazyTabsApi {
  register(page: string, definitions: FleetDetailLazyResourceDefinition[]): void;
  activate(page: string, tab: string): void;
  load(page: string, tabOrResource: string, force?: boolean): Promise<void>;
  snapshot(page: string, tabOrResource: string): FleetDetailLazySnapshot | null;
  panel(page: string, tab: string, content: string): string;
  observe(page: string, key: string, callback: () => void): void;
  unobserve(page: string, key: string): void;
  reset(page: string, resourceKey?: string): void;
  dispose(page?: string): void;
}
declare const FleetDetailLazyTabs: FleetDetailLazyTabsApi;
interface Window { FleetDetailLazyTabs: FleetDetailLazyTabsApi; }

interface FleetRegistryQueryState {
  entity: 'clients' | 'plants' | 'devices' | 'alerts';
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
interface FleetRegistryQueryApi {
  read(entity: 'clients' | 'plants' | 'devices' | 'alerts'): FleetRegistryQueryState;
  update(entity: 'clients' | 'plants' | 'devices' | 'alerts', patch: Record<string, string | number | boolean | null | undefined>, options?: { replace?: boolean; emit?: boolean }): FleetRegistryQueryState;
  setPagination(entity: 'clients' | 'plants' | 'devices' | 'alerts', pagination: Partial<FleetRegistryPaginationState>): FleetRegistryPaginationState;
  pagination(entity: 'clients' | 'plants' | 'devices' | 'alerts'): FleetRegistryPaginationState | null;
  pagerHtml(entity: 'clients' | 'plants' | 'devices' | 'alerts', fallbackTotal?: number): string;
  filterScopeHtml(entity: 'clients' | 'plants' | 'devices' | 'alerts'): string;
  activeCurrentPageFilters(entity: 'clients' | 'plants' | 'devices' | 'alerts'): string[];
  supportedPageSizes: number[];
}
declare const FleetRegistryQuery: FleetRegistryQueryApi;
interface Window { FleetRegistryQuery: FleetRegistryQueryApi; }

interface FleetRepositoryMapperContext extends FleetContractMapperContext {
  realDisplayName?(row: FleetContractRecord, entityLabel: string, typeHint?: unknown): string;
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
  entity: FleetContractEntity;
  items: FleetContractRecord[];
  rawItems: FleetContractRecord[];
  source: string;
  errors: unknown[];
  pagination: FleetRepositoryPagination;
  cache?: FleetRepositoryCacheMeta;
}
interface FleetRepositoryItemResult extends FleetRepositoryListResult {
  item: FleetContractRecord | null;
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
interface FleetRepositoryCacheSnapshotEntry {
  entity: FleetContractEntity;
  cached: boolean;
  persistent: boolean;
  inFlight: boolean;
  activeRequests: number;
  ageMs: number | null;
  ttlMs: number;
  staleMaxAgeMs: number;
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
interface FleetRepositoryCacheApi {
  invalidate(entity?: FleetContractEntity): void;
  invalidateMany(entities: FleetContractEntity[]): void;
  snapshot(entity?: FleetContractEntity): FleetRepositoryCacheSnapshotEntry[];
  clearPersistent(entity?: FleetContractEntity): void;
}
interface FleetRepositoryCoordinatorApi {
  cancel(group: string): void;
  cancelAll(): void;
  snapshot(): Array<{ group: string; entity: FleetContractEntity; key: string; aborted: boolean }>;
}

interface ZentridDataMutationDetail {
  action: string;
  path: string;
  method: string;
  entities: FleetContractEntity[];
  completedAt: string;
}
interface FleetEntityReadRepositoryApi {
  list(options?: FleetRepositoryReadOptions): Promise<FleetRepositoryListResult>;
  get(id: string, options?: FleetRepositoryReadOptions): Promise<FleetRepositoryItemResult>;
}
interface FleetIntegrationReadRepositoryApi extends FleetEntityReadRepositoryApi {
  summary(options?: FleetRepositoryReadOptions): Promise<FleetRepositoryListResult>;
}
interface FleetAPIRepositoriesApi {
  configure(context: FleetRepositoryMapperContext): void;
  isConfigured(): boolean;
  cache: FleetRepositoryCacheApi;
  coordinator: FleetRepositoryCoordinatorApi;
  clients: FleetEntityReadRepositoryApi;
  plants: FleetEntityReadRepositoryApi;
  devices: FleetEntityReadRepositoryApi;
  alerts: FleetEntityReadRepositoryApi;
  integrations: FleetIntegrationReadRepositoryApi;
}
declare const FleetAPIRepositories: FleetAPIRepositoriesApi;
interface Window { FleetAPIRepositories: FleetAPIRepositoriesApi; }

interface FleetMutationMeta {
  operationId: string;
  action: string;
  path: string;
  method: string;
  entities: FleetContractEntity[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}
type FleetMutationErrorKind = 'timeout' | 'cancelled' | 'unauthorized' | 'forbidden' | 'validation' | 'conflict' | 'rate-limit' | 'server' | 'network' | 'unknown';
interface FleetMutationNormalizedError {
  kind: FleetMutationErrorKind;
  message: string;
  status: number;
  code: string;
  path: string;
  retriable: boolean;
}
interface FleetMutationSuccess<T = unknown> {
  ok: true;
  data: T;
  message: string;
  meta: FleetMutationMeta;
}
interface FleetMutationFailure {
  ok: false;
  data: null;
  message: string;
  error: FleetMutationNormalizedError;
  meta: FleetMutationMeta;
}
type FleetMutationResult<T = unknown> = FleetMutationSuccess<T> | FleetMutationFailure;
interface FleetMutationCreateApi {
  create(payload: unknown): Promise<FleetMutationResult>;
}
interface FleetAPIMutationsApi {
  run<T>(descriptor: { action: string; path: string; method: string; entities: FleetContractEntity[]; successMessage: string }, operation: () => Promise<T>): Promise<FleetMutationResult<T>>;
  isSuccess<T>(result: FleetMutationResult<T>): result is FleetMutationSuccess<T>;
  isFailure<T>(result: FleetMutationResult<T>): result is FleetMutationFailure;
  unwrap<T>(result: FleetMutationResult<T>): T;
  clients: FleetMutationCreateApi;
  plants: FleetMutationCreateApi;
}
declare const FleetAPIMutations: FleetAPIMutationsApi;
interface Window { FleetAPIMutations: FleetAPIMutationsApi; }


interface FleetTenantLifecycleApi {
  render(record: Record<string, unknown>): string;
  wire(record: Record<string, unknown>): void;
  isBackendManaged(record: Record<string, unknown>): boolean;
}

declare const FleetTenantLifecycle: FleetTenantLifecycleApi;
interface Window { FleetTenantLifecycle: FleetTenantLifecycleApi; }


interface FleetApiDiagnosticPagination {
  page: number | null;
  pageSize: number | null;
  totalCount: number | null;
  totalPages: number | null;
}
interface FleetApiDiagnosticEndpoint {
  key: string;
  path: string;
  method: string;
  capturedAt: string;
  ok: boolean;
  status: number | string;
  durationMs: number;
  responseBytes: number;
  rows: number | null;
  pagination: FleetApiDiagnosticPagination;
  contentType: string;
  requestId: string;
  shapeHash: string;
  shape: string[];
}
interface FleetApiDiagnosticDelta {
  available: boolean;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  durationDeltaMs: number;
  responseBytesDelta: number;
  rowsDelta: number | null;
  statusChanged: boolean;
  shapeChanged: boolean;
  summary: string;
}
interface FleetApiDiagnosticsApi {
  endpointKey(result: Pick<ZentridRawRequestResult, 'method' | 'path'>): string;
  pagination(value: unknown): FleetApiDiagnosticPagination;
  redact(value: unknown): unknown;
  shape(value: unknown): string[];
  hash(input: string): string;
  endpoint(result: ZentridRawRequestResult): FleetApiDiagnosticEndpoint;
  compare(current: FleetApiDiagnosticEndpoint, previous?: FleetApiDiagnosticEndpoint): FleetApiDiagnosticDelta;
  captureRun(results: ZentridRawRequestResult[]): Record<string, FleetApiDiagnosticDelta>;
  safeSnapshot(result: ZentridRawRequestResult): Record<string, unknown>;
  diagnosticsText(result: ZentridRawRequestResult, delta?: FleetApiDiagnosticDelta): string;
  clear(): void;
  contractCatalog: Array<{ entity: string; fixture: string; endpoint: string }>;
}
declare const FleetAPIDiagnostics: FleetApiDiagnosticsApi;
interface Window { FleetAPIDiagnostics: FleetApiDiagnosticsApi; }

interface FleetRuntimeStabilitySnapshot {
  timers: number;
  frames: number;
  idles: number;
  cleanups: number;
  longTasks: number;
  longTaskDurationMs: number;
}
interface FleetRuntimeStabilityApi {
  debounce(key: string, callback: () => void, delayMs?: number): void;
  frame(key: string, callback: () => void): void;
  idle(key: string, callback: () => void, timeout?: number): void;
  replaceHtml(container: HTMLElement, html: string): void;
  registerCleanup(key: string, cleanup: () => void): void;
  unregisterCleanup(key: string): void;
  dispose(): void;
  snapshot(): FleetRuntimeStabilitySnapshot;
}
declare const FleetRuntimeStability: FleetRuntimeStabilityApi;
interface Window { FleetRuntimeStability: FleetRuntimeStabilityApi; }

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
interface FleetDataFreshnessApi {
  sync(input: FleetFreshnessSyncInput): FleetFreshnessSnapshot;
  markRefreshComplete(success?: boolean): void;
  requestRefresh(reason: 'manual' | 'retry' | 'auto'): void;
  setAutoRefresh(intervalMs: number): void;
  snapshot(resource?: FleetFreshnessResource): FleetFreshnessSnapshot;
  inferResource(): FleetFreshnessResource;
  intervals: number[];
}
declare const FleetDataFreshness: FleetDataFreshnessApi;
interface Window { FleetDataFreshness: FleetDataFreshnessApi; }


type FleetFormReadinessMode = 'api' | 'local' | 'unavailable' | 'readonly';
interface FleetFormReadinessIssue { field: string; message: string; code: string; }
interface FleetFormFileDescriptor { field: string; name: string; type: string; size: number; lastModified: number; }
interface FleetFormSerialization {
  payload: Record<string, unknown>;
  files: FleetFormFileDescriptor[];
  issues: FleetFormReadinessIssue[];
  meta: { formId: string; contract: string; mode: FleetFormReadinessMode; endpoint: string; method: string; serializedAt: string; fieldCount: number; };
}
interface FleetFormReadinessSnapshot { formId: string; contract: string; mode: FleetFormReadinessMode; endpoint: string; method: string; dirty: boolean; issueCount: number; fileCount: number; }
interface FleetFormReadinessApi {
  enhance(form: HTMLFormElement): void;
  enhanceAll(root?: ParentNode): void;
  isDirty(form: HTMLFormElement): boolean;
  markCommitted(form: HTMLFormElement): void;
  serialize(form: HTMLFormElement): FleetFormSerialization;
  setMode(form: HTMLFormElement, mode: FleetFormReadinessMode, note?: string): void;
  snapshot(): FleetFormReadinessSnapshot[];
  updatePreview(form: HTMLFormElement): FleetFormSerialization;
  validate(form: HTMLFormElement): FleetFormSerialization;
}
interface Window { FleetFormReadiness: FleetFormReadinessApi; }

interface FleetSessionResilienceSnapshot {
  tabId: string;
  online: boolean;
  channel: 'broadcast-channel' | 'storage-fallback';
  retriesObserved: number;
  lastEvent: string;
  lastEventAt: string | null;
}
interface FleetSessionResilienceApi {
  snapshot(): FleetSessionResilienceSnapshot;
  broadcastInvalidation(entities: FleetContractEntity[]): void;
  dispose(): void;
}
declare const FleetSessionResilience: FleetSessionResilienceApi;
interface Window { FleetSessionResilience: FleetSessionResilienceApi; }


interface FleetReleaseManifest {
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
}
interface FleetReleaseSnapshot {
  release: FleetReleaseManifest;
  collectedAt: string;
  health: 'healthy' | 'attention' | 'offline';
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
  recentIssues: Array<Record<string, unknown>>;
  recentEvents: Array<Record<string, unknown>>;
}
interface FleetReleaseObservabilityApi {
  snapshot(): FleetReleaseSnapshot;
  copySafeReport(): Promise<boolean>;
  downloadReport(): void;
  openPanel(): void;
  closePanel(): void;
  checkForUpdate(manual?: boolean): Promise<boolean>;
  clearIssues(): void;
  manifest(): FleetReleaseManifest;
}
declare const FleetReleaseObservability: FleetReleaseObservabilityApi;
interface Window { FleetReleaseObservability: FleetReleaseObservabilityApi; }


interface FleetBrowserSecurityFinding {
  area: 'localStorage' | 'sessionStorage';
  key: string;
  classification: 'persistent-secret' | 'session-secret';
}
interface FleetBrowserSecuritySnapshot {
  policy: 'enforced-compatible';
  anchorsAudited: number;
  anchorsHardened: number;
  unsafeUrlsBlocked: number;
  formsAudited: number;
  unsafeFormActionsBlocked: number;
  inlineHandlers: number;
  inlineStyles: number;
  cspViolations: number;
  storageFindings: FleetBrowserSecurityFinding[];
  authStorage: 'sessionStorage' | 'fallback';
  referrerPolicy: string;
}
interface FleetBrowserSecurityApi {
  audit(root?: ParentNode): void;
  snapshot(): FleetBrowserSecuritySnapshot;
  openExternal(url: string): WindowProxy | null;
  isUnsafeUrl(url: string): boolean;
}
declare const FleetBrowserSecurity: FleetBrowserSecurityApi;
interface Window { FleetBrowserSecurity: FleetBrowserSecurityApi; }
