"use strict";
const FleetUX = (() => {
    const statusDefinitions = {
        active: { label: 'Active', tone: 'success' },
        online: { label: 'Online', tone: 'success' },
        normal: { label: 'Normal', tone: 'success' },
        healthy: { label: 'Healthy', tone: 'success' },
        connected: { label: 'Connected', tone: 'success' },
        valid: { label: 'Valid', tone: 'success' },
        verified: { label: 'Verified', tone: 'success' },
        approved: { label: 'Approved', tone: 'success' },
        completed: { label: 'Completed', tone: 'success' },
        complete: { label: 'Complete', tone: 'success' },
        resolved: { label: 'Resolved', tone: 'success' },
        passed: { label: 'Passed', tone: 'success' },
        success: { label: 'Success', tone: 'success' },
        ready: { label: 'Ready', tone: 'success' },
        paid: { label: 'Paid', tone: 'success' },
        processed: { label: 'Processed', tone: 'success' },
        matched: { label: 'Matched', tone: 'success' },
        configured: { label: 'Configured', tone: 'success' },
        fresh: { label: 'Fresh', tone: 'success' },
        acknowledged: { label: 'Acknowledged', tone: 'success' },
        warning: { label: 'Warning', tone: 'warning' },
        attention: { label: 'Needs Attention', tone: 'warning' },
        'needs attention': { label: 'Needs Attention', tone: 'warning' },
        pending: { label: 'Pending', tone: 'warning' },
        draft: { label: 'Draft', tone: 'warning' },
        suspended: { label: 'Suspended', tone: 'warning' },
        delayed: { label: 'Delayed', tone: 'warning' },
        partial: { label: 'Partial', tone: 'warning' },
        review: { label: 'Review', tone: 'warning' },
        'in review': { label: 'In Review', tone: 'warning' },
        unacknowledged: { label: 'Unacknowledged', tone: 'warning' },
        due: { label: 'Due', tone: 'warning' },
        expiring: { label: 'Expiring', tone: 'warning' },
        processing: { label: 'Processing', tone: 'warning' },
        'in progress': { label: 'In Progress', tone: 'warning' },
        retrying: { label: 'Retrying', tone: 'warning' },
        inactive: { label: 'Inactive', tone: 'neutral' },
        archived: { label: 'Archived', tone: 'neutral' },
        disabled: { label: 'Disabled', tone: 'neutral' },
        cancelled: { label: 'Cancelled', tone: 'neutral' },
        canceled: { label: 'Cancelled', tone: 'neutral' },
        closed: { label: 'Closed', tone: 'neutral' },
        unknown: { label: 'Unknown', tone: 'neutral' },
        'not configured': { label: 'Not Configured', tone: 'neutral' },
        'no data': { label: 'No Data', tone: 'neutral' },
        unsupported: { label: 'Unsupported', tone: 'neutral' },
        fault: { label: 'Fault', tone: 'danger' },
        failed: { label: 'Failed', tone: 'danger' },
        error: { label: 'Error', tone: 'danger' },
        critical: { label: 'Critical', tone: 'danger' },
        offline: { label: 'Offline', tone: 'danger' },
        blocked: { label: 'Blocked', tone: 'danger' },
        rejected: { label: 'Rejected', tone: 'danger' },
        overdue: { label: 'Overdue', tone: 'danger' },
        expired: { label: 'Expired', tone: 'danger' }
    };
    const stateIcons = {
        loading: '↻',
        empty: '∅',
        error: '!',
        success: '✓',
        warning: '△',
        info: 'i'
    };
    let confirmResolver = null;
    let confirmReturnFocus = null;
    let observer = null;
    const pendingRoots = new Set();
    function escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function normalizedStatus(value) {
        return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    }
    function status(value) {
        return statusDefinitions[normalizedStatus(value)] || null;
    }
    function statusTone(value, fallback = 'neutral') {
        return status(value)?.tone || fallback;
    }
    function statusLabel(value) {
        return status(value)?.label || String(value ?? '').trim();
    }
    function applyStatusElement(element) {
        if (element.dataset.fleetStatusLocked === 'true')
            return;
        const raw = element.dataset.status || element.dataset.state || element.textContent || '';
        const definition = status(raw);
        if (!definition)
            return;
        const toneClasses = ['good', 'warn', 'bad', 'success', 'warning', 'danger', 'muted', 'neutral', 'info'];
        toneClasses.forEach(className => element.classList.remove(className));
        const className = definition.tone === 'neutral' ? 'muted' : definition.tone;
        element.classList.add(className);
        element.dataset.fleetStatus = normalizedStatus(raw);
        element.dataset.fleetStatusTone = definition.tone;
        if (element.childElementCount === 0 && element.textContent?.trim() !== definition.label)
            element.textContent = definition.label;
        if (!element.hasAttribute('aria-label'))
            element.setAttribute('aria-label', `Status: ${definition.label}`);
    }
    function applyStatuses(root = document) {
        root.querySelectorAll('.badge, .status-pill, .status-badge, [data-status]').forEach(applyStatusElement);
        if (root instanceof HTMLElement && root.matches?.('.badge, .status-pill, .status-badge, [data-status]'))
            applyStatusElement(root);
    }
    function ensureStateCopy(element, icon) {
        let copy = Array.from(element.children).find(child => child.classList.contains('fleet-ux-state-copy'));
        if (!copy) {
            copy = document.createElement('div');
            copy.className = 'fleet-ux-state-copy';
        }
        Array.from(element.childNodes).forEach(node => {
            if (node === icon || node === copy)
                return;
            copy?.append(node);
        });
        if (copy.parentElement !== element)
            element.append(copy);
        element.dataset.fleetUxStateCopyWrapped = 'true';
        return copy;
    }
    function enhanceStateElement(element, kind) {
        if (element.dataset.fleetUxStateEnhanced === 'true')
            return;
        element.dataset.fleetUxStateEnhanced = 'true';
        element.dataset.fleetUxState = kind;
        element.classList.add('fleet-ux-state', `fleet-ux-state-${kind}`);
        element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        element.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
        let icon = Array.from(element.children).find(child => child.classList.contains('fleet-ux-state-icon'));
        if (!icon) {
            icon = document.createElement('span');
            icon.className = 'fleet-ux-state-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = stateIcons[kind];
            element.prepend(icon);
        }
        ensureStateCopy(element, icon);
    }
    function enhanceStates(root = document) {
        root.querySelectorAll('.empty-state, .empty-card, .empty-search').forEach(element => enhanceStateElement(element, 'empty'));
        root.querySelectorAll('.api-error, .error-state, [data-state="error"]').forEach(element => enhanceStateElement(element, 'error'));
        root.querySelectorAll('.loading-state, [data-state="loading"]').forEach(element => enhanceStateElement(element, 'loading'));
    }
    function stateMarkup(kind, options) {
        const action = options.actionLabel
            ? `<button type="button" class="secondary-action fleet-ux-state-action">${escape(options.actionLabel)}</button>`
            : '';
        return `<section class="fleet-ux-state fleet-ux-state-${kind}" data-fleet-ux-state="${kind}" role="${kind === 'error' ? 'alert' : 'status'}" aria-live="${kind === 'error' ? 'assertive' : 'polite'}">
      <span class="fleet-ux-state-icon" aria-hidden="true">${stateIcons[kind]}</span>
      <div class="fleet-ux-state-copy"><strong>${escape(options.title)}</strong><span>${escape(options.message)}</span>${action}</div>
    </section>`;
    }
    function renderState(container, kind, options) {
        container.innerHTML = stateMarkup(kind, options);
        if (options.actionLabel && options.onAction)
            container.querySelector('.fleet-ux-state-action')?.addEventListener('click', options.onAction);
    }
    function inferTone(message) {
        const value = message.toLowerCase();
        if (/\b(fail|failed|error|unable|denied|invalid|blocked|expired|not saved)\b/.test(value))
            return 'danger';
        if (/\b(warn|warning|pending|draft|local|read-only|unavailable|delayed|required)\b/.test(value))
            return 'warning';
        if (/\b(success|successful|saved|created|completed|updated|approved|activated|connected|passed|ready)\b/.test(value))
            return 'success';
        return 'info';
    }
    function ensureConfirmDialog() {
        let overlay = document.getElementById('fleetUxConfirmOverlay');
        if (overlay)
            return overlay;
        overlay = document.createElement('div');
        overlay.id = 'fleetUxConfirmOverlay';
        overlay.className = 'fleet-ux-confirm-overlay';
        overlay.hidden = true;
        overlay.innerHTML = `<section class="fleet-ux-confirm" role="alertdialog" aria-modal="true" aria-labelledby="fleetUxConfirmTitle" aria-describedby="fleetUxConfirmMessage">
      <span class="fleet-ux-confirm-icon" aria-hidden="true">!</span>
      <div class="fleet-ux-confirm-copy"><strong id="fleetUxConfirmTitle"></strong><span id="fleetUxConfirmMessage"></span></div>
      <div class="fleet-ux-confirm-actions"><button type="button" class="secondary-action" data-fleet-confirm="cancel">Cancel</button><button type="button" class="primary-action" data-fleet-confirm="accept">Confirm</button></div>
    </section>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof Element))
                return;
            const choice = target.closest('[data-fleet-confirm]')?.dataset.fleetConfirm;
            if (choice === 'accept')
                closeConfirm(true);
            if (choice === 'cancel' || target === overlay)
                closeConfirm(false);
        });
        document.addEventListener('keydown', event => {
            if (overlay?.hidden)
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeConfirm(false);
            }
            if (event.key === 'Tab')
                trapConfirmFocus(event, overlay);
        });
        return overlay;
    }
    function trapConfirmFocus(event, overlay) {
        const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length)
            return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
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
    function closeConfirm(value) {
        const overlay = document.getElementById('fleetUxConfirmOverlay');
        if (overlay)
            overlay.hidden = true;
        const resolver = confirmResolver;
        confirmResolver = null;
        resolver?.(value);
        confirmReturnFocus?.focus({ preventScroll: true });
        confirmReturnFocus = null;
    }
    function confirmAction(options) {
        if (confirmResolver)
            closeConfirm(false);
        const overlay = ensureConfirmDialog();
        const panel = overlay.querySelector('.fleet-ux-confirm');
        const title = overlay.querySelector('#fleetUxConfirmTitle');
        const message = overlay.querySelector('#fleetUxConfirmMessage');
        const accept = overlay.querySelector('[data-fleet-confirm="accept"]');
        const cancel = overlay.querySelector('[data-fleet-confirm="cancel"]');
        if (!panel || !title || !message || !accept || !cancel)
            return Promise.resolve(false);
        confirmReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        title.textContent = options.title;
        message.textContent = options.message;
        accept.textContent = options.confirmLabel || 'Confirm';
        cancel.textContent = options.cancelLabel || 'Cancel';
        panel.dataset.tone = options.tone || 'primary';
        accept.className = options.tone === 'danger' ? 'danger-action' : options.tone === 'warning' ? 'secondary-action warning-action' : 'primary-action';
        overlay.hidden = false;
        requestAnimationFrame(() => cancel.focus());
        return new Promise(resolve => { confirmResolver = resolve; });
    }
    function flushObservedRoots() {
        const roots = [...pendingRoots];
        pendingRoots.clear();
        roots.forEach(root => {
            if (!root.isConnected)
                return;
            applyStatuses(root);
            enhanceStates(root);
        });
    }
    function scheduleObservedFlush() {
        if (window.FleetRuntimeStability) {
            FleetRuntimeStability.frame('ux-consistency:mutations', flushObservedRoots);
            return;
        }
        requestAnimationFrame(flushObservedRoots);
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
            records.forEach(record => record.addedNodes.forEach(node => {
                if (node instanceof HTMLElement)
                    pendingRoots.add(node);
            }));
            if (pendingRoots.size)
                scheduleObservedFlush();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        FleetRuntimeStability?.registerCleanup('ux-consistency:observer', stopObserving);
    }
    function init() {
        applyStatuses(document);
        enhanceStates(document);
        observe();
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else
        init();
    return {
        applyStatuses,
        confirmAction,
        enhanceStates,
        escape,
        inferTone,
        renderState,
        stateMarkup,
        status,
        statusLabel,
        statusTone
    };
})();
Object.assign(window, { FleetUX });
