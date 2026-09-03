"use strict";
(() => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const isLoginPage = page === 'login.html';
    const prefix = window.location.pathname.includes('/pages/') ? '../' : '';
    const REQUIRED_ROLES = ['tenantadmin', 'tenantadministrator', 'organizationadmin'];
    function normalizeRole(value) {
        return String(value || '').toLowerCase().replace(/[ _-]+/g, '');
    }
    function roleAllowed() {
        const roles = window.ZentridAuth?.getRoles?.() || [];
        return roles.some((role) => REQUIRED_ROLES.includes(normalizeRole(role)));
    }
    if (!window.ZentridAuth || isLoginPage)
        return;
    let redirecting = false;
    function redirectToLogin(reason) {
        if (redirecting)
            return;
        redirecting = true;
        window.ZentridAuth.logout(false);
        const cleanPath = window.location.pathname.replace(/^\/+/, '');
        const next = encodeURIComponent(cleanPath + window.location.search + window.location.hash);
        window.location.replace(`${prefix}login.html?reason=${reason}&next=${next}`);
    }
    async function ensureAllowedSession() {
        const valid = await window.ZentridAuth.ensureSession('');
        if (!valid)
            return false;
        if (!window.ZentridAuth.getRoles().length) {
            try {
                await window.ZentridAuth.me();
            }
            catch {
                return false;
            }
        }
        return roleAllowed();
    }
    function validateSynchronizedSession() {
        if (redirecting)
            return;
        if (!window.ZentridAuth.getAccessToken()) {
            redirectToLogin('session');
            return;
        }
        const roles = window.ZentridAuth.getRoles();
        if (roles.length && !roleAllowed())
            redirectToLogin('role');
    }
    window.addEventListener('zentrid:session-expired', () => redirectToLogin('session'));
    window.addEventListener('zentrid:auth', validateSynchronizedSession);
    window.addEventListener('zentrid:session-sync', validateSynchronizedSession);
    if (!window.ZentridAuth.getAccessToken()) {
        redirectToLogin('session');
        return;
    }
    const roles = window.ZentridAuth.getRoles();
    if (roles.length && !roleAllowed()) {
        redirectToLogin('role');
        return;
    }
    if (window.ZentridAuth.isAuthenticated() && roleAllowed())
        return;
    void ensureAllowedSession().then(valid => {
        if (!valid)
            redirectToLogin(window.ZentridAuth.getRoles().length ? 'role' : 'session');
    }).catch(() => redirectToLogin('session'));
})();
