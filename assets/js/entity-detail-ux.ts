type FleetEntityDetailTone = 'info' | 'warning' | 'danger' | 'success';

type FleetEntityDetailModeCopy = {
  title: string;
  message: string;
  tone: FleetEntityDetailTone;
};

type FleetEntityDetailModeOptions = {
  status?: unknown;
  archivedStatuses?: string[];
  backendTitle: string;
  backendMessage: string;
  backendTone?: FleetEntityDetailTone;
  archivedTitle: string;
  archivedMessage: string;
  archivedTone?: FleetEntityDetailTone;
  localTitle?: string;
  localMessage?: string;
  localTone?: FleetEntityDetailTone;
};

type FleetEntityFreshnessOptions = {
  timestampKeys?: string[];
  liveEmpty?: string;
  mixedEmpty?: string;
  localEmpty?: string;
  mockEmpty?: string;
  livePrefix?: string;
  mixedPrefix?: string;
  localPrefix?: string;
  mockPrefix?: string;
};

type FleetEntityFeedbackOptions = {
  id: string;
  className: string;
  tone: FleetEntityDetailTone;
  title: string;
  message: string;
  escape?: (value: unknown) => string;
  focus?: boolean;
};

type FleetEntitySectionModeOptions = {
  editable: boolean;
  backendManaged: boolean;
  archived: boolean;
  sectionEditable: boolean;
  editLabel?: string;
  backendLabel?: string;
  archivedLabel?: string;
  viewLabel?: string;
  readonlyLabel?: string;
};

const FleetEntityDetailUX = (() => {
  const beforeUnloadGuards = new Map<string, () => boolean>();
  let beforeUnloadBound = false;

  function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  function escape(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function origin(record: unknown, entity: string): FleetDataOrigin {
    return FleetDataSource.origin(record, entity);
  }

  function backendManaged(record: unknown, entity: string): boolean {
    const value = origin(record, entity);
    return value === 'live' || value === 'mixed';
  }

  function archived(status: unknown, archivedStatuses: string[] = ['archived']): boolean {
    const normalized = String(status ?? '').trim().toLowerCase();
    return archivedStatuses.some(item => item.trim().toLowerCase() === normalized);
  }

  function valueAtPath(record: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      const row = asRecord(current);
      return row[key];
    }, record);
  }

  function firstValue(record: unknown, paths: string[]): unknown {
    const row = asRecord(record);
    for (const path of paths) {
      const value = valueAtPath(row, path);
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return null;
  }

  function freshness(record: unknown, entity: string, options: FleetEntityFreshnessOptions = {}): string {
    const paths = options.timestampKeys || [
      'lastSyncAt',
      'last_sync_at',
      'updated',
      'updatedAt',
      'raw.lastSyncAt',
      'raw.lastSyncAtUtc',
      'raw.updatedAt'
    ];
    const value = firstValue(record, paths);
    const source = origin(record, entity);

    if (source === 'live') {
      return value
        ? `${options.livePrefix || 'Last backend sync:'} ${String(value)}`
        : options.liveEmpty || 'Live backend record · sync time unavailable';
    }
    if (source === 'mixed') {
      return value
        ? `${options.mixedPrefix || 'Backend sync:'} ${String(value)} · local overrides detected`
        : options.mixedEmpty || 'Live record with local overrides';
    }
    if (source === 'local') {
      return value
        ? `${options.localPrefix || 'Stored locally · updated'} ${String(value)}`
        : options.localEmpty || 'Stored only in this browser';
    }
    return value
      ? `${options.mockPrefix || 'Prototype data · updated'} ${String(value)}`
      : options.mockEmpty || 'Prototype dataset · no backend freshness';
  }

  function modeCopy(record: unknown, entity: string, options: FleetEntityDetailModeOptions): FleetEntityDetailModeCopy {
    if (backendManaged(record, entity)) {
      return {
        title: options.backendTitle,
        message: options.backendMessage,
        tone: options.backendTone || 'warning'
      };
    }
    if (archived(options.status, options.archivedStatuses)) {
      return {
        title: options.archivedTitle,
        message: options.archivedMessage,
        tone: options.archivedTone || 'warning'
      };
    }
    return {
      title: options.localTitle || 'Local prototype editing',
      message: options.localMessage || 'Changes are stored only in this browser. No backend request is sent.',
      tone: options.localTone || 'info'
    };
  }

  function confirmDiscard(hasUnsavedChanges: boolean, message: string): boolean {
    return !hasUnsavedChanges || window.confirm(message);
  }

  function bindBeforeUnload(key: string, hasUnsavedChanges: () => boolean): void {
    beforeUnloadGuards.set(key, hasUnsavedChanges);
    if (beforeUnloadBound) return;
    window.addEventListener('beforeunload', event => {
      if (![...beforeUnloadGuards.values()].some(check => check())) return;
      event.preventDefault();
      event.returnValue = '';
    });
    beforeUnloadBound = true;
  }

  function unbindBeforeUnload(key: string): void {
    beforeUnloadGuards.delete(key);
  }

  function setFeedback(options: FleetEntityFeedbackOptions): void {
    const panel = document.getElementById(options.id);
    if (!panel) return;
    const safe = options.escape || escape;
    panel.className = `${options.className} ${options.tone}`;
    panel.innerHTML = `<strong>${safe(options.title)}</strong><small>${safe(options.message)}</small>`;
    panel.hidden = false;
    if (options.focus) panel.focus({ preventScroll: true });
  }

  function clearFeedback(id: string, className: string): void {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.hidden = true;
    panel.innerHTML = '';
    panel.className = className;
  }

  function sectionMode(options: FleetEntitySectionModeOptions): string {
    if (options.editable) return options.editLabel || 'Local edit draft';
    if (options.backendManaged) return options.backendLabel || 'Backend read-only';
    if (options.archived) return options.archivedLabel || 'Archived read-only';
    if (options.sectionEditable) return options.viewLabel || 'View mode';
    return options.readonlyLabel || 'Read-only section';
  }

  return {
    archived,
    backendManaged,
    bindBeforeUnload,
    clearFeedback,
    confirmDiscard,
    escape,
    firstValue,
    freshness,
    modeCopy,
    origin,
    sectionMode,
    setFeedback,
    unbindBeforeUnload
  };
})();
