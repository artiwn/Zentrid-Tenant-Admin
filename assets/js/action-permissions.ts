type FleetPermissionAction = 'view' | 'create' | 'edit' | 'activate' | 'deactivate' | 'suspend' | 'archive' | 'export';
type FleetPermissionResource = 'client' | 'plant' | 'device' | 'integration' | 'alert' | 'telemetry' | 'energy' | 'finance' | 'report' | 'user' | 'settings' | 'generic';
type FleetPermissionContext = {
  action: FleetPermissionAction;
  resource?: FleetPermissionResource;
  record?: unknown;
  status?: unknown;
  origin?: unknown;
  updateAvailable?: boolean;
  localOverride?: boolean;
};
type FleetPermissionDecision = {
  allowed: boolean;
  action: FleetPermissionAction;
  resource: FleetPermissionResource;
  profile: 'tenant-admin' | 'restricted' | 'verifying';
  profileLabel: string;
  reason: string;
};
type FleetPermissionApi = {
  currentProfile(): 'tenant-admin' | 'restricted' | 'verifying';
  currentProfileLabel(): string;
  decide(context: FleetPermissionContext): FleetPermissionDecision;
  can(context: FleetPermissionContext): boolean;
  guard(context: FleetPermissionContext, onDenied?: (decision: FleetPermissionDecision) => void): boolean;
  apply(element: HTMLElement, context?: FleetPermissionContext): FleetPermissionDecision | null;
  refresh(root?: ParentNode): void;
  summary(resource?: FleetPermissionResource): string;
};

