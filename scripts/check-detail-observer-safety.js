const { readFileSync } = require('fs');
const { join } = require('path');
const root = process.cwd();
const read = p => readFileSync(join(root, p), 'utf8');
const clientHtml = read('pages/client-detail.html');
const plantHtml = read('pages/plant-detail.html');
const sandbox = read('assets/js/detail-observer-sandbox.ts');
const permissions = read('assets/js/action-permissions.ts');
for (const [name, html] of [['Client Detail', clientHtml], ['Plant Detail', plantHtml]]) {
  const sandboxIndex = html.indexOf('detail-observer-sandbox.js');
  const securityIndex = html.indexOf('security-policy.js');
  if (sandboxIndex < 0 || securityIndex < 0 || sandboxIndex > securityIndex) {
    throw new Error(`${name}: detail observer sandbox must load before observer-based runtime scripts.`);
  }
}
if (!sandbox.includes("['client-detail', 'plant-detail']")) throw new Error('Detail observer sandbox scope is missing.');
if (!sandbox.includes("window.addEventListener('load'")) throw new Error('Detail observer sandbox must restore the native observer after load.');
if (!permissions.includes('if (element.textContent !== nextSummary)')) throw new Error('Permission summary update must remain idempotent.');
console.log('Client/Plant detail observer safety check OK.');
