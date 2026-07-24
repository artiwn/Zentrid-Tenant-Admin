export {};

type UnknownRecord = Record<string, unknown>;
type EnergyPeriod = 'Today' | 'Last 7 days' | 'Last 30 days' | 'Year to date';
type EnergyTab = 'overview' | 'clients' | 'plants' | 'flow' | 'day' | 'weekly' | 'monthly' | 'performance' | 'source' | 'activity';
type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type MetricKind = 'produced' | 'used' | 'batteryCharge' | 'batteryDischarge' | 'gridExport' | 'gridImport' | 'power' | 'performanceRatio' | 'availability' | 'revenue';
type MetricMode = 'interval' | 'daily' | 'counter' | 'snapshot';

type EnergyFlow = {
  produced: number | null;
  used: number | null;
  batteryCharge: number | null;
  batteryDischarge: number | null;
  gridExport: number | null;
  gridImport: number | null;
  revenue: number | null;
  currency: string;
};

type ApiClient = {
  id: string;
  name: string;
  type: string;
  status: string;
  raw: UnknownRecord;
};

type ApiPlant = {
  id: string;
  clientId: string;
  name: string;
  code: string;
  vendor: string;
  status: string;
  capacityMwp: number | null;
  powerMw: number | null;
  sourceSystem: string;
  quality: string;
  updatedAt: Date | null;
  raw: UnknownRecord;
};

type ApiDevice = {
  id: string;
  plantId: string;
  vendor: string;
  type: string;
  raw: UnknownRecord;
};

type EnergyMetricPoint = {
  timestamp: Date;
  plantId: string;
  plantName: string;
  deviceId: string;
  metricKey: string;
  metricLabel: string;
  kind: MetricKind;
  mode: MetricMode;
  value: number;
  quality: string;
  source: string;
};

type EnergyClient = EnergyFlow & {
  id: string;
  name: string;
  type: string;
  status: string;
  plants: number;
  capacityMwp: number | null;
  freshness: string;
};

type EnergyPlant = EnergyFlow & {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  code: string;
  vendor: string;
  status: string;
  capacityMwp: number | null;
  powerMw: number | null;
  freshness: string;
  dataQuality: string;
  battery: boolean;
  sourceSystem: string;
  performanceRatio: number | null;
  availability: number | null;
  specificYield: number | null;
  raw: UnknownRecord;
};

type ChartPoint = {
  label: string;
  produced: number | null;
  used: number | null;
  exportValue: number | null;
  battery: number | null;
};

