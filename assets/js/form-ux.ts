type FleetFormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type FleetFormIssue = {
  control?: FleetFormControl | null;
  message: string;
};

type FleetFormValidationResult = {
  valid: boolean;
  issues: FleetFormIssue[];
};

const FleetFormUX = (() => {
  let errorSequence = 0;

  function controls(root: ParentNode): FleetFormControl[] {
    return Array.from(root.querySelectorAll<FleetFormControl>('input, select, textarea'))
      .filter(control => !control.disabled && control.type !== 'hidden' && !control.closest('[hidden], .is-hidden'));
  }

  function fieldLabel(control: FleetFormControl): string {
    const label = control.closest('label');
    if (!label) return control.name || control.id || 'Field';
    const clone = label.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, small, .field-help, .field-error').forEach(element => element.remove());
    return (clone.textContent || control.name || control.id || 'Field').replace(/\s*\*\s*$/, '').trim();
  }

  function validationMessage(control: FleetFormControl): string {
    const label = fieldLabel(control);
    if (control.validity.valueMissing) return `${label} is required.`;
    if (control.validity.typeMismatch) return `${label} has an invalid format.`;
    if (control.validity.patternMismatch) return `${label} does not match the expected format.`;
    if (control.validity.tooShort) return `${label} is too short.`;
    if (control.validity.tooLong) return `${label} is too long.`;
    if (control.validity.rangeUnderflow) return `${label} is below the allowed value.`;
    if (control.validity.rangeOverflow) return `${label} is above the allowed value.`;
    if (control.validity.badInput) return `${label} contains an invalid value.`;
    return control.validationMessage || `${label} is invalid.`;
  }

  function clearControlError(control: FleetFormControl): void {
    control.removeAttribute('aria-invalid');
    const describedBy = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    const ownErrorIds = describedBy.filter(id => id.startsWith('fleet-field-error-'));
    ownErrorIds.forEach(id => document.getElementById(id)?.remove());
    const remaining = describedBy.filter(id => !id.startsWith('fleet-field-error-'));
    if (remaining.length) control.setAttribute('aria-describedby', remaining.join(' '));
    else control.removeAttribute('aria-describedby');
    control.closest('label')?.classList.remove('has-error');
  }

  function clearErrors(root: ParentNode, summary?: HTMLElement | null): void {
    controls(root).forEach(clearControlError);
    root.querySelectorAll('.field-error[data-fleet-form-error="true"]').forEach(error => error.remove());
    root.querySelectorAll('.has-error').forEach(element => element.classList.remove('has-error'));
    if (summary) {
      summary.hidden = true;
      summary.innerHTML = '';
    }
  }

  function setControlError(control: FleetFormControl, message: string): void {
    clearControlError(control);
    const host = control.closest('label') || control.parentElement;
    if (!host) return;
    const error = document.createElement('small');
    const id = `fleet-field-error-${++errorSequence}`;
    error.id = id;
    error.className = 'field-error';
    error.dataset.fleetFormError = 'true';
    error.textContent = message;
    host.appendChild(error);
    host.classList.add('has-error');
    control.setAttribute('aria-invalid', 'true');
    const describedBy = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    control.setAttribute('aria-describedby', [...describedBy, id].join(' '));
  }

  function renderSummary(summary: HTMLElement | null | undefined, issues: FleetFormIssue[], title = 'Please review the highlighted fields'): void {
    if (!summary) return;
    if (!issues.length) {
      summary.hidden = true;
      summary.innerHTML = '';
      return;
    }
    summary.hidden = false;
    summary.innerHTML = `<strong>${title}</strong><ul>${issues.map(issue => `<li>${issue.message}</li>`).join('')}</ul>`;
  }

  function validate(root: ParentNode, customIssues: FleetFormIssue[] = [], summary?: HTMLElement | null, title?: string): FleetFormValidationResult {
    clearErrors(root, summary);
    const issues: FleetFormIssue[] = [];
    controls(root).forEach(control => {
      if (!control.checkValidity()) issues.push({ control, message: validationMessage(control) });
    });
    customIssues.forEach(issue => issues.push(issue));
    const seen = new Set<string>();
    const unique = issues.filter(issue => {
      const key = `${issue.control?.id || issue.control?.name || ''}|${issue.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.forEach(issue => { if (issue.control) setControlError(issue.control, issue.message); });
    renderSummary(summary, unique, title);
    return { valid: unique.length === 0, issues: unique };
  }

  function focusFirst(result: FleetFormValidationResult, summary?: HTMLElement | null): void {
    const control = result.issues.find(issue => issue.control)?.control;
    if (control) {
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (summary && !summary.hidden) {
      summary.focus({ preventScroll: true });
      summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function snapshot(form: HTMLFormElement): string {
    const values = controls(form).map(control => {
      if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
        return `${control.name || control.id}:${control.checked ? '1' : '0'}:${control.value}`;
      }
      if (control instanceof HTMLInputElement && control.type === 'file') {
        return `${control.name || control.id}:${Array.from(control.files || []).map(file => file.name).join('|')}`;
      }
      return `${control.name || control.id}:${control.value}`;
    });
    return values.join('\n');
  }

  function bindClearOnInput(form: HTMLFormElement, summary?: HTMLElement | null): void {
    const clear = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      clearControlError(target);
      if (summary && !form.querySelector('[aria-invalid="true"]')) {
        summary.hidden = true;
        summary.innerHTML = '';
      }
    };
    form.addEventListener('input', clear);
    form.addEventListener('change', clear);
  }

  function setBusy(button: HTMLButtonElement, busy: boolean, busyLabel = 'Saving…'): void {
    if (busy) {
      if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent || '';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = busyLabel;
      return;
    }
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.idleLabel !== undefined) button.textContent = button.dataset.idleLabel;
  }

  return {
    bindClearOnInput,
    clearErrors,
    focusFirst,
    renderSummary,
    setBusy,
    setControlError,
    snapshot,
    validate
  };
})();
