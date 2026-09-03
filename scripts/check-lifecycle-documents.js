const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const hierarchy = read('assets/js/client-hierarchy.ts');
const mutations = read('assets/js/api-mutations.ts');
const platform = read('assets/js/platform-api.ts');
const pages = ['pages/client-detail.html','pages/plant-detail.html','pages/clients.html','pages/plants.html'].map(read).join('\n');
const required = [
  ['client PUT flow', hierarchy.includes('FleetAPIMutations.clients.update')],
  ['client canonical create DTO', ['tenantLink:','identity:','address:','preferences:','primaryContact:','portalAccount:','documentation:','bankAccounts:'].every(marker => hierarchy.includes(marker)) && !hierarchy.includes('hasClientPassportFile')],
  ['client lifecycle UI', hierarchy.includes('data-client-lifecycle="activate"') && hierarchy.includes('data-client-lifecycle="archive"')],
  ['client document upload', hierarchy.includes('FleetAPIMutations.clients.uploadDocument')],
  ['client document download', hierarchy.includes('ZentridPlatformAPI.clients.getDocument')],
  ['client document delete', hierarchy.includes('FleetAPIMutations.clients.deleteDocument')],
  ['client create document follow-up', hierarchy.includes('uploadClientCreateDocuments(backendId,form)')],
  ['client create document metadata', hierarchy.includes('data-doc-expiry=\"clientPassportExpiry\"') && hierarchy.includes('data-doc-type=\"Identity\"')],
  ['client lifecycle status read-only', hierarchy.includes('Use Lifecycle Actions to change it.')],
  ['unsupported client commercial fields read-only', hierarchy.includes('Billing Profile and Support Tier remain read-only.') && hierarchy.includes('Read-only until a supported commercial update contract is available.')],
  ['plant PUT flow', hierarchy.includes('FleetAPIMutations.plants.update')],
  ['plant lifecycle UI', hierarchy.includes('data-plant-lifecycle="activate"') && hierarchy.includes('data-plant-lifecycle="archive"')],
  ['plant document upload', hierarchy.includes('FleetAPIMutations.plants.uploadDocument')],
  ['plant document download', hierarchy.includes('ZentridPlatformAPI.plantRegistry.getDocument')],
  ['plant document delete', hierarchy.includes('FleetAPIMutations.plants.deleteDocument')],
  ['client mutation endpoints', ['/api/admin/clients/${encoded(id)}','/activate','/deactivate','/suspend','/archive','/documents'].every(x => mutations.includes(x))],
  ['plant mutation endpoints', mutations.includes('/api/admin/plants/${encoded(id)}') && mutations.includes('plant.document.upload') && mutations.includes('plant.document.delete')],
  ['platform document GET support', platform.includes('getDocument')],
  ['permission guards on lifecycle writes', hierarchy.includes("action, resource:'client'") && hierarchy.includes("action, resource:'plant'")],
  ['detail pages load mutations runtime', pages.includes('api-mutations.js')]
];
const failed = required.filter(([,ok]) => !ok);
if (failed.length) {
  console.error('Lifecycle/Documents check failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}
console.log('Tenant lifecycle/documents API wiring: OK');
