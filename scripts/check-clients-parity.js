const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const hierarchy = read('assets/js/client-hierarchy.ts');
const clientsHtml = read('pages/clients.html');
const detailHtml = read('pages/client-detail.html');
const manifest = JSON.parse(read('assets/css/src/manifest.json'));
const requiredMarkers = [
  'class="page-hero"',
  'class="context-bar glass-card"',
  'class="panel glass-card"',
  'class="toolbar"',
  'client-table-v17 client-registry-table-v28',
  'client-create-modal wide-modal',
  'client-create-form setup-layout',
  'setup-rail client-create-rail',
  'data-client-create-panel="identity"',
  'data-client-create-panel="review"',
  'function renderClientDetailPage()'
];
for (const marker of requiredMarkers) {
  if (!hierarchy.includes(marker)) throw new Error(`Clients parity marker missing: ${marker}`);
}
if (!hierarchy.includes('Tenant Admin · Client Registry')) throw new Error('Tenant Admin Clients identity missing.');
if (!hierarchy.includes('value="${clientDetailAttr(tenantName)}"')) throw new Error('Create Client must use fixed tenant scope.');
if (hierarchy.includes('select name="tenant"')) throw new Error('Tenant Admin must not offer tenant selection in Create Client.');
if (hierarchy.includes("const tenants = ['Tenant Alpha Energy'")) throw new Error('Global tenant selector fixture remains in Tenant Admin.');
if (!hierarchy.includes("client.dataOrigin === 'live'")) throw new Error('Client Registry must filter out prototype and browser-local records.');
if (!hierarchy.includes('FleetAPIMutations.clients.create(payload)')) throw new Error('Create Client must use the confirmed backend mutation.');
if (hierarchy.includes('Client created locally. Opening Client Detail.')) throw new Error('Create Client still uses the browser-local fallback.');
for (const html of [clientsHtml, detailHtml]) {
  if (!html.includes('assets/css/styles.css')) throw new Error('Client page does not use the shared Zentrid stylesheet.');
  if (!html.includes('assets/js/client-hierarchy.js')) throw new Error('Client page does not use the canonical client renderer.');
}
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
  'components/ux-consistency.css'
];
for (const css of requiredCss) {
  if (!manifest.sources.includes(css)) throw new Error(`Clients shared CSS missing from manifest: ${css}`);
  if (!fs.existsSync(path.join(root, 'assets/css/src', css))) throw new Error(`Clients shared CSS file missing: ${css}`);
}
console.log('Tenant Admin Clients parity: OK');
