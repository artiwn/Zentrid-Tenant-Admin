const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const root = process.cwd();
const html = readFileSync(join(root, 'pages', 'finance.html'), 'utf8');
const ts = readFileSync(join(root, 'assets', 'js', 'page-scripts', 'finance.ts'), 'utf8');
const css = readFileSync(join(root, 'assets', 'css', 'src', '76-tenant-finance-billing.css'), 'utf8');
const requiredHtml = ['page-scripts/finance.js', 'client-hierarchy.js', 'data-tenant-page="finance"'];
const requiredTs = [
  'Finance & Billing', 'Current Plan', 'Usage & Charges', 'Invoices', 'Payments',
  'Billing Profile', 'Calculation Trace', 'data-finance-download', 'data-finance-export',
  'ZentridPlatformAPI.auth.me()', 'ZentridPlatformAPI.clients.list()',
  'ZentridPlatformAPI.live.plants', 'ZentridPlatformAPI.plantRegistry.list()',
  'ZentridPlatformAPI.live.devices', 'ZentridPlatformAPI.live.telemetry',
  'No subscription plan returned by the active API', 'No invoices returned by the active API',
  'No payments returned by the active API'
];
const forbiddenTs = [
  'Create Invoice', 'Run Cycle', 'Add Tax Rule', 'Adjust Credit', 'Configure Dunning',
  'ERP Integration', 'Open Tariff Plans', 'FleetClientModel', 'Industrial Operator Plus',
  'INV-2026-', 'PAY-2026-', 'AM-01234567', 'finance@arpisolar', 'estimatedSubtotal',
  'estimatedTotal', 'operatorDiscountPct', 'slaMarkupPct', 'deviceOverage',
  'const payments: FinancePayment[] = [\n', 'const invoices: FinanceInvoice[] = [\n'
];
for (const token of requiredHtml) if (!html.includes(token)) throw new Error(`Finance HTML missing ${token}`);
for (const token of requiredTs) if (!ts.includes(token)) throw new Error(`Finance page missing ${token}`);
for (const token of forbiddenTs) if (ts.includes(token)) throw new Error(`Tenant Finance contains forbidden mock or Global Admin token: ${token}`);
if (!css.includes('.tenant-finance-page-v1433')) throw new Error('Finance CSS namespace missing');
if (!existsSync(join(root, 'assets', 'js', 'page-scripts', 'finance.ts'))) throw new Error('Finance script missing');
console.log('Finance & Billing API-only parity check OK.');
