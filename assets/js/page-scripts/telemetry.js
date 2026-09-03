"use strict";
(() => {
    const tenant = String(FleetLayout.state.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace');
    const initialContext = readContext();
    let plants = [];
    let allDevices = [];
    let telemetryPoints = [];
    let metricDefinitions = [];
    let selectedPlantId = '';
    let selectedDeviceId = 'all';
    let selectedMetricKey = '';
    let selectedRange = initialContext.range || FleetLayout.state.time || 'Last 24h';
    let selectedGranularity = selectedRange.includes('30') ? 'Daily' : selectedRange.includes('7') ? 'Hourly' : '15 min';
    let loadedAt = null;
    let loadState = 'loading';
    let loadError = '';
    const metricMeta = {
        power: { label: 'Current Power', unit: 'kW' },
        current_power: { label: 'Current Power', unit: 'kW' },
        active_power: { label: 'Active Power', unit: 'kW' },
        ac_active_power: { label: 'AC Active Power', unit: 'kW' },
        energy: { label: 'Interval Energy', unit: 'kWh' },
        energy_today: { label: 'Energy Today', unit: 'kWh' },
        voltage: { label: 'AC Voltage', unit: 'V' },
        ac_voltage: { label: 'AC Voltage', unit: 'V' },
        current: { label: 'AC Current', unit: 'A' },
        ac_current: { label: 'AC Current', unit: 'A' },
        temperature: { label: 'Device Temperature', unit: '°C' },
        device_temperature: { label: 'Device Temperature', unit: '°C' },
        irradiance: { label: 'Irradiance', unit: 'W/m²' },
        frequency: { label: 'Grid Frequency', unit: 'Hz' },
        grid_frequency: { label: 'Grid Frequency', unit: 'Hz' },
        freshness: { label: 'Data Freshness', unit: 'min' },
        state_of_charge: { label: 'State of Charge', unit: '%' },
        soc: { label: 'State of Charge', unit: '%' },
        state_of_health: { label: 'State of Health', unit: '%' },
        soh: { label: 'State of Health', unit: '%' }
    };
    const knownMetricFields = [
        { keys: ['power', 'powerKw', 'currentPower', 'currentPowerKw', 'activePower', 'activePowerKw', 'acActivePowerKw'], key: 'power', label: 'Current Power', unit: 'kW' },
        { keys: ['energy', 'energyKwh', 'intervalEnergy', 'intervalEnergyKwh', 'energyToday', 'energyTodayKwh'], key: 'energy', label: 'Interval Energy', unit: 'kWh' },
        { keys: ['voltage', 'voltageV', 'acVoltage', 'acVoltageV'], key: 'voltage', label: 'AC Voltage', unit: 'V' },
        { keys: ['current', 'currentA', 'acCurrent', 'acCurrentA'], key: 'current', label: 'AC Current', unit: 'A' },
        { keys: ['temperature', 'temperatureC', 'deviceTemperature', 'deviceTemperatureC'], key: 'temperature', label: 'Device Temperature', unit: '°C' },
        { keys: ['irradiance', 'irradianceWm2', 'irradianceWPerM2'], key: 'irradiance', label: 'Irradiance', unit: 'W/m²' },
        { keys: ['frequency', 'frequencyHz', 'gridFrequency', 'gridFrequencyHz'], key: 'frequency', label: 'Grid Frequency', unit: 'Hz' },
        { keys: ['freshness', 'freshnessMinutes', 'dataFreshnessMinutes'], key: 'freshness', label: 'Data Freshness', unit: 'min' },
        { keys: ['soc', 'socPct', 'stateOfCharge', 'stateOfChargePct'], key: 'soc', label: 'State of Charge', unit: '%' },
        { keys: ['soh', 'sohPct', 'stateOfHealth', 'stateOfHealthPct'], key: 'soh', label: 'State of Health', unit: '%' }
    ];
    function text(value, fallback = '—') {
        const result = String(value ?? '').trim();
        return result || fallback;
    }
    function escapeHtml(value) {
        return text(value, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function isRecord(value) {
        return Boolean(value && typeof value === 'object' && !Array.isArray(value));
    }
    function firstOf(row, keys, fallback = '') {
        for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== '')
                return value;
        }
        return fallback;
    }
    function extractRows(payload, depth = 0) {
        if (depth > 5)
            return [];
        if (Array.isArray(payload))
            return payload.filter(isRecord);
        if (!isRecord(payload))
            return [];
        for (const key of ['items', 'data', 'results', 'records', 'rows', 'telemetry', 'samples', 'measurements']) {
            const candidate = payload[key];
            if (Array.isArray(candidate))
                return candidate.filter(isRecord);
            if (isRecord(candidate)) {
                const nested = extractRows(candidate, depth + 1);
                if (nested.length)
                    return nested;
            }
        }
        return [payload];
    }
    function readContext() {
        try {
            return JSON.parse(localStorage.getItem('zentrid_telemetry_context') || '{}');
        }
        catch {
            return {};
        }
    }
    function normalizeKey(value) {
        return text(value, '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    }
    function labelFromKey(key) {
        const canonical = metricMeta[key]?.label;
        if (canonical)
            return canonical;
        return key.split('_').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Telemetry Metric';
    }
    function unitForKey(key, explicit) {
        const provided = text(explicit, '');
        return provided || metricMeta[key]?.unit || '';
    }
    function decimalsForUnit(unit) {
        if (unit === 'Hz')
            return 2;
        if (unit === 'W/m²' || unit === 'min')
            return 0;
        return 1;
    }
    function numericValue(value) {
        if (typeof value === 'number')
            return Number.isFinite(value) ? value : null;
        const normalized = String(value ?? '').trim().replace(/,/g, '');
        if (!normalized)
            return null;
        const match = normalized.match(/-?\d+(?:\.\d+)?/);
        if (!match)
            return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }
    function parseTimestamp(value) {
        if (value instanceof Date && Number.isFinite(value.getTime()))
            return value;
        if (typeof value === 'number' && Number.isFinite(value)) {
            const millis = value < 10_000_000_000 ? value * 1000 : value;
            const parsed = new Date(millis);
            return Number.isFinite(parsed.getTime()) ? parsed : null;
        }
        const raw = text(value, '');
        if (!raw)
            return null;
        const parsed = new Date(raw);
        return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
    function normalizeQuality(value) {
        const normalized = text(value, '').toLowerCase();
        if (/(delay|stale|late|expired|missing)/.test(normalized))
            return 'Delayed';
        if (/(estimate|interpolat|derived|calculated)/.test(normalized))
            return 'Estimated';
        if (/(valid|good|ok|normal|verified|success)/.test(normalized))
            return 'Valid';
        return 'Unknown';
    }
    function normalizePlantRows(payload) {
        const rows = [];
        extractRows(payload).forEach(row => {
            const id = text(firstOf(row, ['id', 'plantId', 'plant_id', 'externalId', 'code'], ''), '');
            const name = text(firstOf(row, ['name', 'plantName', 'plant_name', 'displayName', 'title'], id), '');
            if (!id && !name)
                return;
            rows.push({
                id: id || name,
                name: name || id,
                code: firstOf(row, ['code', 'plantCode', 'plant_code', 'externalId'], ''),
                owner: firstOf(row, ['owner', 'ownerName', 'clientName'], ''),
                operator: firstOf(row, ['operator', 'operatorName', 'tenantName'], ''),
                country: firstOf(row, ['country', 'countryName'], ''),
                city: firstOf(row, ['city', 'location', 'region'], ''),
                sourceSystem: firstOf(row, ['sourceSystem', 'source', 'provider', 'vendor'], ''),
                integration: firstOf(row, ['integration', 'integrationName', 'provider'], '')
            });
        });
        return rows;
    }
    function normalizeDeviceRows(payload) {
        const rows = [];
        extractRows(payload).forEach(row => {
            const id = text(firstOf(row, ['id', 'deviceId', 'device_id', 'externalId', 'serialNumber', 'serial'], ''), '');
            const name = text(firstOf(row, ['name', 'deviceName', 'device_name', 'displayName', 'title'], id), '');
            if (!id && !name)
                return;
            rows.push({
                id: id || name,
                plantId: text(firstOf(row, ['plantId', 'plant_id', 'siteId', 'stationId'], ''), ''),
                name: name || id,
                type: firstOf(row, ['type', 'deviceType', 'device_type', 'category'], ''),
                vendor: firstOf(row, ['vendor', 'manufacturer', 'provider'], ''),
                model: firstOf(row, ['model', 'modelName'], '')
            });
        });
        return rows;
    }
    function dimensionContext(row, parent = {}) {
        return {
            plantId: text(firstOf(row, ['plantId', 'plant_id', 'siteId', 'stationId'], firstOf(parent, ['plantId', 'plant_id', 'siteId', 'stationId'], '')), ''),
            plantName: text(firstOf(row, ['plantName', 'plant_name', 'siteName', 'stationName'], firstOf(parent, ['plantName', 'plant_name', 'siteName', 'stationName'], '')), ''),
            deviceId: text(firstOf(row, ['deviceId', 'device_id', 'assetId', 'equipmentId'], firstOf(parent, ['deviceId', 'device_id', 'assetId', 'equipmentId'], '')), ''),
            deviceName: text(firstOf(row, ['deviceName', 'device_name', 'assetName', 'equipmentName'], firstOf(parent, ['deviceName', 'device_name', 'assetName', 'equipmentName'], '')), ''),
            source: text(firstOf(row, ['source', 'sourceSystem', 'provider', 'vendor', 'integration'], firstOf(parent, ['source', 'sourceSystem', 'provider', 'vendor', 'integration'], '/api/telemetry')), '/api/telemetry')
        };
    }
    function timestampFrom(row, parent = {}) {
        return parseTimestamp(firstOf(row, ['timestamp', 'time', 'recordedAt', 'recordedAtUtc', 'measuredAt', 'measuredAtUtc', 'occurredAt', 'createdAt', 'updatedAt', 'lastSeen', 'lastDataAt'], firstOf(parent, ['timestamp', 'time', 'recordedAt', 'recordedAtUtc', 'measuredAt', 'measuredAtUtc', 'occurredAt', 'createdAt', 'updatedAt', 'lastSeen', 'lastDataAt'], '')));
    }
    function createPoint(row, parent, metricKeyValue, metricLabelValue, unitValue, value) {
        const timestamp = timestampFrom(row, parent);
        const numeric = numericValue(value);
        const key = normalizeKey(metricKeyValue || metricLabelValue);
        if (!timestamp || numeric === null || !key)
            return null;
        const unit = unitForKey(key, unitValue);
        return {
            timestamp,
            value: numeric,
            quality: normalizeQuality(firstOf(row, ['quality', 'dataQuality', 'qualityStatus', 'validity', 'status'], firstOf(parent, ['quality', 'dataQuality', 'qualityStatus', 'validity', 'status'], ''))),
            metricKey: key,
            metricLabel: text(metricLabelValue, labelFromKey(key)),
            unit,
            ...dimensionContext(row, parent)
        };
    }
    function expandTelemetryRow(row, parent = {}) {
        const points = [];
        const mergedParent = { ...parent, ...row };
        for (const key of ['samples', 'measurements', 'records', 'items', 'telemetry']) {
            const nested = row[key];
            if (Array.isArray(nested)) {
                nested.filter(isRecord).forEach(item => points.push(...expandTelemetryRow(item, mergedParent)));
            }
        }
        for (const key of ['metrics', 'values', 'readings']) {
            const nested = row[key];
            if (!isRecord(nested))
                continue;
            Object.entries(nested).forEach(([metricKey, metricValue]) => {
                if (isRecord(metricValue)) {
                    const point = createPoint(metricValue, mergedParent, metricKey, firstOf(metricValue, ['label', 'metricLabel', 'name'], labelFromKey(normalizeKey(metricKey))), firstOf(metricValue, ['unit', 'uom', 'symbol'], ''), firstOf(metricValue, ['value', 'reading', 'numericValue', 'metricValue'], ''));
                    if (point)
                        points.push(point);
                }
                else {
                    const point = createPoint(row, parent, metricKey, labelFromKey(normalizeKey(metricKey)), '', metricValue);
                    if (point)
                        points.push(point);
                }
            });
        }
        const directMetric = firstOf(row, ['metricKey', 'metric', 'metricName', 'measurement', 'parameter', 'key', 'name'], '');
        const directValue = firstOf(row, ['value', 'numericValue', 'reading', 'metricValue', 'measurementValue'], '');
        const directPoint = createPoint(row, parent, directMetric, firstOf(row, ['metricLabel', 'label', 'displayName', 'metricName'], directMetric), firstOf(row, ['unit', 'uom', 'symbol'], ''), directValue);
        if (directPoint)
            points.push(directPoint);
        knownMetricFields.forEach(definition => {
            const field = definition.keys.find(key => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '');
            if (!field)
                return;
            const point = createPoint(row, parent, definition.key, definition.label, definition.unit, row[field]);
            if (point)
                points.push(point);
        });
        return points;
    }
    function normalizeTelemetry(payload) {
        const rows = extractRows(payload);
        const points = rows.flatMap(row => expandTelemetryRow(row));
        const seen = new Set();
        return points
            .filter(point => {
            const key = [point.timestamp.toISOString(), point.metricKey, point.plantId, point.plantName, point.deviceId, point.deviceName, point.value].join('|');
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    function mergeTelemetryEntities() {
        telemetryPoints.forEach(point => {
            if ((point.plantId || point.plantName) && !plants.some(plant => plant.id === point.plantId || plant.name === point.plantName)) {
                plants.push({ id: point.plantId || point.plantName, name: point.plantName || point.plantId, sourceSystem: point.source });
            }
            if ((point.deviceId || point.deviceName) && !allDevices.some(device => device.id === point.deviceId || device.name === point.deviceName)) {
                allDevices.push({ id: point.deviceId || point.deviceName, plantId: point.plantId, name: point.deviceName || point.deviceId, vendor: point.source });
            }
        });
    }
    function rebuildMetricDefinitions() {
        const definitions = new Map();
        telemetryPoints.forEach(point => {
            if (definitions.has(point.metricKey))
                return;
            definitions.set(point.metricKey, {
                key: point.metricKey,
                label: point.metricLabel || labelFromKey(point.metricKey),
                unit: point.unit,
                decimals: decimalsForUnit(point.unit)
            });
        });
        metricDefinitions = [...definitions.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
    function restoreSelection() {
        selectedPlantId = plants.find(plant => plant.name === initialContext.plant || plant.id === initialContext.plant)?.id || plants[0]?.id || '';
        const devices = devicesForPlant();
        selectedDeviceId = devices.find(device => device.name === initialContext.device || device.id === initialContext.device)?.id || 'all';
        selectedMetricKey = metricDefinitions.find(metric => metric.label === initialContext.metric || metric.key === initialContext.metric)?.key || metricDefinitions[0]?.key || '';
    }
    function selectedPlant() {
        return plants.find(plant => plant.id === selectedPlantId) || plants[0];
    }
    function devicesForPlant() {
        if (!selectedPlantId)
            return allDevices;
        return allDevices.filter(device => !device.plantId || device.plantId === selectedPlantId);
    }
    function selectedDevice() {
        return selectedDeviceId === 'all' ? undefined : allDevices.find(device => device.id === selectedDeviceId);
    }
    function selectedMetric() {
        return metricDefinitions.find(metric => metric.key === selectedMetricKey) || metricDefinitions[0] || { key: '', label: 'Telemetry Metric', unit: '', decimals: 1 };
    }
    function rangeStart(now) {
        if (selectedRange === 'Today')
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const duration = selectedRange === 'Last 30 days' ? 30 * 86400000 : selectedRange === 'Last 7 days' ? 7 * 86400000 : 24 * 3600000;
        return new Date(now.getTime() - duration);
    }
    function pointMatchesSelection(point) {
        const plant = selectedPlant();
        const device = selectedDevice();
        const plantMatches = !plant || (!point.plantId && !point.plantName) || point.plantId === plant.id || point.plantName === plant.name;
        const deviceMatches = !device || (!point.deviceId && !point.deviceName) || point.deviceId === device.id || point.deviceName === device.name;
        return plantMatches && deviceMatches && (!selectedMetricKey || point.metricKey === selectedMetricKey);
    }
    function aggregationMs() {
        if (selectedGranularity === 'Daily')
            return 86400000;
        if (selectedGranularity === 'Hourly')
            return 3600000;
        if (selectedGranularity === '5 min')
            return 300000;
        return 900000;
    }
    function worstQuality(values) {
        if (values.includes('Delayed'))
            return 'Delayed';
        if (values.includes('Estimated'))
            return 'Estimated';
        if (values.includes('Unknown'))
            return 'Unknown';
        return 'Valid';
    }
    function selectedPoints() {
        const now = loadedAt || new Date();
        const start = rangeStart(now).getTime();
        const filtered = telemetryPoints.filter(point => point.timestamp.getTime() >= start && pointMatchesSelection(point));
        const bucketSize = aggregationMs();
        const buckets = new Map();
        filtered.forEach(point => {
            const bucket = Math.floor(point.timestamp.getTime() / bucketSize) * bucketSize;
            const items = buckets.get(bucket) || [];
            items.push(point);
            buckets.set(bucket, items);
        });
        return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([bucket, rows]) => {
            const latest = rows[rows.length - 1];
            return {
                ...latest,
                timestamp: new Date(bucket),
                value: rows.reduce((sum, row) => sum + row.value, 0) / rows.length,
                quality: worstQuality(rows.map(row => row.quality))
            };
        });
    }
    function formatValue(value, metric = selectedMetric()) {
        if (value === null || !Number.isFinite(value))
            return '—';
        return `${value.toFixed(metric.decimals)}${metric.unit ? ` ${metric.unit}` : ''}`;
    }
    function formatTime(value) {
        if (!value)
            return '—';
        if (selectedRange === 'Last 30 days')
            return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return value.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function chartPath(points) {
        if (!points.length)
            return '';
        const values = points.map(point => point.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = Math.max(.001, max - min);
        return points.map((point, index) => {
            const x = 28 + (index / Math.max(1, points.length - 1)) * 944;
            const y = 228 - ((point.value - min) / range) * 180;
            return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ');
    }
    function chartMarkers(points) {
        if (!points.length)
            return '';
        const values = points.map(point => point.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = Math.max(.001, max - min);
        return points.map((point, index) => {
            const x = 28 + (index / Math.max(1, points.length - 1)) * 944;
            const y = 228 - ((point.value - min) / range) * 180;
            const tone = point.quality === 'Delayed' ? ' telemetry-point-delayed' : point.quality === 'Estimated' || point.quality === 'Unknown' ? ' telemetry-point-estimated' : '';
            return `<circle class="telemetry-point${tone}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"><title>${escapeHtml(formatTime(point.timestamp))} · ${escapeHtml(formatValue(point.value))} · ${point.quality}</title></circle>`;
        }).join('');
    }
    function options(values, selected, emptyLabel) {
        if (!values.length)
            return `<option value="">${escapeHtml(emptyLabel)}</option>`;
        return values.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
    }
    function statValues(points) {
        const values = points.map(point => point.value);
        const accepted = points.filter(point => point.quality === 'Valid' || point.quality === 'Estimated').length;
        return {
            latest: values.length ? values[values.length - 1] : null,
            peak: values.length ? Math.max(...values) : null,
            minimum: values.length ? Math.min(...values) : null,
            average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
            completeness: points.length ? (accepted / points.length) * 100 : null
        };
    }
    function freshnessLabel(points) {
        if (!points.length)
            return loadState === 'error' ? 'Unavailable' : 'No data';
        const latest = points[points.length - 1].timestamp.getTime();
        const ageMinutes = Math.max(0, ((loadedAt || new Date()).getTime() - latest) / 60000);
        if (ageMinutes <= 15)
            return 'Fresh';
        if (ageMinutes <= 60)
            return 'Delayed';
        return 'Stale';
    }
    function renderPage() {
        const plant = selectedPlant();
        const devices = devicesForPlant();
        if (selectedDeviceId !== 'all' && !devices.some(device => device.id === selectedDeviceId))
            selectedDeviceId = 'all';
        const device = selectedDevice();
        const metric = selectedMetric();
        const points = selectedPoints();
        const stats = statValues(points);
        const samples = [...points].reverse().slice(0, 12);
        const source = points.find(point => point.source)?.source || text(device?.vendor || plant?.sourceSystem || plant?.integration, '/api/telemetry');
        const entityLabel = device ? `${device.name} · ${device.id}` : `${plant?.name || 'All tenant plants'} · Aggregated`;
        const freshness = freshnessLabel(points);
        const statusText = loadState === 'loading' ? 'Loading API data' : loadState === 'error' ? 'API unavailable' : loadState === 'empty' ? 'No API records' : 'Live API data';
        const statusDetails = loadState === 'error' ? loadError : loadedAt ? `Updated ${loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${freshness}` : freshness;
        const chartEmpty = points.length ? '' : `<div class="empty-state"><strong>${loadState === 'loading' ? 'Loading telemetry data' : 'No telemetry records'}</strong><small>${loadState === 'error' ? escapeHtml(loadError) : 'The API returned no records for the selected filters.'}</small></div>`;
        const completeness = stats.completeness === null ? '—' : `${stats.completeness.toFixed(1)}%`;
        FleetLayout.mount(`
      <section class="page-hero telemetry-hero-v143">
        <div><p class="eyebrow">Tenant Admin · Operations</p><h1>Telemetry & Data</h1><p class="muted">Explore normalized live and historical measurements for plants and devices inside ${escapeHtml(tenant)}.</p></div>
        <button class="freshness-card" id="telemetryRefresh" type="button"><span class="pulse"></span><div><strong>${escapeHtml(statusText)}</strong><small>${escapeHtml(statusDetails)}</small></div></button>
      </section>
      <section class="context-bar glass-card telemetry-context-v143">
        <div class="ctx-item"><span>Tenant</span><strong>${escapeHtml(tenant)}</strong><small>Fixed access scope</small></div>
        <div class="ctx-item"><span>Plant</span><strong>${escapeHtml(plant?.name || 'No plant')}</strong><small>${escapeHtml(text(plant?.code, 'No code'))}</small></div>
        <div class="ctx-item"><span>Device Scope</span><strong>${escapeHtml(device?.name || 'All devices')}</strong><small>${escapeHtml(device?.type || 'Plant aggregate')}</small></div>
        <div class="ctx-item"><span>Data Layer</span><strong>Normalized</strong><small>Vendor values mapped to Zentrid units</small></div>
      </section>
      <section class="panel glass-card telemetry-control-panel-v143">
        <div class="panel-head"><div><h2>Telemetry Explorer</h2><p>Select the operational context. Filters update the chart, KPIs and sample table together.</p></div><div class="telemetry-actions-v143"><button class="secondary-action" id="telemetryExport" type="button" data-permission-action="export" data-permission-resource="telemetry">Export CSV</button></div></div>
        <div class="telemetry-filter-grid-v143">
          <label>Plant<select id="telemetryPlant">${options(plants.map(item => ({ value: item.id, label: `${item.name} · ${text(item.code, item.id)}` })), selectedPlantId, 'No API plants')}</select></label>
          <label>Device<select id="telemetryDevice"><option value="all">All devices · Plant aggregate</option>${options(devices.map(item => ({ value: item.id, label: `${item.name} · ${text(item.type, 'Device')}` })), selectedDeviceId, 'No API devices')}</select></label>
          <label>Metric<select id="telemetryMetric">${options(metricDefinitions.map(item => ({ value: item.key, label: `${item.label}${item.unit ? ` · ${item.unit}` : ''}` })), selectedMetricKey, 'No telemetry metrics')}</select></label>
          <label>Time Range<select id="telemetryRange">${options(['Today', 'Last 24h', 'Last 7 days', 'Last 30 days'].map(value => ({ value, label: value })), selectedRange, 'Last 24h')}</select></label>
          <label>Granularity<select id="telemetryGranularity">${options(['5 min', '15 min', 'Hourly', 'Daily'].map(value => ({ value, label: value })), selectedGranularity, '15 min')}</select></label>
        </div>
      </section>
      <section class="kpi-grid telemetry-kpi-grid-v143">
        <article class="kpi-card cyan"><span class="kpi-label">Latest Value</span><div class="kpi-value">${escapeHtml(formatValue(stats.latest))}</div><small class="kpi-delta">${escapeHtml(formatTime(points.at(-1)?.timestamp))}</small></article>
        <article class="kpi-card green"><span class="kpi-label">Peak</span><div class="kpi-value">${escapeHtml(formatValue(stats.peak))}</div><small class="kpi-delta">Maximum in selected range</small></article>
        <article class="kpi-card blue"><span class="kpi-label">Average</span><div class="kpi-value">${escapeHtml(formatValue(stats.average))}</div><small class="kpi-delta">${escapeHtml(selectedGranularity)} buckets</small></article>
        <article class="kpi-card yellow"><span class="kpi-label">Minimum</span><div class="kpi-value">${escapeHtml(formatValue(stats.minimum))}</div><small class="kpi-delta">Minimum in selected range</small></article>
        <article class="kpi-card violet"><span class="kpi-label">Completeness</span><div class="kpi-value">${escapeHtml(completeness)}</div><small class="kpi-delta">${points.filter(point => point.quality !== 'Valid').length} flagged interval(s)</small></article>
        <article class="kpi-card green"><span class="kpi-label">Freshness</span><div class="kpi-value">${escapeHtml(freshness)}</div><small class="kpi-delta">Calculated from latest API timestamp</small></article>
      </section>
      <section class="dashboard-grid two-col telemetry-main-grid-v143">
        <article class="panel glass-card telemetry-chart-card-v143">
          <div class="panel-head"><div><h2>${escapeHtml(metric.label)} Trend</h2><p>${escapeHtml(entityLabel)} · ${escapeHtml(selectedRange)} · ${escapeHtml(selectedGranularity)}</p></div><span class="badge ${freshness === 'Fresh' ? 'success' : freshness === 'No data' || freshness === 'Unavailable' ? 'info' : 'warning'}">${escapeHtml(freshness)}</span></div>
          <div class="telemetry-chart-shell-v143" role="img" aria-label="${escapeHtml(metric.label)} telemetry trend">
            <svg class="telemetry-line-chart-v143" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
              <g class="telemetry-grid-lines-v143"><line x1="28" y1="48" x2="972" y2="48"></line><line x1="28" y1="108" x2="972" y2="108"></line><line x1="28" y1="168" x2="972" y2="168"></line><line x1="28" y1="228" x2="972" y2="228"></line></g>
              <path class="telemetry-area-v143" d="${chartPath(points)}${points.length ? ' L 972 228 L 28 228 Z' : ''}"></path>
              <path class="telemetry-line-v143" d="${chartPath(points)}"></path>
              ${chartMarkers(points)}
            </svg>
            ${chartEmpty}
            <div class="telemetry-chart-axis-v143"><span>${escapeHtml(formatTime(points[0]?.timestamp))}</span><span>${escapeHtml(formatTime(points[Math.floor(points.length / 2)]?.timestamp))}</span><span>${escapeHtml(formatTime(points.at(-1)?.timestamp))}</span></div>
          </div>
        </article>
        <article class="panel glass-card telemetry-quality-card-v143">
          <div class="panel-head"><div><h2>Data Quality</h2><p>Freshness, completeness and source traceability for the selected series.</p></div></div>
          <div class="quality-grid telemetry-quality-grid-v143">
            <article><span>Valid</span><strong>${points.filter(point => point.quality === 'Valid').length}</strong><small>Confirmed normalized intervals</small></article>
            <article><span>Estimated</span><strong>${points.filter(point => point.quality === 'Estimated').length}</strong><small>Derived or interpolated interval</small></article>
            <article><span>Delayed</span><strong>${points.filter(point => point.quality === 'Delayed').length}</strong><small>Outside expected freshness</small></article>
            <article><span>Source</span><strong>${escapeHtml(source)}</strong><small>Vendor connector provenance</small></article>
          </div>
          <div class="info-grid telemetry-source-grid-v143">
            <div><span>Canonical Metric</span><strong>${escapeHtml(metric.label)}</strong><small>${escapeHtml(metric.key || '—')}${metric.unit ? ` · ${escapeHtml(metric.unit)}` : ''}</small></div>
            <div><span>Plant</span><strong>${escapeHtml(plant?.name || 'No plant')}</strong><small>${escapeHtml(text(plant?.country, '—'))}, ${escapeHtml(text(plant?.city, '—'))}</small></div>
            <div><span>Device</span><strong>${escapeHtml(device?.name || 'Plant aggregate')}</strong><small>${escapeHtml(device?.model || device?.type || 'All devices')}</small></div>
            <div><span>Source System</span><strong>${escapeHtml(source)}</strong><small>Read-only source metadata</small></div>
          </div>
        </article>
      </section>
      <section class="panel glass-card telemetry-samples-panel-v143">
        <div class="panel-head"><div><h2>Recent Samples</h2><p>Canonical values with quality, source and exact timestamp.</p></div><span class="badge info">${samples.length} latest intervals</span></div>
        <div class="data-table telemetry-samples-table-v143">
          <div class="data-head"><span>Timestamp</span><span>Plant / Device</span><span>Metric</span><span>Value</span><span>Quality</span><span>Source</span></div>
          ${samples.length ? samples.map(point => `<div class="data-row" data-telemetry-sample="${point.timestamp.toISOString()}"><div><strong>${escapeHtml(formatTime(point.timestamp))}</strong><small>${escapeHtml(point.timestamp.toISOString())}</small></div><div><strong>${escapeHtml(point.plantName || plant?.name || 'No plant')}</strong><small>${escapeHtml(point.deviceName || device?.name || 'All devices')}</small></div><div><strong>${escapeHtml(point.metricLabel)}</strong><small>${escapeHtml(point.metricKey)}${point.unit ? ` · ${escapeHtml(point.unit)}` : ''}</small></div><div><strong>${escapeHtml(formatValue(point.value, { key: point.metricKey, label: point.metricLabel, unit: point.unit, decimals: decimalsForUnit(point.unit) }))}</strong><small>${escapeHtml(selectedGranularity)} interval</small></div><div><span class="badge ${point.quality === 'Valid' ? 'success' : point.quality === 'Unknown' ? 'info' : 'warning'}">${point.quality}</span><small>${point.quality === 'Valid' ? 'Ready for analytics' : 'Review quality flag'}</small></div><div><strong>${escapeHtml(point.source)}</strong><small>Normalized Zentrid record</small></div></div>`).join('') : `<div class="empty-state"><strong>No telemetry records</strong><small>${loadState === 'error' ? escapeHtml(loadError) : 'The API returned no records for the selected filters.'}</small></div>`}
        </div>
      </section>
    `);
        wirePage(points);
    }
    function persistContext() {
        const plant = selectedPlant();
        const device = selectedDevice();
        localStorage.setItem('zentrid_telemetry_context', JSON.stringify({ plant: plant?.name || selectedPlantId, device: device?.name || 'All Devices', metric: selectedMetric().label, range: selectedRange, layer: 'Normalized' }));
    }
    function wirePage(points) {
        const plantSelect = document.getElementById('telemetryPlant');
        const deviceSelect = document.getElementById('telemetryDevice');
        const metricSelect = document.getElementById('telemetryMetric');
        const rangeSelect = document.getElementById('telemetryRange');
        const granularitySelect = document.getElementById('telemetryGranularity');
        plantSelect?.addEventListener('change', () => { selectedPlantId = plantSelect.value; selectedDeviceId = 'all'; persistContext(); renderPage(); });
        deviceSelect?.addEventListener('change', () => { selectedDeviceId = deviceSelect.value; persistContext(); renderPage(); });
        metricSelect?.addEventListener('change', () => { selectedMetricKey = metricSelect.value; persistContext(); renderPage(); });
        rangeSelect?.addEventListener('change', () => { selectedRange = rangeSelect.value; selectedGranularity = selectedRange === 'Last 30 days' ? 'Daily' : selectedRange === 'Last 7 days' ? 'Hourly' : '15 min'; persistContext(); renderPage(); });
        granularitySelect?.addEventListener('change', () => { selectedGranularity = granularitySelect.value; persistContext(); renderPage(); });
        document.getElementById('telemetryRefresh')?.addEventListener('click', () => { void loadTelemetry(true); });
        document.getElementById('telemetryExport')?.addEventListener('click', () => exportCsv(points));
        document.querySelector('.telemetry-samples-table-v143')?.addEventListener('click', event => {
            const target = event.target instanceof Element ? event.target.closest('[data-telemetry-sample]') : null;
            if (!target)
                return;
            FleetLayout.toast(`Telemetry sample ${target.dataset.telemetrySample || ''} selected.`);
        });
    }
    function exportCsv(points) {
        if (!points.length) {
            FleetLayout.toast('No API telemetry records are available for export.');
            return;
        }
        const plant = selectedPlant();
        const device = selectedDevice();
        const metric = selectedMetric();
        const lines = [
            ['timestamp', 'tenant', 'plant', 'device', 'metric', 'value', 'unit', 'quality', 'source', 'data_layer'].join(','),
            ...points.map(point => [point.timestamp.toISOString(), tenant, point.plantName || plant?.name || '', point.deviceName || device?.name || 'All devices', point.metricLabel || metric.label, point.value.toFixed(decimalsForUnit(point.unit)), point.unit, point.quality, point.source, 'Normalized'].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        ];
        const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `zentrid-telemetry-${metric.key || 'records'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        FleetLayout.toast('Telemetry CSV exported for the current tenant scope.');
    }
    async function loadTelemetry(forceRefresh = false) {
        loadState = 'loading';
        loadError = '';
        renderPage();
        const requestOptions = forceRefresh ? { cache: 'no-store', retry: true } : {};
        const [plantsResult, devicesResult, telemetryResult] = await Promise.allSettled([
            ZentridPlatformAPI.live.plants(requestOptions),
            ZentridPlatformAPI.live.devices(requestOptions),
            ZentridPlatformAPI.live.telemetry(requestOptions)
        ]);
        plants = plantsResult.status === 'fulfilled' ? normalizePlantRows(plantsResult.value) : [];
        allDevices = devicesResult.status === 'fulfilled' ? normalizeDeviceRows(devicesResult.value) : [];
        if (telemetryResult.status === 'rejected') {
            telemetryPoints = [];
            metricDefinitions = [];
            loadedAt = new Date();
            loadState = 'error';
            loadError = telemetryResult.reason instanceof Error ? telemetryResult.reason.message : String(telemetryResult.reason || 'Telemetry request failed.');
            restoreSelection();
            renderPage();
            return;
        }
        telemetryPoints = normalizeTelemetry(telemetryResult.value);
        mergeTelemetryEntities();
        rebuildMetricDefinitions();
        loadedAt = new Date();
        loadState = telemetryPoints.length ? 'live' : 'empty';
        restoreSelection();
        persistContext();
        renderPage();
        if (forceRefresh)
            FleetLayout.toast(telemetryPoints.length ? 'Telemetry data refreshed from API.' : 'The telemetry API returned no records.');
    }
    renderPage();
    void loadTelemetry();
})();
