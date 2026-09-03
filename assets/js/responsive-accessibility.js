"use strict";
const FleetResponsiveAccessibility = (() => {
    const mobileSidebarQuery = window.matchMedia('(max-width: 920px)');
    const compactTableQuery = window.matchMedia('(max-width: 768px)');
    const enhancedDialogs = new Map();
    let observer = null;
    let sidebarReturnFocus = null;
    let tableSequence = 0;
    const pendingRoots = new Set();
    function matchesElement(element, selector) {
        const matcher = Element.prototype.matches;
        return matcher.call(element, selector);
    }
    function elements(root, selector) {
        const found = Array.from(root.querySelectorAll(selector));
        if (root instanceof HTMLElement && matchesElement(root, selector))
            found.unshift(root);
        return found;
    }
    function visible(element) {
        if (element.hidden || element.getAttribute('aria-hidden') === 'true')
            return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }
    function focusable(container) {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        return Array.from(container.querySelectorAll(selector)).filter(item => visible(item) && item.getAttribute('aria-disabled') !== 'true');
    }
    function setAttributeValue(element, name, value) {
        if (element.getAttribute(name) !== value)
            element.setAttribute(name, value);
    }
    function ensureId(element, prefix) {
        if (element.id)
            return element.id;
        tableSequence += 1;
        element.id = `${prefix}-${tableSequence}`;
        return element.id;
    }
    function ensureSkipLink() {
        let link = document.querySelector('.fleet-skip-link');
        if (!link) {
            link = document.createElement('a');
            link.className = 'fleet-skip-link';
            link.href = '#fleetMainContent';
            link.textContent = 'Skip to main content';
            document.body.prepend(link);
            link.addEventListener('click', () => {
                requestAnimationFrame(() => document.getElementById('fleetMainContent')?.focus({ preventScroll: true }));
            });
        }
    }
    function enhanceLandmarks(root) {
        elements(root, '.main-content').forEach(main => {
            main.id ||= 'fleetMainContent';
            main.setAttribute('tabindex', '-1');
            main.setAttribute('role', 'main');
        });
        elements(root, '.side-nav').forEach(nav => nav.setAttribute('aria-label', 'Primary navigation'));
        elements(root, '.topbar').forEach(header => header.setAttribute('aria-label', 'Global controls'));
        elements(root, '.nav-item.active').forEach(link => link.setAttribute('aria-current', 'page'));
        elements(root, '.brand').forEach(brand => brand.setAttribute('aria-label', 'Zentrid home'));
    }
    function accessibleButtonName(button) {
        const existing = button.getAttribute('aria-label') || button.getAttribute('title');
        if (existing)
            return existing;
        if (button.id === 'notifyBtn')
            return 'Notifications';
        if (button.id === 'profileBtn')
            return 'User menu';
        if (button.id === 'toggleSidebar')
            return 'Toggle primary navigation';
        if (button.classList.contains('kebab-btn'))
            return 'Open row actions';
        if (button.classList.contains('modal-close') || button.classList.contains('drawer-close') || button.classList.contains('modal-close-btn'))
            return 'Close dialog';
        const text = (button.textContent || '').trim();
        if (text === '×' || text.toLowerCase() === 'x')
            return 'Close dialog';
        return '';
    }
    function enhanceButtons(root) {
        elements(root, 'button, [role="button"]').forEach(button => {
            const name = accessibleButtonName(button);
            if (name && !button.getAttribute('aria-label'))
                button.setAttribute('aria-label', name);
            if (button.getAttribute('aria-disabled') === 'true')
                button.setAttribute('tabindex', '-1');
        });
    }
    function tableTitle(table) {
        const panel = table.closest('.panel, .glass-card, section, article');
        return panel?.querySelector('h2, h3')?.textContent?.trim() || 'Data table';
    }
    function directChildren(element) {
        return Array.from(element.children).filter((child) => child instanceof HTMLElement);
    }
    function enhanceTable(table) {
        const head = table.querySelector(':scope > .data-head');
        const rows = Array.from(table.querySelectorAll(':scope > .data-row'));
        if (!head || !rows.length)
            return;
        const headerCells = directChildren(head);
        const headers = headerCells.map((cell, index) => cell.textContent?.trim() || (index === headerCells.length - 1 ? 'Actions' : `Column ${index + 1}`));
        if (!headers.length)
            return;
        table.classList.add('fleet-responsive-table');
        table.setAttribute('aria-label', table.getAttribute('aria-label') || tableTitle(table));
        ensureId(table, 'fleet-table');
        const interactiveRows = rows.some(row => matchesElement(row, 'button, a, [role="button"], .clickable-row'));
        if (!interactiveRows) {
            table.setAttribute('role', 'table');
            table.setAttribute('aria-colcount', String(headers.length));
            table.setAttribute('aria-rowcount', String(rows.length + 1));
            head.setAttribute('role', 'row');
            directChildren(head).forEach(cell => cell.setAttribute('role', 'columnheader'));
        }
        rows.forEach(row => {
            const rowIsInteractive = matchesElement(row, 'button, a, [role="button"], .clickable-row');
            if (!interactiveRows && !rowIsInteractive)
                row.setAttribute('role', 'row');
            directChildren(row).forEach((cell, index) => {
                const label = headers[index] || `Column ${index + 1}`;
                cell.dataset.label = label;
                if (!interactiveRows && !rowIsInteractive)
                    cell.setAttribute('role', 'cell');
            });
        });
    }
    function enhanceTables(root) {
        elements(root, '.data-table').forEach(enhanceTable);
    }
    function rowLabel(row) {
        const primary = row.querySelector('strong, h3, h4')?.textContent?.trim();
        const secondary = row.querySelector('small')?.textContent?.trim();
        return [primary, secondary].filter(Boolean).join(' — ').slice(0, 180) || 'Open row details';
    }
    function enhanceInteractiveRows(root) {
        elements(root, '.clickable-row:not(button):not(a)').forEach(row => {
            const hasInteractiveChild = Boolean(row.querySelector('button, a[href], input, select, textarea'));
            if (hasInteractiveChild)
                return;
            row.setAttribute('role', 'button');
            if (!row.hasAttribute('tabindex'))
                row.tabIndex = 0;
            if (!row.hasAttribute('aria-label'))
                row.setAttribute('aria-label', rowLabel(row));
            if (row.dataset.fleetKeyboardRow === 'true')
                return;
            row.dataset.fleetKeyboardRow = 'true';
            row.addEventListener('keydown', event => {
                if (event.target !== row)
                    return;
                if (event.key !== 'Enter' && event.key !== ' ')
                    return;
                event.preventDefault();
                row.click();
            });
        });
    }
    function enhanceForms(root) {
        elements(root, 'input, select, textarea').forEach(control => {
            if (control.hasAttribute('required'))
                control.setAttribute('aria-required', 'true');
            if (control.dataset.fleetValidationA11y === 'true')
                return;
            control.dataset.fleetValidationA11y = 'true';
            control.addEventListener('invalid', () => control.setAttribute('aria-invalid', 'true'));
            control.addEventListener('input', () => control.removeAttribute('aria-invalid'));
            control.addEventListener('change', () => control.removeAttribute('aria-invalid'));
        });
        elements(root, '.field-error, .validation-summary, .form-error').forEach(error => {
            error.setAttribute('role', 'alert');
            error.setAttribute('aria-live', 'assertive');
        });
    }
    function updateTablist(tablist) {
        const tabs = Array.from(tablist.querySelectorAll(':scope > button, :scope > [role="tab"]'));
        if (!tabs.length)
            return;
        tablist.setAttribute('role', 'tablist');
        tablist.setAttribute('aria-label', tablist.getAttribute('aria-label') || 'Page sections');
        tabs.forEach(tab => {
            const active = tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true';
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
        });
        if (tablist.dataset.fleetTabKeyboard === 'true')
            return;
        tablist.dataset.fleetTabKeyboard = 'true';
        tablist.addEventListener('keydown', event => {
            const currentTabs = Array.from(tablist.querySelectorAll(':scope > button, :scope > [role="tab"]'));
            const current = event.target instanceof HTMLButtonElement ? event.target : null;
            if (!current || !currentTabs.includes(current))
                return;
            const index = currentTabs.indexOf(current);
            let nextIndex = index;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                nextIndex = (index + 1) % currentTabs.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                nextIndex = (index - 1 + currentTabs.length) % currentTabs.length;
            else if (event.key === 'Home')
                nextIndex = 0;
            else if (event.key === 'End')
                nextIndex = currentTabs.length - 1;
            else
                return;
            event.preventDefault();
            const next = currentTabs[nextIndex];
            next?.focus();
            next?.click();
            requestAnimationFrame(() => updateTablist(tablist));
        });
    }
    function enhanceTablists(root) {
        elements(root, '.detail-tabs, .ui-dict-tabs, [role="tablist"]').forEach(updateTablist);
    }
    function updateMenu(toggle, menu) {
        const open = menu.classList.contains('open') && visible(menu);
        setAttributeValue(toggle, 'aria-expanded', String(open));
        setAttributeValue(toggle, 'aria-haspopup', 'menu');
        toggle.setAttribute('aria-controls', ensureId(menu, 'fleet-menu'));
        menu.setAttribute('role', 'menu');
        directChildren(menu).filter(item => matchesElement(item, 'button, a')).forEach(item => item.setAttribute('role', 'menuitem'));
    }
    function enhanceMenus(root) {
        const pairs = [
            ['#tenantBtn', '#tenantMenu'],
            ['#timeBtn', '#timeMenu'],
            ['#notifyBtn', '#notifyMenu'],
            ['#profileBtn', '#profileMenu']
        ];
        pairs.forEach(([toggleSelector, menuSelector]) => {
            const toggle = document.querySelector(toggleSelector);
            const menu = document.querySelector(menuSelector);
            if (!toggle || !menu)
                return;
            updateMenu(toggle, menu);
            if (toggle.dataset.fleetMenuKeyboard === 'true')
                return;
            toggle.dataset.fleetMenuKeyboard = 'true';
            toggle.addEventListener('keydown', event => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
                    return;
                event.preventDefault();
                if (!menu.classList.contains('open'))
                    toggle.click();
                requestAnimationFrame(() => {
                    updateMenu(toggle, menu);
                    const items = focusable(menu);
                    (event.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus();
                });
            });
            menu.addEventListener('keydown', event => {
                const items = focusable(menu);
                const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                const index = current ? items.indexOf(current) : -1;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    menu.classList.remove('open');
                    updateMenu(toggle, menu);
                    toggle.focus();
                    return;
                }
                let nextIndex = index;
                if (event.key === 'ArrowDown')
                    nextIndex = (index + 1) % items.length;
                else if (event.key === 'ArrowUp')
                    nextIndex = (index - 1 + items.length) % items.length;
                else if (event.key === 'Home')
                    nextIndex = 0;
                else if (event.key === 'End')
                    nextIndex = items.length - 1;
                else
                    return;
                event.preventDefault();
                items[nextIndex]?.focus();
            });
        });
        const search = document.getElementById('globalSearch');
        const results = document.getElementById('searchResults');
        if (search && results) {
            search.setAttribute('aria-label', 'Global search');
            search.setAttribute('aria-controls', ensureId(results, 'fleet-search-results'));
            search.setAttribute('aria-autocomplete', 'list');
            search.setAttribute('role', 'combobox');
            setAttributeValue(search, 'aria-expanded', String(results.classList.contains('open')));
            results.setAttribute('role', 'listbox');
            elements(results, 'button').forEach(item => item.setAttribute('role', 'option'));
            if (search.dataset.fleetSearchKeyboard !== 'true') {
                search.dataset.fleetSearchKeyboard = 'true';
                search.addEventListener('keydown', event => {
                    if (event.key === 'ArrowDown') {
                        const first = results.querySelector('button');
                        if (first) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                    if (event.key === 'Escape') {
                        results.classList.remove('open');
                        search.setAttribute('aria-expanded', 'false');
                    }
                });
                results.addEventListener('keydown', event => {
                    const items = Array.from(results.querySelectorAll('button'));
                    const current = event.target instanceof HTMLButtonElement ? event.target : null;
                    if (!current)
                        return;
                    const index = items.indexOf(current);
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        search.focus();
                        return;
                    }
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
                        return;
                    event.preventDefault();
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    items[(index + delta + items.length) % items.length]?.focus();
                });
            }
        }
    }
    function syncTopbarMetrics() {
        const topbar = document.querySelector('.topbar');
        if (!topbar)
            return;
        const bottom = Math.max(0, Math.ceil(topbar.getBoundingClientRect().bottom));
        document.documentElement.style.setProperty('--fleet-topbar-bottom', `${bottom}px`);
    }
    function ensureSidebarBackdrop() {
        let backdrop = document.querySelector('.fleet-sidebar-backdrop');
        if (backdrop)
            return backdrop;
        backdrop = document.createElement('button');
        backdrop.type = 'button';
        backdrop.className = 'fleet-sidebar-backdrop';
        backdrop.setAttribute('aria-label', 'Close primary navigation');
        backdrop.hidden = true;
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', () => closeSidebar(true));
        return backdrop;
    }
    function mobileSidebarOpen() {
        return mobileSidebarQuery.matches && document.body.classList.contains('sidebar-collapsed');
    }
    function syncSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('toggleSidebar');
        if (!sidebar || !toggle)
            return;
        const mobile = mobileSidebarQuery.matches;
        const open = mobile ? mobileSidebarOpen() : !document.body.classList.contains('sidebar-collapsed');
        const backdrop = ensureSidebarBackdrop();
        setAttributeValue(toggle, 'aria-controls', 'sidebar');
        setAttributeValue(toggle, 'aria-expanded', String(open));
        setAttributeValue(sidebar, 'aria-label', 'Primary navigation');
        setAttributeValue(sidebar, 'aria-hidden', String(!open));
        if (!open) {
            if (!sidebar.hasAttribute('inert'))
                sidebar.setAttribute('inert', '');
        }
        else if (sidebar.hasAttribute('inert'))
            sidebar.removeAttribute('inert');
        const shouldHideBackdrop = !(mobile && open);
        if (backdrop.hidden !== shouldHideBackdrop)
            backdrop.hidden = shouldHideBackdrop;
        document.body.classList.toggle('fleet-mobile-nav-open', mobile && open);
    }
    function closeSidebar(returnFocus = false) {
        if (!mobileSidebarQuery.matches)
            return;
        document.body.classList.remove('sidebar-collapsed');
        syncSidebar();
        if (returnFocus)
            (sidebarReturnFocus || document.getElementById('toggleSidebar'))?.focus({ preventScroll: true });
        sidebarReturnFocus = null;
    }
    function enhanceSidebar(root) {
        const toggle = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        if (!toggle || !sidebar)
            return;
        syncSidebar();
        syncTopbarMetrics();
        if (toggle.dataset.fleetSidebarA11y !== 'true') {
            toggle.dataset.fleetSidebarA11y = 'true';
            toggle.addEventListener('click', () => {
                sidebarReturnFocus = toggle;
                requestAnimationFrame(() => {
                    syncSidebar();
                    if (mobileSidebarOpen())
                        sidebar.querySelector('.nav-item.active, .nav-item')?.focus();
                });
            });
            sidebar.addEventListener('click', event => {
                if (event.target instanceof Element && event.target.closest('a.nav-item'))
                    closeSidebar(false);
            });
        }
    }
    function trapSidebarFocus(event) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !mobileSidebarOpen())
            return;
        const items = focusable(sidebar);
        if (!items.length)
            return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last)
            return;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
    function sharedConfirmOpen() {
        const overlay = document.getElementById('fleetUxConfirmOverlay');
        return Boolean(overlay && !overlay.hidden && visible(overlay));
    }
    function dialogRootOpen(root) {
        if (root.id === 'fleetUxConfirmOverlay')
            return false;
        if (root.classList.contains('detail-drawer'))
            return root.classList.contains('open') && visible(root);
        if (root.classList.contains('modal'))
            return root.classList.contains('open') && visible(root);
        if (root.classList.contains('commercial-modal-backdrop') || root.classList.contains('modal-backdrop'))
            return visible(root);
        return visible(root);
    }
    function dialogPanel(root) {
        if (root.classList.contains('detail-drawer'))
            return root;
        if (root.classList.contains('modal'))
            return root.querySelector('.modal-card') || root;
        return root.querySelector('.modal-card, .commercial-modal, .cpa-assignment-modal, [role="dialog"]') || root;
    }
    function labelDialog(panel) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.tabIndex = -1;
        const heading = panel.querySelector('h1, h2, h3');
        if (heading) {
            panel.setAttribute('aria-labelledby', ensureId(heading, 'fleet-dialog-title'));
            panel.removeAttribute('aria-label');
        }
        else if (!panel.hasAttribute('aria-label')) {
            panel.setAttribute('aria-label', 'Dialog');
        }
    }
    function activateDialog(root, panel) {
        if (enhancedDialogs.has(panel))
            return;
        labelDialog(panel);
        const state = {
            panel,
            root,
            returnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null
        };
        enhancedDialogs.set(panel, state);
        document.body.classList.add('fleet-dialog-open');
        requestAnimationFrame(() => {
            const preferred = panel.querySelector('[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
            (preferred || panel).focus({ preventScroll: true });
        });
    }
    function deactivateDialog(panel) {
        const state = enhancedDialogs.get(panel);
        if (!state)
            return;
        enhancedDialogs.delete(panel);
        if (!enhancedDialogs.size)
            document.body.classList.remove('fleet-dialog-open');
        if (state.returnFocus?.isConnected)
            state.returnFocus.focus({ preventScroll: true });
    }
    function syncDialogs() {
        const roots = Array.from(document.querySelectorAll('.detail-drawer, .modal, .commercial-modal-backdrop, .modal-backdrop'));
        const openPanels = new Set();
        roots.forEach(root => {
            if (!dialogRootOpen(root))
                return;
            const panel = dialogPanel(root);
            if (!panel)
                return;
            openPanels.add(panel);
            activateDialog(root, panel);
        });
        Array.from(enhancedDialogs.keys()).forEach(panel => {
            if (!openPanels.has(panel) || !panel.isConnected)
                deactivateDialog(panel);
        });
    }
    function activeDialog() {
        return Array.from(enhancedDialogs.values()).at(-1) || null;
    }
    function closeActiveDialog() {
        const state = activeDialog();
        if (!state)
            return;
        const close = state.panel.querySelector('.modal-close, .drawer-close, .modal-close-btn, [data-close], [data-dismiss], [id^="close"]');
        if (close)
            close.click();
    }
    function trapDialogFocus(event) {
        const state = activeDialog();
        if (!state)
            return;
        const items = focusable(state.panel);
        if (!items.length) {
            event.preventDefault();
            state.panel.focus();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last)
            return;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
    function enhanceDialogs(root) {
        elements(root, '.modal-close, .drawer-close, .modal-close-btn').forEach(close => {
            close.setAttribute('aria-label', close.getAttribute('aria-label') || 'Close dialog');
        });
        syncDialogs();
    }
    function enhance(root = document) {
        ensureSkipLink();
        enhanceLandmarks(root);
        enhanceButtons(root);
        enhanceTables(root);
        enhanceInteractiveRows(root);
        enhanceForms(root);
        enhanceTablists(root);
        enhanceMenus(root);
        enhanceSidebar(root);
        enhanceDialogs(root);
    }
    function flushObservedChanges() {
        const roots = [...pendingRoots];
        pendingRoots.clear();
        roots.forEach(root => { if (root.isConnected)
            enhance(root); });
        enhanceTablists(document);
        enhanceMenus(document);
        enhanceTables(document);
        syncSidebar();
        syncDialogs();
        const search = document.getElementById('globalSearch');
        const results = document.getElementById('searchResults');
        if (search && results)
            setAttributeValue(search, 'aria-expanded', String(results.classList.contains('open')));
    }
    function scheduleObservedChanges() {
        if (window.FleetRuntimeStability) {
            FleetRuntimeStability.frame('responsive-accessibility:mutations', flushObservedChanges);
            return;
        }
        requestAnimationFrame(flushObservedChanges);
    }
    function stopObserving() {
        observer?.disconnect();
        observer = null;
        pendingRoots.clear();
    }
    function observe() {
        if (['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || ''))
            return;
        if (observer)
            return;
        observer = new MutationObserver(records => {
            let changed = false;
            records.forEach(record => {
                if (record.type === 'childList') {
                    record.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement)
                            pendingRoots.add(node);
                    });
                    changed = true;
                }
                if (record.type === 'attributes' && record.target instanceof HTMLElement) {
                    pendingRoots.add(record.target);
                    changed = true;
                }
            });
            if (changed)
                scheduleObservedChanges();
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden', 'aria-hidden', 'inert']
        });
        FleetRuntimeStability?.registerCleanup('responsive-accessibility:observer', stopObserving);
    }
    document.addEventListener('keydown', event => {
        if (sharedConfirmOpen())
            return;
        if (event.key === 'Escape') {
            if (activeDialog()) {
                event.preventDefault();
                closeActiveDialog();
                return;
            }
            if (mobileSidebarOpen()) {
                event.preventDefault();
                closeSidebar(true);
            }
        }
        if (event.key === 'Tab' && activeDialog())
            trapDialogFocus(event);
        else if (event.key === 'Tab' && mobileSidebarOpen())
            trapSidebarFocus(event);
    });
    mobileSidebarQuery.addEventListener('change', () => { syncSidebar(); syncTopbarMetrics(); });
    window.addEventListener('resize', () => syncTopbarMetrics(), { passive: true });
    compactTableQuery.addEventListener('change', () => enhanceTables(document));
    function init() {
        enhance(document);
        observe();
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else
        init();
    return { enhance, syncSidebar, closeSidebar };
})();
Object.assign(window, { FleetResponsiveAccessibility });
