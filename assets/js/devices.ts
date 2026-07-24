type ZentridDeviceStatusTone = "success" | "warning" | "danger" | "info" | "neutral" | string;

interface ZentridDeviceRecord {
  [key: string]: string | number | boolean | null | undefined;
  id: string;
  externalId?: string;
  name: string;
  type: string;
  subtype?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  serialNumber?: string;
  firmware?: string;
  protocol?: string;
  ip?: string;
  mac?: string;
  plantId?: string;
  plant?: string;
  tenant?: string;
  vendor?: string;
  integration?: string;
  status?: string;
  lifecycle?: string;
  capacity?: string;
  installation?: string;
  installDate?: string;
  warranty?: string;
  lastSeen?: string;
  alerts?: number | string;
  power?: string;
  voltage?: string;
  current?: string;
  temperature?: string;
  pr?: string;
  sourceStatus?: string;
  parent?: string;
  children?: string;
  location?: string;
}

interface ZentridDevicePagerState {
  page: number;
  size: number;
}

interface ZentridDevicePageSlice<T> {
  total: number;
  pages: number;
  page: number;
  start: number;
  end: number;
  rows: T[];
}

type ZentridDeviceCardItem = unknown[];
type ZentridDeviceTab = "overview" | "master" | "topology" | "telemetry" | "source" | "operating" | "configuration" | "alerts" | "control" | string | undefined;

interface ZentridDevicePrimaryMetric {
  label: string;
  value: unknown;
  hint: string;
}

