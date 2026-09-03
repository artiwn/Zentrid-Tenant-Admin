const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const devices = read('assets/js/devices.ts');
const live = read('assets/js/live-api-ui.ts');
const mutations = read('assets/js/api-mutations.ts');
const permissions = read('assets/js/action-permissions.ts');
const page = read('pages/device-detail.html');
const required = [
  ['device lifecycle UI', devices.includes('data-device-lifecycle-action="activate"') && devices.includes('data-device-lifecycle-action="archive"')],
  ['device lifecycle mutations', mutations.includes('device.activate') && mutations.includes('device.deactivate') && mutations.includes('device.archive')],
  ['device documents upload', devices.includes('FleetAPIMutations.devices.uploadDocument') && mutations.includes('device.document.upload')],
  ['device documents download', devices.includes('ZentridPlatformAPI.deviceRegistry.getDocument')],
  ['device documents delete', devices.includes('FleetAPIMutations.devices.deleteDocument') && mutations.includes('device.document.delete')],
  ['device audit endpoint', live.includes('deviceRegistry?.audit') && devices.includes('deviceAuditTimeline(d.auditDetail)')],
  ['audit lazy tabs', live.includes("tabs: ['audit', 'activity']")],
  ['commands stay gated', devices.includes('Command contract pending') && devices.includes('/api/admin/devices/{id}/commands')],
  ['device lifecycle permission', permissions.includes("device: ['view', 'activate', 'deactivate', 'archive', 'document', 'export']")],
  ['plant lifecycle permission aligned', permissions.includes("plant: ['view', 'create', 'edit', 'activate', 'deactivate', 'archive', 'document', 'export']")],
  ['client lifecycle permission aligned', permissions.includes("client: ['view', 'create', 'edit', 'activate', 'deactivate', 'suspend', 'archive', 'document', 'export']")],
  ['device detail loads mutations runtime', page.includes('api-mutations.js')]
];
const failed = required.filter(([,ok]) => !ok);
if (failed.length) {
  console.error('Device lifecycle check failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}
console.log('Tenant device lifecycle/documents/audit wiring: OK');
