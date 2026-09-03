(function () {
type ZentridMutationErrorKind =
  | 'timeout'
  | 'cancelled'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'rate-limit'
  | 'server'
  | 'network'
  | 'unknown';

type ZentridMutationDescriptor = {
  action: string;
  path: string;
  method: string;
  entities: ZentridMutationEntity[];
  successMessage: string;
};

type ZentridMutationMeta = {
  operationId: string;
  action: string;
  path: string;
  method: string;
  entities: ZentridMutationEntity[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

type ZentridMutationNormalizedError = {
  kind: ZentridMutationErrorKind;
  message: string;
  status: number;
  code: string;
  path: string;
  retriable: boolean;
};

type ZentridMutationSuccess<T> = {
  ok: true;
  data: T;
  message: string;
  meta: ZentridMutationMeta;
};

type ZentridMutationFailure = {
  ok: false;
  data: null;
  message: string;
  error: ZentridMutationNormalizedError;
  meta: ZentridMutationMeta;
};

type ZentridMutationResult<T = unknown> = ZentridMutationSuccess<T> | ZentridMutationFailure;

type ZentridMutationRunner = <T>(
  descriptor: ZentridMutationDescriptor,
  operation: () => Promise<T>
) => Promise<ZentridMutationResult<T>>;

type ZentridMutationCreateModule = {
  create(payload: unknown): Promise<ZentridMutationResult>;
};

type ZentridMutationPlantModule = ZentridMutationCreateModule & {
  update(id: string, payload: unknown): Promise<ZentridMutationResult>;
  activate(id: string): Promise<ZentridMutationResult>;
  deactivate(id: string): Promise<ZentridMutationResult>;
  archive(id: string): Promise<ZentridMutationResult>;
  uploadDocument(id: string, payload: FormData): Promise<ZentridMutationResult>;
  deleteDocument(id: string, documentId: string): Promise<ZentridMutationResult>;
};

type ZentridMutationTenantModule = ZentridMutationCreateModule & {
  update(id: string, payload: unknown): Promise<ZentridMutationResult>;
  activate(id: string): Promise<ZentridMutationResult>;
  deactivate(id: string): Promise<ZentridMutationResult>;
  archive(id: string): Promise<ZentridMutationResult>;
  uploadDocument(id: string, payload: FormData): Promise<ZentridMutationResult>;
  deleteDocument(id: string, documentId: string): Promise<ZentridMutationResult>;
};

type ZentridMutationIntegrationModule = ZentridMutationCreateModule & {
  validate(id: string): Promise<ZentridMutationResult>;
  testConnection(id: string): Promise<ZentridMutationResult>;
  testSampleData(id: string): Promise<ZentridMutationResult>;
  activate(id: string): Promise<ZentridMutationResult>;
  suspend(id: string): Promise<ZentridMutationResult>;
  archive(id: string): Promise<ZentridMutationResult>;
  failed(id: string): Promise<ZentridMutationResult>;
};

type ZentridMutationClientModule = ZentridMutationCreateModule & {
  update(id: string, payload: unknown): Promise<ZentridMutationResult>;
  activate(id: string): Promise<ZentridMutationResult>;
  deactivate(id: string): Promise<ZentridMutationResult>;
  suspend(id: string): Promise<ZentridMutationResult>;
  archive(id: string): Promise<ZentridMutationResult>;
  uploadDocument(id: string, payload: FormData): Promise<ZentridMutationResult>;
  deleteDocument(id: string, documentId: string): Promise<ZentridMutationResult>;
};

type ZentridMutationDeviceModule = {
  activate(id: string): Promise<ZentridMutationResult>;
  deactivate(id: string): Promise<ZentridMutationResult>;
  archive(id: string): Promise<ZentridMutationResult>;
  uploadDocument(id: string, payload: FormData): Promise<ZentridMutationResult>;
  deleteDocument(id: string, documentId: string): Promise<ZentridMutationResult>;
  command(id: string, payload: unknown): Promise<ZentridMutationResult>;
};

type ZentridMutationAlertModule = {
  acknowledge(id: string, payload: unknown): Promise<ZentridMutationResult>;
  assign(id: string, payload: unknown): Promise<ZentridMutationResult>;
  escalate(id: string, payload: unknown): Promise<ZentridMutationResult>;
  resolve(id: string, payload: unknown): Promise<ZentridMutationResult>;
  createTask(id: string, payload?: unknown): Promise<ZentridMutationResult>;
  updateSop(id: string, payload: unknown): Promise<ZentridMutationResult>;
};

type ZentridAPIMutationsShape = {
  run: ZentridMutationRunner;
  isSuccess<T>(result: ZentridMutationResult<T>): result is ZentridMutationSuccess<T>;
  isFailure<T>(result: ZentridMutationResult<T>): result is ZentridMutationFailure;
  unwrap<T>(result: ZentridMutationResult<T>): T;
  clients: ZentridMutationClientModule;
  tenants: ZentridMutationTenantModule;
  plants: ZentridMutationPlantModule;
  devices: ZentridMutationDeviceModule;
  alerts: ZentridMutationAlertModule;
  integrations: ZentridMutationIntegrationModule;
};

const ZentridAPIMutations: ZentridAPIMutationsShape = (() => {
  let operationSequence = 0;

  function uniqueEntities(entities: ZentridMutationEntity[]): ZentridMutationEntity[] {
    return [...new Set(entities)];
  }

  function operationId(action: string): string {
    operationSequence += 1;
    const safeAction = action.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mutation';
    return `${safeAction}-${Date.now()}-${operationSequence}`;
  }

  function errorRecord(error: unknown): Record<string, unknown> {
    return error && typeof error === 'object' ? error as Record<string, unknown> : {};
  }

  function numericStatus(value: unknown): number {
    const status = Number(value);
    return Number.isFinite(status) && status >= 0 ? status : 0;
  }

  function textValue(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  function errorKind(status: number, code: string): ZentridMutationErrorKind {
    const normalizedCode = code.toUpperCase();
    if (normalizedCode === 'TIMEOUT' || status === 408) return 'timeout';
    if (normalizedCode === 'ABORTED') return 'cancelled';
    if (status === 401 || normalizedCode === 'SESSION_EXPIRED') return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 400 || status === 422) return 'validation';
    if (status === 409) return 'conflict';
    if (status === 429) return 'rate-limit';
    if (status >= 500) return 'server';
    if (status === 0) return 'network';
    return 'unknown';
  }

  function isRetriable(kind: ZentridMutationErrorKind, status: number): boolean {
    return kind === 'timeout'
      || kind === 'network'
      || kind === 'rate-limit'
      || kind === 'server'
      || status === 408;
  }

  function defaultErrorMessage(kind: ZentridMutationErrorKind): string {
    switch (kind) {
      case 'timeout': return 'The operation timed out before the backend responded.';
      case 'cancelled': return 'The operation was cancelled.';
      case 'unauthorized': return 'Your session has expired. Please sign in again.';
      case 'forbidden': return 'You do not have permission to perform this operation.';
      case 'validation': return 'The backend rejected one or more submitted values.';
      case 'conflict': return 'The operation conflicts with the current backend state.';
      case 'rate-limit': return 'Too many requests were sent. Try again shortly.';
      case 'server': return 'The backend could not complete the operation.';
      case 'network': return 'The backend or network is currently unavailable.';
      default: return 'The operation could not be completed.';
    }
  }

  function normalizeError(error: unknown, fallbackPath: string): ZentridMutationNormalizedError {
    const record = errorRecord(error);
    const status = numericStatus(record.status);
    const code = textValue(record.code) || (status ? `HTTP_${status}` : 'MUTATION_FAILED');
    const kind = errorKind(status, code);
    const message = textValue(record.message)
      || (error instanceof Error ? error.message : '')
      || defaultErrorMessage(kind);
    return {
      kind,
      message,
      status,
      code,
      path: textValue(record.path) || fallbackPath,
      retriable: isRetriable(kind, status)
    };
  }

  function buildMeta(descriptor: ZentridMutationDescriptor, startedAt: Date, startedMs: number): ZentridMutationMeta {
    return {
      operationId: operationId(descriptor.action),
      action: descriptor.action,
      path: descriptor.path,
      method: descriptor.method.toUpperCase(),
      entities: uniqueEntities(descriptor.entities),
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.max(0, Math.round(performance.now() - startedMs))
    };
  }

  function dispatchResult<T>(result: ZentridMutationResult<T>): void {
    window.dispatchEvent(new CustomEvent<ZentridMutationResult<T>>('zentrid:mutation-result', { detail: result }));
  }

  async function run<T>(descriptor: ZentridMutationDescriptor, operation: () => Promise<T>): Promise<ZentridMutationResult<T>> {
    const startedAt = new Date();
    const startedMs = performance.now();
    try {
      const data = await operation();
      const result: ZentridMutationSuccess<T> = {
        ok: true,
        data,
        message: descriptor.successMessage,
        meta: buildMeta(descriptor, startedAt, startedMs)
      };
      dispatchResult(result);
      return result;
    } catch (error: unknown) {
      const normalized = normalizeError(error, descriptor.path);
      const result: ZentridMutationFailure = {
        ok: false,
        data: null,
        message: normalized.message,
        error: normalized,
        meta: buildMeta(descriptor, startedAt, startedMs)
      };
      dispatchResult(result);
      return result;
    }
  }

  function isSuccess<T>(result: ZentridMutationResult<T>): result is ZentridMutationSuccess<T> {
    return result.ok;
  }

  function isFailure<T>(result: ZentridMutationResult<T>): result is ZentridMutationFailure {
    return !result.ok;
  }

  function unwrap<T>(result: ZentridMutationResult<T>): T {
    if (result.ok) return result.data;
    const error = new Error(result.error.message);
    Object.assign(error, result.error);
    throw error;
  }

  function encoded(id: string): string {
    return encodeURIComponent(String(id || '').trim());
  }

  function descriptor(
    action: string,
    path: string,
    entities: ZentridMutationEntity[],
    successMessage: string,
    method = 'POST'
  ): ZentridMutationDescriptor {
    return { action, path, method, entities, successMessage };
  }

  const clients: ZentridMutationClientModule = {
    create: (payload: unknown) => run(
      descriptor('client.create', '/api/admin/clients', ['clients'], 'Client created successfully.'),
      () => ZentridPlatformAPI.clients.create(payload)
    ),
    update: (id: string, payload: unknown) => run(
      descriptor('client.update', `/api/admin/clients/${encoded(id)}`, ['clients'], 'Client updated successfully.', 'PUT'),
      () => ZentridPlatformAPI.clients.update(id, payload)
    ),
    activate: (id: string) => run(descriptor('client.activate', `/api/admin/clients/${encoded(id)}/activate`, ['clients'], 'Client activated successfully.'), () => ZentridPlatformAPI.clients.activate(id)),
    deactivate: (id: string) => run(descriptor('client.deactivate', `/api/admin/clients/${encoded(id)}/deactivate`, ['clients'], 'Client deactivated successfully.'), () => ZentridPlatformAPI.clients.deactivate(id)),
    suspend: (id: string) => run(descriptor('client.suspend', `/api/admin/clients/${encoded(id)}/suspend`, ['clients'], 'Client suspended successfully.'), () => ZentridPlatformAPI.clients.suspend(id)),
    archive: (id: string) => run(descriptor('client.archive', `/api/admin/clients/${encoded(id)}/archive`, ['clients'], 'Client archived successfully.'), () => ZentridPlatformAPI.clients.archive(id)),
    uploadDocument: (id: string, payload: FormData) => run(
      descriptor('client.document.upload', `/api/admin/clients/${encoded(id)}/documents`, ['clients'], 'Client document uploaded successfully.'),
      () => ZentridPlatformAPI.clients.uploadDocument(id, payload)
    ),
    deleteDocument: (id: string, documentId: string) => run(descriptor('client.document.delete', `/api/admin/clients/${encoded(id)}/documents/${encoded(documentId)}`, ['clients'], 'Client document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.clients.deleteDocument(id, documentId))
  };

  const tenants: ZentridMutationTenantModule = {
    create: (payload: unknown) => run(
      descriptor('tenant.create', '/api/admin/tenants', ['tenants'], 'Tenant created successfully.'),
      () => ZentridPlatformAPI.tenants.create(payload)
    ),
    update: (id: string, payload: unknown) => run(
      descriptor('tenant.update', `/api/admin/tenants/${encoded(id)}`, ['tenants'], 'Tenant updated successfully.', 'PUT'),
      () => ZentridPlatformAPI.tenants.update(id, payload)
    ),
    activate: (id: string) => run(
      descriptor('tenant.activate', `/api/admin/tenants/${encoded(id)}/activate`, ['tenants'], 'Tenant activated successfully.'),
      () => ZentridPlatformAPI.tenants.activate(id)
    ),
    deactivate: (id: string) => run(
      descriptor('tenant.deactivate', `/api/admin/tenants/${encoded(id)}/deactivate`, ['tenants'], 'Tenant deactivated successfully.'),
      () => ZentridPlatformAPI.tenants.deactivate(id)
    ),
    archive: (id: string) => run(
      descriptor('tenant.archive', `/api/admin/tenants/${encoded(id)}/archive`, ['tenants'], 'Tenant archived successfully.'),
      () => ZentridPlatformAPI.tenants.archive(id)
    ),
    uploadDocument: (id: string, payload: FormData) => run(
      descriptor('tenant.document.upload', `/api/admin/tenants/${encoded(id)}/documents`, ['tenants'], 'Tenant document uploaded successfully.'),
      () => ZentridPlatformAPI.tenants.uploadDocument(id, payload)
    ),
    deleteDocument: (id: string, documentId: string) => run(descriptor('tenant.document.delete', `/api/admin/tenants/${encoded(id)}/documents/${encoded(documentId)}`, ['tenants'], 'Tenant document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.tenants.deleteDocument(id, documentId))
  };

  const plants: ZentridMutationPlantModule = {
    create: (payload: unknown) => run(
      descriptor('plant.create', '/api/admin/plants', ['plants'], 'Plant created successfully.'),
      () => ZentridPlatformAPI.plantRegistry.create(payload)
    ),
    update: (id: string, payload: unknown) => run(
      descriptor('plant.update', `/api/admin/plants/${encoded(id)}`, ['plants'], 'Plant updated successfully.', 'PUT'),
      () => ZentridPlatformAPI.plantRegistry.update(id, payload)
    ),
    activate: (id: string) => run(descriptor('plant.activate', `/api/admin/plants/${encoded(id)}/activate`, ['plants'], 'Plant activated successfully.'), () => ZentridPlatformAPI.plantRegistry.activate(id)),
    deactivate: (id: string) => run(descriptor('plant.deactivate', `/api/admin/plants/${encoded(id)}/deactivate`, ['plants'], 'Plant deactivated successfully.'), () => ZentridPlatformAPI.plantRegistry.deactivate(id)),
    archive: (id: string) => run(descriptor('plant.archive', `/api/admin/plants/${encoded(id)}/archive`, ['plants'], 'Plant archived successfully.'), () => ZentridPlatformAPI.plantRegistry.archive(id)),
    uploadDocument: (id: string, payload: FormData) => run(descriptor('plant.document.upload', `/api/admin/plants/${encoded(id)}/documents`, ['plants'], 'Plant document uploaded successfully.'), () => ZentridPlatformAPI.plantRegistry.uploadDocument(id, payload)),
    deleteDocument: (id: string, documentId: string) => run(descriptor('plant.document.delete', `/api/admin/plants/${encoded(id)}/documents/${encoded(documentId)}`, ['plants'], 'Plant document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.plantRegistry.deleteDocument(id, documentId))
  };

  const devices: ZentridMutationDeviceModule = {
    activate: (id: string) => run(descriptor('device.activate', `/api/admin/devices/${encoded(id)}/activate`, ['devices'], 'Device activated successfully.'), () => ZentridPlatformAPI.deviceRegistry.activate(id)),
    deactivate: (id: string) => run(descriptor('device.deactivate', `/api/admin/devices/${encoded(id)}/deactivate`, ['devices'], 'Device deactivated successfully.'), () => ZentridPlatformAPI.deviceRegistry.deactivate(id)),
    archive: (id: string) => run(descriptor('device.archive', `/api/admin/devices/${encoded(id)}/archive`, ['devices'], 'Device archived successfully.'), () => ZentridPlatformAPI.deviceRegistry.archive(id)),
    uploadDocument: (id: string, payload: FormData) => run(descriptor('device.document.upload', `/api/admin/devices/${encoded(id)}/documents`, ['devices'], 'Device document uploaded successfully.'), () => ZentridPlatformAPI.deviceRegistry.uploadDocument(id, payload)),
    deleteDocument: (id: string, documentId: string) => run(descriptor('device.document.delete', `/api/admin/devices/${encoded(id)}/documents/${encoded(documentId)}`, ['devices'], 'Device document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.deviceRegistry.deleteDocument(id, documentId)),
    command: (id: string, payload: unknown) => run(descriptor('device.command', `/api/admin/devices/${encoded(id)}/commands`, ['devices'], 'Device command accepted by backend.'), () => ZentridPlatformAPI.deviceRegistry.command(id, payload))
  };

  const alerts: ZentridMutationAlertModule = {
    acknowledge: (id: string, payload: unknown) => run(
      descriptor('alert.acknowledge', `/api/admin/alerts/${encoded(id)}/acknowledge`, ['alerts'], 'Alert acknowledged successfully.'),
      () => ZentridPlatformAPI.adminAlerts.acknowledge(id, payload)
    ),
    assign: (id: string, payload: unknown) => run(
      descriptor('alert.assign', `/api/admin/alerts/${encoded(id)}/assign`, ['alerts'], 'Alert assignment updated successfully.'),
      () => ZentridPlatformAPI.adminAlerts.assign(id, payload)
    ),
    escalate: (id: string, payload: unknown) => run(
      descriptor('alert.escalate', `/api/admin/alerts/${encoded(id)}/escalate`, ['alerts'], 'Alert escalated successfully.'),
      () => ZentridPlatformAPI.adminAlerts.escalate(id, payload)
    ),
    resolve: (id: string, payload: unknown) => run(
      descriptor('alert.resolve', `/api/admin/alerts/${encoded(id)}/resolve`, ['alerts'], 'Alert resolved successfully.'),
      () => ZentridPlatformAPI.adminAlerts.resolve(id, payload)
    ),
    createTask: (id: string, payload?: unknown) => run(
      descriptor('alert.task.create', `/api/admin/alerts/${encoded(id)}/tasks`, ['alerts'], 'Alert follow-up task created successfully.'),
      () => ZentridPlatformAPI.adminAlerts.createTask(id, payload)
    ),
    updateSop: (id: string, payload: unknown) => run(
      descriptor('alert.sop.update', `/api/admin/alerts/${encoded(id)}/sop`, ['alerts'], 'Alert SOP updated successfully.', 'PUT'),
      () => ZentridPlatformAPI.adminAlerts.updateSop(id, payload)
    )
  };

  const integrationEntities: ZentridMutationEntity[] = ['integrations', 'plants', 'devices', 'alerts'];
  function integrationPath(id: string, action: string): string {
    return `/api/admin/provider-integrations/${encoded(id)}/${action}`;
  }

  const integrations: ZentridMutationIntegrationModule = {
    create: (payload: unknown) => run(
      descriptor('integration.create', '/api/admin/provider-integrations', ['integrations'], 'Provider integration created successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.create(payload)
    ),
    validate: (id: string) => run(
      descriptor('integration.validate', integrationPath(id, 'validate'), ['integrations'], 'Provider integration validated successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.validate(id)
    ),
    testConnection: (id: string) => run(
      descriptor('integration.test-connection', integrationPath(id, 'test-connection'), ['integrations'], 'Provider connection test completed successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.testConnection(id)
    ),
    testSampleData: (id: string) => run(
      descriptor('integration.test-sample-data', integrationPath(id, 'test-sample-data'), ['integrations'], 'Provider sample-data test completed successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.testSampleData(id)
    ),
    activate: (id: string) => run(
      descriptor('integration.activate', integrationPath(id, 'activate'), integrationEntities, 'Provider integration activated successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.activate(id)
    ),
    suspend: (id: string) => run(
      descriptor('integration.suspend', integrationPath(id, 'suspend'), integrationEntities, 'Provider integration suspended successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.suspend(id)
    ),
    archive: (id: string) => run(
      descriptor('integration.archive', integrationPath(id, 'archive'), integrationEntities, 'Provider integration archived successfully.'),
      () => ZentridPlatformAPI.providerIntegrations.archive(id)
    ),
    failed: (id: string) => run(
      descriptor('integration.failed', integrationPath(id, 'failed'), integrationEntities, 'Provider integration marked as failed.'),
      () => ZentridPlatformAPI.providerIntegrations.failed(id)
    )
  };

  return { run, isSuccess, isFailure, unwrap, clients, tenants, plants, devices, alerts, integrations };
})();

window.ZentridAPIMutations = ZentridAPIMutations;
window.FleetAPIMutations = ZentridAPIMutations;
})();
