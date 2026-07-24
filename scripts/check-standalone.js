const { existsSync, readFileSync, readdirSync } = require('fs');
const { dirname, join, relative, resolve } = require('path');
const root = process.cwd();
const requiredPages = ['index.html','pages/clients.html','pages/plants.html','pages/devices.html','pages/alerts.html','pages/telemetry.html','pages/energy-analytics.html','pages/finance.html','pages/reports.html','pages/integrations.html','pages/users.html','pages/settings.html'];
const forbidden = ['tenant-admin.html','pages/tenants.html','pages/api-console.html','pages/admin-console.html','pages/tariff-plans.html','pages/payment-settings.html'];
const failures = [];
for (const page of requiredPages) if (!existsSync(join(root, page))) failures.push(`Missing required page: ${page}`);
for (const page of forbidden) if (existsSync(join(root, page))) failures.push(`Global Admin artifact must not exist: ${page}`);
function htmlFiles(dir, out=[]) { for (const entry of readdirSync(dir,{withFileTypes:true})) { const path=join(dir,entry.name); if(entry.isDirectory()) htmlFiles(path,out); else if(entry.name.endsWith('.html')) out.push(path); } return out; }
for (const file of htmlFiles(root).filter(file => !file.includes(`${join(root,'dist')}`))) {
  const html=readFileSync(file,'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref=match[1]; if(!ref || /^(?:https?:|#|data:)/.test(ref)) continue;
    const clean=ref.split(/[?#]/)[0];
    if(clean && !existsSync(resolve(dirname(file),clean)) && !clean.endsWith('assets/css/styles.css') && !clean.endsWith('.js')) failures.push(`${relative(root,file)} missing ${ref}`);
  }
}
const sourceText = [join(root,'assets','js','layout.ts'), join(root,'assets','js','auth-guard.ts')].map(file=>readFileSync(file,'utf8')).join('\n');
for (const marker of ['Platform Overview','Tenant Registry','Platform API Console','Global Admin Console','tariff-plans.html','payment-settings.html']) if(sourceText.includes(marker)) failures.push(`Forbidden Global Admin marker in standalone shell: ${marker}`);
if(failures.length){ console.error(failures.join('\n')); process.exit(1); }
console.log('Standalone Tenant Admin structure OK.');
