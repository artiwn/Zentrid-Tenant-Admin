const { existsSync, readFileSync, readdirSync } = require('fs');
const { join, basename } = require('path');

const root = join(__dirname, '..');
const expectedRoot = ['index.html', 'login.html'];
const expectedPages = [
  'alert-detail.html', 'alerts.html', 'client-detail.html', 'clients.html',
  'device-detail.html', 'devices.html', 'energy-analytics.html', 'finance.html',
  'integrations.html', 'plant-detail.html', 'plants.html', 'reports.html',
  'settings.html', 'telemetry.html', 'users.html'
];
const expectedFiles = [...expectedRoot.map(name => join(root, name)), ...expectedPages.map(name => join(root, 'pages', name))];
const failures = [];

for (const file of expectedFiles) {
  if (!existsSync(file)) failures.push(`Missing required route: ${file}`);
}
const actualPages = readdirSync(join(root, 'pages')).filter(name => name.endsWith('.html')).sort();
if (JSON.stringify(actualPages) !== JSON.stringify([...expectedPages].sort())) {
  failures.push(`Unexpected pages set: ${actualPages.join(', ')}`);
}

const existingHtml = new Set([...expectedRoot, ...expectedPages]);
const routePattern = /["'`](?:\.\.\/|\.\/|pages\/)?([A-Za-z0-9_-]+\.html)(?:[?#][^"'`]*)?["'`]/g;
const sourceDirs = [join(root, 'assets', 'js')];
const sourceFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.name.endsWith('.ts')) sourceFiles.push(full);
  }
}
sourceDirs.forEach(walk);
for (const file of [...expectedFiles, ...sourceFiles]) {
  const text = readFileSync(file, 'utf8');
  let match;
  while ((match = routePattern.exec(text))) {
    if (!existingHtml.has(match[1])) failures.push(`Broken route reference ${match[1]} in ${file}`);
  }
}

for (const file of expectedFiles) {
  const text = readFileSync(file, 'utf8');
  const title = text.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  if (!title.includes('Zentrid')) failures.push(`Missing Zentrid title in ${basename(file)}`);
  if (basename(file) !== 'login.html' && !title.includes('Tenant Admin')) failures.push(`Missing Tenant Admin title in ${basename(file)}`);
  if (!text.includes('assets/css/styles.css')) failures.push(`Missing compiled stylesheet reference in ${basename(file)}`);
}

const retired = join(root, 'assets', 'js', 'tenant-admin-pages.ts');
if (existsSync(retired)) failures.push('Retired tenant-admin-pages.ts must not exist.');

const layout = readFileSync(join(root, 'assets', 'js', 'layout.ts'), 'utf8');
if (!layout.includes('window.FleetLayout = FleetLayout')) failures.push('layout.ts must expose FleetLayout through window.FleetLayout.');
for (const route of ['clients.html','plants.html','devices.html','alerts.html','telemetry.html','energy-analytics.html','finance.html','reports.html','integrations.html','users.html','settings.html']) {
  if (!layout.includes(route)) failures.push(`Tenant navigation missing ${route}`);
}
for (const forbidden of ['tenants.html','tenant-detail.html','integration-detail.html','tariff-plans.html','payment-settings.html','admin-console.html']) {
  if (layout.includes(forbidden)) failures.push(`Tenant layout exposes forbidden route ${forbidden}`);
}

const layoutConsumers = ['reports.ts', 'users-access.ts', 'settings.ts'];
for (const name of layoutConsumers) {
  const file = join(root, 'assets', 'js', 'page-scripts', name);
  const text = readFileSync(file, 'utf8');
  if (!text.includes('const layout = window.FleetLayout')) failures.push(`${name} must resolve the shared window.FleetLayout contract.`);
  if (!text.includes('if (!layout?.mount)')) failures.push(`${name} must include a safe layout availability boundary.`);
  if (text.includes('window.FleetLayout.mount(')) failures.push(`${name} contains an unguarded window.FleetLayout.mount call.`);
}

const runtimeText = sourceFiles.map(file => readFileSync(file, 'utf8')).join('\n');
for (const marker of ['FleetOS Tenant Admin', 'FleetOS —', 'fleetos_selected_', 'fleetos_tenant_settings_']) {
  if (runtimeText.includes(marker)) failures.push(`Old branding/runtime marker remains: ${marker}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Release integrity OK: ${expectedFiles.length} routes, ${sourceFiles.length} TypeScript files, standalone navigation verified.`);
