const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pages', 'integrations.html'), 'utf8');
const ts = fs.readFileSync(path.join(root, 'assets', 'js', 'page-scripts', 'integration-health.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'src', '78-tenant-integration-health.css'), 'utf8');

const requiredHtml = ['page-scripts/integration-health.js', 'api-repositories.js', 'zentrid-normalization.js'];
const requiredTs = [
  'Integration Health',
  'Vendor Connectors',
  'Synchronization Health',
  'Data Coverage',
  'Connector Alerts & Failures',
  'Source Mapping',
  'Integration Activity',
  'Export Diagnostics',
  'Read-only',
  'plant-workspace-v17',
  'integration-table',
  'FleetAPIRepositories.integrations.list',
  'FleetAPIRepositories.integrations.summary',
  'registryResult.value.rawItems',
  'summaryResult.value.rawItems',
  'No fallback business data is displayed',
  'No connector failures returned by the API',
  'No source mappings returned by the API',
  'No integration activity returned by the API'
];
const forbiddenActions = ['New Connector', 'Create Integration', 'Activate Integration', 'Archive Integration', 'Edit Credentials', 'Test Connection', 'Run Sync'];
const forbiddenMocks = [
  'fallbackIntegrations',
  'Safe tenant snapshot',
  'INT-HUAWEI-001',
  'INT-GOODWE-002',
  'INT-SOLIS-003',
  'eu5.fusionsolar.huawei.com',
  'eu.semsportal.com',
  'www.soliscloud.com',
  'IF-24071',
  'IF-24068',
  'IF-24061',
  "[item.vendor, 'Power', 'active_power'",
  "[item.vendor, 'Energy', 'energy_total'",
  "[item.vendor, 'Device State', 'operational_status'"
];

for (const value of requiredHtml) if (!html.includes(value)) throw new Error(`Integration Health HTML missing ${value}`);
for (const value of requiredTs) if (!ts.includes(value)) throw new Error(`Integration Health script missing ${value}`);
for (const value of forbiddenActions) if (html.includes(value) || ts.includes(value)) throw new Error(`Tenant Integration Health contains forbidden action: ${value}`);
for (const value of forbiddenMocks) if (ts.includes(value)) throw new Error(`Tenant Integration Health contains mock/fallback content: ${value}`);
if (!css.includes('.tenant-integration-page-v1441')) throw new Error('Integration Health CSS namespace missing.');
console.log('Integration Health API-only parity check passed.');
