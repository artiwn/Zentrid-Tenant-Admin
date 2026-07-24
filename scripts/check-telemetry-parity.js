const { readFileSync } = require('fs');
const html = readFileSync('pages/telemetry.html','utf8');
const source = readFileSync('assets/js/page-scripts/telemetry.ts','utf8');
const platformApi = readFileSync('assets/js/platform-api.ts','utf8');
const css = readFileSync('assets/css/src/70-tenant-telemetry.css','utf8');
const checks = [
  [html, 'page-scripts/telemetry.js', 'Telemetry page must load its dedicated renderer'],
  [source, 'Telemetry Explorer', 'Telemetry Explorer section is missing'],
  [source, 'Recent Samples', 'Telemetry samples table is missing'],
  [source, 'Data Quality', 'Telemetry quality panel is missing'],
  [source, 'Export CSV', 'Telemetry export action is missing'],
  [source, 'Normalized', 'Normalized data scope is missing'],
  [source, 'ZentridPlatformAPI.live.telemetry', 'Telemetry page must read the live telemetry API'],
  [source, 'ZentridPlatformAPI.live.plants', 'Telemetry plant filters must use the live plant API'],
  [source, 'ZentridPlatformAPI.live.devices', 'Telemetry device filters must use the live device API'],
  [platformApi, "FleetAPI.request('/api/telemetry'", 'Platform API must expose GET /api/telemetry'],
  [css, '.telemetry-line-chart-v143', 'Telemetry chart styling is missing']
];
for (const [content, needle, message] of checks) if (!content.includes(needle)) throw new Error(message);
for (const forbidden of ['baseline:', 'spread:', 'seedFrom(', 'buildSeries(', 'FleetClientModel', 'zentrid_demo']) {
  if (source.includes(forbidden)) throw new Error(`Telemetry API-only source must not contain ${forbidden}`);
}
if (html.includes('tenant-admin-pages.js')) throw new Error('Telemetry must not use the simplified tenant-admin-pages renderer.');
console.log('Telemetry & Data API-only parity check OK.');
