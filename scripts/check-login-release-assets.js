const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const root = process.cwd();
function must(condition, message) { if (!condition) throw new Error(message); }
const loginTs = readFileSync(join(root, 'assets/js/login.ts'), 'utf8');
const apiClientTs = readFileSync(join(root, 'assets/js/api-client.ts'), 'utf8');
const actionCss = readFileSync(join(root, 'assets/css/src/components/actions.css'), 'utf8');
const loginHtml = readFileSync(join(root, 'login.html'), 'utf8');
must(loginTs.includes('Tenant Admin Login'), 'Tenant Admin login heading missing.');
must(loginTs.includes('Sign in as Tenant Admin'), 'Tenant Admin submit label missing.');
must(!loginTs.includes("ensureSession('GlobalAdmin')"), 'Tenant Admin login still checks GlobalAdmin.');
must(!apiClientTs.includes("requiredRole = 'GlobalAdmin'"), 'API client still defaults to GlobalAdmin.');
must(actionCss.includes('.primary-action'), 'Shared primary-action styles are missing.');
must(loginHtml.includes('favicon.ico'), 'Login favicon link is missing.');
must(existsSync(join(root, 'favicon.ico')), 'favicon.ico is missing.');

const distRoot = join(root, 'dist');
const distCss = readFileSync(join(distRoot, 'assets/css/styles.css'), 'utf8');
const distLogin = readFileSync(join(distRoot, 'assets/js/login.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(distRoot, 'assets/release-manifest.json'), 'utf8'));
must(distCss.includes('.primary-action'), 'Built CSS does not contain primary-action styles.');
must(distLogin.includes('Sign in as Tenant Admin'), 'Built login is not Tenant Admin.');
must(!distLogin.includes("ensureSession('GlobalAdmin')"), 'Built login still checks GlobalAdmin.');
must(existsSync(join(distRoot, 'favicon.ico')), 'Built favicon.ico is missing.');
must(manifest.app === 'Zentrid Tenant Admin', 'Release manifest belongs to the wrong application.');
must(manifest.workspace === 'tenant-admin', 'Release manifest workspace is incorrect.');
console.log('Tenant Admin login/release asset source + dist check OK.');
