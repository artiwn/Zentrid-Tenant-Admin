(() => {
  try {
    // Device Detail is mounted only after the selected backend record has been loaded.
    document.body.dataset.detailMounted = 'device';
  } catch (error) {
    console.error('Tenant Admin Device Detail bootstrap failed.', error);
    FleetLayout.mount(renderDeviceDetailUnavailable('The API-driven device workspace could not be initialized.'));
  }
})();
