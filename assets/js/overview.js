"use strict";
function tenantOverviewEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character] || character));
}
function tenantOverviewElement(element) {
    return element instanceof HTMLElement ? element : null;
}
function tenantOverviewStatusClass(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('critical') || normalized.includes('failed') || normalized.includes('fault') || normalized.includes('offline') || normalized.includes('error'))
        return 'danger';
    if (normalized.includes('high') || normalized.includes('delayed') || normalized.includes('warning') || normalized.includes('stale') || normalized.includes('degraded'))
        return 'warning';
    if (normalized.includes('info'))
        return 'info';
    if (normalized.includes('unknown') || normalized === '—')
        return 'neutral';
    return 'success';
}
function tenantOverviewEmpty(title, message) {
    return `<div class="empty-state zentrid-ux-state zentrid-ux-state-empty" role="status"><strong>${tenantOverviewEscape(title)}</strong><small>${tenantOverviewEscape(message)}</small></div>`;
}
function tenantOverviewKpis() {
    if (!TenantOverviewData.kpis.length) {
        return `<section class="panel glass-card">${tenantOverviewEmpty('Waiting for overview data', 'The dashboard will remain empty until backend endpoints return records.')}</section>`;
    }
    return `<section class="kpi-grid">${TenantOverviewData.kpis.map(kpi => `
    <button class="kpi-card ${tenantOverviewEscape(kpi.tone)} drill" type="button" data-panel="kpi" data-title="${tenantOverviewEscape(kpi.label)}" data-route="${tenantOverviewEscape(kpi.route)}">
      <div class="kpi-icon">${tenantOverviewEscape(kpi.icon)}</div>
      <div class="kpi-label">${tenantOverviewEscape(kpi.label)}</div>
      <div class="kpi-value">${tenantOverviewEscape(kpi.value)}</div>
      <div class="kpi-delta">${tenantOverviewEscape(kpi.delta)}</div>
    </button>`).join('')}</section>`;
}
function tenantOverviewHealthBars() {
    if (!TenantOverviewData.fleetHealth.length) {
        return tenantOverviewEmpty('No plant status data', 'Plant status distribution appears only when the plant API returns status fields.');
    }
    return TenantOverviewData.fleetHealth.map(item => `
    <button class="health-row drill" type="button" data-panel="fleet" data-title="${tenantOverviewEscape(item.label)} plants" data-route="plants">
      <div class="health-label"><span>${tenantOverviewEscape(item.label)}</span><strong>${item.count} · ${item.percent}%</strong></div>
      <div class="progress"><div style="width:${Math.max(0, Math.min(100, item.percent))}%"></div></div>
    </button>`).join('');
}
function tenantOverviewAlerts() {
    if (!TenantOverviewData.alerts.length) {
        return tenantOverviewEmpty('No alert records', 'The alert endpoint returned no rows or has not completed yet.');
    }
    return `<div class="table-list">${TenantOverviewData.alerts.map(alert => `
    <div class="table-row actionable">
      <button class="row-main drill" type="button" data-panel="alert" data-title="${tenantOverviewEscape(alert.title)}" data-route="alerts"><strong>${tenantOverviewEscape(alert.title)}</strong><small>${tenantOverviewEscape(alert.plant)} · ${tenantOverviewEscape(alert.device)}</small></button>
      <span class="badge ${tenantOverviewStatusClass(alert.severity)}">${tenantOverviewEscape(alert.severity)}</span>
      <small>${tenantOverviewEscape(alert.time)}</small>
    </div>`).join('')}</div>`;
}
function tenantOverviewIntegrations() {
    if (!TenantOverviewData.integrations.length) {
        return tenantOverviewEmpty('No integration records', 'Provider integration endpoints returned no rows or have not completed yet.');
    }
    return `<div class="table-list">${TenantOverviewData.integrations.map(integration => `
    <div class="table-row actionable">
      <button class="row-main drill" type="button" data-panel="integration" data-title="${tenantOverviewEscape(integration.name)}" data-route="integrations"><strong>${tenantOverviewEscape(integration.name)}</strong><small>Last sync: ${tenantOverviewEscape(integration.sync)}</small></button>
      <span class="badge ${tenantOverviewStatusClass(integration.status)}">${tenantOverviewEscape(integration.status)}</span>
      <small>${tenantOverviewEscape(integration.errors)} errors</small>
    </div>`).join('')}</div>`;
}
function tenantOverviewQuality() {
    if (!TenantOverviewData.quality.length) {
        return tenantOverviewEmpty('No API quality summary', 'Quality counters appear only when provider and integration endpoints respond.');
    }
    return `<div class="quality-grid">${TenantOverviewData.quality.map(item => `<button class="drill" type="button" data-panel="quality" data-title="${tenantOverviewEscape(item.label)}" data-route="integrations"><strong>${tenantOverviewEscape(item.value)}</strong><span>${tenantOverviewEscape(item.label)}</span></button>`).join('')}</div>`;
}
function tenantOverviewPlants() {
    if (!TenantOverviewData.plants.length) {
        return tenantOverviewEmpty('No plant records', 'The plant endpoint returned no rows or has not completed yet.');
    }
    return `<div class="table-list">${TenantOverviewData.plants.map(plant => `
    <div class="table-row actionable">
      <button class="row-main drill" type="button" data-panel="plant" data-title="${tenantOverviewEscape(plant.name)}" data-route="plants"><strong>${tenantOverviewEscape(plant.name)}</strong><small>${tenantOverviewEscape(plant.capacity)} · ${tenantOverviewEscape(plant.energy)}</small></button>
      <span class="badge ${tenantOverviewStatusClass(plant.health)}">${tenantOverviewEscape(plant.health)}</span>
    </div>`).join('')}</div>`;
}
function tenantOverviewRender(state = FleetLayout.state) {
    return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">Tenant Operations Center · API-only</p>
        <h1>Tenant Overview</h1>
        <p class="muted">This screen contains only values derived from backend responses inside ${tenantOverviewEscape(state.tenant)}. Prototype KPIs, maps, trends, revenue and activity records are not displayed.</p>
      </div>
      <button class="freshness-card" type="button" data-live-refresh="overview">
        <span class="pulse"></span>
        <div><strong>Data status</strong><small>Waiting for API response</small></div>
      </button>
    </section>

    <section class="context-bar glass-card">
      <button class="ctx-item" type="button" data-context="tenant"><span>Tenant Scope</span><strong id="ctxTenant">${tenantOverviewEscape(state.tenant)}</strong></button>
      <button class="ctx-item" type="button" data-context="region"><span>Region</span><strong id="ctxRegion">${tenantOverviewEscape(state.region)}</strong></button>
      <button class="ctx-item" type="button" data-context="time"><span>Time Range</span><strong id="ctxTime">${tenantOverviewEscape(state.time)}</strong></button>
      <div class="ctx-item"><span>Source Policy</span><strong>Backend API only</strong></div>
    </section>

    ${tenantOverviewKpis()}

    <section class="dashboard-grid two-col">
      <article class="panel glass-card">
        <div class="panel-head"><div><h2>Fleet Status</h2><p>Calculated only from status fields returned by the plant API.</p></div><button class="go" type="button" data-route="plants">Open Plants</button></div>
        <div class="health-bars">${tenantOverviewHealthBars()}</div>
      </article>
      <article class="panel glass-card">
        <div class="panel-head"><div><h2>API Quality Summary</h2><p>Provider, template, stale-plant and error-rate values from backend responses.</p></div><button class="go" type="button" data-route="integrations">Integration Health</button></div>
        ${tenantOverviewQuality()}
      </article>
    </section>

    <section class="dashboard-grid two-col">
      <article class="panel glass-card">
        <div class="panel-head"><div><h2>Alerts</h2><p>Latest records returned by the alert endpoint.</p></div><button class="go" type="button" data-route="alerts">Open Alerts</button></div>
        ${tenantOverviewAlerts()}
      </article>
      <article class="panel glass-card">
        <div class="panel-head"><div><h2>Integration Health</h2><p>Connector records returned by provider integration endpoints.</p></div><button class="go" type="button" data-route="integrations">Open Health</button></div>
        ${tenantOverviewIntegrations()}
      </article>
    </section>

    <section class="panel glass-card">
      <div class="panel-head"><div><h2>Plant Snapshot</h2><p>Current API page sample. No ranking or estimated business values are added by the browser.</p></div><button class="go" type="button" data-route="plants">Plant List</button></div>
      ${tenantOverviewPlants()}
    </section>`;
}
function tenantOverviewDrawer(title, body, route) {
    let drawer = document.getElementById('detailDrawer');
    if (!drawer) {
        drawer = document.createElement('aside');
        drawer.id = 'detailDrawer';
        drawer.className = 'detail-drawer';
        document.body.appendChild(drawer);
    }
    drawer.innerHTML = `
    <button class="drawer-close" type="button" aria-label="Close details">×</button>
    <p class="eyebrow">API record preview</p>
    <h2>${tenantOverviewEscape(title)}</h2>
    <div class="drawer-body">${body}</div>
    <div class="drawer-actions">
      <button class="primary-action" type="button" data-route="${tenantOverviewEscape(route)}">Open section</button>
      <button class="secondary-action drawer-close-2" type="button">Close</button>
    </div>`;
    drawer.classList.add('open');
    tenantOverviewElement(drawer.querySelector('.drawer-close'))?.addEventListener('click', () => drawer?.classList.remove('open'));
    tenantOverviewElement(drawer.querySelector('.drawer-close-2'))?.addEventListener('click', () => drawer?.classList.remove('open'));
    tenantOverviewElement(drawer.querySelector('.primary-action'))?.addEventListener('click', event => {
        const target = event.currentTarget;
        window.location.href = FleetLayout.pathFor(target.dataset.route || 'overview');
    });
}
function tenantOverviewDetail(type, title, state) {
    return `<p>This preview is derived from the currently displayed backend result.</p><div class="drawer-metrics rich"><div><span>Record</span><strong>${tenantOverviewEscape(title)}</strong></div><div><span>Source</span><strong>Backend API</strong></div><div><span>Section</span><strong>${tenantOverviewEscape(type || 'overview')}</strong></div><div><span>Tenant Scope</span><strong>${tenantOverviewEscape(state.tenant)}</strong></div></div>`;
}
const tenantOverviewState = {
    tenant: FleetLayout.state.tenant,
    time: FleetLayout.state.time,
    region: FleetLayout.state.region
};
function wireOverview() {
    const main = tenantOverviewElement(document.querySelector('.main-content'));
    if (!main || main.dataset.tenantOverviewWired === 'true')
        return;
    main.dataset.tenantOverviewWired = 'true';
    main.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target)
            return;
        const go = tenantOverviewElement(target.closest('.go'));
        if (go) {
            window.location.href = FleetLayout.pathFor(go.dataset.route || 'overview');
            return;
        }
        const drill = tenantOverviewElement(target.closest('.drill'));
        if (drill) {
            tenantOverviewDrawer(drill.dataset.title || 'API record', tenantOverviewDetail(drill.dataset.panel, drill.dataset.title || 'API record', tenantOverviewState), drill.dataset.route || 'overview');
            return;
        }
        const context = tenantOverviewElement(target.closest('[data-context]'));
        if (!context)
            return;
        if (context.dataset.context === 'tenant')
            FleetLayout.toast(`Tenant scope is fixed to ${tenantOverviewState.tenant}.`);
        if (context.dataset.context === 'time')
            document.getElementById('timeBtn')?.click();
        if (context.dataset.context === 'region')
            FleetLayout.toast('Region is shown from the current tenant context. API requests remain tenant-scoped.');
    });
}
window.renderOverview = () => tenantOverviewRender(tenantOverviewState);
window.wireOverview = wireOverview;
FleetLayout.mount(tenantOverviewRender(tenantOverviewState));
wireOverview();
window.addEventListener('zentrid:context', (event) => {
    const detail = event.detail || {};
    if (detail.tenant)
        tenantOverviewState.tenant = detail.tenant;
    if (detail.time)
        tenantOverviewState.time = detail.time;
    if (detail.region)
        tenantOverviewState.region = detail.region;
    const tenant = tenantOverviewElement(document.getElementById('ctxTenant'));
    const time = tenantOverviewElement(document.getElementById('ctxTime'));
    const region = tenantOverviewElement(document.getElementById('ctxRegion'));
    if (tenant)
        tenant.textContent = tenantOverviewState.tenant;
    if (time)
        time.textContent = tenantOverviewState.time;
    if (region)
        region.textContent = tenantOverviewState.region;
});
