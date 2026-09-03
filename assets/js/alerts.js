"use strict";
const FleetAlertDictionary = {
    categories: ['Grid', 'PV / DC Side', 'Battery / BMS', 'Inverter', 'Communication', 'Metering', 'Safety', 'Optimizers', 'EV Charger', 'Configuration'],
    codes: {
        'FL-GRD-OV': { category: 'Grid', name: 'Grid Overvoltage', severity: 'Fault', deviceScope: 'Inverter / Grid Interface', policy: 'Verify grid voltage, check utility fluctuation, contact client if recurring, escalate after repeated occurrences.', meaning: 'Grid voltage is above accepted threshold.', vendorMappings: ['Deye F42/F13', 'Huawei 2034', 'GoodWe 3', 'Sofar ID01/ID001', 'Solis 1010', 'Peimar IE09/IE11'] },
        'FL-PV-ISO': { category: 'PV / DC Side', name: 'PV Insulation / Isolation Fault', severity: 'Fault', deviceScope: 'PV String / Inverter', policy: 'Open technical case, request visual/plant checks if remote validation is inconclusive.', meaning: 'Insulation or residual current fault was detected.', vendorMappings: ['Deye F23/F24/F12', 'Huawei 2051/2062', 'GoodWe 14/23', 'Solis 1033/1034', 'Peimar IE23/IE29'] },
        'FL-PV-ARC': { category: 'PV / DC Side', name: 'DC Arc Fault (AFCI)', severity: 'Critical', deviceScope: 'PV String / Inverter', policy: 'Immediate critical escalation. Require technical validation and resolution evidence before closure.', meaning: 'Potential DC arc fault / AFCI trip.', vendorMappings: ['Huawei 2002', 'SunGrow 087/088', 'Solis 1041'] },
        'FL-BAT-COM': { category: 'Battery / BMS', name: 'Battery BMS Communication Lost', severity: 'Fault', deviceScope: 'Battery / BMS / ESS', policy: 'Notify BESS specialist, check BMS communication path, escalate if storage operation is affected.', meaning: 'Battery management system communication is lost.', vendorMappings: ['Deye F58', 'Huawei 3000/3110', 'GoodWe 20/E10', 'SunGrow 514/714', 'Solis 2012', 'Peimar IE43/IE35'] },
        'FL-BAT-OT': { category: 'Battery / BMS', name: 'Battery Overtemperature', severity: 'Fault', deviceScope: 'Battery / BMS / ESS', policy: 'Monitor trend, notify BESS specialist and contact client/plant if cooling check is required.', meaning: 'Battery temperature is above allowed threshold.', vendorMappings: ['Deye OT', 'Huawei 3105', 'GoodWe 12/E05', 'Sofar ID57', 'Peimar IE44'] },
        'FL-BAT-LOCK': { category: 'Battery / BMS', name: 'Battery Pack Locked', severity: 'Critical', deviceScope: 'Battery / ESS', policy: 'Immediate escalation. Field validation may be required.', meaning: 'Battery pack is locked or in critical safety state.', vendorMappings: ['Huawei 3107/4003', 'Sofar Solid Red LED', 'Solis RED_SOLID'] },
        'FL-INV-INT': { category: 'Inverter', name: 'Internal Hardware Fault', severity: 'Fault', deviceScope: 'Inverter', policy: 'Open technical case, validate telemetry, escalate if not remotely recoverable.', meaning: 'Internal hardware or controller error reported by inverter.', vendorMappings: ['Huawei 2064', 'GoodWe 31', 'Solax SPI/SCI Fault', 'Peimar IE01/IE08'] },
        'FL-INV-FAN': { category: 'Inverter', name: 'Fan Fault', severity: 'Warning', deviceScope: 'Inverter', policy: 'Open maintenance task if persistent. Not every occurrence requires field visit.', meaning: 'Cooling fan fault or abnormal speed.', vendorMappings: ['Deye F63', 'GoodWe 30/32', 'SunGrow 70', 'Solis 1030/1031', 'Peimar IE58'] },
        'FL-COM-LOG': { category: 'Communication', name: 'Logger / Dongle Offline', severity: 'Fault', deviceScope: 'Logger / Dongle / Gateway', policy: 'Notify support and client. Ask client to check internet, router and device power. Escalate if not restored.', meaning: 'Logger or dongle stopped communicating.', vendorMappings: ['Deye LOGGER_OFFLINE', 'Huawei RED Steady / Dongle Fault', 'GoodWe NET LED Red', 'Solax Blinking Red', 'Peimar IE36/IE32'] },
        'FL-COM-SRV': { category: 'Communication', name: 'Cloud / Server Connection Error', severity: 'Warning', deviceScope: 'Logger / Cloud Connector', policy: 'Check connector health and retry before client contact unless plant is offline.', meaning: 'Vendor cloud/server connection is delayed or unavailable.', vendorMappings: ['Deye NET Flashing Red', 'Huawei RED Slow Blink', 'GoodWe Blink 4 Times', 'Solax NET Red', 'Peimar IE33'] },
        'FL-COM-RS': { category: 'Communication', name: 'RS485 Communication Error', severity: 'Fault', deviceScope: 'Meter / Inverter / Gateway', policy: 'Check RS485 path, meter/inverter link and accounting impact. Assign technical task if data is affected.', meaning: 'RS485 or internal communication failure.', vendorMappings: ['Deye W04', 'Solis 2010', 'Sofar ID053', 'Peimar IE34/IE31/IE74'] },
        'FL-MTR-COM': { category: 'Metering', name: 'Meter Communication Lost', severity: 'Fault', deviceScope: 'Smart Meter', policy: 'Validate accounting freshness; escalate if billing-ready records are affected.', meaning: 'Meter communication is lost or delayed.', vendorMappings: ['Deye W04', 'Huawei 2067', 'GoodWe 21', 'Sofar ID065', 'Solax Meter Fault', 'Solis 2011', 'Peimar IE65'] },
        'FL-MTR-CT': { category: 'Metering', name: 'CT / Meter Wiring Error', severity: 'Warning', deviceScope: 'Smart Meter / CT', policy: 'Create verification task before using values for billing or settlement.', meaning: 'Meter or CT wiring appears reversed or inconsistent.', vendorMappings: ['Deye W03', 'Huawei Negative Values', 'SunGrow 601', 'Peimar IE65'] },
        'FL-SAF-FIRE': { category: 'Safety', name: 'Fire Suppression Triggered', severity: 'Critical', deviceScope: 'BESS / Safety System', policy: 'Immediate escalation, notify responsible parties, require closure evidence.', meaning: 'Fire suppression or safety system was triggered.', vendorMappings: ['Sofar ID105', 'Solax FSS Trigger', 'SunGrow FSS Alert'] }
    }
};
function alertCodeMeta(a) { const code = a?.fleetCode; return (code ? FleetAlertDictionary.codes[code] : undefined) || { category: a?.category || 'Unmapped', name: a?.title || 'Unknown alert', severity: a?.severity || 'Unknown', deviceScope: a?.deviceType || '—', policy: 'No canonical policy configured yet.', meaning: a?.description || 'No unified explanation configured.', vendorMappings: [] }; }
function vendorCodeLabel(a) { return `${a?.vendor || 'Vendor'} ${a?.vendorRawCode || a?.vendorCode || '—'}`; }
function vendorMappingStatus(a) { const meta = alertCodeMeta(a); const raw = `${a?.vendor || ''} ${a?.vendorRawCode || a?.vendorCode || ''}`.toLowerCase(); return (meta.vendorMappings || []).some(x => raw && x.toLowerCase().includes(String(a?.vendorRawCode || a?.vendorCode || '').toLowerCase())) ? 'Mapped' : 'Mapped by policy'; }
function checkStatusClass(status) {
    const v = String(status || '').toLowerCase();
    if (v.includes('done') || v.includes('pass') || v.includes('found') || v.includes('mapped'))
        return 'success';
    if (v.includes('fail') || v.includes('missing') || v.includes('unknown') || v.includes('blocked'))
        return 'danger';
    if (v.includes('skip'))
        return 'muted';
    return 'warning';
}
function renderCheckRow({ label, hint = '', status = 'Pending', checked = false, input = false, index = '', required = false }) {
    const cls = checkStatusClass(status);
    const req = required ? '<em>Required</em>' : '';
    const control = input
        ? `<input class="sop-check-input" data-index="${index}" type="checkbox" ${checked ? 'checked' : ''}>`
        : `<span class="check-indicator ${cls}">${cls === 'success' ? '✓' : cls === 'danger' ? '!' : cls === 'muted' ? '–' : '•'}</span>`;
    return `<label class="check-row ${cls} ${checked ? 'checked' : ''}">${control}<div><strong>${label}</strong><small>${hint}</small></div><span class="check-status ${cls}">${status}</span>${req}</label>`;
}
function renderMappingValidation(a) {
    const meta = alertCodeMeta(a);
    const mapped = vendorMappingStatus(a);
    const items = [
        { label: 'Vendor code received', hint: vendorCodeLabel(a), status: a.vendorRawCode || a.vendorCode ? 'Done' : 'Missing', checked: !!(a.vendorRawCode || a.vendorCode), required: true },
        { label: 'Zentrid code assigned', hint: a.fleetCode || 'No canonical code', status: a.fleetCode ? 'Done' : 'Missing', checked: !!a.fleetCode, required: true },
        { label: 'Mapping found in dictionary', hint: (meta.vendorMappings || []).slice(0, 3).join(' · ') || 'No known mapping', status: mapped, checked: true, required: true },
        { label: 'Policy available', hint: meta.policy || 'No policy configured', status: meta.policy ? 'Done' : 'Missing', checked: !!meta.policy, required: true },
        { label: 'SLA / case workflow', hint: `${a.priority || 'P?'} · ${a.sla || 'No SLA'}`, status: a.sla ? 'Done' : 'Pending', checked: !!a.sla }
    ];
    return `<div class="check-list validation-check-list-v86">${items.map(renderCheckRow).join('')}</div>`;
}
function currentAlertTenantScope() {
    return String(FleetLayout?.state?.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace').trim() || 'Tenant workspace';
}
function normalizedAlertTenantToken(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function alertBelongsToTenant(alert, tenantName = currentAlertTenantScope()) {
    if (!alert.tenant)
        return true;
    return normalizedAlertTenantToken(alert.tenant) === normalizedAlertTenantToken(tenantName);
}
function normalizeAlertTenant(alert, tenantName = currentAlertTenantScope()) {
    const sourceLabel = String(alert.integration || alert.source || alert.vendor || 'Vendor source').replace(/^.*?\s—\s/, '');
    const normalized = {
        ...alert,
        tenant: tenantName,
        integration: `${tenantName} — ${sourceLabel}`,
        timeline: [...alert.timeline],
        related: { ...alert.related }
    };
    return normalized;
}
function alertRegistryRecords() {
    const tenantName = currentAlertTenantScope();
    const liveRows = Array.isArray(window.ZentridLiveAlerts)
        ? window.ZentridLiveAlerts.filter(alert => alert?.dataOrigin === 'live')
        : [];
    if (!liveRows.length)
        return [];
    const withTenantMetadata = liveRows.filter(alert => Boolean(String(alert.tenant || '').trim()));
    const matched = withTenantMetadata.length ? liveRows.filter(alert => alertBelongsToTenant(alert, tenantName)) : liveRows;
    // The authenticated endpoint owns the tenant boundary. UI normalization must not erase a valid
    // operational inbox when backend tenant labels are generic or unavailable.
    const scoped = withTenantMetadata.length && matched.length ? matched : liveRows;
    return scoped.map(alert => normalizeAlertTenant(alert, tenantName));
}
function tenantScopedAlerts() {
    return alertRegistryRecords();
}
function alertTone(value) {
    const v = String(value || '').toLowerCase();
    if (v.includes('critical') || v.includes('p1') || v.includes('open') || v.includes('escalated'))
        return 'danger';
    if (v.includes('high') || v.includes('warning') || v.includes('acknowledged') || v.includes('p2') || v.includes('medium'))
        return 'warning';
    return 'success';
}
function getAlertContext() {
    try {
        const context = JSON.parse(localStorage.getItem('zentrid_alert_context') || '{}');
        delete context.tenant;
        return context;
    }
    catch {
        return {};
    }
}
function setAlertContextFromQuery() {
    const params = new URLSearchParams(location.search);
    const ctx = {};
    ['plantId', 'deviceId', 'status', 'severity'].forEach(k => {
        const value = params.get(k);
        if (value)
            ctx[k] = value;
    });
    if (Object.keys(ctx).length)
        localStorage.setItem('zentrid_alert_context', JSON.stringify(ctx));
}
function clearAlertContext() { localStorage.removeItem('zentrid_alert_context'); }
function filteredAlerts() {
    const ctx = getAlertContext();
    const severity = document.getElementById('severityFilter')?.value || ctx.severity || 'All';
    const status = document.getElementById('statusFilter')?.value || ctx.status || 'All';
    const plant = document.getElementById('plantFilter')?.value || 'All';
    const vendor = document.getElementById('vendorFilter')?.value || 'All';
    const q = (document.getElementById('alertSearch')?.value || '').trim().toLowerCase();
    return tenantScopedAlerts().filter(a => (!ctx.plantId || a.plantId === ctx.plantId) &&
        (!ctx.deviceId || a.deviceId === ctx.deviceId) &&
        (severity === 'All' || alertCodeMeta(a).severity === severity) &&
        (status === 'All' || alertDisplayStatus(a) === status) &&
        (plant === 'All' || a.plant === plant || a.plantId === plant) &&
        (vendor === 'All' || a.vendor === vendor) &&
        (!q || `${a.title} ${a.plant} ${a.device} ${a.vendor} ${a.id} ${a.category} ${a.fleetCode || ''} ${a.vendorCode || ''} ${a.vendorRawCode || ''} ${a.vendorMessage || ''}`.toLowerCase().includes(q)));
}
function alertKpis(items = filteredAlerts()) {
    const critical = items.filter(a => alertCodeMeta(a).severity === 'Critical').length;
    const fault = items.filter(a => alertCodeMeta(a).severity === 'Fault').length;
    const warning = items.filter(a => alertCodeMeta(a).severity === 'Warning').length;
    const open = items.filter(a => alertDisplayStatus(a) === 'Open').length;
    const acknowledged = items.filter(a => alertDisplayStatus(a) === 'Acknowledged').length;
    const escalated = items.filter(a => alertDisplayStatus(a) === 'Escalated').length;
    return `
    <section class="kpi-grid compact-kpis alert-kpis">
      <article class="kpi-card red"><div class="kpi-label">Critical</div><div class="kpi-value">${critical}</div><div class="kpi-delta">Immediate escalation</div></article>
      <article class="kpi-card yellow"><div class="kpi-label">Fault</div><div class="kpi-value">${fault}</div><div class="kpi-delta">Operational incident</div></article>
      <article class="kpi-card cyan"><div class="kpi-label">Warning</div><div class="kpi-value">${warning}</div><div class="kpi-delta">Monitor / validate</div></article>
      <article class="kpi-card violet"><div class="kpi-label">Escalated</div><div class="kpi-value">${escalated}</div><div class="kpi-delta">Management visible</div></article>
    </section>`;
}
function renderAlertContextBanner() {
    const ctx = getAlertContext();
    if (!ctx.plantId && !ctx.deviceId)
        return '';
    const parts = [];
    if (ctx.plantId)
        parts.push(`Plant ID: ${ctx.plantId}`);
    if (ctx.deviceId)
        parts.push(`Device ID: ${ctx.deviceId}`);
    return `<section class="context-banner glass-card"><div><strong>Filtered alert context</strong><small>${parts.join(' · ')}</small></div><button class="secondary-action" id="clearAlertContext">Clear context</button></section>`;
}
function renderAlertFilters() {
    const ctx = getAlertContext();
    const queryState = window.FleetRegistryQuery?.read('alerts');
    const selected = {
        severity: queryState?.params.severity || ctx.severity || 'All',
        status: queryState?.params.alertStatus || ctx.status || 'All',
        plant: queryState?.params.plant || 'All',
        vendor: queryState?.params.vendor || 'All',
        search: queryState?.search || ''
    };
    const scopedAlerts = tenantScopedAlerts();
    const opt = (value, current) => `<option ${value === current ? 'selected' : ''}>${value}</option>`;
    return `
    <section class="filter-bar glass-card alert-filter-bar">
      <label>Severity<select id="severityFilter">${['All', 'Critical', 'Fault', 'Warning'].map(x => opt(x, selected.severity)).join('')}</select></label>
      <label>Status<select id="statusFilter">${['All', 'Open', 'Acknowledged', 'Escalated', 'Resolved'].map(x => opt(x, selected.status)).join('')}</select></label>
      <label>Plant<select id="plantFilter">${['All', ...Array.from(new Set(scopedAlerts.map(a => a.plant)))].map(x => opt(x, selected.plant)).join('')}</select></label>
      <label>Vendor<select id="vendorFilter">${['All', ...Array.from(new Set(scopedAlerts.map(a => a.vendor).filter(Boolean)))].map(x => opt(x, selected.vendor)).join('')}</select></label>
      <label>Search<input id="alertSearch" value="${String(selected.search).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" placeholder="Search current page by alert, plant, device..." /></label>
    </section>
    <div id="alertFilterScopeV126">${window.FleetRegistryQuery?.filterScopeHtml('alerts') || ''}</div>`;
}
function alertRow(a) {
    const meta = alertCodeMeta(a);
    return `
    <div class="data-row alert-row" data-alert-id="${a.id}">
      <div>${FleetDataSource.badge(a, 'alert')}<strong>${a.fleetCode || '—'}</strong><small>Vendor: ${vendorCodeLabel(a)}</small></div>
      <div><strong>${meta.name || a.title}</strong><small>${a.id} · ${meta.category || a.category} · ${a.priority}</small></div>
      <div><strong>${a.plant}</strong><small>${a.tenant} · ${a.device}</small></div>
      <div><strong>${a.vendor}</strong><small>${a.source}</small></div>
      <span class="badge ${alertTone(meta.severity)}">${meta.severity}</span>
      <span class="badge ${alertTone(alertDisplayStatus(a))}">${alertDisplayStatus(a)}</span>
      <div><strong>${a.created}</strong><small>${a.sla}</small></div>
      <div class="row-actions kebabified"><div class="kebab-wrap global-action-wrap"><button type="button" class="kebab-btn" data-action="menu" aria-label="Open actions" title="Actions">⋮</button><div class="kebab-menu global-action-menu"><button data-action="open-alert" data-id="${a.id}" type="button">Open</button><button data-action="ack" data-id="${a.id}" data-permission-action="acknowledge" data-permission-resource="alert" data-permission-status="${alertDisplayStatus(a)}" type="button" ${/acknowledged|resolved|closed/i.test(alertDisplayStatus(a)) ? 'disabled data-permission-base-disabled="true"' : ''} title="Acknowledge this alert in the Alert Registry">Ack</button></div></div></div>
    </div>`;
}
var ZentridAlertPager = window.ZentridAlertPager || (window.ZentridAlertPager = { page: 1, size: 50 });
function alertPageSlice(items) {
    const serverPagination = window.FleetRegistryQuery?.pagination('alerts');
    if (serverPagination) {
        return {
            total: serverPagination.totalCount,
            pages: serverPagination.totalPages,
            page: serverPagination.page,
            start: (serverPagination.page - 1) * serverPagination.pageSize,
            end: Math.min(serverPagination.page * serverPagination.pageSize, serverPagination.totalCount),
            rows: items
        };
    }
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / ZentridAlertPager.size));
    ZentridAlertPager.page = Math.min(Math.max(1, Number(ZentridAlertPager.page) || 1), pages);
    const start = (ZentridAlertPager.page - 1) * ZentridAlertPager.size;
    return { total, pages, page: ZentridAlertPager.page, start, end: Math.min(start + ZentridAlertPager.size, total), rows: items.slice(start, start + ZentridAlertPager.size) };
}
function alertPagerHtml(state) {
    const serverPagination = window.FleetRegistryQuery?.pagination('alerts');
    if (serverPagination)
        return window.FleetRegistryQuery?.pagerHtml('alerts', state.rows.length) || '';
    if (state.total <= ZentridAlertPager.size)
        return `<div class="pagination-bar"><span>Showing ${state.total} row(s)</span></div>`;
    return `<div class="pagination-bar"><span>Showing ${state.start + 1}-${state.end} of ${state.total}</span><div class="row-actions"><button data-alert-page="prev" ${state.page <= 1 ? 'disabled' : ''}>Prev</button><strong>Page ${state.page} / ${state.pages}</strong><button data-alert-page="next" ${state.page >= state.pages ? 'disabled' : ''}>Next</button></div></div>`;
}
function renderAlertRowsPage(items) {
    const state = alertPageSlice(items);
    return `${alertPagerHtml(state)}<div class="data-table alerts-table"><div class="data-head alert-head"><span>Alert Codes</span><span>Alert</span><span>Plant / Device</span><span>Source</span><span>Severity</span><span>Status</span><span>SLA</span><span>Actions</span></div><div id="alertsRows">${state.rows.length ? state.rows.map(alertRow).join('') : '<div class="empty-state">No alerts match current filters.</div>'}</div></div>${alertPagerHtml(state)}`;
}
function renderAlertsTable(items = filteredAlerts()) {
    return `
    <section class="panel glass-card">
      <div class="panel-head">
        <div><h2>Operational Alert Inbox</h2><p>Normalized alerts linked to tenant, plant, device, telemetry source and SLA state.</p></div>
        <div class="inline-actions"><button class="secondary-action" id="resetAlertFilters">Reset Filters</button><button class="primary-action" id="exportAlerts">Export</button></div>
      </div>
      <div id="alertsTableHost">${renderAlertRowsPage(items)}</div>
    </section>`;
}
function selectedAlert() {
    const scoped = tenantScopedAlerts();
    const params = new URLSearchParams(location.search);
    const selectedId = String(params.get('id') || localStorage.getItem('zentrid_selected_alert') || '').trim();
    if (selectedId) {
        const selected = scoped.find(item => String(item.id) === selectedId);
        if (!selected)
            throw new Error(`No API alert matches the selected ID: ${selectedId}`);
        return selected;
    }
    const firstAlert = scoped[0];
    if (!firstAlert)
        throw new Error('No API alerts are available in the current tenant scope.');
    return firstAlert;
}
function openAlert(id) {
    localStorage.setItem('zentrid_selected_alert', id);
    location.href = `${FleetLayout.pathFor('alert-detail')}?id=${encodeURIComponent(id)}`;
}
function applyAlertFilters(resetPage = true, emitQuery = false) {
    if (resetPage && !window.FleetRegistryQuery?.pagination('alerts'))
        ZentridAlertPager.page = 1;
    const kpiWrap = document.getElementById('alertKpiWrap');
    const host = document.getElementById('alertsTableHost');
    const items = filteredAlerts();
    if (kpiWrap)
        FleetRuntimeStability.replaceHtml(kpiWrap, alertKpis(items));
    if (host)
        FleetRuntimeStability.replaceHtml(host, renderAlertRowsPage(items));
    const severity = document.getElementById('severityFilter')?.value || 'All';
    const status = document.getElementById('statusFilter')?.value || 'All';
    const plant = document.getElementById('plantFilter')?.value || 'All';
    const vendor = document.getElementById('vendorFilter')?.value || 'All';
    const search = (document.getElementById('alertSearch')?.value || '').trim();
    window.FleetRegistryQuery?.update('alerts', { page: emitQuery ? 1 : undefined, search: search || null, severity: severity === 'All' ? null : severity, alertStatus: status === 'All' ? null : status, tenant: null, plant: plant === 'All' ? null : plant, vendor: vendor === 'All' ? null : vendor }, { replace: true, emit: emitQuery });
    const scope = document.getElementById('alertFilterScopeV126');
    if (scope)
        scope.innerHTML = window.FleetRegistryQuery?.filterScopeHtml('alerts') || '';
}
function renderAlertsPage() {
    setAlertContextFromQuery();
    const scopedAlerts = tenantScopedAlerts();
    const activeAlerts = scopedAlerts.filter(alert => alertDisplayStatus(alert) !== 'Resolved');
    const affectedPlants = new Set(activeAlerts.map(alert => alert.plantId || alert.plant)).size;
    return `
    <section class="page-hero">
      <div><p class="eyebrow">Tenant Admin · Operations</p><h1>Alerts & Events</h1><p class="muted">Normalized operational alerts for ${currentAlertTenantScope()}, linked to your plants, devices, vendor sources and SLA state.</p></div>
      <button class="freshness-card" onclick="FleetLayout.toast('Alerts data refreshed')"><span class="pulse"></span><div><strong>Alert freshness</strong><small>Updated 1 min ago</small></div></button>
    </section>
    <section class="context-bar glass-card alert-context-bar-v142">
      <button class="ctx-item" type="button"><span>Tenant Scope</span><strong>${currentAlertTenantScope()}</strong></button>
      <button class="ctx-item" type="button"><span>Active Alerts</span><strong>${activeAlerts.length}</strong></button>
      <button class="ctx-item" type="button"><span>Unacknowledged</span><strong>${activeAlerts.filter(alert => alertDisplayStatus(alert) === 'Open').length}</strong></button>
      <button class="ctx-item" type="button"><span>Affected Plants</span><strong>${affectedPlants}</strong></button>
    </section>
    ${renderAlertContextBanner()}
    <div id="alertKpiWrap">${alertKpis()}</div>
    ${renderAlertFilters()}
    ${renderAlertsTable()}`;
}
function currentAlertActor() {
    const session = ZentridPlatformAPI.auth.session();
    return String(session?.user?.username || session?.user?.email || 'tenantadmin');
}
function alertAcknowledgeLocked(a) {
    return /acknowledged|resolved|closed/i.test(alertDisplayStatus(a));
}
async function acknowledgeAlertViaRegistry(a, button) {
    if (alertAcknowledgeLocked(a))
        return;
    const permission = window.FleetActionPermissions?.decide?.({ action: 'acknowledge', resource: 'alert', status: a.status, origin: a.dataOrigin || 'mixed' });
    if (permission && !permission.allowed)
        throw new Error(permission.reason);
    if (!window.FleetAPIMutations?.alerts?.acknowledge)
        throw new Error('Alert mutation layer is not available on this page.');
    const previousText = button?.textContent || '';
    if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Acknowledging…';
    }
    try {
        const result = await FleetAPIMutations.alerts.acknowledge(a.id, {
            actor: currentAlertActor(),
            comment: 'Acknowledged from Tenant Admin Alert Detail'
        });
        FleetAPIMutations.unwrap(result);
        a.status = 'Acknowledged';
        window.FleetAPIRepositories?.cache.invalidate('alerts');
        window.dispatchEvent(new CustomEvent('zentrid:data-refresh-request', { detail: { resource: 'alerts', forceRefresh: true } }));
    }
    finally {
        if (button && document.contains(button)) {
            button.removeAttribute('aria-busy');
            button.disabled = false;
            button.textContent = previousText;
        }
    }
}
function activeAlertDetailTab() {
    return document.querySelector('.alert-detail-nav-v71 button.active')?.dataset.tab || 'summary';
}
function rerenderAlertDetailState(a) {
    const activeTab = activeAlertDetailTab();
    const hero = document.querySelector('.alert-detail-hero');
    if (hero)
        hero.outerHTML = alertDetailHero(a, alertDetailModel(a));
    const kpis = document.querySelector('.alert-detail-kpis');
    if (kpis) {
        kpis.outerHTML = `<section class="kpi-grid detail-kpis alert-detail-kpis">
      <article class="kpi-card ${a.severity === 'Critical' ? 'red' : 'yellow'}"><span>Severity</span><strong>${a.severity}</strong><small>${a.priority}</small></article>
      <article class="kpi-card"><span>Status</span><strong>${alertDisplayStatus(a)}</strong><small>${a.sla}</small></article>
      <article class="kpi-card"><span>Owner</span><strong>${a.owner}</strong><small>Current assignment</small></article>
      <article class="kpi-card"><span>Source</span><strong>${a.vendor}</strong><small>${a.source}</small></article>
    </section>`;
    }
    const content = document.getElementById('alertDetailContent');
    if (content)
        content.innerHTML = alertDetailTab(a, activeTab);
    bindAlertDetailActions(a);
    window.FleetActionPermissions?.refresh?.(document);
}
function wireAlertsPage() {
    document.querySelector('.main-content')?.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target)
            return;
        const ack = target.closest('[data-action="ack"]');
        if (ack) {
            e.preventDefault();
            e.stopPropagation();
            const id = ack.dataset.id || '';
            const record = tenantScopedAlerts().find(alert => alert.id === id);
            if (record)
                void acknowledgeAlertViaRegistry(record, ack).then(() => {
                    FleetLayout.toast(`Alert ${id} acknowledged by backend`);
                    applyAlertFilters(false);
                }).catch(error => FleetLayout.toast(error instanceof Error ? error.message : `Unable to acknowledge ${id}`));
            return;
        }
        const open = target.closest('[data-action="open-alert"]') || target.closest('.alerts-table .data-row');
        if (open) {
            const id = open.dataset.id || open.dataset.alertId || open.closest('[data-alert-id]')?.dataset.alertId;
            if (id)
                openAlert(id);
            return;
        }
        const pageBtn = target.closest('[data-alert-page]');
        if (pageBtn && !window.FleetRegistryQuery?.pagination('alerts')) {
            ZentridAlertPager.page += pageBtn.dataset.alertPage === 'next' ? 1 : -1;
            applyAlertFilters(false);
            return;
        }
        if (target.closest('#resetAlertFilters')) {
            ['severityFilter', 'statusFilter', 'plantFilter', 'vendorFilter'].forEach(id => { const el = document.getElementById(id); if (el)
                el.value = 'All'; });
            const s = document.getElementById('alertSearch');
            if (s)
                s.value = '';
            window.FleetRegistryQuery?.update('alerts', { search: null, severity: null, alertStatus: null, tenant: null, plant: null, vendor: null }, { replace: true, emit: false });
            applyAlertFilters(true);
        }
        if (target.closest('#clearAlertContext')) {
            clearAlertContext();
            location.reload();
        }
        if (target.closest('#exportAlerts'))
            FleetLayout.toast('Alert export queued');
    });
    document.getElementById('alertSearch')?.addEventListener('input', () => FleetRuntimeStability.debounce('registry:alerts:search', () => applyAlertFilters(true, true), 220));
    ['severityFilter', 'statusFilter', 'plantFilter', 'vendorFilter'].forEach(id => document.getElementById(id)?.addEventListener('change', () => applyAlertFilters(true)));
}
function alertDetailEmptyState(title, detail) {
    return `<div class="empty-state"><strong>${title}</strong><small>${detail}</small></div>`;
}
function alertRawRecord(a) {
    return a.raw && typeof a.raw === 'object' ? a.raw : {};
}
function alertNestedValue(value, path) {
    return path.split('.').reduce((current, key) => {
        if (!current || typeof current !== 'object')
            return undefined;
        return current[key];
    }, value);
}
function alertApiValue(a, paths, fallback = '—') {
    const raw = alertRawRecord(a);
    for (const path of paths) {
        const value = alertNestedValue(raw, path);
        if (value !== undefined && value !== null && String(value).trim())
            return String(value).trim();
    }
    return fallback;
}
function alertApiArray(a, paths) {
    const raw = alertRawRecord(a);
    for (const path of paths) {
        const value = alertNestedValue(raw, path);
        if (Array.isArray(value))
            return value;
    }
    return [];
}
function wireAlertDetailPage() {
    let alert;
    try {
        alert = selectedAlert();
    }
    catch {
        return;
    }
    document.querySelector('.freshness-card')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('zentrid:data-refresh-request', { detail: { resource: 'alert-detail', forceRefresh: true } }));
    });
    document.querySelectorAll('.alert-detail-nav-v71 button').forEach(button => {
        button.onclick = () => {
            document.querySelectorAll('.alert-detail-nav-v71 button').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            const content = document.getElementById('alertDetailContent');
            if (content)
                content.innerHTML = alertDetailTab(alert, button.dataset.tab || 'summary');
            bindAlertDetailActions(alert);
        };
    });
    bindAlertDetailActions(alert);
}
function bindAlertDetailActions(a) {
    const openPlant = document.getElementById('openAlertPlant');
    if (openPlant) {
        openPlant.disabled = !a.plantId || a.plantId === '—';
        openPlant.onclick = () => {
            if (!a.plantId || a.plantId === '—')
                return;
            localStorage.setItem('zentrid_selected_plant', a.plantId);
            location.href = `${FleetLayout.pathFor('plant-detail')}?id=${encodeURIComponent(a.plantId)}`;
        };
    }
    const openDevice = document.getElementById('openAlertDevice');
    const heroDevice = document.getElementById('openAlertDeviceFromHero');
    [openDevice, heroDevice].forEach(button => {
        if (!button)
            return;
        button.disabled = !a.deviceId || a.deviceId === '—';
        button.onclick = () => {
            if (!a.deviceId || a.deviceId === '—')
                return;
            localStorage.setItem('zentrid_selected_device', a.deviceId);
            location.href = `${FleetLayout.pathFor('device-detail')}?id=${encodeURIComponent(a.deviceId)}`;
        };
    });
    const telemetry = document.getElementById('openAlertTelemetry');
    if (telemetry) {
        const metric = a.related?.telemetryMetric;
        telemetry.disabled = !metric || metric === '—';
        telemetry.onclick = () => {
            if (!metric || metric === '—')
                return;
            localStorage.setItem('zentrid_telemetry_context', JSON.stringify({ tenant: a.tenant, plant: a.plant, device: a.device, metric, range: localStorage.getItem('zentrid_time') || 'Last 24h', layer: 'Normalized' }));
            location.href = FleetLayout.pathFor('telemetry');
        };
    }
    document.querySelectorAll('[data-alert-acknowledge]').forEach(button => {
        const locked = alertAcknowledgeLocked(a);
        button.disabled = locked;
        button.dataset.permissionBaseDisabled = locked ? 'true' : 'false';
        button.title = locked ? `Alert is already ${alertDisplayStatus(a)}.` : 'Acknowledge this alert in the canonical Alert Registry.';
        button.onclick = () => {
            if (button.disabled)
                return;
            void acknowledgeAlertViaRegistry(a, button).then(() => {
                FleetLayout.toast(`Alert ${a.id} acknowledged by backend`);
                rerenderAlertDetailState(a);
            }).catch(error => FleetLayout.toast(error instanceof Error ? error.message : `Unable to acknowledge ${a.id}`));
        };
    });
    document.querySelectorAll('[data-alert-contract-pending]').forEach(button => {
        button.disabled = true;
        button.dataset.permissionBaseDisabled = 'true';
        button.title = 'The Alert Registry endpoint exists, but the current Swagger snapshot does not publish the request DTO/operator fields. No guessed payload is sent.';
    });
    window.FleetActionPermissions?.refresh?.(document);
}
function alertDisplayStatus(a) {
    return a.status || 'Unknown';
}
function alertIncidentCaseBlock(a) {
    const caseId = a.related?.caseId && a.related.caseId !== '—' ? a.related.caseId : alertApiValue(a, ['caseId', 'incidentCaseId', 'vendorExtensions.caseId'], '—');
    if (caseId === '—')
        return alertDetailEmptyState('No incident case returned', 'The current alert API response does not include a linked incident case, task or work order.');
    return `<section class="alert-incident-case glass-card"><div class="incident-head"><div><span class="eyebrow">Incident Case</span><h2>${caseId}</h2><p class="muted">Case information returned by the backend.</p></div><span class="badge ${alertTone(alertDisplayStatus(a))}">${alertDisplayStatus(a)}</span></div><div class="incident-grid"><article><span>Responsible</span><strong>${alertApiValue(a, ['owner', 'assignedTo', 'assignee', 'vendorExtensions.owner'], a.owner || '—')}</strong><small>API assignment</small></article><article><span>Priority / SLA</span><strong>${a.priority || '—'}</strong><small>${a.sla || '—'}</small></article><article><span>Task</span><strong>${a.related?.taskId || '—'}</strong><small>Backend relation</small></article></div></section>`;
}
function alertCaseTimeline(a) {
    const rows = alertApiArray(a, ['caseTimeline', 'incidentTimeline', 'vendorExtensions.caseTimeline']);
    if (!rows.length)
        return alertDetailEmptyState('No case timeline returned', 'The current alert API response does not include incident workflow history.');
    return `<div class="incident-timeline">${rows.map((row, index) => {
        const item = row && typeof row === 'object' ? row : { description: row };
        return `<div class="incident-step done"><b>${index + 1}</b><div><strong>${String(item.title || item.step || item.status || 'Event')}</strong><span>${String(item.time || item.timestamp || item.occurredAt || '—')}</span><small>${String(item.description || item.message || '')}</small></div></div>`;
    }).join('')}</div>`;
}
function alertSopChecklistBlock(a) {
    const steps = alertApiArray(a, ['sopSteps', 'checklist', 'vendorExtensions.sopSteps', 'vendorExtensions.checklist']);
    if (!steps.length)
        return `<section class="alert-sop-card glass-card">${alertDetailEmptyState('No SOP checklist returned', 'The current alert API response does not include a procedure or checklist. No browser-local SOP progress is created.')}</section>`;
    return `<section class="alert-sop-card glass-card"><div class="sop-head"><div><span class="eyebrow">SOP Checklist</span><h2>${alertApiValue(a, ['sopTitle', 'procedureName', 'vendorExtensions.sopTitle'], 'Backend procedure')}</h2><p class="muted">Read-only checklist returned by the backend.</p></div></div><div class="sop-checklist">${steps.map((step, index) => {
        const item = step && typeof step === 'object' ? step : { label: step };
        const done = Boolean(item.done || item.completed || item.status === 'Done');
        return renderCheckRow({ label: String(item.label || item.title || item.name || `Step ${index + 1}`), hint: String(item.description || item.note || ''), status: done ? 'Done' : String(item.status || 'Pending'), checked: done, required: Boolean(item.required) });
    }).join('')}</div></section>`;
}
function alertDetailModel(a) {
    const status = alertDisplayStatus(a);
    const resolved = /resolved|recovered|closed/i.test(status);
    const reason = a.probableCause && !/no backend probable cause/i.test(a.probableCause) ? [a.probableCause] : [];
    const suggestion = a.recommendation && !/review source data/i.test(a.recommendation) ? [a.recommendation] : [];
    return {
        levelLabel: a.severity || 'Unknown',
        occurrenceStatus: resolved ? 'Recovered' : status || 'Unknown',
        confirmStatus: /acknowledged|escalated|resolved|closed/i.test(status) ? 'Confirmed' : 'Unconfirmed',
        recoveryTime: alertApiValue(a, ['recoveredAtUtc', 'resolvedAtUtc', 'closedAtUtc', 'vendorExtensions.recoveredAtUtc'], ''),
        duration: a.age || '—',
        alertType: a.category || '—',
        plantName: a.plant || '—',
        alertTime: a.created || '—',
        component: a.deviceType || '—',
        deviceLabel: `${a.device || '—'}${a.deviceId && a.deviceId !== '—' ? ` (${a.deviceId})` : ''}`,
        reason,
        suggestion,
        curveMetric: a.related?.telemetryMetric || '—',
        samples: []
    };
}
function alertDetailHero(a, m) {
    const levelClass = m.levelLabel === 'Fault' ? 'danger' : 'warning';
    const statusClass = m.occurrenceStatus === 'Recovered' ? 'success' : 'danger';
    return `
    <section class="alert-detail-hero glass-card">
      <div class="alert-detail-title-row">
        <div class="alert-title-stack">
          <div class="alert-title-line"><span class="alert-level-pill ${levelClass}">${m.levelLabel}</span><h1>${a.title}</h1><span class="alert-status-pill ${statusClass}"><i></i>${m.occurrenceStatus}</span></div>
          <button class="alert-device-link" id="openAlertDeviceFromHero" type="button">▣ ${m.deviceLabel}</button>
        </div>
        <button class="secondary-action" onclick="location.href=FleetLayout.pathFor('alerts')">Back to Alerts</button>
      </div>
      <div class="alert-detail-meta-grid">
        <div><span>Plant Name</span><strong>${m.plantName}</strong></div>
        <div><span>Alert Time</span><strong>${m.alertTime}</strong></div>
        <div><span>Devices / Components</span><strong>${m.component}</strong></div>
        <div><span>Duration</span><strong>${m.duration}</strong></div>
        <div><span>Alert Type</span><strong>${m.alertType}</strong></div>
        <div><span>Zentrid Alert Code</span><strong>${a.fleetCode || '—'}</strong></div>
        <div><span>Unified Category</span><strong>${alertCodeMeta(a).category}</strong></div>
        <div><span>Device Scope</span><strong>${alertCodeMeta(a).deviceScope}</strong></div>
        <div><span>Vendor Error Code</span><strong>${vendorCodeLabel(a)}</strong></div>
        <div><span>Confirm Status</span><strong class="${m.confirmStatus === 'Confirmed' ? 'text-success' : 'text-warning'}">${m.confirmStatus}</strong><button id="detailAck" class="mini-inline-action" data-alert-acknowledge data-permission-action="acknowledge" data-permission-resource="alert" data-permission-status="${alertDisplayStatus(a)}" type="button" ${alertAcknowledgeLocked(a) ? 'disabled data-permission-base-disabled="true"' : ''}>Acknowledge</button></div>
        ${m.recoveryTime ? `<div><span>Recovery Time</span><strong>${m.recoveryTime}</strong></div>` : ''}
      </div>
    </section>`;
}
function alertReasonBlock(title, icon, items) {
    return `<section class="alert-explain-card glass-card"><div class="alert-section-title"><span>${icon}</span><h3>${title}</h3></div><ol class="alert-numbered-list">${items.map(x => `<li>${x}</li>`).join('')}</ol></section>`;
}
function alertCurveBlock(_a, m) {
    return `<section class="alert-curve-card glass-card"><div class="alert-section-title"><span>⌁</span><h3>Curve</h3><small>${m.curveMetric !== '—' ? m.curveMetric : 'Telemetry history'}</small></div>${alertDetailEmptyState('No curve samples returned', 'The current alert API response does not include time-series samples around the alert occurrence.')}</section>`;
}
function renderAlertDetailContent(a) {
    const m = alertDetailModel(a);
    return `
    <section class="page-hero alert-detail-page-hero">
      <div><p class="eyebrow">Tenant Admin · Alerts ${FleetDataSource.badge(a, 'alert', true)}</p><h1>Alert Details</h1><p class="muted">Source-normalized tenant alert workspace populated only by the backend API.</p></div>
      <button class="freshness-card" id="refreshAlertDetail" type="button"><span class="pulse"></span><div><strong>Refresh</strong><small>${a.updated} · ${a.source}</small></div></button>
    </section>
    ${alertDetailHero(a, m)}
    <section class="kpi-grid detail-kpis alert-detail-kpis">
      <article class="kpi-card ${a.severity === 'Critical' ? 'red' : 'yellow'}"><span>Severity</span><strong>${a.severity}</strong><small>${a.priority}</small></article>
      <article class="kpi-card"><span>Status</span><strong>${alertDisplayStatus(a)}</strong><small>${a.sla}</small></article>
      <article class="kpi-card"><span>Owner</span><strong>${a.owner}</strong><small>Current assignment</small></article>
      <article class="kpi-card"><span>Source</span><strong>${a.vendor}</strong><small>${a.source}</small></article>
    </section>
    <section class="alert-detail-layout-v71 detail-layout-v58 detail-layout-standard">
      <aside class="setup-rail alert-detail-nav-v71" aria-label="Alert detail sections">
        <button class="active" type="button" data-tab="summary"><span>Overview</span></button>
        <button type="button" data-tab="classification"><span>Classification</span></button>
        <button type="button" data-tab="case"><span>Incident Case</span></button>
        <button type="button" data-tab="sop"><span>SOP Checklist</span></button>
        <button type="button" data-tab="timeline"><span>Timeline</span></button>
        <button type="button" data-tab="related"><span>Related Objects</span></button>
        <button type="button" data-tab="activity"><span>Activity</span></button>
      </aside>
      <div class="glass-card detail-main-v58 alert-detail-main-v71" id="alertDetailContent">${alertDetailTab(a, 'summary')}</div>
    </section>`;
}
function alertDetailTab(a, tab) {
    const model = alertDetailModel(a);
    if (tab === 'classification') {
        const meta = alertCodeMeta(a);
        return `<div class="split-grid alert-classification-tab"><div class="panel-lite"><h3>Zentrid Unified Code</h3><div class="info-grid"><div><span>Zentrid Code</span><strong>${a.fleetCode || '—'}</strong></div><div><span>Unified Name</span><strong>${meta.name}</strong></div><div><span>Category</span><strong>${meta.category}</strong></div><div><span>Severity</span><strong>${meta.severity}</strong></div><div><span>Device Scope</span><strong>${meta.deviceScope}</strong></div><div><span>Meaning</span><strong>${meta.meaning}</strong></div></div></div><div class="panel-lite"><div class="section-title-v17"><h3>Vendor Source Mapping</h3><span class="badge info">Read-only</span></div><div class="info-grid"><div><span>Vendor</span><strong>${a.vendor}</strong></div><div><span>Source Platform</span><strong>${a.source}</strong></div><div><span>Received Vendor Code</span><strong>${vendorCodeLabel(a)}</strong></div><div><span>Vendor Message</span><strong>${a.vendorMessage || a.title}</strong></div><div><span>Mapping Status</span><strong>${vendorMappingStatus(a)}</strong></div><div><span>Known Mapping</span><strong>${(meta.vendorMappings || []).join(' · ') || '—'}</strong></div><div><span>Integration</span><strong>${a.integration}</strong></div><div><span>Policy</span><strong>${meta.policy}</strong></div></div><div class="vertical-actions"><button onclick="location.href=FleetLayout.pathFor('alerts')">Back to Alerts</button><button data-alert-contract-pending data-permission-action="task" data-permission-resource="alert" type="button" disabled>Create Technical Follow-up</button></div></div><div class="panel-lite full-span-v86"><h3>Mapping Validation Checklist</h3>${renderMappingValidation(a)}</div></div>`;
    }
    if (tab === 'case')
        return `<div class="split-grid incident-case-tab"><div class="panel-lite"><h3>Case Timeline</h3>${alertCaseTimeline(a)}</div><div class="panel-lite"><h3>Case Context</h3>${alertIncidentCaseBlock(a)}</div></div>`;
    if (tab === 'sop')
        return alertSopChecklistBlock(a);
    if (tab === 'timeline') {
        const timeline = Array.isArray(a.timeline) ? a.timeline.filter(Boolean) : [];
        return `<div class="split-grid"><div class="panel-lite"><h3>Event Timeline</h3>${timeline.length ? `<div class="timeline-mini">${timeline.map(item => `<p>${item}</p>`).join('')}</div>` : alertDetailEmptyState('No timeline records returned', 'The current alert API response does not include event history.')}</div><div class="panel-lite"><h3>SLA & Ownership</h3><div class="info-grid"><div><span>SLA</span><strong>${a.sla || '—'}</strong></div><div><span>Owner</span><strong>${a.owner || '—'}</strong></div><div><span>Created</span><strong>${a.created || '—'}</strong></div><div><span>Updated</span><strong>${a.updated || '—'}</strong></div></div></div></div>`;
    }
    if (tab === 'related')
        return `<div class="split-grid"><div class="panel-lite"><h3>Source Context</h3><div class="info-grid"><div><span>Tenant</span><strong>${a.tenant || '—'}</strong></div><div><span>Plant</span><strong>${a.plant || '—'}</strong></div><div><span>Device</span><strong>${a.device || '—'}</strong></div><div><span>Integration</span><strong>${a.integration || '—'}</strong></div><div><span>Telemetry</span><strong>${a.telemetry || '—'}</strong></div><div><span>Metric</span><strong>${a.related?.telemetryMetric || '—'}</strong></div><div><span>Zentrid Alert Code</span><strong>${a.fleetCode || '—'}</strong></div><div><span>Vendor Error Code</span><strong>${vendorCodeLabel(a)}</strong></div></div></div><div class="panel-lite"><h3>Open Related</h3><div class="vertical-actions"><button id="openAlertPlant">Open Plant</button><button id="openAlertDevice">Open Device</button><button id="openAlertTelemetry">Open Telemetry</button><button data-alert-contract-pending data-permission-action="task" data-permission-resource="alert" type="button" disabled>Open Incident Case</button></div></div></div>`;
    if (tab === 'activity')
        return `<div class="split-grid"><div class="panel-lite"><h3>Operational Actions</h3><div class="vertical-actions"><button id="actionAck" data-alert-acknowledge data-permission-action="acknowledge" data-permission-resource="alert" data-permission-status="${alertDisplayStatus(a)}" type="button" ${alertAcknowledgeLocked(a) ? 'disabled data-permission-base-disabled="true"' : ''}>Acknowledge Alert</button><button data-alert-contract-pending data-permission-action="assign" data-permission-resource="alert" type="button" disabled>Assign Owner</button><button data-alert-contract-pending data-permission-action="task" data-permission-resource="alert" type="button" disabled>Create Technical Follow-up</button><button data-alert-contract-pending data-permission-action="escalate" data-permission-resource="alert" type="button" disabled>Escalate</button><button data-alert-contract-pending data-permission-action="resolve" data-permission-resource="alert" type="button" class="danger-action" disabled>Resolve Alert</button></div><small class="muted">Assign, Escalate, Resolve and Create Task are available in the backend API surface, but remain disabled until their request DTO/operator fields are published. FleetOS does not submit fabricated defaults.</small></div><div class="panel-lite"><h3>Activity Log</h3>${alertDetailEmptyState('No activity records returned', 'The current alert API response does not include operator activity or mutation history.')}</div></div>`;
    const reasonBlock = model.reason.length ? alertReasonBlock('Reason', '!', model.reason) : `<section class="alert-explain-card glass-card">${alertDetailEmptyState('No probable cause returned', 'The backend alert record does not include a probable cause.')}</section>`;
    const suggestionBlock = model.suggestion.length ? alertReasonBlock('Suggestion', '✓', model.suggestion) : `<section class="alert-explain-card glass-card">${alertDetailEmptyState('No recommendation returned', 'The backend alert record does not include a recommended action.')}</section>`;
    return `<div class="alert-summary-layout">${reasonBlock}${suggestionBlock}${alertCurveBlock(a, model)}<section class="alert-explain-card glass-card"><div class="alert-section-title"><span>i</span><h3>Operational Context</h3></div><div class="info-grid"><div><span>Category</span><strong>${a.category || '—'}</strong></div><div><span>Severity</span><strong>${a.severity || '—'}</strong></div><div><span>Device Scope</span><strong>${a.deviceType || '—'}</strong></div><div><span>Telemetry</span><strong>${a.telemetry || '—'}</strong></div><div><span>Case</span><strong>${a.related?.caseId || '—'}</strong></div><div><span>Task</span><strong>${a.related?.taskId || '—'}</strong></div><div><span>Zentrid Alert Code</span><strong>${a.fleetCode || '—'}</strong></div><div><span>Vendor Error Code</span><strong>${vendorCodeLabel(a)}</strong></div><div><span>Workflow Policy</span><strong>${alertCodeMeta(a).policy}</strong></div></div></section></div>`;
}
function renderAlertDetailUnavailable(message = 'The selected alert could not be loaded from the backend API.') {
    return `<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Alerts</p><h1>Alert detail unavailable</h1><p class="muted">${message}</p></div><button class="secondary-action" onclick="location.href=FleetLayout.pathFor('alerts')">Back to Alerts</button></section>`;
}
if (location.pathname.endsWith('alert-detail.html') || document.body?.dataset.tenantPage === 'alert-detail') {
    FleetLayout.mount(renderAlertDetailUnavailable('Loading the selected alert from /api/alerts…'));
}
else {
    FleetLayout.mount(renderAlertsPage());
    wireAlertsPage();
}
