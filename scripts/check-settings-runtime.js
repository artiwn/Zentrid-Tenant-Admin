const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dist/assets/js/page-scripts/settings.js'), 'utf8');

class ClassList {
  constructor() { this.values = new Set(); }
  add(...items) { items.forEach(item => this.values.add(item)); }
  remove(...items) { items.forEach(item => this.values.delete(item)); }
  contains(item) { return this.values.has(item); }
  toggle(item, force) {
    if (force === undefined) force = !this.values.has(item);
    if (force) this.values.add(item); else this.values.delete(item);
    return force;
  }
}
class MockElement {
  constructor(id = '') { this.id = id; this.dataset = {}; this.classList = new ClassList(); this.attributes = {}; this.innerHTML = ''; this.value = ''; this.checked = false; }
  closest() { return this; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); }
  click() {}
}

(async () => {
  const ids = new Map();
  const listeners = { click: [], input: [], change: [], submit: [] };
  const tabButtons = ['overview','profile','branding','localization','notifications','data','security','activity'].map(tab => {
    const button = new MockElement(); button.dataset.settingsTab = tab; return button;
  });
  let mountedHtml = '';
  let lastToast = '';
  let meCalls = 0;
  const document = {
    body: new MockElement('body'),
    getElementById(id) { return ids.get(id) || null; },
    querySelectorAll(selector) { return selector === '[data-settings-tab]' ? tabButtons : []; },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    createElement() { return new MockElement(); }
  };
  const apiPayload = {
    tenant: {
      displayName: 'API Tenant Energy', tenantCode: 'TEN-API-101', legalName: 'API Tenant Energy LLC',
      registrationNumber: 'REG-API-1', taxId: 'TAX-API-1', country: 'Armenia', city: 'Yerevan',
      address: 'API Street 1', primaryContact: 'API Contact', contactEmail: 'tenant@example.com',
      contactPhone: '+374 00 000000', supportTier: 'Professional', status: 'Active', region: 'Armenia', contractId: 'CONTRACT-API'
    },
    tenantSettings: {
      branding: { displayName: 'API Tenant', shortName: 'AT', portalSubtitle: 'API Operations', theme: 'emerald', status: 'Published', showTenantName: true, includeBrandingInReports: true },
      localization: { timezone: 'Asia/Yerevan', language: 'English', currency: 'AMD', dateFormat: 'YYYY-MM-DD', numberFormat: '1,234.56', powerUnit: 'kW / MW', energyUnit: 'kWh / MWh', temperatureUnit: '°C', irradianceUnit: 'W/m²' },
      notifications: { operationalEmail: 'ops@example.com', emailChannel: true, inAppChannel: true, criticalAlerts: true },
      data: { defaultTimeRange: 'Last 24 hours', telemetryGranularity: '15 minutes', useNormalizedData: true, mappingPolicy: 'Canonical v1' },
      security: { adminMfa: true, stepUpAuth: true, sessionTimeout: '30 minutes', exportReauthentication: true, restrictExternalSharing: true },
      activity: [{ id:'API-EVT-1', event:'Settings loaded', area:'Profile', description:'Returned by API.', actor:'Backend', time:'2026-07-23T10:00:00Z', status:'Applied' }]
    }
  };
  const window = {
    FleetLayout: {
      state: { tenant: 'Session tenant', time: 'Last 24h', region: 'All Regions' },
      mount(html) {
        mountedHtml = html;
        ids.clear();
        ids.set('tenantSettingsTabContent', new MockElement('tenantSettingsTabContent'));
        ids.set('tenantSettingsDrawer', new MockElement('tenantSettingsDrawer'));
        ids.set('tenantSettingsDrawerContent', new MockElement('tenantSettingsDrawerContent'));
      },
      toast(message) { lastToast = message; }
    },
    ZentridPlatformAPI: { auth: { async me() { meCalls += 1; return apiPayload; } } }
  };
  window.window = window;
  const sandbox = {
    window, document,
    Element: MockElement, HTMLElement: MockElement, HTMLInputElement: MockElement, HTMLSelectElement: MockElement, HTMLFormElement: MockElement,
    Blob: class Blob {}, URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Date, JSON, Math, String, Boolean, Array, Object, Set, Map, Promise, console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'settings.js' });
  await new Promise(resolve => setImmediate(resolve));
  await Promise.resolve();

  if (meCalls !== 1) throw new Error(`Expected one /api/Auth/me load, received ${meCalls}.`);
  if (!mountedHtml.includes('API Tenant Energy') || !mountedHtml.includes('theme-emerald')) throw new Error('API-backed settings shell did not rerender.');
  const tabContent = ids.get('tenantSettingsTabContent');
  if (!tabContent.innerHTML.includes('Tenant Configuration Overview') || !tabContent.innerHTML.includes('TEN-API-101')) throw new Error('API-backed overview did not render.');
  if (source.includes('localStorage') || source.includes('zentrid_tenant_settings_profile_v1437')) throw new Error('Compiled settings runtime still contains browser-local settings storage.');

  const click = listeners.click[0];
  const brandingTab = new MockElement(); brandingTab.dataset.settingsTab = 'branding';
  click({ target: brandingTab });
  if (!ids.get('tenantSettingsTabContent').innerHTML.includes('API Operations')) throw new Error('Branding tab did not render API values.');

  const editBranding = new MockElement(); editBranding.dataset.settingsEdit = 'branding';
  click({ target: editBranding });
  if (!ids.get('tenantSettingsDrawer').classList.contains('open')) throw new Error('Existing Settings drawer interaction was not preserved.');
  if (!ids.get('tenantSettingsDrawerContent').innerHTML.includes('tenantBrandingForm')) throw new Error('Existing Branding form structure was not preserved.');

  const form = new MockElement('tenantBrandingForm');
  listeners.submit[0]({ target: form, preventDefault() {} });
  if (!lastToast.includes('read-only') || !lastToast.includes('Tenant Settings mutation endpoint')) throw new Error('Unsupported mutation did not surface the API limitation.');

  const preview = new MockElement(); preview.dataset.themePreview = 'violet';
  click({ target: preview });
  if (!lastToast.includes('read-only')) throw new Error('Theme preview incorrectly performed a local mutation.');
  console.log('Tenant Settings API-only runtime contract check passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