const FleetActionPermissions: FleetPermissionApi = (() => {
  const mutableActions = new Set<FleetPermissionAction>(['create', 'edit', 'activate', 'deactivate', 'suspend', 'archive']);
  const policy: Record<FleetPermissionResource, FleetPermissionAction[]> = {
    client: ['view', 'create', 'edit', 'export'],
    plant: ['view', 'create', 'edit', 'export'],
    device: ['view', 'export'],
    integration: ['view', 'export'],
    alert: ['view', 'edit', 'export'],
    telemetry: ['view', 'export'],
    energy: ['view', 'export'],
    finance: ['view', 'export'],
    report: ['view', 'create', 'edit', 'export'],
    user: ['view', 'create', 'edit', 'deactivate', 'export'],
    settings: ['view', 'edit'],
    generic: ['view', 'export']
  };

  function normalize(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  function currentProfile(): 'tenant-admin' | 'restricted' | 'verifying' {
    const roles: string[] = window.ZentridAuth?.getRoles?.() || [];
    if (!roles.length) return window.ZentridAuth?.getAccessToken?.() ? 'verifying' : 'restricted';
    return roles.some(role => ['tenantadmin', 'tenant administrator', 'tenantadministrator', 'organizationadmin', 'organization admin'].includes(normalize(role).replace(/\s+/g, ''))) ? 'tenant-admin' : 'restricted';
  }

  function currentProfileLabel(): string {
    const profile = currentProfile();
    return profile === 'tenant-admin' ? 'Tenant Administrator' : profile === 'verifying' ? 'Verifying access' : 'Restricted role';
  }

  function recordValue(record: unknown, key: string): unknown {
    return record && typeof record === 'object' ? (record as Record<string, unknown>)[key] : undefined;
  }

  function originOf(context: FleetPermissionContext): string {
    const explicit = normalize(context.origin);
    if (explicit) return explicit;
    if (context.record && window.FleetDataSource) return normalize(window.FleetDataSource.origin(context.record, context.resource || 'generic'));
    return normalize(recordValue(context.record, 'dataOrigin') || recordValue(context.record, 'source'));
  }

  function decide(context: FleetPermissionContext): FleetPermissionDecision {
    const resource = context.resource || 'generic';
    const profile = currentProfile();
    const label = currentProfileLabel();
    if (profile !== 'tenant-admin') {
      return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: profile === 'verifying' ? 'Permissions are still being verified.' : 'This account is not allowed to use the Tenant Admin workspace.' };
    }

    const status = normalize(context.status || recordValue(context.record, 'status') || recordValue(context.record, 'lifecycleStatus'));
    const allowedByRole = (policy[resource] || policy.generic).includes(context.action);
    if (!allowedByRole) return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Tenant Administrator cannot ${context.action} ${resource} records.` };
    if (status === 'archived' && mutableActions.has(context.action)) return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Archived ${resource} records are read-only.` };
    if (resource === 'integration' && mutableActions.has(context.action)) return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: 'Integration credentials, mappings and lifecycle are managed outside this workspace.' };
    if (resource === 'finance' && ['create', 'edit', 'activate', 'deactivate', 'archive'].includes(context.action)) return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: 'Commercial plans and payment configuration are read-only for Tenant Admin.' };
    const backendManaged = ['live', 'mixed'].includes(originOf(context));
    if (context.action === 'edit' && backendManaged && context.updateAvailable === false && context.localOverride !== true) return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Live ${resource} editing is unavailable until the backend exposes an update endpoint.` };
    return { allowed: true, action: context.action, resource, profile, profileLabel: label, reason: `${label}: allowed.` };
  }

  function can(context: FleetPermissionContext): boolean { return decide(context).allowed; }
  function guard(context: FleetPermissionContext, onDenied?: (decision: FleetPermissionDecision) => void): boolean {
    const result = decide(context);
    if (result.allowed) return true;
    if (onDenied) onDenied(result); else window.FleetLayout?.toast?.(result.reason);
    return false;
  }

  function contextFromElement(element: HTMLElement): FleetPermissionContext | null {
    const action = element.dataset.permissionAction as FleetPermissionAction | undefined;
    if (!action) return null;
    const context: FleetPermissionContext = { action, resource: (element.dataset.permissionResource || 'generic') as FleetPermissionResource, status: element.dataset.permissionStatus, origin: element.dataset.permissionOrigin };
    if (element.dataset.permissionUpdateAvailable !== undefined) context.updateAvailable = element.dataset.permissionUpdateAvailable === 'true';
    if (element.dataset.permissionLocalOverride !== undefined) context.localOverride = element.dataset.permissionLocalOverride === 'true';
    return context;
  }

  function apply(element: HTMLElement, context = contextFromElement(element) || undefined): FleetPermissionDecision | null {
    if (!context) return null;
    const result = decide(context);
    const control = element as HTMLButtonElement;
    const baseDisabled = element.dataset.permissionBaseDisabled === 'true' || element.dataset.defaultDisabled === 'true';
    element.dataset.permissionState = result.allowed ? 'allowed' : 'denied';
    element.dataset.permissionReason = result.reason;
    element.setAttribute('title', result.allowed ? `${result.profileLabel}: allowed` : result.reason);
    if ('disabled' in control) control.disabled = baseDisabled || !result.allowed;
    element.setAttribute('aria-disabled', baseDisabled || !result.allowed ? 'true' : 'false');
    element.classList.toggle('permission-denied-v121', !result.allowed);
    return result;
  }

  function refresh(root: ParentNode = document): void {
    root.querySelectorAll<HTMLElement>('[data-permission-action]').forEach(element => apply(element));
    root.querySelectorAll<HTMLElement>('[data-permission-summary]').forEach(element => {
      const resource = (element.dataset.permissionResource || 'generic') as FleetPermissionResource;
      const nextSummary = `${currentProfileLabel()} · ${resource === 'generic' ? 'Tenant workspace' : resource}`;
      if (element.textContent !== nextSummary) element.textContent = nextSummary;
    });
  }

  function summary(resource: FleetPermissionResource = 'generic'): string {
    return `${currentProfileLabel()} · ${resource === 'generic' ? 'Tenant workspace' : resource}`;
  }

  const run = (): void => refresh(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-permission-action]') : null;
    if (!target) return;
    const context = contextFromElement(target);
    if (!context) return;
    const result = decide(context);
    if (result.allowed) return;
    event.preventDefault(); event.stopImmediatePropagation(); window.FleetLayout?.toast?.(result.reason);
  }, true);
  window.addEventListener('zentrid:auth', run);
  if (!['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || '')) new MutationObserver(records => { if (records.some(record => record.addedNodes.length)) refresh(document); }).observe(document.documentElement, { childList: true, subtree: true });

  return { currentProfile, currentProfileLabel, decide, can, guard, apply, refresh, summary };
})();
Object.assign(window, { FleetActionPermissions });
