(() => {
  type RuntimeTimer = number;
  type RuntimeSnapshot = {
    timers: number;
    frames: number;
    idles: number;
    cleanups: number;
    longTasks: number;
    longTaskDurationMs: number;
  };

  const timers = new Map<string, RuntimeTimer>();
  const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (handle: number) => void };
  const frames = new Map<string, number>();
  const idles = new Map<string, number>();
  const cleanups = new Map<string, () => void>();
  let disposed = false;
  let longTasks = 0;
  let longTaskDurationMs = 0;
  let performanceObserver: PerformanceObserver | null = null;

  function cancelTimer(key: string): void {
    const handle = timers.get(key);
    if (handle !== undefined) window.clearTimeout(handle);
    timers.delete(key);
  }

  function debounce(key: string, callback: () => void, delayMs = 220): void {
    if (disposed) return;
    cancelTimer(key);
    const handle = window.setTimeout(() => {
      timers.delete(key);
      if (!disposed) callback();
    }, Math.max(0, delayMs));
    timers.set(key, handle);
  }

  function frame(key: string, callback: () => void): void {
    if (disposed) return;
    const previous = frames.get(key);
    if (previous !== undefined) cancelAnimationFrame(previous);
    const handle = requestAnimationFrame(() => {
      frames.delete(key);
      if (!disposed) callback();
    });
    frames.set(key, handle);
  }

  function idle(key: string, callback: () => void, timeout = 800): void {
    if (disposed) return;
    const previous = idles.get(key);
    if (previous !== undefined) {
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(previous);
      else window.clearTimeout(previous);
    }
    const run = (): void => {
      idles.delete(key);
      if (!disposed) callback();
    };
    const handle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(run, { timeout })
      : window.setTimeout(run, Math.min(timeout, 120));
    idles.set(key, handle);
  }

  function registerCleanup(key: string, cleanup: () => void): void {
    const previous = cleanups.get(key);
    if (previous && previous !== cleanup) {
      try { previous(); } catch (_error) { /* best effort */ }
    }
    cleanups.set(key, cleanup);
  }

  function unregisterCleanup(key: string): void {
    cleanups.delete(key);
  }

  function identitySelector(element: HTMLElement): string | null {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const names = ['data-id', 'data-client', 'data-tab', 'data-action', 'data-registry-page', 'name'];
    for (const name of names) {
      const value = element.getAttribute(name);
      if (value) return `[${name}="${CSS.escape(value)}"]`;
    }
    return null;
  }

  function replaceHtml(container: HTMLElement, html: string): void {
    const active = document.activeElement instanceof HTMLElement && container.contains(document.activeElement)
      ? document.activeElement
      : null;
    const focusSelector = active ? identitySelector(active) : null;
    const selection = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? { start: active.selectionStart, end: active.selectionEnd }
      : null;
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const expanded = Array.from(container.querySelectorAll<HTMLElement>('[aria-expanded="true"], .open'))
      .map(identitySelector)
      .filter((value): value is string => Boolean(value));

    container.innerHTML = html;
    frame(`restore:${container.id || container.dataset.runtimeKey || 'container'}`, () => {
      container.scrollTop = scrollTop;
      container.scrollLeft = scrollLeft;
      expanded.forEach(selector => {
        const element = container.querySelector<HTMLElement>(selector);
        if (!element) return;
        element.classList.add('open');
        if (element.hasAttribute('aria-expanded')) element.setAttribute('aria-expanded', 'true');
      });
      if (!focusSelector) return;
      const next = container.querySelector<HTMLElement>(focusSelector);
      if (!next) return;
      next.focus({ preventScroll: true });
      if (selection && (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement)) {
        next.setSelectionRange(selection.start, selection.end);
      }
    });
  }

  function guardRapidActions(): void {
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!target || target.disabled || target.dataset.fleetRapidGuard === 'off') return;
      if (target.type !== 'submit' && !target.hasAttribute('data-fleet-single-action') && !target.hasAttribute('data-detail-lazy-retry')) return;
      if (target.dataset.fleetRapidLock === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      target.dataset.fleetRapidLock = 'true';
      queueMicrotask(() => {
        target.setAttribute('aria-disabled', 'true');
        debounce(`rapid:${target.id || target.name || target.textContent || 'button'}`, () => {
          if (!target.isConnected) return;
          delete target.dataset.fleetRapidLock;
          target.removeAttribute('aria-disabled');
        }, 700);
      });
    }, true);
  }

  function observeLongTasks(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      performanceObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          longTasks += 1;
          longTaskDurationMs += entry.duration;
        });
      });
      performanceObserver.observe({ entryTypes: ['longtask'] });
    } catch (_error) {
      performanceObserver = null;
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    timers.forEach(handle => window.clearTimeout(handle));
    frames.forEach(handle => cancelAnimationFrame(handle));
    idles.forEach(handle => {
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    });
    timers.clear();
    frames.clear();
    idles.clear();
    cleanups.forEach(cleanup => {
      try { cleanup(); } catch (_error) { /* best effort */ }
    });
    cleanups.clear();
    performanceObserver?.disconnect();
    performanceObserver = null;
  }

  function snapshot(): RuntimeSnapshot {
    return {
      timers: timers.size,
      frames: frames.size,
      idles: idles.size,
      cleanups: cleanups.size,
      longTasks,
      longTaskDurationMs: Math.round(longTaskDurationMs)
    };
  }

  guardRapidActions();
  observeLongTasks();
  window.addEventListener('pagehide', dispose, { once: true });

  const api = { debounce, frame, idle, replaceHtml, registerCleanup, unregisterCleanup, dispose, snapshot };
  window.FleetRuntimeStability = api;
})();
