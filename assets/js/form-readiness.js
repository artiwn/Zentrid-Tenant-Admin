"use strict";
const FleetFormReadiness = (() => {
    const states = new WeakMap();
    const enhanced = new Set();
    const sensitivePattern = /(password|passcode|token|secret|api[-_]?key|authorization|credential|private[-_]?key|cookie)/i;
    let observer = null;
    let frameId = 0;
    function runtime() {
        return window.FleetRuntimeStability || null;
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function controls(form) {
        return Array.from(form.querySelectorAll('input, select, textarea')).filter(control => {
            if (control.disabled || !control.name)
                return false;
            if (control instanceof HTMLInputElement && ['button', 'submit', 'reset', 'image'].includes(control.type))
                return false;
            return true;
        });
    }
    function formMode(form) {
        const value = form.dataset.fleetFormReadiness;
        if (value === 'api' || value === 'unavailable' || value === 'readonly')
            return value;
        return 'local';
    }
    function normalizedFieldName(control) {
        return (control.dataset.dtoKey || control.name).replace(/\[\]$/, '').trim();
    }
    function emptyPolicy(control) {
        const explicit = control.dataset.emptyPolicy;
        if (explicit === 'null' || explicit === 'empty')
            return explicit;
        if (control.dataset.nullable === 'true')
            return 'null';
        return control.required ? 'empty' : 'omit';
    }
    function valueType(control) {
        const explicit = control.dataset.dtoType;
        if (explicit === 'number' || explicit === 'integer' || explicit === 'boolean' || explicit === 'date' || explicit === 'datetime' || explicit === 'json')
            return explicit;
        if (control instanceof HTMLInputElement) {
            if (control.type === 'number' || control.type === 'range')
                return control.step === '1' ? 'integer' : 'number';
            if (control.type === 'checkbox')
                return 'boolean';
            if (control.type === 'date')
                return 'date';
            if (control.type === 'datetime-local')
                return 'datetime';
        }
        return 'string';
    }
    function setPath(target, path, value, append = false) {
        const parts = path.split('.').map(part => part.trim()).filter(Boolean);
        if (!parts.length)
            return;
        let cursor = target;
        parts.slice(0, -1).forEach(part => {
            const current = cursor[part];
            if (!current || typeof current !== 'object' || Array.isArray(current))
                cursor[part] = {};
            cursor = cursor[part];
        });
        const key = parts[parts.length - 1];
        if (!key)
            return;
        if (!append || cursor[key] === undefined) {
            cursor[key] = value;
            return;
        }
        const current = cursor[key];
        cursor[key] = Array.isArray(current) ? [...current, value] : [current, value];
    }
    function parseValue(control, raw, issues) {
        const field = normalizedFieldName(control);
        const type = valueType(control);
        if (raw === '') {
            const policy = emptyPolicy(control);
            if (policy === 'null')
                return null;
            if (policy === 'empty')
                return '';
            return undefined;
        }
        if (type === 'number' || type === 'integer') {
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) {
                issues.push({ field, code: 'invalid-number', message: `${field} must be a valid number.` });
                return undefined;
            }
            return type === 'integer' ? Math.trunc(parsed) : parsed;
        }
        if (type === 'boolean')
            return raw === 'true' || raw === '1' || raw === 'on';
        if (type === 'json') {
            try {
                return JSON.parse(raw);
            }
            catch {
                issues.push({ field, code: 'invalid-json', message: `${field} must contain valid JSON.` });
                return undefined;
            }
        }
        return raw.trim();
    }
    function enumValues(control) {
        const explicit = control.dataset.enum;
        if (explicit)
            return explicit.split(',').map((value) => value.trim()).filter(Boolean);
        if (control instanceof HTMLSelectElement)
            return Array.from(control.options).map(option => option.value).filter(Boolean);
        return [];
    }
    function addNativeIssue(control, issues) {
        if (control.checkValidity())
            return;
        const field = normalizedFieldName(control);
        const message = control.validationMessage || `${field} is invalid.`;
        issues.push({ field, code: 'native-validation', message });
    }
    function serialize(form) {
        const payload = {};
        const files = [];
        const issues = [];
        const seenRadio = new Set();
        const checkboxGroups = new Map();
        const list = controls(form);
        list.forEach(control => {
            if (control instanceof HTMLInputElement && control.type === 'checkbox') {
                const key = normalizedFieldName(control);
                const group = checkboxGroups.get(key) || [];
                group.push(control);
                checkboxGroups.set(key, group);
            }
        });
        list.forEach(control => {
            const field = normalizedFieldName(control);
            if (!field)
                return;
            addNativeIssue(control, issues);
            if (control instanceof HTMLInputElement && control.type === 'file') {
                const descriptors = Array.from(control.files || []).map(file => ({
                    field,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: file.lastModified
                }));
                files.push(...descriptors);
                if (descriptors.length)
                    setPath(payload, field, control.multiple ? descriptors : descriptors[0]);
                else if (emptyPolicy(control) === 'null')
                    setPath(payload, field, null);
                return;
            }
            if (control instanceof HTMLInputElement && control.type === 'radio') {
                if (seenRadio.has(field))
                    return;
                seenRadio.add(field);
                const selected = list.find(candidate => candidate instanceof HTMLInputElement
                    && candidate.type === 'radio'
                    && normalizedFieldName(candidate) === field
                    && candidate.checked);
                if (selected)
                    setPath(payload, field, parseValue(selected, selected.value, issues));
                else if (emptyPolicy(control) === 'null')
                    setPath(payload, field, null);
                return;
            }
            if (control instanceof HTMLInputElement && control.type === 'checkbox') {
                const group = checkboxGroups.get(field) || [];
                if (group.length > 1 || control.name.endsWith('[]')) {
                    if (group[0] !== control)
                        return;
                    const values = group.filter(item => item.checked).map(item => parseValue(item, item.value, issues)).filter(value => value !== undefined);
                    if (values.length)
                        setPath(payload, field, values);
                    else if (emptyPolicy(control) === 'null')
                        setPath(payload, field, null);
                    else
                        setPath(payload, field, []);
                    return;
                }
                setPath(payload, field, control.checked);
                return;
            }
            if (control instanceof HTMLSelectElement && control.multiple) {
                const values = Array.from(control.selectedOptions).map(option => parseValue(control, option.value, issues)).filter(value => value !== undefined);
                setPath(payload, field, values);
                return;
            }
            const raw = control.value;
            const allowed = enumValues(control);
            if (raw && allowed.length && !allowed.includes(raw)) {
                issues.push({ field, code: 'invalid-enum', message: `${field} contains an unsupported option.` });
            }
            const parsed = parseValue(control, raw, issues);
            if (parsed !== undefined)
                setPath(payload, field, parsed, control.name.endsWith('[]'));
        });
        return {
            payload,
            files,
            issues: issues.filter((issue, index, all) => all.findIndex(candidate => candidate.field === issue.field && candidate.code === issue.code && candidate.message === issue.message) === index),
            meta: {
                formId: form.id || form.name || 'anonymous-form',
                contract: form.dataset.fleetFormContract || form.id || 'UnspecifiedFormContract',
                mode: formMode(form),
                endpoint: form.dataset.fleetFormEndpoint || '',
                method: (form.dataset.fleetFormMethod || form.method || 'POST').toUpperCase(),
                serializedAt: new Date().toISOString(),
                fieldCount: list.length
            }
        };
    }
    function stableValue(value) {
        if (Array.isArray(value))
            return value.map(stableValue);
        if (!value || typeof value !== 'object')
            return value;
        const record = value;
        return Object.fromEntries(Object.keys(record).sort().map(key => [key, stableValue(record[key])]));
    }
    function formSnapshot(form) {
        const result = serialize(form);
        return JSON.stringify({ payload: stableValue(result.payload), files: result.files.map(file => ({ field: file.field, name: file.name, size: file.size, type: file.type })) });
    }
    function redacted(value, path = '') {
        if (Array.isArray(value))
            return value.map((item, index) => redacted(item, `${path}.${index}`));
        if (!value || typeof value !== 'object')
            return sensitivePattern.test(path) ? '[redacted]' : value;
        const record = value;
        return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, sensitivePattern.test(key) ? '[redacted]' : redacted(item, path ? `${path}.${key}` : key)]));
    }
    function modeCopy(form, mode) {
        const note = form.dataset.fleetFormApiNote || '';
        if (mode === 'api')
            return { badge: 'API ready', title: 'Backend submission is connected', copy: note || 'Values are serialized through the declared DTO contract before submission.' };
        if (mode === 'unavailable')
            return { badge: 'API unavailable', title: 'Submission is disabled', copy: note || 'The backend endpoint is not confirmed. You can review validation and DTO preview without sending a request.' };
        if (mode === 'readonly')
            return { badge: 'Read-only', title: 'This form cannot be changed', copy: note || 'The current record or endpoint is read-only.' };
        return { badge: 'Local draft', title: 'Prototype save remains local', copy: note || 'No new backend request is introduced. The DTO preview is prepared for future API connection.' };
    }
    function createStatus(form, mode) {
        const status = document.createElement('section');
        status.className = `fleet-form-readiness fleet-form-readiness-${mode}`;
        status.dataset.fleetFormReadinessUi = 'true';
        status.setAttribute('aria-live', 'polite');
        const copy = modeCopy(form, mode);
        status.innerHTML = `
      <span class="fleet-form-readiness-badge">${escapeHtml(copy.badge)}</span>
      <div class="fleet-form-readiness-copy"><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.copy)}</small></div>
      <span class="fleet-form-dirty-state">No unsaved changes</span>`;
        form.prepend(status);
        let summary = form.querySelector('[data-fleet-form-summary], .form-validation-summary, [data-validation-summary]');
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'fleet-form-validation-summary';
            summary.hidden = true;
            summary.tabIndex = -1;
            status.insertAdjacentElement('afterend', summary);
        }
        else {
            summary.classList.add('fleet-form-validation-summary');
        }
        summary.dataset.fleetFormSummary = 'true';
        if (!summary.id)
            summary.id = `fleet-form-summary-${form.id || Math.random().toString(36).slice(2, 8)}`;
        const details = document.createElement('details');
        details.className = 'fleet-form-contract-preview full';
        details.innerHTML = `<summary>DTO preview</summary><div class="fleet-form-contract-meta"></div><pre></pre>`;
        const actions = form.querySelector('.modal-actions, .builder-footer-v27, .setup-actions, .form-actions, .drawer-actions');
        if (actions?.parentElement === form)
            form.insertBefore(details, actions);
        else
            form.append(details);
        const preview = details.querySelector('pre');
        const state = {
            initialSnapshot: '',
            dirty: false,
            status,
            statusBadge: status.querySelector('.fleet-form-readiness-badge'),
            statusTitle: status.querySelector('.fleet-form-readiness-copy strong'),
            statusCopy: status.querySelector('.fleet-form-readiness-copy small'),
            summary,
            preview,
            mode
        };
        return state;
    }
    function renderSummary(form, issues, title = 'Please review the form') {
        const state = states.get(form);
        if (!state)
            return;
        if (!issues.length) {
            state.summary.hidden = true;
            state.summary.innerHTML = '';
            return;
        }
        state.summary.hidden = false;
        state.summary.innerHTML = `<strong>${escapeHtml(title)}</strong><ul>${issues.map(issue => `<li><b>${escapeHtml(issue.field)}</b>: ${escapeHtml(issue.message)}</li>`).join('')}</ul>`;
    }
    function updatePreview(form) {
        const result = serialize(form);
        const state = states.get(form);
        if (!state)
            return result;
        const safe = redacted(result.payload);
        state.preview.textContent = JSON.stringify(safe, null, 2);
        const meta = state.preview.parentElement?.querySelector('.fleet-form-contract-meta');
        if (meta) {
            const endpoint = result.meta.endpoint || 'Endpoint not confirmed';
            meta.innerHTML = `<span>${escapeHtml(result.meta.contract)}</span><span>${escapeHtml(result.meta.method)} ${escapeHtml(endpoint)}</span><span>${result.files.length} file(s)</span><span>${result.issues.length} issue(s)</span>`;
        }
        return result;
    }
    function schedulePreview(form) {
        const key = `form-readiness:${form.id || form.dataset.fleetFormContract || 'form'}`;
        const sharedRuntime = runtime();
        if (sharedRuntime)
            sharedRuntime.debounce(key, () => updatePreview(form), 180);
        else
            window.setTimeout(() => updatePreview(form), 180);
    }
    function updateDirty(form) {
        const state = states.get(form);
        if (!state)
            return;
        const nextDirty = state.initialSnapshot !== '' && formSnapshot(form) !== state.initialSnapshot;
        const changed = state.dirty !== nextDirty;
        state.dirty = nextDirty;
        form.classList.toggle('is-dirty', state.dirty);
        form.dataset.fleetFormDirty = state.dirty ? 'true' : 'false';
        const label = state.status.querySelector('.fleet-form-dirty-state');
        if (label)
            label.textContent = state.dirty ? 'Unsaved changes' : 'No unsaved changes';
        if (changed)
            window.dispatchEvent(new CustomEvent('zentrid:form-dirty-change', { detail: { form, dirty: state.dirty } }));
    }
    function markCommitted(form) {
        const state = states.get(form);
        if (!state)
            return;
        state.initialSnapshot = formSnapshot(form);
        state.dirty = false;
        form.classList.remove('is-dirty');
        form.dataset.fleetFormDirty = 'false';
        const label = state.status.querySelector('.fleet-form-dirty-state');
        if (label)
            label.textContent = 'No unsaved changes';
        updatePreview(form);
        window.dispatchEvent(new CustomEvent('zentrid:form-committed', { detail: { form } }));
    }
    function applyMode(form, state) {
        const submitButtons = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));
        submitButtons.forEach(button => {
            if (button.dataset.fleetDisabledByReadiness === 'true')
                button.disabled = false;
            delete button.dataset.fleetDisabledByReadiness;
            if (button.title === 'API not available')
                button.removeAttribute('title');
        });
        controls(form).forEach(control => {
            if (control.dataset.fleetReadonlyByReadiness === 'true')
                control.disabled = false;
            delete control.dataset.fleetReadonlyByReadiness;
        });
        if (state.mode === 'unavailable') {
            submitButtons.forEach(button => {
                button.disabled = true;
                button.dataset.fleetDisabledByReadiness = 'true';
                if (state.summary.id)
                    button.setAttribute('aria-describedby', state.summary.id);
                button.title = 'API not available';
            });
        }
        if (state.mode === 'readonly') {
            controls(form).forEach(control => {
                control.disabled = true;
                control.dataset.fleetReadonlyByReadiness = 'true';
            });
            submitButtons.forEach(button => {
                button.disabled = true;
                button.dataset.fleetDisabledByReadiness = 'true';
            });
        }
    }
    function validate(form) {
        const result = updatePreview(form);
        renderSummary(form, result.issues, result.issues.length ? 'Please review the highlighted values' : 'Form is valid');
        if (result.issues.length)
            states.get(form)?.summary.focus({ preventScroll: true });
        return result;
    }
    function enhance(form) {
        if (states.has(form) || form.dataset.fleetFormReadiness === 'off')
            return;
        const mode = formMode(form);
        const state = createStatus(form, mode);
        states.set(form, state);
        enhanced.add(form);
        form.dataset.fleetFormEnhanced = 'true';
        applyMode(form, state);
        const onChange = () => {
            updateDirty(form);
            schedulePreview(form);
        };
        form.addEventListener('input', onChange);
        form.addEventListener('change', onChange);
        form.addEventListener('reset', () => window.setTimeout(() => markCommitted(form), 0));
        form.addEventListener('submit', event => {
            if (state.mode === 'unavailable' || state.mode === 'readonly') {
                event.preventDefault();
                const title = state.mode === 'unavailable' ? 'API not available' : 'Form is read-only';
                renderSummary(form, [{ field: 'submission', code: state.mode, message: state.statusCopy.textContent || title }], title);
                state.summary.focus({ preventScroll: true });
                return;
            }
            if (form.dataset.fleetFormValidation === 'native') {
                const result = validate(form);
                if (result.issues.length)
                    event.preventDefault();
            }
        }, true);
        window.setTimeout(() => markCommitted(form), 0);
    }
    function enhanceAll(root = document) {
        if (root instanceof HTMLFormElement && root.dataset.fleetFormReadiness && root.dataset.fleetFormReadiness !== 'off')
            enhance(root);
        root.querySelectorAll('form[data-fleet-form-readiness]:not([data-fleet-form-readiness="off"])').forEach(enhance);
    }
    function scheduleEnhance(root = document) {
        const run = () => enhanceAll(root);
        const sharedRuntime = runtime();
        if (sharedRuntime)
            sharedRuntime.frame('form-readiness:enhance', run);
        else {
            if (frameId)
                cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => { frameId = 0; run(); });
        }
    }
    function isDirty(form) {
        return states.get(form)?.dirty || false;
    }
    function setMode(form, mode, note = '') {
        form.dataset.fleetFormReadiness = mode;
        if (note)
            form.dataset.fleetFormApiNote = note;
        const state = states.get(form);
        if (!state) {
            enhance(form);
            return;
        }
        state.mode = mode;
        const copy = modeCopy(form, mode);
        state.status.className = `fleet-form-readiness fleet-form-readiness-${mode}`;
        state.statusBadge.textContent = copy.badge;
        state.statusTitle.textContent = copy.title;
        state.statusCopy.textContent = copy.copy;
        applyMode(form, state);
    }
    function snapshot() {
        return Array.from(enhanced).filter(form => form.isConnected).map(form => {
            const result = serialize(form);
            return {
                formId: result.meta.formId,
                contract: result.meta.contract,
                mode: result.meta.mode,
                endpoint: result.meta.endpoint,
                method: result.meta.method,
                dirty: isDirty(form),
                issueCount: result.issues.length,
                fileCount: result.files.length
            };
        });
    }
    function formIsActive(form) {
        if (!form.isConnected)
            return false;
        if (form.closest('[hidden], [aria-hidden="true"], .is-hidden'))
            return false;
        const modal = form.closest('.modal, .detail-drawer');
        if (modal && !modal.classList.contains('open'))
            return false;
        return true;
    }
    function bind() {
        enhanceAll(document);
        if (!['client-detail', 'plant-detail'].includes(document.body?.dataset.tenantPage || '') && typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(records => {
                records.forEach(record => record.addedNodes.forEach(node => {
                    if (node instanceof Element)
                        scheduleEnhance(node);
                }));
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
        window.addEventListener('beforeunload', event => {
            if (![...enhanced].some(form => formIsActive(form) && isDirty(form)))
                return;
            event.preventDefault();
            event.returnValue = '';
        });
        runtime()?.registerCleanup('form-readiness', () => {
            observer?.disconnect();
            observer = null;
            if (frameId)
                cancelAnimationFrame(frameId);
            frameId = 0;
            enhanced.clear();
        });
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', bind, { once: true });
    else
        bind();
    return {
        enhance,
        enhanceAll,
        isDirty,
        markCommitted,
        serialize,
        setMode,
        snapshot,
        updatePreview,
        validate
    };
})();
window.FleetFormReadiness = FleetFormReadiness;
