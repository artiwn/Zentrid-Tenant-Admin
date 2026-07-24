const { readFileSync } = require('fs');
const { resolve } = require('path');

const root = process.cwd();
const source = readFileSync(resolve(root, 'assets/js/overview.ts'), 'utf8');
const live = readFileSync(resolve(root, 'assets/js/live-api-ui.ts'), 'utf8');
const data = readFileSync(resolve(root, 'assets/js/data.ts'), 'utf8');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(root, 'assets/css/src/manifest.json'), 'utf8'));

const requiredTokens = [
  'Tenant Operations Center · API-only',
  'Backend API only',
  'data-live-refresh="overview"',
  'class="context-bar glass-card"',
  'class="kpi-grid"',
  'class="dashboard-grid two-col"',
  'class="health-bars"',
  'class="table-list"',
  'class="quality-grid"',
  "drawer.className = 'detail-drawer'",
  'class="drawer-metrics rich"',
  'window.renderOverview',
  'window.wireOverview'
];
for (const token of requiredTokens) {
  if (!source.includes(token)) throw new Error(`Tenant Overview API-only renderer is missing token: ${token}`);
}

const forbiddenBusinessFixtures = [
  '8.2 MW',
  '124 MWh',
  '€24,500',
  'Plant A',
  'Gyumri Solar West',
  'Armavir Solar Park',
  'Arpi Rooftop 01',
  'Huawei FusionSolar',
  'GoodWe SEMS',
  'SolisCloud',
  'DeyeCloud',
  'Invoice INV-2026-071',
  'tenantOverviewMiniBars',
  'map-world',
  'activity-feed'
];
for (const token of forbiddenBusinessFixtures) {
  if (source.includes(token)) throw new Error(`Tenant Overview still contains prototype business data or UI: ${token}`);
}

const forbiddenRoleTokens = [
  'Global Admin Overview',
  'All Tenants',
  'Top Tenants',
  'Tenant Registry',
  'Data Governance',
  'Admin Console',
  'Create Tenant',
  'data-route="tenants"',
  'data-route="data-governance"',
  'data-route="admin-console"'
];
for (const token of forbiddenRoleTokens) {
  if (source.includes(token)) throw new Error(`Tenant Overview contains forbidden Global Admin content: ${token}`);
}

if (!data.includes('window.TenantOverviewData = {')) throw new Error('Tenant Overview must use an empty runtime API data store.');
for (const token of ['applyOverviewDataFromLive', 'window.TenantOverviewData', 'No prototype fallback is displayed.']) {
  if (!live.includes(token)) throw new Error(`Live API bridge is missing Tenant Overview API-only behavior: ${token}`);
}
if (live.includes('applyOverviewMockFromLive')) throw new Error('Legacy mock overview adapter must be removed.');

const requiredScripts = [
  'assets/js/overview.js',
  'assets/js/api-contracts.js',
  'assets/js/api-repositories.js',
  'assets/js/data-freshness-controls.js',
  'assets/js/live-api-ui.js'
];
for (const script of requiredScripts) {
  if (!index.includes(script)) throw new Error(`index.html must load ${script}.`);
}
if (index.includes('assets/js/tenant-admin-pages.js')) throw new Error('index.html must not use the simplified tenant-admin-pages overview renderer.');

const requiredCss = [
  'components/badge-base.css',
  'components/card-surfaces.css',
  'components/action-layouts.css',
  'components/metric-card-content.css',
  'components/badge-tones.css',
  'components/modal-drawer-shells.css',
  'components/metric-card-overflow.css',
  'components/content-resilience.css',
  'components/responsive-accessibility.css',
  'components/live-data-states.css',
  'components/data-freshness-controls.css'
];
for (const file of requiredCss) {
  if (!manifest.sources.includes(file)) throw new Error(`CSS manifest is missing shared API-driven component: ${file}`);
}

console.log('Tenant Overview API-only parity check OK.');
