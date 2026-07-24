(() => {
  try {
    // Client Detail is mounted only after the selected backend record has been loaded.
    window.__zentridDisableLiveDetailCore = false;
    document.body.dataset.detailMounted = 'client';
  } catch (error) {
    console.error('Tenant Admin Client Detail bootstrap failed.', error);
    FleetLayout.mount(`<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Client Detail</p><h1>Client detail unavailable</h1><p class="muted">The API-driven client workspace could not be initialized.</p></div><button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('clients')">Back to Clients</button></section>`);
  }
})();
