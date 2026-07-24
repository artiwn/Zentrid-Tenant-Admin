(() => {
  try {
    // Plant Detail is mounted only after the selected backend record has been loaded.
    window.__zentridDisableLiveDetailCore = false;
    document.body.dataset.detailMounted = 'plant';
  } catch (error) {
    console.error('Tenant Admin Plant Detail bootstrap failed.', error);
    FleetLayout.mount(`<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Plant Detail</p><h1>Plant detail unavailable</h1><p class="muted">The API-driven plant workspace could not be initialized.</p></div><button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('plants')">Back to Plants</button></section>`);
  }
})();
