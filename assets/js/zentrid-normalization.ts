/* Zentrid frontend normalization contract
   This file documents the canonical UI language used by the prototype.
   Source of truth JSON files live in assets/data/.
*/
window.ZentridNormalization = {
  terms: {
    plant: 'Plant',
    device: 'Device',
    alert: 'Alert',
    event: 'Event',
    telemetry: 'Telemetry',
    tenant: 'Tenant',
    connector: 'Connector'
  },
  forbiddenUiSynonyms: {
    Plant: ['Site', 'Station'],
    Device: ['Asset', 'Equipment'],
    Alert: ['Alarm'],
    TemperatureUnit: ['°F', 'Fahrenheit']
  },
  normalizedUnits: {
    temperature: '°C',
    power: 'kW',
    energy: 'kWh',
    voltage: 'V',
    current: 'A',
    frequency: 'Hz',
    percent: '%'
  },
  valueDomains: {
    country: 'ISO country codes are rendered as canonical English country names.',
    clientType: 'Commercial/corporate/company aliases are rendered as Legal Entity; person aliases as Individual.',
    tenantType: 'Owner, Operator, Investor, EPC, O&M and Utility are kept separate from legal entity type.',
    provider: 'Vendor platform names are reduced to one provider family for filters and relations.',
    plantStatus: 'Online/active/healthy aliases are rendered as Normal; degraded and failure states remain distinct.',
    deviceStatus: 'Connected/healthy aliases are rendered as Online; warning, fault and offline states remain distinct.',
    alertStatus: 'Raised/active aliases are rendered as Open; acknowledgement, escalation and resolution are canonical.',
    alertSeverity: 'Vendor priorities and severity levels are rendered as Critical, High, Warning or Info.'
  },
  dictionaries: {
    fields: 'assets/data/Zentrid_UI_Field_Dictionary_v1.json',
    screens: 'assets/data/Zentrid_UI_Screens_v1.json',
    alerts: 'assets/data/Zentrid_Canonical_Alerts_UI_Ready_v1.json',
    alertIntegration: 'assets/data/Zentrid_UI_Alert_Integration_v1.json'
  }
};
