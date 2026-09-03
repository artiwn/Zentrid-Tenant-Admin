"use strict";
window.FleetDataSource = window.FleetDataSource || (() => {
    const labels = {
        live: 'Live API',
        mock: 'Mock data',
        local: 'Local changes',
        mixed: 'Mixed sources'
    };
    function asRecord(value) {
        return value && typeof value === 'object' ? value : {};
    }
    function normalizedText(value) {
        return String(value ?? '').trim().toLowerCase();
    }
    function explicitOrigin(record) {
        const candidate = normalizedText(record.dataOrigin || record.sourceOrigin || record._dataOrigin);
        return candidate === 'live' || candidate === 'mock' || candidate === 'local' || candidate === 'mixed'
            ? candidate
            : null;
    }
    function origin(record, entity = 'record') {
        if (typeof record === 'string') {
            const value = normalizedText(record);
            if (value === 'live' || value === 'mock' || value === 'local' || value === 'mixed')
                return value;
        }
        const row = asRecord(record);
        const explicit = explicitOrigin(row);
        if (explicit)
            return explicit;
        const id = normalizedText(row.id);
        const externalId = normalizedText(row.externalId);
        const source = [row.source, row.sourceStatus, row.verification, row.tier, row.integration, row.accessScope]
            .map(normalizedText)
            .join(' ');
        const localSignals = [row.lastActivity, row.onboarding, row.account]
            .map(normalizedText)
            .join(' ');
        if (row.raw || id.startsWith('live-') || source.includes('live api') || source.includes('backend live'))
            return 'live';
        if (id.includes('-local-') ||
            externalId === 'manual' ||
            externalId === 'local-storage' ||
            source.includes('local draft') ||
            source.includes('manual / local') ||
            source.includes('manual entry') ||
            localSignals.includes('created now') ||
            localSignals.includes('client profile created') ||
            localSignals.includes('tenant admin intake'))
            return 'local';
        const entityKey = normalizedText(entity);
        if (row.createdAt && ['tenant', 'client', 'plant', 'device'].includes(entityKey))
            return 'local';
        return 'mock';
    }
    function label(value) {
        return labels[value];
    }
    function badge(recordOrOrigin, entity = 'record', compact = false) {
        const value = origin(recordOrOrigin, entity);
        const compactClass = compact ? ' compact' : '';
        return `<span class="record-origin-chip ${value}${compactClass}" data-record-origin="${value}" title="Data source: ${labels[value]}">${labels[value]}</span>`;
    }
    function summary(records, entity = 'record') {
        const counts = { live: 0, mock: 0, local: 0, mixed: 0 };
        for (const record of Array.isArray(records) ? records : [])
            counts[origin(record, entity)] += 1;
        const active = Object.keys(counts).filter(key => counts[key] > 0);
        const resolved = active.length > 1 ? 'mixed' : active[0] || 'mock';
        return { origin: resolved, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
    }
    function markLocal(record) {
        return { ...record, dataOrigin: 'local' };
    }
    function markChanged(record, entity = 'record') {
        const dataOrigin = origin(record, entity) === 'live' ? 'mixed' : 'local';
        return { ...record, dataOrigin };
    }
    return { origin, label, badge, summary, markLocal, markChanged };
})();
window.TenantOverviewData = {
    kpis: [],
    fleetHealth: [],
    alerts: [],
    integrations: [],
    quality: [],
    plants: []
};
/* Zentrid local persistence layer for prototype CRUD.
   This keeps UI-created records visible after closing drawers, changing pages, or refreshing. */
window.FleetLocalStore = window.FleetLocalStore || (() => {
    const KEYS = {
        clients: 'zentrid_custom_clients',
        plants: 'zentrid_demo_plants',
        clientPlants: 'zentrid_custom_plants',
        devices: 'zentrid_demo_devices',
        clientDevices: 'zentrid_custom_devices'
    };
    const read = (key, fallback = []) => {
        try {
            const value = JSON.parse(localStorage.getItem(key) || 'null');
            return Array.isArray(value) ? value : fallback;
        }
        catch (err) {
            return fallback;
        }
    };
    const write = (key, rows) => {
        localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
        window.dispatchEvent(new CustomEvent('zentrid:local-store-updated', { detail: { key } }));
    };
    const upsert = (key, item, idField = 'id') => {
        const rows = read(key);
        const id = item && item[idField];
        if (!id)
            return rows;
        const index = rows.findIndex(x => x && x[idField] === id);
        if (index >= 0)
            rows[index] = { ...rows[index], ...item, updatedAt: new Date().toISOString() };
        else
            rows.unshift({ ...item, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
        write(key, rows);
        return rows;
    };
    const remove = (key, id, idField = 'id') => write(key, read(key).filter(x => x && x[idField] !== id));
    const byId = (key, id, idField = 'id') => read(key).find(x => x && x[idField] === id) || null;
    const addClient = item => upsert(KEYS.clients, item);
    const addPlant = item => {
        upsert(KEYS.plants, item);
        upsert(KEYS.clientPlants, normalizePlantForClientModel(item));
    };
    const addDevice = item => {
        upsert(KEYS.devices, item);
        upsert(KEYS.clientDevices, normalizeDeviceForClientModel(item));
    };
    function normalizePlantForClientModel(p = {}) {
        return {
            id: p.id || `PL-${Date.now()}`,
            code: p.code || p.plantCode || p.id || 'MANUAL-PLANT',
            externalId: p.externalId || 'LOCAL-STORAGE',
            name: p.name || p.plantName || 'New Plant',
            clientId: p.clientId || p.ownerClientId || p.client || 'CL-LOCAL',
            tenantId: p.tenantId || p.managingTenantId || '',
            portfolio: p.portfolio || 'Manual Portfolio',
            status: p.status || p.health || 'Draft',
            type: p.type || 'Commercial',
            country: p.country || 'Armenia',
            region: p.region || '—',
            city: p.city || '—',
            address: p.address || '—',
            timezone: p.timezone || 'Asia/Yerevan',
            capacityDc: typeof p.capacityDc === 'number' ? `${p.capacityDc} MWp` : (p.capacityDc || '0 MWp'),
            capacityAc: typeof p.capacityAc === 'number' ? `${p.capacityAc} MW` : (p.capacityAc || '0 MW'),
            gridCapacity: typeof p.gridCapacity === 'number' ? `${p.gridCapacity} MW` : (p.gridCapacity || '0 MW'),
            commissioning: p.commissioning || p.commissioned || '—',
            owner: p.owner || p.clientName || p.ownerName || 'Local Client',
            operator: p.operator || p.tenant || 'Tenant workspace',
            om: p.om || p.serviceProvider || p.operator || p.tenant || 'Tenant workspace',
            powerNow: p.powerNow || p.livePower || '0 kW',
            energyToday: p.energyToday || p.today || '0 kWh',
            alerts: Number(p.alerts || 0),
            health: p.health || p.status || 'Draft',
            panels: Number(p.panels || 0),
            inverters: Number(p.inverters || 0),
            strings: Number(p.strings || 0),
            transformers: Number(p.transformers || 0),
            meters: Number(p.meters || 0),
            battery: p.battery || 'No',
            devices: Array.isArray(p.devices) ? p.devices : [],
            dataOrigin: p.dataOrigin || 'local',
            updated: p.updated || p.updatedAt || '',
            lastSyncAt: p.lastSyncAt || '',
            sourceSystem: p.sourceSystem || p.vendor || (p.externalId === 'LOCAL-STORAGE' ? 'Manual / Local storage' : ''),
            integration: p.integration || p.sourceSystem || p.vendor || 'Manual / Local storage',
            latitude: p.latitude || p.lat || '',
            longitude: p.longitude || p.lng || '',
            raw: p.raw || undefined
        };
    }
    function normalizeDeviceForClientModel(d = {}) {
        return {
            id: d.id || `DEV-${Date.now()}`,
            plantId: d.plantId || '',
            type: d.type || d.deviceType || 'Device',
            name: d.name || d.deviceName || 'New Device',
            vendor: d.vendor || d.manufacturer || 'Manual',
            manufacturer: d.manufacturer || d.vendor || 'Manual',
            model: d.model || 'Manual Model',
            serial: d.serial || d.serialNumber || d.sn || d.id || 'LOCAL-SERIAL',
            capacity: d.capacity || d.ratedPower || '—',
            firmware: d.firmware || '—',
            status: d.status || 'Online',
            location: d.location || d.parent || 'Plant level',
            lastSeen: d.lastSeen || 'Local draft',
            children: d.children || 'No child objects yet'
        };
    }
    return { KEYS, read, write, upsert, remove, byId, addClient, addPlant, addDevice, normalizePlantForClientModel, normalizeDeviceForClientModel };
})();
