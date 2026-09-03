"use strict";
(() => {
    function qs(name) { return new URLSearchParams(window.location.search).get(name); }
    function setStatus(message, type = '') {
        const box = document.getElementById('loginStatus');
        if (!box)
            return;
        box.textContent = message;
        box.className = `login-status ${type}`.trim();
    }
    function nextUrl() {
        const next = qs('next');
        if (!next)
            return 'index.html';
        const normalized = next.replace(/\\/g, '/').replace(/^\.\//, '');
        if (normalized.includes('://') || normalized.startsWith('/') || normalized.startsWith('../'))
            return 'index.html';
        return normalized;
    }
    function initialStatus() {
        const reason = qs('reason');
        if (reason === 'role')
            return 'This account does not have a Tenant Admin role.';
        if (reason === 'session')
            return 'Your session is missing or expired. Sign in again.';
        return 'Enter your Tenant Admin credentials. The local proxy is detected automatically.';
    }
    function syncConfigFields() {
        const authBase = document.getElementById('authBaseUrl');
        const apiBase = document.getElementById('apiBaseUrl');
        if (authBase)
            authBase.value = ZentridConfig.authBaseUrl;
        if (apiBase)
            apiBase.value = ZentridConfig.apiBaseUrl;
    }
    async function handleLogin(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const username = form.username.value.trim();
        const password = form.password.value;
        ZentridConfig.setAuthBaseUrl(form.authBaseUrl.value.trim());
        ZentridConfig.setApiBaseUrl(form.apiBaseUrl.value.trim());
        const button = form.querySelector('button[type="submit"]');
        if (!button)
            return;
        button.disabled = true;
        button.textContent = 'Signing in...';
        setStatus(`Connecting through ${ZentridConfig.authBaseUrl || 'Vercel proxy'}/api/Auth/login...`, 'info');
        try {
            await ZentridAuth.login(username, password);
            const valid = await ZentridAuth.ensureSession('');
            if (!valid) {
                ZentridAuth.logout(false);
                throw new Error('Unable to verify the authenticated session.');
            }
            if (!ZentridAuth.getRoles().length)
                await ZentridAuth.me();
            const allowedRoles = ['tenantadmin', 'tenantadministrator', 'organizationadmin'];
            const hasTenantAdminRole = ZentridAuth.getRoles().some(role => allowedRoles.includes(String(role || '').toLowerCase().replace(/[ _-]+/g, '')));
            if (!hasTenantAdminRole) {
                ZentridAuth.logout(false);
                throw new Error('This account is authenticated but does not have a Tenant Admin role.');
            }
            setStatus('Login successful. Opening Tenant Admin...', 'success');
            window.location.href = nextUrl();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to login. Check API URL or credentials.';
            setStatus(message || 'Unable to login. Check API URL or credentials.', 'error');
            button.disabled = false;
            button.textContent = 'Sign in as Tenant Admin';
        }
    }
    function renderLogin() {
        const root = document.getElementById('loginApp');
        if (!root)
            return;
        root.innerHTML = `
      <main class="login-shell">
        <section class="login-card glass-card">
          <div class="login-brand">
            <div class="brand-mark">Z</div>
            <div>
              <p class="eyebrow">Zentrid Auth</p>
              <h1>Tenant Admin Login</h1>
              <p class="muted">Locally login goes through http://localhost:5050. On Vercel it uses relative /api paths through vercel.json.</p>
            </div>
          </div>

          <form id="loginForm" class="login-form">
            <label>Username
              <input name="username" autocomplete="username" required />
            </label>
            <label>Password
              <input name="password" autocomplete="current-password" type="password" required />
            </label>
            <details class="login-config">
              <summary>API configuration (optional)</summary>
              <label>Auth base URL
                <input id="authBaseUrl" name="authBaseUrl" placeholder="Local: http://localhost:5050 · Vercel: leave empty" />
              </label>
              <label>API base URL
                <input id="apiBaseUrl" name="apiBaseUrl" placeholder="Local: http://localhost:5050 · Vercel: leave empty" />
              </label>
            </details>
            <button class="primary-action" type="submit">Sign in as Tenant Admin</button>
            <div id="loginStatus" class="login-status info">${initialStatus()}</div>
          </form>
        </section>
      </main>`;
        syncConfigFields();
        document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    }
    renderLogin();
})();
