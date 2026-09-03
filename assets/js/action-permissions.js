"use strict";
const FleetActionPermissions = (() => {
    const mutableActions = new Set(['create', 'edit', 'activate', 'deactivate', 'suspend', 'archive', 'document', 'acknowledge', 'assign', 'escalate', 'resolve', 'task']);
    const policy = {
        client: ['view', 'create', 'edit', 'activate', 'deactivate', 'suspend', 'archive', 'document', 'export'],
        plant: ['view', 'create', 'edit', 'activate', 'deactivate', 'archive', 'document', 'export'],
        device: ['view', 'activate', 'deactivate', 'archive', 'document', 'export'],
        integration: ['view', 'export'],
        alert: ['view', 'edit', 'export', 'acknowledge', 'assign', 'escalate', 'resolve', 'task'],
        telemetry: ['view', 'export'],
        energy: ['view', 'export'],
        finance: ['view', 'export'],
        report: ['view', 'create', 'edit', 'export'],
        user: ['view', 'create', 'edit', 'deactivate', 'export'],
        settings: ['view', 'edit'],
        generic: ['view', 'export']
    };
    function normalize(value) {
        return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    }
    function currentProfile() {
        const roles = window.ZentridAuth?.getRoles?.() || [];
        if (!roles.length)
            return window.ZentridAuth?.getAccessToken?.() ? 'verifying' : 'restricted';
        return roles.some(role => ['tenantadmin', 'tenant administrator', 'tenantadministrator', 'organizationadmin', 'organization admin'].includes(normalize(role).replace(/\s+/g, ''))) ? 'tenant-admin' : 'restricted';
    }
    function currentProfileLabel() {
        const profile = currentProfile();
        return profile === 'tenant-admin' ? 'Tenant Administrator' : profile === 'verifying' ? 'Verifying access' : 'Restricted role';
    }
    function recordValue(record, key) {
        return record && typeof record === 'object' ? record[key] : undefined;
    }
    function originOf(context) {
        const explicit = normalize(context.origin);
        if (explicit)
            return explicit;
        if (context.record && window.FleetDataSource)
            return normalize(window.FleetDataSource.origin(context.record, context.resource || 'generic'));
        return normalize(recordValue(context.record, 'dataOrigin') || recordValue(context.record, 'source'));
    }
    function decide(context) {
        const resource = context.resource || 'generic';
        const profile = currentProfile();
        const label = currentProfileLabel();
        if (profile !== 'tenant-admin') {
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: profile === 'verifying' ? 'Permissions are still being verified.' : 'This account is not allowed to use the Tenant Admin workspace.' };
        }
        const status = normalize(context.status || recordValue(context.record, 'status') || recordValue(context.record, 'lifecycleStatus'));
        const allowedByRole = (policy[resource] || policy.generic).includes(context.action);
        if (!allowedByRole)
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Tenant Administrator cannot ${context.action} ${resource} records.` };
        if (status === 'archived' && mutableActions.has(context.action))
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Archived ${resource} records are read-only.` };
        if (resource === 'integration' && mutableActions.has(context.action))
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: 'Integration credentials, mappings and lifecycle are managed outside this workspace.' };
        if (resource === 'finance' && ['create', 'edit', 'activate', 'deactivate', 'archive'].includes(context.action))
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: 'Commercial plans and payment configuration are read-only for Tenant Admin.' };
        const backendManaged = ['live', 'mixed'].includes(originOf(context));
        if (context.action === 'edit' && backendManaged && context.updateAvailable === false && context.localOverride !== true)
            return { allowed: false, action: context.action, resource, profile, profileLabel: label, reason: `Live ${resource} editing is unavailable until the backend exposes an update endpoint.` };
        return { allowed: true, action: context.action, resource, profile, profileLabel: label, reason: `${label}: allowed.` };
    }
    function can(context) { return decide(context).allowed; }
    function guard(context, onDenied) {
        const result = decide(context);
        if (result.allowed)
            return true;
        if (onDenied)
            onDenied(result);
        else
            window.FleetLayout?.toast?.(result.reason);
        return false;
    }
    function contextFromElement(element) {
        const action = element.dataset.permissionAction;
        if (!action)
            return null;
        const context = { action, resource: (element.dataset.permissionResource || 'generic'), status: element.dataset.permissionStatus, origin: element.dataset.permissionOrigin };
        if (element.dataset.permissionUpdateAvailable !== undefined)
            context.updateAvailable = element.dataset.permissionUpdateAvailable === 'true';
        if (element.dataset.permissionLocalOverride !== undefined)
            context.localOverride = element.dataset.permissionLocalOverride === 'true';
        return context;
    }
    function apply(element, context = contextFromElement(element) || undefined) {
        if (!context)
            return null;
        const result = decide(context);
        const control = element;
        const baseDisabled = element.dataset.permissionBaseDisabled === 'true' || element.dataset.defaultDisabled === 'true';
        element.dataset.permissionState = result.allowed ? 'allowed' : 'denied';
        element.dataset.permissionReason = result.reason;
        element.setAttribute('title', result.allowed ? `${result.profileLabel}: allowed` : result.reason);
        if ('disabled' in control)
            control.disabled = baseDisabled || !result.allowed;
        element.setAttribute('aria-disabled', baseDisabled || !result.allowed ? 'true' : 'false');
        element.classList.toggle('permission-denied-v121', !result.allowed);
        return result;
    }
    function refresh(root = document) {
        root.querySelectorAll('[data-permission-action]').forEach(element => apply(element));
        root.querySelectorAll('[data-permission-summary]').forEach(element => {
            const resource = (element.dataset.permissionResource || 'generic');
            const nextSummary = `${currentProfileLabel()} · ${resource === 'generic' ? 'Tenant workspace' : resource}`;
            if (element.textContent !== nextSummary)
                element.textContent = nextSummary;
        });
    }
    function summary(resource = 'generic') {
        return `${currentProfileLabel()} · ${resource === 'generic' ? 'Tenant workspace' : resource}`;
    }
    const run = () => refresh(document);
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', run, { once: true });
    else
        run();
    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target.closest('[data-permission-action]') : null;
        if (!target)
            return;
        const context = contextFromElement(target);
        if (!context)
            return;
        const result = decide(context);
        if (result.allowed)
            return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.FleetLayout?.toast?.(result.reason);
    }, true);
    window.addEventListener('zentrid:auth', run);
    if (!['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || ''))
        new MutationObserver(records => { if (records.some(record => record.addedNodes.length))
            refresh(document); }).observe(document.documentElement, { childList: true, subtree: true });
    return { currentProfile, currentProfileLabel, decide, can, guard, apply, refresh, summary };
})();
Object.assign(window, { FleetActionPermissions });
