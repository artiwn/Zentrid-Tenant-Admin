const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const plants = read('assets/js/plants.ts');
const layout = read('assets/js/layout.ts');
const plantsHtml = read('pages/plants.html');
const detailHtml = read('pages/plant-detail.html');
const detail = read('assets/js/client-hierarchy.ts');
const manifest = JSON.parse(read('assets/css/src/manifest.json'));

const renderStart = plants.indexOf('function renderPlants(): string {');
const renderEnd = plants.indexOf('function plantEventTarget', renderStart);
const renderer = plants.slice(renderStart, renderEnd);

const requiredMarkers = [
  'class="page-hero"',
  'class="context-bar glass-card"',
  'class="panel glass-card"',
  'class="toolbar plant-registry-toolbar"',
  'class="data-table plant-table"',
  'plant-create-modal',
  'client-create-form setup-layout asset-create-form',
  'setup-rail client-create-rail asset-create-rail',
  'data-asset-panel="client"',
  'data-asset-panel="plant-profile"',
  'data-asset-panel="review"',
  'function renderPlantDetail()',
  'class="client-layout-v17 detail-layout-standard"',
  'class="glass-card plant-side-card-v17"',
  'class="glass-card plant-main-card-v17"'
];
for (const marker of requiredMarkers) {
  if (!plants.includes(marker)) throw new Error(`Plants parity marker missing: ${marker}`);
}

const forbiddenRendererMarkers = ['Group Management', 'Create Group', 'Back to Groups', 'groupsCatalogView', 'groupCreateModal'];
for (const marker of forbiddenRendererMarkers) {
  if (renderer.includes(marker)) throw new Error(`Tenant Plant Registry still contains Groups UI: ${marker}`);
}

if (!plants.includes('return Array.isArray(window.ZentridLivePlants) ? window.ZentridLivePlants : [];')) throw new Error('Plant Registry is not API-only.');
for (const marker of ['demoPlantSeed', 'zentrid_demo_plants', 'zentrid_custom_plants', 'FleetLocalStore.addPlant', 'Plant created locally']) {
  if (plants.includes(marker)) throw new Error(`Plant Registry/Create Plant still contains browser-local data fallback: ${marker}`);
}
if (!plants.includes('FleetAPIMutations.plants.create(payload)')) throw new Error('Create Plant is not connected to the backend mutation.');
if (!plants.includes("FleetAPIRepositories.clients.list({ page:1, pageSize:200")) throw new Error('Create Plant client selector is not populated from the Clients API.');
if (!plants.includes('Tenant Admin · Customers & Assets')) throw new Error('Tenant Plants page identity missing.');
if (!plants.includes('const tenantValue = currentTenantScope();')) throw new Error('Create Plant does not lock the tenant scope.');
if (!plants.includes('options:[currentTenantScope()]')) throw new Error('Vendor company field is not tenant-scoped.');
if (plants.includes("params.get('tenant')")) throw new Error('Create Plant still accepts tenant scope from URL parameters.');
if (plants.includes('Run Plant Sync')) throw new Error('Tenant Admin must not expose platform sync execution.');
if (!plants.includes('<strong>Data Updated</strong>')) throw new Error('Legacy Plant Detail fallback must show read-only freshness instead of sync execution.');
if (!detail.includes("function plantDetailEditableTab(tab: PlantDetailTabKey = plantDetailActiveTab): boolean { return tab === 'overview'; }")) throw new Error('Tenant Admin must not edit Settings & Source fields.');
if (!detail.includes('function selectedTenantPlantForDetail()')) throw new Error('Plant Detail is not synchronized with the selected Plant Registry record.');
if (layout.includes('pages/plants.html?view=solar')) throw new Error('Plants navigation must open the standalone registry directly.');

for (const html of [plantsHtml, detailHtml]) {
  if (!html.includes('assets/css/styles.css')) throw new Error('Plant page does not use the shared Zentrid stylesheet.');
}
if (!plantsHtml.includes('assets/js/plants.js')) throw new Error('Plant Registry does not use the canonical plant renderer.');
if (!detailHtml.includes('assets/js/client-hierarchy.js')) throw new Error('Plant Detail does not use the canonical Global Admin detail workspace renderer.');

const requiredCss = [
  'components/information-grid-content.css',
  'components/data-table-content.css',
  'components/form-primitives.css',
  'components/form-readiness.css',
  'components/compact-actions.css',
  'components/detail-card-shells.css',
  'components/information-cell-overflow.css',
  'components/data-table-layout.css',
  'components/actions.css',
  'components/live-data-states.css',
  'components/data-source-indicators.css',
  'components/data-freshness-controls.css',
  'components/detail-lazy-tabs.css',
  'components/content-resilience.css',
  'components/responsive-accessibility.css'
];
for (const css of requiredCss) {
  if (!manifest.sources.includes(css)) throw new Error(`Plants shared CSS missing from manifest: ${css}`);
  if (!fs.existsSync(path.join(root, 'assets/css/src', css))) throw new Error(`Plants shared CSS file missing: ${css}`);
}

console.log('Tenant Admin Plants parity: OK');
