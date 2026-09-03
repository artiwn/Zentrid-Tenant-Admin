"use strict";
/* Zentrid browser security policy.
   Hardens dynamic navigation, audits browser storage without reading values and exposes CSP/runtime diagnostics. */
(function () {
    const UNSAFE_PROTOCOL = /^(?:javascript|vbscript|file):/i;
    const HTML_DATA_URL = /^data:\s*text\/(?:html|javascript)/i;
    const SENSITIVE_STORAGE_KEY = /(?:access[_-]?token|refresh[_-]?token|password|passcode|secret|api[-_]?key|authorization|credential|private[-_]?key|cookie)/i;
    const INLINE_HANDLER_SELECTOR = '[onclick],[onchange],[oninput],[onsubmit],[onload],[onerror],[onkeydown],[onkeyup],[onfocus],[onblur]';
    const originalOpen = window.open.bind(window);
    let anchorsAudited = 0;
    let anchorsHardened = 0;
    let unsafeUrlsBlocked = 0;
    let formsAudited = 0;
    let unsafeFormActionsBlocked = 0;
    let cspViolations = 0;
    let observer = null;
    let scheduled = false;
    const pendingRoots = new Set();
    function rawUrl(element, attribute) {
        return String(element.getAttribute(attribute) || '').trim();
    }
    function isUnsafeUrl(value) {
        const compact = value.replace(/[\u0000-\u0020]+/g, '');
        return UNSAFE_PROTOCOL.test(compact) || HTML_DATA_URL.test(compact);
    }
    function resolvedUrl(value) {
        try {
            return new URL(value, window.location.href);
        }
        catch (_error) {
            return null;
        }
    }
    function blockUrl(element, attribute, value) {
        element.removeAttribute(attribute);
        element.dataset.fleetUrlBlocked = 'true';
        element.setAttribute('aria-disabled', 'true');
        element.title = 'Blocked unsafe navigation target.';
        unsafeUrlsBlocked += 1;
        window.dispatchEvent(new CustomEvent('zentrid:security-blocked-navigation', {
            detail: { tag: element.tagName.toLowerCase(), attribute, protocol: (value.split(':', 1)[0] || 'unknown').toLowerCase() }
        }));
    }
    function hardenAnchor(anchor) {
        anchorsAudited += 1;
        const href = rawUrl(anchor, 'href');
        if (href && isUnsafeUrl(href)) {
            blockUrl(anchor, 'href', href);
            return;
        }
        if (!href)
            return;
        const targetUrl = resolvedUrl(href);
        const external = Boolean(targetUrl && ['http:', 'https:'].includes(targetUrl.protocol) && targetUrl.origin !== window.location.origin);
        if (external)
            anchor.dataset.fleetExternalLink = 'true';
        if (anchor.target === '_blank') {
            const rel = new Set(String(anchor.rel || '').split(/\s+/).filter(Boolean));
            const before = rel.size;
            rel.add('noopener');
            rel.add('noreferrer');
            anchor.rel = [...rel].join(' ');
            anchor.referrerPolicy = 'no-referrer';
            if (rel.size !== before || !anchor.dataset.fleetHardened)
                anchorsHardened += 1;
            anchor.dataset.fleetHardened = 'true';
        }
    }
    function hardenForm(form) {
        formsAudited += 1;
        const action = rawUrl(form, 'action');
        if (!action)
            return;
        if (isUnsafeUrl(action)) {
            blockUrl(form, 'action', action);
            unsafeFormActionsBlocked += 1;
            return;
        }
        const targetUrl = resolvedUrl(action);
        if (targetUrl && targetUrl.origin !== window.location.origin) {
            blockUrl(form, 'action', action);
            unsafeFormActionsBlocked += 1;
        }
    }
    function hardenSensitiveInput(input) {
        const name = `${input.name} ${input.id}`.toLowerCase();
        if (input.type === 'password') {
            if (!input.autocomplete)
                input.autocomplete = name.includes('new') ? 'new-password' : 'current-password';
            input.spellcheck = false;
            input.autocapitalize = 'none';
            input.setAttribute('data-1p-ignore', 'false');
            return;
        }
        if (/(token|secret|api[_-]?key|credential)/i.test(name)) {
            input.spellcheck = false;
            input.autocapitalize = 'none';
            if (!input.autocomplete)
                input.autocomplete = 'off';
        }
    }
    function audit(root = document) {
        const anchors = root instanceof HTMLAnchorElement ? [root] : Array.from(root.querySelectorAll('a[href]'));
        anchors.forEach(hardenAnchor);
        const forms = root instanceof HTMLFormElement ? [root] : Array.from(root.querySelectorAll('form'));
        forms.forEach(hardenForm);
        const inputs = root instanceof HTMLInputElement ? [root] : Array.from(root.querySelectorAll('input'));
        inputs.forEach(hardenSensitiveInput);
    }
    function scheduleAudit(root) {
        pendingRoots.add(root);
        if (scheduled)
            return;
        scheduled = true;
        const run = () => {
            scheduled = false;
            const roots = [...pendingRoots];
            pendingRoots.clear();
            roots.forEach(audit);
        };
        if (typeof window.requestAnimationFrame === 'function')
            window.requestAnimationFrame(run);
        else
            window.setTimeout(run, 0);
    }
    function storageFindings() {
        const findings = [];
        const inspect = (area, storage) => {
            try {
                for (let index = 0; index < storage.length; index += 1) {
                    const key = storage.key(index) || '';
                    if (!SENSITIVE_STORAGE_KEY.test(key))
                        continue;
                    findings.push({ area, key, classification: area === 'localStorage' ? 'persistent-secret' : 'session-secret' });
                }
            }
            catch (_error) {
                // Storage can be unavailable in privacy-restricted browser contexts.
            }
        };
        inspect('localStorage', localStorage);
        inspect('sessionStorage', sessionStorage);
        return findings.sort((a, b) => `${a.area}:${a.key}`.localeCompare(`${b.area}:${b.key}`));
    }
    function snapshot() {
        return {
            policy: 'enforced-compatible',
            anchorsAudited,
            anchorsHardened,
            unsafeUrlsBlocked,
            formsAudited,
            unsafeFormActionsBlocked,
            inlineHandlers: document.querySelectorAll(INLINE_HANDLER_SELECTOR).length,
            inlineStyles: document.querySelectorAll('[style]').length,
            cspViolations,
            storageFindings: storageFindings(),
            authStorage: sessionStorage.getItem('zentrid_auth_storage_v139') === 'sessionStorage' ? 'sessionStorage' : 'fallback',
            referrerPolicy: document.querySelector('meta[name="referrer"]')?.content || 'strict-origin-when-cross-origin'
        };
    }
    function openExternal(url) {
        const targetUrl = resolvedUrl(String(url || '').trim());
        if (!targetUrl || !['http:', 'https:'].includes(targetUrl.protocol)) {
            unsafeUrlsBlocked += 1;
            window.dispatchEvent(new CustomEvent('zentrid:security-blocked-navigation', { detail: { tag: 'window', attribute: 'open', protocol: targetUrl?.protocol || 'invalid' } }));
            return null;
        }
        const opened = originalOpen(targetUrl.toString(), '_blank', 'noopener,noreferrer');
        try {
            if (opened)
                opened.opener = null;
        }
        catch (_error) { /* Cross-origin WindowProxy can reject assignment. */ }
        return opened;
    }
    function secureWindowOpen(url, target, features) {
        const value = String(url || '').trim();
        if (!value)
            return originalOpen('', target, features);
        if (isUnsafeUrl(value)) {
            unsafeUrlsBlocked += 1;
            return null;
        }
        const safeFeatures = new Set(String(features || '').split(',').map(item => item.trim()).filter(Boolean));
        if (target === '_blank') {
            safeFeatures.add('noopener');
            safeFeatures.add('noreferrer');
        }
        const opened = originalOpen(value, target, [...safeFeatures].join(','));
        try {
            if (target === '_blank' && opened)
                opened.opener = null;
        }
        catch (_error) { /* Best-effort tabnabbing protection. */ }
        return opened;
    }
    function mount() {
        audit(document);
        if (!['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || '')) {
            observer = new MutationObserver(records => {
                records.forEach(record => record.addedNodes.forEach(node => {
                    if (node instanceof Element)
                        scheduleAudit(node);
                }));
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }
    window.open = secureWindowOpen;
    document.addEventListener('securitypolicyviolation', event => {
        cspViolations += 1;
        window.dispatchEvent(new CustomEvent('zentrid:csp-violation', {
            detail: {
                directive: event.effectiveDirective,
                blocked: event.blockedURI ? event.blockedURI.split(/[?#]/, 1)[0] : '',
                disposition: event.disposition
            }
        }));
    });
    window.addEventListener('pagehide', () => observer?.disconnect(), { once: true });
    window.FleetBrowserSecurity = { audit, snapshot, openExternal, isUnsafeUrl };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    else
        mount();
})();
