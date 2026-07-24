const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('pages/settings.html');
const script = read('assets/js/page-scripts/settings.ts');
const css = read('assets/css/src/80-tenant-settings.css');

const requiredHtml = ['page-scripts/settings.js', 'data-tenant-page="settings"', 'platform-api.js'];
const requiredScript = [
  'Tenant Settings', 'Organization Profile', 'Branding', 'Localization & Units', 'Notifications',
  'Data & Reports', 'Security Defaults', 'Activity', 'tenantProfileForm', 'tenantBrandingForm',
  'tenantLocalizationForm', 'tenantNotificationsForm', 'tenantDataForm', 'tenantSecurityForm',
  'Export Snapshot', 'loadSettings', 'ZentridPlatformAPI?.auth?.me', '/api/Auth/me',
  'This setting is read-only because the active Swagger does not provide a Tenant Settings mutation endpoint.'
];
const forbidden = [
  'tenant-admin-pages.js', 'Create Tenant', 'Tariff Plans', 'Payment Routing', 'API Credentials',
  'Identity Provider Configuration', 'zentrid_tenant_settings_profile_v1437',
  'zentrid_tenant_settings_brand_v1437', 'zentrid_tenant_settings_events_v1437',
  'localStorage', 'defaultEvents', 'persist()', "addEvent('", 'Arpi Solar Group', 'TEN-ARPI-001',
  'Anna Hakobyan', 'Mariam Sargsyan', 'David Martirosyan', 'CTR-2026-041', 'admin@arpi.example'
];
for (const value of requiredHtml) if (!html.includes(value)) throw new Error(`Settings HTML missing: ${value}`);
for (const value of requiredScript) if (!script.includes(value)) throw new Error(`Settings script missing: ${value}`);
for (const value of forbidden) if (html.includes(value) || script.includes(value)) throw new Error(`Settings contains forbidden mock/local content: ${value}`);
if (!css.includes('.tenant-settings-page-v1437')) throw new Error('Settings CSS namespace missing.');
if (!css.includes('targeted Tenant Settings visual repairs')) throw new Error('Settings information-grid repair styles missing.');
if (/style\s*=/.test(script)) throw new Error('Settings script must not generate inline style attributes.');
console.log('Tenant Settings API-only parity check passed.');
