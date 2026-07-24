const { readFileSync } = require('fs');
const fail = message => { console.error(`Runtime recovery check failed: ${message}`); process.exit(1); };
const proxy = readFileSync('proxy-server.ts','utf8');
const devices = readFileSync('assets/js/devices.ts','utf8');
const plants = readFileSync('assets/js/plants.ts','utf8');
const alerts = readFileSync('assets/js/alerts.ts','utf8');
const live = readFileSync('assets/js/live-api-ui.ts','utf8');
if (/CONTENT_SECURITY_POLICY_REPORT_ONLY[\s\S]{0,250}style-src-attr 'none'/.test(proxy)) fail('report-only CSP still reports supported inline style attributes');
if (!proxy.includes('const CONTENT_SECURITY_POLICY_REPORT_ONLY = CONTENT_SECURITY_POLICY;')) fail('compatible CSP report-only policy is missing');
if (!devices.includes('hasTenantMetadata && matchedLive.length ? matchedLive : liveRows')) fail('device live rows can still be erased by tenant label mismatch');
if (!plants.includes('return Array.isArray(window.ZentridLivePlants) ? window.ZentridLivePlants : [];')) fail('Plant Registry is not reading the API-backed live collection directly');
if (!alerts.includes('withTenantMetadata.length && matched.length ? matched : liveRows')) fail('alert live rows can still be erased by tenant label mismatch');
if (!live.includes('LIVE_LOADING_WATCHDOG_MS = 18_000')) fail('live loading watchdog is missing');
for (const file of ['device-detail','plant-detail','client-detail']) {
  const source = readFileSync(`assets/js/page-scripts/${file}.ts`,'utf8');
  if (!source.includes('try {') || !source.includes('Detail')) fail(`${file} has no safe render boundary`);
}
console.log('Tenant Admin runtime recovery check OK.');
