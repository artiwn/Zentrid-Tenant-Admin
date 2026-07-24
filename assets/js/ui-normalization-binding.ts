(function(){
  type ZentridUnknownRecord = Record<string, unknown>;
  type ZentridFieldContract = ZentridUnknownRecord & {
    field_key?: string;
    ui_key?: string;
    canonical_field?: string;
    ui_label?: string;
    entity?: string;
    data_type?: string;
    unit?: string;
    required_level?: string;
    section_id?: string;
    section_name?: string;
    section_domain?: string;
    source_file?: string;
    domain?: string;
  };
  type ZentridScreenSection = ZentridUnknownRecord & {
    section_id?: string;
    section_name?: string;
    domain?: string;
    fields?: ZentridFieldContract[];
  };
  type ZentridScreenContract = ZentridUnknownRecord & {
    screen_id?: string;
    sections?: ZentridScreenSection[];
  };
  type ZentridFieldDictionary = { fields?: ZentridFieldContract[] };
  /**
   * Zentrid UI normalization binding (silent runtime mode)
   *
   * Purpose:
   * - Keep UI labels/fields internally connected to Zentrid_UI_Screens_v1.json
   *   and Zentrid_UI_Field_Dictionary_v1.json.
   * - Do NOT render developer contract tables on business screens.
   * - Add non-visual data attributes where existing DOM labels/columns match
   *   canonical UI labels, field keys or ui keys.
   * - Expose window.ZentridUiContract for debug/testing only.
   */
  const pageToScreens: Record<string, string[]> = {
    'plants.html': ['plant_list'],
    'plant-detail.html': ['plant_detail'],
    'devices.html': ['device_list'],
    'device-detail.html': [
      'inverter_detail',
      'battery_detail',
      'logger_dongle_detail',
      'meter_epm',
      'module',
      'weather_station',
      'ev_charger'
    ],
    'alerts.html': ['alarm_list'],
    'alert-detail.html': ['alarm_detail'],
    'telemetry.html': ['telemetry', 'historical_data'],
    'energy-analytics.html': ['energy_flow'],
    'settings.html': ['device_configuration'],
    'users.html': ['authorization']
  };

  const dataBase = location.pathname.includes('/pages/') ? '../assets/data/' : 'assets/data/';
  const normalize = (value: unknown): string => String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[：:]+$/g, '')
    .trim()
    .toLowerCase();

  async function loadJson<T>(name: string): Promise<T>{
    const response = await fetch(dataBase + name, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${name} load failed`);
    return response.json() as Promise<T>;
  }

  function flattenFields(screen: ZentridScreenContract): ZentridFieldContract[]{
    const fields: ZentridFieldContract[] = [];
    (screen.sections || []).forEach((section: ZentridScreenSection) => {
      (section.fields || []).forEach((field: ZentridFieldContract) => {
        fields.push({
          ...field,
          ...(section.section_id !== undefined ? { section_id: section.section_id } : {}),
          ...(section.section_name !== undefined ? { section_name: section.section_name } : {}),
          section_domain: section.domain || field.domain || ''
        });
      });
    });
    return fields;
  }

  function resolveScreenIds(): string[]{
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const fromBody = document.body.getAttribute('data-zentrid-screen-id');
    if (fromBody) return fromBody.split(',').map(x => x.trim()).filter(Boolean);
    return pageToScreens[filename] || [];
  }

  function buildLookup(fields: ZentridFieldContract[], dictionary: ZentridFieldDictionary): Map<string, ZentridFieldContract>{
    const dictionaryByKey = new Map<string, ZentridFieldContract>((dictionary.fields || []).map((item: ZentridFieldContract) => [String(item.field_key || ''), item]));
    const lookup = new Map<string, ZentridFieldContract>();

    fields.forEach((field: ZentridFieldContract) => {
      const dict = dictionaryByKey.get(String(field.field_key || '')) || {};
      const fieldKey = field.field_key;
      const canonicalField = field.canonical_field || dict.canonical_field || fieldKey;
      const uiLabel = field.ui_label || dict.ui_label || fieldKey;
      const payload: ZentridFieldContract = {
        ...(fieldKey !== undefined ? { field_key: fieldKey } : {}),
        ui_key: field.ui_key || dict.ui_key || '',
        ...(canonicalField !== undefined ? { canonical_field: canonicalField } : {}),
        ...(uiLabel !== undefined ? { ui_label: uiLabel } : {}),
        entity: field.entity || dict.entity || '',
        data_type: field.data_type || dict.data_type || '',
        unit: field.unit || dict.unit || '',
        required_level: field.required_level || dict.required_level || '',
        section_id: field.section_id || '',
        section_name: field.section_name || '',
        source_file: field.source_file || dict.source_file || ''
      };

      [payload.ui_label, payload.field_key, payload.ui_key, payload.canonical_field]
        .filter((key): key is string => Boolean(key))
        .forEach((key) => {
          const normalized = normalize(key);
          if (!normalized) return;
          if (!lookup.has(normalized)) lookup.set(normalized, payload);
        });
    });

    return lookup;
  }

  function isCandidateElement(element: Element): boolean{
    if (!element || element.nodeType !== 1) return false;
    if (element.closest('#zentridJsonUiContracts')) return false;
    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'svg', 'path', 'main', 'section', 'article', 'div', 'body', 'html'].includes(tag)) return false;
    const text = normalize(element.textContent);
    return text.length > 0 && text.length <= 80;
  }

  function bindElement(element: HTMLElement, field: ZentridFieldContract): void{
    element.dataset.fieldKey = field.field_key || '';
    element.dataset.uiKey = field.ui_key || '';
    element.dataset.canonicalField = field.canonical_field || field.field_key || '';
    element.dataset.zentridBound = 'true';
    element.dataset.zentridEntity = field.entity || '';
    element.dataset.zentridSection = field.section_id || '';
  }

  function bindVisibleDom(lookup: Map<string, ZentridFieldContract>): number{
    const candidates = Array.from(document.querySelectorAll('label, th, dt, dd, span, small, strong, b, p, button, a, option, h1, h2, h3, h4'))
      .filter(isCandidateElement) as HTMLElement[];
    let boundCount = 0;

    candidates.forEach(element => {
      const text = normalize(element.textContent);
      const field = lookup.get(text);
      if (!field) return;
      bindElement(element, field);
      boundCount += 1;
    });

    return boundCount;
  }

  async function mountSilentBinding(){
    try {
      const screenIds = resolveScreenIds();
      if (!screenIds.length) return;

      const [screensJson, fieldDictionary] = await Promise.all([
        loadJson<{ screens?: ZentridScreenContract[] }>('Zentrid_UI_Screens_v1.json'),
        loadJson<ZentridFieldDictionary>('Zentrid_UI_Field_Dictionary_v1.json')
      ]);

      const screenMap = new Map<string, ZentridScreenContract>((screensJson.screens || []).map((screen: ZentridScreenContract) => [String(screen.screen_id || ''), screen]));
      const screens = screenIds.map((id: string) => screenMap.get(id)).filter(Boolean) as ZentridScreenContract[];
      const expectedFields = screens.flatMap(flattenFields);
      const lookup = buildLookup(expectedFields, fieldDictionary);
      const boundElements = bindVisibleDom(lookup);

      document.body.dataset.zentridScreenIds = screenIds.join(',');
      document.body.dataset.zentridUiContractMode = 'silent';

      window.ZentridUiContract = {
        mode: 'silent',
        screenIds,
        expectedFieldCount: expectedFields.length,
        boundElementCount: boundElements,
        fields: expectedFields.map((field: ZentridFieldContract) => ({
          field_key: field.field_key,
          ui_key: field.ui_key,
          canonical_field: field.canonical_field,
          ui_label: field.ui_label,
          entity: field.entity,
          required_level: field.required_level,
          section_id: field.section_id,
          section_name: field.section_name
        }))
      };
    } catch (error) {
      console.warn('Zentrid silent UI binding skipped:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(mountSilentBinding, 0));
  } else {
    setTimeout(mountSilentBinding, 0);
  }
})();
