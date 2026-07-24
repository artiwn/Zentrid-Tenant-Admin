const { readFileSync } = require('fs');
function read(path){ return readFileSync(path,'utf8'); }
const clients = read('assets/js/client-hierarchy.ts');
const plants = read('assets/js/plants.ts');
const live = read('assets/js/live-api-ui.ts');
const repositories = read('assets/js/api-repositories.ts');
const required = [
  [clients, 'selectedTenantClientForDetail', 'Client Detail must resolve a selected API record'],
  [clients, "source.dataOrigin !== 'live'", 'Client Detail must reject prototype and browser-local records'],
  [clients, "?id=${encodeURIComponent(clientId)}", 'Client route must carry its record id'],
  [plants, "?id=${encodeURIComponent(id)}", 'Plant route must carry its record id'],
  [live, 'FleetAPIRepositories.clients.get(selectedId', 'Client Detail must request the selected client by id'],
  [repositories, 'ZentridPlatformAPI.clients.get(cleanId)', 'Client repository must use the direct backend detail endpoint']
];
for (const [content, needle, message] of required) if (!content.includes(needle)) throw new Error(message);
if (clients.includes("localStorage.setItem('zentrid_selected_client_record'")) throw new Error('Client routing must not persist a browser business-data snapshot.');
if (live.includes('Live Client Detail rerender failed; keeping the existing fallback.')) throw new Error('Client Detail must not preserve a prototype fallback.');
console.log('Client/Plant detail routing check OK.');
