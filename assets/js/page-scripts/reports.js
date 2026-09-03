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
    const uiKey = 'zentrid.tenant.reports.ui.v1434';
    // The active Swagger does not expose Tenant Reports, Templates, Schedules or Report Activity endpoints.
    // Keep these collections empty rather than restoring browser-local or built-in business fixtures.
    const templates = [];
    const reports = [];
    const activities = [];
    let tenantClients = [];
    let tenantPlants = [];
    let activeTab = 'library';
    let selectedReportId = '';
    let search = '';
    let typeFilter = 'All Types';
    let statusFilter = 'All Statuses';
    let periodFilter = 'All Periods';
    let builderTemplateId = '';
    let escapeListenerBound = false;
    let loadState = 'loading';
    let loadError = '';
    try {
        const saved = JSON.parse(localStorage.getItem(uiKey) || '{}');
        if (saved.activeTab)
            activeTab = saved.activeTab;
        if (saved.selectedReportId)
            selectedReportId = saved.selectedReportId;
    }
    catch {
        // UI state only. Report business data is never restored from browser storage.
    }
    function normalize(value) {
        return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));
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
        if (depth > 6)
            return [];
        if (Array.isArray(payload))
            return payload.filter(isRecord);
        if (!isRecord(payload))
            return [];
        for (const key of ['items', 'data', 'results', 'records', 'rows', 'clients', 'plants']) {
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
    function mapClients(payload) {
        const seen = new Set();
        return extractRows(payload).map((row, index) => {
            const id = String(firstOf(row, ['id', 'clientId', 'client_id', 'externalId', 'code'], `client-${index}`)).trim();
            const name = String(firstOf(row, ['name', 'clientName', 'legalName', 'displayName', 'companyName'], id)).trim();
            return { id, name };
        }).filter(item => {
            if (!item.id || seen.has(item.id))
                return false;
            seen.add(item.id);
            return true;
        });
    }
    function mapPlants(livePayload, adminPayload) {
        const byId = new Map();
        [...extractRows(adminPayload), ...extractRows(livePayload)].forEach((row, index) => {
            const id = String(firstOf(row, ['id', 'plantId', 'plant_id', 'externalId', 'code'], `plant-${index}`)).trim();
            if (!id)
                return;
            const existing = byId.get(id);
            const name = String(firstOf(row, ['name', 'plantName', 'stationName', 'displayName'], existing?.name || id)).trim();
            const clientId = String(firstOf(row, ['clientId', 'client_id', 'ownerId', 'customerId'], existing?.clientId || '')).trim();
            byId.set(id, { id, name, clientId });
        });
        return [...byId.values()];
    }
    function saveUi() {
        localStorage.setItem(uiKey, JSON.stringify({ activeTab, selectedReportId }));
    }
    function tone(status) {
        if (status === 'Ready' || status === 'success')
            return 'success';
        if (status === 'Generating' || status === 'Scheduled' || status === 'warning')
            return 'warning';
        if (status === 'Failed' || status === 'danger')
            return 'danger';
        return 'info';
    }
    function unavailableReason() {
        if (loadState === 'loading')
            return 'Loading tenant report scope from API...';
        if (loadState === 'error')
            return loadError || 'Tenant report scope could not be loaded from API.';
        return 'The active Swagger does not expose Tenant Reports endpoints. Local demo reports are disabled.';
    }
    function contextBar() {
        return `<section class="context-bar glass-card tenant-reports-context-v1434">
      <button class="ctx-item" type="button"><span>Tenant</span><strong>${escapeHtml(tenantName)}</strong></button>
      <button class="ctx-item" type="button" data-report-tab="library"><span>Ready Reports</span><strong>0</strong></button>
      <button class="ctx-item" type="button" data-report-tab="scheduled"><span>Scheduled</span><strong>0</strong></button>
      <button class="ctx-item" type="button"><span>Retention</span><strong>—</strong></button>
    </section>`;
    }
    function kpis() {
        return `<section class="module-grid tenant-report-kpis-v1434">
      <button class="module-card" type="button" data-report-filter-status="Ready"><span>Ready</span><strong>0</strong><small>Available to preview and download</small></button>
      <button class="module-card" type="button" data-report-tab="scheduled"><span>Scheduled</span><strong>0</strong><small>Recurring tenant reports</small></button>
      <button class="module-card" type="button" data-report-filter-status="Generating"><span>Generating</span><strong>0</strong><small>Outputs currently being prepared</small></button>
      <button class="module-card" type="button" data-report-filter-status="Failed"><span>Failed</span><strong>0</strong><small>Reports that need review or retry</small></button>
    </section>`;
    }
    function sideTabs() {
        const tabs = [
            ['library', 'Report Library'],
            ['templates', 'Templates'],
            ['scheduled', 'Scheduled Reports'],
            ['activity', 'Activity']
        ];
        return `<aside class="glass-card plant-side-card-v17 tenant-report-side-nav-v1434"><h3>Reports</h3>${tabs.map(([key, label]) => `<button class="${activeTab === key ? 'active' : ''}" type="button" data-report-tab="${key}">${label}</button>`).join('')}</aside>`;
    }
    function filteredReports() {
        const query = normalize(search);
        return reports.filter(item => {
            if (query && !normalize([item.name, item.id, item.type, item.scope, item.period, item.author].join(' ')).includes(query))
                return false;
            if (typeFilter !== 'All Types' && item.type !== typeFilter)
                return false;
            if (statusFilter !== 'All Statuses' && item.status !== statusFilter)
                return false;
            if (periodFilter !== 'All Periods' && !item.period.includes(periodFilter))
                return false;
            return true;
        });
    }
    function reportToolbar() {
        return `<div class="toolbar tenant-report-toolbar-v1434">
      <input id="reportSearch" value="${escapeHtml(search)}" placeholder="Search reports, IDs, plants or authors..." />
      <select id="reportTemplateQuick" aria-label="Templates" disabled><option value="">Templates</option></select>
      <select id="reportTypeFilter" aria-label="Report type"><option>All Types</option>${['Energy', 'Finance', 'Performance', 'Alerts', 'Custom'].map(value => `<option ${typeFilter === value ? 'selected' : ''}>${value}</option>`).join('')}</select>
      <select id="reportStatusFilter" aria-label="Report status"><option>All Statuses</option>${['Ready', 'Generating', 'Scheduled', 'Failed'].map(value => `<option ${statusFilter === value ? 'selected' : ''}>${value}</option>`).join('')}</select>
      <select id="reportPeriodFilter" aria-label="Report period"><option>All Periods</option><option ${periodFilter === 'Current month' ? 'selected' : ''}>Current month</option><option ${periodFilter === 'Previous month' ? 'selected' : ''}>Previous month</option><option ${periodFilter === 'Last 7 days' ? 'selected' : ''}>Last 7 days</option></select>
      <button class="secondary-action" id="reportFiltersReset" type="button">Reset</button>
    </div>`;
    }
    function reportRows() {
        const rows = filteredReports();
        if (!rows.length)
            return `<div class="empty-state tenant-report-empty-v1434"><strong>No reports available</strong><small>${escapeHtml(unavailableReason())}</small></div>`;
        return rows.map(item => `<div class="data-row tenant-report-row-v1434 ${item.id === selectedReportId ? 'selected' : ''}" data-report-open="${escapeHtml(item.id)}" tabindex="0" role="button">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)} · ${escapeHtml(item.format)}</small></div>
      <div><strong>${escapeHtml(item.type)}</strong><small>${escapeHtml(item.templateId || '—')}</small></div>
      <div><strong>${escapeHtml(item.scope)}</strong><small>Tenant-scoped output</small></div>
      <div><strong>${escapeHtml(item.period)}</strong><small>${escapeHtml(item.frequency)}</small></div>
      <div><span class="badge ${tone(item.status)}">${escapeHtml(item.status)}</span><small>${escapeHtml(item.created)}</small></div>
      <div class="billing-row-actions tenant-report-actions-v1434">
        <button class="secondary-action compact-action" type="button" data-report-download="${escapeHtml(item.id)}" disabled>Download</button>
        <button class="primary-action compact-action" type="button" data-report-preview="${escapeHtml(item.id)}">Open</button>
      </div>
    </div>`).join('');
    }
    function libraryView() {
        return `<section class="panel glass-card tenant-report-library-v1434">
      <div class="panel-head"><div><h2>Report Library</h2><p>Generated, scheduled and failed tenant business reports with preview, export and delivery actions.</p></div><button class="secondary-action" type="button" data-report-export-library data-permission-action="export" data-permission-resource="report" disabled>Export Library</button></div>
      ${reportToolbar()}
      <div class="data-table tenant-report-table-v1434"><div class="data-head"><span>Report</span><span>Type</span><span>Scope</span><span>Period</span><span>Status / Created</span><span>Actions</span></div>${reportRows()}</div>
    </section>`;
    }
    function templateCards() {
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Saved Templates</h2><p>Reusable tenant business report definitions. Select a template to open the builder with its defaults.</p></div><span class="badge info">0 templates</span></div><div class="tenant-report-template-grid-v1434">${templates.length ? templates.map(item => `<article class="tenant-report-template-card-v1434"><div class="tenant-report-template-icon-v1434">${templateIcon(item.type)}</div><div><span class="badge info">${escapeHtml(item.type)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div><div class="tenant-report-template-meta-v1434"><span>Default period</span><strong>${escapeHtml(item.defaultPeriod)}</strong><span>Format</span><strong>${escapeHtml(item.defaultFormat)}</strong><span>Sections</span><strong>${item.sections.length}</strong></div><div class="tenant-report-template-actions-v1434"><button class="primary-action" type="button" data-report-use-template="${escapeHtml(item.id)}">Use Template</button></div></article>`).join('') : `<div class="empty-state"><strong>No report templates available</strong><small>${escapeHtml(unavailableReason())}</small></div>`}</div></section>`;
    }
    function scheduledView() {
        const scheduled = reports.filter(item => item.status === 'Scheduled' || item.frequency !== 'One-time');
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Scheduled Reports</h2><p>Recurring report delivery for the fixed tenant scope.</p></div><button class="primary-action" type="button" data-report-builder="" data-permission-action="create" data-permission-resource="report" disabled>Create Schedule</button></div><div class="data-table tenant-report-schedule-table-v1434"><div class="data-head"><span>Schedule</span><span>Scope</span><span>Frequency</span><span>Next Run</span><span>Delivery</span><span>Actions</span></div>${scheduled.length ? scheduled.map(item => `<div class="data-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)} · ${escapeHtml(item.format)}</small></div><div><strong>${escapeHtml(item.scope)}</strong><small>Tenant scope</small></div><div><strong>${escapeHtml(item.frequency)}</strong><small>${escapeHtml(item.period)}</small></div><div><strong>${escapeHtml(item.nextRun)}</strong><small>Asia/Yerevan</small></div><div><strong>${escapeHtml(item.delivery)}</strong><small>Backend delivery configuration</small></div><div class="billing-row-actions"><button class="secondary-action compact-action" type="button" data-report-run-now="${escapeHtml(item.id)}" disabled>Run Now</button><button class="secondary-action compact-action" type="button" data-report-preview="${escapeHtml(item.id)}">Open</button></div></div>`).join('') : `<div class="empty-state"><strong>No scheduled reports</strong><small>${escapeHtml(unavailableReason())}</small></div>`}</div></section>`;
    }
    function activityView() {
        return `<section class="panel glass-card"><div class="panel-head"><div><h2>Report Activity</h2><p>Generation, delivery, schedule and failure events for this tenant.</p></div><span class="badge info">Audit history</span></div><div class="tenant-report-activity-v1434">${activities.length ? activities.map(item => `<article><span class="tenant-report-activity-dot-v1434 ${tone(item.tone)}"></span><div><strong>${escapeHtml(item.action)}</strong><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.time)} · ${escapeHtml(item.actor)}</small></div></article>`).join('') : `<div class="empty-state"><strong>No report activity available</strong><small>${escapeHtml(unavailableReason())}</small></div>`}</div></section>`;
    }
    function tabContent() {
        if (activeTab === 'templates')
            return templateCards();
        if (activeTab === 'scheduled')
            return scheduledView();
        if (activeTab === 'activity')
            return activityView();
        return libraryView();
    }
    function templateIcon(type) {
        if (type === 'Energy')
            return '⚡';
        if (type === 'Finance')
            return '€';
        if (type === 'Performance')
            return '↗';
        if (type === 'Alerts')
            return '!';
        return '◆';
    }
    function builderModal() {
        const scopeOptions = [
            '<option value="tenant">All tenant plants</option>',
            ...tenantClients.map(client => `<option value="client:${escapeHtml(client.id)}">Client · ${escapeHtml(client.name)}</option>`),
            ...tenantPlants.map(plant => `<option value="plant:${escapeHtml(plant.id)}">Plant · ${escapeHtml(plant.name)}</option>`)
        ].join('');
        const today = new Date().toISOString().slice(0, 10);
        return `<div class="modal tenant-report-builder-modal-v1434" id="reportBuilderModal" aria-hidden="true"><div class="modal-card tenant-report-builder-card-v1434" role="dialog" aria-modal="true" aria-labelledby="reportBuilderTitle"><button class="modal-close" type="button" data-report-close-builder aria-label="Close report builder">×</button><div class="panel-head"><div><p class="eyebrow">Tenant Admin · Report Builder</p><h2 id="reportBuilderTitle">Generate Report</h2><p>Configure a business report for ${escapeHtml(tenantName)}.</p></div><span class="badge warning">API unavailable</span></div><div class="tenant-report-builder-steps-v1434"><article class="active"><span>01</span><strong>Template</strong><small>Choose output purpose</small></article><article><span>02</span><strong>Scope</strong><small>Select tenant assets</small></article><article><span>03</span><strong>Period</strong><small>Choose data window</small></article><article><span>04</span><strong>Delivery</strong><small>Format and schedule</small></article></div><form id="reportBuilderForm" class="tenant-report-builder-form-v1434"><div class="client-form-grid two-col"><label>Report Name<input id="reportBuilderName" required value="" disabled /></label><label>Template<select id="reportBuilderTemplate" disabled><option value="">Reports API unavailable</option></select></label><label>Type<select id="reportBuilderType" disabled><option>Custom</option></select></label><label>Scope<select id="reportBuilderScope" disabled>${scopeOptions}</select></label><label>Period<select id="reportBuilderPeriod" disabled><option>Today</option><option>Last 7 days</option><option>Last 30 days</option><option>This month</option><option>Custom period</option></select></label><label>Format<select id="reportBuilderFormat" disabled><option>PDF</option><option>Excel</option><option>CSV</option></select></label><label data-report-custom-date hidden>From<input id="reportBuilderFrom" type="date" value="${today}" disabled /></label><label data-report-custom-date hidden>To<input id="reportBuilderTo" type="date" value="${today}" disabled /></label><label>Frequency<select id="reportBuilderFrequency" disabled><option>One-time</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label><label>Delivery<select id="reportBuilderDelivery" disabled><option>Portal</option><option>Portal + Email</option><option>Email</option></select></label><label class="wide-field">Email Recipients<input id="reportBuilderRecipients" type="email" placeholder="reports@example.com" disabled /></label><label class="checkbox-label checkbox-inline wide-field"><input id="reportBuilderBranding" type="checkbox" disabled /><span>Include Zentrid tenant branding, generation metadata and source notes</span></label></div><div class="tenant-report-section-preview-v1434"><strong>Included sections</strong><div><span>No backend template data</span></div></div><div class="drawer-actions tenant-report-builder-actions-v1434"><button class="secondary-action" type="button" data-report-close-builder>Cancel</button><button class="primary-action" type="submit" data-permission-action="create" data-permission-resource="report" disabled>Generate Report</button></div></form></div></div>`;
    }
    function previewDrawer() {
        const item = reports.find(reportItem => reportItem.id === selectedReportId);
        if (!item)
            return '<aside class="detail-drawer tenant-report-preview-drawer-v1434" id="reportPreviewDrawer"></aside>';
        return `<aside class="detail-drawer tenant-report-preview-drawer-v1434" id="reportPreviewDrawer" role="dialog" aria-modal="true" aria-labelledby="reportPreviewTitle"><button class="drawer-close" type="button" data-report-close-preview aria-label="Close report preview">×</button><div class="drawer-body"><p class="eyebrow">Tenant Report Preview</p><h2 id="reportPreviewTitle">${escapeHtml(item.name)}</h2><div class="tenant-report-preview-meta-v1434"><span class="badge ${tone(item.status)}">${escapeHtml(item.status)}</span><small>${escapeHtml(item.id)} · ${escapeHtml(item.format)} · ${escapeHtml(item.size)}</small></div><div class="information-grid tenant-report-preview-grid-v1434"><div><span>Type</span><strong>${escapeHtml(item.type)}</strong></div><div><span>Scope</span><strong>${escapeHtml(item.scope)}</strong></div><div><span>Period</span><strong>${escapeHtml(item.period)}</strong></div><div><span>Created</span><strong>${escapeHtml(item.created)}</strong></div><div><span>Author</span><strong>${escapeHtml(item.author)}</strong></div><div><span>Delivery</span><strong>${escapeHtml(item.delivery)}</strong></div></div><section class="tenant-report-preview-section-v1434"><h3>Report Content</h3>${item.sections.map((section, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(section)}</strong><small>${previewSectionDescription(item.type, section)}</small></div></article>`).join('')}</section><label class="tenant-report-send-field-v1434"><span>Email a copy</span><input id="reportPreviewEmail" type="email" placeholder="recipient@example.com" disabled /></label></div><div class="drawer-actions tenant-report-preview-actions-v1434"><button class="secondary-action" type="button" data-report-duplicate="${escapeHtml(item.id)}" disabled>Duplicate</button><button class="secondary-action" type="button" data-report-send="${escapeHtml(item.id)}" disabled>Send</button><button class="primary-action" type="button" data-report-download="${escapeHtml(item.id)}" disabled>Download</button></div></aside>`;
    }
    function previewSectionDescription(type, section) {
        return escapeHtml(`${section} from backend-provided ${type.toLowerCase()} report data.`);
    }
    function render() {
        layout.mount(`<div class="tenant-reports-page-v1434"><section class="page-hero"><div><p class="eyebrow">Tenant Admin · Business Output</p><h1>Reports</h1><p class="muted">Generate, store, preview, schedule, export and share tenant business reports using approved templates and tenant-scoped data.</p></div><div class="hero-actions tenant-report-hero-actions-v1434"><button class="secondary-action" type="button" data-report-export-library data-permission-action="export" data-permission-resource="report" disabled>Export Library</button><button class="create-action" type="button" data-report-builder="" data-permission-action="create" data-permission-resource="report" disabled><span class="pulse"></span><div><strong>+ Generate Report</strong><small>Template · Scope · Period · Format</small></div></button></div></section>${contextBar()}${kpis()}<section class="plant-workspace-v17 tenant-report-workspace-v1434">${sideTabs()}<section class="plant-main-card-v17 tenant-report-main-v1434" id="tenantReportsContent">${tabContent()}</section></section>${builderModal()}${previewDrawer()}</div>`);
        wire();
        layout.enhanceActionMenus?.(document);
    }
    function openBuilder(templateId) {
        builderTemplateId = templateId;
        render();
        const modal = document.getElementById('reportBuilderModal');
        modal?.classList.add('open');
        modal?.setAttribute('aria-hidden', 'false');
    }
    function closeBuilder() {
        const modal = document.getElementById('reportBuilderModal');
        modal?.classList.remove('open');
        modal?.setAttribute('aria-hidden', 'true');
    }
    function openPreview(id) {
        selectedReportId = id;
        saveUi();
        render();
        document.getElementById('reportPreviewDrawer')?.classList.add('open');
    }
    function closePreview() {
        document.getElementById('reportPreviewDrawer')?.classList.remove('open');
    }
    function createReport(event) {
        event.preventDefault();
        layout.toast('Report generation is unavailable because the active backend does not expose a Reports endpoint.');
    }
    function duplicateReport(_id) {
        layout.toast('Report duplication is unavailable because the active backend does not expose a Reports endpoint.');
    }
    function runNow(_id) {
        layout.toast('Scheduled report execution is unavailable because the active backend does not expose a Reports endpoint.');
    }
    function downloadReport(_id) {
        layout.toast('Report download is unavailable because no report file was returned by the backend.');
    }
    function exportLibrary() {
        layout.toast('Report library export is unavailable because the active backend does not expose report records.');
    }
    function sendReport(_id) {
        layout.toast('Report delivery is unavailable because the active backend does not expose a delivery endpoint.');
    }
    function toggleCustomPeriod() {
        const select = document.getElementById('reportBuilderPeriod');
        document.querySelectorAll('[data-report-custom-date]').forEach(element => { element.hidden = select?.value !== 'Custom period'; });
    }
    function refreshBuilderTemplate() {
        // No template endpoint exists in the active Swagger. Keep the existing builder structure disabled.
    }
    function wire() {
        document.querySelectorAll('[data-report-tab]').forEach(button => button.addEventListener('click', () => {
            activeTab = (button.dataset.reportTab || 'library');
            saveUi();
            render();
        }));
        document.querySelectorAll('[data-report-builder]').forEach(button => button.addEventListener('click', () => openBuilder(button.dataset.reportBuilder || builderTemplateId)));
        document.querySelectorAll('[data-report-use-template]').forEach(button => button.addEventListener('click', () => openBuilder(button.dataset.reportUseTemplate || '')));
        document.querySelectorAll('[data-report-close-builder]').forEach(button => button.addEventListener('click', closeBuilder));
        document.querySelectorAll('[data-report-preview]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); openPreview(button.dataset.reportPreview || ''); }));
        document.querySelectorAll('[data-report-open]').forEach(row => {
            row.addEventListener('click', event => { if (!(event.target instanceof Element && event.target.closest('button')))
                openPreview(row.dataset.reportOpen || ''); });
            row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPreview(row.dataset.reportOpen || '');
            } });
        });
        document.querySelectorAll('[data-report-close-preview]').forEach(button => button.addEventListener('click', closePreview));
        document.querySelectorAll('[data-report-download]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); downloadReport(button.dataset.reportDownload || ''); }));
        document.querySelectorAll('[data-report-duplicate]').forEach(button => button.addEventListener('click', () => duplicateReport(button.dataset.reportDuplicate || '')));
        document.querySelectorAll('[data-report-send]').forEach(button => button.addEventListener('click', () => sendReport(button.dataset.reportSend || '')));
        document.querySelectorAll('[data-report-run-now]').forEach(button => button.addEventListener('click', () => runNow(button.dataset.reportRunNow || '')));
        document.querySelectorAll('[data-report-export-library]').forEach(button => button.addEventListener('click', exportLibrary));
        document.querySelectorAll('[data-report-filter-status]').forEach(button => button.addEventListener('click', () => { activeTab = 'library'; statusFilter = button.dataset.reportFilterStatus || 'All Statuses'; render(); }));
        document.getElementById('reportBuilderForm')?.addEventListener('submit', createReport);
        document.getElementById('reportBuilderPeriod')?.addEventListener('change', toggleCustomPeriod);
        document.getElementById('reportBuilderTemplate')?.addEventListener('change', refreshBuilderTemplate);
        const searchInput = document.getElementById('reportSearch');
        searchInput?.addEventListener('change', () => { search = searchInput.value; render(); });
        searchInput?.addEventListener('keydown', event => { if (event.key === 'Enter') {
            search = searchInput.value;
            render();
        } });
        const type = document.getElementById('reportTypeFilter');
        type?.addEventListener('change', () => { typeFilter = type.value; render(); });
        const status = document.getElementById('reportStatusFilter');
        status?.addEventListener('change', () => { statusFilter = status.value; render(); });
        const period = document.getElementById('reportPeriodFilter');
        period?.addEventListener('change', () => { periodFilter = period.value; render(); });
        document.getElementById('reportFiltersReset')?.addEventListener('click', () => { search = ''; typeFilter = 'All Types'; statusFilter = 'All Statuses'; periodFilter = 'All Periods'; render(); });
        const modal = document.getElementById('reportBuilderModal');
        modal?.addEventListener('click', event => { if (event.target === modal)
            closeBuilder(); });
        if (!escapeListenerBound) {
            document.addEventListener('keydown', event => {
                if (event.key !== 'Escape')
                    return;
                closeBuilder();
                closePreview();
            });
            escapeListenerBound = true;
        }
        toggleCustomPeriod();
    }
    async function loadReportScope(force = false) {
        loadState = 'loading';
        loadError = '';
        render();
        const requestOptions = force ? { cache: 'no-store' } : {};
        const results = await Promise.allSettled([
            ZentridPlatformAPI.clients.list(),
            ZentridPlatformAPI.live.plants(requestOptions),
            ZentridPlatformAPI.plantRegistry.list()
        ]);
        const failures = [];
        const valueAt = (index) => {
            const result = results[index];
            if (result?.status === 'fulfilled')
                return result.value;
            if (result?.status === 'rejected')
                failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
            return null;
        };
        tenantClients = mapClients(valueAt(0));
        tenantPlants = mapPlants(valueAt(1), valueAt(2));
        loadError = [...new Set(failures)].join(' · ');
        loadState = failures.length === results.length ? 'error' : (tenantClients.length || tenantPlants.length ? 'ready' : 'empty');
        render();
    }
    render();
    void loadReportScope();
})();
