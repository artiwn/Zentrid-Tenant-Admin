"use strict";
(() => {
    const layout = window.FleetLayout;
    const app = document.getElementById('app');
    if (!layout?.mount) {
        if (app)
            app.innerHTML = '<main class="main-content"><section class="empty-state zentrid-ux-state zentrid-ux-state-error"><strong>Workspace layout is unavailable.</strong><span>Reload the application after restarting the Zentrid server.</span></section></main>';
        return;
    }
    const tenantName = String(layout.state.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace');
    const uiKey = 'zentrid.tenant.integration-health.ui.v1441';
    let integrations = [];
    let failures = [];
    let activities = [];
    let mappings = [];
    let activeTab = 'overview';
    let selectedId = '';
    let search = '';
    let statusFilter = 'All Statuses';
    let vendorFilter = 'All Vendors';
    let liveState = 'loading';
    let liveMessage = 'Loading connector registry and synchronization summary…';
    let escapeBound = false;
    try {
        const saved = JSON.parse(localStorage.getItem(uiKey) || '{}');
        if (saved.activeTab)
            activeTab = saved.activeTab;
        if (saved.selectedId)
            selectedId = saved.selectedId;
    }
    catch {
        // Invalid UI state must never block the page.
    }
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
    }
    function normalize(value) {
        return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    function pathValue(record, path) {
        return path.split('.').reduce((value, key) => {
            if (!value || typeof value !== 'object')
                return undefined;
            return value[key];
        }, record);
    }
    function textValue(record, keys, fallback) {
        for (const key of keys) {
            const value = pathValue(record, key);
            if (value !== undefined && value !== null && String(value).trim())
                return String(value).trim();
        }
        return fallback;
    }
    function numericValue(record, keys, fallback) {
        for (const key of keys) {
            const raw = pathValue(record, key);
            if (raw === undefined || raw === null || raw === '')
                continue;
            const value = Number(raw);
            if (Number.isFinite(value))
                return value;
        }
        return fallback;
    }
    function objectRows(value) {
        return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
    }
    function displayId(item) {
        return item.id.startsWith('__api_row__') ? '—' : item.id;
    }
    function percentText(value) {
        return value >= 0 ? `${value.toFixed(value % 1 ? 1 : 0)}%` : '—';
    }
    function minuteText(value) {
        return value >= 0 ? `${value} min` : '—';
    }
    function saveUi() {
        localStorage.setItem(uiKey, JSON.stringify({ activeTab, selectedId }));
    }
    function tone(value) {
        const normalized = normalize(value);
        if (normalized.includes('healthy') || normalized.includes('active') || normalized.includes('valid') || normalized.includes('completed') || normalized.includes('resolved') || normalized.includes('mapped'))
            return 'success';
        if (normalized.includes('delay') || normalized.includes('warning') || normalized.includes('monitor') || normalized.includes('partial'))
            return 'warning';
        if (normalized.includes('fail') || normalized.includes('critical') || normalized.includes('expired') || normalized.includes('offline'))
            return 'danger';
        if (normalized.includes('info') || normalized.includes('loading'))
            return 'info';
        return 'neutral';
    }
    function healthLabel(record) {
        if (record.health)
            return record.health;
        if (record.status === 'Active' && record.syncLagMinutes <= 10)
            return 'Healthy';
        if (record.syncLagMinutes > 10)
            return 'Delayed';
        return record.status || 'Unknown';
    }
    function healthyCount() {
        return integrations.filter(item => tone(healthLabel(item)) === 'success').length;
    }
    function attentionCount() {
        return integrations.filter(item => ['warning', 'danger'].includes(tone(healthLabel(item)))).length;
    }
    function averageCoverage() {
        const values = integrations.map(item => item.coverage).filter(value => value >= 0);
        return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    }
    function averageError() {
        const values = integrations.map(item => item.errorRate).filter(value => value >= 0);
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    }
    function maximumLag() {
        const values = integrations.map(item => item.syncLagMinutes).filter(value => value >= 0);
        return values.length ? Math.max(...values) : null;
    }
    function liveBadge() {
        const map = {
            loading: ['info', 'Loading'], live: ['success', 'Live'], partial: ['warning', 'Partial'], empty: ['neutral', 'Empty'], error: ['danger', 'Error']
        };
        const [className, label] = map[liveState];
        return `<span class="badge ${className}">${label}</span>`;
    }
    function hero() {
        return `<section class="page-hero integration-health-hero-v1441">
      <div><p class="eyebrow">Tenant Admin · Integration Operations</p><h1>Integration Health</h1><p class="muted">Connector registry, synchronization health, data coverage, failures and canonical source mapping for the fixed tenant scope.</p></div>
      <div class="hero-actions integration-health-hero-actions-v1441">
        <button class="secondary-action" type="button" data-integration-action="export"><strong>Export Diagnostics</strong><small>Tenant connector snapshot</small></button>
        <button class="freshness-card" type="button" data-integration-action="refresh"><span class="pulse"></span><div><strong>Refresh Health</strong><small>${escapeHtml(liveMessage)}</small></div></button>
      </div>
    </section>`;
    }
    function contextBar() {
        const maxLag = maximumLag();
        return `<section class="context-bar glass-card integration-health-context-v1441">
      <button class="ctx-item" type="button"><span>Tenant Scope</span><strong>${escapeHtml(tenantName)}</strong></button>
      <button class="ctx-item" type="button" data-integration-tab="connectors"><span>Assigned Connectors</span><strong>${integrations.length}</strong></button>
      <button class="ctx-item" type="button" data-integration-tab="sync"><span>Healthy</span><strong>${healthyCount()}/${integrations.length}</strong></button>
      <button class="ctx-item" type="button" data-integration-tab="sync"><span>Maximum Sync Lag</span><strong>${maxLag === null ? '—' : `${maxLag} min`}</strong></button>
      <button class="ctx-item" type="button"><span>Access Mode</span><strong>Read-only</strong></button>
    </section>`;
    }
    function kpis() {
        const coverage = averageCoverage();
        const error = averageError();
        return `<section class="module-grid integration-health-kpis-v1441">
      <button class="module-card green" type="button" data-integration-tab="connectors"><span>Assigned Connectors</span><strong>${integrations.length}</strong><small>${healthyCount()} healthy · ${attentionCount()} need attention</small></button>
      <button class="module-card ${attentionCount() ? 'yellow' : 'green'}" type="button" data-integration-tab="failures"><span>Operational Issues</span><strong>${attentionCount()}</strong><small>${failures.filter(item => item.state !== 'Resolved').length} active incident(s)</small></button>
      <button class="module-card cyan" type="button" data-integration-tab="coverage"><span>Data Coverage</span><strong>${coverage === null ? '—' : `${coverage}%`}</strong><small>Plants, devices, metrics and alert types</small></button>
      <button class="module-card ${error !== null && error > 2 ? 'yellow' : 'green'}" type="button" data-integration-tab="sync"><span>Average Error Rate</span><strong>${error === null ? '—' : `${error.toFixed(1)}%`}</strong><small>Across recent synchronization cycles</small></button>
    </section>`;
    }
    function sideTabs() {
        const tabs = [
            ['overview', 'Overview'], ['connectors', 'Connectors'], ['sync', 'Sync Health'], ['coverage', 'Data Coverage'],
            ['failures', 'Alerts & Failures'], ['mapping', 'Source Mapping'], ['activity', 'Activity']
        ];
        return `<aside class="glass-card plant-side-card-v17 integration-health-side-v1441"><h3>Integration Health</h3>${tabs.map(([key, label]) => `<button class="${activeTab === key ? 'active' : ''}" type="button" data-integration-tab="${key}" ${activeTab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</aside>`;
    }
    function filteredIntegrations() {
        const query = normalize(search);
        return integrations.filter(item => {
            const matchesSearch = !query || normalize([item.name, item.vendor, item.software, item.code, item.id, item.scope].join(' ')).includes(query);
            const matchesStatus = statusFilter === 'All Statuses' || healthLabel(item) === statusFilter || item.status === statusFilter;
            const matchesVendor = vendorFilter === 'All Vendors' || item.vendor === vendorFilter;
            return matchesSearch && matchesStatus && matchesVendor;
        });
    }
    function integrationRows(rows, compact = false) {
        if (!rows.length)
            return '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No connectors match current filters.</strong><span>Clear filters or refresh tenant connector data.</span></div>';
        const body = rows.map(item => `<div class="data-row clickable-row" role="button" tabindex="0" data-integration-open="${escapeHtml(item.id)}">
      <div><strong>${escapeHtml(item.vendor)} ${escapeHtml(item.software)}</strong><small>${escapeHtml(item.code)}<br>${escapeHtml(displayId(item))}</small></div>
      <div><strong>${escapeHtml(item.vendor)}</strong><small>${escapeHtml(item.method)}</small></div>
      <div><strong>${item.plants} plants · ${item.devices} devices</strong><small>${escapeHtml(item.region)} · ${escapeHtml(tenantName)}</small></div>
      <div class="integration-health-cell"><span class="badge ${tone(healthLabel(item))}">${escapeHtml(healthLabel(item))}</span><small>Auth: ${escapeHtml(item.auth)}</small></div>
      <div><strong>${escapeHtml(item.lastSync)}</strong><small>${minuteText(item.syncLagMinutes)} lag · ${escapeHtml(item.syncFrequency)}</small></div>
      <div class="row-actions single-action"><button class="secondary-action single-row-action" type="button" data-integration-open="${escapeHtml(item.id)}">Open</button></div>
    </div>`).join('');
        return `<div class="data-table integration-table integration-table-actions integration-health-table-v1441 ${compact ? 'compact-table' : ''}"><div class="data-head"><span>Connector</span><span>Vendor / Type</span><span>Assigned Scope</span><span>Status</span><span>Last Activity</span><span>Actions</span></div>${body}</div>`;
    }
    function coverageBars(rows) {
        if (!rows.length)
            return '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No connector coverage data available.</strong><span>Coverage will appear when the backend returns integration metrics.</span></div>';
        return `<div class="integration-health-coverage-list-v1441">${rows.map(item => `<button type="button" data-integration-open="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.vendor)} ${escapeHtml(item.software)}</strong><span>${percentText(item.coverage)}</span></div><progress max="100" value="${item.coverage >= 0 ? Math.max(0, Math.min(100, item.coverage)) : 0}" aria-label="${escapeHtml(item.vendor)} data coverage"></progress><small>${item.plants} plants · ${item.devices} devices · ${item.metrics} metrics · ${item.alerts} alert types</small></button>`).join('')}</div>`;
    }
    function activityList(rows) {
        if (!rows.length)
            return '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No integration activity returned by the API.</strong><span>Synchronization and validation events will appear when provided by the backend.</span></div>';
        return `<div class="commercial-audit-v78 integration-health-activity-v1441">${rows.map(item => `<article class="commercial-audit-item-v78"><div class="commercial-audit-marker-v78 ${item.tone}"></div><div class="commercial-audit-content-v78"><div class="commercial-audit-top-v78"><strong>${escapeHtml(item.action)}</strong><span>${escapeHtml(item.time)}</span></div><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.connector)}</small></div></article>`).join('')}</div>`;
    }
    function operationalSummary() {
        const knownAuth = integrations.filter(item => item.auth !== '—');
        const knownDiscovery = integrations.filter(item => item.discovery !== '—');
        const authSummary = knownAuth.length ? `${knownAuth.filter(item => normalize(item.auth).includes('valid')).length}/${knownAuth.length} valid` : '—';
        const discoverySummary = knownDiscovery.length ? `${knownDiscovery.filter(item => normalize(item.discovery).includes('completed')).length}/${knownDiscovery.length} completed` : '—';
        const coverageSummary = averageCoverage();
        return `<section class="panel glass-card integration-health-summary-v1441"><div class="panel-head"><div><h2>Operational Summary</h2><p>Tenant-facing connector health using the same registry and operational patterns as Zentrid Global Admin.</p></div>${liveBadge()}</div>
      <div class="information-grid integration-health-summary-grid-v1441">
        <div><span>Authentication</span><strong>${authSummary}</strong><small>Credentials are managed centrally</small></div>
        <div><span>Discovery</span><strong>${discoverySummary}</strong><small>Plant and device discovery</small></div>
        <div><span>Synchronization</span><strong>${healthyCount()} healthy</strong><small>${attentionCount()} connector(s) need attention</small></div>
        <div><span>Canonical Mapping</span><strong>${coverageSummary === null ? '—' : `${coverageSummary}% covered`}</strong><small>Current tenant data model</small></div>
      </div>
      <div class="commercial-governance-flow-v99 integration-health-flow-v1441"><article><span>01</span><strong>Vendor Source</strong><small>Assigned provider account</small></article><article><span>02</span><strong>Authentication</strong><small>Credential validation</small></article><article><span>03</span><strong>Discovery</strong><small>Plants and devices</small></article><article><span>04</span><strong>Normalization</strong><small>Canonical mapping</small></article><article><span>05</span><strong>Tenant Data</strong><small>Telemetry, alerts and reports</small></article></div>
    </section>`;
    }
    function overview() {
        const healthRows = integrations.length ? integrations.map(item => `<button type="button" data-integration-open="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.vendor)} ${escapeHtml(item.software)}</strong><small>Last success ${escapeHtml(item.lastSuccessfulSync)} · ${item.errorRate >= 0 ? `${percentText(item.errorRate)} errors` : 'error rate unavailable'}</small></div><span class="badge ${tone(healthLabel(item))}">${escapeHtml(healthLabel(item))}</span></button>`).join('') : '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No synchronization health data available.</strong><span>Connector status will appear when returned by the API.</span></div>';
        return `${operationalSummary()}
      <div class="dashboard-grid two-col integration-health-dashboard-v1441">
        <article class="panel glass-card"><div class="panel-head"><div><h2>Synchronization Health</h2><p>Freshness, lag and recent error rate by connector.</p></div><button class="go" type="button" data-integration-tab="sync">Open Sync Health</button></div>
          <div class="integration-health-health-list-v1441">${healthRows}</div>
        </article>
        <article class="panel glass-card"><div class="panel-head"><div><h2>Data Coverage</h2><p>Completeness of tenant plants, devices, metrics and alerts.</p></div><button class="go" type="button" data-integration-tab="coverage">Open Coverage</button></div>${coverageBars(integrations)}</article>
      </div>
      <article class="panel glass-card"><div class="panel-head"><div><h2>Vendor Connectors</h2><p>Read-only registry of integrations assigned to ${escapeHtml(tenantName)}.</p></div><span class="badge info">Read-only registry</span></div>${integrationRows(integrations, true)}</article>
      <article class="panel glass-card"><div class="panel-head"><div><h2>Recent Integration Activity</h2><p>Synchronization, validation, recovery and mapping events.</p></div><button class="go" type="button" data-integration-tab="activity">View Activity</button></div>${activityList(activities.slice(0, 4))}</article>`;
    }
    function connectors() {
        const vendors = Array.from(new Set(integrations.map(item => item.vendor))).sort();
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Assigned Connectors</h2><p>Vendor connector definitions, assigned scope, health and recent activity.</p></div><span class="badge info">Tenant scope · Read-only</span></div>
      <div class="toolbar integration-health-toolbar-v1441"><input id="integrationSearch" value="${escapeHtml(search)}" placeholder="Search connector, vendor, scope or ID..."><select id="integrationStatusFilter"><option>All Statuses</option>${['Healthy', 'Delayed', 'Failed', 'Active', 'Inactive'].map(value => `<option ${statusFilter === value ? 'selected' : ''}>${value}</option>`).join('')}</select><select id="integrationVendorFilter"><option>All Vendors</option>${vendors.map(value => `<option ${vendorFilter === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select><button class="secondary-action" type="button" data-integration-action="clear-filters">Clear</button></div>
      <div id="integrationConnectorTable">${integrationRows(filteredIntegrations())}</div>
    </section>`;
    }
    function syncHealth() {
        const rows = integrations.length ? integrations.map(item => `<div class="data-row clickable-row" role="button" tabindex="0" data-integration-open="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.vendor)} ${escapeHtml(item.software)}</strong><small>${escapeHtml(displayId(item))}</small></div><div><strong>${escapeHtml(item.syncFrequency)}</strong><small>Automatic inbound</small></div><div><strong>${escapeHtml(item.lastSuccessfulSync)}</strong><small>${minuteText(item.syncLagMinutes)} lag</small></div><div><strong>${percentText(item.errorRate)}</strong><small>Recent cycles</small></div><div><span class="badge ${tone(healthLabel(item))}">${escapeHtml(healthLabel(item))}</span><small>${item.syncLagMinutes < 0 ? 'Target unavailable' : item.syncLagMinutes <= 10 ? 'Within target' : 'Freshness target exceeded'}</small></div><div class="row-actions single-action"><button class="secondary-action single-row-action" type="button" data-integration-open="${escapeHtml(item.id)}">Details</button></div></div>`).join('') : '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No synchronization records returned by the API.</strong><span>Sync health will appear when connector data is available.</span></div>';
        const maxLag = maximumLag();
        const averageErrors = averageError();
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Synchronization Health</h2><p>Frequency, last successful sync, ingestion lag, error rate and freshness target.</p></div>${liveBadge()}</div>
      <section class="module-grid integration-health-secondary-kpis-v1441"><article class="module-card"><span>Healthy Cycles</span><strong>${healthyCount()}</strong><small>Current connector state</small></article><article class="module-card"><span>Delayed Cycles</span><strong>${attentionCount()}</strong><small>Operational monitoring active</small></article><article class="module-card"><span>Maximum Lag</span><strong>${maxLag === null ? '—' : `${maxLag} min`}</strong><small>Across assigned sources</small></article><article class="module-card"><span>Average Errors</span><strong>${averageErrors === null ? '—' : `${averageErrors.toFixed(1)}%`}</strong><small>Recent sync cycles</small></article></section>
      <div class="data-table integration-health-sync-table-v1441"><div class="data-head"><span>Connector</span><span>Frequency</span><span>Last Successful Sync</span><span>Error Rate</span><span>SLA Status</span><span>Actions</span></div>${rows}</div>
      <div class="integration-health-policy-v1441"><span class="badge info">Read-only</span><p>Schedules, credentials, retry rules and manual synchronization are managed by Zentrid operations. Tenant Admin can review status and export diagnostics.</p></div>
    </section>`;
    }
    function coverage() {
        const totals = integrations.reduce((result, item) => ({ plants: result.plants + item.plants, devices: result.devices + item.devices, metrics: result.metrics + item.metrics, alerts: result.alerts + item.alerts }), { plants: 0, devices: 0, metrics: 0, alerts: 0 });
        const coverageAverage = averageCoverage();
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Data Coverage</h2><p>Canonical tenant data available from each assigned vendor source.</p></div><span class="badge ${coverageAverage !== null && coverageAverage >= 95 ? 'success' : 'warning'}">${coverageAverage === null ? '—' : `${coverageAverage}% average`}</span></div>
      <section class="module-grid integration-health-secondary-kpis-v1441"><article class="module-card"><span>Plants</span><strong>${totals.plants}</strong><small>Discovered and assigned</small></article><article class="module-card"><span>Devices</span><strong>${totals.devices}</strong><small>Inventory records</small></article><article class="module-card"><span>Canonical Metrics</span><strong>${totals.metrics}</strong><small>Normalized measurements</small></article><article class="module-card"><span>Alert Types</span><strong>${totals.alerts}</strong><small>Mapped vendor alarms</small></article></section>
      ${coverageBars(integrations)}
      <div class="integration-health-policy-v1441"><span class="badge neutral">Normalization</span><p>Coverage is calculated after source discovery and canonical mapping. Vendor-specific fields remain traceable but are displayed using tenant-approved names and units.</p></div>
    </section>`;
    }
    function failuresView() {
        const rows = failures.map(item => {
            const connector = integrations.find(row => row.id === item.connectorId);
            return `<div class="data-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.id)}<br>${escapeHtml(item.detail)}</small></div><div><strong>${escapeHtml(connector ? `${connector.vendor} ${connector.software}` : item.connectorId)}</strong><small>${escapeHtml(connector ? displayId(connector) : item.connectorId)}</small></div><div><span class="badge ${tone(item.severity)}">${escapeHtml(item.severity)}</span></div><div><strong>${escapeHtml(item.occurred)}</strong><small>Returned by integration monitoring API</small></div><div><span class="badge ${tone(item.state)}">${escapeHtml(item.state)}</span></div><div class="row-actions"><button class="secondary-action" type="button" data-integration-open="${escapeHtml(item.connectorId)}">Connector</button><button class="secondary-action" type="button" data-integration-route="alerts">Alerts</button></div></div>`;
        }).join('');
        const content = rows || '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No connector failures returned by the API.</strong><span>Operational incidents will appear when reported by the backend.</span></div>';
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Connector Alerts & Failures</h2><p>Operational incidents related to synchronization, provider limits and mapping validation.</p></div><button class="secondary-action" type="button" data-integration-route="alerts">Open Operational Alert Inbox</button></div><div class="data-table integration-health-failure-table-v1441"><div class="data-head"><span>Incident</span><span>Connector</span><span>Severity</span><span>Occurred</span><span>State</span><span>Actions</span></div>${content}</div></section>`;
    }
    function mapping() {
        const content = mappings.length ? mappings.map(row => `<div class="data-row"><div><strong>${escapeHtml(row.vendor)}</strong><small>Vendor source</small></div><div><strong>${escapeHtml(row.domain)}</strong></div><div><strong>${escapeHtml(row.metric)}</strong></div><div><strong>${escapeHtml(row.unit)}</strong></div><div><strong>${escapeHtml(row.version)}</strong></div><div><span class="badge ${tone(row.status)}">${escapeHtml(row.status)}</span></div></div>`).join('') : '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No source mappings returned by the API.</strong><span>Canonical mapping rows will appear when the backend exposes them.</span></div>';
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Source Mapping</h2><p>Vendor fields normalized into the Zentrid canonical data model.</p></div><span class="badge info">Managed centrally</span></div><div class="data-table integration-health-mapping-table-v1441"><div class="data-head"><span>Vendor</span><span>Canonical Domain</span><span>Canonical Metric</span><span>Unit</span><span>Mapping Version</span><span>Status</span></div>${content}</div><div class="integration-health-policy-v1441"><span class="badge neutral">Read-only</span><p>Tenant Admin cannot change source mappings, canonical units or alert dictionaries. Central governance preserves consistent data across Zentrid.</p></div></section>`;
    }
    function activity() {
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Integration Activity</h2><p>Recent synchronization, validation, recovery and mapping events.</p></div>${liveBadge()}</div>${activityList(activities)}</section>`;
    }
    function tabContent() {
        if (activeTab === 'connectors')
            return connectors();
        if (activeTab === 'sync')
            return syncHealth();
        if (activeTab === 'coverage')
            return coverage();
        if (activeTab === 'failures')
            return failuresView();
        if (activeTab === 'mapping')
            return mapping();
        if (activeTab === 'activity')
            return activity();
        return overview();
    }
    function drawer() {
        const item = integrations.find(record => record.id === selectedId);
        if (!item)
            return '';
        return `<aside class="detail-drawer integration-health-drawer-v1441" id="integrationHealthDrawer" aria-hidden="true" aria-labelledby="integrationDrawerTitle"><button class="drawer-close" type="button" data-integration-action="close-drawer" aria-label="Close connector detail">×</button><p class="eyebrow">Tenant Connector · Read-only</p><h2 id="integrationDrawerTitle">${escapeHtml(item.vendor)} ${escapeHtml(item.software)}</h2><div class="integration-health-drawer-meta-v1441"><span class="badge ${tone(healthLabel(item))}">${escapeHtml(healthLabel(item))}</span><span class="badge neutral">${escapeHtml(item.status)}</span><small>${escapeHtml(displayId(item))} · ${escapeHtml(item.code)}</small></div>
      <section class="panel-lite integration-health-drawer-section-v1441"><h3>Connector Identity</h3><div class="information-grid integration-health-drawer-grid-v1441"><div><span>Vendor</span><strong>${escapeHtml(item.vendor)}</strong><small>${escapeHtml(item.software)}</small></div><div><span>Connection Type</span><strong>${escapeHtml(item.method)}</strong><small>${escapeHtml(item.apiVersion)}</small></div><div><span>Endpoint</span><strong>${escapeHtml(item.endpoint)}</strong><small>${escapeHtml(item.region)}</small></div><div><span>Tenant Scope</span><strong>${escapeHtml(tenantName)}</strong><small>${escapeHtml(item.scope)}</small></div></div></section>
      <section class="panel-lite integration-health-drawer-section-v1441"><h3>Operational Health</h3><div class="information-grid integration-health-drawer-grid-v1441"><div><span>Authentication</span><strong>${escapeHtml(item.auth)}</strong><small>Secret values hidden</small></div><div><span>Discovery</span><strong>${escapeHtml(item.discovery)}</strong><small>${item.plants} plants · ${item.devices} devices</small></div><div><span>Last Successful Sync</span><strong>${escapeHtml(item.lastSuccessfulSync)}</strong><small>${minuteText(item.syncLagMinutes)} lag</small></div><div><span>Error Rate</span><strong>${percentText(item.errorRate)}</strong><small>${escapeHtml(item.syncFrequency)}</small></div></div></section>
      <section class="panel-lite integration-health-drawer-section-v1441"><h3>Data Coverage</h3><div class="integration-health-coverage-card-v1441"><div><strong>${item.coverage >= 0 ? `${item.coverage}% complete` : 'Coverage unavailable'}</strong><span>${escapeHtml(item.mappingVersion)}</span></div><progress max="100" value="${item.coverage >= 0 ? Math.max(0, Math.min(100, item.coverage)) : 0}"></progress><small>${item.metrics} metrics · ${item.alerts} alert types · ${escapeHtml(item.source)}</small></div></section>
      <section class="panel-lite integration-health-drawer-section-v1441"><h3>Operational Note</h3><p>${escapeHtml(item.notes)}</p></section>
      <div class="drawer-actions integration-health-drawer-actions-v1441"><button class="secondary-action" type="button" data-integration-route="telemetry">Open Telemetry</button><button class="secondary-action" type="button" data-integration-action="export-selected">Export Diagnostics</button><button class="primary-action" type="button" data-integration-action="close-drawer">Done</button></div></aside>`;
    }
    function render() {
        layout.mount(`<div class="tenant-integration-page-v1441">${hero()}${contextBar()}${kpis()}<section class="plant-workspace-v17 integration-health-workspace-v1441">${sideTabs()}<section class="plant-main-card-v17 integration-health-main-v1441" id="integrationHealthMain">${tabContent()}</section></section>${drawer()}</div>`);
        wire();
        layout.enhanceActionMenus?.(document);
    }
    function switchTab(tab) {
        activeTab = tab;
        saveUi();
        render();
    }
    function openDrawer(id) {
        if (!integrations.some(item => item.id === id))
            return;
        selectedId = id;
        saveUi();
        document.getElementById('integrationHealthDrawer')?.remove();
        document.querySelector('.tenant-integration-page-v1441')?.insertAdjacentHTML('beforeend', drawer());
        const next = document.getElementById('integrationHealthDrawer');
        if (!next)
            return;
        requestAnimationFrame(() => {
            next.classList.add('open');
            next.setAttribute('aria-hidden', 'false');
            next.querySelector('.drawer-close')?.focus();
        });
        wireControls();
        wireOpenRows(next);
    }
    function closeDrawer() {
        const drawerElement = document.getElementById('integrationHealthDrawer');
        if (!drawerElement)
            return;
        drawerElement.classList.remove('open');
        drawerElement.setAttribute('aria-hidden', 'true');
    }
    function route(routeName) {
        const path = layout.pathFor(routeName);
        if (path)
            location.href = path;
    }
    function csvEscape(value) {
        const text = String(value ?? '');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }
    function download(filename, content, type = 'text/csv;charset=utf-8') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }
    function exportDiagnostics(selected) {
        const rows = selected ? [selected] : integrations;
        const header = ['Connector ID', 'Vendor', 'Software', 'Health', 'Status', 'Authentication', 'Discovery', 'Last Sync', 'Sync Lag Minutes', 'Coverage Percent', 'Error Rate Percent', 'Plants', 'Devices', 'Metrics', 'Alert Types', 'Mapping Version', 'API Version'];
        const csv = [header, ...rows.map(item => [item.id, item.vendor, item.software, healthLabel(item), item.status, item.auth, item.discovery, item.lastSync, item.syncLagMinutes, item.coverage, item.errorRate, item.plants, item.devices, item.metrics, item.alerts, item.mappingVersion, item.apiVersion])].map(row => row.map(csvEscape).join(',')).join('\n');
        download(`zentrid-integration-health-${selected ? selected.id : 'tenant'}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
        layout.toast(selected ? 'Connector diagnostics exported.' : 'Tenant integration diagnostics exported.');
    }
    function wireOpenRows(root) {
        root.querySelectorAll('[data-integration-open]').forEach(element => {
            if (element.dataset.integrationWired === 'true')
                return;
            element.dataset.integrationWired = 'true';
            element.addEventListener('click', event => { event.stopPropagation(); openDrawer(element.dataset.integrationOpen || ''); });
            element.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDrawer(element.dataset.integrationOpen || '');
                }
            });
        });
    }
    function wireControls() {
        document.querySelectorAll('[data-integration-tab]').forEach(button => {
            if (button.dataset.integrationControlWired === 'true')
                return;
            button.dataset.integrationControlWired = 'true';
            button.addEventListener('click', () => switchTab((button.dataset.integrationTab || 'overview')));
        });
        document.querySelectorAll('[data-integration-action]').forEach(button => {
            if (button.dataset.integrationControlWired === 'true')
                return;
            button.dataset.integrationControlWired = 'true';
            button.addEventListener('click', event => {
                event.stopPropagation();
                const action = button.dataset.integrationAction || '';
                if (action === 'refresh')
                    void loadLive(true);
                if (action === 'export')
                    exportDiagnostics();
                if (action === 'export-selected')
                    exportDiagnostics(integrations.find(item => item.id === selectedId));
                if (action === 'close-drawer')
                    closeDrawer();
                if (action === 'clear-filters') {
                    search = '';
                    statusFilter = 'All Statuses';
                    vendorFilter = 'All Vendors';
                    render();
                }
            });
        });
        document.querySelectorAll('[data-integration-route]').forEach(button => {
            if (button.dataset.integrationControlWired === 'true')
                return;
            button.dataset.integrationControlWired = 'true';
            button.addEventListener('click', event => { event.stopPropagation(); route(button.dataset.integrationRoute || ''); });
        });
    }
    function wireFilters() {
        const searchInput = document.getElementById('integrationSearch');
        searchInput?.addEventListener('input', () => {
            search = searchInput.value;
            const table = document.getElementById('integrationConnectorTable');
            if (table)
                table.innerHTML = integrationRows(filteredIntegrations());
            if (table)
                wireOpenRows(table);
        });
        const status = document.getElementById('integrationStatusFilter');
        status?.addEventListener('change', () => { statusFilter = status.value; render(); });
        const vendor = document.getElementById('integrationVendorFilter');
        vendor?.addEventListener('change', () => { vendorFilter = vendor.value; render(); });
    }
    function wire() {
        wireControls();
        wireFilters();
        wireOpenRows(document);
        if (!escapeBound) {
            escapeBound = true;
            document.addEventListener('keydown', event => { if (event.key === 'Escape')
                closeDrawer(); });
        }
    }
    function integrationKey(row, index) {
        const explicit = textValue(row, ['id', 'integrationId', 'providerIntegrationId', 'code', 'integrationCode'], '');
        return explicit || `__api_row__${index + 1}`;
    }
    function matchSummary(row, summaries) {
        const id = textValue(row, ['id', 'integrationId', 'providerIntegrationId'], '');
        const vendor = normalize(textValue(row, ['vendor', 'provider', 'vendorName', 'providerName', 'providerType', 'producerVendorTemplate'], ''));
        return summaries.find(summary => {
            const summaryId = textValue(summary, ['id', 'integrationId', 'providerIntegrationId'], '');
            if (id && summaryId && id === summaryId)
                return true;
            const summaryVendor = normalize(textValue(summary, ['provider', 'vendor', 'providerName', 'vendorName', 'displayName', 'name'], ''));
            return Boolean(vendor && summaryVendor && (vendor.includes(summaryVendor) || summaryVendor.includes(vendor)));
        }) || {};
    }
    function mergeLiveRows(registryRows, summaryRows) {
        const sourceRows = registryRows.length ? registryRows : summaryRows;
        return sourceRows.map((row, index) => {
            const match = registryRows.length ? matchSummary(row, summaryRows) : {};
            const vendor = textValue(row, ['vendor', 'provider', 'vendorName', 'providerName', 'providerType', 'producerVendorTemplate'], textValue(match, ['provider', 'vendor', 'vendorName', 'providerName'], 'Unknown'));
            const software = textValue(row, ['software', 'platform', 'displayName', 'integrationName', 'name'], textValue(match, ['software', 'displayName', 'integrationName', 'name'], vendor));
            const id = integrationKey(row, index);
            const status = textValue(row, ['status', 'integrationStatus', 'state'], textValue(match, ['status', 'integrationStatus', 'state'], 'Unknown'));
            const health = textValue(match, ['health', 'connectionStatus', 'syncStatus', 'status'], textValue(row, ['health', 'connectionStatus'], status));
            const plants = numericValue(match, ['plantsCount', 'plantCount', 'plants', 'vendorExtensions.plantsCount'], numericValue(row, ['plantsCount', 'plantCount', 'plants', 'vendorExtensions.plantsCount'], 0));
            const devices = numericValue(match, ['devicesCount', 'deviceCount', 'devices', 'vendorExtensions.devicesCount'], numericValue(row, ['devicesCount', 'deviceCount', 'devices', 'vendorExtensions.devicesCount'], 0));
            const lastSync = textValue(match, ['lastSyncText', 'lastSync', 'lastSyncAtUtc', 'lastSuccessfulSync', 'updatedAtUtc'], textValue(row, ['lastSyncText', 'lastSync', 'lastSyncAtUtc', 'lastSuccessfulSync', 'updatedAtUtc'], 'No data'));
            const lastSuccessfulSync = textValue(match, ['lastSuccessfulSync', 'lastSyncText', 'lastSyncAtUtc', 'lastSync'], textValue(row, ['lastSuccessfulSync', 'lastSyncText', 'lastSyncAtUtc', 'lastSync'], 'No data'));
            return {
                id,
                code: textValue(row, ['code', 'integrationCode'], textValue(match, ['code', 'integrationCode'], '—')),
                name: textValue(row, ['displayName', 'integrationName', 'name'], textValue(match, ['displayName', 'integrationName', 'name'], `${vendor} ${software}`)),
                tenant: tenantName,
                vendor,
                software,
                method: textValue(row, ['method', 'protocol', 'authType', 'connectionType'], textValue(match, ['method', 'protocol', 'authType', 'connectionType'], '—')),
                status,
                health,
                auth: textValue(row, ['auth', 'authenticationStatus', 'authStatus'], textValue(match, ['auth', 'authenticationStatus', 'authStatus'], '—')),
                discovery: textValue(row, ['discovery', 'discoveryStatus', 'sampleDataStatus'], textValue(match, ['discovery', 'discoveryStatus', 'sampleDataStatus'], '—')),
                plants,
                devices,
                metrics: numericValue(match, ['metricsCount', 'metrics', 'vendorExtensions.metricsCount'], numericValue(row, ['metricsCount', 'metrics', 'vendorExtensions.metricsCount'], 0)),
                alerts: numericValue(match, ['alertsCount', 'alertCount', 'alerts', 'vendorExtensions.activeAlertsCount'], numericValue(row, ['alertsCount', 'alertCount', 'alerts', 'vendorExtensions.activeAlertsCount'], 0)),
                lastSync,
                lastSuccessfulSync,
                syncFrequency: textValue(row, ['syncFrequency', 'frequency'], textValue(match, ['syncFrequency', 'frequency'], '—')),
                syncLagMinutes: numericValue(match, ['syncLagMinutes', 'lagMinutes', 'staleMinutes'], numericValue(row, ['syncLagMinutes', 'lagMinutes', 'staleMinutes'], -1)),
                coverage: numericValue(match, ['coveragePct', 'coverage'], numericValue(row, ['coveragePct', 'coverage'], -1)),
                errorRate: numericValue(match, ['errorRatePct', 'errorRate'], numericValue(row, ['errorRatePct', 'errorRate'], -1)),
                mappingVersion: textValue(row, ['mappingVersion', 'mapping.version'], textValue(match, ['mappingVersion', 'mapping.version'], '—')),
                apiVersion: textValue(row, ['apiVersion', 'version'], textValue(match, ['apiVersion', 'version'], '—')),
                source: registryRows.length && summaryRows.length ? '/api/admin/provider-integrations + /api/integrations' : registryRows.length ? '/api/admin/provider-integrations' : '/api/integrations',
                endpoint: textValue(row, ['baseUrl', 'endpoint', 'host'], textValue(match, ['baseUrl', 'endpoint', 'host'], '—')),
                region: textValue(row, ['region'], textValue(match, ['region'], '—')),
                scope: textValue(row, ['scope', 'assignedScope'], textValue(match, ['scope', 'assignedScope'], plants ? `${plants} assigned plants` : '—')),
                notes: textValue(row, ['notes', 'description', 'lastErrorMessage'], textValue(match, ['notes', 'description', 'lastErrorMessage'], '—'))
            };
        });
    }
    function collectFailures(rows, integrationsRows) {
        const result = [];
        rows.forEach((row, index) => {
            const error = textValue(row, ['lastErrorMessage', 'errorMessage', 'failureMessage', 'vendorExtensions.lastErrorMessage'], '');
            const status = textValue(row, ['health', 'connectionStatus', 'syncStatus', 'status', 'integrationStatus'], '');
            if (!error)
                return;
            const connector = matchSummary(row, integrationsRows.map(item => ({ id: item.id, provider: item.vendor })));
            const connectorId = textValue(row, ['id', 'integrationId', 'providerIntegrationId'], textValue(connector, ['id'], integrationsRows[index]?.id || ''));
            if (!connectorId)
                return;
            const severityText = textValue(row, ['severity', 'errorSeverity'], tone(status) === 'danger' ? 'Critical' : 'Warning');
            const severity = normalize(severityText).includes('critical') ? 'Critical' : normalize(severityText).includes('info') ? 'Info' : 'Warning';
            result.push({
                id: textValue(row, ['errorId', 'failureId', 'incidentId'], `${connectorId}-status`),
                connectorId,
                severity,
                title: textValue(row, ['errorTitle', 'failureTitle'], status ? `Connector status: ${status}` : 'Connector failure'),
                detail: error || status,
                occurred: textValue(row, ['lastErrorAtUtc', 'failedAtUtc', 'updatedAtUtc', 'lastSyncAtUtc'], '—'),
                state: normalize(status).includes('resolved') ? 'Resolved' : normalize(status).includes('monitor') || normalize(status).includes('delay') ? 'Monitoring' : 'Open'
            });
        });
        return result;
    }
    function collectActivities(rows, integrationsRows) {
        const result = [];
        rows.forEach((row, index) => {
            const embedded = [pathValue(row, 'activities'), pathValue(row, 'activity'), pathValue(row, 'events'), pathValue(row, 'history')].flatMap(objectRows);
            embedded.forEach(event => result.push({
                time: textValue(event, ['time', 'occurredAt', 'createdAt', 'timestamp'], '—'),
                action: textValue(event, ['action', 'title', 'type', 'event'], 'Integration activity'),
                detail: textValue(event, ['detail', 'description', 'message'], '—'),
                connector: textValue(event, ['connector', 'integrationName', 'provider'], integrationsRows[index]?.vendor || '—'),
                tone: tone(textValue(event, ['status', 'severity', 'tone'], 'info'))
            }));
        });
        return result;
    }
    function collectMappings(rows, integrationsRows) {
        const result = [];
        rows.forEach((row, index) => {
            const embedded = [pathValue(row, 'mappings'), pathValue(row, 'fieldMappings'), pathValue(row, 'mappingDetails'), pathValue(row, 'vendorExtensions.mappings')].flatMap(objectRows);
            embedded.forEach(mapping => result.push({
                vendor: textValue(mapping, ['vendor', 'provider'], integrationsRows[index]?.vendor || '—'),
                domain: textValue(mapping, ['domain', 'canonicalDomain', 'category'], '—'),
                metric: textValue(mapping, ['metric', 'canonicalMetric', 'targetField', 'name'], '—'),
                unit: textValue(mapping, ['unit', 'canonicalUnit'], '—'),
                version: textValue(mapping, ['version', 'mappingVersion'], textValue(row, ['mappingVersion'], '—')),
                status: textValue(mapping, ['status', 'mappingStatus'], 'Unknown')
            }));
        });
        return result;
    }
    async function loadLive(forceRefresh = false) {
        liveState = 'loading';
        liveMessage = 'Loading connector registry and synchronization summary…';
        render();
        try {
            if (!window.FleetAPIRepositories?.integrations)
                throw new Error('Integration repository is unavailable.');
            const options = { requestGroup: 'page:tenant-integration-health', timeoutMs: 15000, forceRefresh };
            const [registryResult, summaryResult] = await Promise.allSettled([
                window.FleetAPIRepositories.integrations.list(options),
                window.FleetAPIRepositories.integrations.summary({ ...options, requestGroup: 'page:tenant-integration-summary' })
            ]);
            const registryRows = registryResult.status === 'fulfilled' ? objectRows(registryResult.value.rawItems) : [];
            const summaryRows = summaryResult.status === 'fulfilled' ? objectRows(summaryResult.value.rawItems) : [];
            integrations = mergeLiveRows(registryRows, summaryRows);
            failures = collectFailures([...registryRows, ...summaryRows], integrations);
            activities = collectActivities([...registryRows, ...summaryRows], integrations);
            mappings = collectMappings([...registryRows, ...summaryRows], integrations);
            if (!integrations.some(item => item.id === selectedId))
                selectedId = integrations[0]?.id || '';
            if (integrations.length) {
                liveState = registryRows.length && summaryRows.length ? 'live' : 'partial';
                liveMessage = registryRows.length && summaryRows.length ? 'Live registry and operational summary connected.' : registryRows.length ? 'Live provider integration registry connected; operational summary is unavailable.' : 'Live operational integration summary connected; provider registry is unavailable.';
            }
            else if (registryResult.status === 'rejected' && summaryResult.status === 'rejected') {
                liveState = 'error';
                liveMessage = 'Integration API requests failed. No fallback business data is displayed.';
            }
            else {
                liveState = 'empty';
                liveMessage = 'The integration APIs returned no tenant connectors.';
            }
        }
        catch (error) {
            integrations = [];
            failures = [];
            activities = [];
            mappings = [];
            selectedId = '';
            liveState = 'error';
            liveMessage = error instanceof Error ? error.message : 'Live connector data is unavailable.';
        }
        render();
    }
    render();
    void loadLive(false);
})();
