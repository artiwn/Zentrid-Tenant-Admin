"use strict";
function layoutEventTarget(event) {
    return event.target instanceof Element ? event.target : null;
}
const FleetLayout = (() => {
    const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const workspace = 'tenant-admin';
    const isTenantAdmin = true;
    const nav = [
        { section: 'Dashboard', items: [
                { icon: '🏠', label: 'Overview', href: basePath + 'index.html', key: 'index.html' }
            ] },
        { section: 'Customers & Assets', items: [
                { icon: '👤', label: 'Clients', href: basePath + 'pages/clients.html', key: 'clients.html' },
                { icon: '☀️', label: 'Plants', href: basePath + 'pages/plants.html', key: 'plants.html' },
                { icon: '🔌', label: 'Devices', href: basePath + 'pages/devices.html', key: 'devices.html' }
            ] },
        { section: 'Operations', items: [
                { icon: '🚨', label: 'Alerts & Events', href: basePath + 'pages/alerts.html', key: 'alerts.html' },
                { icon: '📡', label: 'Telemetry & Data', href: basePath + 'pages/telemetry.html', key: 'telemetry.html' },
                { icon: '⚡', label: 'Energy Analytics', href: basePath + 'pages/energy-analytics.html', key: 'energy-analytics.html' }
            ] },
        { section: 'Business', items: [
                { icon: '💰', label: 'Finance & Billing', href: basePath + 'pages/finance.html', key: 'finance.html' },
                { icon: '📄', label: 'Reports', href: basePath + 'pages/reports.html', key: 'reports.html' }
            ] },
        { section: 'Management', items: [
                { icon: '🌐', label: 'Integration Health', href: basePath + 'pages/integrations.html', key: 'integrations.html' },
                { icon: '🛡️', label: 'Users & Access', href: basePath + 'pages/users.html', key: 'users.html' },
                { icon: '⚙️', label: 'Tenant Settings', href: basePath + 'pages/settings.html', key: 'settings.html' }
            ] }
    ];
    function resolvedTenantName() {
        const user = window.ZentridAuth?.getUser?.() || {};
        const session = window.ZentridAuth?.getSession?.() || {};
        const claims = session.claims || {};
        return user.tenantName || user.tenant_name || user.organizationName || user.organization_name || claims.tenant_name || claims.organization_name || localStorage.getItem('zentrid_tenant') || 'Arpi Solar Group';
    }
    const state = {
        tenant: resolvedTenantName(),
        time: localStorage.getItem('zentrid_time') || 'Last 24h',
        region: localStorage.getItem('zentrid_region') || 'All Regions'
    };
    localStorage.setItem('zentrid_tenant', state.tenant);
    function currentUserLabel() {
        const user = window.ZentridAuth?.getUser?.() || {};
        return user.fullName || user.full_name || user.name || user.username || 'Tenant Admin';
    }
    function currentUserInitials() {
        return String(currentUserLabel()).split(/\s+/).filter(Boolean).slice(0, 2).map(value => value[0]).join('').toUpperCase() || 'TA';
    }
    function currentUserEmail() {
        const session = window.ZentridAuth?.getSession?.() || {};
        const claims = session.claims || {};
        const user = window.ZentridAuth?.getUser?.() || {};
        return user.email || claims.email || claims.unique_name || '';
    }
    function detailActive(itemKey) {
        const detailMap = {
            'client-detail.html': 'clients.html',
            'plant-detail.html': 'plants.html',
            'device-detail.html': 'devices.html',
            'alert-detail.html': 'alerts.html'
        };
        return current === itemKey || detailMap[current] === itemKey;
    }
    function sidebar() {
        return `<aside class="sidebar" id="sidebar">
      <button class="brand" id="goHome" type="button">
        <div class="brand-mark">Z</div>
        <div><div class="brand-name">Zentrid</div><div class="brand-subtitle">Tenant Admin Workspace</div></div>
      </button>
      <nav class="side-nav">
        ${nav.map(group => `<div class="nav-group"><div class="nav-section">${group.section}</div>${group.items.map(item => `<a class="nav-item ${detailActive(item.key) ? 'active' : ''}" href="${item.href}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span></a>`).join('')}</div>`).join('')}
      </nav>
    </aside>`;
    }
    function menu(id, items) {
        return `<div class="dropdown-menu" id="${id}">${items.map(item => `<button type="button" data-value="${item.value}">${item.label}</button>`).join('')}</div>`;
    }
    function header() {
        return `<header class="topbar">
      <button class="icon-btn" id="toggleSidebar" aria-label="Toggle sidebar">☰</button>
      <div class="search-wrap">
        <div class="search-box"><span>⌕</span><input id="globalSearch" autocomplete="off" placeholder="Search clients, plants, devices, alerts, reports..." /></div>
        <div class="search-results" id="searchResults"></div>
      </div>
      <div class="topbar-actions">
        <div class="menu-wrap"><button class="context-pill tenant-scope-readonly" type="button" title="Tenant scope is fixed by your account">Tenant: <strong id="tenantLabel">${state.tenant}</strong></button></div>
        <div class="menu-wrap">
          <button class="context-pill" id="timeBtn"><strong id="timeLabel">${state.time}</strong> ▾</button>
          ${menu('timeMenu', [
            { label: 'Today', value: 'Today' },
            { label: 'Last 24h', value: 'Last 24h' },
            { label: '7 days', value: '7 days' },
            { label: '30 days', value: '30 days' },
            { label: 'Custom Range', value: 'Custom Range' }
        ])}
        </div>
        <div class="menu-wrap">
          <button class="notification-btn" id="notifyBtn">🔔<span>4</span></button>
          <div class="dropdown-menu wide" id="notifyMenu">
            <div class="dropdown-title">Tenant Notifications</div>
            <button data-action="integrations">🟡 Connector sync delayed</button>
            <button data-action="alerts">🔴 Plant data delayed</button>
            <button data-action="users">🔵 User access updated</button>
            <button data-action="reports">🟢 Report is ready</button>
          </div>
        </div>
        <div class="menu-wrap">
          <button class="profile-btn" id="profileBtn"><span class="avatar" id="profileAvatar">${currentUserInitials()}</span><span id="profileName">${currentUserLabel()}</span>▾</button>
          <div class="dropdown-menu wide" id="profileMenu">
            <div class="dropdown-title"><strong id="profileMenuName">${currentUserLabel()}</strong><small>TenantAdmin${currentUserEmail() ? ' · ' + currentUserEmail() : ''}</small></div>
            <button data-action="refresh-auth">🔐 Refresh Auth Profile</button>
            <button data-action="users">👤 Users & Access</button>
            <button data-action="settings">⚙️ Tenant Settings</button>
            <button data-action="logout">↪ Logout</button>
          </div>
        </div>
      </div>
    </header>`;
    }
    function toast(message, requestedTone) {
        let element = document.getElementById('toast');
        if (!element) {
            element = document.createElement('div');
            element.id = 'toast';
            element.className = 'toast';
            element.setAttribute('aria-live', 'polite');
            document.body.appendChild(element);
        }
        const tone = requestedTone || (typeof FleetUX !== 'undefined' ? FleetUX.inferTone(message) : 'info');
        const icons = { info: 'i', success: '✓', warning: '△', danger: '!', neutral: '•' };
        element.className = `toast ${tone}`;
        element.replaceChildren();
        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = icons[tone];
        const copy = document.createElement('span');
        copy.className = 'toast-message';
        copy.textContent = message;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'toast-close';
        close.textContent = '×';
        close.addEventListener('click', () => element?.classList.remove('show'));
        element.append(icon, copy, close);
        requestAnimationFrame(() => element?.classList.add('show'));
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => element?.classList.remove('show'), tone === 'danger' ? 5200 : 3200);
    }
    function pathFor(action = '') {
        const map = {
            index: basePath + 'index.html', overview: basePath + 'index.html',
            clients: basePath + 'pages/clients.html', 'client-detail': basePath + 'pages/client-detail.html',
            plants: basePath + 'pages/plants.html', 'plant-detail': basePath + 'pages/plant-detail.html',
            devices: basePath + 'pages/devices.html', 'device-detail': basePath + 'pages/device-detail.html',
            alerts: basePath + 'pages/alerts.html', 'alert-detail': basePath + 'pages/alert-detail.html',
            telemetry: basePath + 'pages/telemetry.html', analytics: basePath + 'pages/energy-analytics.html', energy: basePath + 'pages/energy-analytics.html',
            finance: basePath + 'pages/finance.html', reports: basePath + 'pages/reports.html',
            integrations: basePath + 'pages/integrations.html', users: basePath + 'pages/users.html', settings: basePath + 'pages/settings.html'
        };
        return map[action] || map.overview || (basePath + 'index.html');
    }
    const searchItems = [
        { type: 'Client', label: 'Client Registry', meta: 'Customers & Assets', action: 'clients', keywords: ['client', 'customer', 'owner'] },
        { type: 'Plant', label: 'Plant Registry', meta: 'Customers & Assets', action: 'plants', keywords: ['plant', 'station', 'solar'] },
        { type: 'Device', label: 'Device List', meta: 'Customers & Assets', action: 'devices', keywords: ['device', 'inverter', 'meter', 'logger'] },
        { type: 'Alert', label: 'Alerts & Events', meta: 'Operations', action: 'alerts', keywords: ['alert', 'event', 'fault', 'offline'] },
        { type: 'Data', label: 'Telemetry & Data', meta: 'Operations', action: 'telemetry', keywords: ['telemetry', 'metric', 'live data'] },
        { type: 'Energy', label: 'Energy Analytics', meta: 'Operations', action: 'analytics', keywords: ['energy', 'production', 'consumption'] },
        { type: 'Finance', label: 'Finance & Billing', meta: 'Business', action: 'finance', keywords: ['finance', 'billing', 'invoice', 'revenue'] },
        { type: 'Report', label: 'Reports', meta: 'Business', action: 'reports', keywords: ['report', 'export', 'pdf'] },
        { type: 'Integration', label: 'Integration Health', meta: 'Management · Read-only', action: 'integrations', keywords: ['integration', 'connector', 'sync'] },
        { type: 'User', label: 'Users & Access', meta: 'Management', action: 'users', keywords: ['user', 'role', 'access'] },
        { type: 'Settings', label: 'Tenant Settings', meta: 'Management', action: 'settings', keywords: ['settings', 'preferences', 'branding'] }
    ];
    function closeMenus() {
        document.querySelectorAll('.dropdown-menu.open').forEach(menuElement => menuElement.classList.remove('open'));
    }
    function renderSearch(query) {
        const box = document.getElementById('searchResults');
        if (!box)
            return;
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            box.classList.remove('open');
            box.innerHTML = '';
            return;
        }
        const results = searchItems.filter(item => [item.type, item.label, item.meta, ...(item.keywords || [])].join(' ').toLowerCase().includes(normalized));
        box.innerHTML = results.length
            ? `<div class="search-summary"><strong>${results.length}</strong> result${results.length === 1 ? '' : 's'} for “${query.trim()}”</div>${results.map(item => `<button data-action="${item.action}" type="button"><span>${item.type}</span><strong>${item.label}</strong><small>${item.meta}</small></button>`).join('')}`
            : `<div class="search-empty"><strong>No results found</strong><small>Try clients, plants, devices, alerts or reports.</small></div>`;
        box.classList.add('open');
    }
    function hydrateAuthProfile() {
        const label = currentUserLabel();
        const initials = currentUserInitials();
        const name = document.getElementById('profileName');
        if (name)
            name.textContent = label;
        const avatar = document.getElementById('profileAvatar');
        if (avatar)
            avatar.textContent = initials;
        const menuName = document.getElementById('profileMenuName');
        if (menuName)
            menuName.textContent = label;
        const tenantLabel = document.getElementById('tenantLabel');
        if (tenantLabel)
            tenantLabel.textContent = resolvedTenantName();
    }
    function wireHeader() {
        document.getElementById('goHome')?.addEventListener('click', () => { window.location.href = pathFor('overview'); });
        document.getElementById('toggleSidebar')?.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
        const timeButton = document.getElementById('timeBtn');
        const timeMenu = document.getElementById('timeMenu');
        const notifyButton = document.getElementById('notifyBtn');
        const notifyMenu = document.getElementById('notifyMenu');
        const profileButton = document.getElementById('profileBtn');
        const profileMenu = document.getElementById('profileMenu');
        [[timeButton, timeMenu], [notifyButton, notifyMenu], [profileButton, profileMenu]].forEach(([button, menuElement]) => button?.addEventListener('click', event => { event.stopPropagation(); const open = menuElement?.classList.contains('open'); closeMenus(); if (!open)
            menuElement?.classList.add('open'); }));
        timeMenu?.addEventListener('click', event => {
            const button = layoutEventTarget(event)?.closest('button[data-value]');
            if (!button)
                return;
            state.time = button.dataset.value || state.time;
            localStorage.setItem('zentrid_time', state.time);
            const label = document.getElementById('timeLabel');
            if (label)
                label.textContent = state.time;
            closeMenus();
            window.dispatchEvent(new CustomEvent('zentrid:context-change', { detail: { ...state } }));
        });
        document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async (event) => {
            const action = button.dataset.action || '';
            if (action === 'logout') {
                window.ZentridAuth?.logout?.();
                window.location.href = basePath + 'login.html';
                return;
            }
            if (action === 'refresh-auth') {
                try {
                    await window.ZentridAuth?.me?.();
                    hydrateAuthProfile();
                    toast('Authentication profile refreshed.', 'success');
                }
                catch {
                    toast('Unable to refresh authentication profile.', 'danger');
                }
                closeMenus();
                return;
            }
            if (action) {
                event.preventDefault();
                window.location.href = pathFor(action);
            }
        }));
        const search = document.getElementById('globalSearch');
        const results = document.getElementById('searchResults');
        search?.addEventListener('input', () => renderSearch(search.value));
        search?.addEventListener('keydown', event => {
            if (event.key !== 'Enter')
                return;
            const normalized = search.value.trim().toLowerCase();
            const first = searchItems.find(item => [item.type, item.label, item.meta, ...(item.keywords || [])].join(' ').toLowerCase().includes(normalized));
            if (first)
                window.location.href = pathFor(first.action);
        });
        results?.addEventListener('click', event => {
            event.stopPropagation();
            const button = layoutEventTarget(event)?.closest('button[data-action]');
            if (button)
                window.location.href = pathFor(button.dataset.action || 'overview');
        });
        document.addEventListener('click', event => {
            if (!layoutEventTarget(event)?.closest('.menu-wrap'))
                closeMenus();
            if (!layoutEventTarget(event)?.closest('.search-wrap'))
                results?.classList.remove('open');
            const route = layoutEventTarget(event)?.closest('[data-tenant-route]');
            if (route) {
                event.preventDefault();
                window.location.href = pathFor(route.dataset.tenantRoute || 'overview');
            }
        });
        document.addEventListener('keydown', event => { if (event.key === 'Escape') {
            closeMenus();
            results?.classList.remove('open');
        } });
    }
    function actionLabel(button) {
        return (button.textContent || '').trim() || button.getAttribute('title') || button.getAttribute('aria-label') || 'Action';
    }
    function enhanceActionMenus(root = document) {
        root.querySelectorAll('.data-row > .row-actions:not(.kebabified)').forEach(actions => {
            if (actions.closest('.drawer-actions, .modal-actions, .panel-head, .wizard-actions') || actions.dataset.noKebab === 'true')
                return;
            const buttons = Array.from(actions.children).filter((element) => element.tagName === 'BUTTON');
            if (!buttons.length)
                return;
            if (buttons.length === 1) {
                actions.classList.add('single-action');
                buttons[0]?.classList.add('single-row-action');
                return;
            }
            const wrap = document.createElement('div');
            wrap.className = 'kebab-wrap global-action-wrap';
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'kebab-btn';
            trigger.dataset.action = 'menu';
            trigger.setAttribute('aria-label', 'Open actions');
            trigger.textContent = '⋮';
            const menuElement = document.createElement('div');
            menuElement.className = 'kebab-menu global-action-menu';
            buttons.forEach(button => { button.textContent = actionLabel(button); button.type = 'button'; menuElement.appendChild(button); });
            actions.replaceChildren(wrap);
            wrap.append(trigger, menuElement);
            actions.classList.add('kebabified');
        });
    }
    function resetFloatingMenu(menuElement) {
        if (!menuElement)
            return;
        menuElement.classList.remove('open', 'floating-menu');
        menuElement.style.left = '';
        menuElement.style.top = '';
        menuElement.style.visibility = '';
        if (menuElement.__zentridHome?.parent && menuElement.parentNode === document.body)
            menuElement.__zentridHome.parent.insertBefore(menuElement, menuElement.__zentridHome.next || null);
    }
    function closeActionMenus(except) {
        document.querySelectorAll('.kebab-menu.open').forEach(menuElement => { if (menuElement !== except)
            resetFloatingMenu(menuElement); });
    }
    function positionActionMenu(button, menuElement) {
        if (!menuElement.__zentridHome && menuElement.parentNode)
            menuElement.__zentridHome = { parent: menuElement.parentNode, next: menuElement.nextSibling };
        document.body.appendChild(menuElement);
        menuElement.classList.add('open', 'floating-menu');
        menuElement.style.visibility = 'hidden';
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const left = Math.max(12, Math.min(buttonRect.right - menuRect.width, window.innerWidth - menuRect.width - 12));
        const top = buttonRect.bottom + menuRect.height + 8 > window.innerHeight ? Math.max(12, buttonRect.top - menuRect.height - 8) : buttonRect.bottom + 8;
        menuElement.style.left = `${Math.round(left)}px`;
        menuElement.style.top = `${Math.round(top)}px`;
        menuElement.style.visibility = '';
    }
    function wireActionMenus() {
        if (window.__zentridActionMenusWired)
            return;
        window.__zentridActionMenusWired = true;
        document.addEventListener('click', event => {
            const target = layoutEventTarget(event);
            const trigger = target?.closest('.kebab-btn[data-action="menu"]');
            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                const menuElement = trigger.closest('.kebab-wrap')?.querySelector('.kebab-menu');
                const wasOpen = menuElement?.classList.contains('open');
                closeActionMenus(menuElement);
                if (menuElement && !wasOpen)
                    positionActionMenu(trigger, menuElement);
                else
                    resetFloatingMenu(menuElement);
                return;
            }
            const action = target?.closest('.kebab-menu.floating-menu button');
            if (action) {
                event.preventDefault();
                event.stopPropagation();
                const menuElement = action.closest('.kebab-menu');
                resetFloatingMenu(menuElement);
                action.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return;
            }
            if (!target?.closest('.kebab-wrap') && !target?.closest('.kebab-menu'))
                closeActionMenus();
        }, true);
        window.addEventListener('resize', () => closeActionMenus());
        window.addEventListener('scroll', () => closeActionMenus(), true);
    }
    function mount(content) {
        document.body.classList.add('tenant-admin-workspace');
        document.body.dataset.zentridWorkspace = 'tenant-admin';
        const app = document.getElementById('app');
        if (!app)
            throw new Error('Zentrid app root not found');
        app.innerHTML = `${sidebar()}<div class="workspace">${header()}<main class="main-content">${content}</main></div>`;
        wireHeader();
        hydrateAuthProfile();
        wireActionMenus();
        const main = app.querySelector('.main-content');
        if (main)
            enhanceActionMenus(main);
        if (main && !['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || ''))
            new MutationObserver(() => enhanceActionMenus(main)).observe(main, { childList: true, subtree: true });
        return state;
    }
    return { mount, toast, pathFor, state, workspace, isTenantAdmin, enhanceActionMenus };
})();
// Classic scripts can access top-level lexical bindings by name, but pages that use
// window.FleetLayout require an explicit assignment. Keep both access patterns valid.
window.FleetLayout = FleetLayout;
