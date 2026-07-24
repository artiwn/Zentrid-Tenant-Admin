const { existsSync, readdirSync, readFileSync } = require('fs');
const { dirname, join, relative, resolve } = require('path');

const root = process.cwd();
const dist = join(root, 'dist');
const targetArg = process.argv.find(value => value.startsWith('--target='));
const target = targetArg ? targetArg.slice('--target='.length) : 'local';
const failures = [];

if (!['local', 'vercel'].includes(target)) {
  console.error(`Unknown dist target: ${target}. Expected local or vercel.`);
  process.exit(1);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk(dist);
const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (/^(?:https?:|#|data:|mailto:|tel:)/i.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) continue;
    const destination = resolve(dirname(file), clean);
    if (!destination.startsWith(dist)) failures.push(`${relative(dist, file)} -> reference escapes dist: ${ref}`);
    else if (!existsSync(destination)) failures.push(`${relative(dist, file)} -> missing reference: ${ref}`);
  }
}

for (const required of ['index.html', 'login.html', 'favicon.ico', 'assets/css/styles.css', 'assets/release-manifest.json']) {
  if (!existsSync(join(dist, required))) failures.push(`Missing required dist file: ${required}`);
}

for (const file of files.filter(file => file.endsWith('.ts'))) {
  failures.push(`TypeScript leaked into dist: ${relative(dist, file)}`);
}

const manifestPath = join(dist, 'assets', 'release-manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const key of ['version', 'release', 'buildId', 'builtAt', 'target']) {
      if (typeof manifest[key] !== 'string' || !manifest[key]) failures.push(`Invalid release manifest field: ${key}`);
    }
    if (manifest.target !== target) failures.push(`Release manifest target is ${manifest.target}; expected ${target}.`);
  } catch (error) {
    failures.push(`Release manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const proxyOutput = join(dist, 'proxy-server.js');
if (target === 'local' && !existsSync(proxyOutput)) failures.push('Missing local runtime: proxy-server.js');
if (target === 'vercel' && existsSync(proxyOutput)) failures.push('proxy-server.js must not be included in Vercel static output.');

if (failures.length) {
  console.error(`Generated ${target} application check failed.`);
  failures.forEach(message => console.error(`  ${message}`));
  process.exit(1);
}
console.log(`Generated ${target} application OK: ${htmlFiles.length} HTML pages and all local references resolved.`);
