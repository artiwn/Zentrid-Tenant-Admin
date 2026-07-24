const { execFileSync } = require('child_process');
const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join, resolve } = require('path');

const root = process.cwd();

function argument(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function commitSha() {
  const fromEnvironment = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.GIT_COMMIT || '';
  if (fromEnvironment) return fromEnvironment.trim();
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_error) {
    return '';
  }
}

function buildTime() {
  const epoch = Number(process.env.SOURCE_DATE_EPOCH || '');
  return Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1000) : new Date();
}

function createManifest(options = {}) {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const target = options.target || argument('target', 'local');
  const release = process.env.ZENTRID_RELEASE || packageJson.zentridRelease || `v${String(packageJson.version || '').replace(/\D/g, '')}`;
  const commit = commitSha();
  const timestamp = buildTime();
  const compactTime = timestamp.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const environment = process.env.VERCEL_ENV || process.env.ZENTRID_ENVIRONMENT || (target === 'vercel' ? 'vercel' : 'local');
  const channel = process.env.ZENTRID_RELEASE_CHANNEL || (environment === 'production' ? 'production' : environment === 'preview' ? 'preview' : 'prototype');
  const buildId = process.env.VERCEL_DEPLOYMENT_ID || process.env.GITHUB_RUN_ID || `${release}-${commit ? commit.slice(0, 8) : 'local'}-${compactTime}`;
  return {
    schemaVersion: 1,
    app: 'Zentrid Tenant Admin',
    workspace: 'tenant-admin',
    version: String(packageJson.version || '0.0.0'),
    release: String(release),
    channel: String(channel),
    environment: String(environment),
    target: String(target),
    buildId: String(buildId),
    builtAt: timestamp.toISOString(),
    commit: commit || null,
    commitShort: commit ? commit.slice(0, 8) : null
  };
}

function main() {
  const target = argument('target', 'local');
  const output = resolve(argument('output', join(root, 'dist', 'assets', 'release-manifest.json')));
  const manifest = createManifest({ target });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Release manifest OK: ${manifest.release} ${manifest.buildId} -> ${output}`);
  return manifest;
}

if (require.main === module) main();
module.exports = { createManifest, main };
