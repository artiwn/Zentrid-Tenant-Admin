"use strict";
(function () {
    const ZentridAPIMutations = (() => {
        let operationSequence = 0;
        function uniqueEntities(entities) {
            return [...new Set(entities)];
        }
        function operationId(action) {
            operationSequence += 1;
            const safeAction = action.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mutation';
            return `${safeAction}-${Date.now()}-${operationSequence}`;
        }
        function errorRecord(error) {
            return error && typeof error === 'object' ? error : {};
        }
        function numericStatus(value) {
            const status = Number(value);
            return Number.isFinite(status) && status >= 0 ? status : 0;
        }
        function textValue(value) {
            return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        }
        function errorKind(status, code) {
            const normalizedCode = code.toUpperCase();
            if (normalizedCode === 'TIMEOUT' || status === 408)
                return 'timeout';
            if (normalizedCode === 'ABORTED')
                return 'cancelled';
            if (status === 401 || normalizedCode === 'SESSION_EXPIRED')
                return 'unauthorized';
            if (status === 403)
                return 'forbidden';
            if (status === 400 || status === 422)
                return 'validation';
            if (status === 409)
                return 'conflict';
            if (status === 429)
                return 'rate-limit';
            if (status >= 500)
                return 'server';
            if (status === 0)
                return 'network';
            return 'unknown';
        }
        function isRetriable(kind, status) {
            return kind === 'timeout'
                || kind === 'network'
                || kind === 'rate-limit'
                || kind === 'server'
                || status === 408;
        }
        function defaultErrorMessage(kind) {
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
        function normalizeError(error, fallbackPath) {
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
        function buildMeta(descriptor, startedAt, startedMs) {
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
        function dispatchResult(result) {
            window.dispatchEvent(new CustomEvent('zentrid:mutation-result', { detail: result }));
        }
        async function run(descriptor, operation) {
            const startedAt = new Date();
            const startedMs = performance.now();
            try {
                const data = await operation();
                const result = {
                    ok: true,
                    data,
                    message: descriptor.successMessage,
                    meta: buildMeta(descriptor, startedAt, startedMs)
                };
                dispatchResult(result);
                return result;
            }
            catch (error) {
                const normalized = normalizeError(error, descriptor.path);
                const result = {
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
        function isSuccess(result) {
            return result.ok;
        }
        function isFailure(result) {
            return !result.ok;
        }
        function unwrap(result) {
            if (result.ok)
                return result.data;
            const error = new Error(result.error.message);
            Object.assign(error, result.error);
            throw error;
        }
        function encoded(id) {
            return encodeURIComponent(String(id || '').trim());
        }
        function descriptor(action, path, entities, successMessage, method = 'POST') {
            return { action, path, method, entities, successMessage };
        }
        const clients = {
            create: (payload) => run(descriptor('client.create', '/api/admin/clients', ['clients'], 'Client created successfully.'), () => ZentridPlatformAPI.clients.create(payload)),
            update: (id, payload) => run(descriptor('client.update', `/api/admin/clients/${encoded(id)}`, ['clients'], 'Client updated successfully.', 'PUT'), () => ZentridPlatformAPI.clients.update(id, payload)),
            activate: (id) => run(descriptor('client.activate', `/api/admin/clients/${encoded(id)}/activate`, ['clients'], 'Client activated successfully.'), () => ZentridPlatformAPI.clients.activate(id)),
            deactivate: (id) => run(descriptor('client.deactivate', `/api/admin/clients/${encoded(id)}/deactivate`, ['clients'], 'Client deactivated successfully.'), () => ZentridPlatformAPI.clients.deactivate(id)),
            suspend: (id) => run(descriptor('client.suspend', `/api/admin/clients/${encoded(id)}/suspend`, ['clients'], 'Client suspended successfully.'), () => ZentridPlatformAPI.clients.suspend(id)),
            archive: (id) => run(descriptor('client.archive', `/api/admin/clients/${encoded(id)}/archive`, ['clients'], 'Client archived successfully.'), () => ZentridPlatformAPI.clients.archive(id)),
            uploadDocument: (id, payload) => run(descriptor('client.document.upload', `/api/admin/clients/${encoded(id)}/documents`, ['clients'], 'Client document uploaded successfully.'), () => ZentridPlatformAPI.clients.uploadDocument(id, payload)),
            deleteDocument: (id, documentId) => run(descriptor('client.document.delete', `/api/admin/clients/${encoded(id)}/documents/${encoded(documentId)}`, ['clients'], 'Client document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.clients.deleteDocument(id, documentId))
        };
        const tenants = {
            create: (payload) => run(descriptor('tenant.create', '/api/admin/tenants', ['tenants'], 'Tenant created successfully.'), () => ZentridPlatformAPI.tenants.create(payload)),
            update: (id, payload) => run(descriptor('tenant.update', `/api/admin/tenants/${encoded(id)}`, ['tenants'], 'Tenant updated successfully.', 'PUT'), () => ZentridPlatformAPI.tenants.update(id, payload)),
            activate: (id) => run(descriptor('tenant.activate', `/api/admin/tenants/${encoded(id)}/activate`, ['tenants'], 'Tenant activated successfully.'), () => ZentridPlatformAPI.tenants.activate(id)),
            deactivate: (id) => run(descriptor('tenant.deactivate', `/api/admin/tenants/${encoded(id)}/deactivate`, ['tenants'], 'Tenant deactivated successfully.'), () => ZentridPlatformAPI.tenants.deactivate(id)),
            archive: (id) => run(descriptor('tenant.archive', `/api/admin/tenants/${encoded(id)}/archive`, ['tenants'], 'Tenant archived successfully.'), () => ZentridPlatformAPI.tenants.archive(id)),
            uploadDocument: (id, payload) => run(descriptor('tenant.document.upload', `/api/admin/tenants/${encoded(id)}/documents`, ['tenants'], 'Tenant document uploaded successfully.'), () => ZentridPlatformAPI.tenants.uploadDocument(id, payload)),
            deleteDocument: (id, documentId) => run(descriptor('tenant.document.delete', `/api/admin/tenants/${encoded(id)}/documents/${encoded(documentId)}`, ['tenants'], 'Tenant document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.tenants.deleteDocument(id, documentId))
        };
        const plants = {
            create: (payload) => run(descriptor('plant.create', '/api/admin/plants', ['plants'], 'Plant created successfully.'), () => ZentridPlatformAPI.plantRegistry.create(payload)),
            update: (id, payload) => run(descriptor('plant.update', `/api/admin/plants/${encoded(id)}`, ['plants'], 'Plant updated successfully.', 'PUT'), () => ZentridPlatformAPI.plantRegistry.update(id, payload)),
            activate: (id) => run(descriptor('plant.activate', `/api/admin/plants/${encoded(id)}/activate`, ['plants'], 'Plant activated successfully.'), () => ZentridPlatformAPI.plantRegistry.activate(id)),
            deactivate: (id) => run(descriptor('plant.deactivate', `/api/admin/plants/${encoded(id)}/deactivate`, ['plants'], 'Plant deactivated successfully.'), () => ZentridPlatformAPI.plantRegistry.deactivate(id)),
            archive: (id) => run(descriptor('plant.archive', `/api/admin/plants/${encoded(id)}/archive`, ['plants'], 'Plant archived successfully.'), () => ZentridPlatformAPI.plantRegistry.archive(id)),
            uploadDocument: (id, payload) => run(descriptor('plant.document.upload', `/api/admin/plants/${encoded(id)}/documents`, ['plants'], 'Plant document uploaded successfully.'), () => ZentridPlatformAPI.plantRegistry.uploadDocument(id, payload)),
            deleteDocument: (id, documentId) => run(descriptor('plant.document.delete', `/api/admin/plants/${encoded(id)}/documents/${encoded(documentId)}`, ['plants'], 'Plant document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.plantRegistry.deleteDocument(id, documentId))
        };
        const devices = {
            activate: (id) => run(descriptor('device.activate', `/api/admin/devices/${encoded(id)}/activate`, ['devices'], 'Device activated successfully.'), () => ZentridPlatformAPI.deviceRegistry.activate(id)),
            deactivate: (id) => run(descriptor('device.deactivate', `/api/admin/devices/${encoded(id)}/deactivate`, ['devices'], 'Device deactivated successfully.'), () => ZentridPlatformAPI.deviceRegistry.deactivate(id)),
            archive: (id) => run(descriptor('device.archive', `/api/admin/devices/${encoded(id)}/archive`, ['devices'], 'Device archived successfully.'), () => ZentridPlatformAPI.deviceRegistry.archive(id)),
            uploadDocument: (id, payload) => run(descriptor('device.document.upload', `/api/admin/devices/${encoded(id)}/documents`, ['devices'], 'Device document uploaded successfully.'), () => ZentridPlatformAPI.deviceRegistry.uploadDocument(id, payload)),
            deleteDocument: (id, documentId) => run(descriptor('device.document.delete', `/api/admin/devices/${encoded(id)}/documents/${encoded(documentId)}`, ['devices'], 'Device document deleted successfully.', 'DELETE'), () => ZentridPlatformAPI.deviceRegistry.deleteDocument(id, documentId)),
            command: (id, payload) => run(descriptor('device.command', `/api/admin/devices/${encoded(id)}/commands`, ['devices'], 'Device command accepted by backend.'), () => ZentridPlatformAPI.deviceRegistry.command(id, payload))
        };
        const alerts = {
            acknowledge: (id, payload) => run(descriptor('alert.acknowledge', `/api/admin/alerts/${encoded(id)}/acknowledge`, ['alerts'], 'Alert acknowledged successfully.'), () => ZentridPlatformAPI.adminAlerts.acknowledge(id, payload)),
            assign: (id, payload) => run(descriptor('alert.assign', `/api/admin/alerts/${encoded(id)}/assign`, ['alerts'], 'Alert assignment updated successfully.'), () => ZentridPlatformAPI.adminAlerts.assign(id, payload)),
            escalate: (id, payload) => run(descriptor('alert.escalate', `/api/admin/alerts/${encoded(id)}/escalate`, ['alerts'], 'Alert escalated successfully.'), () => ZentridPlatformAPI.adminAlerts.escalate(id, payload)),
            resolve: (id, payload) => run(descriptor('alert.resolve', `/api/admin/alerts/${encoded(id)}/resolve`, ['alerts'], 'Alert resolved successfully.'), () => ZentridPlatformAPI.adminAlerts.resolve(id, payload)),
            createTask: (id, payload) => run(descriptor('alert.task.create', `/api/admin/alerts/${encoded(id)}/tasks`, ['alerts'], 'Alert follow-up task created successfully.'), () => ZentridPlatformAPI.adminAlerts.createTask(id, payload)),
            updateSop: (id, payload) => run(descriptor('alert.sop.update', `/api/admin/alerts/${encoded(id)}/sop`, ['alerts'], 'Alert SOP updated successfully.', 'PUT'), () => ZentridPlatformAPI.adminAlerts.updateSop(id, payload))
        };
        const integrationEntities = ['integrations', 'plants', 'devices', 'alerts'];
        function integrationPath(id, action) {
            return `/api/admin/provider-integrations/${encoded(id)}/${action}`;
        }
        const integrations = {
            create: (payload) => run(descriptor('integration.create', '/api/admin/provider-integrations', ['integrations'], 'Provider integration created successfully.'), () => ZentridPlatformAPI.providerIntegrations.create(payload)),
            validate: (id) => run(descriptor('integration.validate', integrationPath(id, 'validate'), ['integrations'], 'Provider integration validated successfully.'), () => ZentridPlatformAPI.providerIntegrations.validate(id)),
            testConnection: (id) => run(descriptor('integration.test-connection', integrationPath(id, 'test-connection'), ['integrations'], 'Provider connection test completed successfully.'), () => ZentridPlatformAPI.providerIntegrations.testConnection(id)),
            testSampleData: (id) => run(descriptor('integration.test-sample-data', integrationPath(id, 'test-sample-data'), ['integrations'], 'Provider sample-data test completed successfully.'), () => ZentridPlatformAPI.providerIntegrations.testSampleData(id)),
            activate: (id) => run(descriptor('integration.activate', integrationPath(id, 'activate'), integrationEntities, 'Provider integration activated successfully.'), () => ZentridPlatformAPI.providerIntegrations.activate(id)),
            suspend: (id) => run(descriptor('integration.suspend', integrationPath(id, 'suspend'), integrationEntities, 'Provider integration suspended successfully.'), () => ZentridPlatformAPI.providerIntegrations.suspend(id)),
            archive: (id) => run(descriptor('integration.archive', integrationPath(id, 'archive'), integrationEntities, 'Provider integration archived successfully.'), () => ZentridPlatformAPI.providerIntegrations.archive(id)),
            failed: (id) => run(descriptor('integration.failed', integrationPath(id, 'failed'), integrationEntities, 'Provider integration marked as failed.'), () => ZentridPlatformAPI.providerIntegrations.failed(id))
        };
        return { run, isSuccess, isFailure, unwrap, clients, tenants, plants, devices, alerts, integrations };
    })();
    window.ZentridAPIMutations = ZentridAPIMutations;
    window.FleetAPIMutations = ZentridAPIMutations;
})();
