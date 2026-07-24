const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const root = process.cwd();
const html = readFileSync(join(root, 'pages', 'reports.html'), 'utf8');
const ts = readFileSync(join(root, 'assets', 'js', 'page-scripts', 'reports.ts'), 'utf8');
const css = readFileSync(join(root, 'assets', 'css', 'src', '77-tenant-reports.css'), 'utf8');
const requiredHtml = ['page-scripts/reports.js', 'client-hierarchy.js', 'data-tenant-page="reports"', 'Zentrid — Tenant Admin · Reports'];
const requiredTs = [
  'Report Library', 'Saved Templates', 'Scheduled Reports', 'Report Builder', 'Generate Report',
  'data-report-download', 'data-report-send', 'Export Library',
  'ZentridPlatformAPI.clients.list()', 'ZentridPlatformAPI.live.plants', 'ZentridPlatformAPI.plantRegistry.list()',
  'const templates: ReportTemplate[] = []', 'const reports: TenantReport[] = []', 'const activities: ReportActivity[] = []',
  'Local demo reports are disabled', 'Report business data is never restored from browser storage'
];
const forbiddenTs = [
  'Global Admin · Report Governance', 'Scope pending', 'Tenant selector', 'Create Tenant', 'Open Tariff Plans', 'System-wide reports',
  'initialReports', 'makePdf(', 'makeSpreadsheet(', 'makeCsv(', 'downloadBlob(', 'saveReports(', 'loadReports(',
  'zentrid.tenant.reports.v1434', 'Monthly Energy Report — July', 'Tenant Finance Summary — July',
  'Weekly Energy Digest', 'Custom Operations Snapshot', 'window.FleetClientModel', 'setTimeout('
];
for (const token of requiredHtml) if (!html.includes(token)) throw new Error(`Reports HTML missing ${token}`);
for (const token of requiredTs) if (!ts.includes(token)) throw new Error(`Reports page missing ${token}`);
for (const token of forbiddenTs) if (ts.includes(token)) throw new Error(`Tenant Reports contains forbidden mock/local content: ${token}`);
if (!css.includes('.tenant-reports-page-v1434')) throw new Error('Reports CSS namespace missing');
if (!existsSync(join(root, 'assets', 'js', 'page-scripts', 'reports.ts'))) throw new Error('Reports script missing');
console.log('Reports API-only parity check OK.');
