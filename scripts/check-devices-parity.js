const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const devices = read('assets/js/devices.ts');
const listHtml = read('pages/devices.html');
const detailHtml = read('pages/device-detail.html');
const manifest = JSON.parse(read('assets/css/src/manifest.json'));

const required = [
  'function renderDevices(): string {',
  'class="page-hero"',
  'class="context-bar glass-card"',
  'class="panel glass-card"',
  'class="data-table device-table"',
  'class="detail-drawer" id="deviceSourceDrawer"',
  'function renderDeviceDetail(): string {',
  'device-hero-v58 device-hero-v59',
  'class="kpi-grid detail-kpis device-kpi-grid-v58 device-kpi-grid-v59"',
  'class="detail-layout-v58 device-detail-layout-v58 device-detail-layout-v59"',
  'class="detail-side-nav device-detail-nav-v58 device-detail-nav-v92"',
  "button('overview','Overview')",
  "button('passport','Technical Passport')",
  "button('connectivity-full','Connectivity')",
  "button('telemetry','Telemetry Summary')",
  "button('architecture','Topology')",
  "button('alerts','Alerts / Events')",
  "button('configuration','Configuration Snapshot')",
  "button('source','Source & Sync')",
  'function currentDeviceTenantScope(): string',
  'function deviceRegistryRecords(): ZentridDeviceRecord[]',
  'const all=deviceRegistryRecords();',
  'function deviceBelongsToTenant',
  'return scopedLive.map(row => normalizeDeviceTenant(row, tenantName));',
  'Tenant Admin · Customers & Assets',
  'Registry read-only',
  'Configuration Snapshot',
  'Tenant Access',
  'Read-only configuration',
  'function renderDeviceDetailUnavailable',
  'function deviceRelatedAlerts'
];
for (const marker of required) if (!devices.includes(marker)) throw new Error(`Devices parity marker missing: ${marker}`);

const forbidden = [
  'id="openDeviceCreate"',
  'id="deviceCreateModal"',
  'Save Device',
  'Open Command Center',
  'Remote Actions',
  'Data Governance',
  "location.href='integration-detail.html'",
  "location.href='tasks-work-orders.html'",
  'Updated by Global Admin',
  'Global Admin only',
  'Global Admin controlled',
  'function remoteControlPanel',
  'const demoDevices',
  'zentrid_demo_devices',
  'zentridExtraDeviceTypesV59',
  'zentridDefaultDevicesV59',
  'Mock trend',
  'Mock normalized telemetry values',
  'SUN2000-50KTL-M0',
  'BN2251034144',
  'No active issues',
  'Updated by Tenant Admin · 15 Jun 2026',
  'The existing Device Detail mock remains visible.'
];
for (const marker of forbidden) if (devices.includes(marker)) throw new Error(`Tenant Devices exposes forbidden Global Admin/write marker: ${marker}`);

const registryBlock = devices.slice(devices.indexOf('function wireDevices(): void {'), devices.indexOf('function devicePortalStatusTextV92'));
const renderRegistryBlock = devices.slice(devices.indexOf('function renderDevices(): string {'), devices.indexOf('function devicePrimaryMetric'));
if (registryBlock.includes('devices()')) throw new Error('Device Registry still reads the shared mock-capable device source.');
if (renderRegistryBlock.includes('const all=devices();')) throw new Error('Device Registry renderer still reads mock-capable devices().');
const liveUi = read('assets/js/live-api-ui.ts');
if (liveUi.includes('Mock Device List data remains visible.')) throw new Error('Device API empty/error state still preserves mock data.');


const detailPageScript = read('assets/js/page-scripts/device-detail.ts');
if (detailPageScript.includes('FleetLayout.mount(renderDeviceDetail())')) throw new Error('Device Detail still mounts before the backend record is loaded.');
if (!detailPageScript.includes("document.body.dataset.detailMounted = 'device'")) throw new Error('Device Detail API-only bootstrap marker is missing.');
if (!liveUi.includes("FleetAPIRepositories.devices.get(selectedId")) throw new Error('Device Detail does not resolve the selected record through the API repository.');
if (liveUi.includes('The existing Device Detail mock remains visible.')) throw new Error('Device Detail still preserves a mock fallback.');

if (!listHtml.includes('assets/js/devices.js') || !listHtml.includes('assets/js/page-scripts/devices.js')) throw new Error('Device List does not use the canonical device renderer.');
if (!detailHtml.includes('assets/js/devices.js') || !detailHtml.includes('assets/js/page-scripts/device-detail.js')) throw new Error('Device Detail does not use the canonical detail renderer.');
if (!listHtml.includes('assets/css/styles.css') || !detailHtml.includes('assets/css/styles.css')) throw new Error('Device pages do not use the shared Zentrid stylesheet.');

const css = ['10-tenant-assets.css','11-tenant-asset-details.css','30-tenant-devices-alerts.css','components/data-table-layout.css','components/data-table-content.css','components/detail-card-shells.css','components/detail-lazy-tabs.css','components/live-data-states.css','components/data-source-indicators.css','components/content-resilience.css','components/responsive-accessibility.css'];
for (const file of css) {
  if (!manifest.sources.includes(file)) throw new Error(`Device CSS missing from manifest: ${file}`);
  if (!fs.existsSync(path.join(root, 'assets/css/src', file))) throw new Error(`Device CSS source missing: ${file}`);
}
console.log('Tenant Admin Devices parity: OK');
