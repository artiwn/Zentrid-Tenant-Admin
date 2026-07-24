const { readFileSync } = require('fs');
const { join } = require('path');
const root = process.cwd();
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Energy Analytics check failed: missing ${label} (${needle}).`);
}
function forbid(text, needle, label) {
  if (text.includes(needle)) throw new Error(`Energy Analytics check failed: forbidden ${label} (${needle}).`);
}
const page = read('pages/energy-analytics.html');
const source = read('assets/js/page-scripts/energy-analytics.ts');
const css = read('assets/css/src/75-tenant-energy-analytics.css');
const manifest = read('assets/css/src/manifest.json');
[
  ['assets/js/client-hierarchy.js', 'tenant asset model'],
  ['assets/js/page-scripts/energy-analytics.js', 'dedicated Energy Analytics script'],
  ['data-tenant-page="energy"', 'energy page identity']
].forEach(([needle,label]) => requireText(page, needle, label));
forbid(page, 'tenant-admin-pages.js', 'simplified tenant renderer');
[
  ['production-page energy-analytics-page-v1431', 'Global Admin Production Center page shell'],
  ['production-context-bar energy-context-bar-v1431', 'production context bar'],
  ['production-detail-workspace energy-workspace-v1431', 'detail workspace'],
  ['production-side-v130 energy-side-v1431', 'side navigation'],
  ['Energy Flow', 'energy flow tab'],
  ['Day Chart', 'day chart tab'],
  ['Week Chart', 'week chart tab'],
  ['Month Chart', 'month chart tab'],
  ['Source Mapping', 'source mapping tab'],
  ['data-energy-open-plant', 'Plant Detail route'],
  ['data-energy-open-telemetry', 'Telemetry route'],
  ['exportCsv', 'CSV export'],
  ['Read-only lineage', 'read-only mapping description']
].forEach(([needle,label]) => requireText(source, needle, label));
[
  ['Global Admin', 'Global Admin label'],
  ['production-normalization.html', 'Global Admin normalization route'],
  ['Tenant → Client → Plant', 'cross-tenant hierarchy selector'],
  ['Open Mapping', 'mapping mutation action']
].forEach(([needle,label]) => forbid(source, needle, label));

[
  ['ZentridPlatformAPI.clients.list()', 'Clients API source'],
  ['ZentridPlatformAPI.live.plants(requestOptions)', 'live Plants API source'],
  ['ZentridPlatformAPI.plantRegistry.list()', 'admin Plants API source'],
  ['ZentridPlatformAPI.live.devices(requestOptions)', 'Devices API source'],
  ['ZentridPlatformAPI.live.telemetry(requestOptions)', 'Telemetry API source'],
  ['No analytics activity endpoint', 'API-only activity empty state']
].forEach(([needle,label]) => requireText(source, needle, label));
[
  ['FleetClientModel', 'prototype client hierarchy data'],
  ['seededRatio', 'seeded energy ratios'],
  ['periodScale', 'synthetic period multiplier'],
  ['const factors', 'synthetic chart factors'],
  ['zentrid_selected_plant_record', 'browser plant snapshot'],
  ['zentrid_selected_client_record', 'browser client snapshot']
].forEach(([needle,label]) => forbid(source, needle, label));

requireText(css, 'Tenant Admin Energy Analytics', 'Energy Analytics CSS fragment');
requireText(css, 'action-column containment', 'Energy Analytics action containment repair');
requireText(manifest, '75-tenant-energy-analytics.css', 'Energy Analytics CSS manifest entry');
const distPage = read('dist/pages/energy-analytics.html');
const distScript = read('dist/assets/js/page-scripts/energy-analytics.js');
const distCss = read('dist/assets/css/styles.css');
requireText(distPage, 'page-scripts/energy-analytics.js', 'built Energy Analytics reference');
requireText(distScript, 'energy-analytics-page-v1431', 'built Energy Analytics runtime');
requireText(distCss, '.energy-analytics-page-v1431', 'built Energy Analytics styles');
console.log('Energy Analytics Global Admin structure/style parity check OK.');