(() => {
  const tenantName = String(FleetLayout.state.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace');
  let activeTab: EnergyTab = 'overview';
  let period: EnergyPeriod = 'Today';
  let selectedClientId = 'all';
  let selectedPlantId = 'all';
  let search = '';
  let loadState: LoadState = 'loading';
  let loadError = '';
  let lastUpdatedAt: Date | null = null;
  let apiClients: ApiClient[] = [];
  let apiPlants: ApiPlant[] = [];
  let apiDevices: ApiDevice[] = [];
  let telemetryPoints: EnergyMetricPoint[] = [];
  let energyPlants: EnergyPlant[] = [];
  let energyClients: EnergyClient[] = [];

  function text(value: unknown, fallback = '—'): string {
    const resolved = String(value ?? '').trim();
    return resolved || fallback;
  }

  function escapeHtml(value: unknown): string {
    return text(value, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function firstOf(row: UnknownRecord, keys: string[], fallback: unknown = ''): unknown {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return fallback;
  }

  function firstEntry(row: UnknownRecord, keys: string[]): { key: string; value: unknown } | null {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return { key, value };
    }
    return null;
  }

  function extractRows(payload: unknown, depth = 0): UnknownRecord[] {
    if (depth > 6) return [];
    if (Array.isArray(payload)) return payload.filter(isRecord);
    if (!isRecord(payload)) return [];
    for (const key of ['items', 'data', 'results', 'records', 'rows', 'plants', 'clients', 'devices', 'telemetry', 'samples', 'measurements']) {
      const candidate = payload[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
      if (isRecord(candidate)) {
        const nested = extractRows(candidate, depth + 1);
        if (nested.length) return nested;
      }
    }
    return [payload];
  }

  function normalize(value: unknown): string {
    return text(value, '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  }

  function identity(value: unknown): string {
    return normalize(value).replace(/_/g, '');
  }

  function numericValue(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value ?? '').trim().replace(/,/g, '');
    if (!raw) return null;
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseTimestamp(value: unknown): Date | null {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = new Date(value < 10_000_000_000 ? value * 1000 : value);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
    const raw = text(value, '');
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  function unitFrom(value: unknown, key = ''): string {
    const explicit = text(value, '').toLowerCase().replace(/\s+/g, '');
    if (explicit) return explicit;
    const normalizedKey = normalize(key);
    if (normalizedKey.endsWith('_gwh')) return 'gwh';
    if (normalizedKey.endsWith('_mwh')) return 'mwh';
    if (normalizedKey.endsWith('_kwh')) return 'kwh';
    if (normalizedKey.endsWith('_wh')) return 'wh';
    if (normalizedKey.endsWith('_mw')) return 'mw';
    if (normalizedKey.endsWith('_kw')) return 'kw';
    if (normalizedKey.endsWith('_w')) return 'w';
    if (normalizedKey.endsWith('_pct') || normalizedKey.endsWith('_percent')) return '%';
    return '';
  }

  function energyToMwh(value: unknown, unitValue: unknown, key = ''): number | null {
    const numeric = numericValue(value);
    if (numeric === null) return null;
    const unit = unitFrom(unitValue, key);
    if (unit.includes('gwh')) return numeric * 1000;
    if (unit.includes('mwh')) return numeric;
    if (unit.includes('kwh')) return numeric / 1000;
    if (/^wh$|watt.?hour/.test(unit)) return numeric / 1_000_000;
    return null;
  }

  function powerToMw(value: unknown, unitValue: unknown, key = ''): number | null {
    const numeric = numericValue(value);
    if (numeric === null) return null;
    const unit = unitFrom(unitValue, key);
    if (unit === 'mw' || unit.includes('megawatt')) return numeric;
    if (unit === 'kw' || unit.includes('kilowatt')) return numeric / 1000;
    if (unit === 'w' || unit.includes('watt')) return numeric / 1_000_000;
    const raw = text(value, '').toLowerCase();
    if (raw.includes('mwp') || raw.includes('mw')) return numeric;
    if (raw.includes('kwp') || raw.includes('kw')) return numeric / 1000;
    return null;
  }

  function percentValue(value: unknown): number | null {
    const numeric = numericValue(value);
    return numeric === null ? null : numeric;
  }

  function nullableSum(values: Array<number | null>): number | null {
    const available = values.filter((value): value is number => value !== null && Number.isFinite(value));
    return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
  }

  function nullableAverage(values: Array<number | null>): number | null {
    const available = values.filter((value): value is number => value !== null && Number.isFinite(value));
    return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
  }

  function normalizeQuality(value: unknown): string {
    const raw = text(value, '').toLowerCase();
    if (/(delay|stale|late|expired|missing)/.test(raw)) return 'Delayed';
    if (/(partial|estimate|interpolat|derived|calculated)/.test(raw)) return 'Partial';
    if (/(valid|fresh|good|ok|normal|verified|success)/.test(raw)) return 'Fresh';
    return raw ? text(value) : 'Unknown';
  }

  function freshness(timestamp: Date | null): string {
    if (!timestamp) return 'No timestamp';
    const minutes = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;
    return timestamp.toLocaleDateString();
  }

  function normalizeClients(payload: unknown): ApiClient[] {
    const map = new Map<string, ApiClient>();
    extractRows(payload).forEach(row => {
      const id = text(firstOf(row, ['id', 'clientId', 'client_id', 'externalId', 'code'], ''), '');
      const name = text(firstOf(row, ['name', 'clientName', 'client_name', 'displayName', 'legalName', 'title'], id), '');
      if (!id && !name) return;
      const resolvedId = id || name;
      map.set(resolvedId, {
        id: resolvedId,
        name: name || resolvedId,
        type: text(firstOf(row, ['type', 'clientType', 'entityType', 'category'], 'Client'), 'Client'),
        status: text(firstOf(row, ['status', 'state', 'lifecycleStatus'], 'Unknown'), 'Unknown'),
        raw: row
      });
    });
    return [...map.values()];
  }

  function normalizePlantRows(payload: unknown): ApiPlant[] {
    const rows: ApiPlant[] = [];
    extractRows(payload).forEach(row => {
      const id = text(firstOf(row, ['id', 'plantId', 'plant_id', 'externalId', 'code'], ''), '');
      const name = text(firstOf(row, ['name', 'plantName', 'plant_name', 'displayName', 'title'], id), '');
      if (!id && !name) return;
      const resolvedId = id || name;
      const capacityEntry = firstEntry(row, ['capacityDcMwp', 'capacityMwp', 'dcCapacityMw', 'installedCapacityMw', 'capacityDc', 'capacity']);
      const powerEntry = firstEntry(row, ['powerMw', 'currentPowerMw', 'activePowerMw', 'powerKw', 'currentPowerKw', 'activePowerKw', 'powerNow', 'currentPower', 'activePower']);
      rows.push({
        id: resolvedId,
        clientId: text(firstOf(row, ['clientId', 'client_id', 'ownerId', 'customerId'], ''), ''),
        name: name || resolvedId,
        code: text(firstOf(row, ['code', 'plantCode', 'plant_code', 'externalId'], resolvedId), resolvedId),
        vendor: text(firstOf(row, ['vendor', 'manufacturer', 'provider', 'sourceSystem'], ''), ''),
        status: text(firstOf(row, ['status', 'health', 'state', 'operationalStatus'], 'Unknown'), 'Unknown'),
        capacityMwp: capacityEntry ? powerToMw(capacityEntry.value, firstOf(row, ['capacityUnit', 'unit'], ''), capacityEntry.key) : null,
        powerMw: powerEntry ? powerToMw(powerEntry.value, firstOf(row, ['powerUnit', 'unit'], ''), powerEntry.key) : null,
        sourceSystem: text(firstOf(row, ['sourceSystem', 'source', 'provider', 'integration', 'vendor'], ''), ''),
        quality: normalizeQuality(firstOf(row, ['dataQuality', 'quality', 'telemetryQuality', 'freshnessStatus'], '')),
        updatedAt: parseTimestamp(firstOf(row, ['updatedAt', 'lastSeen', 'lastDataAt', 'timestamp', 'recordedAt'], '')),
        raw: row
      });
    });
    return rows;
  }

  function mergePlants(...groups: ApiPlant[][]): ApiPlant[] {
    const map = new Map<string, ApiPlant>();
    groups.flat().forEach(plant => {
      const key = identity(plant.id || plant.name);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, plant);
        return;
      }
      map.set(key, {
        ...existing,
        ...plant,
        id: plant.id || existing.id,
        clientId: plant.clientId || existing.clientId,
        name: plant.name || existing.name,
        code: plant.code || existing.code,
        vendor: plant.vendor || existing.vendor,
        status: plant.status === 'Unknown' ? existing.status : plant.status,
        capacityMwp: plant.capacityMwp ?? existing.capacityMwp,
        powerMw: plant.powerMw ?? existing.powerMw,
        sourceSystem: plant.sourceSystem || existing.sourceSystem,
        quality: plant.quality === 'Unknown' ? existing.quality : plant.quality,
        updatedAt: plant.updatedAt || existing.updatedAt,
        raw: { ...existing.raw, ...plant.raw }
      });
    });
    return [...map.values()];
  }

  function normalizeDevices(payload: unknown): ApiDevice[] {
    return extractRows(payload).flatMap(row => {
      const id = text(firstOf(row, ['id', 'deviceId', 'device_id', 'externalId', 'serialNumber', 'serial'], ''), '');
      if (!id) return [];
      return [{
        id,
        plantId: text(firstOf(row, ['plantId', 'plant_id', 'siteId', 'stationId'], ''), ''),
        vendor: text(firstOf(row, ['vendor', 'manufacturer', 'provider'], ''), ''),
        type: text(firstOf(row, ['type', 'deviceType', 'device_type', 'category'], ''), ''),
        raw: row
      }];
    });
  }

  function classifyMetric(keyValue: unknown, labelValue: unknown): MetricKind | null {
    const key = normalize(`${text(keyValue, '')} ${text(labelValue, '')}`);
    if (!key) return null;
    if (/(performance_ratio|\bpr\b)/.test(key)) return 'performanceRatio';
    if (/(availability|uptime)/.test(key)) return 'availability';
    if (/(revenue|income|estimated_value|commercial_value)/.test(key)) return 'revenue';
    if (/(current_power|active_power|ac_power|power_now|instant_power|^power$)/.test(key)) return 'power';
    if (/(battery.*discharg|discharg.*battery)/.test(key)) return 'batteryDischarge';
    if (/(battery.*charg|charg.*battery)/.test(key)) return 'batteryCharge';
    if (/(grid.*export|export.*grid|feed_in|feedin)/.test(key)) return 'gridExport';
    if (/(grid.*import|import.*grid|purchased_energy)/.test(key)) return 'gridImport';
    if (/(load_consum|consum.*energy|energy.*consum|used_energy|self_consum|load_energy)/.test(key)) return 'used';
    if (/(generat.*energy|energy.*generat|production_energy|energy_production|produced_energy|daily_yield|energy_today|interval_energy|^energy$)/.test(key)) return 'produced';
    return null;
  }

  function metricMode(keyValue: unknown, kind: MetricKind): MetricMode {
    if (kind === 'power' || kind === 'performanceRatio' || kind === 'availability' || kind === 'revenue') return 'snapshot';
    const key = normalize(keyValue);
    if (/(total|lifetime|counter|cumulative)/.test(key)) return 'counter';
    if (/(today|daily|day_yield)/.test(key)) return 'daily';
    return 'interval';
  }

  function metricNumericValue(kind: MetricKind, value: unknown, unit: unknown, key: string): number | null {
    if (kind === 'power') return powerToMw(value, unit, key);
    if (kind === 'performanceRatio' || kind === 'availability') return percentValue(value);
    if (kind === 'revenue') return numericValue(value);
    return energyToMwh(value, unit, key);
  }

  function normalizeTelemetry(payload: unknown): EnergyMetricPoint[] {
    const points: EnergyMetricPoint[] = [];
    const seen = new Set<string>();
    const knownWideKeys = [
      'generatedEnergyMwh', 'generatedEnergyKwh', 'generated_energy_mwh', 'generated_energy_kwh', 'productionEnergyMwh', 'productionEnergyKwh', 'energyTodayMwh', 'energyTodayKwh', 'energyToday', 'intervalEnergyMwh', 'intervalEnergyKwh',
      'loadConsumptionMwh', 'loadConsumptionKwh', 'consumedEnergyMwh', 'consumedEnergyKwh', 'usedEnergyMwh', 'usedEnergyKwh',
      'gridExportMwh', 'gridExportKwh', 'gridImportMwh', 'gridImportKwh',
      'batteryChargeMwh', 'batteryChargeKwh', 'batteryDischargeMwh', 'batteryDischargeKwh',
      'currentPowerMw', 'currentPowerKw', 'activePowerMw', 'activePowerKw', 'powerMw', 'powerKw',
      'performanceRatio', 'performanceRatioPct', 'availability', 'availabilityPct', 'revenue', 'estimatedRevenue'
    ];

    function addPoint(row: UnknownRecord, keyValue: unknown, labelValue: unknown, rawValue: unknown, unitValue: unknown): void {
      const timestamp = parseTimestamp(firstOf(row, ['timestamp', 'time', 'recordedAt', 'recordedAtUtc', 'measuredAt', 'measuredAtUtc', 'occurredAt', 'createdAt', 'updatedAt', 'lastSeen', 'lastDataAt'], ''));
      if (!timestamp) return;
      const metricKey = text(keyValue, '');
      const metricLabel = text(labelValue, metricKey);
      const kind = classifyMetric(metricKey, metricLabel);
      if (!kind) return;
      const value = metricNumericValue(kind, rawValue, unitValue, metricKey);
      if (value === null) return;
      const plantId = text(firstOf(row, ['plantId', 'plant_id', 'siteId', 'stationId'], ''), '');
      const plantName = text(firstOf(row, ['plantName', 'plant_name', 'siteName', 'stationName'], ''), '');
      const deviceId = text(firstOf(row, ['deviceId', 'device_id', 'assetId', 'equipmentId'], ''), '');
      const source = text(firstOf(row, ['source', 'sourceSystem', 'provider', 'vendor', 'integration'], '/api/telemetry'), '/api/telemetry');
      const quality = normalizeQuality(firstOf(row, ['quality', 'dataQuality', 'status', 'qualityFlag'], ''));
      const key = [timestamp.toISOString(), plantId, plantName, deviceId, normalize(metricKey), value].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      points.push({ timestamp, plantId, plantName, deviceId, metricKey, metricLabel, kind, mode: metricMode(metricKey, kind), value, quality, source });
    }

    extractRows(payload).forEach(row => {
      const metricKey = firstOf(row, ['metricKey', 'metric_key', 'metric', 'key', 'code', 'name', 'type'], '');
      const metricLabel = firstOf(row, ['metricLabel', 'metric_label', 'label', 'displayName', 'name'], metricKey);
      const value = firstOf(row, ['value', 'metricValue', 'numericValue', 'reading'], '');
      if (text(metricKey, '') && numericValue(value) !== null) addPoint(row, metricKey, metricLabel, value, firstOf(row, ['unit', 'uom', 'measurementUnit'], ''));

      const metrics = row.metrics;
      if (isRecord(metrics)) {
        Object.entries(metrics).forEach(([key, metricValue]) => {
          if (isRecord(metricValue)) addPoint({ ...row, ...metricValue }, key, firstOf(metricValue, ['label', 'name'], key), firstOf(metricValue, ['value', 'reading'], ''), firstOf(metricValue, ['unit', 'uom'], ''));
          else addPoint(row, key, key, metricValue, '');
        });
      }

      const normalizedEntries = new Map<string, [string, unknown]>();
      Object.entries(row).forEach(([key, entryValue]) => normalizedEntries.set(identity(key), [key, entryValue]));
      knownWideKeys.forEach(key => {
        const entry = normalizedEntries.get(identity(key));
        if (!entry) return;
        addPoint(row, entry[0], entry[0], entry[1], firstOf(row, [`${entry[0]}Unit`, 'unit', 'uom'], ''));
      });
    });
    return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  function periodStart(selected: EnergyPeriod): Date {
    const now = new Date();
    if (selected === 'Today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selected === 'Last 7 days') return new Date(now.getTime() - 7 * 86_400_000);
    if (selected === 'Last 30 days') return new Date(now.getTime() - 30 * 86_400_000);
    return new Date(now.getFullYear(), 0, 1);
  }

  function periodPoints(): EnergyMetricPoint[] {
    const start = periodStart(period).getTime();
    const end = Date.now();
    return telemetryPoints.filter(point => point.timestamp.getTime() >= start && point.timestamp.getTime() <= end);
  }

  function matchPointToPlant(point: EnergyMetricPoint, plant: ApiPlant): boolean {
    if (point.plantId && identity(point.plantId) === identity(plant.id)) return true;
    if (point.plantName && identity(point.plantName) === identity(plant.name)) return true;
    return false;
  }

  function aggregateMetric(points: EnergyMetricPoint[], kind: MetricKind): number | null {
    const kindPoints = points.filter(point => point.kind === kind);
    if (!kindPoints.length) return null;
    if (kind === 'power' || kind === 'performanceRatio' || kind === 'availability' || kind === 'revenue') return kindPoints[kindPoints.length - 1]?.value ?? null;
    const plantAggregate = kindPoints.filter(point => !point.deviceId);
    const selected = plantAggregate.length ? plantAggregate : kindPoints;
    const groups = new Map<string, EnergyMetricPoint[]>();
    selected.forEach(point => {
      const groupKey = `${point.deviceId || 'plant'}|${normalize(point.metricKey)}`;
      const group = groups.get(groupKey) || [];
      group.push(point);
      groups.set(groupKey, group);
    });
    const groupValues: number[] = [];
    groups.forEach(group => {
      group.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const mode = group[group.length - 1]?.mode || 'interval';
      if (mode === 'interval') {
        groupValues.push(group.reduce((sum, point) => sum + point.value, 0));
        return;
      }
      if (mode === 'daily') {
        const daily = new Map<string, number>();
        group.forEach(point => {
          const key = `${point.timestamp.getFullYear()}-${point.timestamp.getMonth()}-${point.timestamp.getDate()}`;
          daily.set(key, Math.max(daily.get(key) ?? 0, point.value));
        });
        groupValues.push([...daily.values()].reduce((sum, value) => sum + value, 0));
        return;
      }
      if (mode === 'counter' && group.length > 1) {
        const first = group[0]?.value ?? 0;
        const last = group[group.length - 1]?.value ?? first;
        if (last >= first) groupValues.push(last - first);
      }
    });
    return groupValues.length ? groupValues.reduce((sum, value) => sum + value, 0) : null;
  }

  function actualEnergyField(row: UnknownRecord, keys: string[]): number | null {
    for (const key of keys) {
      const raw = row[key];
      if (raw === undefined || raw === null || String(raw).trim() === '') continue;
      const value = energyToMwh(raw, row[`${key}Unit`], key);
      if (value !== null) return value;
    }
    return null;
  }

  function actualNumberField(row: UnknownRecord, keys: string[]): number | null {
    for (const key of keys) {
      const value = numericValue(row[key]);
      if (value !== null) return value;
    }
    return null;
  }

  function flowFromPlants(rows: EnergyPlant[]): EnergyFlow {
    return {
      produced: nullableSum(rows.map(row => row.produced)),
      used: nullableSum(rows.map(row => row.used)),
      batteryCharge: nullableSum(rows.map(row => row.batteryCharge)),
      batteryDischarge: nullableSum(rows.map(row => row.batteryDischarge)),
      gridExport: nullableSum(rows.map(row => row.gridExport)),
      gridImport: nullableSum(rows.map(row => row.gridImport)),
      revenue: nullableSum(rows.map(row => row.revenue)),
      currency: rows.find(row => row.currency)?.currency || '—'
    };
  }

  function rebuildEnergyModels(): void {
    const points = periodPoints();
    const clientById = new Map(apiClients.map(client => [identity(client.id), client]));
    energyPlants = apiPlants.map(plant => {
      const plantPoints = points.filter(point => matchPointToPlant(point, plant));
      const devices = apiDevices.filter(device => identity(device.plantId) === identity(plant.id));
      const latestPoint = plantPoints[plantPoints.length - 1] || null;
      const client = clientById.get(identity(plant.clientId));
      const producedFromTelemetry = aggregateMetric(plantPoints, 'produced');
      const producedFromPlant = period === 'Today' ? actualEnergyField(plant.raw, ['energyTodayMwh', 'energyTodayKwh', 'energyToday', 'todayEnergyMwh', 'todayEnergyKwh', 'today']) : null;
      const produced = producedFromTelemetry ?? producedFromPlant;
      const used = aggregateMetric(plantPoints, 'used') ?? actualEnergyField(plant.raw, ['loadConsumptionMwh', 'loadConsumptionKwh', 'usedEnergyMwh', 'usedEnergyKwh']);
      const batteryCharge = aggregateMetric(plantPoints, 'batteryCharge') ?? actualEnergyField(plant.raw, ['batteryChargeMwh', 'batteryChargeKwh']);
      const batteryDischarge = aggregateMetric(plantPoints, 'batteryDischarge') ?? actualEnergyField(plant.raw, ['batteryDischargeMwh', 'batteryDischargeKwh']);
      const gridExport = aggregateMetric(plantPoints, 'gridExport') ?? actualEnergyField(plant.raw, ['gridExportMwh', 'gridExportKwh']);
      const gridImport = aggregateMetric(plantPoints, 'gridImport') ?? actualEnergyField(plant.raw, ['gridImportMwh', 'gridImportKwh']);
      const currentPower = aggregateMetric(plantPoints, 'power') ?? plant.powerMw;
      const performanceRatio = aggregateMetric(plantPoints, 'performanceRatio') ?? actualNumberField(plant.raw, ['performanceRatio', 'performanceRatioPct', 'pr']);
      const availability = aggregateMetric(plantPoints, 'availability') ?? actualNumberField(plant.raw, ['availability', 'availabilityPct', 'uptimePct']);
      const revenue = aggregateMetric(plantPoints, 'revenue') ?? actualNumberField(plant.raw, ['revenue', 'estimatedRevenue', 'commercialValue']);
      const vendor = plant.vendor || devices.find(device => device.vendor)?.vendor || 'Unknown source';
      const battery = devices.some(device => /(battery|bess|storage|pcs)/i.test(device.type)) || plantPoints.some(point => point.kind === 'batteryCharge' || point.kind === 'batteryDischarge');
      const capacity = plant.capacityMwp;
      const specificYield = produced !== null && capacity !== null && capacity > 0 ? produced / capacity : null;
      const sourceSystem = latestPoint?.source || plant.sourceSystem || vendor;
      return {
        id: plant.id,
        clientId: plant.clientId,
        clientName: client?.name || text(firstOf(plant.raw, ['clientName', 'ownerName'], 'Unassigned'), 'Unassigned'),
        name: plant.name,
        code: plant.code,
        vendor,
        status: plant.status,
        capacityMwp: capacity,
        powerMw: currentPower,
        freshness: freshness(latestPoint?.timestamp || plant.updatedAt),
        dataQuality: latestPoint?.quality || plant.quality,
        battery,
        sourceSystem,
        performanceRatio,
        availability,
        specificYield,
        produced,
        used,
        batteryCharge,
        batteryDischarge,
        gridExport,
        gridImport,
        revenue,
        currency: text(firstOf(plant.raw, ['currency', 'revenueCurrency'], '—'), '—'),
        raw: plant.raw
      };
    });

    energyClients = apiClients.map(client => {
      const rows = energyPlants.filter(plant => identity(plant.clientId) === identity(client.id));
      const flow = flowFromPlants(rows);
      const latestTimestamp = points.filter(point => rows.some(plant => matchPointToPlant(point, apiPlants.find(item => item.id === plant.id) || { id: plant.id, name: plant.name } as ApiPlant))).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || null;
      return {
        id: client.id,
        name: client.name,
        type: client.type,
        status: client.status,
        plants: rows.length,
        capacityMwp: nullableSum(rows.map(row => row.capacityMwp)),
        freshness: freshness(latestTimestamp),
        ...flow
      };
    });
  }

  function currentPlants(): EnergyPlant[] {
    let rows = energyPlants;
    if (selectedClientId !== 'all') rows = rows.filter(plant => identity(plant.clientId) === identity(selectedClientId));
    if (selectedPlantId !== 'all') rows = rows.filter(plant => identity(plant.id) === identity(selectedPlantId));
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter(plant => [plant.name, plant.code, plant.vendor, plant.status, plant.clientName].join(' ').toLowerCase().includes(query));
    }
    return rows;
  }

  function currentClients(): EnergyClient[] {
    let rows = energyClients;
    if (selectedClientId !== 'all') rows = rows.filter(client => identity(client.id) === identity(selectedClientId));
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter(client => [client.name, client.type, client.status].join(' ').toLowerCase().includes(query));
    }
    return rows;
  }

  function formatEnergy(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} GWh`;
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} MWh`;
  }

  function formatPower(value: number | null): string {
    return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(2)} MW`;
  }

  function formatCapacity(value: number | null): string {
    return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(2)} MWp`;
  }

  function formatRevenue(value: number | null, currency = '—'): string {
    if (value === null || !Number.isFinite(value)) return '—';
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${Math.round(value).toLocaleString()}`;
  }

  function formatPercent(value: number | null): string {
    return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`;
  }

  function statusClass(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized.includes('fault') || normalized.includes('offline') || normalized.includes('stale') || normalized.includes('error')) return 'danger';
    if (normalized.includes('warning') || normalized.includes('review') || normalized.includes('maintenance') || normalized.includes('partial') || normalized.includes('delayed')) return 'warning';
    if (normalized.includes('unknown') || normalized.includes('no ')) return 'neutral';
    return 'success';
  }

  function option(value: string, label: string, selected: string): string {
    return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }

  function contextBar(flow: EnergyFlow, rows: EnergyPlant[]): string {
    const weightedPairs = rows.filter(plant => plant.performanceRatio !== null && plant.produced !== null);
    const weightedPr = weightedPairs.length
      ? weightedPairs.reduce((sum, plant) => sum + (plant.performanceRatio || 0) * (plant.produced || 0), 0) / Math.max(0.000001, weightedPairs.reduce((sum, plant) => sum + (plant.produced || 0), 0))
      : nullableAverage(rows.map(plant => plant.performanceRatio));
    return `<section class="context-bar glass-card production-context-bar energy-context-bar-v1431">
      <button class="ctx-item" type="button" data-energy-tab="overview"><span>Produced</span><strong>${formatEnergy(flow.produced)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="flow"><span>Used / Load</span><strong>${formatEnergy(flow.used)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="flow"><span>Grid Export</span><strong>${formatEnergy(flow.gridExport)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="flow"><span>Grid Import</span><strong>${formatEnergy(flow.gridImport)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="flow"><span>Battery Charge</span><strong>${formatEnergy(flow.batteryCharge)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="performance"><span>Performance Ratio</span><strong>${formatPercent(weightedPr)}</strong></button>
      <button class="ctx-item" type="button" data-energy-tab="overview"><span>Estimated Value</span><strong>${formatRevenue(flow.revenue, flow.currency)}</strong></button>
    </section>`;
  }

  function toolbar(): string {
    const clientOptions = [option('all', 'All Clients', selectedClientId), ...energyClients.map(client => option(client.id, client.name, selectedClientId))].join('');
    const availablePlants = selectedClientId === 'all' ? energyPlants : energyPlants.filter(plant => identity(plant.clientId) === identity(selectedClientId));
    const plantOptions = [option('all', 'All Plants', selectedPlantId), ...availablePlants.map(plant => option(plant.id, plant.name, selectedPlantId))].join('');
    return `<section class="panel glass-card energy-filter-panel-v1431">
      <div class="panel-head"><div><h2>Analytics Scope</h2><p>Filter the fixed tenant portfolio by client, plant and reporting period.</p></div><span class="badge info">Normalized layer</span></div>
      <div class="toolbar production-toolbar energy-toolbar-v1431">
        <input id="energySearch" value="${escapeHtml(search)}" placeholder="Search plant, client, code, vendor or status..." />
        <select id="energyClient">${clientOptions}</select>
        <select id="energyPlant">${plantOptions}</select>
        <select id="energyPeriod">${(['Today', 'Last 7 days', 'Last 30 days', 'Year to date'] as EnergyPeriod[]).map(value => option(value, value, period)).join('')}</select>
        <button class="secondary-action" type="button" id="energyReset">Reset</button>
      </div>
    </section>`;
  }

  function sideTabs(): string {
    const labels: Array<[EnergyTab, string]> = [
      ['overview', 'Overview'], ['clients', 'Clients'], ['plants', 'Plants'], ['flow', 'Energy Flow'], ['day', 'Day Chart'], ['weekly', 'Week Chart'], ['monthly', 'Month Chart'], ['performance', 'Performance'], ['source', 'Source Mapping'], ['activity', 'Activity']
    ];
    return `<aside class="glass-card plant-side-card-v17 production-side-v130 energy-side-v1431"><h3>Energy Analytics</h3>${labels.map(([key, label]) => `<button type="button" class="${activeTab === key ? 'active' : ''}" data-energy-tab="${key}" ${activeTab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</aside>`;
  }

  function selectedTelemetryPoints(plants: EnergyPlant[]): EnergyMetricPoint[] {
    const ids = new Set(plants.map(plant => identity(plant.id)));
    const names = new Set(plants.map(plant => identity(plant.name)));
    return periodPoints().filter(point => (point.plantId && ids.has(identity(point.plantId))) || (point.plantName && names.has(identity(point.plantName))));
  }

  function chartBucketKey(point: EnergyMetricPoint, mode: 'day' | 'weekly' | 'monthly'): string {
    const date = point.timestamp;
    if (mode === 'day') return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    if (mode === 'weekly') return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  function chartBucketLabel(point: EnergyMetricPoint, mode: 'day' | 'weekly' | 'monthly'): string {
    if (mode === 'day') return point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (mode === 'weekly') return point.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return point.timestamp.toLocaleDateString([], { month: 'short', year: '2-digit' });
  }

  function chartSeries(mode: 'day' | 'weekly' | 'monthly', plants: EnergyPlant[]): ChartPoint[] {
    const energyKinds: MetricKind[] = ['produced', 'used', 'gridExport', 'batteryCharge'];
    const points = selectedTelemetryPoints(plants).filter(point => energyKinds.includes(point.kind));
    const buckets = new Map<string, EnergyMetricPoint[]>();
    points.forEach(point => {
      const key = chartBucketKey(point, mode);
      const bucket = buckets.get(key) || [];
      bucket.push(point);
      buckets.set(key, bucket);
    });
    return [...buckets.values()]
      .sort((a, b) => (a[0]?.timestamp.getTime() || 0) - (b[0]?.timestamp.getTime() || 0))
      .slice(mode === 'day' ? -24 : mode === 'weekly' ? -14 : -12)
      .map(bucket => ({
        label: chartBucketLabel(bucket[0] as EnergyMetricPoint, mode),
        produced: aggregateMetric(bucket, 'produced'),
        used: aggregateMetric(bucket, 'used'),
        exportValue: aggregateMetric(bucket, 'gridExport'),
        battery: aggregateMetric(bucket, 'batteryCharge')
      }));
  }

  function pointsFor(values: Array<number | null>, max: number, width = 720, height = 250, padding = 32): string {
    const denominator = Math.max(1, values.length - 1);
    return values.map((value, index) => value === null ? '' : `${padding + index * (width - padding * 2) / denominator},${height - padding - value / max * (height - padding * 2)}`).filter(Boolean).join(' ');
  }

  function svgChart(mode: 'day' | 'weekly' | 'monthly', plants: EnergyPlant[]): string {
    const rows = chartSeries(mode, plants);
    if (!rows.length) return `<div class="production-chart-card energy-chart-card-v1431"><div class="production-chart-head"><div><h3>${mode === 'day' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly'} Energy Curve</h3><p class="muted">Produced, used, grid export and battery charge from API telemetry.</p></div><span class="badge neutral">${escapeHtml(period)}</span></div><div class="empty-state"><strong>No timestamped energy telemetry</strong><small>The API returned no chartable energy records for this scope.</small></div></div>`;
    const produced = rows.map(row => row.produced);
    const used = rows.map(row => row.used);
    const exported = rows.map(row => row.exportValue);
    const battery = rows.map(row => row.battery);
    const numeric = [...produced, ...used, ...exported, ...battery].filter((value): value is number => value !== null && Number.isFinite(value));
    const max = Math.max(...numeric, 1);
    const producedPoints = pointsFor(produced, max);
    return `<div class="production-chart-card energy-chart-card-v1431"><div class="production-chart-head"><div><h3>${mode === 'day' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly'} Energy Curve</h3><p class="muted">Produced, used, grid export and battery charge from API telemetry.</p></div><span class="badge neutral">${escapeHtml(period)}</span></div>
      <svg class="production-svg-chart" viewBox="0 0 720 250" role="img" aria-label="Energy analytics chart">
        <defs><linearGradient id="energyAnalyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(34,211,238,.28)"/><stop offset="1" stop-color="rgba(34,211,238,0)"/></linearGradient></defs>
        <g class="grid">${[0, 1, 2, 3].map(index => `<line x1="32" x2="688" y1="${32 + index * 62}" y2="${32 + index * 62}"/>`).join('')}</g>
        ${producedPoints ? `<polyline class="area energy-area-v1431" points="32,218 ${producedPoints} 688,218"/><polyline class="line produced" points="${producedPoints}"/>` : ''}
        ${pointsFor(used, max) ? `<polyline class="line used" points="${pointsFor(used, max)}"/>` : ''}
        ${pointsFor(exported, max) ? `<polyline class="line export" points="${pointsFor(exported, max)}"/>` : ''}
        ${pointsFor(battery, max) ? `<polyline class="line charge" points="${pointsFor(battery, max)}"/>` : ''}
        <g class="xlabels">${rows.map((row, index) => `<text x="${32 + index * 656 / Math.max(1, rows.length - 1)}" y="242">${escapeHtml(row.label)}</text>`).join('')}</g>
      </svg>
      <div class="production-chart-legend"><span class="produced">Produced</span><span class="used">Used / Load</span><span class="export">Grid Export</span><span class="charge">Battery Charge</span></div>
    </div>`;
  }

  function overview(flow: EnergyFlow, rows: EnergyPlant[]): string {
    const capacity = nullableSum(rows.map(plant => plant.capacityMwp));
    const power = nullableSum(rows.map(plant => plant.powerMw));
    const availability = nullableAverage(rows.map(plant => plant.availability));
    const specificYield = flow.produced !== null && capacity !== null && capacity > 0 ? flow.produced / capacity : null;
    return `<div class="section-title-v17"><div><h2>${escapeHtml(tenantName)} Energy Overview</h2><p class="muted">Tenant-level production, consumption, grid flow, storage and commercial value.</p></div><span class="badge ${loadState === 'ready' ? 'success' : loadState === 'error' ? 'danger' : 'neutral'}">${rows.length} plant${rows.length === 1 ? '' : 's'}</span></div>
      <section class="module-grid production-kpis-v130 energy-kpis-v1431">
        <article class="module-card"><span>Current Power</span><strong>${formatPower(power)}</strong><small>Latest API aggregate</small></article>
        <article class="module-card"><span>Installed Capacity</span><strong>${formatCapacity(capacity)}</strong><small>API plant registry capacity</small></article>
        <article class="module-card"><span>Specific Yield</span><strong>${specificYield === null ? '—' : `${specificYield.toFixed(3)} MWh/MWp`}</strong><small>Calculated from available API values</small></article>
        <article class="module-card"><span>Availability</span><strong>${formatPercent(availability)}</strong><small>Latest reported availability</small></article>
      </section>
      <section class="production-split-v130 energy-overview-grid-v1431">
        <article class="glass-card production-flow-card-v130">${svgChart('day', rows)}</article>
        <article class="glass-card energy-balance-card-v1431"><div class="section-title-v17 mini"><div><h3>Energy Balance</h3><p class="muted">How reported energy moved through the tenant portfolio.</p></div></div>${flowBreakdown(flow)}</article>
      </section>
      <div class="section-title-v17 mini"><div><h3>Plant Production Comparison</h3><p class="muted">Ranked by reported produced energy in the current filter scope.</p></div></div>${comparisonCards(rows)}`;
  }

  function comparisonCards(rows: EnergyPlant[]): string {
    const available = rows.filter(plant => plant.produced !== null).sort((a, b) => (b.produced || 0) - (a.produced || 0));
    const max = Math.max(...available.map(plant => plant.produced || 0), 1);
    if (!available.length) return `<div class="empty-state"><strong>No production values available</strong><small>The API returned no produced-energy metric for the current filters.</small></div>`;
    return `<div class="production-comparison-grid">${available.map(plant => `<button type="button" class="production-comparison-card" data-energy-plant="${escapeHtml(plant.id)}"><span>${escapeHtml(plant.name)}</span><strong>${formatEnergy(plant.produced)}</strong><div><b data-energy-width="${Math.round(Math.max(3, (plant.produced || 0) / max * 100))}"></b></div></button>`).join('')}</div>`;
  }

  function flowBreakdown(flow: EnergyFlow): string {
    const values: Array<[string, number | null]> = [
      ['Produced', flow.produced], ['Used / Load', flow.used], ['Battery Charge', flow.batteryCharge], ['Battery Discharge', flow.batteryDischarge], ['Grid Export', flow.gridExport], ['Grid Import', flow.gridImport]
    ];
    const available = values.map(([, value]) => value).filter((value): value is number => value !== null);
    const max = Math.max(...available, 1);
    return `<div class="production-flow-breakdown">${values.map(([label, value]) => `<div class="production-flow-item"><span>${label}</span><div><b data-energy-width="${value === null ? 0 : Math.round(Math.max(3, value / max * 100))}"></b></div><strong>${formatEnergy(value)}</strong></div>`).join('')}</div>`;
  }

  function clientsTable(rows: EnergyClient[]): string {
    if (!rows.length) return `<div class="empty-state"><strong>No clients match the current filters</strong><small>${loadState === 'error' ? escapeHtml(loadError) : 'The API returned no client records for this scope.'}</small></div>`;
    return `<div class="data-table production-client-table energy-client-table-v1431"><div class="data-head"><span>Client</span><span>Type / Status</span><span>Produced / Used</span><span>Grid</span><span>Battery</span><span>Value</span><span>Actions</span></div>${rows.map(client => `<div class="data-row clickable-row" data-energy-client="${escapeHtml(client.id)}"><div><strong>${escapeHtml(client.name)}</strong><small>${escapeHtml(client.id)} · ${client.plants} plant(s)</small></div><div><span class="badge ${statusClass(client.status)}">${escapeHtml(client.status)}</span><small>${escapeHtml(client.type)} · ${formatCapacity(client.capacityMwp)}</small></div><div><strong>${formatEnergy(client.produced)}</strong><small>Used ${formatEnergy(client.used)}</small></div><div><strong>${formatEnergy(client.gridExport)}</strong><small>Import ${formatEnergy(client.gridImport)}</small></div><div><strong>${formatEnergy(client.batteryCharge)}</strong><small>Discharge ${formatEnergy(client.batteryDischarge)}</small></div><div><strong>${formatRevenue(client.revenue, client.currency)}</strong><small>${escapeHtml(client.freshness)}</small></div><div class="row-actions single-action"><button type="button" class="small-btn single-row-action" data-energy-open-client="${escapeHtml(client.id)}">Open</button></div></div>`).join('')}</div>`;
  }

  function plantsTable(rows: EnergyPlant[]): string {
    if (!rows.length) return `<div class="empty-state"><strong>No plants match the current filters</strong><small>${loadState === 'error' ? escapeHtml(loadError) : 'The API returned no plant records for this scope.'}</small></div>`;
    return `<div class="data-table production-plant-table energy-plant-table-v1431"><div class="data-head"><span>Plant</span><span>Source</span><span>Produced / Used</span><span>Grid</span><span>Battery</span><span>Status</span><span>Performance</span><span>Actions</span></div>${rows.map(plant => `<div class="data-row clickable-row" data-energy-plant="${escapeHtml(plant.id)}"><div><strong>${escapeHtml(plant.name)}</strong><small>${escapeHtml(plant.code)} · ${escapeHtml(plant.clientName)}</small></div><div><strong>${escapeHtml(plant.vendor)}</strong><small>${escapeHtml(plant.sourceSystem)}</small></div><div><strong>${formatEnergy(plant.produced)}</strong><small>Used ${formatEnergy(plant.used)} · ${formatCapacity(plant.capacityMwp)}</small></div><div><strong>${formatEnergy(plant.gridExport)}</strong><small>Import ${formatEnergy(plant.gridImport)}</small></div><div><strong>${formatEnergy(plant.batteryCharge)}</strong><small>${plant.battery ? `Discharge ${formatEnergy(plant.batteryDischarge)}` : 'No storage data'}</small></div><div><span class="badge ${statusClass(plant.status)}">${escapeHtml(plant.status)}</span><small>${escapeHtml(plant.dataQuality)} · ${escapeHtml(plant.freshness)}</small></div><div><strong>PR ${formatPercent(plant.performanceRatio)}</strong><small>Availability ${formatPercent(plant.availability)}</small></div><div class="row-actions kebabified production-actions-cell"><div class="kebab-wrap global-action-wrap"><button type="button" class="kebab-btn" data-action="menu" aria-label="Open actions" title="Actions">⋮</button><div class="kebab-menu global-action-menu"><button type="button" data-energy-open-plant="${escapeHtml(plant.id)}">Open Plant Detail</button><button type="button" data-energy-open-telemetry="${escapeHtml(plant.id)}">Open Telemetry</button><button type="button" data-energy-focus-plant="${escapeHtml(plant.id)}">Analyze Only This Plant</button></div></div></div></div>`).join('')}</div>`;
  }

  function chartTable(mode: 'day' | 'weekly' | 'monthly', plants: EnergyPlant[]): string {
    const rows = chartSeries(mode, plants);
    if (!rows.length) return `${svgChart(mode, plants)}<div class="data-table production-table-v130 energy-chart-table-v1431"><div class="data-head"><span>${mode === 'day' ? 'Time' : mode === 'weekly' ? 'Day' : 'Month'}</span><span>Produced</span><span>Used</span><span>Battery Charge</span><span>Grid Export</span><span>Estimated Value</span></div><div class="empty-state"><strong>No API chart intervals</strong><small>No timestamped energy metrics are available for this scope.</small></div></div>`;
    return `${svgChart(mode, plants)}<div class="data-table production-table-v130 energy-chart-table-v1431"><div class="data-head"><span>${mode === 'day' ? 'Time' : mode === 'weekly' ? 'Day' : 'Month'}</span><span>Produced</span><span>Used</span><span>Battery Charge</span><span>Grid Export</span><span>Estimated Value</span></div>${rows.map(row => `<div class="data-row"><div><strong>${escapeHtml(row.label)}</strong><small>API telemetry interval</small></div><div><strong>${formatEnergy(row.produced)}</strong></div><div><strong>${formatEnergy(row.used)}</strong></div><div><strong>${formatEnergy(row.battery)}</strong></div><div><strong>${formatEnergy(row.exportValue)}</strong></div><div><span class="badge neutral">—</span></div></div>`).join('')}</div>`;
  }

  function performanceTable(rows: EnergyPlant[]): string {
    if (!rows.length) return `<div class="empty-state"><strong>No plant performance records</strong><small>The API returned no plants for this scope.</small></div>`;
    const sorted = [...rows].sort((a, b) => (b.performanceRatio ?? -1) - (a.performanceRatio ?? -1));
    return `<div class="section-title-v17"><div><h2>Plant Performance</h2><p class="muted">Specific yield, performance ratio, availability and data quality.</p></div></div><div class="data-table energy-performance-table-v1431"><div class="data-head"><span>Plant</span><span>Specific Yield</span><span>Performance Ratio</span><span>Availability</span><span>Data Quality</span><span>State</span></div>${sorted.map(plant => `<div class="data-row" data-energy-plant="${escapeHtml(plant.id)}"><div><strong>${escapeHtml(plant.name)}</strong><small>${escapeHtml(plant.code)} · ${formatCapacity(plant.capacityMwp)}</small></div><div><strong>${plant.specificYield === null ? '—' : `${plant.specificYield.toFixed(3)} MWh/MWp`}</strong><small>Calculated from API values</small></div><div><strong>${formatPercent(plant.performanceRatio)}</strong><small>Latest reported value</small></div><div><strong>${formatPercent(plant.availability)}</strong><small>Latest reported value</small></div><div><span class="badge ${statusClass(plant.dataQuality)}">${escapeHtml(plant.dataQuality)}</span><small>${escapeHtml(plant.freshness)}</small></div><div><span class="badge ${statusClass(plant.status)}">${escapeHtml(plant.status)}</span></div></div>`).join('')}</div>`;
  }

  function canonicalField(kind: MetricKind): string {
    const fields: Record<MetricKind, string> = {
      produced: 'generated_energy_mwh', used: 'load_consumption_mwh', batteryCharge: 'battery_charge_mwh', batteryDischarge: 'battery_discharge_mwh', gridExport: 'grid_export_mwh', gridImport: 'grid_import_mwh', power: 'current_power_mw', performanceRatio: 'performance_ratio_pct', availability: 'availability_pct', revenue: 'revenue'
    };
    return fields[kind];
  }

  function sourceTable(rows: EnergyPlant[]): string {
    const points = selectedTelemetryPoints(rows);
    const unique = [...new Map(points.map(point => [`${point.source}|${point.metricKey}|${point.kind}`, point])).values()];
    if (!unique.length) return `<div class="section-title-v17"><div><h2>Source Mapping</h2><p class="muted">Read-only lineage from vendor fields to Zentrid canonical energy metrics.</p></div><span class="badge info">Read-only</span></div><div class="empty-state"><strong>No energy mapping records</strong><small>The telemetry API returned no recognized energy fields for this scope.</small></div>`;
    return `<div class="section-title-v17"><div><h2>Source Mapping</h2><p class="muted">Read-only lineage from vendor fields to Zentrid canonical energy metrics.</p></div><span class="badge info">Read-only</span></div><div class="data-table compact-table production-mapping-preview-table"><div class="data-head"><span>Vendor / Metric</span><span>Zentrid Field</span><span>Mapping Area</span><span>Status</span></div>${unique.map(point => `<div class="data-row"><div><strong>${escapeHtml(point.metricLabel || point.metricKey)}</strong><small>${escapeHtml(point.source)}</small></div><div><strong>${escapeHtml(canonicalField(point.kind))}</strong></div><div><small>Telemetry API normalization</small></div><div><span class="badge success">Available</span></div></div>`).join('')}</div>`;
  }

  function activityTable(): string {
    return `<div class="section-title-v17"><div><h2>Analytics Activity</h2><p class="muted">Recent refresh, aggregation and export events inside the tenant scope.</p></div></div><div class="data-table compact-table production-activity-table"><div class="data-head"><span>Time</span><span>Event</span><span>Source</span><span>Status</span></div><div class="empty-state"><strong>No analytics activity endpoint</strong><small>The current API does not provide activity records, so no local events are generated.</small></div></div>`;
  }

  function ratio(numerator: number | null, denominator: number | null): number | null {
    return numerator !== null && denominator !== null && denominator !== 0 ? numerator / denominator * 100 : null;
  }

  function subtract(left: number | null, right: number | null): number | null {
    return left !== null && right !== null ? left - right : null;
  }

  function tabContent(flow: EnergyFlow, plants: EnergyPlant[], clients: EnergyClient[]): string {
    if (loadState === 'loading' && !apiPlants.length) return `<div class="empty-state"><strong>Loading energy data</strong><small>Reading plants, clients, devices and telemetry from the API.</small></div>`;
    if (loadState === 'error' && !apiPlants.length && !telemetryPoints.length) return `<div class="empty-state"><strong>Energy API unavailable</strong><small>${escapeHtml(loadError)}</small></div>`;
    if (activeTab === 'clients') return `<div class="section-title-v17"><div><h2>Client Energy Portfolio</h2><p class="muted">Energy allocation grouped by API client and plant relations.</p></div></div>${clientsTable(clients)}`;
    if (activeTab === 'plants') return `<div class="section-title-v17"><div><h2>Plant Energy Portfolio</h2><p class="muted">Plant-level production, source, grid, storage and performance.</p></div></div>${plantsTable(plants)}`;
    if (activeTab === 'flow') return `<div class="section-title-v17"><div><h2>Energy Flow</h2><p class="muted">Bidirectional production, load, battery and grid movement reported by API.</p></div></div>${flowBreakdown(flow)}<div class="info-grid production-detail-grid"><div><span>Self-consumption Ratio</span><strong>${formatPercent(ratio(flow.used, flow.produced))}</strong><small>Reported used energy divided by produced energy</small></div><div><span>Export Ratio</span><strong>${formatPercent(ratio(flow.gridExport, flow.produced))}</strong><small>Reported export divided by produced energy</small></div><div><span>Storage Capture</span><strong>${formatPercent(ratio(flow.batteryCharge, flow.produced))}</strong><small>Reported battery charge divided by produced energy</small></div><div><span>Net Grid Position</span><strong>${formatEnergy(subtract(flow.gridExport, flow.gridImport))}</strong><small>Export minus import when both values exist</small></div></div>`;
    if (activeTab === 'day') return chartTable('day', plants);
    if (activeTab === 'weekly') return chartTable('weekly', plants);
    if (activeTab === 'monthly') return chartTable('monthly', plants);
    if (activeTab === 'performance') return performanceTable(plants);
    if (activeTab === 'source') return sourceTable(plants);
    if (activeTab === 'activity') return activityTable();
    return overview(flow, plants);
  }

  function renderPage(): void {
    rebuildEnergyModels();
    const plants = currentPlants();
    const clients = currentClients().filter(client => plants.some(plant => identity(plant.clientId) === identity(client.id)) || selectedPlantId === 'all');
    const flow = flowFromPlants(plants);
    const updatedText = lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : loadState === 'loading' ? 'Loading API data' : 'No successful API update';
    FleetLayout.mount(`<div class="production-page energy-analytics-page-v1431">
      <section class="page-hero"><div><p class="eyebrow">Tenant Admin · Business & Operations</p><h1>Energy Analytics</h1><p class="muted">Production, consumption, storage, grid flow and performance analytics for the fixed tenant portfolio.</p></div><div class="hero-actions"><button class="secondary-action" type="button" id="energyExport" data-permission-action="export" data-permission-resource="energy">Export CSV</button><button class="freshness-card" type="button" id="energyRefresh"><span class="pulse"></span><div><strong>Tenant energy snapshot</strong><small>${escapeHtml(updatedText)} · ${energyPlants.length} plant source(s)</small></div></button></div></section>
      <div class="production-breadcrumb"><button type="button" data-energy-tab="overview">Energy Analytics</button><span>›</span><button type="button" data-energy-tab="${activeTab}">${escapeHtml(activeTab === 'overview' ? 'Tenant Portfolio' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1))}</button></div>
      ${contextBar(flow, plants)}
      ${toolbar()}
      <section class="plant-workspace-v17 production-detail-workspace energy-workspace-v1431">${sideTabs()}<section class="glass-card plant-main-card-v17 production-detail-main energy-main-v1431"><div id="energyAnalyticsContent">${tabContent(flow, plants, clients)}</div></section></section>
    </div>`);
    applyWidths();
    wirePage(plants);
    FleetLayout.enhanceActionMenus?.(document);
  }

  function applyWidths(): void {
    document.querySelectorAll<HTMLElement>('[data-energy-width]').forEach(element => {
      const value = Math.max(0, Math.min(100, Number(element.dataset.energyWidth || 0)));
      element.style.width = `${value}%`;
    });
  }

  function navigatePlant(id: string): void {
    if (!energyPlants.some(plant => plant.id === id)) return;
    window.location.href = `${FleetLayout.pathFor('plant-detail')}?id=${encodeURIComponent(id)}`;
  }

  function navigateClient(id: string): void {
    if (!apiClients.some(client => client.id === id)) return;
    window.location.href = `${FleetLayout.pathFor('client-detail')}?id=${encodeURIComponent(id)}`;
  }

  function navigateTelemetry(id: string): void {
    const plant = energyPlants.find(item => item.id === id);
    if (!plant) return;
    localStorage.setItem('zentrid_telemetry_context', JSON.stringify({ plant: plant.name, device: 'All Devices', metric: 'Interval Energy', range: period, layer: 'Normalized' }));
    window.location.href = FleetLayout.pathFor('telemetry');
  }

  function csvValue(value: number | null): string {
    return value === null ? '' : value.toFixed(6);
  }

  function exportCsv(plants: EnergyPlant[]): void {
    if (!plants.length) {
      FleetLayout.toast('No API plant records are available for export.');
      return;
    }
    const lines = [
      ['tenant', 'period', 'client', 'plant_id', 'plant', 'produced_mwh', 'used_mwh', 'battery_charge_mwh', 'battery_discharge_mwh', 'grid_export_mwh', 'grid_import_mwh', 'performance_ratio', 'availability', 'reported_value', 'currency', 'source'].join(','),
      ...plants.map(plant => [tenantName, period, plant.clientName, plant.id, plant.name, csvValue(plant.produced), csvValue(plant.used), csvValue(plant.batteryCharge), csvValue(plant.batteryDischarge), csvValue(plant.gridExport), csvValue(plant.gridImport), csvValue(plant.performanceRatio), csvValue(plant.availability), csvValue(plant.revenue), plant.currency, plant.sourceSystem].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zentrid-energy-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    FleetLayout.toast('Energy Analytics CSV exported from API data.');
  }

  function wirePage(plants: EnergyPlant[]): void {
    document.querySelectorAll<HTMLElement>('[data-energy-tab]').forEach(button => button.addEventListener('click', () => {
      activeTab = (button.dataset.energyTab || 'overview') as EnergyTab;
      renderPage();
    }));
    const searchInput = document.getElementById('energySearch') as HTMLInputElement | null;
    searchInput?.addEventListener('change', () => { search = searchInput.value; renderPage(); });
    searchInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { search = searchInput.value; renderPage(); } });
    const clientSelect = document.getElementById('energyClient') as HTMLSelectElement | null;
    clientSelect?.addEventListener('change', () => { selectedClientId = clientSelect.value; selectedPlantId = 'all'; renderPage(); });
    const plantSelect = document.getElementById('energyPlant') as HTMLSelectElement | null;
    plantSelect?.addEventListener('change', () => { selectedPlantId = plantSelect.value; renderPage(); });
    const periodSelect = document.getElementById('energyPeriod') as HTMLSelectElement | null;
    periodSelect?.addEventListener('change', () => { period = periodSelect.value as EnergyPeriod; renderPage(); });
    document.getElementById('energyReset')?.addEventListener('click', () => { search = ''; selectedClientId = 'all'; selectedPlantId = 'all'; period = 'Today'; activeTab = 'overview'; renderPage(); });
    document.getElementById('energyRefresh')?.addEventListener('click', () => { void loadEnergyData(true); });
    document.getElementById('energyExport')?.addEventListener('click', () => exportCsv(plants));
    document.querySelector('.energy-analytics-page-v1431')?.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-energy-open-plant],[data-energy-open-client],[data-energy-open-telemetry],[data-energy-focus-plant],[data-energy-plant],[data-energy-client]') : null;
      if (!target) return;
      const openPlant = target.dataset.energyOpenPlant;
      const openClient = target.dataset.energyOpenClient;
      const openTelemetry = target.dataset.energyOpenTelemetry;
      const focusPlant = target.dataset.energyFocusPlant;
      if (openPlant) { event.stopPropagation(); navigatePlant(openPlant); return; }
      if (openClient) { event.stopPropagation(); navigateClient(openClient); return; }
      if (openTelemetry) { event.stopPropagation(); navigateTelemetry(openTelemetry); return; }
      if (focusPlant) { event.stopPropagation(); selectedPlantId = focusPlant; activeTab = 'overview'; renderPage(); return; }
      if (target.dataset.energyPlant && !target.closest('.kebab-menu')) { selectedPlantId = target.dataset.energyPlant; activeTab = 'overview'; renderPage(); return; }
      if (target.dataset.energyClient) { selectedClientId = target.dataset.energyClient; selectedPlantId = 'all'; activeTab = 'overview'; renderPage(); }
    });
  }

  async function loadEnergyData(force = false): Promise<void> {
    loadState = 'loading';
    loadError = '';
    if (!lastUpdatedAt) renderPage();
    const requestOptions: ZentridRequestOptions = force ? { cache: 'no-store' } : {};
    const results = await Promise.allSettled([
      ZentridPlatformAPI.clients.list(),
      ZentridPlatformAPI.live.plants(requestOptions),
      ZentridPlatformAPI.plantRegistry.list(),
      ZentridPlatformAPI.live.devices(requestOptions),
      ZentridPlatformAPI.live.telemetry(requestOptions)
    ]);
    const failures: string[] = [];
    const valueAt = (index: number): unknown => {
      const result = results[index];
      if (result?.status === 'fulfilled') return result.value;
      if (result?.status === 'rejected') failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      return null;
    };
    const clientPayload = valueAt(0);
    const livePlantPayload = valueAt(1);
    const adminPlantPayload = valueAt(2);
    const devicePayload = valueAt(3);
    const telemetryPayload = valueAt(4);
    apiClients = normalizeClients(clientPayload);
    apiPlants = mergePlants(normalizePlantRows(adminPlantPayload), normalizePlantRows(livePlantPayload));
    apiDevices = normalizeDevices(devicePayload);
    telemetryPoints = normalizeTelemetry(telemetryPayload);
    lastUpdatedAt = failures.length === results.length ? null : new Date();
    loadError = [...new Set(failures)].join(' · ');
    loadState = failures.length === results.length ? 'error' : apiPlants.length || telemetryPoints.length ? 'ready' : 'empty';
    renderPage();
    if (force) FleetLayout.toast(loadState === 'error' ? 'Energy Analytics API refresh failed.' : 'Energy Analytics refreshed from API data.');
  }

  renderPage();
  void loadEnergyData();
})();