function currentDeviceTenantScope(): string {
  return String(FleetLayout?.state?.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace').trim() || 'Tenant workspace';
}
function normalizedDeviceTenantToken(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function deviceBelongsToTenant(device: ZentridDeviceRecord, tenantName = currentDeviceTenantScope()): boolean {
  if (!device.tenant) return true;
  return normalizedDeviceTenantToken(device.tenant) === normalizedDeviceTenantToken(tenantName);
}
function normalizeDeviceTenant(device: ZentridDeviceRecord, tenantName = currentDeviceTenantScope()): ZentridDeviceRecord {
  const sourceLabel = String(device.integration || device.vendor || 'Vendor source').replace(/^.*?\s—\s/, '');
  return { ...device, tenant: tenantName, integration: `${tenantName} — ${sourceLabel}` };
}
function deviceStatusCls(v: unknown): ZentridDeviceStatusTone { const text = String(v).toLowerCase(); if(text.includes('offline')||text.includes('fault')) return 'danger'; if(text.includes('warning')||text.includes('delayed')) return 'warning'; return 'success'; }
function deviceStatusPill(d: ZentridDeviceRecord): string { return `<span class="badge ${deviceStatusCls(d.status)}">${d.status || 'Unknown'}</span>`; }
function deviceRegistryRecords(): ZentridDeviceRecord[] {
  const tenantName = currentDeviceTenantScope();
  const liveRows = Array.isArray(window.ZentridLiveDevices) ? window.ZentridLiveDevices as ZentridDeviceRecord[] : [];
  if (!liveRows.length) return [];
  const hasTenantMetadata = liveRows.some(row => Boolean(row.tenant));
  const matchedLive = hasTenantMetadata ? liveRows.filter(row => deviceBelongsToTenant(row, tenantName)) : liveRows;
  const scopedLive = hasTenantMetadata && matchedLive.length ? matchedLive : liveRows;
  return scopedLive.map(row => normalizeDeviceTenant(row, tenantName));
}
function selectedDevice(): ZentridDeviceRecord | null {
  const list = deviceRegistryRecords();
  const selectedId = new URLSearchParams(location.search).get('id') || localStorage.getItem('zentrid_selected_device') || '';
  if (!selectedId) return list[0] || null;
  const token = String(selectedId).trim().toLowerCase();
  return list.find(device => [device.id, device.externalId, device.serial, device.serialNumber].some(value => String(value || '').trim().toLowerCase() === token)) || null;
}
function wireDevices(): void {
  const table = document.getElementById('deviceTable') as HTMLElement;
  const search = document.getElementById('deviceSearch') as HTMLInputElement;
  const type = document.getElementById('deviceTypeFilter') as HTMLSelectElement;
  const status = document.getElementById('deviceStatusFilter') as HTMLSelectElement;
  const plantFilter=()=>localStorage.getItem('zentrid_device_filter_plant') || '';
  function baseList(){ const pf=plantFilter(); return pf ? deviceRegistryRecords().filter(d=>d.plantId===pf) : deviceRegistryRecords(); }
  function apply(resetPage = true){
    if (resetPage && !window.FleetRegistryQuery?.pagination('devices')) ZentridDevicePager.page = 1;
    const q=(search.value||'').toLowerCase();
    let list=baseList().filter(d=>[d.name,d.id,d.serial,d.plant,d.tenant,d.vendor,d.type,d.status,d.model].join(' ').toLowerCase().includes(q));
    if(type.value!=='All Types') list=list.filter(d=>d.type===type.value);
    if(status.value!=='All Statuses') list=list.filter(d=>d.status===status.value);
    FleetRuntimeStability.replaceHtml(table, deviceRows(list));
    window.FleetRegistryQuery?.update('devices', { search: q || null, deviceType: type.value === 'All Types' ? null : type.value, deviceStatus: status.value === 'All Statuses' ? null : status.value }, { replace: true, emit: false });
    const scope = document.getElementById('deviceFilterScopeV126');
    if (scope) scope.innerHTML = window.FleetRegistryQuery?.filterScopeHtml('devices') || '';
    bindRows();
  }
  function bindRows(){ table.querySelectorAll('.data-row').forEach(row=> row.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{ const id=row.dataset.id; const d=deviceRegistryRecords().find(x=>x.id===id); if(btn.dataset.action==='open' && id){ localStorage.setItem('zentrid_selected_device', id); location.href=FleetLayout.pathFor('device-detail'); } if(btn.dataset.action==='plant' && d?.plantId){ localStorage.setItem('zentrid_selected_plant', d.plantId); location.href=FleetLayout.pathFor('plant-detail'); } if(btn.dataset.action==='telemetry' && d){ localStorage.setItem('zentrid_telemetry_context', JSON.stringify({tenant:d.tenant, plant:d.plant, device:d.name, metric:'Current Power', range:localStorage.getItem('zentrid_time')||'Last 24h', layer:'Normalized'})); location.href=FleetLayout.pathFor('telemetry'); } if(btn.dataset.action==='alerts' && d){ localStorage.setItem('zentrid_alert_context', JSON.stringify({deviceId:d.id, plantId:d.plantId, tenant:d.tenant})); location.href=FleetLayout.pathFor('alerts'); } })); table.querySelectorAll('[data-device-page]').forEach(btn=>btn.onclick=()=>{ if (window.FleetRegistryQuery?.pagination('devices')) return; ZentridDevicePager.page += btn.dataset.devicePage === 'next' ? 1 : -1; apply(false); }); }
  search?.addEventListener('input', () => FleetRuntimeStability.debounce('registry:devices:search', () => apply(true), 220));
  [type,status].forEach(el=> el && el.addEventListener('change', ()=>apply(true)));
  bindRows();
  document.getElementById('clearPlantDeviceFilter')?.addEventListener('click',()=>{ localStorage.removeItem('zentrid_device_filter_plant'); location.reload(); });


  document.getElementById('openDeviceSource')?.addEventListener('click',()=>document.getElementById('deviceSourceDrawer')?.classList.add('open'));
  document.getElementById('closeDeviceSource')?.addEventListener('click',()=>document.getElementById('deviceSourceDrawer')?.classList.remove('open'));
}
function deviceDetailEmptyState(title: string, note: string): string {
  return `<div class="empty-state"><strong>${title}</strong><small>${note}</small></div>`;
}
function deviceRelatedPlant(d: ZentridDeviceRecord): Record<string, unknown> | null {
  return d.relatedPlant && typeof d.relatedPlant === 'object' ? d.relatedPlant as Record<string, unknown> : null;
}
function deviceRelatedAlerts(d: ZentridDeviceRecord): Array<Record<string, unknown>> {
  return Array.isArray(d.relatedAlerts) ? d.relatedAlerts.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
}
function deviceChildRecords(d: ZentridDeviceRecord): ZentridDeviceRecord[] {
  const candidates = deviceRegistryRecords();
  const ids = [d.id, d.externalId, d.serial].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
  return candidates.filter(candidate => {
    if (candidate.id === d.id) return false;
    const parent = String(candidate.parent || '').trim().toLowerCase();
    return Boolean(parent) && ids.some(id => parent === id || parent.includes(id));
  });
}
function deviceValue(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const text = String(value).trim();
  return text && text.toLowerCase() !== 'undefined' && text.toLowerCase() !== 'null' ? text : fallback;
}
function renderDeviceDetailUnavailable(message = 'The selected device was not returned by the backend API.'): string {
  return `<section class="page-hero device-hero-v58 device-hero-v59"><div><p class="eyebrow">Tenant Admin · Device Detail</p><h1>Device detail unavailable</h1><p class="muted">${message}</p></div><div class="hero-actions"><button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('devices')">Back to Device List</button></div></section><section class="panel glass-card">${deviceDetailEmptyState('No device record returned','Open Device List and select a record available from GET /api/devices.')}</section>`;
}
function devicePortalStatusTextV92(d: ZentridDeviceRecord): string {
  const s=String(d.status||'').toLowerCase();
  if(s.includes('offline') || s.includes('fault')) return 'Not visible as healthy in client portal';
  if(s.includes('warning') || s.includes('delayed')) return 'Visible with warning note in client portal';
  if(s.includes('online') || s.includes('active') || s.includes('normal')) return 'Visible as working in client portal';
  return 'Portal health follows the backend device status';
}
function devicePassportPanelV92(d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static device master data returned by the backend device record.</p></div></div>
  <div class="device-passport-grid-v92">
    <article><span>Identity</span><strong>${deviceValue(d.name)}</strong><small>${deviceValue(d.id)} · ${deviceValue(d.externalId)}</small></article>
    <article><span>Classification</span><strong>${deviceValue(d.type)}</strong><small>${deviceValue(d.subtype)}</small></article>
    <article><span>Manufacturer</span><strong>${deviceValue(d.manufacturer || d.vendor)}</strong><small>${deviceValue(d.model)}</small></article>
    <article><span>Serial Number</span><strong>${deviceValue(d.serial)}</strong><small>Unique traceable device number</small></article>
    <article><span>Firmware / Protocol</span><strong>${deviceValue(d.firmware)}</strong><small>${deviceValue(d.protocol)}</small></article>
    <article><span>Rated Capacity</span><strong>${deviceValue(d.capacity)}</strong><small>Technical passport value</small></article>
    <article><span>Network Type</span><strong>${deviceValue(d.ip) !== '—' ? 'LAN / WLAN' : '—'}</strong><small>IP ${deviceValue(d.ip)} · MAC ${deviceValue(d.mac)}</small></article>
    <article><span>Warranty</span><strong>${deviceValue(d.warranty)}</strong><small>Installed ${deviceValue(d.installation)}</small></article>
  </div>
  <div class="data-table compact-table device-passport-table-v92"><div class="data-head"><span>Parameter</span><span>Value</span><span>Used By</span></div>
    <div class="data-row"><div><strong>Rated Power / Capacity</strong></div><div><span>${deviceValue(d.capacity)}</span></div><div><small>Reports · Device & Topology Registry · Lifecycle</small></div></div>
    <div class="data-row"><div><strong>Parent Relation</strong></div><div><span>${deviceValue(d.parent)}</span></div><div><small>Topology · Plant Detail · Alerts</small></div></div>
    <div class="data-row"><div><strong>Child Objects</strong></div><div><span>${deviceValue(d.children)}</span></div><div><small>Topology · Impact analysis</small></div></div>
  </div>`;
}
function deviceConnectivityFullPanelV92(d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Connectivity</h2><p class="muted">Communication, freshness and integration health for this device.</p></div></div>
  ${cardGrid([
    ['Online Status', deviceValue(d.status), devicePortalStatusTextV92(d)],
    ['Last Seen', deviceValue(d.lastSeen), 'Latest communication timestamp returned by the API'],
    ['Signal Strength', deviceMetricValue(d,'signal'), 'Logger / network quality'],
    ['Data Freshness', deviceValue(d.dataQualityStatus || d.sourceStatus), 'Backend data-quality status'],
    ['Gateway / Logger', deviceValue(d.parent), 'Parent relation returned by the API'],
    ['Integration Status', deviceValue(d.sourceStatus), deviceValue(d.integration)]
  ], 'device-param-grid-v58')}
  <div class="device-chain-v92"><div><span>Device</span><strong>${deviceValue(d.name)}</strong></div><i></i><div><span>Gateway / Parent</span><strong>${deviceValue(d.parent)}</strong></div><i></i><div><span>Vendor Cloud</span><strong>${deviceValue(d.vendor)}</strong></div><i></i><div><span>Zentrid Core</span><strong>${deviceValue(d.sourceStatus)}</strong></div></div>`;
}
function telemetrySummaryPanelV92(d: ZentridDeviceRecord): string {
  const key=deviceTypeKey(d);
  const rows = key==='battery' ? [['SOC',deviceMetricValue(d,'soc')],['Charge Power',deviceMetricValue(d,'chargePower')],['Discharge Power',deviceMetricValue(d,'activePower')],['Battery Temperature',deviceMetricValue(d,'temperature')],['SOH',deviceMetricValue(d,'soh')],['Cycle Count',deviceMetricValue(d,'cycleCount')]] :
    key==='meter' ? [['Import Today',deviceMetricValue(d,'todayImport')],['Export Today',deviceMetricValue(d,'todayExport')],['Total Import',deviceMetricValue(d,'import')],['Total Export',deviceMetricValue(d,'export')],['Voltage',deviceMetricValue(d,'voltage')],['Frequency',deviceMetricValue(d,'frequency')]] :
    key==='logger' ? [['Signal',deviceMetricValue(d,'signal')],['Data Lag',deviceMetricValue(d,'dataLag')],['Linked Devices',deviceMetricValue(d,'linked')],['WLAN',deviceMetricValue(d,'wlan')],['LAN IP',deviceMetricValue(d,'lanIp')],['Last Seen',deviceValue(d.lastSeen)]] :
    [['Current Power',deviceMetricValue(d,'activePower')],['Daily Yield',deviceMetricValue(d,'dailyEnergy')],['Monthly Yield',deviceMetricValue(d,'monthlyYield')],['Total Yield',deviceMetricValue(d,'totalYield')],['Temperature',deviceMetricValue(d,'temperature')],['Voltage / Current',`${deviceMetricValue(d,'lineVoltage')} · ${deviceMetricValue(d,'phaseCurrent')}`]];
  return `<div class="section-title-v17"><div><h2>Telemetry Summary</h2><p class="muted">Normalized telemetry values returned by the current device API response.</p></div></div>
  <div class="device-monitoring-grid-v58">${deviceMiniChart(key==='battery'?'Storage Power':'Power Trend')}${deviceMiniChart(key==='meter'?'Import / Export':'Energy Trend')}</div>
  ${cardGrid(rows, 'device-param-grid-v58')}`;
}
function lifecyclePanelV92(d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Lifecycle / Replacement History</h2><p class="muted">Device lifecycle fields returned by the backend contract.</p></div></div>
  <div class="device-lifecycle-summary-v92">
    <article><span>Lifecycle Status</span><strong>${deviceValue(d.lifecycle)}</strong><small>Current device registry state</small></article>
    <article><span>Commissioning Date</span><strong>${deviceValue(d.installation)}</strong><small>Returned by the device API when available</small></article>
    <article><span>Warranty Until</span><strong>${deviceValue(d.warranty)}</strong><small>Returned by the device API when available</small></article>
  </div>
  <div class="timeline-v17 device-lifecycle-v92">${deviceDetailEmptyState('No lifecycle events returned','The current API contract does not expose service, replacement or warranty event history.')}</div>`;
}
function relatedObjectsPanelV92(d: ZentridDeviceRecord): string {
  const plant = deviceRelatedPlant(d);
  const owner = deviceValue(plant?.owner || plant?.client || plant?.clientName);
  const plantId = deviceValue(plant?.id || d.plantId);
  return `<div class="section-title-v17"><div><h2>Related Objects</h2><p class="muted">Relations confirmed by device and plant API records.</p></div></div>
  <div class="device-related-flow-v92">
    <article><span>Tenant</span><strong>${deviceValue(d.tenant)}</strong><small>Authenticated tenant scope</small></article>
    <i></i>
    <article><span>Client</span><strong>${owner}</strong><small>Returned through the matched parent plant when available</small></article>
    <i></i>
    <article><span>Plant</span><strong>${deviceValue(d.plant)}</strong><small>${plantId}</small></article>
    <i></i>
    <article><span>Device</span><strong>${deviceValue(d.name)}</strong><small>${deviceValue(d.type)} · ${deviceValue(d.serial)}</small></article>
  </div>
  <div class="data-table compact-table device-related-table-v92"><div class="data-head"><span>Relation</span><span>Object / Party</span><span>Responsibility</span><span>Action</span></div>
    <div class="data-row"><div><strong>Owner / Client</strong></div><div><span>${owner}</span></div><div><small>${owner === '—' ? 'No client relation returned by the current API response' : 'Matched through the parent plant record'}</small></div><div><button class="small-btn" type="button" ${owner === '—' ? 'disabled' : ''} onclick="location.href=FleetLayout.pathFor('clients')">Open</button></div></div>
    <div class="data-row"><div><strong>Parent Plant</strong></div><div><span>${deviceValue(d.plant)}</span></div><div><small>Operational workspace and alerts context</small></div><div><button class="small-btn" type="button" ${plantId === '—' ? 'disabled' : ''} onclick="localStorage.setItem('zentrid_selected_plant','${plantId}');location.href=FleetLayout.pathFor('plant-detail')">Open</button></div></div>
    <div class="data-row"><div><strong>Integration</strong></div><div><span>${deviceValue(d.integration)}</span></div><div><small>Vendor source and sync traceability</small></div><div><button class="small-btn" type="button" onclick="location.href=FleetLayout.pathFor('integrations')">Open Health</button></div></div>
    <div class="data-row"><div><strong>Service Team</strong></div><div><span>—</span></div><div><small>No service-team relation endpoint is available in the current API contract</small></div><div><button class="small-btn" type="button" disabled>Open Access</button></div></div>
  </div>`;
}
function deviceDocumentsPanelV92(_d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Documents</h2><p class="muted">Device-level documents for support, warranty, commissioning and compliance.</p></div></div>
  <div class="document-grid-v17 device-documents-v92">${deviceDetailEmptyState('No document records returned','A device document endpoint is not available in the current API contract.')}</div>`;
}
function deviceAuditPanelV92(_d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Audit</h2><p class="muted">Immutable device change trail across registry, integration, topology and user actions.</p></div></div>
  <div class="timeline-v17 device-audit-v92">${deviceDetailEmptyState('No audit records returned','The current device API response does not include an audit timeline.')}</div>`;
}
/* v59 Device Detail v2: type-driven workspace, topology and architecture */
function isType(d: ZentridDeviceRecord, name: string): boolean { return String(d.type || '').toLowerCase().includes(name); }
function deviceTypeKey(d: ZentridDeviceRecord): string {
  const t=String(d.type||'').toLowerCase();
  if(t.includes('micro')) return 'microinverter';
  if(t.includes('inverter')) return 'inverter';
  if(t.includes('battery')) return 'battery';
  if(t.includes('logger')||t.includes('gateway')||t.includes('communication')) return 'logger';
  if(t.includes('meter')) return 'meter';
  if(t.includes('weather')) return 'weather';
  if(t.includes('pv module')||t.includes('module')) return 'module';
  return 'generic';
}
function deviceTypeLabel(d: ZentridDeviceRecord): string {
  const map: Record<string, string> = {inverter:'Inverter',microinverter:'Microinverter',battery:'Battery',logger:'Logger / Communication',meter:'Meter',weather:'Weather Station',module:'PV Module',generic:String(d.type || 'Device')};
  return map[deviceTypeKey(d)] || String(d.type || 'Device');
}
var ZentridDevicePager: ZentridDevicePagerState = window.ZentridDevicePager || (window.ZentridDevicePager = { page: 1, size: 50 });
let deviceDetailActiveTab: ZentridDeviceTab = 'overview';
function pageSlice<T>(list: T[], pager: ZentridDevicePagerState): ZentridDevicePageSlice<T> {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pager.size));
  pager.page = Math.min(Math.max(1, Number(pager.page) || 1), pages);
  const start = (pager.page - 1) * pager.size;
  return { total, pages, page: pager.page, start, end: Math.min(start + pager.size, total), rows: list.slice(start, start + pager.size) };
}
function pagerHtml(kind: string, state: ZentridDevicePageSlice<unknown>): string {
  if (state.total <= ZentridDevicePager.size) return `<div class="pagination-bar"><span>Showing ${state.total} row(s)</span></div>`;
  return `<div class="pagination-bar"><span>Showing ${state.start + 1}-${state.end} of ${state.total}</span><div class="row-actions"><button data-${kind}-page="prev" ${state.page<=1?'disabled':''}>Prev</button><strong>Page ${state.page} / ${state.pages}</strong><button data-${kind}-page="next" ${state.page>=state.pages?'disabled':''}>Next</button></div></div>`;
}
function deviceRows(list: ZentridDeviceRecord[]): string {
  const serverPagination = window.FleetRegistryQuery?.pagination('devices');
  const state = serverPagination
    ? { total: serverPagination.totalCount, pages: serverPagination.totalPages, page: serverPagination.page, start: (serverPagination.page - 1) * serverPagination.pageSize, end: Math.min(serverPagination.page * serverPagination.pageSize, serverPagination.totalCount), rows: list }
    : pageSlice(list, ZentridDevicePager);
  const pager = serverPagination ? window.FleetRegistryQuery?.pagerHtml('devices', list.length) || '' : pagerHtml('device', state);
  return `${pager}<div class="data-table device-table"><div class="data-head"><span>Device</span><span>Plant / Tenant Scope</span><span>Type</span><span>Vendor Source</span><span>Status</span><span>Actions</span></div>${state.rows.map(d=>`<div class="data-row" data-id="${d.id}"><div>${FleetDataSource.badge(d, 'device')}<strong>${d.name}</strong><small>${d.id}<br>${d.serial}</small></div><div><strong>${d.plant}</strong><small>${d.tenant}</small></div><div><strong>${d.type}</strong><small>${d.subtype} · ${d.capacity}</small></div><div><strong>${d.vendor}</strong><small>${d.integration}<br>${d.sourceStatus}</small></div><div><span class="badge ${deviceStatusCls(d.status)}">${d.status}</span><small>${d.alerts} alerts · ${d.lastSeen}</small></div><div class="row-actions"><button data-action="open" data-permission-action="view" data-permission-resource="device">Open</button><button data-action="plant" data-permission-action="view" data-permission-resource="plant">Plant</button><button data-action="telemetry" data-permission-action="view" data-permission-resource="device">Telemetry</button><button data-action="alerts" data-permission-action="view" data-permission-resource="device">Alerts</button></div></div>`).join('')}</div>${pager}`;
}
function renderDevices(): string {
  const all=deviceRegistryRecords();
  const queryState = window.FleetRegistryQuery?.read('devices');
  const serverPagination = window.FleetRegistryQuery?.pagination('devices');
  const initialSearch = queryState?.search || '';
  const initialType = queryState?.params.deviceType || 'All Types';
  const initialStatus = queryState?.params.deviceStatus || 'All Statuses';
  const activePlantFilter=localStorage.getItem('zentrid_device_filter_plant') || '';
  const activePlant=activePlantFilter ? all.find(d=>d.plantId===activePlantFilter) : null;
  const list=activePlantFilter ? all.filter(d=>d.plantId===activePlantFilter) : all;
  const online=list.filter(d=>d.status==='Online').length;
  const attention=list.filter(d=>d.status!=='Online').length;
  const mapped=list.filter(d=>d.sourceStatus).length;
  const types=[...new Set(all.map(d=>d.type).filter(Boolean))].sort();
  const filterBanner=activePlantFilter ? `<div class="filter-banner"><div><strong>Filtered by plant</strong><small>${activePlant ? activePlant.plant : activePlantFilter} · ${list.length} device records</small></div><button id="clearPlantDeviceFilter">Clear filter</button></div>` : '';
  const tenantName = currentDeviceTenantScope();
  return `<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Customers & Assets</p><h1>Device List</h1><p class="muted">All devices connected to your plants, grouped by plant, vendor source, type and operational status.</p></div><div class="hero-actions"><button class="freshness-card" id="openDeviceSource" type="button"><span class="pulse"></span><div><strong>Source Traceability</strong><small>Read-only vendor ID → Zentrid Device</small></div></button></div></section>
  ${filterBanner}
  <section class="context-bar glass-card"><button class="ctx-item" type="button"><span>Tenant Scope</span><strong>${tenantName}</strong></button><button class="ctx-item" type="button"><span>Total Devices</span><strong>${(serverPagination?.totalCount || list.length).toLocaleString()}</strong></button><button class="ctx-item" type="button"><span>Online</span><strong>${online}</strong></button><button class="ctx-item" type="button"><span>Attention</span><strong>${attention}</strong></button></section>
  <section class="panel glass-card"><div class="panel-head"><div><h2>Device List</h2><p>Search devices inside the authenticated tenant by device, plant, vendor, type, serial or status.</p></div><span class="badge info">Registry read-only</span></div><div class="toolbar device-registry-toolbar"><input id="deviceSearch" value="${String(initialSearch).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="Search current page by device, serial, plant..."/><select id="deviceTypeFilter"><option ${initialType === 'All Types' ? 'selected' : ''}>All Types</option>${types.map(t=>`<option ${t === initialType ? 'selected' : ''}>${t}</option>`).join('')}</select><select id="deviceStatusFilter"><option ${initialStatus === 'All Statuses' ? 'selected' : ''}>All Statuses</option><option ${initialStatus === 'Online' ? 'selected' : ''}>Online</option><option ${initialStatus === 'Warning' ? 'selected' : ''}>Warning</option><option ${initialStatus === 'Offline' ? 'selected' : ''}>Offline</option></select></div><div id="deviceFilterScopeV126">${window.FleetRegistryQuery?.filterScopeHtml('devices') || ''}</div><div id="deviceTable">${deviceRows(list)}</div></section>
  <aside class="detail-drawer" id="deviceSourceDrawer"><button class="drawer-close" id="closeDeviceSource" type="button">×</button><h2>Device Source Traceability</h2><div class="drawer-body"><p>Each device keeps its vendor source reference while Tenant Admin access remains read-only.</p><ul><li>External Device ID</li><li>Vendor and integration name</li><li>Plant relationship</li><li>Parent / child topology</li><li>Last seen and data freshness</li></ul><div class="info-grid"><div><span>Tenant Scope</span><strong>${tenantName}</strong></div><div><span>Mapped Devices</span><strong>${mapped}</strong></div><div><span>Write Access</span><strong>Not available</strong></div><div><span>Integration Changes</span><strong>Platform operations only</strong></div></div></div><div class="drawer-actions"><button class="primary-action" type="button" onclick="location.href=FleetLayout.pathFor('plants')">Open Plants</button></div></aside>`;
}
function devicePrimaryMetric(d: ZentridDeviceRecord): ZentridDevicePrimaryMetric {
  const k=deviceTypeKey(d);
  if(k==='battery') return {label:'SOC / SOH', value:`${deviceMetricValue(d,'soc')} · ${deviceMetricValue(d,'soh')}`, hint:'Battery health'};
  if(k==='logger') return {label:'Signal / Data Lag', value:`${deviceMetricValue(d,'signal')} · ${deviceMetricValue(d,'dataLag')}`, hint:'Communication health'};
  if(k==='meter') return {label:'Grid Power', value:deviceMetricValue(d,'activePower'), hint:'Accounting point'};
  if(k==='weather') return {label:'Irradiance', value:deviceMetricValue(d,'irradiance'), hint:'Weather telemetry'};
  if(k==='module') return {label:'Module Power', value:deviceMetricValue(d,'activePower'), hint:'Module-level output'};
  return {label:'Active Power', value:deviceMetricValue(d,'activePower'), hint:'Realtime output'};
}
function deviceHeroActions(d: ZentridDeviceRecord): string {
  const plantId = deviceValue(d.plantId);
  return `<button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('devices')">Back to Device List</button><button class="secondary-action" type="button" ${plantId === '—' ? 'disabled' : ''} onclick="localStorage.setItem('zentrid_selected_plant','${plantId}');location.href=FleetLayout.pathFor('plant-detail')">Open Plant</button><button class="primary-action" type="button" id="refreshDeviceV59">Refresh</button>`;
}
function deviceKpis(d: ZentridDeviceRecord): string {
  const primary=devicePrimaryMetric(d);
  return `<section class="kpi-grid detail-kpis device-kpi-grid-v58 device-kpi-grid-v59">
    <article class="kpi-card"><span>Status</span><strong>${deviceValue(d.status)}</strong><small>${deviceValue(d.alerts)} active alerts · ${deviceValue(d.lastSeen)}</small></article>
    <article class="kpi-card"><span>${primary.label}</span><strong>${primary.value}</strong><small>${primary.hint}</small></article>
    <article class="kpi-card"><span>Type</span><strong>${deviceTypeLabel(d)}</strong><small>${deviceValue(d.subtype)}</small></article>
    <article class="kpi-card"><span>Vendor / Model</span><strong>${deviceValue(d.vendor)}</strong><small>${deviceValue(d.model)}</small></article>
    <article class="kpi-card"><span>Serial Number</span><strong>${deviceValue(d.serial)}</strong><small>${deviceValue(d.externalId)}</small></article>
    <article class="kpi-card"><span>Parent Relation</span><strong>${deviceValue(d.parent)}</strong><small>${deviceValue(d.children)}</small></article>
  </section>`;
}
function universalDeviceSidebar(d: ZentridDeviceRecord, activeTab: ZentridDeviceTab = deviceDetailActiveTab): string {
  const key=deviceTypeKey(d);
  const typeSpecific = key==='inverter'||key==='microinverter' ? `<button class="${activeTab === 'strings' ? 'active' : ''}" data-device-tab="strings" type="button" ${activeTab === 'strings' ? 'aria-current=\"page\"' : ''}><span>PV Strings</span></button>` :
    key==='battery' ? `<button class="${activeTab === 'battery' ? 'active' : ''}" data-device-tab="battery" type="button" ${activeTab === 'battery' ? 'aria-current=\"page\"' : ''}><span>Battery State</span></button>` :
    key==='logger' ? `<button class="${activeTab === 'connectivity' ? 'active' : ''}" data-device-tab="connectivity" type="button" ${activeTab === 'connectivity' ? 'aria-current=\"page\"' : ''}><span>Logger View</span></button>` :
    key==='meter' ? `<button class="${activeTab === 'measurements' ? 'active' : ''}" data-device-tab="measurements" type="button" ${activeTab === 'measurements' ? 'aria-current=\"page\"' : ''}><span>Measurements</span></button>` :
    key==='weather' ? `<button class="${activeTab === 'weather' ? 'active' : ''}" data-device-tab="weather" type="button" ${activeTab === 'weather' ? 'aria-current=\"page\"' : ''}><span>Weather Data</span></button>` :
    key==='module' ? `<button class="${activeTab === 'module' ? 'active' : ''}" data-device-tab="module" type="button" ${activeTab === 'module' ? 'aria-current=\"page\"' : ''}><span>Module Data</span></button>` : '';
  const button = (tab: string, label: string): string => `<button class="${activeTab === tab ? 'active' : ''}" data-device-tab="${tab}" type="button" ${activeTab === tab ? 'aria-current="page"' : ''}><span>${label}</span></button>`;
  return `<aside class="detail-side-nav device-detail-nav-v58 device-detail-nav-v92" aria-label="Device navigation">
    ${button('overview','Overview')}
    ${button('passport','Technical Passport')}
    ${button('connectivity-full','Connectivity')}
    ${button('telemetry','Telemetry Summary')}
    ${button('architecture','Topology')}
    ${typeSpecific}
    ${button('alerts','Alerts / Events')}
    ${button('lifecycle','Lifecycle')}
    ${button('related','Related Objects')}
    ${button('documents','Documents')}
    ${button('configuration','Configuration Snapshot')}
    ${button('audit','Audit')}
    ${button('source','Source & Sync')}
  </aside>`;
}
function deviceMetricValue(d: ZentridDeviceRecord, key: string): string {
  const aliases: Record<string, string[]> = {
    activePower:['power','activePower'], reactivePower:['reactivePower'], powerFactor:['powerFactor'], frequency:['frequency'],
    dailyEnergy:['dailyEnergy'], monthlyYield:['monthlyYield'], totalYield:['totalYield'], temperature:['temperature'], insulation:['insulation'],
    phaseCurrent:['phaseCurrent','current'], lineVoltage:['lineVoltage','voltage'], startup:['startup'], shutdown:['shutdown'],
    soc:['soc'], soh:['soh'], voltage:['voltage'], current:['current'], rated:['rated','capacity'], charged:['charged'], discharged:['discharged'],
    packages:['packages'], chargeVoltage:['chargeVoltage'], dischargeVoltage:['dischargeVoltage'], chargeCurrent:['chargeCurrent'], dischargeCurrent:['dischargeCurrent'],
    chargePower:['chargePower'], cycleCount:['cycleCount'], signal:['signal'], wlan:['wlan'], dataLag:['dataLag','lastSeen'], linked:['children'],
    lanIp:['lanIp','ip'], cybersecurity:['cybersecurity'], import:['import'], export:['export'], todayImport:['todayImport'], todayExport:['todayExport'],
    irradiance:['irradiance'], ambient:['ambient'], moduleTemp:['moduleTemp'], wind:['wind'], humidity:['humidity'], rainfall:['rainfall'],
    string:['string'], mppt:['mppt'], position:['position']
  };
  for (const alias of aliases[key] || [key]) {
    const value = d[alias];
    if (value !== null && value !== undefined && String(value).trim() && String(value).trim() !== '—') return String(value);
  }
  return '—';
}
function cardGrid(items: ZentridDeviceCardItem[], cls: string = 'device-param-grid-v58'): string {
  return `<div class="${cls}">${items.map(([k,v,h])=>`<article><span>${k}</span><strong>${v}</strong>${h?`<small>${h}</small>`:''}</article>`).join('')}</div>`;
}
function operatingDataGrid(d: ZentridDeviceRecord): string {
  const key=deviceTypeKey(d);
  if(key==='logger') return cardGrid([['Signal Strength',deviceMetricValue(d,'signal')],['WLAN',deviceMetricValue(d,'wlan')],['Data Lag',deviceMetricValue(d,'dataLag')],['Linked Devices',deviceMetricValue(d,'linked')],['LAN IP',deviceMetricValue(d,'lanIp')],['Cyber Security Version',deviceMetricValue(d,'cybersecurity')],['Status',d.status],['Last Update',d.lastSeen]]);
  if(key==='battery') return cardGrid([['SOC',deviceMetricValue(d,'soc')],['SOH',deviceMetricValue(d,'soh')],['Voltage',deviceMetricValue(d,'voltage')],['Current',deviceMetricValue(d,'current')],['Temperature',deviceMetricValue(d,'temperature')],['Rated Capacity',deviceMetricValue(d,'rated')],['Charged Today',deviceMetricValue(d,'charged')],['Discharged Today',deviceMetricValue(d,'discharged')]]);
  if(key==='weather') return cardGrid([['Irradiance',deviceMetricValue(d,'irradiance')],['Ambient Temp',deviceMetricValue(d,'ambient')],['Module Temp',deviceMetricValue(d,'moduleTemp')],['Wind Speed',deviceMetricValue(d,'wind')],['Humidity',deviceMetricValue(d,'humidity')],['Rainfall',deviceMetricValue(d,'rainfall')]]);
  if(key==='meter') return cardGrid([['Active Power',deviceMetricValue(d,'activePower')],['Import Today',deviceMetricValue(d,'todayImport')],['Export Today',deviceMetricValue(d,'todayExport')],['Voltage',deviceMetricValue(d,'voltage')],['Current',deviceMetricValue(d,'current')],['Frequency',deviceMetricValue(d,'frequency')]]);
  if(key==='module') return cardGrid([['Power',deviceMetricValue(d,'activePower')],['Voltage',deviceMetricValue(d,'voltage')],['Current',deviceMetricValue(d,'current')],['Temperature',deviceMetricValue(d,'temperature')],['String',deviceMetricValue(d,'string')],['MPPT',deviceMetricValue(d,'mppt')],['Position',deviceMetricValue(d,'position')]]);
  return cardGrid([['Active Power',deviceMetricValue(d,'activePower')],['Reactive Power',deviceMetricValue(d,'reactivePower')],['Power Factor',deviceMetricValue(d,'powerFactor')],['Grid Frequency',deviceMetricValue(d,'frequency')],['Daily Energy',deviceMetricValue(d,'dailyEnergy')],['Total Yield',deviceMetricValue(d,'totalYield')],['Phase Current',deviceMetricValue(d,'phaseCurrent')],['Line Voltage',deviceMetricValue(d,'lineVoltage')],['Internal Temperature',deviceMetricValue(d,'temperature')],['Insulation Resistance',deviceMetricValue(d,'insulation')],['Startup Time',deviceMetricValue(d,'startup')],['Shutdown Time',deviceMetricValue(d,'shutdown')]]);
}
function deviceMiniChart(label: string): string {
  return `<div class="device-chart-card-v58"><div class="chart-card-head-v20"><strong>${label}</strong><small>No historical endpoint</small></div>${deviceDetailEmptyState('No historical series returned','The current device API provides a snapshot record only.')}</div>`;
}
function architectureFlow(d: ZentridDeviceRecord): string {
  const nodes: Array<[string,string]> = [];
  if (deviceValue(d.plant) !== '—') nodes.push(['Plant',deviceValue(d.plant)]);
  if (deviceValue(d.parent) !== '—') nodes.push(['Parent',deviceValue(d.parent)]);
  nodes.push([deviceTypeLabel(d),deviceValue(d.name)]);
  if (deviceValue(d.children) !== '—') nodes.push(['Children',deviceValue(d.children)]);
  return `<div class="device-architecture-v59">${nodes.map((node,index)=>`<div class="arch-node-v59"><span>${node[0]}</span><strong>${node[1]}</strong></div>${index<nodes.length-1?'<div class="arch-link-v59"><span></span></div>':''}`).join('')}</div>`;
}
function architectureRelations(d: ZentridDeviceRecord): string {
  return `<div class="split-grid device-relations-v59"><div class="panel-lite"><h3>Hierarchy</h3><div class="asset-tree"><p>${d.plant}\n└── ${d.parent}\n    └── ${d.name}\n        └── ${d.children}</p></div></div><div class="panel-lite"><h3>Connected Objects</h3>${cardGrid([['Plant',d.plant],['Tenant',d.tenant],['Parent',d.parent],['Children',d.children],['Vendor Source',d.vendor],['Mapping',d.sourceStatus]],'device-param-grid-v58 compact-v59')}</div></div>`;
}
function stringRows(d: ZentridDeviceRecord): string {
  const raw = d.raw && typeof d.raw === 'object' ? d.raw as Record<string, unknown> : null;
  const vendorExtensions = raw?.vendorExtensions && typeof raw.vendorExtensions === 'object' ? raw.vendorExtensions as Record<string, unknown> : null;
  const source = vendorExtensions?.strings || vendorExtensions?.inputs || raw?.strings || raw?.inputs;
  const rows = Array.isArray(source) ? source.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
  const body = rows.map((row,index)=>`<div class="data-row"><div><strong>${deviceValue(row.name || row.input || `Input ${index + 1}`)}</strong><small>${deviceValue(row.mppt)}</small></div><div><span>${deviceValue(row.voltage)}</span></div><div><span>${deviceValue(row.current)}</span></div><div><span>${deviceValue(row.power)}</span></div><div><span>${deviceValue(row.capacity)}</span></div></div>`).join('');
  return `<div class="data-table compact-table device-string-table-v58"><div class="data-head"><span>Input</span><span>Voltage</span><span>Current</span><span>Power</span><span>String Capacity</span></div>${body || `<div class="data-row"><div>${deviceDetailEmptyState('No PV input records returned','The current device response does not include MPPT or string-level values.')}</div></div>`}</div>`;
}
function batteryDetail(d: ZentridDeviceRecord): string {
  return `<div class="device-battery-visual-v59"><div class="battery-gauge-v59"><strong>${deviceMetricValue(d,'soc')}</strong><span>SOC</span></div><div>${cardGrid([['Battery Voltage',deviceMetricValue(d,'voltage')],['Battery Current',deviceMetricValue(d,'current')],['Battery Health',deviceMetricValue(d,'soh')],['Temp',deviceMetricValue(d,'temperature')],['Package Quantity',deviceMetricValue(d,'packages')]],'device-param-grid-v58 compact-v59')}</div></div><div class="section-title-v17 mini"><div><h3>Charge / Discharge Limits</h3><p class="muted">Values returned by the current device API response.</p></div></div>${cardGrid([['Charge End Voltage',deviceMetricValue(d,'chargeVoltage')],['Discharge End Voltage',deviceMetricValue(d,'dischargeVoltage')],['Charge Limit Current',deviceMetricValue(d,'chargeCurrent')],['Discharge Limit Current',deviceMetricValue(d,'dischargeCurrent')]], 'device-param-grid-v58')}`;
}
function configurationPanel(d: ZentridDeviceRecord): string {
  return `<div class="section-title-v17"><div><h2>Configuration Snapshot</h2><p class="muted">Read-only configuration fields returned by the current device API response.</p></div><span class="badge info">Read-only</span></div>${cardGrid([['Firmware',deviceValue(d.firmware)],['Protocol Version',deviceValue(d.protocol)],['Snapshot Source',deviceValue(d.sourceSystem || d.vendor)],['Tenant Access','Read-only']])}<div class="panel-lite device-readonly-note-v142"><h3>Configuration Parameters</h3>${deviceDetailEmptyState('No configuration payload returned','The current API contract does not expose device parameter sets, remote commands or firmware actions.')}</div>`;
}
function deviceLazyPanel(tab: ZentridDeviceTab, content: string): string {
  return window.FleetDetailLazyTabs?.panel('device', String(tab || 'overview'), content) || content;
}
function deviceDetailPanel(d: ZentridDeviceRecord, tab: ZentridDeviceTab): string {
  if(tab==='overview') return `<div class="section-title-v17"><div><h2>Device Overview</h2><p class="muted">Type-driven workspace: ${deviceTypeLabel(d)} shows only fields returned by the backend API.</p></div></div><div class="device-overview-grid-v58"><article><span>Status</span><strong>${deviceStatusPill(d)}</strong><small>${deviceValue(d.lastSeen)}</small></article><article><span>Plant</span><strong>${deviceValue(d.plant)}</strong><small>${deviceValue(d.tenant)}</small></article><article><span>Vendor / Model</span><strong>${deviceValue(d.vendor)}</strong><small>${deviceValue(d.model)}</small></article><article><span>Serial Number</span><strong>${deviceValue(d.serial)}</strong><small>${deviceValue(d.id)}</small></article></div><div class="section-title-v17 mini"><div><h3>Realtime Snapshot</h3><p class="muted">Current values returned in the device record.</p></div></div>${operatingDataGrid(d)}`;
  if(tab==='telemetry'||tab==='monitoring') return deviceLazyPanel(tab, telemetrySummaryPanelV92(d));
  if(tab==='architecture') return deviceLazyPanel(tab, `<div class="section-title-v17"><div><h2>Architecture</h2><p class="muted">Plant, parent and child relations returned by the device API.</p></div></div>${architectureFlow(d)}${architectureRelations(d)}`);
  if(tab==='strings') return `<div class="section-title-v17"><div><h2>PV Strings / Inputs</h2><p class="muted">MPPT and PV input values returned by the device source.</p></div></div>${stringRows(d)}`;
  if(tab==='battery') return `<div class="section-title-v17"><div><h2>Battery State</h2><p class="muted">Storage-specific values returned by the device API.</p></div></div>${batteryDetail(d)}`;
  if(tab==='connectivity') {
    const children = deviceChildRecords(d);
    const rows = children.map(child => `<div class="data-row"><div><span class="badge ${deviceStatusCls(child.status)}">${deviceValue(child.status)}</span></div><div><strong>${deviceValue(child.type)}</strong></div><div><span>${deviceValue(child.model)}</span></div><div><span>${deviceValue(child.firmware)}</span></div><div><span>${deviceValue(child.serial)}</span></div></div>`).join('');
    return `<div class="section-title-v17"><div><h2>Connectivity</h2><p class="muted">Logger / communication module status and subordinate API records.</p></div></div>${operatingDataGrid(d)}<div class="section-title-v17 mini"><div><h3>Subordinate Devices</h3><p class="muted">Devices whose parent relation references this record.</p></div></div><div class="data-table compact-table subordinate-device-table-v59"><div class="data-head"><span>Status</span><span>Device Type</span><span>Model</span><span>Software Version</span><span>SN</span></div>${rows || `<div class="data-row"><div>${deviceDetailEmptyState('No subordinate devices returned','No device record references this logger or communication module as its parent.')}</div></div>`}</div>`;
  }
  if(tab==='measurements') return `<div class="section-title-v17"><div><h2>Measurements</h2><p class="muted">Meter values returned by the current device API response.</p></div></div>${operatingDataGrid(d)}${cardGrid([['Total Import',deviceMetricValue(d,'import')],['Total Export',deviceMetricValue(d,'export')],['Accounting Source',deviceValue(d.sourceSystem || d.vendor)],['Data Status',deviceValue(d.dataQualityStatus || d.sourceStatus)]])}`;
  if(tab==='weather') return `<div class="section-title-v17"><div><h2>Weather Data</h2><p class="muted">Weather values returned by the current device API response.</p></div></div>${operatingDataGrid(d)}`;
  if(tab==='module') return `<div class="section-title-v17"><div><h2>Module Data</h2><p class="muted">Module-level values returned by the current device API response.</p></div></div>${operatingDataGrid(d)}`;
  if(tab==='information') return `<div class="section-title-v17"><div><h2>Technical Info</h2><p class="muted">Static master data and vendor identifiers returned by the backend.</p></div></div><div class="info-grid"><div><span>Device Name</span><strong>${deviceValue(d.name)}</strong></div><div><span>Device Type</span><strong>${deviceValue(d.type)}</strong></div><div><span>Subtype</span><strong>${deviceValue(d.subtype)}</strong></div><div><span>Vendor</span><strong>${deviceValue(d.vendor)}</strong></div><div><span>Manufacturer</span><strong>${deviceValue(d.manufacturer)}</strong></div><div><span>Model</span><strong>${deviceValue(d.model)}</strong></div><div><span>Serial Number</span><strong>${deviceValue(d.serial)}</strong></div><div><span>Firmware</span><strong>${deviceValue(d.firmware)}</strong></div><div><span>IP Address</span><strong>${deviceValue(d.ip)}</strong></div><div><span>MAC Address</span><strong>${deviceValue(d.mac)}</strong></div><div><span>Installation Date</span><strong>${deviceValue(d.installation)}</strong></div><div><span>Warranty</span><strong>${deviceValue(d.warranty)}</strong></div></div>`;
  if(tab==='alerts') {
    const alerts = deviceRelatedAlerts(d);
    const rows = alerts.map(alert => `<div class="data-row"><div><strong>${deviceValue(alert.title || alert.description)}</strong><small>${deviceValue(alert.device || d.name)}</small></div><div><span class="badge ${deviceStatusCls(alert.severity)}">${deviceValue(alert.severity)}</span></div><div><span>${deviceValue(alert.vendor || alert.source)}</span></div><div><span>${deviceValue(alert.created || alert.updated)}</span></div><div><span>${deviceValue(alert.status)}</span></div></div>`).join('');
    return deviceLazyPanel(tab, `<div class="section-title-v17"><div><h2>Alerts / Faults</h2><p class="muted">Device-level records loaded from GET /api/alerts.</p></div></div><div class="data-table compact-table device-alert-table-v58"><div class="data-head"><span>Alert</span><span>Severity</span><span>Source</span><span>Time</span><span>Status</span></div>${rows || `<div class="data-row"><div>${deviceDetailEmptyState('No related alerts returned','The alert API returned no record linked to this device.')}</div></div>`}</div><div class="drawer-actions"><button class="primary-action" onclick='localStorage.setItem("zentrid_alert_context", JSON.stringify({deviceId:"${d.id}", plantId:"${d.plantId}", tenant:"${d.tenant}"})); location.href=FleetLayout.pathFor("alerts")'>Open Alerts Center</button></div>`);
  }
  if(tab==='configuration') return configurationPanel(d);
  if(tab==='activity') return `<div class="section-title-v17"><div><h2>Activity Log</h2><p class="muted">Telemetry refresh, configuration changes, firmware and repair history.</p></div></div><div class="timeline-v17">${deviceDetailEmptyState('No activity records returned','The current device API response does not include activity history.')}</div>`;
  if(tab==='source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Vendor traceability and canonical mapping state.</p></div></div><div class="info-grid"><div><span>Integration</span><strong>${deviceValue(d.integration)}</strong></div><div><span>Vendor</span><strong>${deviceValue(d.vendor)}</strong></div><div><span>External ID</span><strong>${deviceValue(d.externalId)}</strong></div><div><span>Zentrid ID</span><strong>${deviceValue(d.id)}</strong></div><div><span>Mapping Status</span><strong>${deviceValue(d.sourceStatus)}</strong></div><div><span>Last Seen</span><strong>${deviceValue(d.lastSeen)}</strong></div><div><span>Source System</span><strong>${deviceValue(d.sourceSystem || d.vendor)}</strong></div><div><span>Alarm Status</span><strong>${deviceValue(d.alarmStatus)}</strong></div></div>`;
  if(tab==='passport') return devicePassportPanelV92(d);
  if(tab==='connectivity-full') return deviceConnectivityFullPanelV92(d);
  if(tab==='lifecycle') return lifecyclePanelV92(d);
  if(tab==='related') return deviceLazyPanel(tab, relatedObjectsPanelV92(d));
  if(tab==='documents') return deviceDocumentsPanelV92(d);
  if(tab==='audit') return deviceAuditPanelV92(d);
  return '';
}
function renderDeviceDetail(): string {
  const d=selectedDevice();
  if (!d) return renderDeviceDetailUnavailable();
  return `<section class="page-hero device-hero-v58 device-hero-v59"><div><p class="eyebrow">Tenant Admin · Device Detail ${FleetDataSource.badge(d, 'device', true)}</p><h1>${deviceValue(d.name)}</h1><p class="muted">${deviceTypeLabel(d)} · ${deviceValue(d.manufacturer || d.vendor)} ${deviceValue(d.model)} · ${deviceValue(d.serial)}</p></div><div class="hero-actions">${deviceHeroActions(d)}</div></section>
  <section class="context-bar glass-card device-context-v58"><div><span>Plant</span><strong>${deviceValue(d.plant)}</strong></div><div><span>Tenant</span><strong>${deviceValue(d.tenant)}</strong></div><div><span>Device Type</span><strong>${deviceTypeLabel(d)}</strong></div><div><span>Last Communication</span><strong>${deviceValue(d.lastSeen)}</strong></div></section>
  ${deviceKpis(d)}
  <section class="detail-layout-v58 device-detail-layout-v58 device-detail-layout-v59">${universalDeviceSidebar(d, deviceDetailActiveTab)}<main class="glass-card detail-main-v58"><div id="deviceDetailContent">${deviceDetailPanel(d,deviceDetailActiveTab)}</div></main></section>`;
}
function wireDeviceDetail(): void {
  const d=selectedDevice();
  if (!d) return;
  document.getElementById('refreshDeviceV59')?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('zentrid:data-refresh-request',{ detail:{ resource:'device-detail', forceRefresh:true } })));
  window.FleetDetailLazyTabs?.observe('device', 'device-detail-content', () => {
    const current = selectedDevice();
    const content=document.getElementById('deviceDetailContent');
    if(content && current) content.innerHTML=deviceDetailPanel(current, deviceDetailActiveTab);
  });
  document.querySelectorAll<HTMLElement>('[data-device-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    deviceDetailActiveTab = btn.dataset.deviceTab || 'overview';
    document.querySelectorAll<HTMLElement>('[data-device-tab]').forEach(item => {
      const active = item.dataset.deviceTab === deviceDetailActiveTab;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
    });
    window.FleetDetailLazyTabs?.activate('device', String(deviceDetailActiveTab));
    const current = selectedDevice();
    const content=document.getElementById('deviceDetailContent');
    if(content && current) content.innerHTML=deviceDetailPanel(current, deviceDetailActiveTab);
  }));
}
