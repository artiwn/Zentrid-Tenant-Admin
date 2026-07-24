(function () {
type FleetMutationErrorKind =
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

type FleetMutationDescriptor = {
  action: string;
  path: string;
  method: string;
  entities: ZentridMutationEntity[];
  successMessage: string;
};

type FleetMutationMeta = {
  operationId: string;
  action: string;
  path: string;
  method: string;
  entities: ZentridMutationEntity[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

type FleetMutationNormalizedError = {
  kind: FleetMutationErrorKind;
  message: string;
  status: number;
  code: string;
  path: string;
  retriable: boolean;
};

type FleetMutationSuccess<T> = {
  ok: true;
  data: T;
  message: string;
  meta: FleetMutationMeta;
};

type FleetMutationFailure = {
  ok: false;
  data: null;
  message: string;
  error: FleetMutationNormalizedError;
  meta: FleetMutationMeta;
};

type FleetMutationResult<T = unknown> = FleetMutationSuccess<T> | FleetMutationFailure;

type FleetMutationRunner = <T>(
  descriptor: FleetMutationDescriptor,
  operation: () => Promise<T>
) => Promise<FleetMutationResult<T>>;

type FleetMutationCreateModule = {
  create(payload: unknown): Promise<FleetMutationResult>;
};



type FleetAPIMutationsShape = {
  run: FleetMutationRunner;
  isSuccess<T>(result: FleetMutationResult<T>): result is FleetMutationSuccess<T>;
  isFailure<T>(result: FleetMutationResult<T>): result is FleetMutationFailure;
  unwrap<T>(result: FleetMutationResult<T>): T;
  clients: FleetMutationCreateModule;
  plants: FleetMutationCreateModule;
};

const FleetAPIMutations: FleetAPIMutationsShape = (() => {
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

  function errorKind(status: number, code: string): FleetMutationErrorKind {
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

  function isRetriable(kind: FleetMutationErrorKind, status: number): boolean {
    return kind === 'timeout'
      || kind === 'network'
      || kind === 'rate-limit'
      || kind === 'server'
      || status === 408;
  }

  function defaultErrorMessage(kind: FleetMutationErrorKind): string {
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

  function normalizeError(error: unknown, fallbackPath: string): FleetMutationNormalizedError {
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

  function buildMeta(descriptor: FleetMutationDescriptor, startedAt: Date, startedMs: number): FleetMutationMeta {
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

  function dispatchResult<T>(result: FleetMutationResult<T>): void {
    window.dispatchEvent(new CustomEvent<FleetMutationResult<T>>('zentrid:mutation-result', { detail: result }));
  }

  async function run<T>(descriptor: FleetMutationDescriptor, operation: () => Promise<T>): Promise<FleetMutationResult<T>> {
    const startedAt = new Date();
    const startedMs = performance.now();
    try {
      const data = await operation();
      const result: FleetMutationSuccess<T> = {
        ok: true,
        data,
        message: descriptor.successMessage,
        meta: buildMeta(descriptor, startedAt, startedMs)
      };
      dispatchResult(result);
      return result;
    } catch (error: unknown) {
      const normalized = normalizeError(error, descriptor.path);
      const result: FleetMutationFailure = {
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

  function isSuccess<T>(result: FleetMutationResult<T>): result is FleetMutationSuccess<T> {
    return result.ok;
  }

  function isFailure<T>(result: FleetMutationResult<T>): result is FleetMutationFailure {
    return !result.ok;
  }

  function unwrap<T>(result: FleetMutationResult<T>): T {
    if (result.ok) return result.data;
    const error = new Error(result.error.message);
    Object.assign(error, result.error);
    throw error;
  }


  function descriptor(
    action: string,
    path: string,
    entities: ZentridMutationEntity[],
    successMessage: string
  ): FleetMutationDescriptor {
    return { action, path, method: 'POST', entities, successMessage };
  }

  const clients: FleetMutationCreateModule = {
    create: (payload: unknown) => run(
      descriptor('client.create', '/api/admin/clients', ['clients'], 'Client created successfully.'),
      () => ZentridPlatformAPI.clients.create(payload)
    )
  };


  const plants: FleetMutationCreateModule = {
    create: (payload: unknown) => run(
      descriptor('plant.create', '/api/admin/plants', ['plants'], 'Plant created successfully.'),
      () => ZentridPlatformAPI.plantRegistry.create(payload)
    )
  };


  return { run, isSuccess, isFailure, unwrap, clients, plants };
})();

window.FleetAPIMutations = FleetAPIMutations;
})();
