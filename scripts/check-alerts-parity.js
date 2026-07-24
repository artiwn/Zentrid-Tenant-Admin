const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const alerts = read('assets/js/alerts.ts');
const liveApiUi = read('assets/js/live-api-ui.ts');
const listHtml = read('pages/alerts.html');
const detailHtml = read('pages/alert-detail.html');
const manifest = JSON.parse(read('assets/css/src/manifest.json'));

const required = [
  'function renderAlertsPage(): string {',
  '<h1>Alerts & Events</h1>',
  'class="context-bar glass-card alert-context-bar-v142"',
  'class="kpi-grid compact-kpis alert-kpis"',
  'class="filter-bar glass-card alert-filter-bar"',
  'class="data-table alerts-table"',
  'Operational Alert Inbox',
  'function renderAlertDetailContent(a: FleetAlertRecord): string {',
  'class="alert-detail-hero glass-card"',
  'class="alert-detail-layout-v71 detail-layout-v58 detail-layout-standard"',
  'class="setup-rail alert-detail-nav-v71"',
  'data-tab="classification"',
  'data-tab="case"',
  'data-tab="sop"',
  'data-tab="timeline"',
  'data-tab="related"',
  'data-tab="activity"',
  'function currentAlertTenantScope(): string',
  'function alertRegistryRecords(): FleetAlertRecord[]',
  'const liveRows = Array.isArray(window.ZentridLiveAlerts)',
  'function tenantScopedAlerts(): FleetAlertRecord[]',
  'return alertRegistryRecords();',
  'return scoped.map(alert => normalizeAlertTenant(alert, tenantName));',
  'function renderAlertDetailUnavailable(message =',
  'data-alert-api-unavailable',
  'No SOP checklist returned',
  'No activity records returned',
  'Tenant Admin · Operations',
  'Vendor Source Mapping',
  'Read-only',
  'Acknowledge Alert',
  'Assign Owner',
  'Escalate',
  'Resolve Alert'
];
for (const marker of required) if (!alerts.includes(marker)) throw new Error(`Alerts parity marker missing: ${marker}`);

const forbidden = [
  'id="tenantFilter"',
  'queryState?.params.tenant',
  'ctx.tenant',
  'All Tenants',
  'Global Admin',
  'Open Alert Dictionary',
  "location.href='alert-dictionary.html'",
  "location.href='admin-console.html'",
  "location.href='data-governance.html'"
];
for (const marker of forbidden) if (alerts.includes(marker)) throw new Error(`Tenant Alerts exposes forbidden Global Admin/scope marker: ${marker}`);


const apiOnlyRequired = [
  "window.ZentridLiveAlerts = data;",
  "window.ZentridLiveAlerts = [];",
  "No browser-local or prototype alert records are displayed.",
  "FleetAPIRepositories.alerts.get(selectedId",
  "window.ZentridLiveAlerts = data;",
  "FleetLayout.mount(renderAlertDetailUnavailable"
];
for (const marker of apiOnlyRequired) if (!liveApiUi.includes(marker)) throw new Error(`Alerts API-only marker missing: ${marker}`);
const apiOnlyForbidden = [
  'Mock Alerts data remains visible.',
  'const alertStore = window.FleetAlerts',
  '(alertStore as AnyRecord[]).splice'
];
for (const marker of apiOnlyForbidden) if (liveApiUi.includes(marker)) throw new Error(`Alerts registry still exposes mock fallback behavior: ${marker}`);


const detailMockForbidden = [
  'const FleetAlerts:',
  'FleetAlertFallbackSeed',
  'zentrid_alert_runtime_',
  'Alert Detail keeps its mock fallback.',
  'Case context prepared by Zentrid',
  'Waiting for operator acknowledgement',
  '12 Jun 2026',
  '232 V',
  'WO-00418'
];
for (const marker of detailMockForbidden) {
  if (alerts.includes(marker) || liveApiUi.includes(marker)) throw new Error(`Alert Detail still exposes mock behavior: ${marker}`);
}

if (!listHtml.includes('assets/js/alerts.js')) throw new Error('Alerts page does not use the canonical alert renderer.');
if (!detailHtml.includes('assets/js/alerts.js')) throw new Error('Alert Detail does not use the canonical alert renderer.');
if (!listHtml.includes('assets/css/styles.css') || !detailHtml.includes('assets/css/styles.css')) throw new Error('Alert pages do not use the shared Zentrid stylesheet.');
if (!listHtml.includes('data-tenant-page="alerts"') || !detailHtml.includes('data-tenant-page="alert-detail"')) throw new Error('Alert pages are missing Tenant Admin page identity.');

const css = [
  '30-tenant-devices-alerts.css',
  'components/card-surfaces.css',
  'components/action-layouts.css',
  'components/metric-card-content.css',
  'components/information-grid-content.css',
  'components/data-table-layout.css',
  'components/data-table-content.css',
  'components/compact-actions.css',
  'components/detail-card-shells.css',
  'components/live-data-states.css',
  'components/data-source-indicators.css',
  'components/content-resilience.css',
  'components/responsive-accessibility.css'
];
for (const file of css) {
  if (!manifest.sources.includes(file)) throw new Error(`Alert CSS missing from manifest: ${file}`);
  if (!fs.existsSync(path.join(root, 'assets/css/src', file))) throw new Error(`Alert CSS source missing: ${file}`);
}
console.log('Tenant Admin Alerts parity: OK');
