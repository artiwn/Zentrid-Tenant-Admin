export {};

declare const FleetLocalStore: FleetLocalStoreApi;
declare const FleetLayout: FleetLayoutLegacyApi;

interface FleetClientRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  legalForm: string;
  registrationNo: string;
  taxId: string;
  country: string;
  city: string;
  address: string;
  status: string;
  verification: string;
  account: string;
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
  tenant: string;
  plants: string[];
  plantCount?: number;
  deviceCount?: number;
  totalCapacity?: string;
  vendorDisplayName?: string;
  registeredName?: string;
  users: number;
  documents: number;
  billing: string;
  supportTier: string;
  accessScope: string;
  exportPolicy: string;
  assignmentRole: string;
  onboarding: string;
  region?: string;
  portalUsername?: string;
  bankAccounts?: FleetBankAccount[];
  consentAccepted?: boolean;
  activationAt?: string;
  username?: string;
  language?: string;
  timezone?: string;
  temperature?: string;
  currency?: string;
  irradiation?: string;
  phone2?: string;
  dob?: string;
  updated?: string;
  lastSyncAt?: string;
  raw?: Record<string, unknown>;
  documentRecords?: FleetClientDocumentRecord[];
  portalUsers?: FleetPortalUser[];
  [key: string]: unknown;
}

interface FleetPlantRecord {
  id: string;
  code: string;
  externalId: string;
  name: string;
  clientId: string;
  tenantId?: string;
  portfolio: string;
  status: string;
  type: string;
  country: string;
  region: string;
  city: string;
  address: string;
  timezone: string;
  capacityDc: string;
  capacityAc: string;
  gridCapacity: string;
  commissioning: string;
  owner: string;
  operator: string;
  om: string;
  powerNow: string;
  energyToday: string;
  alerts: number;
  health: string;
  panels: number;
  inverters: number;
  strings: number;
  transformers: number;
  meters: number;
  battery: string;
  devices: string[];
  dataOrigin?: FleetDataOrigin;
  updated?: string;
  lastSyncAt?: string;
  sourceSystem?: string;
  integration?: string;
  latitude?: string;
  longitude?: string;
  raw?: Record<string, unknown>;
  relatedAlerts?: Record<string, unknown>[];
  [key: string]: unknown;
}

interface FleetDeviceRecord {
  id: string;
  plantId: string;
  type: string;
  name: string;
  vendor: string;
  model: string;
  serial: string;
  capacity: string;
  firmware: string;
  status: string;
  location: string;
  lastSeen: string;
  children: string;
  manufacturer?: string;
  tenant?: string;
  plant?: string;
  integration?: string;
  sourceStatus?: string;
  [key: string]: unknown;
}

interface FleetDeviceCatalogItem {
  kind: string;
  vendor: string;
  model: string;
  rating: string;
  protocol: string;
  shared?: string;
  individual?: string;
  qty?: number;
}

interface FleetClientDocumentRecord {
  id?: string;
  name: string;
  type: string;
  status: string;
  expiry?: string;
  fileName?: string;
  filePath?: string;
  uploaded?: boolean;
  localFile?: File;
}

interface FleetBankAccount {
  id?: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountCurrency: string;
  primary: boolean;
  bank?: string;
  account?: string;
  currency?: string;
}

interface FleetPortalUser {
  name: string;
  email: string;
  role: string;
  scope: string;
  modules: string;
  status: string;
  lastLogin: string;
  mfa: string;
}

type ClientForm = HTMLFormElement;
type AnyInput = HTMLInputElement & HTMLSelectElement;

const asInput = (el: Element | null): AnyInput | null => el as AnyInput | null;
const formValue = (value: FormDataEntryValue | null | undefined): string => (value || '').toString();
const eventElement = (event: Event): HTMLElement => event.target as HTMLElement;

const FleetClientModel = (() => {
  const clients: FleetClientRecord[] = [
    {
      id: 'CL-00041', code: 'CLI-ARPI', name: 'Arpi Solar Group', type: 'Legal Entity', legalForm: 'LLC', registrationNo: 'AM-REG-204419', taxId: 'TIN-00421190', country: 'Armenia', city: 'Yerevan', address: 'Baghramyan Ave 12, Yerevan', status: 'Active', verification: 'Verified', account: 'Mariam Sargsyan', primaryContact: 'Aram Petrosyan', contactEmail: 'aram.petrosyan@arpi.example', contactPhone: '+374 10 555 201', tenant: 'Tenant Alpha Energy', plants: ['PL-ARM-001', 'PL-ARM-002', 'PL-ARM-003'], users: 42, documents: 18, billing: 'Enterprise · Net 30', supportTier: 'Premium SLA', accessScope: 'All assigned plants · Read-only owner portal', exportPolicy: 'Reports export allowed after tenant approval', assignmentRole: 'Owner', onboarding: 'Completed'
    },
    {
      id: 'CL-00042', code: 'CLI-VALLEY', name: 'Valley Solar Holdings', type: 'Legal Entity', legalForm: 'Corporation', registrationNo: 'US-CA-778401', taxId: 'EIN-88-2041941', country: 'United States', city: 'San Diego', address: '750 Harbor Drive, San Diego, CA', status: 'Active', verification: 'Verified', account: 'Daniel Weber', primaryContact: 'Olivia Chen', contactEmail: 'ops@valleysolar.example', contactPhone: '+1 619 555 0148', tenant: 'Tenant North Operations', plants: ['PL-US-011', 'PL-US-012'], users: 38, documents: 11, billing: 'Professional · Net 15', supportTier: 'Standard SLA', accessScope: 'California portfolio · Finance + Reports', exportPolicy: 'Self-service monthly reports', assignmentRole: 'Owner / Investor', onboarding: 'Completed'
    },
    {
      id: 'CL-00043', code: 'CLI-GAMMA', name: 'Gamma Grid Holdings', type: 'Legal Entity', legalForm: 'Holding Company', registrationNo: 'US-TX-120984', taxId: 'EIN-74-9102231', country: 'United States', city: 'Austin', address: '210 Battery Road, Austin, TX', status: 'Review', verification: 'KYC Review', account: 'Laura Garcia', primaryContact: 'Michael Stone', contactEmail: 'm.stone@gammagrid.example', contactPhone: '+1 512 555 0192', tenant: 'GridOps Partner', plants: ['PL-US-021'], users: 29, documents: 9, billing: 'Custom · Manual Review', supportTier: 'Custom SLA', accessScope: 'Storage hub only · Viewer mode', exportPolicy: 'Manual approval required', assignmentRole: 'Investor Client', onboarding: 'Commercial review'
    },
    {
      id: 'CL-00044', code: 'CLI-ANNA', name: 'Anna Hakobyan', type: 'Individual', legalForm: 'Private Person', registrationNo: 'PSP-AM-448219', taxId: 'Personal ID 0109840123', country: 'Armenia', city: 'Gyumri', address: 'Shirak Region, Gyumri', status: 'Pending', verification: 'Identity Pending', account: 'Mariam Sargsyan', primaryContact: 'Anna Hakobyan', contactEmail: 'anna.hakobyan@example.com', contactPhone: '+374 91 555 771', tenant: 'Tenant Alpha Energy', plants: [], users: 1, documents: 4, billing: 'Owner Portal · Prepaid', supportTier: 'Basic SLA', accessScope: 'No active plant assigned yet', exportPolicy: 'Disabled until verification', assignmentRole: 'Future Owner', onboarding: 'Identity verification'
    }
  ];

  try {
    const savedClients = (window.FleetLocalStore ? FleetLocalStore.read(FleetLocalStore.KEYS.clients, []) : JSON.parse(localStorage.getItem('zentrid_custom_clients') || '[]')) as FleetClientRecord[];
    savedClients.forEach(client => {
      if (!client || !client.id) return;
      const existingIndex = clients.findIndex(item => item.id === client.id);
      if (existingIndex >= 0) clients[existingIndex] = { ...clients[existingIndex]!, ...client };
      else clients.push(client);
    });
  } catch (e) {
    console.warn('Unable to restore custom clients', e);
  }

  const plants: FleetPlantRecord[] = [
    {
      id: 'PL-ARM-001', code: 'ARM-SOL-001', externalId: 'HUA-PLANT-991', name: 'Arpi Plant 01', clientId: 'CL-00041', portfolio: 'Armenia Utility Portfolio', status: 'Active', type: 'Utility Scale', country: 'Armenia', region: 'Kotayk', city: 'Abovyan', address: 'North field, Sector A', timezone: 'Asia/Yerevan', capacityDc: '5.40 MWp', capacityAc: '4.80 MW', gridCapacity: '5.0 MW', commissioning: '2024-09-18', owner: 'Arpi Solar Group', operator: 'Tenant Alpha Energy', om: 'Unisys Energy O&M', powerNow: '3.82 MW', energyToday: '24.6 MWh', alerts: 2, health: 'Warning', panels: 9820, inverters: 18, strings: 216, transformers: 2, meters: 4, battery: 'No', devices: ['INV-ARM-001','INV-ARM-002','INV-ARM-003','LOG-ARM-001','MTR-ARM-001','WX-ARM-001','TR-ARM-001','SW-ARM-001']
    },
    {
      id: 'PL-ARM-002', code: 'ARM-SOL-002', externalId: 'HUA-PLANT-992', name: 'Arpi Plant 02', clientId: 'CL-00041', portfolio: 'Armenia Utility Portfolio', status: 'Active', type: 'Commercial', country: 'Armenia', region: 'Armavir', city: 'Vagharshapat', address: 'Industrial park, Block 7', timezone: 'Asia/Yerevan', capacityDc: '2.10 MWp', capacityAc: '1.95 MW', gridCapacity: '2.0 MW', commissioning: '2025-03-02', owner: 'Arpi Solar Group', operator: 'Tenant Alpha Energy', om: 'Unisys Energy O&M', powerNow: '1.36 MW', energyToday: '9.1 MWh', alerts: 0, health: 'Normal', panels: 3860, inverters: 8, strings: 92, transformers: 1, meters: 2, battery: 'Yes', devices: ['INV-ARM-021','LOG-ARM-021','BESS-ARM-001','MTR-ARM-021','WX-ARM-021','TR-ARM-021','SW-ARM-021']
    },
    {
      id: 'PL-ARM-003', code: 'ARM-BESS-003', externalId: 'SUN-PLANT-410', name: 'Arpi Hybrid Storage Plant', clientId: 'CL-00041', portfolio: 'Hybrid Storage Portfolio', status: 'Maintenance', type: 'Industrial', country: 'Armenia', region: 'Yerevan', city: 'Yerevan', address: 'Energy storage yard 3', timezone: 'Asia/Yerevan', capacityDc: '1.60 MWp', capacityAc: '1.40 MW', gridCapacity: '1.5 MW', commissioning: '2025-11-22', owner: 'Arpi Solar Group', operator: 'Tenant Alpha Energy', om: 'BESS Service Team', powerNow: '0.72 MW', energyToday: '4.8 MWh', alerts: 4, health: 'Fault', panels: 2880, inverters: 5, strings: 54, transformers: 1, meters: 3, battery: 'Yes', devices: ['INV-ARM-031','LOG-ARM-031','BESS-ARM-031','PCS-ARM-031','MTR-ARM-031','TR-ARM-031','SW-ARM-031']
    },
    {
      id: 'PL-US-011', code: 'CA-SOL-011', externalId: 'SE-FAC-011', name: 'North Valley Solar 11', clientId: 'CL-00042', portfolio: 'California O&M Portfolio', status: 'Active', type: 'Utility Scale', country: 'United States', region: 'California', city: 'Fresno', address: 'Valley road 114', timezone: 'America/Los_Angeles', capacityDc: '8.20 MWp', capacityAc: '7.60 MW', gridCapacity: '8.0 MW', commissioning: '2023-06-17', owner: 'Valley Solar Holdings', operator: 'Tenant North Operations', om: 'Tenant North Operations', powerNow: '6.41 MW', energyToday: '41.2 MWh', alerts: 1, health: 'Normal', panels: 14800, inverters: 22, strings: 310, transformers: 3, meters: 5, battery: 'No', devices: ['INV-US-011','INV-US-012','LOG-US-011','MTR-US-011','WX-US-011','TR-US-011','SW-US-011']
    },
    {
      id: 'PL-US-012', code: 'CA-SOL-012', externalId: 'SE-FAC-012', name: 'North Valley Solar 12', clientId: 'CL-00042', portfolio: 'California O&M Portfolio', status: 'Active', type: 'Commercial', country: 'United States', region: 'California', city: 'Bakersfield', address: 'Grid extension zone B', timezone: 'America/Los_Angeles', capacityDc: '3.70 MWp', capacityAc: '3.20 MW', gridCapacity: '3.5 MW', commissioning: '2024-01-30', owner: 'Valley Solar Holdings', operator: 'Tenant North Operations', om: 'Tenant North Operations', powerNow: '2.45 MW', energyToday: '16.7 MWh', alerts: 0, health: 'Normal', panels: 6840, inverters: 12, strings: 136, transformers: 1, meters: 2, battery: 'No', devices: ['INV-US-021','LOG-US-021','MTR-US-021','WX-US-021','TR-US-021','SW-US-021']
    },
    {
      id: 'PL-US-021', code: 'TX-BESS-021', externalId: 'TES-BESS-021', name: 'Gamma Storage & Solar Hub', clientId: 'CL-00043', portfolio: 'Texas Investor Portfolio', status: 'Review', type: 'Industrial', country: 'United States', region: 'Texas', city: 'Austin', address: 'Battery road 210', timezone: 'America/Chicago', capacityDc: '4.30 MWp', capacityAc: '4.00 MW', gridCapacity: '4.2 MW', commissioning: '2025-08-11', owner: 'Gamma Grid Holdings', operator: 'GridOps Partner', om: 'External O&M', powerNow: '2.20 MW', energyToday: '12.4 MWh', alerts: 5, health: 'Warning', panels: 7900, inverters: 14, strings: 168, transformers: 2, meters: 4, battery: 'Yes', devices: ['INV-US-101','LOG-US-101','BESS-US-101','PCS-US-101','MTR-US-101','WX-US-101','TR-US-101','SW-US-101']
    }
  ];

  const devices: FleetDeviceRecord[] = [
    { id:'INV-ARM-001', plantId:'PL-ARM-001', type:'Inverter', name:'Inverter 01', vendor:'Huawei', model:'SUN2000-215KTL', serial:'HUA-INV-0001', capacity:'215 kW', firmware:'V500R023', status:'Active', location:'Area A', lastSeen:'2 min ago', children:'MPPT 1–12 · Strings 1–12' },
    { id:'INV-ARM-002', plantId:'PL-ARM-001', type:'Inverter', name:'Inverter 02', vendor:'Huawei', model:'SUN2000-215KTL', serial:'HUA-INV-0002', capacity:'215 kW', firmware:'V500R023', status:'Active', location:'Area A', lastSeen:'2 min ago', children:'MPPT 1–12 · Strings 13–24' },
    { id:'INV-ARM-003', plantId:'PL-ARM-001', type:'Inverter', name:'Inverter 03', vendor:'Huawei', model:'SUN2000-215KTL', serial:'HUA-INV-0003', capacity:'215 kW', firmware:'V500R021', status:'Warning', location:'Area B', lastSeen:'18 min ago', children:'MPPT 1–12 · Strings 25–36' },
    { id:'MTR-ARM-001', plantId:'PL-ARM-001', type:'Meter', name:'Main Export Meter', vendor:'Janitza', model:'UMG 604', serial:'MTR-9120', capacity:'Bidirectional', firmware:'2.4.1', status:'Active', location:'Grid connection', lastSeen:'1 min ago', children:'Import / Export point' },
    { id:'WX-ARM-001', plantId:'PL-ARM-001', type:'Weather Station', name:'Weather Station A', vendor:'Kipp & Zonen', model:'RT1', serial:'WX-1103', capacity:'Irradiance / Temp', firmware:'1.9', status:'Active', location:'North roof', lastSeen:'3 min ago', children:'Irradiance · Ambient temp · Module temp' },
    { id:'LOG-ARM-001', plantId:'PL-ARM-001', type:'Logger', name:'Gateway Logger A', vendor:'Huawei', model:'SmartLogger3000A', serial:'LOG-ARM-001', capacity:'64 linked devices', firmware:'V300R023', status:'Active', location:'Control room', lastSeen:'1 min ago', children:'Inverters 01–18 · Meter · Weather plant' },
    { id:'TR-ARM-001', plantId:'PL-ARM-001', type:'Grid Device', name:'Transformer 01', vendor:'ABB', model:'2.5 MVA', serial:'TR-2109', capacity:'2.5 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-ARM-001', plantId:'PL-ARM-001', type:'Switchgear', name:'MV Switchgear 01', vendor:'Schneider', model:'SM6-24', serial:'SW-ARM-001', capacity:'24 kV · 1250 A', firmware:'Relay 7.2', status:'Active', location:'Subplant', lastSeen:'2 min ago', children:'Breaker · Feeders · Protection relay' },
    { id:'INV-ARM-021', plantId:'PL-ARM-002', type:'Inverter', name:'Inverter 21', vendor:'Huawei', model:'SUN2000-125KTL', serial:'HUA-INV-0021', capacity:'125 kW', firmware:'V500R023', status:'Active', location:'Area A', lastSeen:'2 min ago', children:'MPPT 1–10 · Strings 1–10' },
    { id:'BESS-ARM-001', plantId:'PL-ARM-002', type:'Battery', name:'Battery Container 01', vendor:'CATL', model:'LFP Rack 500', serial:'BESS-ARM-001', capacity:'500 kWh', firmware:'BMS 3.2', status:'Active', location:'Battery yard', lastSeen:'1 min ago', children:'Rack 1–4 · BMS · HVAC' },
    { id:'MTR-ARM-021', plantId:'PL-ARM-002', type:'Meter', name:'Bidirectional Meter 21', vendor:'Schneider', model:'PM8000', serial:'MTR-ARM-021', capacity:'Bidirectional', firmware:'4.1', status:'Active', location:'Grid cabinet', lastSeen:'1 min ago', children:'Import / Export point' },
    { id:'WX-ARM-021', plantId:'PL-ARM-002', type:'Weather Station', name:'Weather Station 21', vendor:'SMA', model:'Sunny SensorBox', serial:'WX-ARM-021', capacity:'Irradiance / Temp / Wind', firmware:'1.2', status:'Active', location:'Plant mast', lastSeen:'4 min ago', children:'Weather sensors' },
    { id:'LOG-ARM-021', plantId:'PL-ARM-002', type:'Logger', name:'Hybrid Gateway 21', vendor:'SMA', model:'Data Manager M', serial:'LOG-ARM-021', capacity:'32 linked devices', firmware:'2.13', status:'Active', location:'Grid cabinet', lastSeen:'2 min ago', children:'Inverter 21 · BESS · Meter · Weather' },
    { id:'TR-ARM-021', plantId:'PL-ARM-002', type:'Grid Device', name:'Transformer 21', vendor:'Siemens', model:'1.6 MVA', serial:'TR-ARM-021', capacity:'1.6 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-ARM-021', plantId:'PL-ARM-002', type:'Switchgear', name:'LV Switchgear 21', vendor:'Siemens', model:'SIVACON S8', serial:'SW-ARM-021', capacity:'400 V · 1600 A', firmware:'Relay 6.8', status:'Active', location:'Grid cabinet', lastSeen:'2 min ago', children:'Breakers · Feeders · Meter link' },
    { id:'INV-ARM-031', plantId:'PL-ARM-003', type:'Inverter', name:'Hybrid Inverter 31', vendor:'Sungrow', model:'SG125CX', serial:'SG-INV-031', capacity:'125 kW', firmware:'2.18', status:'Warning', location:'Hybrid field', lastSeen:'22 min ago', children:'MPPT · Strings · PCS link' },
    { id:'BESS-ARM-031', plantId:'PL-ARM-003', type:'Battery', name:'BESS Container 31', vendor:'BYD', model:'LFP 1MWh', serial:'BESS-031', capacity:'1 MWh', firmware:'BMS 4.5', status:'Fault', location:'Storage yard', lastSeen:'35 min ago', children:'Rack 1–6 · Modules · Cells' },
    { id:'PCS-ARM-031', plantId:'PL-ARM-003', type:'PCS', name:'Power Conversion System 31', vendor:'Sungrow', model:'PCS500', serial:'PCS-031', capacity:'500 kW', firmware:'1.8', status:'Warning', location:'Storage yard', lastSeen:'20 min ago', children:'DC bus · AC output' },
    { id:'LOG-ARM-031', plantId:'PL-ARM-003', type:'Logger', name:'Storage Gateway 31', vendor:'Sungrow', model:'COM100E', serial:'LOG-ARM-031', capacity:'48 linked devices', firmware:'3.4', status:'Warning', location:'Storage control panel', lastSeen:'16 min ago', children:'Hybrid inverter · BESS · PCS · Meter' },
    { id:'INV-US-011', plantId:'PL-US-011', type:'Inverter', name:'Inverter CA-11', vendor:'SolarEdge', model:'SE100K', serial:'SE-INV-011', capacity:'100 kW', firmware:'4.17', status:'Active', location:'Block A', lastSeen:'1 min ago', children:'Strings 1–12' },
    { id:'MTR-US-011', plantId:'PL-US-011', type:'Meter', name:'Main Meter CA-11', vendor:'Itron', model:'ION8650', serial:'MTR-US-011', capacity:'Export', firmware:'3.9', status:'Active', location:'POI', lastSeen:'1 min ago', children:'Export point' },
    { id:'WX-US-011', plantId:'PL-US-011', type:'Weather Station', name:'Weather CA-11', vendor:'Campbell', model:'CR1000X', serial:'WX-US-011', capacity:'Weather package', firmware:'2.1', status:'Active', location:'Mast A', lastSeen:'2 min ago', children:'Irradiance · Wind · Humidity' },
    { id:'LOG-US-011', plantId:'PL-US-011', type:'Logger', name:'Gateway CA-11', vendor:'SolarEdge', model:'Gateway Pro', serial:'LOG-US-011', capacity:'96 linked devices', firmware:'4.22', status:'Active', location:'Network cabinet', lastSeen:'1 min ago', children:'Inverter fleet · Meters · Weather plant' },
    { id:'LOG-US-021', plantId:'PL-US-012', type:'Logger', name:'Gateway CA-12', vendor:'SolarEdge', model:'Gateway Pro', serial:'LOG-US-021', capacity:'48 linked devices', firmware:'4.22', status:'Active', location:'Control cabinet', lastSeen:'2 min ago', children:'Inverter 21 · Meter · Weather plant' },
    { id:'INV-US-101', plantId:'PL-US-021', type:'Inverter', name:'Inverter TX-101', vendor:'Tesla', model:'Solar Inverter', serial:'TES-INV-101', capacity:'150 kW', firmware:'5.0', status:'Active', location:'Solar block', lastSeen:'3 min ago', children:'MPPT · Strings' },
    { id:'BESS-US-101', plantId:'PL-US-021', type:'Battery', name:'Battery System TX-101', vendor:'Tesla', model:'Megapack', serial:'TES-BESS-101', capacity:'2 MWh', firmware:'BMS 7.1', status:'Warning', location:'Battery pad', lastSeen:'14 min ago', children:'Racks · BMS · Thermal system' },
    { id:'MTR-US-101', plantId:'PL-US-021', type:'Meter', name:'Settlement Meter TX-101', vendor:'Itron', model:'ION8650', serial:'MTR-US-101', capacity:'Bidirectional', firmware:'3.9', status:'Active', location:'POI', lastSeen:'1 min ago', children:'Settlement point' },
    { id:'LOG-US-101', plantId:'PL-US-021', type:'Logger', name:'Megapack Plant Gateway', vendor:'Tesla', model:'PowerHub Gateway', serial:'LOG-US-101', capacity:'120 linked devices', firmware:'5.7', status:'Warning', location:'Plant network room', lastSeen:'12 min ago', children:'Inverters · BESS · PCS · Settlement meter' },
    { id:'MTR-ARM-031', plantId:'PL-ARM-003', type:'Meter', name:'Storage Settlement Meter 31', vendor:'Schneider', model:'PM8000', serial:'MTR-ARM-031', capacity:'Bidirectional', firmware:'4.1', status:'Warning', location:'Storage POI', lastSeen:'18 min ago', children:'Import / Export point' },
    { id:'TR-ARM-031', plantId:'PL-ARM-003', type:'Grid Device', name:'Transformer 31', vendor:'Siemens', model:'1.6 MVA', serial:'TR-ARM-031', capacity:'1.6 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-ARM-031', plantId:'PL-ARM-003', type:'Switchgear', name:'Hybrid Switchgear 31', vendor:'ABB', model:'UniGear ZS1', serial:'SW-ARM-031', capacity:'12 kV · 1250 A', firmware:'Relay 8.1', status:'Warning', location:'Subplant', lastSeen:'18 min ago', children:'BESS feeder · PV feeder · Grid breaker' },
    { id:'INV-US-012', plantId:'PL-US-011', type:'Inverter', name:'Inverter CA-12', vendor:'SolarEdge', model:'SE100K', serial:'SE-INV-012', capacity:'100 kW', firmware:'4.17', status:'Active', location:'Block B', lastSeen:'2 min ago', children:'Strings 13–24' },
    { id:'TR-US-011', plantId:'PL-US-011', type:'Grid Device', name:'Transformer CA-11', vendor:'ABB', model:'4 MVA', serial:'TR-US-011', capacity:'4 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-US-011', plantId:'PL-US-011', type:'Switchgear', name:'MV Switchgear CA-11', vendor:'Eaton', model:'XGIS', serial:'SW-US-011', capacity:'15 kV · 1200 A', firmware:'Relay 5.9', status:'Active', location:'Subplant', lastSeen:'3 min ago', children:'Breakers · Feeders · Protection relay' },
    { id:'INV-US-021', plantId:'PL-US-012', type:'Inverter', name:'Inverter CA-21', vendor:'SolarEdge', model:'SE82.8K', serial:'SE-INV-021', capacity:'82.8 kW', firmware:'4.17', status:'Active', location:'Block A', lastSeen:'2 min ago', children:'Strings 1–12' },
    { id:'MTR-US-021', plantId:'PL-US-012', type:'Meter', name:'Main Meter CA-12', vendor:'Itron', model:'ION8650', serial:'MTR-US-021', capacity:'Export', firmware:'3.9', status:'Active', location:'POI', lastSeen:'1 min ago', children:'Export point' },
    { id:'WX-US-021', plantId:'PL-US-012', type:'Weather Station', name:'Weather CA-12', vendor:'Campbell', model:'CR1000X', serial:'WX-US-021', capacity:'Weather package', firmware:'2.1', status:'Active', location:'Mast A', lastSeen:'2 min ago', children:'Irradiance · Wind · Humidity' },
    { id:'TR-US-021', plantId:'PL-US-012', type:'Grid Device', name:'Transformer CA-12', vendor:'ABB', model:'2 MVA', serial:'TR-US-021', capacity:'2 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-US-021', plantId:'PL-US-012', type:'Switchgear', name:'Switchgear CA-12', vendor:'Schneider', model:'Premset', serial:'SW-US-021', capacity:'12 kV · 1000 A', firmware:'Relay 6.1', status:'Active', location:'Subplant', lastSeen:'3 min ago', children:'Breakers · Grid feeder' },
    { id:'PCS-US-101', plantId:'PL-US-021', type:'PCS', name:'Power Conversion System TX-101', vendor:'Tesla', model:'Megapack PCS', serial:'PCS-US-101', capacity:'1 MW', firmware:'5.7', status:'Warning', location:'Battery pad', lastSeen:'12 min ago', children:'DC bus · AC output' },
    { id:'WX-US-101', plantId:'PL-US-021', type:'Weather Station', name:'Weather TX-101', vendor:'Campbell', model:'CR1000X', serial:'WX-US-101', capacity:'Weather package', firmware:'2.1', status:'Active', location:'Mast B', lastSeen:'2 min ago', children:'Irradiance · Wind · Humidity' },
    { id:'TR-US-101', plantId:'PL-US-021', type:'Grid Device', name:'Transformer TX-101', vendor:'ABB', model:'3 MVA', serial:'TR-US-101', capacity:'3 MVA', firmware:'—', status:'Active', location:'Subplant', lastSeen:'5 min ago', children:'Switchgear · Breaker' },
    { id:'SW-US-101', plantId:'PL-US-021', type:'Switchgear', name:'Storage Switchgear TX-101', vendor:'Eaton', model:'Power Xpert UX', serial:'SW-US-101', capacity:'15 kV · 2000 A', firmware:'Relay 7.7', status:'Warning', location:'Subplant', lastSeen:'14 min ago', children:'PCS feeder · PV feeder · Main breaker' }
  ];

  function badge(value: unknown): string {
    const v = String(value || '').toLowerCase();
    if (v.includes('fault') || v.includes('review') || v.includes('maintenance')) return 'warning';
    if (v.includes('offline') || v.includes('blocked')) return 'danger';
    return 'success';
  }
  function getClient(id: string | null | undefined): FleetClientRecord { return clients.find(x => x.id === id) || clients[0]!; }
  function getPlant(id: string | null | undefined): FleetPlantRecord { return plants.find(x => x.id === id) || plants[0]!; }
  function plantsForClient(clientId: string): FleetPlantRecord[] { return plants.filter(x => x.clientId === clientId); }
  function devicesForPlant(plantId: string): FleetDeviceRecord[] { return devices.filter(x => x.plantId === plantId); }
  function countsForClient(clientId: string) {
    const client = clients.find(x => x.id === clientId);
    const ps = plantsForClient(clientId);
    const ds = ps.flatMap(p => devicesForPlant(p.id));
    const apiPlantCount = Number(client?.plantCount || (Array.isArray(client?.plants) ? client?.plants.length : 0) || 0);
    const apiDeviceCount = Number(client?.deviceCount || 0);
    const apiCapacity = client?.totalCapacity && client.totalCapacity !== '—' ? String(client.totalCapacity) : '—';
    return {
      plants: ps.length || apiPlantCount,
      devices: ds.length || apiDeviceCount,
      capacity: ps.length ? ps.reduce((sum, p) => sum + parseFloat(p.capacityDc), 0).toFixed(1) + ' MWp' : apiCapacity,
      alerts: ps.reduce((sum, p) => sum + Number(p.alerts || 0), 0)
    };
  }
  function selectClient(id: string) { localStorage.setItem('zentrid_selected_client', id); }
  function selectPlant(id: string) { localStorage.setItem('zentrid_selected_plant', id); }
  function selectedClient(): FleetClientRecord { return getClient(localStorage.getItem('zentrid_selected_client') || clients[0]!.id); }
  function selectedPlant(): FleetPlantRecord { return getPlant(localStorage.getItem('zentrid_selected_plant') || plantsForClient(selectedClient().id)[0]?.id || plants[0]!.id); }

  return { clients, plants, devices, badge, getClient, getPlant, plantsForClient, devicesForPlant, countsForClient, selectClient, selectPlant, selectedClient, selectedPlant };
})();

window.FleetClientModel = FleetClientModel;

(function hydrateCustomPlantBuilderRecords(){
  try {
    const customPlants = (window.FleetLocalStore ? FleetLocalStore.read(FleetLocalStore.KEYS.clientPlants, []) : JSON.parse(localStorage.getItem('zentrid_custom_plants') || '[]')) as FleetPlantRecord[];
    const customDevices = (window.FleetLocalStore ? FleetLocalStore.read(FleetLocalStore.KEYS.clientDevices, []) : JSON.parse(localStorage.getItem('zentrid_custom_devices') || '[]')) as FleetDeviceRecord[];
    customPlants.forEach(p => {
      if (!p || !p.id) return;
      const existingIndex = FleetClientModel.plants.findIndex(item => item.id === p.id);
      if (existingIndex >= 0) FleetClientModel.plants[existingIndex] = { ...FleetClientModel.plants[existingIndex]!, ...p };
      else FleetClientModel.plants.push(p);
    });
    customDevices.forEach(d => {
      if (!d || !d.id) return;
      const existingIndex = FleetClientModel.devices.findIndex(item => item.id === d.id);
      if (existingIndex >= 0) FleetClientModel.devices[existingIndex] = { ...FleetClientModel.devices[existingIndex]!, ...d };
      else FleetClientModel.devices.push(d);
    });
  } catch (err) {
    console.warn('Unable to hydrate custom Plant Builder records', err);
  }
})();

const FleetDeviceCatalog = (() => {
  const catalog: FleetDeviceCatalogItem[] = [
    { kind:'Inverter', vendor:'Solis', model:'S6-GC100K', rating:'100 kW', protocol:'Modbus TCP / RS485', shared:'Vendor, model, rated power, phase count, MPPT count, supported protocol', individual:'Device name, serial number, firmware, install date, location, string assignment' },
    { kind:'Inverter', vendor:'Huawei', model:'SUN2000-215KTL', rating:'215 kW', protocol:'Modbus TCP / FusionSolar', shared:'Vendor, model, rated power, MPPT count, DC input limits, protocol', individual:'Device name, serial number, firmware, commissioning date, physical area' },
    { kind:'Meter', vendor:'Huawei', model:'DTSU666-H', rating:'Bidirectional', protocol:'RS485 / Modbus', shared:'Vendor, model, meter type, accuracy class, supported protocol', individual:'Serial number, meter address, CT ratio, install point, install date' },
    { kind:'Meter', vendor:'Schneider', model:'PM8000', rating:'Bidirectional', protocol:'Modbus TCP', shared:'Vendor, model, accuracy class, voltage/current range, protocol', individual:'Serial number, IP/address, CT/PT ratio, grid point, tariff role' },
    { kind:'Logger', vendor:'Solis', model:'S2-WL-ST', rating:'Wi-Fi / LAN', protocol:'SolisCloud / Modbus', shared:'Vendor, model, network type, supported inverter families', individual:'Serial number, MAC address, SIM/IMEI if cellular, plant network position' },
    { kind:'Logger', vendor:'Meteocontrol', model:'blue\'Log X', rating:'Multi-vendor gateway', protocol:'Modbus / Sunspec / API', shared:'Vendor, model, supported protocol set, max linked devices', individual:'Serial number, MAC/IP, device address map, cabinet location' },
    { kind:'BESS', vendor:'BYD', model:'Battery-Box Premium', rating:'LFP storage', protocol:'CAN / RS485 BMS', shared:'Vendor, model, chemistry, nominal capacity, voltage range, BMS protocol', individual:'Serial number, rack/container ID, install date, warranty, linked PCS/BMS address' },
    { kind:'BESS', vendor:'CATL', model:'EnerOne Rack', rating:'372 kWh rack', protocol:'BMS / Modbus', shared:'Vendor, model, chemistry, capacity, thermal specs, BMS protocol', individual:'Rack serial, module serials, container position, commissioning date' },
    { kind:'PCS', vendor:'Sungrow', model:'PCS500', rating:'500 kW', protocol:'Modbus TCP', shared:'Vendor, model, AC/DC limits, conversion capacity, protocol', individual:'Serial number, firmware, linked BESS, grid feeder, install date' },
    { kind:'Weather Station', vendor:'Kipp & Zonen', model:'RT1', rating:'Irradiance / temp', protocol:'Modbus / analog', shared:'Vendor, model, sensor types, measurement range', individual:'Serial number, mast location, calibration date, sensor channel map' },
    { kind:'Transformer', vendor:'ABB', model:'2.5 MVA', rating:'2.5 MVA', protocol:'Protection relay optional', shared:'Vendor, model, rated power, voltage levels, cooling type', individual:'Serial number, subplant location, protection relay ID, oil test date' },
    { kind:'Switchgear', vendor:'Schneider', model:'SM6-24', rating:'24 kV · 1250 A', protocol:'Relay / SCADA', shared:'Vendor, model, rated voltage/current, breaker type', individual:'Serial number, feeder names, relay address, breaker IDs, install date' }
  ];
  const compatibility = [
    { from:'Solis S6-GC100K', to:'Huawei DTSU666-H / Schneider PM8000', type:'Meter', status:'Compatible if Modbus address, CT ratio and firmware support are configured', rule:'Inverter ↔ meter link is logical/electrical, not ownership by vendor.' },
    { from:'Solis S6-GC100K', to:'BYD Battery-Box / CATL EnerOne', type:'BESS', status:'Conditional: requires supported BMS protocol and approved battery list', rule:'Battery compatibility is protocol + firmware + voltage window.' },
    { from:'Any inverter', to:'Meteocontrol blue\'Log X', type:'Logger', status:'Compatible through Modbus/Sunspec or vendor adapter', rule:'Logger can be multi-vendor and becomes a plant-level gateway.' },
    { from:'BESS', to:'Sungrow PCS500', type:'PCS', status:'Compatible when DC bus, BMS and EMS control profile match', rule:'PCS is linked to BESS, not to PV strings.' },
    { from:'Weather Station', to:'Logger / SCADA', type:'Weather', status:'Usually connected to logger/SCADA, not directly to inverter', rule:'Weather data is plant context for analytics.' },
    { from:'Inverter', to:'MPPT / String', type:'Internal topology', status:'Built-in hierarchy, not a third-party device selection', rule:'MPPT belongs to inverter; strings connect to inverter DC inputs.' },
    { from:'Transformer', to:'Switchgear / Meter', type:'Grid infrastructure', status:'Plant-level electrical relation', rule:'These are siblings in plant topology, linked by feeder / POI.' }
  ];
  return { catalog, compatibility };
})();

function clientKpis(client: FleetClientRecord): string {
  const c = FleetClientModel.countsForClient(client.id);
  return `<section class="kpi-grid client-kpi-grid">
    <article class="kpi-card cyan"><span class="kpi-label">Client Plants</span><div class="kpi-value">${c.plants}</div><small class="kpi-delta">Client → Plant structure</small></article>
    <article class="kpi-card green"><span class="kpi-label">Total Capacity</span><div class="kpi-value">${c.capacity}</div><small class="kpi-delta">DC installed capacity</small></article>
    <article class="kpi-card blue"><span class="kpi-label">Device Records</span><div class="kpi-value">${c.devices}</div><small class="kpi-delta">Inverters, meters, BESS, weather</small></article>
    <article class="kpi-card yellow"><span class="kpi-label">Open Alerts</span><div class="kpi-value">${c.alerts}</div><small class="kpi-delta">Across client plants</small></article>
  </section>`;
}

function renderClientsPage() {
  // Client Registry is API-driven: never render prototype or browser-local client rows.
  const apiClients = FleetClientModel.clients.filter(client => client.dataOrigin === 'live');
  if (apiClients.length !== FleetClientModel.clients.length) {
    FleetClientModel.clients.splice(0, FleetClientModel.clients.length, ...apiClients);
  }
  const rows = FleetClientModel.clients;
  const queryState = window.FleetRegistryQuery?.read('clients');
  const pagination = window.FleetRegistryQuery?.pagination('clients');
  const totalClients = pagination?.totalCount || rows.length;
  const legalCount = rows.filter(c => c.type === 'Legal Entity').length;
  const individualCount = rows.filter(c => c.type === 'Individual').length;
  const activeCount = rows.filter(c => c.status === 'Active').length;
  const initialSearch = queryState?.search || '';
  const initialType = queryState?.params.clientType || 'all';
  const initialStatus = queryState?.params.clientStatus || 'all';
  const pager = window.FleetRegistryQuery?.pagerHtml('clients', rows.length) || '';
  FleetLayout.mount(`
    <section class="page-hero">
      <div><p class="eyebrow">Tenant Admin · Client Registry</p><h1>Clients</h1><p class="muted">Canonical client registry for legal entities and individuals, with plant assignment, portal access and document scope.</p></div>
      <button class="create-action" id="openClientCreate" type="button" data-permission-action="create" data-permission-resource="client"><span class="pulse"></span><div><strong>+ Add Client</strong><small>Client profile · portal access</small></div></button>
    </section>
    <section class="context-bar glass-card">
      <button class="ctx-item" type="button"><span>Total Clients</span><strong>${totalClients.toLocaleString()}</strong></button>
      <button class="ctx-item" type="button"><span>Legal Entities on Page</span><strong>${legalCount}</strong></button>
      <button class="ctx-item" type="button"><span>Individuals on Page</span><strong>${individualCount}</strong></button>
      <button class="ctx-item" type="button"><span>Active on Page</span><strong>${activeCount}</strong></button>
    </section>
    <section class="panel glass-card">
      <div class="panel-head"><div><h2>Client Registry</h2><p class="muted">Create and manage client records inside the current tenant. Plant and portal access remain controlled through assignment scope.</p></div></div>
      <div class="toolbar">
        <input id="clientSearchV28" value="${clientDetailAttr(initialSearch)}" placeholder="Search current page by client, code, contact, country..." />
        <select id="clientTypeV28"><option value="all" ${initialType === 'all' ? 'selected' : ''}>All types</option><option value="Legal Entity" ${initialType === 'Legal Entity' ? 'selected' : ''}>Legal Entity</option><option value="Individual" ${initialType === 'Individual' ? 'selected' : ''}>Individual</option></select>
        <select id="clientStatusV28"><option value="all" ${initialStatus === 'all' ? 'selected' : ''}>All statuses</option><option ${initialStatus === 'Active' ? 'selected' : ''}>Active</option><option ${initialStatus === 'Review' ? 'selected' : ''}>Review</option><option ${initialStatus === 'Pending' ? 'selected' : ''}>Pending</option></select>
      </div>
      <div id="clientFilterScopeV126">${window.FleetRegistryQuery?.filterScopeHtml('clients') || ''}</div>
      ${pager}
      <div class="data-table client-table-v17 client-registry-table-v28" id="clientRowsV28">
        ${clientRowsMarkup(rows)}
      </div>
      ${pager}
    </section>
    ${clientCreateModal()}
  `);
  const render = () => {
    const query = (document.getElementById('clientSearchV28')?.value || '').toLowerCase().trim();
    const type = document.getElementById('clientTypeV28')?.value || 'all';
    const status = document.getElementById('clientStatusV28')?.value || 'all';
    const filtered = rows.filter(c => {
      const haystack = [c.name, c.code, c.id, c.type, c.country, c.city, c.primaryContact, c.contactEmail, c.tenant, c.status].join(' ').toLowerCase();
      return (!query || haystack.includes(query)) && (type === 'all' || c.type === type) && (status === 'all' || c.status === status);
    });
    const target = document.getElementById('clientRowsV28');
    if (target) FleetRuntimeStability.replaceHtml(target, clientRowsMarkup(filtered));
    window.FleetRegistryQuery?.update('clients', {
      search: query || null,
      clientType: type === 'all' ? null : type,
      clientStatus: status === 'all' ? null : status
    }, { replace: true, emit: false });
    const scope = document.getElementById('clientFilterScopeV126');
    if (scope) scope.innerHTML = window.FleetRegistryQuery?.filterScopeHtml('clients') || '';
  };
  document.getElementById('clientSearchV28')?.addEventListener('input', () => {
    FleetRuntimeStability.debounce('registry:clients:search', render, 220);
  });
  document.getElementById('clientTypeV28')?.addEventListener('change', render);
  document.getElementById('clientStatusV28')?.addEventListener('change', render);
  document.getElementById('openClientCreate')?.addEventListener('click', openClientCreateModal);
  document.getElementById('clientCreateBackdrop')?.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'clientCreateBackdrop' || target.closest('[data-close-client-create]')) closeClientCreateModal();
  });
  document.getElementById('clientCreateForm')?.addEventListener('submit', submitClientCreateForm);
  initClientCreateWizard();
  document.querySelector('.client-table-v17')?.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>('.data-row[data-client]');
    const clientId = row?.dataset.client;
    if (!clientId) return;
    FleetClientModel.selectClient(clientId);
    const action = target.closest<HTMLElement>('button')?.dataset.action;
    if (action === 'edit') localStorage.setItem('zentrid_client_detail_edit', 'identity');
    location.href = `${FleetLayout.pathFor('client-detail')}?id=${encodeURIComponent(clientId)}`;
  });
}

type ClientCreateStep = 'tenant' | 'identity' | 'location' | 'portal' | 'documentation' | 'banking' | 'review';

interface ClientCreateLocationRule {
  regions: Record<string, string[]>;
  timezone: string;
  currency: string;
  phonePlaceholder: string;
}

const clientCreateSteps: ClientCreateStep[] = ['tenant', 'identity', 'location', 'portal', 'documentation', 'banking', 'review'];
const clientCreateLocationRules: Record<string, ClientCreateLocationRule> = {
  Armenia: {
    regions: {
      Yerevan: ['Yerevan'],
      Kotayk: ['Abovyan', 'Hrazdan'],
      Shirak: ['Gyumri'],
      Armavir: ['Vagharshapat', 'Armavir']
    },
    timezone: 'Asia/Yerevan',
    currency: 'AMD',
    phonePlaceholder: '+374 00 000 000'
  },
  'United States': {
    regions: {
      California: ['San Diego', 'Los Angeles', 'San Francisco'],
      Texas: ['Austin', 'Houston', 'Dallas']
    },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    phonePlaceholder: '+1 000 000 0000'
  },
  Germany: {
    regions: {
      Bavaria: ['Munich', 'Nuremberg'],
      Berlin: ['Berlin'],
      Hamburg: ['Hamburg']
    },
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    phonePlaceholder: '+49 000 000000'
  },
  Spain: {
    regions: {
      Madrid: ['Madrid'],
      Catalonia: ['Barcelona'],
      Andalusia: ['Seville', 'Málaga']
    },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    phonePlaceholder: '+34 000 000 000'
  }
};

let clientCreateCurrentStep = 0;
let clientCreateInitialSnapshot = '';
let clientCreateSaving = false;

function clientCreateModal() {
  const tenantName = FleetLayout.state.tenant;
  const countries = Object.keys(clientCreateLocationRules);
  const armenia = clientCreateLocationRules.Armenia!;
  const regions = Object.keys(armenia.regions);
  const cities = armenia.regions[regions[0] || 'Yerevan'] || ['Yerevan'];
  return `<div class="modal client-create-modal wide-modal" id="clientCreateBackdrop" role="dialog" aria-modal="true" aria-labelledby="clientCreateTitle" aria-hidden="true">
    <div class="modal-card client-create-card">
      <button class="modal-close" type="button" data-close-client-create aria-label="Close create client wizard">×</button>
      <div class="client-create-head">
        <div><p class="eyebrow">Client Registry · Create Client</p><h2 id="clientCreateTitle">Add New Client</h2><p class="muted">Create a canonical client profile inside the current tenant workspace and configure its portal access.</p></div>
        <span class="badge warning">Draft</span>
      </div>
      <form id="clientCreateForm" class="client-create-form setup-layout" novalidate data-fleet-form-readiness="api" data-fleet-form-contract="ClientCreateDraft" data-fleet-form-endpoint="/api/admin/clients" data-fleet-form-method="POST" data-fleet-form-api-note="Create Client writes the canonical client record first, then uploads selected document files through the Client Documents API.">
        <aside class="setup-rail client-create-rail" aria-label="Create client steps">
          <button class="active" type="button" data-client-create-step="tenant"><b>1</b><span>Client Profile</span></button>
          <button type="button" data-client-create-step="identity"><b>2</b><span>Identity</span></button>
          <button type="button" data-client-create-step="location"><b>3</b><span>Location & Preferences</span></button>
          <button type="button" data-client-create-step="portal"><b>4</b><span>Contacts & Portal</span></button>
          <button type="button" data-client-create-step="documentation"><b>5</b><span>Documentation</span></button>
          <button type="button" data-client-create-step="banking"><b>6</b><span>Banking Information</span></button>
          <button type="button" data-client-create-step="review"><b>7</b><span>Review</span></button>
        </aside>
        <div class="client-create-content setup-content">
          <div class="form-validation-summary" id="clientValidationSummary" role="alert" aria-live="assertive" tabindex="-1" hidden></div>
          <section class="form-section-card client-create-step-panel active" data-client-create-panel="tenant">
            <div class="section-title"><div><h3>Client Profile</h3><p class="muted">The tenant scope is fixed by the signed-in account. Choose the client type and initial lifecycle status.</p></div><span class="badge success">Tenant scoped</span></div>
            <div class="client-form-grid two-col">
              <label>Tenant Scope<input name="tenant" readonly value="${clientDetailAttr(tenantName)}" aria-readonly="true" /></label>
              <label>Client Type *<select name="type" id="clientCreateType" required><option>Individual</option><option>Legal Entity</option></select></label>
              <label>Account Activation<input name="activation" readonly value="Auto-generated on save" /></label>
              <label>Status *<select name="status" required><option>Pending</option><option>Review</option><option>Active</option></select></label>
            </div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="identity">
            <div class="section-title"><div><h3>Identity</h3><p class="muted">Personal or legal identity data used for the canonical client profile.</p></div></div>
            <div class="client-create-type-group" data-create-type-fields="Individual">
              <div class="client-form-grid three-col">
                <label>Name *<input name="name" required maxlength="80" autocomplete="given-name" placeholder="First name" /></label>
                <label>Surname *<input name="surname" required maxlength="80" autocomplete="family-name" placeholder="Surname" /></label>
                <label>Last name<input name="lastName" maxlength="80" placeholder="Optional middle / additional name" /></label>
                <label>Date of birth<input name="dob" placeholder="dd/mm/yyyy" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" title="Use date format dd/mm/yyyy." /></label>
                <label>User Role *<select name="userRole" required><option>End User</option><option>Owner Viewer</option><option>Investor Viewer</option><option>Technical Viewer</option></select></label>
                <label>Language *<select name="language" required><option>English</option><option>Armenian</option><option>Russian</option><option>German</option><option>Spanish</option></select></label>
              </div>
            </div>
            <div class="client-create-type-group" data-create-type-fields="Legal Entity" hidden>
              <div class="client-form-grid three-col">
                <label>Company Name *<input name="companyName" required maxlength="140" autocomplete="organization" placeholder="Registered company name" /></label>
                <label>Legal Form *<select name="legalForm" required><option>LLC</option><option>Corporation</option><option>Holding Company</option><option>Partnership</option><option>Non-profit</option><option>Other</option></select></label>
                <label>Registration Number *<input name="registrationNo" required maxlength="80" placeholder="Company registration number" /></label>
                <label>Tax ID / VAT Number *<input name="taxId" required maxlength="80" placeholder="Tax or VAT identifier" /></label>
                <label>Primary Contact Person *<input name="contactPerson" required maxlength="120" autocomplete="name" placeholder="Full name" /></label>
                <label>User Role *<select name="userRoleLegal" required><option>Owner Viewer</option><option>Finance Viewer</option><option>Operations Viewer</option><option>Investor Viewer</option></select></label>
                <label>Language *<select name="languageLegal" required><option>English</option><option>Armenian</option><option>Russian</option><option>German</option><option>Spanish</option></select></label>
              </div>
            </div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="location">
            <div class="section-title"><div><h3>Location & Preferences</h3><p class="muted">Geography selections control the available region, city, timezone and default currency values.</p></div></div>
            <div class="client-form-grid three-col">
              <label>Country *<select name="country" id="clientCreateCountry" required>${countries.map(x => `<option>${x}</option>`).join('')}</select></label>
              <label>Region *<select name="region" id="clientCreateRegion" required>${regions.map(x => `<option>${x}</option>`).join('')}</select></label>
              <label>City *<select name="city" id="clientCreateCity" required>${cities.map(x => `<option>${x}</option>`).join('')}</select></label>
              <label class="wide-field">Address *<input name="address" required maxlength="180" autocomplete="street-address" placeholder="Street, building, apartment" /></label>
              <label>Time Zone *<select name="timezone" id="clientCreateTimezone" required><option>Asia/Yerevan</option><option>America/Los_Angeles</option><option>America/Chicago</option><option>Europe/Berlin</option><option>Europe/Madrid</option></select></label>
              <label>Temperature Format<select name="temperature"><option>°C</option></select></label>
              <label>Currency Unit *<select name="currency" id="clientCreateCurrency" required><option>AMD</option><option>USD</option><option>EUR</option></select></label>
              <label>Irradiation<select name="irradiation"><option>kWh/m2</option><option>W/m2</option><option>MJ/m2</option></select></label>
            </div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="portal">
            <div class="section-title"><div><h3>Contacts & Portal Account</h3><p class="muted">Client contact details and initial portal credentials sent through the Client API.</p></div></div>
            <div class="client-form-grid three-col">
              <label>Phone Number 1 *<input name="phone1" type="tel" required maxlength="40" autocomplete="tel" placeholder="+374..." /></label>
              <label>Phone Number 2<input name="phone2" type="tel" maxlength="40" placeholder="Optional" /></label>
              <label>E-mail *<input name="email" type="email" required maxlength="160" autocomplete="email" placeholder="client@example.com" /></label>
              <label>Username *<input name="username" required minlength="4" maxlength="60" autocomplete="username" pattern="[A-Za-z0-9._-]+" title="Use letters, numbers, dots, dashes or underscores." placeholder="username" /></label>
              <label>Temporary Password *<input name="password" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="At least 8 characters" /></label>
              <label>Portal Role<input name="portalRole" maxlength="80" placeholder="Owner Viewer" /></label>
            </div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="documentation">
            <div class="section-title"><div><h3>Documentation</h3><p class="muted">Add identity numbers and documents. Selected files are uploaded after the backend client record is created.</p></div></div>
            <div class="client-form-grid two-col">
              <label>Client Passport Number<input name="passportNumber" maxlength="80" placeholder="Passport / personal document number" /></label>
              <label>State Registration Document Number<input name="stateRegistrationNumber" maxlength="80" placeholder="State registration document number" /></label>
              <label>Client Passport<input name="clientPassport" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-doc-label="Client Passport" data-doc-type="Identity" data-doc-expiry="clientPassportExpiry" /></label>
              <label>Passport Expiry<input name="clientPassportExpiry" type="date" /></label>
              <label>State Registration Document<input name="stateRegistrationDocument" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-doc-label="State Registration Document" data-doc-type="Legal" data-doc-expiry="stateRegistrationDocumentExpiry" /></label>
              <label>Registration Document Expiry<input name="stateRegistrationDocumentExpiry" type="date" /></label>
              <label>Project Doc<input name="projectDoc" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-doc-label="Project Doc" data-doc-type="Commercial" data-doc-expiry="projectDocExpiry" /></label>
              <label>Project Doc Expiry<input name="projectDocExpiry" type="date" /></label>
            </div>
            <p class="field-help">Allowed document formats: PDF, DOC, DOCX, JPG, JPEG, PNG.</p>
            <div class="client-uploaded-docs" id="clientUploadedDocs"><div class="empty-state mini">No documents added yet.</div></div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="banking">
            <div class="section-title"><div><h3>Banking Information</h3><p class="muted">Optional bank account information used for billing, settlements and client financial records.</p></div><button class="secondary-action" type="button" id="addClientBank">+ Add Bank</button></div>
            <div class="client-bank-list" id="clientBankList">
              <div class="client-bank-card" data-bank-index="0">
                <div class="client-bank-head"><strong>Bank 1</strong><label class="checkbox-label checkbox-inline"><input type="radio" name="primaryBank" value="0" checked><span>Primary bank</span></label></div>
                <div class="client-form-grid four-col">
                  <label>Bank<input name="bankName" maxlength="120" placeholder="Bank name" /></label>
                  <label>Bank Code<input name="bankCode" maxlength="60" placeholder="Bank code" /></label>
                  <label>Account Number<input name="accountNumber" maxlength="80" placeholder="Account number / IBAN" /></label>
                  <label>Account Currency<select name="accountCurrency"><option>AMD</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
                </div>
                <div class="inline-actions client-bank-actions"><button type="button" class="secondary-action" data-remove-bank>Delete</button></div>
              </div>
            </div>
          </section>
          <section class="form-section-card client-create-step-panel" data-client-create-panel="review">
            <div class="section-title"><div><h3>Review</h3><p class="muted">Check client identity, fixed tenant scope, portal access, documents and banking data before creating the backend client profile.</p></div></div>
            <div class="info-grid client-create-review">
              <div><span>Tenant Scope</span><strong data-review-field="tenant">${clientDetailEscape(tenantName)}</strong><small>Fixed by the signed-in Tenant Admin account</small></div>
              <div><span>Client Type</span><strong data-review-field="type">Individual</strong><small>Identity flow selected in step 1</small></div>
              <div><span>Client Identity</span><strong data-review-field="identity">Not entered</strong><small>Person or registered company name</small></div>
              <div><span>Primary Contact</span><strong data-review-field="contact">Not entered</strong><small>Email and phone are checked in portal step</small></div>
              <div><span>Portal Account</span><strong data-review-field="portal">Not configured</strong><small>Username and temporary password policy</small></div>
              <div><span>Location</span><strong data-review-field="location">Armenia</strong><small>Country, region, city and timezone</small></div>
              <div><span>Documentation</span><strong data-review-field="documents">Not uploaded</strong><small>Identity, registration and project document references</small></div>
              <div><span>Banking</span><strong data-review-field="banking">Not entered</strong><small>Bank, account number and account currency</small></div>
            </div>
          </section>
          <div class="modal-actions client-create-actions">
            <span class="wizard-progress" id="clientWizardProgress" aria-live="polite">Step 1 of 7</span>
            <button class="secondary-btn" type="button" data-close-client-create>Cancel</button>
            <button class="secondary-btn" type="button" id="previousClientCreateStep" disabled>Back</button>
            <button class="primary-action" type="button" id="nextClientCreateStep">Save & Continue</button>
            <button class="primary-action" type="submit" id="saveClientCreate" hidden data-permission-action="create" data-permission-resource="client">Create Client</button>
          </div>
        </div>
      </form>
    </div>
  </div>`;
}

function clientCreateFormElement(): ClientForm | null {
  return document.getElementById('clientCreateForm') as ClientForm | null;
}

function clientCreateModalElement(): HTMLElement | null {
  return document.getElementById('clientCreateBackdrop');
}

function clientCreateControl<T extends FleetFormControl = FleetFormControl>(name: string): T | null {
  return clientCreateFormElement()?.elements.namedItem(name) as T | null;
}

function normalizeClientDuplicateValue(value: unknown): string {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function normalizeClientIdentifier(value: unknown): string {
  return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function clientDraftName(form: ClientForm): string {
  const fd = new FormData(form);
  const type = formValue(fd.get('type')) || 'Individual';
  if (type === 'Legal Entity') return formValue(fd.get('companyName')).trim();
  return [fd.get('name'), fd.get('surname'), fd.get('lastName')]
    .map(value => formValue(value).trim())
    .filter(Boolean)
    .join(' ');
}

function renderClientDocumentList(): void {
  const modal = clientCreateModalElement();
  const host = modal?.querySelector<HTMLElement>('#clientUploadedDocs');
  if (!modal || !host) return;
  const docs = Array.from(modal.querySelectorAll<HTMLInputElement>('[data-doc-label]'))
    .map(input => ({ label: input.dataset.docLabel || 'Document', name: input.files?.[0]?.name || '' }))
    .filter(item => item.name);
  host.innerHTML = docs.length
    ? docs.map(item => `<div class="client-doc-row" data-doc-name="${item.label}"><div><strong>${item.label}</strong><small>${item.name}</small></div><button type="button" class="secondary-action" data-remove-doc="${item.label}">Delete</button></div>`).join('')
    : '<div class="empty-state mini">No documents added yet.</div>';
}

function resetClientBankList(): void {
  const host = clientCreateModalElement()?.querySelector<HTMLElement>('#clientBankList');
  if (!host) return;
  const cards = Array.from(host.querySelectorAll<HTMLElement>('.client-bank-card'));
  cards.slice(1).forEach(card => card.remove());
  const first = cards[0];
  if (!first) return;
  first.querySelectorAll<HTMLInputElement>('input').forEach(input => {
    if (input.type === 'radio') input.checked = true;
    else input.value = '';
  });
  first.querySelectorAll<HTMLSelectElement>('select').forEach(select => { select.value = 'AMD'; });
  const deleteButton = first.querySelector<HTMLButtonElement>('[data-remove-bank]');
  if (deleteButton) deleteButton.disabled = true;
  first.dataset.bankIndex = '0';
  const title = first.querySelector<HTMLElement>('.client-bank-head strong');
  if (title) title.textContent = 'Bank 1';
}

function clientCreateDraftSnapshot(): string {
  const form = clientCreateFormElement();
  return form ? FleetFormUX.snapshot(form) : '';
}

function openClientCreateModal(): void {
  const modal = clientCreateModalElement();
  const form = clientCreateFormElement();
  if (!modal || !form) return;
  form.reset();
  form.querySelectorAll<HTMLInputElement>('[data-doc-label]').forEach(input => { input.value = ''; });
  resetClientBankList();
  renderClientDocumentList();
  FleetFormUX.clearErrors(form, document.getElementById('clientValidationSummary'));
  modal.querySelectorAll('[data-client-create-step]').forEach(step => step.classList.remove('completed', 'has-error'));
  clientCreateSaving = false;
  const saveButton = document.getElementById('saveClientCreate') as HTMLButtonElement | null;
  if (saveButton) FleetFormUX.setBusy(saveButton, false);
  syncClientCreateTypeFields();
  applyClientCreateLocationRules(true);
  setClientCreateStep('tenant');
  updateClientCreateReview();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  clientCreateInitialSnapshot = clientCreateDraftSnapshot();
  window.setTimeout(() => clientCreateControl<HTMLSelectElement>('type')?.focus(), 0);
}

function closeClientCreateModal(force = false): void {
  const modal = clientCreateModalElement();
  if (!modal || !modal.classList.contains('open')) return;
  const changed = clientCreateInitialSnapshot && clientCreateDraftSnapshot() !== clientCreateInitialSnapshot;
  if (!force && !clientCreateSaving && changed && !window.confirm('Discard the client information entered in this wizard?')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function initClientCreateWizard(): void {
  const modal = clientCreateModalElement();
  const form = clientCreateFormElement();
  if (!modal || !form || modal.dataset.clientWizardReady) return;
  modal.dataset.clientWizardReady = 'true';
  initClientDocumentList(modal);
  initClientBankList(modal);
  modal.querySelectorAll<HTMLElement>('[data-client-create-step]').forEach(button => {
    button.addEventListener('click', () => {
      const target = clientCreateSteps.indexOf(button.dataset.clientCreateStep as ClientCreateStep);
      if (target < 0) return;
      if (target > clientCreateCurrentStep && !validateBeforeClientCreateStep(target)) return;
      setClientCreateStep(clientCreateSteps[target]);
      updateClientCreateReview();
    });
  });
  modal.querySelector('#clientCreateType')?.addEventListener('change', () => {
    syncClientCreateTypeFields();
    updateClientCreateReview();
  });
  modal.querySelector('#clientCreateCountry')?.addEventListener('change', () => {
    applyClientCreateLocationRules(true);
    updateClientCreateReview();
  });
  modal.querySelector('#clientCreateRegion')?.addEventListener('change', () => {
    updateClientCreateCities();
    updateClientCreateReview();
  });
  modal.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', updateClientCreateReview);
    element.addEventListener('change', updateClientCreateReview);
  });
  document.getElementById('previousClientCreateStep')?.addEventListener('click', () => setClientCreateStep(clientCreateSteps[Math.max(0, clientCreateCurrentStep - 1)]));
  document.getElementById('nextClientCreateStep')?.addEventListener('click', event => {
    event.preventDefault();
    if (!validateClientCreateStep(clientCreateCurrentStep)) return;
    setClientCreateStep(clientCreateSteps[Math.min(clientCreateSteps.length - 1, clientCreateCurrentStep + 1)]);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeClientCreateModal();
  });
  FleetFormUX.bindClearOnInput(form, document.getElementById('clientValidationSummary'));
  syncClientCreateTypeFields();
  applyClientCreateLocationRules(true);
  setClientCreateStep('tenant');
}

function setClientCreateStep(step: string | undefined): void {
  const modal = clientCreateModalElement();
  if (!modal) return;
  const requested = clientCreateSteps.indexOf((step || 'tenant') as ClientCreateStep);
  clientCreateCurrentStep = requested >= 0 ? requested : 0;
  const activeStep = clientCreateSteps[clientCreateCurrentStep] || 'tenant';
  modal.querySelectorAll<HTMLElement>('[data-client-create-step]').forEach(button => {
    const active = button.dataset.clientCreateStep === activeStep;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  modal.querySelectorAll<HTMLElement>('[data-client-create-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.clientCreatePanel === activeStep));
  const previous = document.getElementById('previousClientCreateStep') as HTMLButtonElement | null;
  const next = document.getElementById('nextClientCreateStep') as HTMLButtonElement | null;
  const save = document.getElementById('saveClientCreate') as HTMLButtonElement | null;
  const progress = document.getElementById('clientWizardProgress');
  if (previous) previous.disabled = clientCreateCurrentStep === 0;
  if (next) next.hidden = clientCreateCurrentStep === clientCreateSteps.length - 1;
  if (save) save.hidden = clientCreateCurrentStep !== clientCreateSteps.length - 1;
  if (progress) progress.textContent = `Step ${clientCreateCurrentStep + 1} of ${clientCreateSteps.length}`;
  const summary = document.getElementById('clientValidationSummary');
  if (summary) {
    summary.hidden = true;
    summary.innerHTML = '';
  }
}

function syncClientCreateTypeFields(): void {
  const modal = clientCreateModalElement();
  if (!modal) return;
  const type = (modal.querySelector('#clientCreateType') as HTMLSelectElement | null)?.value || 'Individual';
  modal.querySelectorAll<HTMLElement>('[data-create-type-fields]').forEach(group => {
    const active = group.dataset.createTypeFields === type;
    group.hidden = !active;
    group.querySelectorAll<FleetFormControl>('input, select, textarea').forEach(control => { control.disabled = !active; });
  });
}

function setClientSelectOptions(select: HTMLSelectElement | null, options: string[], preferred?: string): void {
  if (!select) return;
  const current = preferred || select.value;
  select.innerHTML = options.map(option => `<option>${option}</option>`).join('');
  if (options.includes(current)) select.value = current;
}

function updateClientCreateCities(): void {
  const country = clientCreateControl<HTMLSelectElement>('country')?.value || 'Armenia';
  const region = clientCreateControl<HTMLSelectElement>('region')?.value || '';
  const rule = clientCreateLocationRules[country] || clientCreateLocationRules.Armenia!;
  setClientSelectOptions(clientCreateControl<HTMLSelectElement>('city'), rule.regions[region] || []);
}

function applyClientCreateLocationRules(resetDependent = false): void {
  const country = clientCreateControl<HTMLSelectElement>('country')?.value || 'Armenia';
  const rule = clientCreateLocationRules[country] || clientCreateLocationRules.Armenia!;
  const region = clientCreateControl<HTMLSelectElement>('region');
  const currentRegion = resetDependent ? undefined : region?.value;
  setClientSelectOptions(region, Object.keys(rule.regions), currentRegion);
  updateClientCreateCities();
  const timezone = clientCreateControl<HTMLSelectElement>('timezone');
  if (timezone && Array.from(timezone.options).some(option => option.value === rule.timezone)) timezone.value = rule.timezone;
  const currency = clientCreateControl<HTMLSelectElement>('currency');
  if (currency && Array.from(currency.options).some(option => option.value === rule.currency)) currency.value = rule.currency;
  const phone1 = clientCreateControl<HTMLInputElement>('phone1');
  const phone2 = clientCreateControl<HTMLInputElement>('phone2');
  if (phone1) phone1.placeholder = rule.phonePlaceholder;
  if (phone2) phone2.placeholder = `Optional · ${rule.phonePlaceholder}`;
}

function clientCreateCustomIssues(index: number, includeDuplicates = false): FleetFormIssue[] {
  const form = clientCreateFormElement();
  if (!form) return [];
  const issues: FleetFormIssue[] = [];
  const type = clientCreateControl<HTMLSelectElement>('type')?.value || 'Individual';
  if (index === 1) {
    ['name', 'surname', 'lastName', 'companyName', 'registrationNo', 'taxId', 'contactPerson'].forEach(name => {
      const control = clientCreateControl<HTMLInputElement>(name);
      if (control && !control.disabled) control.value = control.value.trim();
    });
    const dob = clientCreateControl<HTMLInputElement>('dob');
    if (dob && !dob.disabled && dob.value) {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob.value.trim());
      const day = Number(match?.[1] || 0);
      const month = Number(match?.[2] || 0);
      const year = Number(match?.[3] || 0);
      const currentYear = new Date().getFullYear();
      if (!match || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > currentYear) issues.push({ control:dob, message:'Enter a valid date of birth in dd/mm/yyyy format.' });
    }
    if (includeDuplicates) {
      const name = clientDraftName(form);
      const duplicateName = FleetClientModel.clients.find(client => normalizeClientDuplicateValue(client.name) === normalizeClientDuplicateValue(name));
      if (duplicateName) {
        const control = type === 'Legal Entity' ? clientCreateControl<HTMLInputElement>('companyName') : clientCreateControl<HTMLInputElement>('name');
        issues.push({ control, message:`A client named “${duplicateName.name}” already exists.` });
      }
      if (type === 'Legal Entity') {
        const registration = clientCreateControl<HTMLInputElement>('registrationNo');
        const tax = clientCreateControl<HTMLInputElement>('taxId');
        const duplicateRegistration = registration?.value ? FleetClientModel.clients.find(client => normalizeClientIdentifier(client.registrationNo) === normalizeClientIdentifier(registration.value)) : undefined;
        const duplicateTax = tax?.value ? FleetClientModel.clients.find(client => normalizeClientIdentifier(client.taxId) === normalizeClientIdentifier(tax.value)) : undefined;
        if (duplicateRegistration && registration) issues.push({ control:registration, message:`Registration number is already used by ${duplicateRegistration.name}.` });
        if (duplicateTax && tax) issues.push({ control:tax, message:`Tax identifier is already used by ${duplicateTax.name}.` });
      }
    }
  }
  if (index === 3) {
    const email = clientCreateControl<HTMLInputElement>('email');
    const username = clientCreateControl<HTMLInputElement>('username');
    const password = clientCreateControl<HTMLInputElement>('password');
    const phone1 = clientCreateControl<HTMLInputElement>('phone1');
    if (email) email.value = email.value.trim().toLocaleLowerCase();
    if (username) username.value = username.value.trim();
    if (phone1) phone1.value = phone1.value.trim();
    if (password?.value && (!/[A-Za-z]/.test(password.value) || !/\d/.test(password.value))) issues.push({ control:password, message:'Temporary password must contain at least one letter and one number.' });
    if (includeDuplicates) {
      const duplicateEmail = email?.value ? FleetClientModel.clients.find(client => normalizeClientDuplicateValue(client.contactEmail) === normalizeClientDuplicateValue(email.value)) : undefined;
      const duplicateUsername = username?.value ? FleetClientModel.clients.find(client => normalizeClientDuplicateValue(client.username || client.portalUsername) === normalizeClientDuplicateValue(username.value)) : undefined;
      if (duplicateEmail && email) issues.push({ control:email, message:`E-mail is already used by ${duplicateEmail.name}.` });
      if (duplicateUsername && username) issues.push({ control:username, message:`Username is already assigned to ${duplicateUsername.name}.` });
    }
  }
  if (index === 4) {
    const passportNumber = clientCreateControl<HTMLInputElement>('passportNumber');
    const registrationDocumentNumber = clientCreateControl<HTMLInputElement>('stateRegistrationNumber');
    const passportFile = clientCreateControl<HTMLInputElement>('clientPassport');
    const registrationFile = clientCreateControl<HTMLInputElement>('stateRegistrationDocument');
    form.querySelectorAll<HTMLInputElement>('input[type="file"][data-doc-label]').forEach(input => {
      const file = input.files?.[0];
      if (file && !clientDocumentFileAllowed(file)) issues.push({ control:input, message:`${file.name} is not supported. Allowed document formats: PDF, DOC, DOCX, JPG, JPEG, PNG.` });
    });
    if (type === 'Individual' && !passportNumber?.value.trim() && !passportFile?.files?.length) issues.push({ control:passportNumber, message:'Enter a passport / personal document number or upload the client passport.' });
    if (type === 'Legal Entity' && !registrationDocumentNumber?.value.trim() && !registrationFile?.files?.length) issues.push({ control:registrationDocumentNumber, message:'Enter a state registration document number or upload the registration document.' });
  }
  if (index === 5) {
    const accounts = new Map<string, HTMLInputElement>();
    form.querySelectorAll<HTMLElement>('.client-bank-card').forEach(card => {
      const bank = card.querySelector<HTMLInputElement>('[name="bankName"]');
      const code = card.querySelector<HTMLInputElement>('[name="bankCode"]');
      const account = card.querySelector<HTMLInputElement>('[name="accountNumber"]');
      [bank, code, account].forEach(control => { if (control) control.value = control.value.trim(); });
      const started = Boolean(bank?.value || code?.value || account?.value);
      if (!started) return;
      if (!bank?.value) issues.push({ control:bank, message:'Enter the bank name for each configured account.' });
      if (!account?.value) issues.push({ control:account, message:'Enter the account number or IBAN for each configured bank.' });
      const normalizedAccount = normalizeClientIdentifier(account?.value);
      if (normalizedAccount && account) {
        const previous = accounts.get(normalizedAccount);
        if (previous) issues.push({ control:account, message:'The same bank account number cannot be added twice.' });
        else accounts.set(normalizedAccount, account);
      }
    });
  }
  return issues;
}

function validateClientCreateStep(index: number, includeDuplicates = false): boolean {
  const stepName = clientCreateSteps[index];
  const modal = clientCreateModalElement();
  const summary = document.getElementById('clientValidationSummary');
  if (!stepName || !modal) return true;
  const panel = modal.querySelector<HTMLElement>(`[data-client-create-panel="${stepName}"]`);
  const rail = modal.querySelector<HTMLElement>(`[data-client-create-step="${stepName}"]`);
  if (!panel) return true;
  const result = FleetFormUX.validate(panel, clientCreateCustomIssues(index, includeDuplicates), summary, `Step ${index + 1} needs attention`);
  rail?.classList.toggle('has-error', !result.valid);
  if (result.valid) rail?.classList.add('completed');
  else {
    rail?.classList.remove('completed');
    setClientCreateStep(stepName);
    FleetFormUX.renderSummary(summary, result.issues, `Step ${index + 1} needs attention`);
    FleetFormUX.focusFirst(result, summary);
  }
  return result.valid;
}

function validateBeforeClientCreateStep(targetIndex: number): boolean {
  if (targetIndex <= clientCreateCurrentStep) return true;
  for (let index = 0; index < targetIndex; index += 1) {
    if (!validateClientCreateStep(index)) return false;
  }
  return true;
}

function updateClientCreateReview(): void {
  const form = clientCreateFormElement();
  if (!form) return;
  const fd = new FormData(form);
  const type = formValue(fd.get('type')) || 'Individual';
  const identity = clientDraftName(form);
  const contact = type === 'Individual' ? identity : (formValue(fd.get('contactPerson')).trim() || identity);
  const set = (key: string, value: unknown, emptyLabel = 'Not entered') => {
    const element = form.querySelector<HTMLElement>(`[data-review-field="${key}"]`);
    if (element) element.textContent = formValue(value as FormDataEntryValue).trim() || emptyLabel;
  };
  set('tenant', fd.get('tenant'));
  set('type', type);
  set('identity', identity);
  set('contact', [contact, fd.get('email')].filter(Boolean).join(' · '));
  set('portal', fd.get('username'), 'Not configured');
  set('location', [fd.get('country'), fd.get('region'), fd.get('city'), fd.get('timezone')].filter(Boolean).join(' · '));
  const clientPassport = clientCreateControl<HTMLInputElement>('clientPassport')?.files?.[0]?.name || '';
  const stateDocument = clientCreateControl<HTMLInputElement>('stateRegistrationDocument')?.files?.[0]?.name || '';
  const projectDocument = clientCreateControl<HTMLInputElement>('projectDoc')?.files?.[0]?.name || '';
  set('documents', [clientPassport || fd.get('passportNumber'), stateDocument || fd.get('stateRegistrationNumber'), projectDocument].filter(Boolean).join(' · '), 'Not uploaded');
  const banks = Array.from(form.querySelectorAll<HTMLElement>('.client-bank-card')).map(card => {
    const name = card.querySelector<HTMLInputElement>('[name="bankName"]')?.value.trim() || '';
    const code = card.querySelector<HTMLInputElement>('[name="bankCode"]')?.value.trim() || '';
    const account = card.querySelector<HTMLInputElement>('[name="accountNumber"]')?.value.trim() || '';
    if (!name && !code && !account) return '';
    const currency = card.querySelector<HTMLSelectElement>('[name="accountCurrency"]')?.value || '';
    const primary = card.querySelector<HTMLInputElement>('[name="primaryBank"]')?.checked ? 'Primary' : '';
    return [primary, name, code, account, currency].filter(Boolean).join(' · ');
  }).filter(Boolean);
  set('banking', banks.join(' | '), 'Not entered');
}

function initClientDocumentList(modal: HTMLElement): void {
  if (modal.dataset.clientDocumentsReady) return;
  modal.dataset.clientDocumentsReady = 'true';
  modal.querySelectorAll<HTMLInputElement>('[data-doc-label]').forEach(input => input.addEventListener('change', () => {
    renderClientDocumentList();
    updateClientCreateReview();
  }));
  modal.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('[data-remove-doc]');
    if (!button) return;
    const label = button.dataset.removeDoc || 'document';
    if (!window.confirm(`Remove ${label} from the client draft?`)) return;
    const input = Array.from(modal.querySelectorAll<HTMLInputElement>('[data-doc-label]')).find(item => item.dataset.docLabel === label);
    if (input) input.value = '';
    renderClientDocumentList();
    updateClientCreateReview();
  });
  renderClientDocumentList();
}

function initClientBankList(modal: HTMLElement): void {
  const host = modal.querySelector<HTMLElement>('#clientBankList');
  const add = modal.querySelector<HTMLButtonElement>('#addClientBank');
  if (!host || !add || host.dataset.ready) return;
  host.dataset.ready = 'true';
  const refresh = () => {
    const cards = Array.from(host.querySelectorAll<HTMLElement>('.client-bank-card'));
    cards.forEach((card, index) => {
      card.dataset.bankIndex = String(index);
      const title = card.querySelector<HTMLElement>('.client-bank-head strong');
      if (title) title.textContent = `Bank ${index + 1}`;
      const radio = card.querySelector<HTMLInputElement>('[name="primaryBank"]');
      if (radio) radio.value = String(index);
      const remove = card.querySelector<HTMLButtonElement>('[data-remove-bank]');
      if (remove) remove.disabled = cards.length === 1;
    });
    if (!host.querySelector('[name="primaryBank"]:checked')) host.querySelector<HTMLInputElement>('[name="primaryBank"]')?.click();
    updateClientCreateReview();
  };
  const bindCard = (card: Element) => card.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', updateClientCreateReview);
    element.addEventListener('change', updateClientCreateReview);
  });
  host.querySelectorAll('.client-bank-card').forEach(bindCard);
  add.onclick = () => {
    const source = host.querySelector<HTMLElement>('.client-bank-card');
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLInputElement>('input').forEach(input => {
      if (input.type === 'radio') input.checked = false;
      else input.value = '';
    });
    clone.querySelectorAll<HTMLSelectElement>('select').forEach(select => { select.value = clientCreateControl<HTMLSelectElement>('currency')?.value || 'AMD'; });
    host.appendChild(clone);
    bindCard(clone);
    refresh();
  };
  host.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const remove = target.closest<HTMLElement>('[data-remove-bank]');
    if (!remove || host.querySelectorAll('.client-bank-card').length <= 1) return;
    if (!window.confirm('Remove this bank account from the client draft?')) return;
    remove.closest('.client-bank-card')?.remove();
    refresh();
  });
  refresh();
}

function createLocalClientId(): string {
  let id = `CL-${Date.now().toString(36).toUpperCase()}`;
  let suffix = 1;
  while (FleetClientModel.clients.some(client => client.id === id)) id = `CL-${Date.now().toString(36).toUpperCase()}-${suffix++}`;
  return id;
}

function clientCreateResponseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  let row = value as Record<string, unknown>;
  for (const key of ['data', 'client', 'result', 'item']) {
    const nested = row[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) row = nested as Record<string, unknown>;
  }
  return row;
}

function clientCreateBackendId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  const row = clientCreateResponseRecord(value);
  for (const key of ['id', 'clientId', 'canonicalId', 'sourceEntityId']) {
    const id = String(row[key] || '').trim();
    if (id) return id;
  }
  return '';
}

function clientCreateTenantId(): string {
  const runtime = (window as unknown as { FleetAPI?: { auth?: { getSession?: () => { user?: Record<string, unknown> | null; claims?: Record<string, unknown> } } } }).FleetAPI;
  const session = runtime?.auth?.getSession?.();
  const sources = [session?.user, session?.claims].filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));
  for (const source of sources) {
    for (const key of ['tenantId','tenant_id','managingTenantId','organizationId','organization_id']) {
      const value = String(source[key] || '').trim();
      if (value) return value;
    }
  }
  return '';
}

function clientCreateApiPayload(
  fd: FormData,
  type: string,
  fullName: string,
  contactPerson: string,
  bankAccounts: FleetBankAccount[],
  form: ClientForm
): Record<string, unknown> {
  const managingTenantId = clientCreateTenantId();
  const status = formValue(fd.get('status')).trim() || 'Pending';
  const firstName = type === 'Individual' ? formValue(fd.get('name')).trim() : null;
  const lastName = type === 'Individual' ? formValue(fd.get('surname')).trim() : null;
  const middleName = type === 'Individual' ? formValue(fd.get('lastName')).trim() || null : null;
  const companyName = type === 'Legal Entity' ? formValue(fd.get('companyName')).trim() : null;
  const dob = formValue(fd.get('dob')).trim();
  const dobMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob);
  const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : (dobMatch ? `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}` : null);
  const language = formValue(fd.get('language')) || formValue(fd.get('languageLegal')) || 'English';
  const identityRole = type === 'Individual' ? (formValue(fd.get('userRole')) || 'End User') : (formValue(fd.get('userRoleLegal')) || 'Owner Viewer');
  const portalRole = formValue(fd.get('portalRole')) || 'End User';
  const username = formValue(fd.get('username')).trim();
  const password = formValue(fd.get('password'));
  const primaryFullName = type === 'Individual' ? fullName : contactPerson;
  const passportNumber = String(form.querySelector<HTMLInputElement>('[name="passportNumber"]')?.value || '').trim();
  const legalRegistrationNumber = String(form.querySelector<HTMLInputElement>('[name="registrationNo"]')?.value || '').trim();
  const legalTaxId = String(form.querySelector<HTMLInputElement>('[name="taxId"]')?.value || '').trim();
  return {
    clientName: fullName,
    tenantLink: {
      managingTenantId: managingTenantId || null,
      clientType: type,
      status
    },
    identity: {
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      companyName,
      legalForm: type === 'Legal Entity' ? formValue(fd.get('legalForm')).trim() || null : null,
      registrationNumber: type === 'Legal Entity' ? legalRegistrationNumber || null : passportNumber || null,
      taxIdVatNumber: type === 'Legal Entity' ? legalTaxId || null : null,
      role: identityRole,
      preferredLanguage: language
    },
    address: {
      country: formValue(fd.get('country')).trim(),
      stateRegion: formValue(fd.get('region')).trim(),
      city: formValue(fd.get('city')).trim(),
      streetAddress: formValue(fd.get('address')).trim()
    },
    preferences: {
      timeZone: formValue(fd.get('timezone')) || 'Asia/Yerevan',
      temperatureUnit: formValue(fd.get('temperature')) || '°C',
      currency: formValue(fd.get('currency')) || 'AMD',
      irradiationUnit: formValue(fd.get('irradiation')) || 'kWh/m2',
      language
    },
    primaryContact: {
      phoneNumber1: formValue(fd.get('phone1')).trim(),
      phoneNumber2: formValue(fd.get('phone2')).trim() || null,
      email: formValue(fd.get('email')).trim().toLocaleLowerCase(),
      fullName: primaryFullName || null
    },
    portalAccount: {
      username,
      role: portalRole,
      temporaryPassword: password
    },
    documentation: {
      identityDocument: null,
      registrationDocument: null
    },
    bankAccounts: bankAccounts.map(account => ({
      bankName: String(account.bankName || account.bank || '').trim(),
      bankCode: String(account.bankCode || '').trim(),
      accountNumber: String(account.accountNumber || account.account || '').trim(),
      accountCurrency: String(account.accountCurrency || account.currency || '').trim(),
      primary: Boolean(account.primary)
    }))
  };
}

type ClientCreateUploadCandidate = { file:File; name:string; type:string; expiry:string };
function clientDocumentFileAllowed(file: File | undefined | null): boolean {
  if (!file) return false;
  const extension = file.name.split('.').pop()?.toLocaleLowerCase() || '';
  return ['pdf','doc','docx','jpg','jpeg','png'].includes(extension);
}
function clientCreateUploadCandidates(form: ClientForm): ClientCreateUploadCandidate[] {
  return Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"][data-doc-label]')).map(input => {
    const file = input.files?.[0];
    if (!clientDocumentFileAllowed(file)) return null;
    const safeFile = file!;
    const name = String(input.dataset.docLabel || safeFile.name || 'Client Document').trim();
    const type = String(input.dataset.docType || 'Other').trim();
    const expiryName = String(input.dataset.docExpiry || '').trim();
    const expiryControl = expiryName ? form.elements.namedItem(expiryName) as HTMLInputElement | null : null;
    return { file:safeFile, name, type, expiry:String(expiryControl?.value || '').trim() };
  }).filter((item):item is ClientCreateUploadCandidate=>Boolean(item));
}
async function uploadClientCreateDocuments(clientId:string,form:ClientForm):Promise<{uploaded:number;failures:string[]}>{const candidates=clientCreateUploadCandidates(form);if(!candidates.length)return{uploaded:0,failures:[]};let uploaded=0;const failures:string[]=[];for(const candidate of candidates){const result=await window.FleetAPIMutations.clients.uploadDocument(clientId,clientDocumentMultipart(candidate));if(result.ok)uploaded+=1;else failures.push(`${candidate.name}: ${result.error?.message||result.message||'upload failed'}`);}return{uploaded,failures};}

async function submitClientCreateForm(e: Event): Promise<void> {
  e.preventDefault();
  if (!FleetActionPermissions.guard({ action:'create', resource:'client' })) return;
  if (clientCreateSaving) return;
  const form = e.currentTarget as ClientForm;
  for (let index = 0; index < clientCreateSteps.length; index += 1) {
    const includeDuplicates = index === 1 || index === 3;
    if (!validateClientCreateStep(index, includeDuplicates)) return;
  }
  const fd = new FormData(form);
  const type = formValue(fd.get('type')) || 'Individual';
  const fullName = clientDraftName(form);
  const contactPerson = formValue(fd.get('contactPerson')).trim();
  const bankAccounts = Array.from(form.querySelectorAll<HTMLElement>('.client-bank-card')).map(card => ({
    bankName: card.querySelector<HTMLInputElement>('[name="bankName"]')?.value.trim() || '',
    bankCode: card.querySelector<HTMLInputElement>('[name="bankCode"]')?.value.trim() || '',
    accountNumber: card.querySelector<HTMLInputElement>('[name="accountNumber"]')?.value.trim() || '',
    accountCurrency: card.querySelector<HTMLSelectElement>('[name="accountCurrency"]')?.value || '',
    primary: Boolean(card.querySelector<HTMLInputElement>('[name="primaryBank"]')?.checked)
  })).filter(account => account.bankName || account.bankCode || account.accountNumber);
  const payload = clientCreateApiPayload(fd, type, fullName, contactPerson, bankAccounts, form);
  const saveButton = document.getElementById('saveClientCreate') as HTMLButtonElement | null;
  const summary = document.getElementById('clientValidationSummary');
  clientCreateSaving = true;
  if (saveButton) FleetFormUX.setBusy(saveButton, true, 'Creating Client…');
  try {
    if (!window.FleetAPIMutations) throw new Error('Client mutation runtime is unavailable.');
    const result = await FleetAPIMutations.clients.create(payload);
    if (!result.ok) {
      clientCreateSaving = false;
      if (saveButton) FleetFormUX.setBusy(saveButton, false);
      const detail = result.error.status ? `${result.message} (HTTP ${result.error.status})` : result.message;
      FleetFormUX.renderSummary(summary, [{ message: detail }], 'Client was not created');
      summary?.focus();
      return;
    }
    const backendId = clientCreateBackendId(result.data);
    if (backendId) {
      const uploads=await uploadClientCreateDocuments(backendId,form);
      if (uploads.failures.length) FleetLayout.toast(`Client created, but ${uploads.failures.length} document upload(s) failed.`);
      else if (uploads.uploaded) FleetLayout.toast(`Client created with ${uploads.uploaded} document${uploads.uploaded===1?'':'s'}.`);
    }
    clientCreateInitialSnapshot = clientCreateDraftSnapshot();
    window.FleetFormReadiness?.markCommitted(form);
    closeClientCreateModal(true);
    if (backendId) {
      FleetClientModel.selectClient(backendId);
      FleetLayout.toast('Client created in the backend. Opening Client Detail.');
      window.setTimeout(() => { location.href = `${FleetLayout.pathFor('client-detail')}?id=${encodeURIComponent(backendId)}`; }, 450);
    } else {
      FleetLayout.toast('Client created in the backend. Refreshing Client Registry.');
      window.setTimeout(() => { location.href = FleetLayout.pathFor('clients'); }, 450);
    }
  } catch (error) {
    clientCreateSaving = false;
    if (saveButton) FleetFormUX.setBusy(saveButton, false);
    FleetFormUX.renderSummary(summary, [{ message: error instanceof Error ? error.message : 'Unable to create the client through the backend.' }], 'Client was not created');
    summary?.focus();
  }
}


function clientRowsMarkup(rows: FleetClientRecord[]): string {
  if (!rows.length) return `<div class="empty-state-v28"><strong>No clients found</strong><small>Try changing search, type or status filters.</small></div>`;
  return `<div class="data-head"><span>Client</span><span>Legal / Identity</span><span>Assignment Scope</span><span>Access / Contract</span><span>Actions</span></div>${rows.map(c => {
    const k = FleetClientModel.countsForClient(c.id);
    return `<div class="data-row clickable-row" data-client="${c.id}"><div>${FleetDataSource.badge(c, 'client')}<strong>${c.name}</strong><small>${c.code}<br>${c.id}</small></div><div><strong>${c.type}</strong><small>${c.legalForm} · ${c.verification}<br>${c.country}, ${c.city}</small></div><div><strong>${k.plants} plants · ${k.capacity}</strong><small>${c.assignmentRole} · ${c.tenant}</small></div><div><span class="badge ${FleetClientModel.badge(c.status)}">${c.status}</span><small>${c.users} portal accounts · ${c.billing}</small></div><div class="row-actions"><button data-action="open" data-permission-action="view" data-permission-resource="client" data-permission-status="${clientDetailAttr(c.status)}" data-permission-origin="${clientDetailAttr(clientDetailOrigin(c))}">Open Client</button><button data-action="edit" data-permission-action="edit" data-permission-resource="client" data-permission-status="${clientDetailAttr(c.status)}" data-permission-origin="${clientDetailAttr(clientDetailOrigin(c))}" data-permission-update-available="false" data-permission-local-override="false">Edit</button></div></div>`;
  }).join('')}`;
}


type ClientDetailTabKey = 'overview' | 'identity' | 'location' | 'portal' | 'users' | 'plants' | 'commercial' | 'alerts' | 'activity';
type ClientDetailFeedbackTone = 'info' | 'warning' | 'danger' | 'success';

let clientDetailActiveTab: ClientDetailTabKey = 'overview';
let clientDetailEditMode = false;
let clientDetailDraft: FleetClientRecord | null = null;
let clientDetailEditSnapshot = '';
let clientDetailBusy = false;
let clientDetailBeforeUnloadBound = false;

function clientDetailEscape(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function clientDetailAttr(value: unknown): string { return clientDetailEscape(value).replace(/`/g, '&#096;'); }
function clientDetailClone(record: FleetClientRecord): FleetClientRecord { return JSON.parse(JSON.stringify(record)) as FleetClientRecord; }
function clientDetailOrigin(record: FleetClientRecord): FleetDataOrigin { return FleetEntityDetailUX.origin(record, 'client'); }
function clientDetailBackendManaged(record: FleetClientRecord): boolean { return FleetEntityDetailUX.backendManaged(record, 'client'); }
function clientDetailIsArchived(record: FleetClientRecord): boolean { return FleetEntityDetailUX.archived(record.status); }
function clientDetailEditableTab(tab: ClientDetailTabKey = clientDetailActiveTab): boolean { return ['overview','identity','location','portal','users','commercial'].includes(tab); }
function clientDetailCanEdit(record: FleetClientRecord, tab: ClientDetailTabKey = clientDetailActiveTab): boolean {
  return clientDetailBackendManaged(record) && !clientDetailIsArchived(record) && ['overview','identity','location','portal','commercial'].includes(tab);
}
function clientDetailFreshness(record: FleetClientRecord): string {
  return FleetEntityDetailUX.freshness(record, 'client', {
    timestampKeys:['lastSyncAt','updated','raw.lastSyncAt','raw.lastSyncAtUtc','raw.updatedAt']
  });
}
function clientDetailModeCopy(record: FleetClientRecord): { title: string; message: string; tone: ClientDetailFeedbackTone } {
  return FleetEntityDetailUX.modeCopy(record, 'client', {
    status:record.status,
    backendTitle:'Live client · backend update available',
    backendMessage:'Supported client fields are saved through PUT /api/admin/clients/{id}. Lifecycle changes use dedicated backend actions.',
    archivedTitle:'Archived client is read-only',
    archivedMessage:'Archived identity, portal and commercial data cannot be changed from this workspace.'
  });
}
function renderClientDetailControl(record: FleetClientRecord): string {
  const copy = clientDetailModeCopy(record);
  return `<section class="client-detail-control-v118 ${copy.tone}" id="clientDetailControl" data-client-detail-origin="${clientDetailOrigin(record)}" role="status" aria-live="polite" aria-busy="false">
    <div class="client-detail-control-source-v118"><span>Data source</span>${FleetDataSource.badge(record, 'client', true)}<small>${clientDetailEscape(clientDetailFreshness(record))}</small><span class="permission-profile-v121" data-permission-summary data-permission-resource="client"></span></div>
    <div class="client-detail-control-copy-v118"><strong>${clientDetailEscape(copy.title)}</strong><small>${clientDetailEscape(copy.message)}</small></div>
    <div class="client-detail-feedback-v118" id="clientDetailFeedback" hidden></div>
  </section>`;
}
function setClientDetailFeedback(tone: ClientDetailFeedbackTone, title: string, message: string): void {
  FleetEntityDetailUX.setFeedback({ id:'clientDetailFeedback', className:'client-detail-feedback-v118', tone, title, message, escape:clientDetailEscape });
}
function clearClientDetailFeedback(): void {
  FleetEntityDetailUX.clearFeedback('clientDetailFeedback', 'client-detail-feedback-v118');
}
function clientDetailDocumentsData(client: FleetClientRecord): FleetClientDocumentRecord[] {
  if (Array.isArray(client.documentRecords)) return client.documentRecords.map(item => ({ ...item }));
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const candidates = [raw.documentRecords, raw.clientDocuments, raw.documents].find(Array.isArray) as unknown[] | undefined;
  if (!candidates) return [];
  return candidates.map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const document: FleetClientDocumentRecord = {
      name:String(row.name || row.fileName || row.documentName || row.title || ''),
      type:String(row.type || row.documentType || row.category || 'Not provided'),
      status:String(row.status || row.documentStatus || 'Not provided'),
      expiry:String(row.expiry || row.expiryDate || row.validUntil || ''),
      uploaded:true
    };
    const id=String(row.id || row.documentId || '').trim();
    const fileName=String(row.fileName || row.filename || row.name || '').trim();
    const filePath=String(row.filePath || row.path || '').trim();
    if(id) document.id=id;
    if(fileName) document.fileName=fileName;
    if(filePath) document.filePath=filePath;
    return document;
  }).filter(item => Boolean(item.name));
}
function clientDetailPortalUsersData(client: FleetClientRecord, _plants: FleetPlantRecord[]): FleetPortalUser[] {
  return clientPortalUsers(client, []);
}

function clientDetailPrepareDraft(record: FleetClientRecord, plants: FleetPlantRecord[]): FleetClientRecord {
  const draft = clientDetailClone(record);
  draft.documentRecords = clientDetailDocumentsData(record);
  draft.portalUsers = clientDetailPortalUsersData(record, plants);
  draft.bankAccounts = Array.isArray(record.bankAccounts) ? record.bankAccounts.map(account => ({ ...account })) : [];
  return draft;
}
function clientDetailSnapshot(): string { return clientDetailDraft ? JSON.stringify(clientDetailDraft) : ''; }
function clientDetailHasUnsavedEdits(): boolean { return clientDetailEditMode && clientDetailEditSnapshot !== clientDetailSnapshot(); }
function clientDetailConfirmDiscard(message = 'Discard unsaved client changes?'): boolean {
  return FleetEntityDetailUX.confirmDiscard(clientDetailHasUnsavedEdits(), message);
}
function clientDetailSectionTitle(tab: ClientDetailTabKey): string {
  const titles: Record<ClientDetailTabKey, string> = {
    overview:'Client Overview', identity:'Identity', location:'Location & Preferences', portal:'Contacts & Portal', users:'Users & Access', plants:'Assigned Plants', commercial:'Commercial & Payments', alerts:'Alerts', activity:'Activity'
  };
  return titles[tab];
}
function clientDetailSectionContext(record: FleetClientRecord, tab: ClientDetailTabKey, editable = clientDetailEditMode): string {
  const mode = FleetEntityDetailUX.sectionMode({ editable, backendManaged:clientDetailBackendManaged(record), archived:clientDetailIsArchived(record), sectionEditable:clientDetailEditableTab(tab) });
  const help = editable ? 'Review the highlighted fields before saving.' : clientDetailEditableTab(tab) ? 'Values are loaded from the backend client record.' : 'This section is derived from linked API data.';
  return `<div class="client-section-context-v118"><div><span>${clientDetailEscape(mode)}</span><strong>${clientDetailEscape(clientDetailSectionTitle(tab))}</strong><small>${clientDetailEscape(help)}</small></div></div>`;
}
function clientDetailEditableValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || text === '—' || text.toLowerCase() === 'not provided' || text.toLowerCase() === 'not configured') return '';
  return text;
}
function clientDetailInput(key: keyof FleetClientRecord, label: string, value: unknown, options?: string[], type = 'text', required = false): string {
  const req = required ? ' required' : '';
  const editableValue = clientDetailEditableValue(value);
  const safeValue = clientDetailAttr(editableValue);
  if (options) {
    const normalizedOptions = [...options];
    if (editableValue && !normalizedOptions.includes(editableValue)) normalizedOptions.push(editableValue);
    if ((!required || !editableValue) && !normalizedOptions.includes('')) normalizedOptions.unshift('');
    return `<label>${clientDetailEscape(label)}${required ? ' *' : ''}<select data-client-edit-key="${String(key)}" name="client-edit-${String(key)}"${req}>${normalizedOptions.map(option => `<option value="${clientDetailAttr(option)}" ${editableValue === option ? 'selected' : ''}>${clientDetailEscape(option || 'Not set')}</option>`).join('')}</select></label>`;
  }
  const textarea = ['address','accessScope','exportPolicy','billing','onboarding'].includes(String(key));
  if (textarea) return `<label>${clientDetailEscape(label)}${required ? ' *' : ''}<textarea data-client-edit-key="${String(key)}" name="client-edit-${String(key)}"${req}>${clientDetailEscape(editableValue)}</textarea></label>`;
  return `<label>${clientDetailEscape(label)}${required ? ' *' : ''}<input type="${type}" data-client-edit-key="${String(key)}" name="client-edit-${String(key)}" value="${safeValue}"${req}></label>`;
}
function clientDetailDocumentsEditor(client: FleetClientRecord): string {
  const rows = client.documentRecords || [];
  const allowedTypes = ['Identity','Legal','Commercial','Finance','Compliance','Access','Assignment'];
  return `<div class="tenant-detail-table-head-v117"><div><h3>Client Documents</h3><p class="muted">Upload through POST /api/admin/clients/{id}/documents. Allowed files: PDF, DOC, DOCX, JPG, JPEG, PNG.</p></div><button class="small-btn primary" type="button" data-add-client-document>Add Document</button></div>
    <div class="data-table compact-table client-document-editor-v118">
      <div class="data-head"><span>Document</span><span>Type</span><span>Status</span><span>Expiry</span><span>File</span><span>Actions</span></div>
      ${rows.length ? rows.map((doc,index) => { const isNew = !doc.id && !doc.filePath; return `<div class="data-row" data-client-document-row="${index}"><label><span class="sr-only">Document name</span><input value="${clientDetailAttr(doc.name)}" data-client-document-field="name" ${isNew ? '' : 'readonly'} required></label><label><span class="sr-only">Document type</span><select data-client-document-field="type" ${isNew ? '' : 'disabled'}>${allowedTypes.map(type => `<option ${doc.type===type?'selected':''}>${type}</option>`).join('')}</select></label><label><span class="sr-only">Document status</span><input value="${clientDetailAttr(doc.status || (isNew ? 'Pending' : ''))}" readonly></label><label><span class="sr-only">Expiry</span><input type="date" value="${clientDetailAttr(doc.expiry || '')}" data-client-document-field="expiry" ${isNew ? '' : 'readonly'}></label><div class="tenant-document-file-field">${isNew ? `<label class="tenant-document-file-picker"><span class="small-btn">Choose File</span><input class="tenant-document-file-input-v117" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-client-document-file="${index}"></label><small data-client-document-file-name="${index}">${clientDetailEscape(doc.fileName || 'No file selected')}</small>` : `<strong>${clientDetailEscape(doc.fileName || doc.name || 'Uploaded')}</strong>`}</div><div class="row-actions">${isNew ? `<button class="danger-action" type="button" data-remove-client-document="${index}">Remove</button>` : `<button type="button" data-client-document-download="${clientDetailAttr(String(doc.id || doc.filePath || ''))}">Download</button><button class="danger-action" type="button" data-delete-client-document="${clientDetailAttr(String(doc.id || doc.filePath || ''))}">Delete</button>`}</div></div>`; }).join('') : `<div class="empty-state"><strong>No client documents</strong><small>Click Add Document to attach the first backend document.</small></div>`}
    </div>`;
}
function clientDetailUsersEditor(client: FleetClientRecord): string {
  const users = client.portalUsers || [];
  return `<div class="section-title-v17"><div><h2>Users & Access</h2><p class="muted">Local portal-access prototype. No user account or invitation is sent to the backend.</p></div><button class="small-btn" type="button" data-add-client-user>+ Add User</button></div>
    <div class="data-table compact-table client-user-editor-v118"><div class="data-head"><span>User</span><span>Role</span><span>Scope</span><span>Modules</span><span>Status / MFA</span><span>Actions</span></div>
    ${users.length ? users.map((user,index) => `<div class="data-row" data-client-user-row="${index}"><div class="stacked-fields-v118"><input aria-label="User name" placeholder="Full name" value="${clientDetailAttr(user.name)}" data-client-user-field="name" required><input type="email" aria-label="User email" placeholder="Email" value="${clientDetailAttr(user.email)}" data-client-user-field="email" required></div><select aria-label="Portal role" data-client-user-field="role"><option ${user.role==='Owner User'?'selected':''}>Owner User</option><option ${user.role==='Client Admin'?'selected':''}>Client Admin</option><option ${user.role==='Finance Contact'?'selected':''}>Finance Contact</option><option ${user.role==='Technical Viewer'?'selected':''}>Technical Viewer</option><option ${user.role==='Read-only Auditor'?'selected':''}>Read-only Auditor</option></select><input aria-label="User scope" value="${clientDetailAttr(user.scope)}" data-client-user-field="scope"><input aria-label="Allowed modules" value="${clientDetailAttr(user.modules)}" data-client-user-field="modules"><div class="stacked-fields-v118"><select aria-label="User status" data-client-user-field="status"><option ${user.status==='Active'?'selected':''}>Active</option><option ${user.status==='Invited'?'selected':''}>Invited</option><option ${user.status==='Pending'?'selected':''}>Pending</option><option ${user.status==='Suspended'?'selected':''}>Suspended</option></select><select aria-label="MFA state" data-client-user-field="mfa"><option ${user.mfa==='Enabled'?'selected':''}>Enabled</option><option ${user.mfa==='Recommended'?'selected':''}>Recommended</option><option ${user.mfa==='Required'?'selected':''}>Required</option><option ${user.mfa==='Disabled'?'selected':''}>Disabled</option></select></div><div class="row-actions single-action"><button class="danger-action" type="button" data-remove-client-user="${index}">Remove</button></div></div>`).join('') : `<div class="empty-state"><strong>No portal users</strong><small>No portal-user records were returned by the backend.</small></div>`}</div>`;
}
function clientDetailBankEditor(client: FleetClientRecord): string {
  const accounts = client.bankAccounts || [];
  return `<div class="section-title-v17 mini"><div><h3>Bank Accounts</h3><p class="muted">Payment metadata is displayed only when returned by the backend.</p></div><button class="small-btn" type="button" data-add-client-bank>+ Add Bank</button></div>
    <div class="data-table compact-table client-bank-editor-v118"><div class="data-head"><span>Bank</span><span>Code</span><span>Account Number</span><span>Currency</span><span>Primary</span><span>Actions</span></div>
    ${accounts.length ? accounts.map((account,index) => `<div class="data-row" data-client-bank-row="${index}"><input aria-label="Bank name" value="${clientDetailAttr(account.bankName)}" data-client-bank-field="bankName" required><input aria-label="Bank code" value="${clientDetailAttr(account.bankCode)}" data-client-bank-field="bankCode"><input aria-label="Account number" value="${clientDetailAttr(account.accountNumber)}" data-client-bank-field="accountNumber" required><select aria-label="Account currency" data-client-bank-field="accountCurrency"><option ${account.accountCurrency==='AMD'?'selected':''}>AMD</option><option ${account.accountCurrency==='USD'?'selected':''}>USD</option><option ${account.accountCurrency==='EUR'?'selected':''}>EUR</option></select><label class="inline-check-v118"><input type="radio" name="client-primary-bank" ${account.primary?'checked':''} data-client-bank-primary="${index}"><span>Primary</span></label><div class="row-actions single-action"><button class="danger-action" type="button" data-remove-client-bank="${index}">Remove</button></div></div>`).join('') : `<div class="empty-state"><strong>No bank accounts</strong><small>Banking is optional until a commercial settlement is configured.</small></div>`}</div>`;
}
function clientDetailEditTab(client: FleetClientRecord, plants: FleetPlantRecord[], tab: ClientDetailTabKey): string {
  if (tab === 'identity') return `${clientDetailSectionContext(client, tab, true)}<div class="section-title-v17"><div><h2>Identity</h2><p class="muted">Edit canonical client identity fields supported by PUT /api/admin/clients/{id}.</p></div></div><div class="client-edit-grid-v118">${clientDetailInput('type','Client Type',client.type,['Individual','Legal Entity'],'text',true)}${clientDetailInput('name',client.type==='Individual'?'Full Name':'Legal Name',client.name,undefined,'text',true)}${clientDetailInput('legalForm','Legal Form',client.legalForm,undefined,'text',client.type!=='Individual')}${clientDetailInput('dob','Date of Birth',client.dob || '',undefined,'date',false)}${clientDetailInput('registrationNo',client.type==='Individual'?'Passport / Personal ID':'Registration Number',client.registrationNo,undefined,'text',true)}${clientDetailInput('taxId','Tax / Personal ID',client.taxId,undefined,'text',client.type!=='Individual')}${clientDetailInput('identityRole','Identity Role',client.identityRole || client.assignmentRole,undefined,'text',true)}<label>Verification<input type="text" value="${clientDetailAttr(client.verification || '—')}" readonly aria-readonly="true"><small class="field-help">Read-only backend verification result.</small></label><label>Client Status<input type="text" value="${clientDetailAttr(client.status || '—')}" readonly aria-readonly="true"><small class="field-help">Use Lifecycle Actions to change it.</small></label><label>Account Manager<input type="text" value="${clientDetailAttr(client.account || '—')}" readonly aria-readonly="true"><small class="field-help">The current Client update contract does not accept this field.</small></label></div>${clientDetailDocumentsEditor(client)}`;
  if (tab === 'location') return `${clientDetailSectionContext(client, tab, true)}<div class="section-title-v17"><div><h2>Location & Preferences</h2><p class="muted">Client geography and End User display preferences.</p></div></div><div class="client-edit-grid-v118">${clientDetailInput('country','Country',client.country,['Armenia','United States','Germany','Spain'],'text',true)}${clientDetailInput('region','Region',client.region || '',undefined,'text',true)}${clientDetailInput('city','City',client.city,undefined,'text',true)}${clientDetailInput('address','Address',client.address,undefined,'text',true)}${clientDetailInput('timezone','Time Zone',client.timezone || 'Asia/Yerevan',undefined,'text',true)}${clientDetailInput('language','Language',client.language || 'English',['English','Armenian','German','Spanish'],'text',true)}${clientDetailInput('temperature','Temperature',client.temperature || '°C',['°C','°F'])}${clientDetailInput('currency','Currency',client.currency || 'AMD',['AMD','USD','EUR'])}${clientDetailInput('irradiation','Irradiation',client.irradiation || 'kWh/m2',['kWh/m2','W/m2'])}</div>`;
  if (tab === 'portal') return `${clientDetailSectionContext(client, tab, true)}<div class="section-title-v17"><div><h2>Contacts & Portal</h2><p class="muted">Edit the primary contact and portal account fields supported by PUT /api/admin/clients/{id}.</p></div></div><div class="client-edit-grid-v118">${clientDetailInput('primaryContact','Primary Contact',client.primaryContact,undefined,'text',true)}${clientDetailInput('contactEmail','Email',client.contactEmail,undefined,'email',true)}${clientDetailInput('contactPhone','Phone Number 1',client.contactPhone,undefined,'tel',true)}${clientDetailInput('phone2','Phone Number 2',client.phone2 || '',undefined,'tel')}${clientDetailInput('username','Portal Username',client.username || '',undefined,'text')}${clientDetailInput('portalRole','Portal Role',client.portalRole || client.assignmentRole,undefined,'text',true)}<label>Plant / Data Scope<textarea readonly aria-readonly="true">${clientDetailEscape(clientDetailEditableValue(client.accessScope) || '—')}</textarea><small class="field-help">Read-only until the backend exposes a supported access-scope update contract.</small></label><label>Export Policy<textarea readonly aria-readonly="true">${clientDetailEscape(clientDetailEditableValue(client.exportPolicy) || '—')}</textarea><small class="field-help">Read-only backend policy.</small></label><label>Onboarding State<textarea readonly aria-readonly="true">${clientDetailEscape(clientDetailEditableValue(client.onboarding) || '—')}</textarea><small class="field-help">Read-only workflow state.</small></label></div>`;
  if (tab === 'users') return `${clientDetailSectionContext(client, tab, true)}${clientDetailUsersEditor(client)}`;
  if (tab === 'commercial') return `${clientDetailSectionContext(client, tab, true)}<div class="section-title-v17"><div><h2>Commercial & Payments</h2><p class="muted">Bank accounts are supported by the current Client update contract. Billing Profile and Support Tier remain read-only.</p></div></div><div class="client-edit-grid-v118"><label>Billing Profile<textarea readonly aria-readonly="true">${clientDetailEscape(clientDetailEditableValue(client.billing) || '—')}</textarea><small class="field-help">The current Client update contract does not accept this field.</small></label><label>Support Tier<input type="text" value="${clientDetailAttr(client.supportTier || '—')}" readonly aria-readonly="true"><small class="field-help">Read-only until a supported commercial update contract is available.</small></label></div>${clientDetailBankEditor(client)}`;
  return `${clientDetailSectionContext(client, tab, false)}${clientTab(client, plants, tab, false, true)}`;
}
function clientDetailSyncControlToDraft(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
  if (!clientDetailDraft) return;
  const key = control.dataset.clientEditKey;
  if (!key) return;
  clientDetailDraft[key] = control.value;
}
function clientDetailValidationIssues(record: FleetClientRecord, tab: ClientDetailTabKey, root: HTMLElement): FleetFormIssue[] {
  const issues: FleetFormIssue[] = [];
  const byKey = (key: string): FleetFormControl | null => root.querySelector<FleetFormControl>(`[data-client-edit-key="${key}"]`);
  const duplicate = (predicate: (client: FleetClientRecord) => boolean): boolean => FleetClientModel.clients.some(client => client.id !== record.id && predicate(client));
  if (tab === 'identity') {
    if (duplicate(client => client.name.trim().toLowerCase() === record.name.trim().toLowerCase())) issues.push({ control:byKey('name'), message:'Another client already uses this name.' });
    if (record.registrationNo && duplicate(client => String(client.registrationNo || '').trim().toLowerCase() === record.registrationNo.trim().toLowerCase())) issues.push({ control:byKey('registrationNo'), message:'Another client already uses this registration or identity number.' });
    if (record.taxId && record.taxId !== 'Not provided' && duplicate(client => String(client.taxId || '').trim().toLowerCase() === record.taxId.trim().toLowerCase())) issues.push({ control:byKey('taxId'), message:'Another client already uses this Tax ID.' });
    const docs = record.documentRecords || [];
    const names = docs.map(doc => doc.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) issues.push({ message:'Document names must be unique within the client record.' });
    docs.forEach((doc,index) => {
      const row = root.querySelector<HTMLElement>(`[data-client-document-row="${index}"]`);
      if (!doc.name.trim()) issues.push({ control:row?.querySelector<HTMLInputElement>('[data-client-document-field="name"]') || null, message:`Document ${index + 1} requires a name.` });
      if (!doc.type.trim() || !doc.status.trim()) issues.push({ message:`Document ${index + 1} requires a type and status.` });
    });
  }
  if (tab === 'portal') {
    const email = record.contactEmail.trim().toLowerCase();
    if (email && duplicate(client => String(client.contactEmail || '').trim().toLowerCase() === email)) issues.push({ control:byKey('contactEmail'), message:'Another client already uses this contact email.' });
    const username = String(record.username || '').trim().toLowerCase();
    if (username && duplicate(client => String(client.username || '').trim().toLowerCase() === username)) issues.push({ control:byKey('username'), message:'Another client already uses this portal username.' });
  }
  if (tab === 'users') {
    const users = record.portalUsers || [];
    const emails = users.map(user => user.email.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) issues.push({ message:'Portal user emails must be unique.' });
    if ((record.username || record.status === 'Active') && !users.length) issues.push({ message:'An active or configured portal client requires at least one portal user.' });
    if (users.length && !users.some(user => ['Owner User','Client Admin'].includes(user.role) && user.status !== 'Suspended')) issues.push({ message:'At least one non-suspended Owner User or Client Admin is required.' });
    users.forEach((user,index) => {
      const row = root.querySelector<HTMLElement>(`[data-client-user-row="${index}"]`);
      if (!user.name.trim()) issues.push({ control:row?.querySelector<HTMLInputElement>('[data-client-user-field="name"]') || null, message:`Portal user ${index + 1} requires a name.` });
      if (!user.email.trim()) issues.push({ control:row?.querySelector<HTMLInputElement>('[data-client-user-field="email"]') || null, message:`Portal user ${index + 1} requires an email.` });
    });
  }
  if (tab === 'commercial') {
    const accounts = record.bankAccounts || [];
    const accountNumbers = accounts.map(account => account.accountNumber.trim().toLowerCase()).filter(Boolean);
    if (new Set(accountNumbers).size !== accountNumbers.length) issues.push({ message:'Bank account numbers must be unique.' });
    accounts.forEach((account,index) => {
      const row = root.querySelector<HTMLElement>(`[data-client-bank-row="${index}"]`);
      if (!account.bankName.trim()) issues.push({ control:row?.querySelector<HTMLInputElement>('[data-client-bank-field="bankName"]') || null, message:`Bank account ${index + 1} requires a bank name.` });
      if (!account.accountNumber.trim()) issues.push({ control:row?.querySelector<HTMLInputElement>('[data-client-bank-field="accountNumber"]') || null, message:`Bank account ${index + 1} requires an account number.` });
    });
    if (accounts.length && !accounts.some(account => account.primary)) issues.push({ message:'Select one primary bank account.' });
  }
  return issues;
}
function updateClientDetailActions(record: FleetClientRecord): void {
  const edit = document.getElementById('editClientTab') as HTMLButtonElement | null;
  const cancel = document.getElementById('cancelClientEdit') as HTMLButtonElement | null;
  const save = document.getElementById('saveClientEdit') as HTMLButtonElement | null;
  const canEdit = clientDetailCanEdit(record);
  if (edit) {
    edit.hidden = clientDetailEditMode;
    edit.disabled = clientDetailBusy || !canEdit;
    edit.title = canEdit ? 'Edit this client section' : clientDetailIsArchived(record) ? 'Archived clients are read-only' : 'This section has no writable Client API contract';
  }
  if (cancel) cancel.hidden = !clientDetailEditMode;
  if (save) save.hidden = !clientDetailEditMode;
}
function renderClientDetailCurrentTab(baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  const record = clientDetailEditMode && clientDetailDraft ? clientDetailDraft : baseRecord;
  const content = document.getElementById('clientTabContent');
  if (content) content.innerHTML = clientTab(record, plants, clientDetailActiveTab, clientDetailEditMode);
  const title = document.getElementById('clientDetailActiveTitle');
  if (title) title.textContent = clientDetailSectionTitle(clientDetailActiveTab);
  updateClientDetailActions(baseRecord);
}
function setClientDetailEditMode(enabled: boolean, baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (clientDetailBusy) return;
  if (enabled && clientDetailActiveTab === 'overview') {
    clientDetailActiveTab = 'identity';
    document.querySelectorAll<HTMLElement>('[data-client-tab]').forEach(item => {
      const active = item.dataset.clientTab === 'identity';
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current','page');
      else item.removeAttribute('aria-current');
    });
  }
  if (enabled && !clientDetailCanEdit(baseRecord)) {
    const copy = clientDetailModeCopy(baseRecord);
    setClientDetailFeedback(copy.tone, copy.title, copy.message);
    return;
  }
  if (!enabled && clientDetailEditMode && !clientDetailConfirmDiscard()) return;
  clientDetailEditMode = enabled;
  clientDetailDraft = enabled ? clientDetailPrepareDraft(baseRecord, plants) : null;
  clientDetailEditSnapshot = enabled ? clientDetailSnapshot() : '';
  const summary = document.getElementById('clientDetailEditSummary');
  if (summary) { summary.hidden = true; summary.innerHTML = ''; }
  clearClientDetailFeedback();
  renderClientDetailCurrentTab(baseRecord, plants);
}
function clientApiNullableScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null;
  const text = String(value).trim();
  if (!text || text === '—' || text.toLowerCase() === 'not provided' || text.toLowerCase() === 'not configured') return null;
  return text;
}
function clientApiDateOnly(value: unknown): string | null {
  const text = clientApiNullableScalar(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return display ? `${display[3]}-${display[2]}-${display[1]}` : null;
}
function clientApiDocumentReference(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function clientDetailApiPayload(record: FleetClientRecord): Record<string, unknown> {
  const raw = record.raw && typeof record.raw === 'object' ? record.raw as Record<string, unknown> : {};
  const rawTenantLink = raw.tenantLink && typeof raw.tenantLink === 'object' && !Array.isArray(raw.tenantLink) ? raw.tenantLink as Record<string, unknown> : {};
  const rawIdentity = raw.identity && typeof raw.identity === 'object' && !Array.isArray(raw.identity) ? raw.identity as Record<string, unknown> : {};
  const rawPortal = raw.portalAccount && typeof raw.portalAccount === 'object' && !Array.isArray(raw.portalAccount) ? raw.portalAccount as Record<string, unknown> : {};
  const rawAddress = raw.address && typeof raw.address === 'object' && !Array.isArray(raw.address) ? raw.address as Record<string, unknown> : {};
  const rawPreferences = raw.preferences && typeof raw.preferences === 'object' && !Array.isArray(raw.preferences) ? raw.preferences as Record<string, unknown> : {};
  const rawPrimary = raw.primaryContact && typeof raw.primaryContact === 'object' && !Array.isArray(raw.primaryContact) ? raw.primaryContact as Record<string, unknown> : {};
  const rawDocumentation = raw.documentation && typeof raw.documentation === 'object' && !Array.isArray(raw.documentation) ? raw.documentation as Record<string, unknown> : {};
  const managingTenantId = String(rawTenantLink.managingTenantId || raw.managingTenantId || raw.tenantId || '').trim();
  const nameParts = String(record.name || '').trim().split(/\s+/).filter(Boolean);
  const isIndividual = String(record.type || rawTenantLink.clientType || '').toLowerCase().includes('individual');
  const currentPortalUsername = String(record.username || record.portalUsername || '').trim();
  const originalPortalUsername = String(rawPortal.username || '').trim();
  const portalAccountPayload: Record<string, unknown> = { role: clientApiNullableScalar(record.portalRole) || clientApiNullableScalar(record.assignmentRole) || clientApiNullableScalar(rawPortal.role) };
  if (currentPortalUsername && currentPortalUsername !== originalPortalUsername) portalAccountPayload.username = currentPortalUsername;
  return {
    clientName:String(record.name || '').trim(),
    tenantLink:{ managingTenantId:managingTenantId || null, clientType:String(record.type || rawTenantLink.clientType || '').trim() },
    identity:{ firstName:isIndividual ? String(rawIdentity.firstName || nameParts[0] || '').trim() || null : null, lastName:isIndividual ? String(rawIdentity.lastName || nameParts[1] || '').trim() || null : null, middleName:isIndividual ? String(rawIdentity.middleName || nameParts.slice(2).join(' ') || '').trim() || null : null, dateOfBirth:clientApiDateOnly(record.dob) || clientApiDateOnly(rawIdentity.dateOfBirth), companyName:isIndividual ? null : String(record.name || rawIdentity.companyName || '').trim() || null, legalForm:clientApiNullableScalar(record.legalForm) || clientApiNullableScalar(rawIdentity.legalForm), registrationNumber:clientApiNullableScalar(record.registrationNo) || clientApiNullableScalar(rawIdentity.registrationNumber), taxIdVatNumber:clientApiNullableScalar(record.taxId) || clientApiNullableScalar(rawIdentity.taxIdVatNumber), role:clientApiNullableScalar(record.identityRole) || clientApiNullableScalar(rawIdentity.role), preferredLanguage:String(record.language || rawIdentity.preferredLanguage || 'English').trim() },
    address:{ country:String(record.country || '').trim(), stateRegion:String(record.region || '').trim(), city:String(record.city || '').trim(), streetAddress:clientApiNullableScalar(record.address) || clientApiNullableScalar(rawAddress.streetAddress) || '' },
    preferences:{ timeZone:String(clientApiNullableScalar(record.timezone) || clientApiNullableScalar(rawPreferences.timeZone) || '').trim(), temperatureUnit:String(clientApiNullableScalar(record.temperature) || clientApiNullableScalar(rawPreferences.temperatureUnit) || '').trim(), currency:String(clientApiNullableScalar(record.currency) || clientApiNullableScalar(rawPreferences.currency) || '').trim(), irradiationUnit:String(clientApiNullableScalar(record.irradiation) || clientApiNullableScalar(rawPreferences.irradiationUnit) || '').trim(), language:String(clientApiNullableScalar(record.language) || clientApiNullableScalar(rawPreferences.language) || clientApiNullableScalar(rawIdentity.preferredLanguage) || '').trim() },
    primaryContact:{ phoneNumber1:clientApiNullableScalar(record.contactPhone) || clientApiNullableScalar(rawPrimary.phoneNumber1), phoneNumber2:clientApiNullableScalar(record.phone2) || clientApiNullableScalar(rawPrimary.phoneNumber2), email:(clientApiNullableScalar(record.contactEmail) || clientApiNullableScalar(rawPrimary.email))?.toLocaleLowerCase() || null, fullName:clientApiNullableScalar(record.primaryContact) || clientApiNullableScalar(rawPrimary.fullName) },
    portalAccount:portalAccountPayload,
    documentation:{ identityDocument:clientApiDocumentReference(rawDocumentation.identityDocument), registrationDocument:clientApiDocumentReference(rawDocumentation.registrationDocument) },
    bankAccounts:Array.isArray(record.bankAccounts) ? record.bankAccounts.map(account => { const payload:Record<string,unknown>={ bankName:String(account.bankName || account.bank || '').trim(), bankCode:String(account.bankCode || '').trim(), accountNumber:String(account.accountNumber || account.account || '').trim(), accountCurrency:String(account.accountCurrency || account.currency || '').trim(), primary:Boolean(account.primary) }; if(account.id)payload.id=account.id; return payload; }) : []
  };
}
function normalizeClientDocumentType(value: string): string {
  const raw = String(value || '').trim();
  const aliases: Record<string,string> = { identity:'Identity', passport:'Identity', registration:'Legal', legal:'Legal', project:'Commercial', commercial:'Commercial', finance:'Finance', compliance:'Compliance', access:'Access', assignment:'Assignment' };
  return aliases[raw.toLowerCase()] || raw || 'Legal';
}
function clientDocumentMultipart(candidate: { file:File; name:string; type:string; expiry?:string }): FormData {
  const payload = new FormData();
  payload.append('file', candidate.file, candidate.file.name);
  payload.append('name', candidate.name || candidate.file.name);
  payload.append('type', normalizeClientDocumentType(candidate.type));
  if (candidate.expiry) { const parsed = new Date(`${candidate.expiry}T00:00:00`); payload.append('expiry', Number.isNaN(parsed.getTime()) ? candidate.expiry : parsed.toISOString()); }
  return payload;
}
async function uploadClientDetailDocuments(clientId: string, docs: FleetClientDocumentRecord[]): Promise<{ uploaded:number; failures:string[] }> {
  const candidates = docs.filter(doc => doc.localFile instanceof File && !doc.id && !doc.filePath);
  if (!candidates.length) return { uploaded:0, failures:[] };
  if (!window.FleetAPIMutations?.clients?.uploadDocument) return { uploaded:0, failures:candidates.map(doc => `${doc.name || doc.localFile?.name || 'Document'}: upload API unavailable`) };
  let uploaded = 0; const failures: string[] = [];
  for (const doc of candidates) { const candidate = { file:doc.localFile!, name:doc.name || doc.localFile!.name, type:doc.type || 'Legal', expiry:doc.expiry || '' }; const result = await window.FleetAPIMutations.clients.uploadDocument(clientId, clientDocumentMultipart(candidate)); if (result.ok) uploaded += 1; else failures.push(`${candidate.name}: ${result.error?.message || result.message || 'upload failed'}`); }
  return { uploaded, failures };
}
async function saveClientDetailEdits(baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): Promise<void> {
  if (!clientDetailEditMode || !clientDetailDraft || clientDetailBusy) return;
  const backendManaged = clientDetailBackendManaged(baseRecord);
  if (!FleetActionPermissions.guard({ action:'edit', resource:'client', record:baseRecord, status:baseRecord.status, origin:clientDetailOrigin(baseRecord), updateAvailable:backendManaged, localOverride:!backendManaged })) return;
  if (!clientDetailCanEdit(baseRecord)) { const copy=clientDetailModeCopy(baseRecord); setClientDetailFeedback(copy.tone,copy.title,copy.message); return; }
  const content = document.getElementById('clientTabContent'); const summary = document.getElementById('clientDetailEditSummary'); if (!content) return;
  const validation = FleetFormUX.validate(content, clientDetailValidationIssues(clientDetailDraft, clientDetailActiveTab, content), summary, 'Client changes were not saved'); if (!validation.valid) { FleetFormUX.focusFirst(validation, summary); return; }
  const button = document.getElementById('saveClientEdit') as HTMLButtonElement | null; clientDetailBusy = true; document.getElementById('clientDetailControl')?.setAttribute('aria-busy','true'); if (button) FleetFormUX.setBusy(button, true, backendManaged ? 'Saving to API…' : 'Saving…');
  try {
    if (backendManaged) {
      if (!window.FleetAPIMutations?.clients?.update) throw new Error('Client update API runtime is unavailable.');
      const result = await window.FleetAPIMutations.clients.update(baseRecord.id, clientDetailApiPayload(clientDetailDraft));
      if (!result.ok) throw new Error(result.error?.message || result.message || 'Backend rejected the client update.');
      const documentUpload = await uploadClientDetailDocuments(baseRecord.id, clientDetailDraft.documentRecords || []);
      if (documentUpload.failures.length) throw new Error(`Client profile was saved, but ${documentUpload.failures.length} document upload(s) failed: ${documentUpload.failures.join(' | ')}`);
      const refreshed = await window.FleetAPIRepositories?.clients?.get(baseRecord.id, { forceRefresh:true }).catch(() => null);
      const apiRecord = refreshed?.item as FleetClientRecord | null | undefined; if (apiRecord?.id) Object.assign(baseRecord, apiRecord);
      clientDetailEditMode=false; clientDetailDraft=null; clientDetailEditSnapshot=''; clientDetailBusy=false; renderClientDetailPage(); setClientDetailFeedback('success','Client updated','Changes were saved through PUT /api/admin/clients/{id}.'); return;
    }
    const changed = FleetDataSource.markChanged({ ...clientDetailDraft, updated:new Date().toLocaleString() }, 'client') as FleetClientRecord; changed.documents = changed.documentRecords?.length || 0; changed.users = changed.portalUsers?.length || 0; Object.assign(baseRecord, changed); FleetLocalStore.addClient(baseRecord); clientDetailEditMode=false; clientDetailDraft=null; clientDetailEditSnapshot=''; clientDetailBusy=false; renderClientDetailPage(); setClientDetailFeedback('success','Client section saved locally','This local/session record was updated in browser storage.');
  } catch (error) { clientDetailBusy=false; document.getElementById('clientDetailControl')?.setAttribute('aria-busy','false'); if (button) FleetFormUX.setBusy(button,false); FleetFormUX.renderSummary(summary,[{ message:error instanceof Error ? error.message : 'Unable to save the client.' }],'Client changes were not saved'); summary?.focus(); }
}
function addClientDetailDocument(baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft) return;
  clientDetailDraft.documentRecords = clientDetailDraft.documentRecords || [];
  clientDetailDraft.documentRecords.push({ name:'', type:'Legal', status:'Pending' });
  renderClientDetailCurrentTab(baseRecord, plants);
}
function selectClientDetailDocumentFile(input: HTMLInputElement): void {
  if (!clientDetailDraft) return;
  const index = Number(input.dataset.clientDocumentFile); const file = input.files?.[0];
  if (!Number.isInteger(index) || !file || !clientDetailDraft.documentRecords?.[index]) return;
  if (!/\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(file.name)) { input.value=''; setClientDetailFeedback('danger','Unsupported document type','Allowed document formats: PDF, DOC, DOCX, JPG, JPEG, PNG.'); return; }
  const doc=clientDetailDraft.documentRecords[index]!; doc.localFile=file; doc.fileName=file.name; if (!doc.name.trim()) doc.name=file.name.replace(/\.[^.]+$/,'');
  const row=input.closest<HTMLElement>('[data-client-document-row]'); const nameInput=row?.querySelector<HTMLInputElement>('[data-client-document-field="name"]'); if(nameInput&&!nameInput.value.trim())nameInput.value=doc.name; const fileName=row?.querySelector<HTMLElement>(`[data-client-document-file-name="${index}"]`); if(fileName)fileName.textContent=file.name;
  setClientDetailFeedback('info','Document ready to upload',`${file.name} will be uploaded when you save Client changes.`);
}
function removeClientDetailDocument(index: number, baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft?.documentRecords?.[index]) return;
  if (!window.confirm(`Remove ${clientDetailDraft.documentRecords[index]!.name || 'this document'} from the client draft?`)) return;
  clientDetailDraft.documentRecords.splice(index,1);
  renderClientDetailCurrentTab(baseRecord, plants);
}
function addClientDetailUser(baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft) return;
  clientDetailDraft.portalUsers = clientDetailDraft.portalUsers || [];
  clientDetailDraft.portalUsers.push({ name:'', email:'', role:'Owner User', scope:'Assigned plants only', modules:'Overview, Energy, Reports', status:'Invited', lastLogin:'No login yet', mfa:'Recommended' });
  renderClientDetailCurrentTab(baseRecord, plants);
}
function removeClientDetailUser(index: number, baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft?.portalUsers?.[index]) return;
  const user = clientDetailDraft.portalUsers[index]!;
  if (!window.confirm(`Remove ${user.name || user.email || 'this portal user'} from the client draft?`)) return;
  clientDetailDraft.portalUsers.splice(index,1);
  renderClientDetailCurrentTab(baseRecord, plants);
}
function addClientDetailBank(baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft) return;
  clientDetailDraft.bankAccounts = clientDetailDraft.bankAccounts || [];
  clientDetailDraft.bankAccounts.push({ bankName:'', bankCode:'', accountNumber:'', accountCurrency:clientDetailDraft.currency || 'AMD', primary:clientDetailDraft.bankAccounts.length === 0 });
  renderClientDetailCurrentTab(baseRecord, plants);
}
function removeClientDetailBank(index: number, baseRecord: FleetClientRecord, plants: FleetPlantRecord[]): void {
  if (!clientDetailDraft?.bankAccounts?.[index]) return;
  const account = clientDetailDraft.bankAccounts[index]!;
  if (!window.confirm(`Remove ${account.bankName || account.accountNumber || 'this bank account'} from the client draft?`)) return;
  const wasPrimary = account.primary;
  clientDetailDraft.bankAccounts.splice(index,1);
  if (wasPrimary && clientDetailDraft.bankAccounts[0]) clientDetailDraft.bankAccounts[0].primary = true;
  renderClientDetailCurrentTab(baseRecord, plants);
}

function clientDetailString(value: unknown, fallback = '—'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function normalizeClientDetailRecord(source: Partial<FleetClientRecord> | null | undefined): FleetClientRecord | null {
  if (!source || source.dataOrigin !== 'live') return null;
  const row = source as FleetClientRecord;
  const id = clientDetailString(row.id, '');
  if (!id) return null;
  return {
    ...row,
    dataOrigin:'live',
    id,
    code:clientDetailString(row.code, id),
    name:clientDetailString(row.name, 'Client'),
    type:clientDetailString(row.type, 'Not provided'),
    legalForm:clientDetailString(row.legalForm, 'Not provided'),
    registrationNo:clientDetailString(row.registrationNo, 'Not provided'),
    taxId:clientDetailString(row.taxId, 'Not provided'),
    country:clientDetailString(row.country, '—'),
    city:clientDetailString(row.city, '—'),
    address:clientDetailString(row.address, '—'),
    status:clientDetailString(row.status, 'Unknown'),
    verification:clientDetailString(row.verification, 'Not provided'),
    account:clientDetailString(row.account, 'Not provided'),
    primaryContact:clientDetailString(row.primaryContact, 'Not provided'),
    contactEmail:clientDetailString(row.contactEmail, 'Not provided'),
    contactPhone:clientDetailString(row.contactPhone, 'Not provided'),
    tenant:clientDetailString(row.tenant, FleetLayout.state.tenant || 'Not provided'),
    plants:Array.isArray(row.plants) ? row.plants.map(String) : [],
    users:Number(row.users || 0),
    documents:Number(row.documents || 0),
    billing:clientDetailString(row.billing, 'Not provided'),
    supportTier:clientDetailString(row.supportTier, 'Not provided'),
    accessScope:clientDetailString(row.accessScope, 'Not provided'),
    exportPolicy:clientDetailString(row.exportPolicy, 'Not provided'),
    assignmentRole:clientDetailString(row.assignmentRole, 'Not provided'),
    onboarding:clientDetailString(row.onboarding, 'Not provided'),
    bankAccounts:Array.isArray(row.bankAccounts) ? row.bankAccounts.map(account => ({ ...account })) : [],
    documentRecords:clientDetailDocumentsData(row),
    portalUsers:clientPortalUsers(row, [])
  };
}

function selectedTenantClientForDetail(): FleetClientRecord | null {
  const queryId = new URLSearchParams(location.search).get('id');
  const storedId = localStorage.getItem('zentrid_selected_client');
  const selectedId = queryId || storedId || '';
  const liveClients = FleetClientModel.clients.filter(item => item.dataOrigin === 'live');
  const existing = selectedId ? liveClients.find(item => item.id === selectedId) : liveClients[0];
  const record = normalizeClientDetailRecord(existing || null);
  if (!record) return null;
  const index = FleetClientModel.clients.findIndex(item => item.id === record.id);
  if (index >= 0) FleetClientModel.clients[index] = record;
  else FleetClientModel.clients.unshift(record);
  FleetClientModel.selectClient(record.id);
  return record;
}

function backendDocumentMime(fileName: string): string {
  const lower=fileName.toLowerCase(); if(lower.endsWith('.pdf'))return 'application/pdf'; if(lower.endsWith('.docx'))return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; if(lower.endsWith('.doc'))return 'application/msword'; if(lower.endsWith('.png'))return 'image/png'; if(lower.endsWith('.jpg')||lower.endsWith('.jpeg'))return 'image/jpeg'; return 'application/octet-stream';
}
function triggerBackendDocumentDownload(blob: Blob, fileName: string): void {
  const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=fileName; anchor.style.display='none'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function resolveBackendDocumentPayload(payload: unknown, safeFileName: string): boolean {
  const visited=new Set<unknown>();
  const resolve=(value:unknown,depth=0):boolean=>{
    if(depth>4||value==null||visited.has(value))return false;
    if(value instanceof Blob){triggerBackendDocumentDownload(value,safeFileName);return true;}
    if(typeof value==='string'){
      if(value.length && (value.startsWith('PK\x03\x04') || value.startsWith('%PDF-') || /[\x00-\x08\x0e-\x1f]/.test(value.slice(0,64)))){ const bytes=new Uint8Array(value.length); for(let i=0;i<value.length;i+=1)bytes[i]=value.charCodeAt(i)&0xff; triggerBackendDocumentDownload(new Blob([bytes],{type:backendDocumentMime(safeFileName)}),safeFileName); return true; }
      const text=value.trim(); if(/^(https?:|blob:|data:)/i.test(text)){const anchor=document.createElement('a');anchor.href=text;anchor.download=safeFileName;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.click();return true;} return false;
    }
    if(typeof value!=='object')return false; visited.add(value); const record=value as Record<string,unknown>;
    const base64=['contentBase64','base64','fileContentBase64','fileBase64'].map(key=>record[key]).find(item=>typeof item==='string'&&item.trim());
    if(typeof base64==='string'){try{const binary=atob(base64.replace(/^data:[^,]+,/,''));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);triggerBackendDocumentDownload(new Blob([bytes],{type:String(record.contentType||record.mimeType||backendDocumentMime(safeFileName))}),String(record.fileName||record.filename||safeFileName));return true;}catch(_error){return false;}}
    for(const key of ['downloadUrl','fileUrl','url','uri','data','document','file','result','content'])if(resolve(record[key],depth+1))return true; return false;
  };
  return resolve(payload);
}

function renderClientDetailPage() {
  const requestedEditTab = localStorage.getItem('zentrid_client_detail_edit') as ClientDetailTabKey | null;
  if (requestedEditTab && ['identity','location','portal','users','commercial'].includes(requestedEditTab)) clientDetailActiveTab = requestedEditTab;
  if (requestedEditTab) localStorage.removeItem('zentrid_client_detail_edit');
  const client = selectedTenantClientForDetail();
  if (!client) {
    FleetLayout.mount(`<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Client Detail</p><h1>Client detail unavailable</h1><p class="muted">The selected client was not returned by the backend API.</p></div><button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('clients')">Back to Clients</button></section><div class="empty-state"><strong>No client record</strong><small>Open a client from Client Registry or refresh the API request.</small></div>`);
    return;
  }
  const plants = FleetClientModel.plantsForClient(client.id);
  FleetLayout.mount(`
    <section class="page-hero client-hero-v17">
      <div><p class="eyebrow">Client Detail · ${clientDetailEscape(client.type)} ${FleetDataSource.badge(client, 'client', true)}</p><h1 id="clientDetailHeroName">${clientDetailEscape(client.name)}</h1><p class="muted" id="clientDetailHeroMeta">${clientDetailEscape(client.code)} · ${clientDetailEscape(client.country)}, ${clientDetailEscape(client.city)} · Account Manager: ${clientDetailEscape(client.account)}</p></div>
      <button class="freshness-card" id="backToClients" type="button"><span class="pulse"></span><div><strong>Client workspace</strong><small>Plants are client-level, managed through tenant workspace</small></div></button>
    </section>
    ${renderClientDetailControl(client)}
    <div id="clientDetailKpis">${clientKpis(client)}</div>
    <section class="client-layout-v17">
      <aside class="glass-card client-side-card-v17">
        <h3>Client Navigation</h3>
        <button class="${clientDetailActiveTab === 'overview' ? 'active' : ''}" data-client-tab="overview" ${clientDetailActiveTab === 'overview' ? 'aria-current="page"' : ''}><span>Overview</span></button>
        <button class="${clientDetailActiveTab === 'identity' ? 'active' : ''}" data-client-tab="identity" ${clientDetailActiveTab === 'identity' ? 'aria-current="page"' : ''}><span>Identity</span></button>
        <button class="${clientDetailActiveTab === 'location' ? 'active' : ''}" data-client-tab="location" ${clientDetailActiveTab === 'location' ? 'aria-current="page"' : ''}><span>Location & Preferences</span></button>
        <button class="${clientDetailActiveTab === 'portal' ? 'active' : ''}" data-client-tab="portal" ${clientDetailActiveTab === 'portal' ? 'aria-current="page"' : ''}><span>Contacts & Portal</span></button>
        <button class="${clientDetailActiveTab === 'users' ? 'active' : ''}" data-client-tab="users" ${clientDetailActiveTab === 'users' ? 'aria-current="page"' : ''}><span>Users & Access</span></button>
        <button class="${clientDetailActiveTab === 'plants' ? 'active' : ''}" data-client-tab="plants" ${clientDetailActiveTab === 'plants' ? 'aria-current="page"' : ''}><span>Assigned Plants</span></button>
        <button class="${clientDetailActiveTab === 'commercial' ? 'active' : ''}" data-client-tab="commercial" ${clientDetailActiveTab === 'commercial' ? 'aria-current="page"' : ''}><span>Commercial & Payments</span></button>
        <button class="${clientDetailActiveTab === 'alerts' ? 'active' : ''}" data-client-tab="alerts" ${clientDetailActiveTab === 'alerts' ? 'aria-current="page"' : ''}><span>Alerts</span></button>
        <button class="${clientDetailActiveTab === 'activity' ? 'active' : ''}" data-client-tab="activity" ${clientDetailActiveTab === 'activity' ? 'aria-current="page"' : ''}><span>Activity</span></button>
      </aside>
      <section class="glass-card client-main-card-v17">
        <div class="client-detail-content-head-v118"><div><span>Active section</span><h2 id="clientDetailActiveTitle">${clientDetailEscape(clientDetailSectionTitle(clientDetailActiveTab))}</h2></div><div class="client-detail-actions-v118"><button id="editClientTab" class="small-btn primary" type="button" data-permission-action="edit" data-permission-resource="client" data-permission-status="${clientDetailAttr(client.status)}" data-permission-origin="${clientDetailAttr(clientDetailOrigin(client))}" data-permission-update-available="true" data-permission-local-override="false" data-permission-base-disabled="${clientDetailCanEdit(client, clientDetailActiveTab) ? 'false' : 'true'}">Edit</button><button id="cancelClientEdit" class="small-btn ghost" type="button" hidden>Cancel</button><button id="saveClientEdit" class="small-btn success" type="button" hidden data-permission-action="edit" data-permission-resource="client" data-permission-status="${clientDetailAttr(client.status)}" data-permission-origin="${clientDetailAttr(clientDetailOrigin(client))}" data-permission-update-available="true" data-permission-local-override="false">Save Changes</button></div></div>
        <div class="form-validation-summary client-detail-summary-v118" id="clientDetailEditSummary" role="alert" aria-live="assertive" tabindex="-1" hidden></div>
        <div class="client-tab-content" id="clientTabContent">${clientTab(client, plants, clientDetailActiveTab, false)}</div>
      </section>
    </section>
  `);
  clientDetailBusy = false;
  updateClientDetailActions(client);
  document.getElementById('backToClients')?.addEventListener('click', () => {
    if (!clientDetailConfirmDiscard('Discard unsaved client changes and return to Client Registry?')) return;
    location.href = FleetLayout.pathFor('clients');
  });
  document.getElementById('editClientTab')?.addEventListener('click', () => setClientDetailEditMode(true, client, plants));
  document.getElementById('cancelClientEdit')?.addEventListener('click', () => setClientDetailEditMode(false, client, plants));
  document.getElementById('saveClientEdit')?.addEventListener('click', () => saveClientDetailEdits(client, plants));
  document.querySelectorAll<HTMLElement>('[data-client-tab]').forEach(btn => btn.addEventListener('click', () => {
    const nextTab = (btn.dataset.clientTab || 'overview') as ClientDetailTabKey;
    if (clientDetailEditMode && !clientDetailConfirmDiscard('Discard unsaved changes and open another client section?')) return;
    clientDetailEditMode = false;
    clientDetailDraft = null;
    clientDetailEditSnapshot = '';
    clientDetailActiveTab = nextTab;
    document.querySelectorAll<HTMLElement>('[data-client-tab]').forEach(item => {
      const active = item.dataset.clientTab === nextTab;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current','page');
      else item.removeAttribute('aria-current');
    });
    clearClientDetailFeedback();
    renderClientDetailCurrentTab(client, plants);
    const summary = document.getElementById('clientDetailEditSummary');
    if (summary) { summary.hidden = true; summary.innerHTML = ''; }
  }));
  const clientTabContent = document.getElementById('clientTabContent');
  clientTabContent?.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const lifecycle = target.closest<HTMLElement>('[data-client-lifecycle]');
    if (lifecycle) { void runClientDetailLifecycle(client, lifecycle.dataset.clientLifecycle as 'activate'|'deactivate'|'suspend'|'archive'); return; }
    const downloadClientDocument = target.closest<HTMLElement>('[data-client-document-download]');
    if (downloadClientDocument?.dataset.clientDocumentDownload) {
      const documentId=downloadClientDocument.dataset.clientDocumentDownload; const doc=clientDetailDocumentsData(client).find(item=>String(item.id||item.filePath||'')===documentId); const fileName=String(doc?.fileName||doc?.name||`client-document-${documentId}`).trim() || `client-document-${documentId}`;
      void window.ZentridPlatformAPI.clients.getDocument(client.id,documentId).then((payload: unknown)=>{ if(resolveBackendDocumentPayload(payload,fileName))FleetLayout.toast('Client document download started.'); else FleetLayout.toast('Unable to convert the backend document response into a downloadable file.'); }).catch(()=>FleetLayout.toast('Unable to download client document.')); return;
    }
    const deleteClientDocument = target.closest<HTMLElement>('[data-delete-client-document]');
    if (deleteClientDocument?.dataset.deleteClientDocument) { const documentId=deleteClientDocument.dataset.deleteClientDocument; if(!FleetActionPermissions.guard({ action:'edit', resource:'client', record:client, status:client.status, origin:clientDetailOrigin(client), updateAvailable:true }))return; if(!window.confirm('Delete this client document from the backend?'))return; void window.FleetAPIMutations.clients.deleteDocument(client.id,documentId).then(result=>{FleetLayout.toast(result.message);if(result.ok)window.setTimeout(()=>window.location.reload(),250);}); return; }
    if (target.closest('[data-add-client-document]')) { addClientDetailDocument(client, plants); return; }
    const removeDocument = target.closest<HTMLElement>('[data-remove-client-document]');
    if (removeDocument) { removeClientDetailDocument(Number(removeDocument.dataset.removeClientDocument), client, plants); return; }
    if (target.closest('[data-add-client-user]')) { addClientDetailUser(client, plants); return; }
    const removeUser = target.closest<HTMLElement>('[data-remove-client-user]');
    if (removeUser) { removeClientDetailUser(Number(removeUser.dataset.removeClientUser), client, plants); return; }
    if (target.closest('[data-add-client-bank]')) { addClientDetailBank(client, plants); return; }
    const removeBank = target.closest<HTMLElement>('[data-remove-client-bank]');
    if (removeBank) { removeClientDetailBank(Number(removeBank.dataset.removeClientBank), client, plants); return; }
    const builderBtn = target.closest('[data-open-plant-builder]');
    const closeBuilder = target.closest('[data-close-plant-builder]');
    const stepBtn = target.closest<HTMLElement>('[data-builder-step]');
    const addDevice = target.closest<HTMLElement>('[data-builder-add-device]');
    const removeDevice = target.closest<HTMLElement>('[data-builder-remove-device]');
    const row = target.closest<HTMLElement>('[data-plant]');
    if (builderBtn) return openPlantBuilder();
    if (closeBuilder) return closePlantBuilder();
    if (stepBtn) return setPlantBuilderStep(stepBtn.dataset.builderStep || '1');
    if (addDevice) return addBuilderDevice(addDevice.dataset.builderAddDevice || 'Inverter');
    if (removeDevice) return removeBuilderDevice(removeDevice.dataset.builderRemoveDevice || '');
    const plantId = row?.dataset.plant;
    if (!plantId) return;
    if (!clientDetailConfirmDiscard('Discard unsaved client changes and open Plant Detail?')) return;
    FleetClientModel.selectClient(client.id);
    FleetClientModel.selectPlant(plantId);
    location.href = FleetLayout.pathFor('plant-detail');
  });
  const syncDynamicField = (target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void => {
    if (!clientDetailDraft) return;
    clientDetailSyncControlToDraft(target);
    const documentRow = target.closest<HTMLElement>('[data-client-document-row]');
    const documentIndex = Number(documentRow?.dataset.clientDocumentRow);
    const documentField = target.dataset.clientDocumentField as keyof FleetClientDocumentRecord | undefined;
    if (documentField && clientDetailDraft.documentRecords?.[documentIndex] && (documentField === 'name' || documentField === 'type' || documentField === 'status' || documentField === 'expiry')) clientDetailDraft.documentRecords[documentIndex]![documentField] = target.value;
    const userRow = target.closest<HTMLElement>('[data-client-user-row]');
    const userIndex = Number(userRow?.dataset.clientUserRow);
    const userField = target.dataset.clientUserField as keyof FleetPortalUser | undefined;
    if (userField && clientDetailDraft.portalUsers?.[userIndex]) clientDetailDraft.portalUsers[userIndex]![userField] = target.value;
    const bankRow = target.closest<HTMLElement>('[data-client-bank-row]');
    const bankIndex = Number(bankRow?.dataset.clientBankRow);
    const bankField = target.dataset.clientBankField as keyof FleetBankAccount | undefined;
    if (bankField && clientDetailDraft.bankAccounts?.[bankIndex]) {
      const account = clientDetailDraft.bankAccounts[bankIndex]!;
      if (bankField === 'bankName' || bankField === 'bankCode' || bankField === 'accountNumber' || bankField === 'accountCurrency' || bankField === 'bank' || bankField === 'account' || bankField === 'currency') account[bankField] = target.value;
    }
    const primaryIndex = target.dataset.clientBankPrimary;
    if (primaryIndex !== undefined && target instanceof HTMLInputElement && target.checked && clientDetailDraft.bankAccounts) {
      clientDetailDraft.bankAccounts.forEach((account,index) => { account.primary = index === Number(primaryIndex); });
    }
    const summary = document.getElementById('clientDetailEditSummary');
    if (clientDetailEditMode) FleetFormUX.clearErrors(clientTabContent || document, summary);
  };
  clientTabContent?.addEventListener('input', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) syncDynamicField(target);
  });
  clientTabContent?.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.hasAttribute('data-client-document-file')) { selectClientDetailDocumentFile(target); return; }
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) syncDynamicField(target);
  });
  if (requestedEditTab && clientDetailCanEdit(client, requestedEditTab)) setClientDetailEditMode(true, client, plants);
  if (!clientDetailBeforeUnloadBound) {
    FleetEntityDetailUX.bindBeforeUnload('client-detail', clientDetailHasUnsavedEdits);
    clientDetailBeforeUnloadBound = true;
  }
}


function plantBuilderModal(client: FleetClientRecord): string {
  return `<div class="plant-builder-modal-v27" id="plantBuilderModalV27" aria-hidden="true">
    <div class="plant-builder-shell-v27">
      <div class="plant-builder-top-v27">
        <div><p class="eyebrow">Create Plant · ${client.name}</p><h2>Plant Builder</h2><p class="muted">Build the plant from catalog device. Zentrid pre-fills shared model data and asks only for individual instance data.</p></div>
        <button class="drawer-close" type="button" data-close-plant-builder>x</button>
      </div>
      <div class="builder-steps-v27">
        <button class="active" type="button" data-builder-step="info"><b>1</b><span>Plant Info</span></button>
        <button type="button" data-builder-step="device"><b>2</b><span>Device</span></button>
        <button type="button" data-builder-step="compatibility"><b>3</b><span>Compatibility</span></button>
        <button type="button" data-builder-step="topology"><b>4</b><span>Topology</span></button>
        <button type="button" data-builder-step="review"><b>5</b><span>Review</span></button>
      </div>
      <div class="builder-body-v27" id="plantBuilderBodyV27">${plantBuilderStep('info')}</div>
      <div class="builder-footer-v27"><button class="secondary-btn" type="button" data-close-plant-builder>Cancel</button><button class="primary-btn" type="button" onclick="createClientBuilderPlant()">Create Plant</button></div>
    </div>
  </div>`;
}

function plantBuilderStep(step: string): string {
  if (step === 'device') return `<div class="builder-two-col-v27">
    <section><div class="section-title-v17 mini"><div><h3>Device Catalog</h3><p class="muted">Choose a model from database. Shared fields come from catalog; individual fields are entered per physical device.</p></div></div>
      <div class="device-catalog-grid-v27">${FleetDeviceCatalog.catalog.map((x, i) => `<article>
        <div><strong>${x.vendor} ${x.model}</strong><small>${x.kind} · ${x.rating}</small></div>
        <p><b>Shared:</b> ${x.shared}</p><p><b>Individual:</b> ${x.individual}</p>
        <button class="small-btn" type="button" data-builder-add-device="${i}">Add to Plant</button>
      </article>`).join('')}</div>
    </section>
    <aside class="builder-selection-v27"><h3>Selected Device</h3><div id="builderDeviceListV27">${builderDeviceList()}</div></aside>
  </div>`;
  if (step === 'compatibility') return `<div class="section-title-v17"><div><h2>Device Compatibility Rules</h2><p class="muted">Vendor is an attribute, not the hierarchy. Compatibility is based on protocol, firmware, electrical limits and source capability.</p></div></div>
    <div class="data-table compact-table compatibility-table-v27"><div class="data-head"><span>Source</span><span>Compatible With</span><span>Type</span><span>Status</span><span>Rule</span></div>${FleetDeviceCatalog.compatibility.map(x => `<div class="data-row"><div><strong>${x.from}</strong></div><div><strong>${x.to}</strong></div><div><span>${x.type}</span></div><div><span class="badge ${x.status.includes('Conditional') ? 'warning' : 'success'}">${x.status.split(':')[0]}</span><small>${x.status.includes(':') ? x.status.split(':').slice(1).join(':').trim() : x.status}</small></div><div><small>${x.rule}</small></div></div>`).join('')}</div>`;
  if (step === 'topology') return `<div class="section-title-v17"><div><h2>Topology Builder</h2><p class="muted">A plant can contain mixed-vendor device. Relationships are physical/electrical/logical, not vendor ownership.</p></div></div>
    <div class="plant-builder-topology-v27">
      <div class="topology-node-v27 root"><b>Plant</b><span>New plant workspace</span></div>
      <div class="topology-branches-v27">
        <div><b>Inverters</b><span>children: MPPT → Strings → PV modules</span></div>
        <div><b>Meters</b><span>POI / import-export / accounting</span></div>
        <div><b>Logger / Gateway</b><span>linked devices and data source</span></div>
        <div><b>BESS</b><span>linked to PCS and racks/modules</span></div>
        <div><b>Weather Station</b><span>plant-level analytics context</span></div>
        <div><b>Transformer / Switchgear</b><span>grid infrastructure</span></div>
      </div>
    </div>`;
  if (step === 'review') return `<div class="section-title-v17"><div><h2>Review</h2><p class="muted">Before creating the plant, check required individual data and compatibility warnings.</p></div></div>
    <div class="builder-review-grid-v27"><article><span>Plant</span><strong>New Plant</strong><small>Name, code, address, timezone</small></article><article><span>Device</span><strong id="builderReviewCountV27">${builderDevices().length} selected</strong><small>From catalog database</small></article><article><span>Required individual fields</span><strong>Serials / addresses / install dates</strong><small>Per physical instance</small></article><article><span>Compatibility</span><strong>Conditional checks required</strong><small>BMS, meter, logger, protocol</small></article></div>`;
  return `<div class="section-title-v17"><div><h2>Plant Information</h2><p class="muted">Only plant identity and location are entered manually. Device details are selected in the next step.</p></div></div>
    <div class="builder-form-grid-v27"><label>Plant Name<input value="New Plant" /></label><label>Plant Code<input value="AUTO-PL-001" /></label><label>Country<input value="Armenia" /></label><label>Region<input value="Kotayk" /></label><label>Address<input value="Plant address" /></label><label>Timezone<input value="Asia/Yerevan" /></label><label>Client<input value="${FleetClientModel.selectedClient().name}" /></label><label>Managing Tenant<input value="Tenant workspace" /></label></div>`;
}

function builderDevices(): FleetDeviceCatalogItem[] {
  try { return JSON.parse(sessionStorage.getItem('zentrid_builder_devices_v27') || '[]'); } catch { return []; }
}
function saveBuilderDevices(list: FleetDeviceCatalogItem[]): void { sessionStorage.setItem('zentrid_builder_devices_v27', JSON.stringify(list)); }
function builderDeviceList() {
  const list = builderDevices();
  if (!list.length) return `<div class="empty-state"><strong>No device selected</strong><small>Add inverter, meter, logger, BESS or infrastructure devices from the catalog.</small></div>`;
  return `<div class="builder-device-list-v27">${list.map((x, i) => `<article><div><strong>${x.vendor} ${x.model}</strong><small>${x.kind} · ${x.rating}</small></div><button class="small-btn danger" type="button" data-builder-remove-device="${i}">Remove</button></article>`).join('')}</div>`;
}
function openPlantBuilder() {
  const modal = document.getElementById('plantBuilderModalV27');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setPlantBuilderStep('info');
}
function closePlantBuilder() {
  const modal = document.getElementById('plantBuilderModalV27');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}
function setPlantBuilderStep(step: string): void {
  document.querySelectorAll('[data-builder-step]').forEach(x => x.classList.toggle('active', x.dataset.builderStep === step));
  const body = document.getElementById('plantBuilderBodyV27');
  if (body) body.innerHTML = plantBuilderStep(step);
}
function addBuilderDevice(index: string | number): void {
  const item = FleetDeviceCatalog.catalog[Number(index)];
  if (!item) return;
  const list = builderDevices();
  list.push(item);
  saveBuilderDevices(list);
  const target = document.getElementById('builderDeviceListV27');
  if (target) target.innerHTML = builderDeviceList();
  FleetLayout.toast(`${item.kind} added to Plant Builder`);
}
function removeBuilderDevice(index: string | number): void {
  const list = builderDevices();
  list.splice(Number(index), 1);
  saveBuilderDevices(list);
  const target = document.getElementById('builderDeviceListV27');
  if (target) target.innerHTML = builderDeviceList();
}

function plantSummaryCards(plants: FleetPlantRecord[]): string {
  if (!plants.length) return `<div class="empty-state"><strong>No plants assigned yet</strong><small>Plants will appear here after assignment is completed.</small></div>`;
  return `<div class="plant-card-grid-v17">${plants.map(p => {
    const ds = FleetClientModel.devicesForPlant(p.id);
    return `<article class="plant-card-v17 clickable-row" data-plant="${p.id}">
      <div class="plant-card-top-v17"><div><strong>${p.name}</strong><small>${p.code} · ${p.portfolio}</small></div><span class="badge ${FleetClientModel.badge(p.health)}">${p.health}</span></div>
      <div class="plant-card-metrics-v17"><div><span>Capacity</span><b>${p.capacityDc}</b></div><div><span>Now</span><b>${p.powerNow}</b></div><div><span>Today</span><b>${p.energyToday}</b></div><div><span>Alerts</span><b>${p.alerts}</b></div></div>
      <div class="device-strip-v17"><span>Inverters ${p.inverters}</span><span>Meters ${p.meters}</span><span>BESS ${p.battery}</span><span>${ds.length} sample records</span></div>
    </article>`;
  }).join('')}</div>`;
}


function clientProfileCard(client: FleetClientRecord): string {
  const legalRows = client.type === 'Individual'
    ? [
      ['Client Type', client.type], ['Full Name', client.name], ['Personal / Passport ID', client.registrationNo], ['Tax / Personal ID', client.taxId], ['Identity Status', client.verification], ['Residential Location', `${client.country}, ${client.city}`]
    ]
    : [
      ['Client Type', client.type], ['Legal Form', client.legalForm], ['Registration Number', client.registrationNo], ['Tax ID', client.taxId], ['KYC / Verification', client.verification], ['Registered Address', client.address]
    ];
  return `<div class="info-grid">
    ${legalRows.map(([k,v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('')}
    <div><span>Primary Contact</span><strong>${client.primaryContact}</strong></div>
    <div><span>Email</span><strong>${client.contactEmail}</strong></div>
    <div><span>Phone</span><strong>${client.contactPhone}</strong></div>
    <div><span>Account Manager</span><strong>${client.account}</strong></div>
    <div><span>Managing Tenant</span><strong>${client.tenant}</strong></div>
    <div><span>Onboarding</span><strong>${client.onboarding}</strong></div>
  </div>`;
}

function assignmentRows(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  if (!plants.length) return `<div class="empty-state"><strong>No plant assigned yet</strong><small>This client is registered, but no plant assignment is visible in this tenant workspace.</small></div>`;
  return `<div class="data-table compact-table assignment-table-v28"><div class="data-head"><span>Plant</span><span>Role / Tenant</span><span>Access Scope</span><span>Documents</span><span>Action</span></div>${plants.map(p => `<div class="data-row" data-plant="${p.id}"><div><strong>${p.name}</strong><small>${p.code}<br>${p.country}, ${p.city}</small></div><div><strong>${client.assignmentRole}</strong><small>${p.operator}</small></div><div><span class="badge ${FleetClientModel.badge(p.health)}">${p.health}</span><small>Portal: overview, energy, reports</small></div><div><strong>Assignment active</strong><small>Owner matrix · O&M terms · reports</small></div><div class="row-actions"><button type="button">Open Plant</button></div></div>`).join('')}</div>`;
}

function accessScopeMatrix(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const plantScope = plants.length ? plants.map(p => p.name).join(', ') : 'No active plant scope';
  return `<div class="section-title-v17"><div><h2>Access Scope</h2><p class="muted">Client access is limited to assigned plants and client-facing modules. Tenant Admin manages client-facing plant and module access.</p></div><button class="small-btn" type="button" onclick="location.href=FleetLayout.pathFor('users')">View Permissions</button></div>
  <div class="info-grid">
    <div><span>Plant Scope</span><strong>${plantScope}</strong><small>${client.accessScope}</small></div>
    <div><span>Allowed Modules</span><strong>Overview · My Plants · Reports · Documents · Billing</strong><small>No integrations, no platform settings, no tenant-wide operations</small></div>
    <div><span>Role Templates</span><strong>Owner Viewer · Finance Viewer · Report Exporter</strong><small>${client.users} portal accounts</small></div>
    <div><span>Export Policy</span><strong>${client.exportPolicy}</strong><small>All exports are traceable in audit</small></div>
  </div>`;
}

function clientDocuments(client: FleetClientRecord): string {
  const rows = clientDetailDocumentsData(client);
  return `<div class="section-title-v17 mini"><div><h3>Documents</h3><p class="muted">Client-level legal, commercial and access metadata. Technical device manuals stay inside Plant Detail.</p></div><span class="badge ${rows.length ? 'success' : 'warning'}">${rows.length ? `${rows.length} records` : 'No records'}</span></div>${rows.length ? `<div class="data-table compact-table client-document-view-v118"><div class="data-head"><span>Document</span><span>Type</span><span>Status</span><span>Expiry</span><span>Action</span></div>${rows.map(row => { const persistedId=String(row.id || row.filePath || '').trim(); return `<div class="data-row"><div><strong>${clientDetailEscape(row.name)}</strong><small>${clientDetailEscape(row.fileName || 'Client document metadata')}</small></div><div><strong>${clientDetailEscape(row.type)}</strong></div><div><span class="badge ${['Verified','Active','Signed','Updated'].includes(row.status) ? 'success' : row.status === 'Expired' ? 'danger' : 'warning'}">${clientDetailEscape(row.status)}</span></div><div><strong>${clientDetailEscape(row.expiry || 'Not set')}</strong></div><div class="row-actions single-action">${persistedId ? `<button class="small-btn" type="button" data-client-document-download="${clientDetailAttr(persistedId)}">Download</button>` : '<span>—</span>'}</div></div>`; }).join('')}</div>` : `<div class="empty-state"><strong>No client documents</strong><small>The backend has not returned any document records for this client.</small></div>`}`;
}


function clientDetailLifecycleHtml(client: FleetClientRecord): string {
  if (!clientDetailBackendManaged(client)) return '';
  const status=String(client.status || '').trim().toLowerCase();
  if (status==='archived') return `<div class="section-title-v17 mini"><div><h3>Lifecycle Actions</h3><p class="muted">Client lifecycle is managed by the backend.</p></div></div><div class="empty-state"><strong>Client archived</strong><small>This client is read-only.</small></div>`;
  const activate=status==='active' ? '' : '<button class="primary-action" type="button" data-client-lifecycle="activate" data-permission-action="activate" data-permission-resource="client">Activate</button>';
  const deactivate=status==='active' ? '<button class="secondary-action" type="button" data-client-lifecycle="deactivate" data-permission-action="deactivate" data-permission-resource="client">Deactivate</button>' : '';
  const suspend=status==='suspended' ? '' : '<button class="secondary-action" type="button" data-client-lifecycle="suspend" data-permission-action="suspend" data-permission-resource="client">Suspend</button>';
  return `<div class="section-title-v17 mini"><div><h3>Lifecycle Actions</h3><p class="muted">These actions write directly to the Client backend.</p></div></div><div class="row-actions client-lifecycle-actions-v142"><span class="badge neutral">${clientDetailEscape(client.status || '—')}</span>${activate}${deactivate}${suspend}<button class="danger-action" type="button" data-client-lifecycle="archive" data-permission-action="archive" data-permission-resource="client">Archive</button></div>`;
}
async function runClientDetailLifecycle(client: FleetClientRecord, action:'activate'|'deactivate'|'suspend'|'archive'): Promise<void> {
  if (!clientDetailBackendManaged(client) || !window.FleetAPIMutations?.clients?.[action]) return;
  if (!FleetActionPermissions.guard({ action, resource:'client', record:client, status:client.status, origin:clientDetailOrigin(client), updateAvailable:true })) return;
  const verb=action.charAt(0).toUpperCase()+action.slice(1); if (!window.confirm(`${verb} “${client.name}”?`)) return;
  setClientDetailFeedback('info',`${verb} client`,'Sending lifecycle action to backend…'); const result=await window.FleetAPIMutations.clients[action](client.id); FleetLayout.toast(result.message); if(result.ok)window.setTimeout(()=>window.location.reload(),250);else setClientDetailFeedback('danger',`${verb} failed`,result.message);
}

function clientOverviewTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const counts = FleetClientModel.countsForClient(client.id);
  const alertState = counts.alerts > 0 ? 'warning' : 'success';
  const portalState = client.username ? 'success' : 'warning';
  const healthText = counts.alerts > 0 ? `${counts.alerts} active issue${counts.alerts === 1 ? '' : 's'}` : 'No active issues';
  return `<div class="section-title-v17"><div><h2>Client Overview</h2><p class="muted">Useful client-level snapshot: who manages the client, what plants are linked, portal state and active operational risk.</p></div><span class="badge ${FleetClientModel.badge(client.status)}">${client.status}</span></div>
  <div class="info-grid">
    <div><span>Managing Tenant</span><strong>${client.tenant}</strong><small>Tenant responsible for supervision and operations</small></div>
    <div><span>Client Type</span><strong>${client.type}</strong><small>${client.legalForm}</small></div>
    <div><span>Assigned Plants</span><strong>${counts.plants}</strong><small>${counts.capacity} total DC capacity</small></div>
    <div><span>Device Records</span><strong>${counts.devices}</strong><small>Devices across assigned plants</small></div>
    <div><span>Active Alerts</span><strong>${healthText}</strong><small>Plant and device alerts visible for support context</small></div>
    <div><span>Portal Status</span><strong>${client.username ? 'Configured' : 'Pending'}</strong><small>${client.username || 'No portal username yet'}</small></div>
  </div>
  <div class="section-title-v17 mini"><div><h3>Operational Snapshot</h3><p class="muted">Only high-value information is shown here, not every internal admin field.</p></div></div>
  <div class="placeholder-grid compact-cards client-ops-grid-v40">
    <article><span>Plants</span><strong>${counts.plants}</strong><small>Open Plants tab to inspect client devices</small></article>
    <article><span>Alerts</span><strong>${counts.alerts}</strong><small>Open Alerts tab to see recent issues</small></article>
    <article><span>Portal Users</span><strong>${clientPortalUsers(client, plants).length}</strong><small>Open Users & Access for detailed portal scope</small></article>
    <article><span>Documents</span><strong>${client.documents || 0}</strong><small>Client documents are stored through the backend Documents API</small></article>
  </div>
  ${plants.length ? `<div class="section-title-v17 mini"><div><h3>Assigned Plants Preview</h3><p class="muted">Quick preview of the most important linked plants.</p></div></div>${plantSummaryCards(plants.slice(0, 3))}` : `<div class="empty-state"><strong>No plant assigned yet</strong><small>Use Assigned Plants to review plant role, access scope and commercial visibility.</small></div>`}
  ${clientDetailLifecycleHtml(client)}`;
}

function clientIdentityTab(client: FleetClientRecord): string {
  const rows = client.type === 'Individual'
    ? [
      ['Name / Full Name', client.name, 'Created from Name, Surname and Last name'],
      ['Date of Birth', client.dob || 'Not provided', 'Format: dd/mm/yyyy'],
      ['Personal / Passport ID', client.registrationNo, 'Identity document reference'],
      ['Tax / Personal ID', client.taxId, 'Tax or personal number'],
      ['Verification', client.verification, 'Identity verification state'],
      ['User Role', client.assignmentRole, 'Initial role from create form']
    ]
    : [
      ['Legal Name', client.name, 'Company / legal entity name'],
      ['Legal Form', client.legalForm, 'Entity profile type'],
      ['Registration Number', client.registrationNo, 'Company registration reference'],
      ['Tax ID', client.taxId, 'VAT / tax identification'],
      ['Verification', client.verification, 'KYC / legal verification state'],
      ['User Role', client.assignmentRole, 'Initial role from create form']
    ];
  return `<div class="section-title-v17"><div><h2>Identity</h2><p class="muted">Identity data collected during Client creation. This section stays focused on legal/person data only.</p></div></div>
  <div class="info-grid">${rows.map(([k,v,h]) => `<div><span>${k}</span><strong>${v || 'Not provided'}</strong><small>${h}</small></div>`).join('')}</div>`;
}

function clientLocationPreferencesTab(client: FleetClientRecord): string {
  return `<div class="section-title-v17"><div><h2>Location & Preferences</h2><p class="muted">Geography and client-facing display preferences returned by the backend.</p></div></div>
  <div class="info-grid">
    <div><span>Country</span><strong>${client.country || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Region</span><strong>${client.region || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>City</span><strong>${client.city || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Address</span><strong>${client.address || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Time Zone</span><strong>${client.timezone || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Language</span><strong>${client.language || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Temperature Format</span><strong>${client.temperature || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Currency Unit</span><strong>${client.currency || 'Not provided'}</strong><small>Backend value</small></div>
    <div><span>Irradiation</span><strong>${client.irradiation || 'Not provided'}</strong><small>Backend value</small></div>
  </div>`;
}

function clientPlantAssignments(client: FleetClientRecord, plants: FleetPlantRecord[]) {
  return plants.map(plant => {
    const raw = plant.raw && typeof plant.raw === 'object' ? plant.raw as Record<string, unknown> : {};
    return {
      plant,
      role:String(raw.assignmentRole || raw.clientRole || client.assignmentRole || 'Not provided'),
      portalScope:String(raw.portalScope || raw.accessScope || client.accessScope || 'Not provided'),
      commercialScope:String(raw.commercialScope || 'Not provided'),
      status:plant.status || 'Unknown',
      since:String(raw.assignmentDate || raw.assignedAt || raw.createdAtUtc || plant.commissioning || 'Not provided')
    };
  });
}

function clientPortalUsers(client: FleetClientRecord, _plants: FleetPlantRecord[]): FleetPortalUser[] {
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const candidates = [client.portalUsers, raw.portalUsers, raw.clientUsers, raw.users].find(Array.isArray) as unknown[] | undefined;
  if (!candidates) return [];
  return candidates.map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      name:String(row.name || row.fullName || row.displayName || ''),
      email:String(row.email || row.userEmail || ''),
      role:String(row.role || row.portalRole || 'Not provided'),
      scope:String(row.scope || row.accessScope || 'Not provided'),
      modules:Array.isArray(row.modules) ? row.modules.map(String).join(', ') : String(row.modules || row.allowedModules || 'Not provided'),
      status:String(row.status || row.userStatus || 'Unknown'),
      lastLogin:String(row.lastLogin || row.lastLoginAt || 'Not provided'),
      mfa:String(row.mfa || row.mfaStatus || 'Not provided')
    };
  }).filter(user => Boolean(user.name || user.email));
}

function clientUsersAccessTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const users = clientPortalUsers(client, plants);
  const active = users.filter(u => u.status === 'Active').length;
  const pending = users.filter(u => u.status !== 'Active').length;
  return `<div class="section-title-v17"><div><h2>Users & Access</h2><p class="muted">People from this client who can enter the End User portal. This is client-facing access, not Tenant Admin staff management.</p></div><span class="badge ${users.length ? 'success' : 'warning'}">${users.length ? 'API data' : 'No API records'}</span></div>
  <div class="info-grid">
    <div><span>Total Portal Users</span><strong>${users.length}</strong><small>Returned by backend</small></div>
    <div><span>Active Users</span><strong>${active}</strong><small>Can access portal now</small></div>
    <div><span>Pending / Restricted</span><strong>${pending}</strong><small>Non-active backend records</small></div>
    <div><span>Default Plant Scope</span><strong>${client.accessScope || 'Not provided'}</strong><small>Backend access scope</small></div>
    <div><span>Default Role Template</span><strong>${client.assignmentRole || 'Not provided'}</strong><small>Backend role value</small></div>
    <div><span>Export Control</span><strong>${client.exportPolicy || 'Not provided'}</strong><small>Backend export policy</small></div>
  </div>
  ${users.length ? `<div class="data-table compact-table client-users-access-table-v89"><div class="data-head"><span>User</span><span>Portal Role</span><span>Plant / Data Scope</span><span>Allowed Modules</span><span>Status</span><span>Security</span></div>${users.map(u => `<div class="data-row"><div><strong>${clientDetailEscape(u.name || 'Not provided')}</strong><small>${clientDetailEscape(u.email || 'Not provided')}</small></div><div><strong>${clientDetailEscape(u.role)}</strong><small>Client-facing role</small></div><div><strong>${clientDetailEscape(u.scope)}</strong><small>Object-level access scope</small></div><div><strong>${clientDetailEscape(u.modules)}</strong><small>Backend module scope</small></div><div><span class="badge ${u.status === 'Active' ? 'success' : u.status === 'Suspended' ? 'danger' : 'warning'}">${clientDetailEscape(u.status)}</span><small>Last login: ${clientDetailEscape(u.lastLogin)}</small></div><div><strong>MFA: ${clientDetailEscape(u.mfa)}</strong><small>Backend security value</small></div></div>`).join('')}</div>` : `<div class="empty-state"><strong>No portal users returned</strong><small>The current API does not provide client portal-user records for this client.</small></div>`}
  <div class="section-title-v17 mini"><div><h3>Access Rules Snapshot</h3><p class="muted">These rules explain the boundary between Client Portal and Tenant/Admin workspaces.</p></div></div>
  <div class="placeholder-grid compact-cards client-ops-grid-v40 client-access-rules-v89">
    <article><span>Allowed</span><strong>View own plants</strong><small>Overview, My Plant, simplified devices and alerts.</small></article>
    <article><span>Allowed</span><strong>Download approved reports</strong><small>Only when export policy allows it.</small></article>
    <article><span>Blocked</span><strong>No tenant operations</strong><small>No integrations, registry management, mapping or billing setup.</small></article>
    <article><span>Audit</span><strong>Access changes logged</strong><small>Every role and scope update is recorded in the tenant audit trail.</small></article>
  </div>`;
}

function clientContactsPortalTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const lastLogin = String(raw.lastLoginAt || raw.lastLogin || 'Not provided');
  const mfa = String(raw.mfaStatus || raw.mfa || 'Not provided');
  const portalConfigured = Boolean(client.username);
  return `<div class="section-title-v17"><div><h2>Contacts & Portal</h2><p class="muted">Primary contact data. Detailed portal users and permissions are separated into Users & Access.</p></div><span class="badge ${portalConfigured ? 'success' : 'warning'}">${portalConfigured ? 'Portal configured' : 'Portal pending'}</span></div>
  <div class="info-grid">
    <div><span>Primary Contact</span><strong>${client.primaryContact || 'Not provided'}</strong><small>Backend contact</small></div>
    <div><span>E-mail</span><strong>${client.contactEmail || 'Not provided'}</strong><small>Backend contact</small></div>
    <div><span>Phone Number 1</span><strong>${client.contactPhone || 'Not provided'}</strong><small>Backend contact</small></div>
    <div><span>Phone Number 2</span><strong>${client.phone2 || 'Not provided'}</strong><small>Backend contact</small></div>
    <div><span>Username</span><strong>${client.username || 'Not configured'}</strong><small>Backend portal username</small></div>
    <div><span>Portal Role</span><strong>${client.assignmentRole || 'Not provided'}</strong><small>Backend role</small></div>
    <div><span>Portal Users</span><strong>${clientPortalUsers(client, plants).length}</strong><small>Backend user records</small></div>
    <div><span>Plant Scope</span><strong>${plants.length} assigned plant${plants.length === 1 ? '' : 's'}</strong><small>${client.accessScope || 'Not provided'}</small></div>
  </div>
  <div class="section-title-v17 mini"><div><h3>Portal Usage</h3><p class="muted">Support indicators returned by the backend client record.</p></div></div>
  <div class="placeholder-grid compact-cards client-ops-grid-v40">
    <article><span>Portal Status</span><strong>${portalConfigured ? 'Active' : 'Pending'}</strong><small>${client.activationAt || 'Activation date unavailable'}</small></article>
    <article><span>Last Login</span><strong>${lastLogin}</strong><small>Backend value</small></article>
    <article><span>MFA</span><strong>${mfa}</strong><small>Backend value</small></article>
    <article><span>Export Policy</span><strong>${client.exportPolicy || 'Not provided'}</strong><small>Backend export policy</small></article>
  </div>`;
}

function clientPlantsTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const counts = FleetClientModel.countsForClient(client.id);
  const createUrl = `plants.html?view=solar&create=1&client=${encodeURIComponent(client.id)}&clientName=${encodeURIComponent(client.name)}&tenant=${encodeURIComponent(client.tenant)}&country=${encodeURIComponent(client.country || '')}&region=${encodeURIComponent(client.region || '')}&city=${encodeURIComponent(client.city || '')}&timezone=${encodeURIComponent(client.timezone || 'Asia/Yerevan')}&contact=${encodeURIComponent(client.primaryContact || client.contactEmail || '')}`;
  if (!plants.length) return `<div class="section-title-v17"><div><h2>Assigned Plants</h2><p class="muted">Plants linked to this client will appear here with role, access and commercial scope.</p></div><button class="small-btn primary" type="button" onclick="location.href='${createUrl}'">Create Plant</button></div><div class="empty-state"><strong>No plants assigned</strong><small>No End User portal plant scope will be available until at least one plant is assigned.</small></div>`;
  return `<div class="section-title-v17"><div><h2>Assigned Plants</h2><p class="muted">Client plant portfolio with assignment role, portal visibility and commercial scope.</p></div><div class="section-actions-v28"><span class="badge success">${plants.length} assigned</span><button class="small-btn primary" type="button" onclick="location.href='${createUrl}'">Create Plant</button></div></div>
  <div class="info-grid">
    <div><span>Total Plants</span><strong>${plants.length}</strong><small>Assigned to this client</small></div>
    <div><span>Total Capacity</span><strong>${counts.capacity}</strong><small>Installed DC capacity</small></div>
    <div><span>Device Records</span><strong>${counts.devices}</strong><small>Linked plant devices</small></div>
    <div><span>Open Alerts</span><strong>${counts.alerts}</strong><small>Across assigned plants</small></div>
  </div>
  <div class="data-table compact-table client-plant-table-v40 client-assignment-table-v89">
    <div class="data-head"><span>Plant</span><span>Client Role</span><span>Portal Scope</span><span>Status / Capacity</span><span>Commercial Scope</span><span>Actions</span></div>
    ${clientPlantAssignments(client, plants).map(a => `<div class="data-row" data-plant="${a.plant.id}"><div><strong>${a.plant.name}</strong><small>${a.plant.code}<br>${a.plant.id}</small></div><div><strong>${a.role}</strong><small>Assigned since ${a.since}</small></div><div><strong>${a.portalScope}</strong><small>Client portal visibility</small></div><div><span class="badge ${FleetClientModel.badge(a.plant.health)}">${a.plant.health}</span><small>${a.plant.capacityDc} DC · ${a.plant.capacityAc} AC</small></div><div><strong>${a.commercialScope}</strong><small>${a.plant.alerts} alerts · ${a.plant.energyToday}</small></div><div class="row-actions"><button type="button">Open</button></div></div>`).join('')}
  </div>`;
}


function clientBankAccounts(client: FleetClientRecord): FleetBankAccount[] {
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const candidates = [client.bankAccounts, raw.bankAccounts, raw.banks, raw.paymentAccounts].find(Array.isArray) as unknown[] | undefined;
  if (!candidates) return [];
  return candidates.map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      bankName:String(row.bankName || row.bank || row.name || ''),
      bankCode:String(row.bankCode || row.code || ''),
      accountNumber:String(row.accountNumber || row.account || row.iban || ''),
      accountCurrency:String(row.accountCurrency || row.currency || ''),
      primary:Boolean(row.primary || row.isPrimary || index === 0)
    };
  }).filter(account => Boolean(account.bankName || account.accountNumber));
}

function clientBankingSection(client: FleetClientRecord): string {
  const banks = clientBankAccounts(client);
  if (!banks.length) return `<div class="section-title-v17 mini"><div><h3>Banking Information</h3><p class="muted">Bank account information used for billing, settlements and client financial records.</p></div><span class="badge warning">Not configured</span></div><div class="empty-state"><strong>No bank account added</strong><small>The backend client response did not include bank account records.</small></div>`;
  return `<div class="section-title-v17 mini"><div><h3>Banking Information</h3><p class="muted">Bank account information used for billing, settlements and client financial records.</p></div><span class="badge success">${banks.length} bank${banks.length === 1 ? '' : 's'}</span></div>
  <div class="data-table compact-table client-bank-detail-table-v91"><div class="data-head"><span>Bank</span><span>Bank Code</span><span>Account Number</span><span>Currency</span><span>Status</span></div>${banks.map(b => `<div class="data-row"><div><strong>${b.bankName || 'Not provided'}</strong><small>${b.primary ? 'Primary bank' : 'Additional bank'}</small></div><div><strong>${b.bankCode || 'Not provided'}</strong><small>Bank code</small></div><div><strong>${b.accountNumber || 'Not provided'}</strong><small>Account number / IBAN</small></div><div><strong>${b.accountCurrency || 'Not provided'}</strong><small>Account currency</small></div><div><span class="badge ${b.primary ? 'success' : 'neutral'}">${b.primary ? 'Primary' : 'Secondary'}</span></div></div>`).join('')}</div>`;
}

function clientCommercialProfile(client: FleetClientRecord, _plants: FleetPlantRecord[]) {
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const commercial = raw.commercial && typeof raw.commercial === 'object' ? raw.commercial as Record<string, unknown> : raw;
  const bankAccounts = clientBankAccounts(client);
  const primaryBank = bankAccounts.find(account => account.primary) || bankAccounts[0];
  const value = (...keys: string[]): string => {
    for (const key of keys) {
      const candidate = commercial[key];
      if (candidate !== undefined && candidate !== null && String(candidate).trim()) return String(candidate);
    }
    return 'Not provided';
  };
  const profile = {
    model:value('commercialModel','model','contractModel'),
    contract:value('contractStatus','commercialStatus','status'),
    paymentTerms:value('paymentTerms','billingTerms'),
    invoiceCycle:value('invoiceCycle','billingCycle'),
    energyBuyer:value('energyBuyer','buyer','offtaker'),
    salesChannel:value('salesChannel','saleChannel','marketChannel'),
    saleRate:value('saleRate','energyRate','tariff'),
    estimatedRevenue:value('estimatedRevenue','monthlyRevenue','revenue'),
    bank:primaryBank?.bankName || 'Not provided',
    iban:primaryBank?.accountNumber || 'Not provided',
    currency:String(client.currency || commercial.currency || primaryBank?.accountCurrency || 'Not provided'),
    destination:value('paymentDestination','destination','settlementAccount'),
    settlementStatus:value('settlementStatus','settlementState'),
    approval:value('approvalRule','approval','settlementApproval')
  };
  return { ...profile, available:Object.values(profile).some(item => item !== 'Not provided') || bankAccounts.length > 0 };
}

function clientCommercialRows(client: FleetClientRecord, plants: FleetPlantRecord[], profile: ReturnType<typeof clientCommercialProfile>) {
  return clientPlantAssignments(client, plants).map(assignment => {
    const raw = assignment.plant.raw && typeof assignment.plant.raw === 'object' ? assignment.plant.raw as Record<string, unknown> : {};
    const commercial = raw.commercial && typeof raw.commercial === 'object' ? raw.commercial as Record<string, unknown> : raw;
    return {
      ...assignment,
      buyer:String(commercial.energyBuyer || commercial.buyer || commercial.offtaker || profile.energyBuyer),
      rate:String(commercial.saleRate || commercial.energyRate || commercial.tariff || profile.saleRate),
      meter:String(commercial.meteringBasis || commercial.meter || 'Not provided'),
      settlement:String(commercial.settlementStatus || commercial.settlementState || profile.settlementStatus)
    };
  });
}

function clientCommercialPaymentsTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const profile = clientCommercialProfile(client, plants);
  const rows = clientCommercialRows(client, plants, profile);
  if (!profile.available && !rows.some(row => [row.buyer,row.rate,row.meter,row.settlement,row.commercialScope].some(value => value && value !== 'Not provided'))) {
    return `<div class="section-title-v17"><div><h2>Commercial & Payments</h2><p class="muted">Commercial and payment information is displayed only when returned by the backend.</p></div><span class="badge warning">No API data</span></div><div class="empty-state"><strong>No commercial records returned</strong><small>The current client and plant API responses do not include commercial, sale, banking or settlement data.</small></div>`;
  }
  return `<div class="section-title-v17"><div><h2>Commercial & Payments</h2><p class="muted">Client → Assigned Plant → Commercial Model → Energy Sale → Payment Destination → Settlement / Audit.</p></div><span class="badge ${profile.contract === 'Active' ? 'success' : 'warning'}">${clientDetailEscape(profile.contract)}</span></div>
  <div class="commercial-flow-v90">
    <article><span>1</span><strong>Client</strong><small>${clientDetailEscape(client.name)}<br>${clientDetailEscape(client.code)}</small></article>
    <article><span>2</span><strong>Assigned Plants</strong><small>${plants.length} plant${plants.length === 1 ? '' : 's'} · ${clientDetailEscape(client.assignmentRole)}</small></article>
    <article><span>3</span><strong>Commercial Model</strong><small>${clientDetailEscape(profile.model)}</small></article>
    <article><span>4</span><strong>Energy Sale</strong><small>${clientDetailEscape(profile.salesChannel)}<br>${clientDetailEscape(profile.saleRate)}</small></article>
    <article><span>5</span><strong>Payment Destination</strong><small>${clientDetailEscape(profile.bank)}<br>${clientDetailEscape(profile.currency)}</small></article>
    <article><span>6</span><strong>Settlement / Audit</strong><small>${clientDetailEscape(profile.settlementStatus)}</small></article>
  </div>
  <div class="info-grid commercial-client-grid-v90">
    <div><span>Commercial Model</span><strong>${clientDetailEscape(profile.model)}</strong><small>Backend value</small></div>
    <div><span>Estimated Monthly Revenue</span><strong>${clientDetailEscape(profile.estimatedRevenue)}</strong><small>Backend value</small></div>
    <div><span>Payment Terms</span><strong>${clientDetailEscape(profile.paymentTerms)}</strong><small>${clientDetailEscape(profile.invoiceCycle)}</small></div>
    <div><span>Energy Buyer</span><strong>${clientDetailEscape(profile.energyBuyer)}</strong><small>${clientDetailEscape(profile.salesChannel)}</small></div>
    <div><span>Payment Destination</span><strong>${clientDetailEscape(profile.destination)}</strong><small>${clientDetailEscape(profile.bank)} · ${clientDetailEscape(profile.iban)}</small></div>
    <div><span>Approval Rule</span><strong>${clientDetailEscape(profile.approval)}</strong><small>Backend value</small></div>
  </div>
  ${clientBankingSection(client)}
  <div class="section-title-v17 mini"><div><h3>Plant Commercial Scope</h3><p class="muted">Commercial values returned for assigned plants.</p></div><span class="badge ${rows.length ? 'success' : 'warning'}">${rows.length ? 'API data' : 'No records'}</span></div>
  ${rows.length ? `<div class="data-table compact-table client-commercial-chain-table-v90"><div class="data-head"><span>Assigned Plant</span><span>Client Role</span><span>Energy Sale</span><span>Meter / Accounting Basis</span><span>Payment Destination</span><span>Settlement</span></div>${rows.map(row => `<div class="data-row"><div><strong>${clientDetailEscape(row.plant.name)}</strong><small>${clientDetailEscape(row.plant.code)}<br>${clientDetailEscape(row.plant.capacityDc)} DC</small></div><div><strong>${clientDetailEscape(row.role)}</strong><small>${clientDetailEscape(row.commercialScope)}</small></div><div><strong>${clientDetailEscape(row.buyer)}</strong><small>${clientDetailEscape(row.rate)}</small></div><div><strong>${clientDetailEscape(row.meter)}</strong><small>Backend value</small></div><div><strong>${clientDetailEscape(profile.bank)}</strong><small>${clientDetailEscape(profile.iban)}<br>${clientDetailEscape(profile.currency)}</small></div><div><span class="badge warning">${clientDetailEscape(row.settlement)}</span><small>Backend value</small></div></div>`).join('')}</div>` : `<div class="empty-state"><strong>No plant commercial records</strong><small>Assigned plant responses do not include commercial metadata.</small></div>`}`;
}

function clientAlertsTab(client: FleetClientRecord, plants: FleetPlantRecord[]): string {
  const linked = Array.isArray(client.linkedAlerts) ? client.linkedAlerts as unknown[] : [];
  const alerts = linked.map(item => item && typeof item === 'object' ? item as Record<string, unknown> : {}).map(row => {
    const plantId = String(row.plantId || (row.raw && typeof row.raw === 'object' ? (row.raw as Record<string, unknown>).sourcePlantId || '' : ''));
    const plant = plants.find(candidate => candidate.id === plantId || candidate.externalId === plantId);
    return {
      plantId,
      plantName:String(row.plant || row.plantName || plant?.name || 'Unknown Plant'),
      plantCode:String(plant?.code || plantId || '—'),
      title:String(row.title || row.description || row.message || row.id || 'Alert'),
      severity:String(row.severity || 'Unknown'),
      source:String(row.device || row.deviceId || row.source || row.vendor || 'Not provided'),
      time:String(row.created || row.occurredAtUtc || row.updated || 'Not provided'),
      status:String(row.status || 'Unknown')
    };
  });
  const critical = alerts.filter(alert => alert.severity === 'Critical').length;
  const warning = alerts.filter(alert => alert.severity === 'Warning').length;
  return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Active plant and device issues connected to this client from the Alerts API.</p></div><span class="badge ${alerts.length ? 'warning' : 'success'}">${alerts.length ? alerts.length + ' active' : 'Clear'}</span></div>
  <div class="info-grid">
    <div><span>Critical</span><strong>${critical}</strong><small>API records</small></div>
    <div><span>Warning</span><strong>${warning}</strong><small>API records</small></div>
    <div><span>Impacted Plants</span><strong>${new Set(alerts.map(alert => alert.plantId).filter(Boolean)).size}</strong><small>Matched API plant relations</small></div>
    <div><span>Primary Flow</span><strong>Alert → Plant → Device</strong><small>Backend relation</small></div>
  </div>
  ${alerts.length ? `<div class="data-table compact-table client-alert-table-v40"><div class="data-head"><span>Alert</span><span>Severity</span><span>Plant</span><span>Source</span><span>Status</span></div>${alerts.map(alert => `<div class="data-row" data-plant="${clientDetailAttr(alert.plantId)}"><div><strong>${clientDetailEscape(alert.title)}</strong><small>${clientDetailEscape(alert.time)}</small></div><div><span class="badge ${alert.severity === 'Critical' ? 'danger' : alert.severity === 'Warning' ? 'warning' : 'neutral'}">${clientDetailEscape(alert.severity)}</span></div><div><strong>${clientDetailEscape(alert.plantName)}</strong><small>${clientDetailEscape(alert.plantCode)}</small></div><div><strong>${clientDetailEscape(alert.source)}</strong><small>API source</small></div><div><strong>${clientDetailEscape(alert.status)}</strong><small>Backend status</small></div></div>`).join('')}</div>` : `<div class="empty-state"><strong>No active alerts returned</strong><small>The Alerts API returned no records linked to this client's assigned plants.</small></div>`}`;
}

function clientActivityTab(client: FleetClientRecord, _plants: FleetPlantRecord[]): string {
  const raw = client.raw && typeof client.raw === 'object' ? client.raw as Record<string, unknown> : {};
  const activity = [raw.activity, raw.activities, raw.auditTrail, raw.timeline].find(Array.isArray) as unknown[] | undefined;
  const rows = (activity || []).map(item => item && typeof item === 'object' ? item as Record<string, unknown> : {}).map(row => ({
    time:String(row.time || row.createdAt || row.occurredAt || row.date || 'Not provided'),
    text:String(row.message || row.description || row.action || row.title || '')
  })).filter(row => Boolean(row.text));
  if (!rows.length) {
    const created = String(raw.createdAtUtc || raw.createdAt || '');
    const updated = String(raw.updatedAtUtc || raw.updatedAt || '');
    if (created) rows.push({ time:created, text:'Client record created' });
    if (updated && updated !== created) rows.push({ time:updated, text:'Client record updated' });
  }
  return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Client-level timeline returned by the backend.</p></div></div>${rows.length ? `<div class="timeline-v17 client-activity-v40">${rows.map(row => `<div><b>${clientDetailEscape(row.time)}</b><span>${clientDetailEscape(row.text)}</span></div>`).join('')}</div>` : `<div class="empty-state"><strong>No activity records returned</strong><small>The current client API response does not include an activity or audit timeline.</small></div>`}`;
}

function clientTab(client: FleetClientRecord, plants: FleetPlantRecord[], tab: ClientDetailTabKey | string | undefined, editable = false, skipContext = false): string {
  const activeTab = (tab || 'overview') as ClientDetailTabKey;
  if (editable) return clientDetailEditTab(client, plants, activeTab);
  let body = '';
  if (activeTab === 'identity') body = `${clientIdentityTab(client)}${clientDocuments(client)}`;
  else if (activeTab === 'location') body = clientLocationPreferencesTab(client);
  else if (activeTab === 'portal') body = clientContactsPortalTab(client, plants);
  else if (activeTab === 'users') body = clientUsersAccessTab(client, plants);
  else if (activeTab === 'plants') body = clientPlantsTab(client, plants);
  else if (activeTab === 'commercial') body = clientCommercialPaymentsTab(client, plants);
  else if (activeTab === 'alerts') body = clientAlertsTab(client, plants);
  else if (activeTab === 'activity') body = clientActivityTab(client, plants);
  else body = clientOverviewTab(client, plants);
  return `${skipContext ? '' : clientDetailSectionContext(client, activeTab, false)}${body}`;
}


type PlantDetailTabKey = 'overview' | 'structure' | 'energy' | 'alerts' | 'device' | 'inverters' | 'arrays' | 'batteries' | 'metering' | 'gateways' | 'reportsdocs' | 'adminsync' | 'activity';
type PlantDetailFeedbackTone = 'info' | 'warning' | 'danger' | 'success';

let plantDetailActiveTab: PlantDetailTabKey = 'overview';
let plantDetailEditMode = false;
let plantDetailDraft: FleetPlantRecord | null = null;
let plantDetailEditSnapshot = '';
let plantDetailBusy = false;
let plantDetailBeforeUnloadBound = false;

function plantDetailEscape(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function plantDetailAttr(value: unknown): string { return plantDetailEscape(value).replace(/`/g, '&#096;'); }
function plantDetailClone(record: FleetPlantRecord): FleetPlantRecord { return JSON.parse(JSON.stringify(record)) as FleetPlantRecord; }
function plantDetailOrigin(record: FleetPlantRecord): FleetDataOrigin { return FleetEntityDetailUX.origin(record, 'plant'); }
function plantDetailAdminId(record: FleetPlantRecord): string {
  const raw=record.raw || {};
  const adminRecord=raw.adminRecord && typeof raw.adminRecord==='object' && !Array.isArray(raw.adminRecord) ? raw.adminRecord as Record<string,unknown> : {};
  return String(record.adminId || record.registryPlantId || adminRecord.id || adminRecord.plantId || '').trim();
}
function plantDetailBackendManaged(record: FleetPlantRecord): boolean { return Boolean(plantDetailAdminId(record)); }
function plantDetailArchived(record: FleetPlantRecord): boolean { return FleetEntityDetailUX.archived(record.status); }
function plantDetailEditableTab(tab: PlantDetailTabKey = plantDetailActiveTab): boolean { return tab === 'overview'; }
function plantDetailCanEdit(record: FleetPlantRecord, tab: PlantDetailTabKey = plantDetailActiveTab): boolean {
  return plantDetailBackendManaged(record) && !plantDetailArchived(record) && plantDetailEditableTab(tab);
}
function plantDetailSourceSystem(record: FleetPlantRecord): string {
  if (record.sourceSystem) return String(record.sourceSystem);
  if (record.integration) return String(record.integration);
  const external = String(record.externalId || '');
  if (external.startsWith('HUA')) return 'Huawei FusionSolar';
  if (external.startsWith('SUN')) return 'Sungrow iSolarCloud';
  if (external.startsWith('SE-')) return 'SolarEdge';
  if (external === 'LOCAL-STORAGE') return 'Manual / Local storage';
  return 'Vendor connector';
}
function plantDetailFreshness(record: FleetPlantRecord): string {
  return FleetEntityDetailUX.freshness(record, 'plant', {
    timestampKeys:['lastSyncAt','updated','raw.lastSyncAt','raw.lastSyncAtUtc','raw.updatedAt'],
    localPrefix:'Last local change:',
    localEmpty:'Local prototype record · no backend freshness',
    mockEmpty:'Mock record · no backend freshness'
  });
}
function plantDetailModeCopy(record: FleetPlantRecord): { tone: PlantDetailFeedbackTone; title: string; message: string } {
  if (plantDetailOrigin(record)!=='local' && !plantDetailBackendManaged(record)) return { tone:'info', title:'Operational plant · read-only', message:'Master-data editing, lifecycle actions and documents require a linked /api/admin/plants record.' };
  return FleetEntityDetailUX.modeCopy(record,'plant',{
    status:record.status,
    backendTitle:'Plant Registry record · backend editing available',
    backendMessage:'Supported master-data edits are saved through PUT /api/admin/plants/{id}. Lifecycle changes use dedicated backend actions.',
    backendTone:'info', archivedTitle:'Archived plant', archivedMessage:'Archived plants are read-only. Plant status is not editable as a normal form field.', localTone:'warning'
  });
}
function setPlantDetailFeedback(tone: PlantDetailFeedbackTone, title: string, message: string): void {
  FleetEntityDetailUX.setFeedback({ id:'plantDetailFeedback', className:'plant-detail-feedback-v119', tone, title, message, escape:plantDetailEscape });
}
function clearPlantDetailFeedback(): void {
  FleetEntityDetailUX.clearFeedback('plantDetailFeedback', 'plant-detail-feedback-v119');
}
function renderPlantDetailControl(record: FleetPlantRecord): string {
  const origin = plantDetailOrigin(record);
  const copy = plantDetailModeCopy(record);
  return `<section class="plant-detail-control-v119 ${copy.tone}" id="plantDetailControl" aria-busy="false">
    <div class="plant-detail-control-source-v119"><span>Record source</span><strong>${FleetDataSource.badge(record, 'plant', true)} ${plantDetailEscape(FleetDataSource.label(origin))}</strong><small>${plantDetailEscape(plantDetailFreshness(record))}</small><span class="permission-profile-v121" data-permission-summary data-permission-resource="plant"></span></div>
    <div class="plant-detail-control-copy-v119"><strong>${plantDetailEscape(copy.title)}</strong><small>${plantDetailEscape(copy.message)}</small></div>
    <div class="plant-detail-feedback-v119 info" id="plantDetailFeedback" role="status" aria-live="polite" hidden></div>
  </section>`;
}
function plantDetailSectionTitle(tab: PlantDetailTabKey): string {
  return ({ overview:'Overview & Master Data', structure:'Plant Structure', energy:'Energy & Telemetry', alerts:'Alerts & Events', device:'Devices & Device', inverters:'Inverters', arrays:'Arrays & Strings', batteries:'BESS / PCS', metering:'Metering & Grid', gateways:'Loggers & Gateways', reportsdocs:'Reports & Documents', adminsync:'Settings & Source', activity:'Activity' } as Record<PlantDetailTabKey,string>)[tab];
}
function plantDetailSectionContext(record: FleetPlantRecord, tab: PlantDetailTabKey, editable = plantDetailEditMode): string {
  const mode = FleetEntityDetailUX.sectionMode({ editable, backendManaged:plantDetailBackendManaged(record), archived:plantDetailArchived(record), sectionEditable:plantDetailEditableTab(tab), readonlyLabel:'Operational read-only' });
  const help = editable ? 'A backend update endpoint is required before changes can be saved.' : plantDetailEditableTab(tab) ? 'Values are loaded from the backend plant record.' : 'This section is derived from linked API devices, alerts or telemetry fields.';
  return `<div class="plant-section-context-v119"><div><span>Section mode</span><strong>${plantDetailEscape(mode)}</strong><small>${plantDetailEscape(help)}</small></div></div>`;
}
function plantDetailNumber(value: unknown): number {
  const normalized = String(value ?? '').replace(/,/g,'.').match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : NaN;
}
function plantDetailFormatCapacity(value: unknown, unit: 'MWp' | 'MW'): string {
  const number = plantDetailNumber(value);
  return Number.isFinite(number) ? `${Number(number.toFixed(3))} ${unit}` : `0 ${unit}`;
}
function plantDetailFormValue(value: unknown): string {
  const number = plantDetailNumber(value);
  return Number.isFinite(number) ? String(number) : '';
}
function plantDetailInput(name: keyof FleetPlantRecord, label: string, value: unknown, options?: string[], type = 'text', required = false, help = ''): string {
  const requiredAttr = required ? ' required' : '';
  const control = options
    ? `<select name="${String(name)}" data-plant-edit="${String(name)}"${requiredAttr}>${options.map(option => `<option value="${plantDetailAttr(option)}" ${String(value) === option ? 'selected' : ''}>${plantDetailEscape(option)}</option>`).join('')}</select>`
    : `<input type="${type}" name="${String(name)}" data-plant-edit="${String(name)}" value="${plantDetailAttr(value)}"${requiredAttr}${type === 'number' ? ' step="0.01" min="0" inputmode="decimal"' : ''} />`;
  return `<label>${plantDetailEscape(label)}${required ? ' *' : ''}${control}${help ? `<small class="field-help">${plantDetailEscape(help)}</small>` : ''}</label>`;
}
function plantDetailClientOptions(selectedId: string): string[] {
  const ids = FleetClientModel.clients.filter(client => client.dataOrigin === 'live').map(client => client.id);
  return ids.includes(selectedId) ? ids : [selectedId, ...ids].filter(Boolean);
}
function plantDetailTenantOptions(record: FleetPlantRecord): string[] {
  return Array.from(new Set([String(record.operator || ''), ...FleetClientModel.clients.map(client => String(client.tenant || '')), ...FleetClientModel.plants.map(plant => String(plant.operator || ''))].map(value => value.trim()).filter(Boolean)));
}
function plantDetailClientLabel(clientId: string): string {
  const client = FleetClientModel.clients.find(item => item.dataOrigin === 'live' && item.id === clientId);
  return client ? `${client.name} · ${client.id}` : clientId || 'Unassigned client';
}
function plantDetailClientSelect(record: FleetPlantRecord): string {
  const options = plantDetailClientOptions(record.clientId).map(id => `<option value="${plantDetailAttr(id)}" ${id === record.clientId ? 'selected' : ''}>${plantDetailEscape(plantDetailClientLabel(id))}</option>`).join('');
  return `<label>Client / Owner *<select name="clientId" data-plant-edit="clientId" required>${options}</select><small class="field-help">Changes the client assignment through the Plant Registry backend update for live records.</small></label>`;
}
function plantDetailEditTab(record: FleetPlantRecord, tab: PlantDetailTabKey): string {
  if (tab === 'overview') {
    return `${plantDetailSectionContext(record, tab, true)}<div class="section-title-v17"><div><h2>Plant Master Data</h2><p class="muted">Edit local identity, location and technical passport values. Operational status stays read-only.</p></div></div>
      <div class="plant-edit-grid-v119">
        ${plantDetailInput('name','Plant Name',record.name,undefined,'text',true)}
        ${plantDetailInput('code','Plant Code',record.code,undefined,'text',true)}
        ${plantDetailInput('type','Plant Type',record.type,['Residential','Commercial','Industrial','Utility Scale','Hybrid / Storage'],'text',true)}
        ${plantDetailClientSelect(record)}
        ${plantDetailInput('operator','Managing Tenant',record.operator,plantDetailTenantOptions(record),'text',true)}
        ${plantDetailInput('om','Service / O&M Provider',record.om,undefined,'text',true)}
        ${plantDetailInput('country','Country',record.country,['Armenia','United States','Germany','Spain','France','Other'],'text',true)}
        ${plantDetailInput('region','Region',record.region,undefined,'text',true)}
        ${plantDetailInput('city','City',record.city,undefined,'text',true)}
        ${plantDetailInput('address','Address',record.address,undefined,'text',true)}
        ${plantDetailInput('timezone','Time Zone',record.timezone,undefined,'text',true)}
        ${plantDetailInput('commissioning','Commissioning Date',record.commissioning,undefined,'date',false)}
        ${plantDetailInput('latitude','Latitude',record.latitude || '',undefined,'number',false,'Optional · -90 to 90')}
        ${plantDetailInput('longitude','Longitude',record.longitude || '',undefined,'number',false,'Optional · -180 to 180')}
        ${plantDetailInput('capacityDc','Installed Capacity DC (MWp)',plantDetailFormValue(record.capacityDc),undefined,'number',true)}
        ${plantDetailInput('capacityAc','Installed Capacity AC (MW)',plantDetailFormValue(record.capacityAc),undefined,'number',true)}
        ${plantDetailInput('gridCapacity','Grid Connection Capacity (MW)',plantDetailFormValue(record.gridCapacity),undefined,'number',true)}
        ${plantDetailInput('battery','Battery Installed',record.battery,['No','Yes','Unknown'],'text',true)}
      </div>
      <div class="plant-readonly-status-v119"><div><span>Lifecycle Status</span><strong>${plantDetailEscape(record.status)}</strong><small>Status is not editable through the generic form.</small></div><div><span>Operational Health</span><strong>${plantDetailEscape(record.health)}</strong><small>Derived from live data, devices and alerts.</small></div></div>`;
  }
  return `${plantDetailSectionContext(record, tab, true)}<div class="section-title-v17"><div><h2>Settings & Source</h2><p class="muted">Edit local assignment and source metadata. Changing source identity may break mappings and requires confirmation.</p></div></div>
    <div class="plant-edit-grid-v119">
      ${plantDetailInput('portfolio','Portfolio',record.portfolio,undefined,'text',true)}
      ${plantDetailInput('sourceSystem','Source System',record.sourceSystem || plantDetailSourceSystem(record),['Manual / Local storage','Huawei FusionSolar','Sungrow iSolarCloud','SolisCloud','GoodWe SEMS','SolaX Cloud','Deye / Solarman','SolarEdge','Other Vendor'],'text',true)}
      ${plantDetailInput('integration','Integration / Connector',record.integration || plantDetailSourceSystem(record),undefined,'text',true)}
      ${plantDetailInput('externalId','External Plant ID',record.externalId,undefined,'text',true,'Changing this value affects source mapping traceability.')}
      ${plantDetailInput('tenantId','Tenant ID / Reference',record.tenantId || '',undefined,'text',false)}
      ${plantDetailInput('om','Service / O&M Provider',record.om,undefined,'text',true)}
    </div>
    <div class="plant-source-warning-v119" role="note"><strong>Mapping safety</strong><small>Changes to Source System, Integration or External Plant ID affect mapping traceability. Confirm the change before saving to the backend.</small></div>`;
}
function plantDetailSnapshot(): string { return JSON.stringify(plantDetailDraft || {}); }
function plantDetailHasUnsavedEdits(): boolean { return plantDetailEditMode && plantDetailEditSnapshot !== plantDetailSnapshot(); }
function plantDetailConfirmDiscard(message = 'Discard unsaved plant changes?'): boolean {
  return FleetEntityDetailUX.confirmDiscard(plantDetailHasUnsavedEdits(), message);
}
function plantDetailPrepareDraft(record: FleetPlantRecord): FleetPlantRecord {
  const draft = plantDetailClone(record);
  draft.sourceSystem = draft.sourceSystem || plantDetailSourceSystem(record);
  draft.integration = draft.integration || plantDetailSourceSystem(record);
  return draft;
}
function plantDetailValidationIssues(record: FleetPlantRecord, tab: PlantDetailTabKey, root: ParentNode): FleetFormIssue[] {
  const issues: FleetFormIssue[] = [];
  const control = (name: string): FleetFormControl | null => root.querySelector<FleetFormControl>(`[data-plant-edit="${name}"]`);
  const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase();
  if (tab === 'overview') {
    const duplicateName = FleetClientModel.plants.find(plant => plant.id !== record.id && normalized(plant.name) === normalized(record.name));
    const duplicateCode = FleetClientModel.plants.find(plant => plant.id !== record.id && normalized(plant.code) === normalized(record.code));
    if (duplicateName) issues.push({ control:control('name'), message:`Another plant already uses the name ${record.name}.` });
    if (duplicateCode) issues.push({ control:control('code'), message:`Another plant already uses the code ${record.code}.` });
    if (!FleetClientModel.clients.some(client => client.id === record.clientId)) issues.push({ control:control('clientId'), message:'Select a valid client assignment.' });
    const dc = plantDetailNumber(record.capacityDc);
    const ac = plantDetailNumber(record.capacityAc);
    const grid = plantDetailNumber(record.gridCapacity);
    if (!Number.isFinite(dc) || dc <= 0) issues.push({ control:control('capacityDc'), message:'Installed DC capacity must be greater than 0 MWp.' });
    if (!Number.isFinite(ac) || ac <= 0) issues.push({ control:control('capacityAc'), message:'Installed AC capacity must be greater than 0 MW.' });
    if (!Number.isFinite(grid) || grid <= 0) issues.push({ control:control('gridCapacity'), message:'Grid connection capacity must be greater than 0 MW.' });
    if (Number.isFinite(dc) && Number.isFinite(ac) && ac > dc) issues.push({ control:control('capacityAc'), message:'Installed AC capacity cannot exceed installed DC capacity.' });
    if (Number.isFinite(ac) && Number.isFinite(grid) && grid > ac) issues.push({ control:control('gridCapacity'), message:'Grid connection capacity cannot exceed installed AC capacity.' });
    const latitude = String(record.latitude || '').trim();
    const longitude = String(record.longitude || '').trim();
    if (latitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) issues.push({ control:control('latitude'), message:'Latitude must be between -90 and 90.' });
    if (longitude && (!Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) issues.push({ control:control('longitude'), message:'Longitude must be between -180 and 180.' });
  }
  if (tab === 'adminsync') {
    const duplicateExternal = FleetClientModel.plants.find(plant => plant.id !== record.id && normalized(plant.externalId) === normalized(record.externalId));
    if (duplicateExternal) issues.push({ control:control('externalId'), message:`External Plant ID ${record.externalId} is already used by another plant.` });
  }
  return issues;
}
function plantDetailNormalizeForSave(record: FleetPlantRecord): FleetPlantRecord {
  const selectedClient = FleetClientModel.clients.find(client => client.id === record.clientId);
  return {
    ...record,
    owner: selectedClient?.name || record.owner,
    capacityDc: plantDetailFormatCapacity(record.capacityDc, 'MWp'),
    capacityAc: plantDetailFormatCapacity(record.capacityAc, 'MW'),
    gridCapacity: plantDetailFormatCapacity(record.gridCapacity, 'MW'),
    sourceSystem: record.sourceSystem || plantDetailSourceSystem(record),
    integration: record.integration || record.sourceSystem || plantDetailSourceSystem(record),
    updated: new Date().toLocaleString()
  };
}
function plantDetailUpdatePayload(record: FleetPlantRecord): Record<string, unknown> {
  const dcMw=plantDetailNumber(record.capacityDc), acMw=plantDetailNumber(record.capacityAc), gridMw=plantDetailNumber(record.gridCapacity);
  const clean=(value:unknown):string=>{ const text=String(value ?? '').trim(); return text==='—'?'':text; };
  const payload:Record<string,unknown>={ plantName:clean(record.name), plantCode:clean(record.code), clientId:clean(record.clientId), plantType:clean(record.type), countryRegion:clean(record.country), plantTimeZone:clean(record.timezone) };
  const optional=(key:string,value:unknown):void=>{ if(value===undefined||value===null||value==='')return; payload[key]=value; };
  optional('managingTenantId',clean(record.tenantId)); optional('managingTenant',clean(record.tenantId || record.operator)); optional('region',clean(record.region)); optional('city',clean(record.city)); optional('address',clean(record.address)); optional('commissioningDate',clean(record.commissioning)); optional('serviceProvider',clean(record.om));
  const raw=record.raw || {}; const rawLocation=raw.location && typeof raw.location==='object' && !Array.isArray(raw.location) ? raw.location as Record<string,unknown> : {}; const rawTechnical=raw.technical && typeof raw.technical==='object' && !Array.isArray(raw.technical) ? raw.technical as Record<string,unknown> : {}; const rawCommercial=raw.commercial && typeof raw.commercial==='object' && !Array.isArray(raw.commercial) ? raw.commercial as Record<string,unknown> : {};
  const location:Record<string,unknown>={...rawLocation}; const setLocation=(key:string,value:unknown):void=>{ const text=clean(value); if(text)location[key]=text; };
  setLocation('address',record.address); setLocation('countryRegion',record.country); setLocation('region',record.region); setLocation('city',record.city); setLocation('timezone',record.timezone);
  const latText=clean(record.latitude), lngText=clean(record.longitude); if(latText)location.lat=latText; if(lngText)location.lng=lngText; if(!clean(location.coordinates)&&latText&&lngText)location.coordinates=`${latText}, ${lngText}`; if(!clean(location.mapRef)&&clean(record.address))location.mapRef=clean(record.address); optional('location',location);
  optional('technical',{...rawTechnical}); optional('commercial',{...rawCommercial}); optional('sourceScheme',clean(record.sourceSystem || plantDetailSourceSystem(record))); optional('integrationName',clean(record.integration)); optional('externalPlantId',clean(record.externalId)); optional('portfolio',clean(record.portfolio));
  const latitude=Number(clean(record.latitude)), longitude=Number(clean(record.longitude)); if(clean(record.latitude)&&Number.isFinite(latitude))optional('latitude',latitude); if(clean(record.longitude)&&Number.isFinite(longitude))optional('longitude',longitude); optional('batteryInstalled',clean(record.battery));
  if(Number.isFinite(dcMw)){ payload.installedCapacityDcMw=dcMw; payload.installedPowerKw=dcMw*1000; } if(Number.isFinite(acMw))payload.installedCapacityAcMw=acMw; if(Number.isFinite(gridMw))payload.gridConnectionCapacityMw=gridMw;
  return payload;
}
function plantDetailLifecycleHtml(record: FleetPlantRecord): string {
  if(!plantDetailBackendManaged(record))return '<div class="empty-state"><strong>Lifecycle requires a Plant Registry record</strong><small>Backend lifecycle actions are available only when the plant is linked to /api/admin/plants.</small></div>';
  const status=String(record.status||'').toLowerCase(); if(status==='archived')return '<div class="empty-state"><strong>Plant archived</strong><small>This plant is read-only.</small></div>';
  const primary=status==='active' ? '<button class="secondary-action" type="button" data-plant-lifecycle="deactivate" data-permission-action="deactivate" data-permission-resource="plant">Deactivate</button>' : '<button class="primary-action" type="button" data-plant-lifecycle="activate" data-permission-action="activate" data-permission-resource="plant">Activate</button>';
  return `<div class="row-actions"><span class="badge neutral">${plantDetailEscape(record.status)}</span>${primary}<button class="danger-action" type="button" data-plant-lifecycle="archive" data-permission-action="archive" data-permission-resource="plant">Archive</button></div>`;
}
function plantDetailDocuments(record: FleetPlantRecord): Record<string,unknown>[] {
  const raw=record.raw || {}; const candidates=[raw.documents,raw.documentRecords,raw.adminRecord && typeof raw.adminRecord==='object' ? (raw.adminRecord as Record<string,unknown>).documents : null]; return (candidates.find(Array.isArray) as Record<string,unknown>[] | undefined) || [];
}
function plantDetailDocumentsHtml(record: FleetPlantRecord): string {
  const docs=plantDetailDocuments(record); const rows=docs.map((doc,index)=>{ const id=String(doc.id||doc.documentId||'').trim(); const name=String(doc.name||doc.fileName||doc.filename||`Document ${index+1}`); const type=String(doc.type||doc.documentType||'—'); const expiry=String(doc.expiry||doc.expiryDate||'—'); return `<div class="data-row"><div><strong>${plantDetailEscape(name)}</strong><small>${plantDetailEscape(id||'No document id')}</small></div><span>${plantDetailEscape(type)}</span><span>${plantDetailEscape(expiry)}</span><div class="row-actions">${id ? `<button type="button" data-plant-document-download="${plantDetailAttr(id)}">Download</button><button class="danger-action" type="button" data-plant-document-delete="${plantDetailAttr(id)}">Delete</button>` : '<span class="badge muted">Unavailable</span>'}</div></div>`; }).join('');
  return `<form id="plantDocumentUploadForm" class="plant-document-upload-form"><div class="plant-edit-grid-v119 plant-document-upload-grid-v141"><label>Document Name *<input name="name" placeholder="e.g. Grid Connection Agreement" required></label><label>Type *<select name="type" required><option>Legal</option><option>Technical</option><option>Compliance</option><option>Contract</option><option>Other</option></select></label><label>Expiry Date<input type="date" name="expiry"></label><label>Document File *<input type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required></label></div><div class="row-actions plant-document-upload-actions-v141"><button class="primary-action" type="submit">Upload Document</button></div></form><div class="data-table compact-table plant-document-table-v141"><div class="data-head"><span>Document</span><span>Type</span><span>Expiry</span><span>Actions</span></div>${rows || '<div class="empty-state"><strong>No plant documents</strong><small>Upload the first document using the form above.</small></div>'}</div>`;
}

function plantDetailSourceChanged(base: FleetPlantRecord, draft: FleetPlantRecord): boolean {
  return ['sourceSystem','integration','externalId'].some(key => String(base[key] || '') !== String(draft[key] || ''));
}
function plantDetailAssignmentChanged(base: FleetPlantRecord, draft: FleetPlantRecord): boolean {
  return base.clientId !== draft.clientId || String(base.operator || '') !== String(draft.operator || '');
}
function syncPlantClientAssignments(base: FleetPlantRecord, changed: FleetPlantRecord): void {
  FleetClientModel.clients.forEach(client => {
    const values = Array.isArray(client.plants) ? client.plants.filter(id => id !== base.id) : [];
    if (client.id === changed.clientId && !values.includes(changed.id)) values.push(changed.id);
    client.plants = values;
  });
}
function updatePlantDetailActions(record: FleetPlantRecord): void {
  const edit = document.getElementById('editPlantTab') as HTMLButtonElement | null;
  const cancel = document.getElementById('cancelPlantEdit') as HTMLButtonElement | null;
  const save = document.getElementById('savePlantEdit') as HTMLButtonElement | null;
  const canEdit = plantDetailCanEdit(record);
  if (edit) {
    edit.hidden = plantDetailEditMode;
    edit.disabled = plantDetailBusy || !canEdit;
    edit.title = canEdit ? 'Edit this plant section' : plantDetailArchived(record) ? 'Archived plants are read-only' : 'Backend plant update endpoint is unavailable';
  }
  if (cancel) cancel.hidden = !plantDetailEditMode;
  if (save) save.hidden = !plantDetailEditMode;
}
function renderPlantDetailCurrentTab(baseRecord: FleetPlantRecord, devices: FleetDeviceRecord[]): void {
  const record = plantDetailEditMode && plantDetailDraft ? plantDetailDraft : baseRecord;
  const content = document.getElementById('plantTabContent');
  if (content) content.innerHTML = plantDetailEditMode ? plantDetailEditTab(record, plantDetailActiveTab) : plantTab(record, devices, plantDetailActiveTab);
  const title = document.getElementById('plantDetailActiveTitle');
  if (title) title.textContent = plantDetailSectionTitle(plantDetailActiveTab);
  updatePlantDetailActions(baseRecord);
  FleetLayout.enhanceActionMenus?.(content);
}
function setPlantDetailEditMode(enabled: boolean, baseRecord: FleetPlantRecord, devices: FleetDeviceRecord[]): void {
  if (plantDetailBusy) return;
  if (enabled && !plantDetailCanEdit(baseRecord)) {
    const copy = plantDetailModeCopy(baseRecord);
    setPlantDetailFeedback(copy.tone, copy.title, copy.message);
    return;
  }
  if (!enabled && plantDetailEditMode && !plantDetailConfirmDiscard()) return;
  plantDetailEditMode = enabled;
  plantDetailDraft = enabled ? plantDetailPrepareDraft(baseRecord) : null;
  plantDetailEditSnapshot = enabled ? plantDetailSnapshot() : '';
  const summary = document.getElementById('plantDetailEditSummary');
  if (summary) { summary.hidden = true; summary.innerHTML = ''; }
  clearPlantDetailFeedback();
  renderPlantDetailCurrentTab(baseRecord, devices);
}
async function savePlantDetailEdits(baseRecord: FleetPlantRecord, devices: FleetDeviceRecord[]): Promise<void> {
  if(!plantDetailEditMode || !plantDetailDraft || plantDetailBusy)return;
  const backendManaged=plantDetailBackendManaged(baseRecord);
  if(!FleetActionPermissions.guard({ action:'edit', resource:'plant', record:baseRecord, status:baseRecord.status, origin:plantDetailOrigin(baseRecord), updateAvailable:backendManaged, localOverride:!backendManaged }))return;
  if(!plantDetailCanEdit(baseRecord)){ const copy=plantDetailModeCopy(baseRecord); setPlantDetailFeedback(copy.tone,copy.title,copy.message); return; }
  const content=document.getElementById('plantTabContent'), summary=document.getElementById('plantDetailEditSummary'); if(!content)return;
  const validation=FleetFormUX.validate(content,plantDetailValidationIssues(plantDetailDraft,plantDetailActiveTab,content),summary,'Plant changes were not saved'); if(!validation.valid){FleetFormUX.focusFirst(validation,summary);return;}
  const sourceChanged=plantDetailSourceChanged(baseRecord,plantDetailDraft), assignmentChanged=plantDetailAssignmentChanged(baseRecord,plantDetailDraft); if(sourceChanged&&!window.confirm('Source System, Integration or External Plant ID changed. Save these mapping changes?'))return; if(assignmentChanged&&!window.confirm('Client or Managing Tenant assignment changed. Save this assignment update?'))return;
  const button=document.getElementById('savePlantEdit') as HTMLButtonElement | null; plantDetailBusy=true; document.getElementById('plantDetailControl')?.setAttribute('aria-busy','true'); if(button)FleetFormUX.setBusy(button,true,backendManaged?'Saving to API…':'Saving…');
  try{
    const normalized=plantDetailNormalizeForSave(plantDetailDraft);
    if(backendManaged){ const result=await window.FleetAPIMutations.plants.update(plantDetailAdminId(baseRecord),plantDetailUpdatePayload(normalized)); if(!result.ok)throw new Error(result.error?.message || result.message); plantDetailEditMode=false; plantDetailDraft=null; plantDetailEditSnapshot=''; plantDetailBusy=false; FleetLayout.toast(result.message); window.setTimeout(()=>window.location.reload(),250); return; }
    throw new Error('This plant is not linked to a Plant Registry record, so Tenant Admin will not create a browser-local override.');
  }catch(error){ plantDetailBusy=false; document.getElementById('plantDetailControl')?.setAttribute('aria-busy','false'); if(button)FleetFormUX.setBusy(button,false); FleetFormUX.renderSummary(summary,[{message:error instanceof Error?error.message:'Unable to save the plant.'}],'Plant changes were not saved'); summary?.focus(); }
}

type FleetPlantTelemetryRecord = Record<string, unknown>;

function plantTelemetryRecords(record: FleetPlantRecord): FleetPlantTelemetryRecord[] {
  const store = window.ZentridLiveTelemetryByPlant as Record<string, FleetPlantTelemetryRecord[]> | undefined;
  if (!store) return Array.isArray(record.relatedTelemetry) ? record.relatedTelemetry as FleetPlantTelemetryRecord[] : [];
  const keys = [record.id, record.externalId, record.code, record.operationalId, record.canonicalPlantId]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  for (const key of keys) {
    const rows = store[key];
    if (Array.isArray(rows)) return rows;
  }
  return Array.isArray(record.relatedTelemetry) ? record.relatedTelemetry as FleetPlantTelemetryRecord[] : [];
}

function plantTelemetryLoaded(record: FleetPlantRecord): boolean {
  if (Boolean(record.telemetryLoaded)) return true;
  const loaded = window.ZentridLiveTelemetryLoadedPlants as Record<string, boolean> | undefined;
  if (!loaded) return false;
  return [record.id, record.externalId, record.code, record.operationalId, record.canonicalPlantId]
    .some(value => Boolean(value && loaded[String(value)]));
}

function plantTelemetryMetricToken(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function plantTelemetryTimestamp(record: FleetPlantTelemetryRecord): number {
  const value = record.timestampRaw || record.timestamp;
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function plantTelemetryMetricValue(record: FleetPlantRecord, aliases: string[]): string {
  const expected = aliases.map(plantTelemetryMetricToken);
  const telemetry = plantTelemetryRecords(record)
    .filter(item => expected.includes(plantTelemetryMetricToken(item.metric)))
    .sort((a, b) => plantTelemetryTimestamp(b) - plantTelemetryTimestamp(a))[0];
  if (!telemetry) return '';
  const display = String(telemetry.displayValue || '').trim();
  if (display && display !== '—') return display;
  const value = telemetry.valueText ?? telemetry.value;
  if (value === undefined || value === null || value === '') return '';
  const unit = String(telemetry.unit || '').trim();
  return `${String(value)}${unit ? ` ${unit}` : ''}`;
}

function plantTelemetrySummary(record: FleetPlantRecord): { currentPower: string; todayEnergy: string; freshness: string; quality: string; count: number; metrics: number } {
  const rows = plantTelemetryRecords(record);
  const latest = rows.slice().sort((a, b) => plantTelemetryTimestamp(b) - plantTelemetryTimestamp(a))[0];
  return {
    currentPower: plantTelemetryMetricValue(record, ['current power', 'current power kw', 'active power', 'active power kw', 'plant power', 'plant power kw', 'power']),
    todayEnergy: plantTelemetryMetricValue(record, ['today energy', 'today energy kwh', 'energy today', 'daily energy', 'daily energy kwh', 'daily yield', 'today yield']),
    freshness: String(latest?.timestamp || '').trim(),
    quality: String(latest?.quality || latest?.status || '').trim(),
    count: rows.length,
    metrics: new Set(rows.map(item => plantTelemetryMetricToken(item.metric)).filter(Boolean)).size
  };
}

function plantTelemetryTable(record: FleetPlantRecord): string {
  if (!plantTelemetryLoaded(record)) return '<div class="plant-data-state-v119 empty"><strong>Telemetry not loaded yet</strong><small>Open this section to query /api/telemetry for the selected plant.</small></div>';
  const rows = plantTelemetryRecords(record)
    .slice()
    .sort((a, b) => plantTelemetryTimestamp(b) - plantTelemetryTimestamp(a))
    .slice(0, 20);
  if (!rows.length) return '<div class="empty-state plant-empty-state-v119"><strong>No matching telemetry records</strong><small>The telemetry request completed, but the current page contained no records linked to this plant.</small></div>';
  return `<div class="data-table compact-table plant-telemetry-table-v1"><div class="data-head"><span>Metric</span><span>Value</span><span>Quality</span><span>Timestamp</span></div>${rows.map(row => `<div class="data-row"><div><strong>${plantDetailEscape(row.metric || 'Metric')}</strong><small>${plantDetailEscape(row.provider || row.device || 'Plant')}</small></div><div><strong>${plantDetailEscape(row.displayValue || row.valueText || row.value || '—')}</strong><small>${plantDetailEscape(row.unit || '')}</small></div><div><span class="badge ${FleetClientModel.badge(row.quality || row.status || 'Unknown')}">${plantDetailEscape(row.quality || row.status || 'Unknown')}</span></div><div><strong>${plantDetailEscape(row.timestamp || '—')}</strong></div></div>`).join('')}</div>`;
}

function plantTelemetryState(record: FleetPlantRecord): { kind: 'ready' | 'empty' | 'partial'; title: string; message: string } {
  if (plantTelemetryLoaded(record)) {
    const summary = plantTelemetrySummary(record);
    if (!summary.count) return { kind:'empty', title:'No telemetry available', message:'The loaded telemetry page returned no records matching this plant.' };
    if (/stale|delay|partial|invalid|error|fault|missing|unavailable/i.test(summary.quality)) return { kind:'partial', title:'Telemetry may be incomplete', message:`${summary.count} matching API record(s) were loaded, but their quality state requires attention.` };
    return { kind:'ready', title:'Telemetry available', message:`${summary.count} matching API record(s) across ${summary.metrics} metric(s) were loaded for this plant.` };
  }
  const power = String(record.powerNow || '').trim();
  const energy = String(record.energyToday || '').trim();
  const hasPower = power && !/^0(?:\.0+)?\s*(?:kw|mw)?$/i.test(power) && power !== '—';
  const hasEnergy = energy && !/^0(?:\.0+)?\s*(?:kwh|mwh)?$/i.test(energy) && energy !== '—';
  if (!hasPower && !hasEnergy) return { kind:'empty', title:'No telemetry available', message:plantDetailOrigin(record) === 'local' ? 'This locally created plant has no telemetry source yet.' : 'Current power and energy values are unavailable for this record.' };
  if (String(record.health || '').toLowerCase().includes('fault') || plantDetailFreshness(record).toLowerCase().includes('unavailable')) return { kind:'partial', title:'Telemetry may be incomplete', message:'Some operational values may be delayed or unavailable. Review Source & Sync before relying on the trend.' };
  return { kind:'ready', title:'Telemetry available', message:'Current and period energy values are available for this plant.' };
}

function plantDevicesLoaded(record: FleetPlantRecord): boolean { return Boolean(record.devicesLoaded); }
function plantAlertsLoaded(record: FleetPlantRecord): boolean { return Boolean(record.alertsLoaded); }
function plantDeviceCountLabel(record: FleetPlantRecord, devices: FleetDeviceRecord[]): string {
  return plantDevicesLoaded(record) ? String(devices.length) : 'On demand';
}
function plantAlertCountLabel(record: FleetPlantRecord): string {
  if (!plantAlertsLoaded(record)) return 'On demand';
  return String(Array.isArray(record.relatedAlerts) ? record.relatedAlerts.length : 0);
}

function deviceRows(items: FleetDeviceRecord[], record?: FleetPlantRecord): string {
  if (!items.length) return `<div class="empty-state plant-empty-state-v119"><strong>No device records</strong><small>${record && plantDetailOrigin(record) === 'local' ? 'This local plant has no device onboarding records yet.' : 'No devices were returned for this plant in the current hierarchy model.'}</small></div>`;
  return `<div class="data-table plant-device-table-v17"><div class="data-head"><span>Object</span><span>Type / Vendor</span><span>Capacity / Model</span><span>Status</span><span>Traceability</span><span>Actions</span></div>${items.map(d => `<div class="data-row" data-device-id="${plantDetailAttr(d.id)}"><div><strong>${plantDetailEscape(d.name)}</strong><small>${plantDetailEscape(d.id)}<br>${plantDetailEscape(d.serial)}</small></div><div><strong>${plantDetailEscape(d.type)}</strong><small>${plantDetailEscape(d.vendor)}</small></div><div><strong>${plantDetailEscape(d.capacity)}</strong><small>${plantDetailEscape(d.model)}</small></div><div><span class="badge ${FleetClientModel.badge(d.status)}">${plantDetailEscape(d.status)}</span><small>Last seen ${plantDetailEscape(d.lastSeen)}</small></div><div><strong>${plantDetailEscape(d.location)}</strong><small>${plantDetailEscape(d.children)}</small></div><div class="row-actions"><button type="button" data-open-device="${plantDetailAttr(d.id)}">View Device</button><button type="button" data-device-history="${plantDetailAttr(d.id)}">Open History</button></div></div>`).join('')}</div>`;
}
function plantLazyTab(tab: PlantDetailTabKey, content: string): string {
  return window.FleetDetailLazyTabs?.panel('plant', tab, content) || content;
}
function plantDetailStructureTree(plant: FleetPlantRecord, devices: FleetDeviceRecord[]): string {
  if (!devices.length) return `<div class="empty-state plant-empty-state-v119"><strong>Topology not available</strong><small>No devices were returned for this plant.</small></div>`;
  const groups = new Map<string, FleetDeviceRecord[]>();
  devices.forEach(device => {
    const type = String(device.type || 'Device');
    const rows = groups.get(type) || [];
    rows.push(device);
    groups.set(type, rows);
  });
  return `<div class="asset-tree-v17"><div>Plant · ${plantDetailEscape(plant.name)}</div><ul>${[...groups.entries()].map(([type, rows]) => `<li>${plantDetailEscape(type)}<ul>${rows.map(device => `<li>${plantDetailEscape(device.name)} · ${plantDetailEscape(device.id)}${device.model && device.model !== '—' ? ` · ${plantDetailEscape(device.model)}` : ''}</li>`).join('')}</ul></li>`).join('')}</ul></div>`;
}
function plantDetailAlertRecords(plant: FleetPlantRecord): Record<string, unknown>[] {
  return Array.isArray(plant.relatedAlerts) ? plant.relatedAlerts.filter(row => row && row.dataOrigin === 'live') : [];
}
function plantDetailAlertsTable(plant: FleetPlantRecord): string {
  const alerts = plantDetailAlertRecords(plant);
  if (!alerts.length) return `<div class="empty-state plant-empty-state-v119"><strong>No alert records returned</strong><small>The current API response contains no alerts linked to this plant.</small></div>`;
  return `<div class="data-table compact-table plant-alert-table-v17"><div class="data-head"><span>Alert</span><span>Severity</span><span>Source</span><span>Status</span></div>${alerts.map(alert => `<div class="data-row"><div><strong>${plantDetailEscape(alert.title || alert.id || 'Alert')}</strong><small>${plantDetailEscape(alert.id || alert.vendorCode || '—')}</small></div><div><span class="badge ${FleetClientModel.badge(alert.severity || alert.priority)}">${plantDetailEscape(alert.severity || alert.priority || 'Unknown')}</span></div><div><strong>${plantDetailEscape(alert.device || alert.deviceId || alert.source || 'Plant')}</strong><small>${plantDetailEscape(alert.vendor || alert.integration || '—')}</small></div><div><span>${plantDetailEscape(alert.status || 'Unknown')}</span></div></div>`).join('')}</div>`;
}
function plantDetailActivityRows(plant: FleetPlantRecord): Array<{ time: string; text: string }> {
  const raw = plant.raw || {};
  const candidates = [raw.activity, raw.activities, raw.audit, raw.auditTrail, raw.timeline, raw.events];
  const source = candidates.find(Array.isArray) as unknown[] | undefined;
  const rows = (source || []).map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : { text:item };
    return {
      time:String(row.time || row.timestamp || row.createdAt || row.occurredAt || row.date || '—'),
      text:String(row.text || row.message || row.description || row.action || row.event || 'Activity')
    };
  }).filter(row => row.text.trim());
  if (!rows.length) {
    const adminRecord = raw.adminRecord && typeof raw.adminRecord === 'object' ? raw.adminRecord as Record<string, unknown> : {};
    const created = String(raw.createdAtUtc || raw.createdAt || adminRecord.createdAtUtc || '');
    const updated = String(raw.updatedAtUtc || raw.updatedAt || adminRecord.updatedAtUtc || '');
    if (created) rows.push({ time:created, text:'Plant record created' });
    if (updated && updated !== created) rows.push({ time:updated, text:'Plant record updated' });
  }
  return rows;
}

function plantTab(plant: FleetPlantRecord, devices: FleetDeviceRecord[], tab: PlantDetailTabKey | string | undefined): string {
  const activeTab = (tab || 'overview') as PlantDetailTabKey;
  const context = plantDetailSectionContext(plant, activeTab, false);
  const by = (type: string) => devices.filter(d => d.type === type || (type === 'Grid Device' && (d.type === 'Grid Device' || d.type === 'Switchgear')) || (type === 'Battery' && (d.type === 'Battery' || d.type === 'PCS')));
  if (activeTab === 'structure') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Plant Structure</h2><p class="muted">Hierarchical plant tree. This is the bridge between the plant and physical devices.</p></div></div>${plantDetailStructureTree(plant, devices)}`);
  if (activeTab === 'energy') {
    const state = plantTelemetryState(plant);
    const telemetry = plantTelemetrySummary(plant);
    const currentPower = telemetry.currentPower || plant.powerNow || '—';
    const todayEnergy = telemetry.todayEnergy || plant.energyToday || '—';
    const quality = telemetry.quality || (state.kind === 'ready' ? 'Available' : state.kind === 'partial' ? 'Partial / delayed' : 'No data');
    return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Energy & Telemetry</h2><p class="muted">Plant-level operational values plus the plant-scoped /api/telemetry response.</p></div><span class="badge ${state.kind === 'ready' ? 'success' : state.kind === 'partial' ? 'warning' : 'neutral'}">${plantDetailEscape(state.kind)}</span></div><div class="plant-data-state-v119 ${state.kind}"><strong>${plantDetailEscape(state.title)}</strong><small>${plantDetailEscape(state.message)}</small></div><div class="info-grid"><div><span>Current Power</span><strong>${plantDetailEscape(currentPower)}</strong><small>${telemetry.currentPower ? 'Latest matching telemetry metric' : 'Operational plant snapshot'}</small></div><div><span>Today Energy</span><strong>${plantDetailEscape(todayEnergy)}</strong><small>${telemetry.todayEnergy ? 'Latest matching telemetry metric' : 'Operational plant snapshot'}</small></div><div><span>Installed Capacity DC</span><strong>${plantDetailEscape(plant.capacityDc)}</strong></div><div><span>Installed Capacity AC</span><strong>${plantDetailEscape(plant.capacityAc)}</strong></div><div><span>Latest Telemetry</span><strong>${plantDetailEscape(telemetry.freshness || plantDetailFreshness(plant))}</strong></div><div><span>Telemetry Quality</span><strong>${plantDetailEscape(quality)}</strong></div><div><span>Telemetry Records</span><strong>${plantTelemetryLoaded(plant) ? telemetry.count : 'On demand'}</strong></div><div><span>Distinct Metrics</span><strong>${plantTelemetryLoaded(plant) ? telemetry.metrics : 'On demand'}</strong></div></div>${plantTelemetryTable(plant)}`);
  }
  if (activeTab === 'alerts') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Alerts & Events</h2><p class="muted">Plant-level incident entry point with severity and affected device context.</p></div></div><div class="info-grid"><div><span>Open Alerts</span><strong>${plantAlertCountLabel(plant)}</strong></div><div><span>Health</span><strong>${plantDetailEscape(plant.health)}</strong></div><div><span>Primary Scope</span><strong>Plant / Device</strong></div><div><span>Workflow</span><strong>Alert → SOP → Task</strong></div></div>${plantDetailAlertsTable(plant)}`);
  if (activeTab === 'device') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Devices & Device</h2><p class="muted">Full device registry for this plant. Use specific tabs for focused views.</p></div><span class="badge neutral">${plantDeviceCountLabel(plant, devices)} records</span></div>${deviceRows(devices, plant)}`);
  if (activeTab === 'arrays') return `${context}<div class="section-title-v17"><div><h2>Arrays & Strings</h2><p class="muted">PV module and string values returned for the selected plant.</p></div></div><div class="info-grid"><div><span>Panels</span><strong>${Number(plant.panels || 0).toLocaleString()}</strong></div><div><span>Strings</span><strong>${plant.strings}</strong></div><div><span>Associated Inverters</span><strong>${plant.inverters}</strong></div><div><span>Traceability</span><strong>${devices.length ? 'Derived from linked device records' : 'No linked device records'}</strong></div></div>`;
  if (activeTab === 'metering') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Metering & Grid</h2><p class="muted">Metering points, transformers, switchgear, grid interface and weather context.</p></div></div>${deviceRows(devices.filter(d => d.type === 'Meter' || d.type === 'Grid Device' || d.type === 'Switchgear' || d.type === 'Weather Station'), plant)}`);
  if (activeTab === 'reportsdocs') return `${context}<div class="section-title-v17"><div><h2>Reports & Documents</h2><p class="muted">Plant documents are persisted through the Plant Registry document API. Reporting remains a separate domain.</p></div></div>${plantDetailBackendManaged(plant) ? plantDetailDocumentsHtml(plant) : '<div class="empty-state plant-empty-state-v119"><strong>Plant Registry record required</strong><small>Document upload, download and delete require a linked /api/admin/plants record.</small></div>'}`;
  if (activeTab === 'adminsync') return `${context}<div class="section-title-v17"><div><h2>Settings & Source</h2><p class="muted">Plant assignment, source traceability and lifecycle-safe configuration context.</p></div></div><div class="info-grid"><div><span>Portfolio</span><strong>${plantDetailEscape(plant.portfolio)}</strong></div><div><span>Client / Owner</span><strong>${plantDetailEscape(plantDetailClientLabel(plant.clientId) || plant.owner)}</strong></div><div><span>Managing Tenant</span><strong>${plantDetailEscape(plant.operator)}</strong></div><div><span>Service / O&M Provider</span><strong>${plantDetailEscape(plant.om)}</strong></div><div><span>Source System</span><strong>${plantDetailEscape(plant.sourceSystem || plantDetailSourceSystem(plant))}</strong></div><div><span>Integration</span><strong>${plantDetailEscape(plant.integration || plantDetailSourceSystem(plant))}</strong></div><div><span>Zentrid Plant ID</span><strong>${plantDetailEscape(plant.id)}</strong></div><div><span>Registry Plant ID</span><strong>${plantDetailEscape(plantDetailAdminId(plant) || 'Not linked')}</strong></div><div><span>External Plant ID</span><strong>${plantDetailEscape(plant.externalId)}</strong></div><div><span>Freshness</span><strong>${plantDetailEscape(plantDetailFreshness(plant))}</strong></div><div><span>Lifecycle Status</span><strong>${plantDetailEscape(plant.status)}</strong><small>Changed only through lifecycle actions</small></div></div><div class="section-title-v17 mini"><div><h3>Lifecycle Actions</h3><p class="muted">Available only for a linked Plant Registry record.</p></div></div>${plantDetailLifecycleHtml(plant)}`;
  if (activeTab === 'inverters') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Inverters</h2><p class="muted">Inverter records linked to this plant by the API.</p></div></div>${deviceRows(by('Inverter'), plant)}`);
  if (activeTab === 'batteries') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>BESS / PCS</h2><p class="muted">Storage devices linked to this plant by the API.</p></div></div>${deviceRows(by('Battery'), plant)}`);
  if (activeTab === 'gateways') return plantLazyTab(activeTab, `${context}<div class="section-title-v17"><div><h2>Loggers & Gateways</h2><p class="muted">Communication devices linked to this plant by the API.</p></div></div>${deviceRows(devices.filter(d => d.type === 'Logger' || d.type === 'Gateway'), plant)}`);
  if (activeTab === 'activity') {
    const activity = plantDetailActivityRows(plant);
    return `${context}<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Plant-level timeline returned by the backend.</p></div></div>${activity.length ? `<div class="timeline-v17">${activity.map(row => `<div><b>${plantDetailEscape(row.time)}</b><span>${plantDetailEscape(row.text)}</span></div>`).join('')}</div>` : `<div class="empty-state plant-empty-state-v119"><strong>No activity records returned</strong><small>The current plant API response does not include an activity or audit timeline.</small></div>`}`;
  }
  return `${context}<div class="section-title-v17"><div><h2>Plant Overview & Master Data</h2><p class="muted">Canonical identity, location and technical characteristics for this plant.</p></div><span class="badge ${FleetClientModel.badge(plant.health)}">${plantDetailEscape(plant.health)}</span></div><div class="info-grid"><div><span>Plant ID</span><strong>${plantDetailEscape(plant.id)}</strong></div><div><span>External Plant ID</span><strong>${plantDetailEscape(plant.externalId)}</strong></div><div><span>Plant Status</span><strong>${plantDetailEscape(plant.status)}</strong><small>Lifecycle value · read-only</small></div><div><span>Plant Type</span><strong>${plantDetailEscape(plant.type)}</strong></div><div><span>Client / Owner</span><strong>${plantDetailEscape(plantDetailClientLabel(plant.clientId) || plant.owner)}</strong></div><div><span>Managing Tenant</span><strong>${plantDetailEscape(plant.operator)}</strong></div><div><span>Location</span><strong>${plantDetailEscape(plant.country)}, ${plantDetailEscape(plant.region)}, ${plantDetailEscape(plant.city)}</strong></div><div><span>Address</span><strong>${plantDetailEscape(plant.address)}</strong></div><div><span>Time Zone</span><strong>${plantDetailEscape(plant.timezone)}</strong></div><div><span>Commissioning Date</span><strong>${plantDetailEscape(plant.commissioning)}</strong></div><div><span>Installed Capacity DC</span><strong>${plantDetailEscape(plant.capacityDc)}</strong></div><div><span>Installed Capacity AC</span><strong>${plantDetailEscape(plant.capacityAc)}</strong></div><div><span>Grid Connection Capacity</span><strong>${plantDetailEscape(plant.gridCapacity)}</strong></div><div><span>Battery Installed</span><strong>${plantDetailEscape(plant.battery)}</strong></div></div><div class="section-title-v17 mini"><div><h3>Related data</h3><p class="muted">Device, alert and telemetry requests are deferred until their tabs are opened.</p></div></div><div class="info-grid"><div><span>Device count</span><strong>${plantDetailEscape(plantDeviceCountLabel(plant, devices))}</strong><small>${plantDevicesLoaded(plant) ? 'Loaded from plant-scoped relation API' : 'Open Devices & Device to load records'}</small></div><div><span>Alert count</span><strong>${plantDetailEscape(plantAlertCountLabel(plant))}</strong><small>${plantAlertsLoaded(plant) ? 'Loaded for selected plant scope' : 'Open Alerts & Events to load records'}</small></div><div><span>Telemetry</span><strong>${plantTelemetryLoaded(plant) ? 'Loaded' : 'On demand'}</strong><small>Open Energy & Telemetry</small></div></div>`;
}

function plantDetailText(value: unknown, fallback = '—'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function normalizePlantDetailRecord(source: Partial<FleetPlantRecord> | null | undefined): FleetPlantRecord | null {
  if (!source || source.dataOrigin !== 'live') return null;
  const id = plantDetailText(source.id, '');
  if (!id) return null;
  return {
    ...source,
    dataOrigin:'live',
    id,
    code:plantDetailText(source.code, id),
    externalId:plantDetailText(source.externalId, '—'),
    name:plantDetailText(source.name, 'Plant'),
    clientId:plantDetailText(source.clientId, ''),
    portfolio:plantDetailText(source.portfolio, '—'),
    status:plantDetailText(source.status, 'Unknown'),
    type:plantDetailText(source.type, '—'),
    country:plantDetailText(source.country, '—'),
    region:plantDetailText(source.region, '—'),
    city:plantDetailText(source.city, '—'),
    address:plantDetailText(source.address, '—'),
    timezone:plantDetailText(source.timezone, '—'),
    capacityDc:plantDetailText(source.capacityDc, '—'),
    capacityAc:plantDetailText(source.capacityAc, '—'),
    gridCapacity:plantDetailText(source.gridCapacity, '—'),
    commissioning:plantDetailText(source.commissioning, '—'),
    owner:plantDetailText(source.owner, '—'),
    operator:plantDetailText(source.operator, '—'),
    om:plantDetailText(source.om, '—'),
    powerNow:plantDetailText(source.powerNow, '—'),
    energyToday:plantDetailText(source.energyToday, '—'),
    alerts:Number(source.alerts || 0),
    health:plantDetailText(source.health, plantDetailText(source.status, 'Unknown')),
    panels:Number(source.panels || 0),
    inverters:Number(source.inverters || 0),
    strings:Number(source.strings || 0),
    transformers:Number(source.transformers || 0),
    meters:Number(source.meters || 0),
    battery:plantDetailText(source.battery, 'Unknown'),
    devices:Array.isArray(source.devices) ? source.devices.map(String) : [],
    relatedAlerts:Array.isArray(source.relatedAlerts) ? source.relatedAlerts.filter(row => row && row.dataOrigin === 'live') : [],
    sourceSystem:plantDetailText(source.sourceSystem, '—'),
    integration:plantDetailText(source.integration, '—'),
    lastSyncAt:plantDetailText(source.lastSyncAt, ''),
    latitude:plantDetailText(source.latitude, ''),
    longitude:plantDetailText(source.longitude, '')
  };
}
function selectedTenantPlantForDetail(): FleetPlantRecord | null {
  const queryId = new URLSearchParams(location.search).get('id');
  const storedId = localStorage.getItem('zentrid_selected_plant');
  const selectedId = queryId || storedId || '';
  const livePlants = FleetClientModel.plants.filter(item => item.dataOrigin === 'live');
  const existing = selectedId
    ? livePlants.find(item => item.id === selectedId || item.externalId === selectedId || item.code === selectedId)
    : livePlants[0];
  const record = normalizePlantDetailRecord(existing || null);
  if (!record) return null;
  const index = FleetClientModel.plants.findIndex(item => item.id === record.id);
  if (index >= 0) FleetClientModel.plants[index] = record;
  else FleetClientModel.plants.unshift(record);
  FleetClientModel.selectPlant(record.id);
  localStorage.removeItem('zentrid_selected_plant_record');
  return record;
}
function renderPlantDetailPage() {
  const requestedEditTab = localStorage.getItem('zentrid_plant_detail_edit') as PlantDetailTabKey | null;
  if (requestedEditTab && ['overview','adminsync'].includes(requestedEditTab)) plantDetailActiveTab = requestedEditTab;
  if (requestedEditTab) localStorage.removeItem('zentrid_plant_detail_edit');
  const plant = selectedTenantPlantForDetail();
  if (!plant) {
    FleetLayout.mount(`<section class="page-hero"><div><p class="eyebrow">Tenant Admin · Plant Detail</p><h1>Plant detail unavailable</h1><p class="muted">The selected plant was not returned by the backend API.</p></div><button class="secondary-action" type="button" onclick="location.href=FleetLayout.pathFor('plants')">Back to Plants</button></section><div class="empty-state"><strong>No plant record</strong><small>Open a plant from Plant Registry or refresh the API request.</small></div>`);
    return;
  }
  const liveClients = FleetClientModel.clients.filter(item => item.dataOrigin === 'live');
  const client = liveClients.find(item => item.id === plant.clientId || item.name === plant.owner) || null;
  const clientName = client?.name || plant.owner || 'Client not provided';
  const devices = FleetClientModel.devicesForPlant(plant.id).filter(item => item.sourceStatus === 'Live API' || item.dataOrigin === 'live');
  FleetLayout.mount(`
    <section class="page-hero plant-hero-v17">
      <div><p class="eyebrow">Plant Detail · ${plantDetailEscape(clientName)} ${FleetDataSource.badge(plant, 'plant', true)}</p><h1 id="plantDetailHeroName">${plantDetailEscape(plant.name)}</h1><p class="muted" id="plantDetailHeroMeta">${plantDetailEscape(plant.code)} · ${plantDetailEscape(plant.type)} · ${plantDetailEscape(plant.country)}, ${plantDetailEscape(plant.city)}</p></div>
      <div class="hero-actions-v19"><button class="freshness-card" id="backToClient" type="button"><span class="pulse"></span><div><strong>Back to Client</strong><small>${plantDetailEscape(clientName)}</small></div></button><button class="freshness-card" id="backToPlantRegistry" type="button"><span class="pulse"></span><div><strong>Plant Registry</strong><small>All plants</small></div></button></div>
    </section>
    ${renderPlantDetailControl(plant)}
    <section class="context-bar plant-context-v17"><div><span>Portfolio</span><strong>${plantDetailEscape(plant.portfolio)}</strong></div><div><span>Client / Managing Tenant</span><strong>${plantDetailEscape(plant.owner)} / ${plantDetailEscape(plant.operator)}</strong></div><div><span>Service / O&M Provider</span><strong>${plantDetailEscape(plant.om)}</strong></div><div><span>Data Freshness</span><strong>${plantDetailEscape(plantDetailFreshness(plant))}</strong></div></section>
    <section class="kpi-grid plant-kpi-grid-v17">
      <article class="kpi-card cyan"><span class="kpi-label">Current Power</span><div class="kpi-value">${plantDetailEscape(plant.powerNow || '—')}</div><small class="kpi-delta">Instant power</small></article>
      <article class="kpi-card green"><span class="kpi-label">Today Energy</span><div class="kpi-value">${plantDetailEscape(plant.energyToday || '—')}</div><small class="kpi-delta">Accumulated energy</small></article>
      <article class="kpi-card blue"><span class="kpi-label">Capacity DC</span><div class="kpi-value">${plantDetailEscape(plant.capacityDc)}</div><small class="kpi-delta">Installed capacity</small></article>
      <article class="kpi-card yellow"><span class="kpi-label">Open Alerts</span><div class="kpi-value">${plant.alerts}</div><small class="kpi-delta">Plant-level incidents</small></article>
    </section>
    <section class="plant-workspace-v17">
      <aside class="glass-card plant-side-card-v17">
        <h3>Plant Workspace</h3>
        <button class="${plantDetailActiveTab === 'overview' ? 'active' : ''}" data-plant-tab="overview" ${plantDetailActiveTab === 'overview' ? 'aria-current="page"' : ''}>Overview & Master Data</button>
        <button class="${plantDetailActiveTab === 'structure' ? 'active' : ''}" data-plant-tab="structure" ${plantDetailActiveTab === 'structure' ? 'aria-current="page"' : ''}>Plant Structure</button>
        <button class="${plantDetailActiveTab === 'energy' ? 'active' : ''}" data-plant-tab="energy" ${plantDetailActiveTab === 'energy' ? 'aria-current="page"' : ''}>Energy & Telemetry</button>
        <button class="${plantDetailActiveTab === 'alerts' ? 'active' : ''}" data-plant-tab="alerts" ${plantDetailActiveTab === 'alerts' ? 'aria-current="page"' : ''}>Alerts & Events</button>
        <button class="${plantDetailActiveTab === 'device' ? 'active' : ''}" data-plant-tab="device" ${plantDetailActiveTab === 'device' ? 'aria-current="page"' : ''}>Devices & Device</button>
        <button class="${plantDetailActiveTab === 'inverters' ? 'active' : ''}" data-plant-tab="inverters" ${plantDetailActiveTab === 'inverters' ? 'aria-current="page"' : ''}>Inverters</button>
        <button class="${plantDetailActiveTab === 'arrays' ? 'active' : ''}" data-plant-tab="arrays" ${plantDetailActiveTab === 'arrays' ? 'aria-current="page"' : ''}>Arrays & Strings</button>
        ${plant.battery === 'Yes' || devices.some(d => d.type === 'Battery' || d.type === 'PCS') ? `<button class="${plantDetailActiveTab === 'batteries' ? 'active' : ''}" data-plant-tab="batteries" ${plantDetailActiveTab === 'batteries' ? 'aria-current="page"' : ''}>BESS / PCS</button>` : ''}
        <button class="${plantDetailActiveTab === 'metering' ? 'active' : ''}" data-plant-tab="metering" ${plantDetailActiveTab === 'metering' ? 'aria-current="page"' : ''}>Metering & Grid</button>
        <button class="${plantDetailActiveTab === 'gateways' ? 'active' : ''}" data-plant-tab="gateways" ${plantDetailActiveTab === 'gateways' ? 'aria-current="page"' : ''}>Loggers & Gateways</button>
        <button class="${plantDetailActiveTab === 'reportsdocs' ? 'active' : ''}" data-plant-tab="reportsdocs" ${plantDetailActiveTab === 'reportsdocs' ? 'aria-current="page"' : ''}>Reports & Documents</button>
        <button class="${plantDetailActiveTab === 'adminsync' ? 'active' : ''}" data-plant-tab="adminsync" ${plantDetailActiveTab === 'adminsync' ? 'aria-current="page"' : ''}>Settings & Source</button>
        <button class="${plantDetailActiveTab === 'activity' ? 'active' : ''}" data-plant-tab="activity" ${plantDetailActiveTab === 'activity' ? 'aria-current="page"' : ''}>Activity</button>
      </aside>
      <section class="glass-card plant-main-card-v17">
        <div class="plant-detail-content-head-v119"><div><span>Active section</span><h2 id="plantDetailActiveTitle">${plantDetailEscape(plantDetailSectionTitle(plantDetailActiveTab))}</h2></div><div class="plant-detail-actions-v119"><button id="editPlantTab" class="small-btn primary" type="button" data-permission-action="edit" data-permission-resource="plant" data-permission-status="${plantDetailAttr(plant.status)}" data-permission-origin="${plantDetailAttr(plantDetailOrigin(plant))}" data-permission-update-available="true" data-permission-local-override="false" data-permission-base-disabled="${plantDetailCanEdit(plant, plantDetailActiveTab) ? 'false' : 'true'}">Edit</button><button id="cancelPlantEdit" class="small-btn ghost" type="button" hidden>Cancel</button><button id="savePlantEdit" class="small-btn success" type="button" hidden data-permission-action="edit" data-permission-resource="plant" data-permission-status="${plantDetailAttr(plant.status)}" data-permission-origin="${plantDetailAttr(plantDetailOrigin(plant))}" data-permission-update-available="true" data-permission-local-override="false">Save Changes</button></div></div>
        <div class="form-validation-summary plant-detail-summary-v119" id="plantDetailEditSummary" role="alert" aria-live="assertive" tabindex="-1" hidden></div>
        <div id="plantTabContent">${plantTab(plant, devices, plantDetailActiveTab)}</div>
      </section>
    </section>
  `);
  plantDetailBusy = false;
  updatePlantDetailActions(plant);
  window.FleetDetailLazyTabs?.observe('plant', 'plant-detail-content', () => {
    const currentPlant = selectedTenantPlantForDetail();
    if (!currentPlant) return;
    const currentDevices = FleetClientModel.devicesForPlant(currentPlant.id).filter(item => item.sourceStatus === 'Live API' || item.dataOrigin === 'live');
    renderPlantDetailCurrentTab(currentPlant, currentDevices);
  });
  document.getElementById('backToClient')?.addEventListener('click', () => {
    if (!plantDetailConfirmDiscard('Discard unsaved plant changes and return to Client Detail?')) return;
    if (client) {
      FleetClientModel.selectClient(client.id);
      location.href = FleetLayout.pathFor('client-detail');
    } else {
      location.href = FleetLayout.pathFor('clients');
    }
  });
  document.getElementById('backToPlantRegistry')?.addEventListener('click', () => {
    if (!plantDetailConfirmDiscard('Discard unsaved plant changes and return to Plant Registry?')) return;
    location.href = FleetLayout.pathFor('plants');
  });
  document.getElementById('editPlantTab')?.addEventListener('click', () => setPlantDetailEditMode(true, plant, devices));
  document.getElementById('cancelPlantEdit')?.addEventListener('click', () => setPlantDetailEditMode(false, plant, devices));
  document.getElementById('savePlantEdit')?.addEventListener('click', () => savePlantDetailEdits(plant, devices));
  document.querySelectorAll<HTMLElement>('[data-plant-tab]').forEach(btn => btn.addEventListener('click', () => {
    const nextTab = (btn.dataset.plantTab || 'overview') as PlantDetailTabKey;
    if (plantDetailEditMode && !plantDetailConfirmDiscard('Discard unsaved changes and open another plant section?')) return;
    plantDetailEditMode = false;
    plantDetailDraft = null;
    plantDetailEditSnapshot = '';
    plantDetailActiveTab = nextTab;
    window.FleetDetailLazyTabs?.activate('plant', nextTab);
    document.querySelectorAll<HTMLElement>('[data-plant-tab]').forEach(item => {
      const active = item.dataset.plantTab === nextTab;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current','page');
      else item.removeAttribute('aria-current');
    });
    clearPlantDetailFeedback();
    renderPlantDetailCurrentTab(plant, devices);
    const summary = document.getElementById('plantDetailEditSummary');
    if (summary) { summary.hidden = true; summary.innerHTML = ''; }
  }));
  const plantTabContent = document.getElementById('plantTabContent');
  plantTabContent?.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const lifecycle = target.closest<HTMLElement>('[data-plant-lifecycle]');
    const downloadDocument = target.closest<HTMLElement>('[data-plant-document-download]');
    const deleteDocument = target.closest<HTMLElement>('[data-plant-document-delete]');
    if (lifecycle?.dataset.plantLifecycle) {
      const action=lifecycle.dataset.plantLifecycle as 'activate'|'deactivate'|'archive'; const run=window.FleetAPIMutations?.plants?.[action]; if(!run)return;
      if(!FleetActionPermissions.guard({ action, resource:'plant', record:plant, status:plant.status, origin:plantDetailOrigin(plant), updateAvailable:true }))return;
      const prompt=action==='archive'?`Archive ${plant.name}?`:action==='deactivate'?`Deactivate ${plant.name}?`:''; if(prompt&&!window.confirm(prompt))return;
      void run(plantDetailAdminId(plant)).then(result=>{FleetLayout.toast(result.message);if(result.ok)window.setTimeout(()=>window.location.reload(),250);}); return;
    }
    if (downloadDocument?.dataset.plantDocumentDownload) {
      const documentId=downloadDocument.dataset.plantDocumentDownload; const doc=plantDetailDocuments(plant).find(item=>String(item.id||item.documentId||'')===documentId); const fileName=String(doc?.fileName||doc?.filename||doc?.name||`plant-document-${documentId}`).trim()||`plant-document-${documentId}`;
      void window.ZentridPlatformAPI.plantRegistry.getDocument(plantDetailAdminId(plant),documentId).then((payload: unknown)=>{if(resolveBackendDocumentPayload(payload,fileName))FleetLayout.toast('Plant document download started.');else FleetLayout.toast('Unable to convert the backend document response into a downloadable file.');}).catch(()=>FleetLayout.toast('Unable to download plant document.')); return;
    }
    if (deleteDocument?.dataset.plantDocumentDelete) { if(!FleetActionPermissions.guard({ action:'edit', resource:'plant', record:plant, status:plant.status, origin:plantDetailOrigin(plant), updateAvailable:true }))return; if(!window.confirm('Delete this plant document from the backend?'))return; void window.FleetAPIMutations.plants.deleteDocument(plantDetailAdminId(plant),deleteDocument.dataset.plantDocumentDelete).then(result=>{FleetLayout.toast(result.message);if(result.ok)window.setTimeout(()=>window.location.reload(),250);}); return; }
    const open = target.closest<HTMLElement>('[data-open-device]');
    const history = target.closest<HTMLElement>('[data-device-history]');
    const openDeviceId = open?.dataset.openDevice;
    const historyDeviceId = history?.dataset.deviceHistory;
    if ((openDeviceId || historyDeviceId) && !plantDetailConfirmDiscard('Discard unsaved plant changes and open Device Detail?')) return;
    if (openDeviceId) { localStorage.setItem('zentrid_selected_device', openDeviceId); location.href = FleetLayout.pathFor('device-detail'); }
    if (historyDeviceId) { localStorage.setItem('zentrid_selected_device', historyDeviceId); location.href = FleetLayout.pathFor('device-detail') + '#activity'; }
  });
  const syncPlantField = (target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void => {
    if (!plantDetailDraft) return;
    const field = target.dataset.plantEdit as keyof FleetPlantRecord | undefined;
    if (field) {
      if (field === 'panels' || field === 'inverters' || field === 'strings' || field === 'transformers' || field === 'meters' || field === 'alerts') plantDetailDraft[field] = Number(target.value) as never;
      else plantDetailDraft[field] = target.value as never;
      if (field === 'clientId') {
        const selectedClient = FleetClientModel.clients.find(item => item.id === target.value);
        if (selectedClient) plantDetailDraft.owner = selectedClient.name;
      }
      if (field === 'sourceSystem' || field === 'integration' || field === 'externalId') setPlantDetailFeedback('warning','Local mapping change','Changing source identity may affect mapping traceability. The change will require confirmation before saving.');
    }
    const summary = document.getElementById('plantDetailEditSummary');
    if (plantDetailEditMode) FleetFormUX.clearErrors(plantTabContent || document, summary);
  };
  plantTabContent?.addEventListener('input', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) syncPlantField(target);
  });
  plantTabContent?.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) syncPlantField(target);
  });
  plantTabContent?.addEventListener('submit', event => {
    const form=event.target; if(!(form instanceof HTMLFormElement)||form.id!=='plantDocumentUploadForm')return; event.preventDefault(); if(!plantDetailBackendManaged(plant))return; if(!FleetActionPermissions.guard({ action:'edit', resource:'plant', record:plant, status:plant.status, origin:plantDetailOrigin(plant), updateAvailable:true }))return;
    const fd=new FormData(form); const file=fd.get('file'); if(!(file instanceof File)||!file.name){FleetLayout.toast('Choose a document file first.');return;}
    void window.FleetAPIMutations.plants.uploadDocument(plantDetailAdminId(plant),fd).then(result=>{FleetLayout.toast(result.message);if(result.ok)window.setTimeout(()=>window.location.reload(),250);});
  });
  if (requestedEditTab && plantDetailCanEdit(plant, requestedEditTab)) setPlantDetailEditMode(true, plant, devices);
  if (!plantDetailBeforeUnloadBound) {
    FleetEntityDetailUX.bindBeforeUnload('plant-detail', plantDetailHasUnsavedEdits);
    plantDetailBeforeUnloadBound = true;
  }
}

function selectedFleetDevice(): FleetDeviceRecord {
  const id = localStorage.getItem('zentrid_selected_device') || 'INV-ARM-001';
  return FleetClientModel.devices.find(d => d.id === id) || FleetClientModel.devices.find(d => d.type === 'Inverter') || FleetClientModel.devices[0]!;
}

function devicePowerValue(device: FleetDeviceRecord): string {
  const num = parseInt(String(device.capacity || '0').replace(/[^0-9]/g, ''), 10) || 125;
  if (device.status === 'Warning') return Math.round(num * 0.62) + ' kW';
  if (device.status === 'Fault') return '0 kW';
  return Math.round(num * 0.78) + ' kW';
}

function renderDeviceDetailPage() {
  const device = selectedFleetDevice();
  const plant = FleetClientModel.getPlant(device.plantId) || FleetClientModel.selectedPlant();
  const client = FleetClientModel.getClient(plant.clientId);
  const siblings = FleetClientModel.devicesForPlant(plant.id);
  const isInverter = device.type === 'Inverter';
  const isMeter = device.type === 'Meter';
  const isPcs = device.type === 'PCS';
  const isBess = device.type === 'Battery';
  const isWeather = device.type === 'Weather Station';
  const isLogger = device.type === 'Logger' || device.type === 'Gateway';
  const isTransformer = isTransformerDevice(device);
  const isSwitchgear = isSwitchgearDevice(device);

  FleetLayout.mount(`
    <section class="page-hero device-hero-v19">
      <div>
        <p class="eyebrow">Device Detail · ${plant.name}</p>
        <h1>${device.name}</h1>
        <p class="muted">${device.id} · ${device.type} · ${device.vendor} ${device.model}</p>
      </div>
      <div class="hero-actions-v19">
        <button class="small-btn ghost" id="backToPlant" type="button">Back to Plant</button>
        <button class="small-btn" id="openDeviceAlerts" type="button">View Alerts</button>
      </div>
    </section>
    <section class="context-bar device-context-v19">
      <div><span>Owning Client</span><strong>${client.name}</strong></div>
      <div><span>Plant</span><strong>${plant.name}</strong></div>
      <div><span>Location</span><strong>${device.location}</strong></div>
      <div><span>Last Communication</span><strong>${device.lastSeen}</strong></div>
    </section>
    <section class="kpi-grid device-kpi-grid-v19">
      <article class="kpi-card ${device.status === 'Warning' ? 'yellow' : 'green'}"><span class="kpi-label">Status</span><div class="kpi-value">${device.status}</div><small class="kpi-delta">Connectivity and operational state</small></article>
      <article class="kpi-card cyan"><span class="kpi-label">${isLogger ? 'Signal / Uplink' : isSwitchgear ? 'Breaker / Feeder' : isTransformer ? 'Load / Temp' : 'Current Power'}</span><div class="kpi-value">${isInverter ? devicePowerValue(device) : isPcs ? pcsDerivedMetrics(device).acPower : isBess ? bessDerivedMetrics(device).flowPower : isLogger ? loggerDerivedMetrics(device).signal : isSwitchgear ? switchgearDerivedMetrics(device).breakerState : isTransformer ? transformerDerivedMetrics(device).load : device.capacity}</div><small class="kpi-delta">Type-specific live value</small></article>
      <article class="kpi-card blue"><span class="kpi-label">Rated Capacity</span><div class="kpi-value">${device.capacity}</div><small class="kpi-delta">Technical passport value</small></article>
      <article class="kpi-card yellow"><span class="kpi-label">Open Alerts</span><div class="kpi-value">${device.status === 'Warning' ? 1 : 0}</div><small class="kpi-delta">Device-level incidents</small></article>
    </section>
    <section class="device-workspace-v19">
      <aside class="glass-card device-side-card-v19">
        <h3>${device.type} Workspace</h3>
        <button class="active" data-device-tab="overview">Overview</button>
        ${isMeter ? '<button data-device-tab="accounting">Energy Accounting</button><button data-device-tab="importExport">Import / Export</button><button data-device-tab="tariffs">Tariffs</button>' : isPcs ? '<button data-device-tab="conversion">Power Conversion</button><button data-device-tab="charge">Charge / Discharge</button><button data-device-tab="connectedBess">Connected BESS</button><button data-device-tab="grid">Grid Connection</button>' : isBess ? '<button data-device-tab="soc">SOC / SOH</button><button data-device-tab="charge">Charge / Discharge</button><button data-device-tab="pcs">PCS</button><button data-device-tab="racks">Racks / Modules</button>' : isWeather ? '<button data-device-tab="irradiance">Irradiance</button><button data-device-tab="temperature">Temperature</button><button data-device-tab="wind">Wind</button><button data-device-tab="sensors">Sensors</button>' : isLogger ? '<button data-device-tab="connectivity">Connectivity</button><button data-device-tab="linked">Linked Devices</button><button data-device-tab="sync">Sync & Freshness</button><button data-device-tab="network">Network</button>' : isSwitchgear ? '<button data-device-tab="breakers">Breakers</button><button data-device-tab="feeders">Feeders</button><button data-device-tab="events">Protection Events</button><button data-device-tab="commands">Commands</button>' : isTransformer ? '<button data-device-tab="measurements">Electrical Measurements</button><button data-device-tab="protection">Protection Events</button><button data-device-tab="grid">Grid / Feeders</button>' : '<button data-device-tab="telemetry">Telemetry</button>'}
        <button data-device-tab="alerts">Alerts</button>
        <button data-device-tab="topology">Topology</button>
        ${isInverter ? '<button data-device-tab="mppt">MPPT / Strings</button>' : ''}
        <button data-device-tab="passport">Technical Passport</button>
        <button data-device-tab="source">Source & Sync</button>
        <button data-device-tab="activity">Activity</button>
      </aside>
      <section class="glass-card device-main-card-v19"><div id="deviceTabContent">${deviceDetailTab(device, plant, siblings, 'overview')}</div></section>
    </section>
  `);
  document.getElementById('backToPlant')?.addEventListener('click', () => { FleetClientModel.selectPlant(plant.id); location.href = FleetLayout.pathFor('plant-detail'); });
  document.getElementById('openDeviceAlerts')?.addEventListener('click', () => FleetLayout.toast('Device alerts context selected: ' + device.id));
  const deviceTabContent = document.getElementById('deviceTabContent');
  document.querySelectorAll<HTMLElement>('[data-device-tab]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-device-tab]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    if (deviceTabContent) deviceTabContent.innerHTML = deviceDetailTab(device, plant, siblings, btn.dataset.deviceTab || 'overview');
  }));
  if (location.hash === '#activity') document.querySelector<HTMLElement>('[data-device-tab="activity"]')?.click();
  deviceTabContent?.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const stringBtn = target.closest<HTMLElement>('[data-open-string]');
    const stringName = stringBtn?.dataset.openString;
    if (stringName) {
      openStringDrawer(device, stringName, stringBtn.dataset.parentMppt || 'MPPT 1');
      return;
    }
    const mpptBtn = target.closest<HTMLElement>('[data-open-mppt]');
    const mpptName = mpptBtn?.dataset.openMppt;
    if (mpptName) {
      openMpptDrawer(device, mpptName);
      return;
    }
    const open = target.closest<HTMLElement>('[data-open-device]');
    const openDeviceId = open?.dataset.openDevice;
    if (!openDeviceId) return;
    localStorage.setItem('zentrid_selected_device', openDeviceId);
    location.href = FleetLayout.pathFor('device-detail');
  });
}

function inverterDerivedMetrics(device: FleetDeviceRecord) {
  const rated = parseInt(String(device.capacity || '0').replace(/[^0-9]/g, ''), 10) || 125;
  const degraded = device.status === 'Warning';
  return {
    rated,
    currentPower: degraded ? Math.round(rated * 0.62) : Math.round(rated * 0.78),
    dailyYield: degraded ? '0.96 MWh' : '1.42 MWh',
    monthlyYield: degraded ? '23.8 MWh' : '38.4 MWh',
    lifetimeYield: degraded ? '412 MWh' : '684 MWh',
    efficiency: degraded ? '96.1%' : '98.4%',
    temperature: degraded ? '58°C' : '43°C',
    dcPower: degraded ? Math.round(rated * 0.66) + ' kW' : Math.round(rated * 0.83) + ' kW',
    acPower: degraded ? Math.round(rated * 0.62) + ' kW' : Math.round(rated * 0.78) + ' kW',
    dcVoltage: degraded ? '768 V' : '812 V',
    acVoltage: '400 V',
    current: degraded ? '156 A' : '211 A',
    frequency: '50.0 Hz',
    freshness: degraded ? 'Delayed' : 'Fresh'
  };
}

function miniBarChartV20(values: number[]): string {
  const max = Math.max(...values, 1);
  return `<div class="mini-bar-chart-v20">${values.map((v, i) => `<span style="height:${Math.max(12, Math.round(v / max * 100))}%" title="Hour ${i + 1}: ${v}"></span>`).join('')}</div>`;
}

function inverterMetricCards(device: FleetDeviceRecord): string {
  const m = inverterDerivedMetrics(device);
  return `<div class="device-metric-grid-v20">
    <article><span>Current Power</span><strong>${m.currentPower} kW</strong><small>Live AC output</small></article>
    <article><span>Daily Yield</span><strong>${m.dailyYield}</strong><small>Today</small></article>
    <article><span>Monthly Yield</span><strong>${m.monthlyYield}</strong><small>Current month</small></article>
    <article><span>Lifetime Yield</span><strong>${m.lifetimeYield}</strong><small>Since commissioning</small></article>
    <article><span>Efficiency</span><strong>${m.efficiency}</strong><small>Estimated conversion efficiency</small></article>
    <article><span>Temperature</span><strong>${m.temperature}</strong><small>Internal sensor</small></article>
  </div>`;
}


function meterDerivedMetrics(device: FleetDeviceRecord) {
  const bidirectional = String(device.capacity || '').toLowerCase().includes('bi');
  return {
    currentImport: bidirectional ? '18.4 kW' : '0.0 kW',
    currentExport: bidirectional ? '112.8 kW' : '128.6 kW',
    dailyImport: bidirectional ? '42.7 kWh' : '0.0 kWh',
    dailyExport: bidirectional ? '1.84 MWh' : '2.12 MWh',
    netEnergy: bidirectional ? '+1.79 MWh' : '+2.12 MWh',
    accuracy: device.vendor === 'Janitza' ? 'Class 0.5S' : 'Class 0.2S',
    profile: bidirectional ? 'Commercial bidirectional metering' : 'Export settlement metering',
    freshness: device.status === 'Warning' ? 'Delayed' : 'Fresh'
  };
}

function meterMetricCards(device: FleetDeviceRecord): string {
  const m = meterDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 meter-metric-grid-v21">
    <article><span>Current Import</span><strong>${m.currentImport}</strong><small>Grid to plant</small></article>
    <article><span>Current Export</span><strong>${m.currentExport}</strong><small>Plant to grid</small></article>
    <article><span>Daily Import</span><strong>${m.dailyImport}</strong><small>Accounting period today</small></article>
    <article><span>Daily Export</span><strong>${m.dailyExport}</strong><small>Accounting period today</small></article>
    <article><span>Net Energy</span><strong>${m.netEnergy}</strong><small>Export minus import</small></article>
    <article><span>Communication</span><strong>${device.status}</strong><small>Last seen ${device.lastSeen}</small></article>
  </div>`;
}

function meterAccountingRows(device: FleetDeviceRecord): string {
  const warning = device.status === 'Warning';
  const rows = [
    ['Today 00:00–06:00', warning ? '18.4 kWh' : '6.2 kWh', warning ? '421.8 kWh' : '532.4 kWh', warning ? '+403.4 kWh' : '+526.2 kWh', warning ? 'Partial' : 'Confirmed'],
    ['Today 06:00–12:00', warning ? '24.3 kWh' : '9.8 kWh', warning ? '738.2 kWh' : '891.6 kWh', warning ? '+713.9 kWh' : '+881.8 kWh', warning ? 'Delayed' : 'Confirmed'],
    ['Yesterday', '51.2 kWh', '2.04 MWh', '+1.99 MWh', 'Confirmed'],
    ['Current month', '0.84 MWh', '38.6 MWh', '+37.8 MWh', 'Confirmed']
  ];
  return `<div class="data-table compact-table meter-accounting-table-v21"><div class="data-head"><span>Period</span><span>Import</span><span>Export</span><span>Net</span><span>Status</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span>${r[1]}</span></div><div><span>${r[2]}</span></div><div><strong>${r[3]}</strong></div><div><span class="badge ${r[4] === 'Confirmed' ? 'success' : 'warning'}">${r[4]}</span></div></div>`).join('')}</div>`;
}

function meterDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const m = meterDerivedMetrics(device);
  const warningRow = device.status === 'Warning';

  if (tab === 'accounting') return `<div class="section-title-v17"><div><h2>Energy Accounting</h2><p class="muted">Confirmed import/export records used for reporting, billing and reconciliation.</p></div></div>${meterAccountingRows(device)}
    <div class="section-title-v17 mini"><div><h3>Accounting rule</h3><p class="muted">Meter records are period-based facts. They are separate from live monitoring and should be auditable before they feed billing.</p></div></div>`;

  if (tab === 'importExport') return `<div class="section-title-v17"><div><h2>Import / Export</h2><p class="muted">Grid exchange view for this metering point.</p></div></div>
    <div class="telemetry-layout-v20">
      <div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Export profile · Today</strong><small>kWh by interval</small></div>${miniBarChartV20([8,14,32,78,116,138,126,102,64,24])}</div>
      <div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Import profile · Today</strong><small>kWh by interval</small></div>${miniBarChartV20([6,5,4,3,2,2,3,5,7,8])}</div>
    </div>
    <div class="info-grid compact-info-v20"><div><span>Current Import</span><strong>${m.currentImport}</strong></div><div><span>Current Export</span><strong>${m.currentExport}</strong></div><div><span>Daily Import</span><strong>${m.dailyImport}</strong></div><div><span>Daily Export</span><strong>${m.dailyExport}</strong></div><div><span>Net Exchange</span><strong>${m.netEnergy}</strong></div><div><span>Direction</span><strong>Exporting</strong></div></div>`;

  if (tab === 'tariffs') return `<div class="section-title-v17"><div><h2>Tariffs</h2><p class="muted">Commercial profile linked to this meter for revenue, settlements and billing.</p></div></div>
    <div class="info-grid"><div><span>Tariff Profile</span><strong>Commercial Feed-in 2026</strong></div><div><span>Feed-in Tariff</span><strong>€0.087 / kWh</strong></div><div><span>Import Cost</span><strong>€0.142 / kWh</strong></div><div><span>Billing Period</span><strong>Monthly</strong></div><div><span>Settlement Rule</span><strong>Net export by confirmed meter records</strong></div><div><span>Revenue Link</span><strong>Finance & Tariffs</strong></div></div>`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Metering issues usually affect accounting, reporting and billing confidence.</p></div></div>
    <div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div>
      <div class="data-row"><div><strong>${warningRow ? 'Meter reading delayed' : 'No active metering issues'}</strong><small>${device.name}</small></div><div>${warningRow ? '<span class="badge warning">Warning</span>' : '<span class="badge success">Normal</span>'}</div><div><span>${warningRow ? device.lastSeen : 'Now'}</span></div><div><span>${warningRow ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${warningRow ? 'Open Alert' : 'View History'}</button></div></div>
    </div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Meter belongs to the plant metering/grid layer, not under an inverter.</p></div></div>
    <div class="topology-path-v20"><span>Tenant</span><b>→</b><span>${plant.name}</span><b>→</b><span>Grid Connection</span><b>→</b><span>${device.name}</span></div>
    <div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Subplant / POI<ul><li>Transformer</li><li>${device.type} · ${device.name}<ul><li>Import channel</li><li>Export channel</li><li>Accounting records</li></ul></li><li>Grid interface</li></ul></li></ul></div>
    <div class="section-title-v17 mini"><div><h3>Related device</h3><p class="muted">Inverters and BESS feed the plant energy flow; meter records the confirmed exchange with the grid.</p></div></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static metering device data.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Meter Type</span><strong>${device.capacity}</strong></div><div><span>Accuracy Class</span><strong>${m.accuracy}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div><div><span>Installation Point</span><strong>${device.location}</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage and freshness for metering records.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} metering connector</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical meter</strong></div><div><span>Accounting Freshness</span><strong>${m.freshness}</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div><div><span>Capability Flags</span><strong>Import · Export · Accounting · Alerts</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Meter replacement, reading quality, sync and audit events.</p></div></div><div class="timeline-v17"><div><b>Today</b><span>Meter interval records imported and normalized</span></div><div><b>Today</b><span>${warningRow ? 'Delayed reading flagged for accounting review' : 'Accounting records confirmed'}</span></div><div><b>Yesterday</b><span>Tariff profile checked against Finance & Tariffs</span></div><div><b>03 Jun</b><span>Meter mapped to ${plant.name} grid connection point</span></div><div><b>01 Jun</b><span>Technical passport verified</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Meter Overview</h2><p class="muted">Grid exchange, confirmed accounting records, tariff linkage and source traceability.</p></div></div>
    ${meterMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Metering Role</span><strong>${m.profile}</strong><small>${device.children}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>Meter level rule</h3><p class="muted">Meter devices usually live at grid connection, subplant or consumption/export points. They produce accounting records and commercial facts, not MPPT/String hierarchy.</p></div></div>`;
}


function bessDerivedMetrics(device: FleetDeviceRecord) {
  const isPcs = device.type === 'PCS';
  const warning = device.status === 'Warning';
  const fault = device.status === 'Fault';
  return {
    soc: fault ? '18%' : warning ? '42%' : '76%',
    soh: fault ? '91%' : warning ? '94%' : '97%',
    flowPower: isPcs ? (warning ? '280 kW' : '430 kW') : fault ? '0 kW' : warning ? '180 kW' : '320 kW',
    mode: fault ? 'Protection' : warning ? 'Discharge limited' : 'Charge / Discharge ready',
    chargePower: fault ? '0 kW' : warning ? '120 kW' : '360 kW',
    dischargePower: fault ? '0 kW' : warning ? '180 kW' : '420 kW',
    temperature: fault ? '41°C' : warning ? '38°C' : '31°C',
    cycles: fault ? '812' : warning ? '604' : '428',
    racks: device.capacity && device.capacity.includes('2 MWh') ? 8 : device.capacity && device.capacity.includes('1 MWh') ? 6 : 4,
    modules: device.capacity && device.capacity.includes('2 MWh') ? 64 : device.capacity && device.capacity.includes('1 MWh') ? 48 : 32,
    freshness: fault ? 'Stale' : warning ? 'Delayed' : 'Fresh'
  };
}

function bessMetricCards(device: FleetDeviceRecord): string {
  const m = bessDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 bess-metric-grid-v22">
    <article><span>SOC</span><strong>${m.soc}</strong><small>State of charge</small></article>
    <article><span>SOH</span><strong>${m.soh}</strong><small>Battery health</small></article>
    <article><span>Power Flow</span><strong>${m.flowPower}</strong><small>Active charge/discharge</small></article>
    <article><span>Mode</span><strong>${m.mode}</strong><small>Operating state</small></article>
    <article><span>Temperature</span><strong>${m.temperature}</strong><small>Thermal system</small></article>
    <article><span>Cycles</span><strong>${m.cycles}</strong><small>Lifetime cycles</small></article>
  </div>`;
}

function bessRacksTable(device: FleetDeviceRecord): string {
  const m = bessDerivedMetrics(device);
  return `<div class="data-table compact-table bess-rack-table-v22"><div class="data-head"><span>Rack</span><span>Modules</span><span>SOC</span><span>Temp</span><span>Status</span><span>Action</span></div>${Array.from({length:m.racks}).map((_,i)=>`<div class="data-row"><div><strong>Rack ${i+1}</strong><small>${device.id}-RACK-${i+1}</small></div><div><strong>${Math.round(m.modules / m.racks)} modules</strong><small>Cell groups monitored</small></div><div><span>${Math.max(12, parseInt(m.soc) - (i%3)*2)}%</span></div><div><span>${30 + (i%4)}°C</span></div><div><span class="badge ${(device.status === 'Fault' && i===0) || (device.status === 'Warning' && i===1) ? 'warning' : 'success'}">${(device.status === 'Fault' && i===0) ? 'Protection' : (device.status === 'Warning' && i===1) ? 'Check' : 'Normal'}</span></div><div><button class="small-btn" type="button">Open Rack</button></div></div>`).join('')}</div>`;
}

function bessDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const m = bessDerivedMetrics(device);
  const hasIssue = device.status === 'Warning' || device.status === 'Fault';

  if (tab === 'soc') return `<div class="section-title-v17"><div><h2>SOC / SOH</h2><p class="muted">Battery health and availability overview. SOC is operational; SOH is lifecycle condition.</p></div></div>
    ${bessMetricCards(device)}
    <div class="telemetry-layout-v20"><div class="chart-card-v20"><div class="chart-card-head-v20"><strong>SOC curve · Today</strong><small>State of charge</small></div>${miniBarChartV20(hasIssue ? [66,62,58,53,49,45,42,39,34,28] : [38,44,56,68,76,82,79,73,67,61])}</div><div class="info-grid compact-info-v20"><div><span>SOC</span><strong>${m.soc}</strong></div><div><span>SOH</span><strong>${m.soh}</strong></div><div><span>Availability</span><strong>${device.status === 'Fault' ? 'Limited' : 'Available'}</strong></div><div><span>Thermal State</span><strong>${m.temperature}</strong></div><div><span>Cycle Count</span><strong>${m.cycles}</strong></div><div><span>Freshness</span><strong>${m.freshness}</strong></div></div></div>`;

  if (tab === 'charge') return `<div class="section-title-v17"><div><h2>Charge / Discharge</h2><p class="muted">Current storage operating mode and power direction. Commands are capability-gated and audited.</p></div></div>
    <div class="device-overview-grid-v19"><article><span>Operating Mode</span><strong>${m.mode}</strong><small>Capability-driven state</small></article><article><span>Charge Power</span><strong>${m.chargePower}</strong><small>Solar/grid to battery</small></article><article><span>Discharge Power</span><strong>${m.dischargePower}</strong><small>Battery to load/grid</small></article><article><span>Command Safety</span><strong>Approval required</strong><small>Remote actions audited</small></article></div>
    <div class="data-table compact-table bess-command-table-v22"><div class="data-head"><span>Mode</span><span>Direction</span><span>Limit</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>Charge</strong><small>Accept energy into BESS</small></div><div><span>Grid / PV → Battery</span></div><div><span>Max ${m.chargePower}</span></div><div><span class="badge success">Available</span></div><div><button class="small-btn" type="button">View Command</button></div></div><div class="data-row"><div><strong>Discharge</strong><small>Release energy from BESS</small></div><div><span>Battery → Grid / Load</span></div><div><span>Max ${m.dischargePower}</span></div><div><span class="badge ${hasIssue ? 'warning' : 'success'}">${hasIssue ? 'Limited' : 'Available'}</span></div><div><button class="small-btn" type="button">View Command</button></div></div></div>`;

  if (tab === 'pcs') {
    const linkedPcs = siblings.find(x => x.type === 'PCS');
    return `<div class="section-title-v17"><div><h2>PCS</h2><p class="muted">Power Conversion System bridge between DC battery bus and AC plant/grid side.</p></div></div>
    <div class="asset-tree-v17"><div>BESS · ${device.name}</div><ul><li>PCS / Converter<ul><li>DC bus</li><li>AC output</li><li>Protection relays</li><li>Cooling loop</li></ul></li></ul></div>
    <div class="info-grid"><div><span>PCS Linked</span><strong>${linkedPcs?.name || (device.type === 'PCS' ? device.name : 'PCS Controller')}</strong></div><div><span>Rated Power</span><strong>${device.type === 'PCS' ? device.capacity : '500 kW'}</strong></div><div><span>DC Bus</span><strong>Nominal 750 V</strong></div><div><span>AC Output</span><strong>400 V / 50 Hz</strong></div><div><span>Protection</span><strong>${hasIssue ? 'Check required' : 'Normal'}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div></div>${linkedPcs ? `<div class="inline-actions-v24"><button class="small-btn" type="button" data-open-device="${linkedPcs.id}">Open PCS Detail</button></div>` : ''}`;
  }

  if (tab === 'racks') return `<div class="section-title-v17"><div><h2>Racks / Modules</h2><p class="muted">BESS internal topology. Racks contain modules, modules contain monitored cell groups.</p></div></div>
    <div class="topology-path-v20"><span>Plant</span><b>→</b><span>BESS</span><b>→</b><span>Container</span><b>→</b><span>Rack</span><b>→</b><span>Module</span><b>→</b><span>Cell Group</span></div>${bessRacksTable(device)}`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Battery and PCS events connected to SOP, tasks and work orders.</p></div></div>
    <div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${hasIssue ? 'BESS availability reduced' : 'No active battery issues'}</strong><small>${device.name}</small></div><div>${hasIssue ? '<span class="badge warning">Warning</span>' : '<span class="badge success">Normal</span>'}</div><div><span>${hasIssue ? device.lastSeen : 'Now'}</span></div><div><span>${hasIssue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${hasIssue ? 'Open SOP' : 'View History'}</button></div></div>${device.status === 'Fault' ? '<div class="data-row"><div><strong>Rack protection state</strong><small>Rack 1 · BMS</small></div><div><span class="badge warning">Critical</span></div><div><span>35 min ago</span></div><div><span>Open</span></div><div><button class="small-btn" type="button">Create Work Order</button></div></div>' : ''}</div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Storage hierarchy and plant-level sibling devices.</p></div></div>
    <div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Storage Yard<ul><li>${device.type} · ${device.name}<ul><li>BMS</li><li>PCS link</li><li>Rack 1–${m.racks}</li><li>Module groups</li><li>Thermal system / HVAC</li></ul></li></ul></li></ul></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static BESS master data, separate from live battery telemetry.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Rated Capacity</span><strong>${device.capacity}</strong></div><div><span>Firmware / BMS</span><strong>${device.firmware}</strong></div><div><span>Battery Chemistry</span><strong>LFP</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Warranty</span><strong>Active · 10 years / cycles based</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage and capability flags for storage telemetry and commands.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} connector</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>BESS canonical model mapped</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Capability Flags</span><strong>SOC · SOH · BMS alerts · Commands gated</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">BESS operational timeline, command audit and lifecycle events.</p></div></div><div class="status-timeline-v20"><div class="chart-card-head-v20"><strong>Status timeline</strong><small>Last 24 hours</small></div><div class="status-steps-v20"><span class="ok">Available</span><span class="ok">Charge</span><span class="ok">Discharge</span><span class="${hasIssue ? 'warn' : 'ok'}">${hasIssue ? 'Limited' : 'Idle'}</span><span class="${device.status === 'Fault' ? 'warn' : 'ok'}">${device.status === 'Fault' ? 'Protection' : 'Ready'}</span></div></div><div class="timeline-v17"><div><b>Today</b><span>SOC/SOH snapshot refreshed from BMS</span></div><div><b>Today</b><span>${hasIssue ? 'BESS limitation event linked to SOP' : 'Charge / discharge window completed normally'}</span></div><div><b>Yesterday</b><span>Rack balancing check completed</span></div><div><b>03 Jun</b><span>Storage topology confirmed under ${plant.name}</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>BESS Overview</h2><p class="muted">Battery storage workspace focused on state of charge, health, operating mode and internal topology.</p></div></div>${bessMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Storage Hierarchy</span><strong>${device.location}</strong><small>${device.children}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>BESS level rule</h3><p class="muted">BESS children are PCS/BMS, racks, modules and cell groups. Meter, inverter, transformer and weather station remain plant-level sibling devices.</p></div></div>`;
}

function pcsDerivedMetrics(device: FleetDeviceRecord) {
  const warning = device.status === 'Warning' || device.status === 'Fault';
  return {
    acPower: warning ? '312 kW' : '420 kW',
    dcPower: warning ? '328 kW' : '438 kW',
    efficiency: warning ? '95.1%' : '97.8%',
    dcVoltage: warning ? '720 V' : '760 V',
    acVoltage: warning ? '392 V' : '400 V',
    current: warning ? '456 A' : '610 A',
    frequency: '50.0 Hz',
    mode: warning ? 'Limited conversion' : 'Grid-following',
    gridState: warning ? 'Connected · limited' : 'Connected · normal',
    freshness: warning ? 'Delayed' : 'Fresh'
  };
}

function pcsMetricCards(device: FleetDeviceRecord): string {
  const m = pcsDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 pcs-metric-grid-v24">
    <article><span>AC Power</span><strong>${m.acPower}</strong><small>Grid-side output</small></article>
    <article><span>DC Power</span><strong>${m.dcPower}</strong><small>Battery-side input/output</small></article>
    <article><span>Efficiency</span><strong>${m.efficiency}</strong><small>Conversion efficiency</small></article>
    <article><span>Mode</span><strong>${m.mode}</strong><small>Operating state</small></article>
    <article><span>Grid State</span><strong>${m.gridState}</strong><small>AC coupling</small></article>
    <article><span>Freshness</span><strong>${m.freshness}</strong><small>Last seen ${device.lastSeen}</small></article>
  </div>`;
}

function pcsCommandRows(device: FleetDeviceRecord): string {
  const warning = device.status === 'Warning' || device.status === 'Fault';
  const rows = [
    ['Charge conversion', 'AC/DC', 'Grid / PV → DC bus', warning ? 'Limited' : 'Available', 'Max 500 kW'],
    ['Discharge conversion', 'DC/AC', 'Battery DC bus → Grid / Load', warning ? 'Limited' : 'Available', 'Max 500 kW'],
    ['Reactive support', 'AC', 'PCS → Grid support', 'Available', '+/-250 kVAr'],
    ['Emergency stop', 'Safety', 'PCS shutdown command', 'Approval required', 'Risky command']
  ];
  return `<div class="data-table compact-table pcs-command-table-v24"><div class="data-head"><span>Function</span><span>Direction</span><span>Flow</span><span>Status</span><span>Limit</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span>${r[1]}</span></div><div><span>${r[2]}</span></div><div><span class="badge ${r[3] === 'Available' ? 'success' : r[3] === 'Approval required' ? 'warning' : 'warning'}">${r[3]}</span></div><div><span>${r[4]}</span></div><div><button class="small-btn" type="button">View Command</button></div></div>`).join('')}</div>`;
}

function pcsConnectedBessRows(device: FleetDeviceRecord, siblings: FleetDeviceRecord[]): string {
  const related = siblings.filter(d => d.type === 'Battery');
  const rows = related.length ? related : [{ id:'BESS-LINK-01', name:'BESS Container', type:'Battery', status:'Active', capacity:'1 MWh', location:'Storage yard', lastSeen:device.lastSeen }];
  return `<div class="data-table compact-table pcs-bess-table-v24"><div class="data-head"><span>BESS Asset</span><span>Capacity</span><span>Location</span><span>Status</span><span>Last Seen</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r.name}</strong><small>${r.id}</small></div><div><span>${r.capacity}</span></div><div><span>${r.location}</span></div><div><span class="badge ${FleetClientModel.badge(r.status)}">${r.status}</span></div><div><span>${r.lastSeen}</span></div><div>${r.id.startsWith('BESS-LINK') ? '<button class="small-btn" type="button">View Link</button>' : `<button class="small-btn" type="button" data-open-device="${r.id}">Open BESS</button>`}</div></div>`).join('')}</div>`;
}

function pcsDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const m = pcsDerivedMetrics(device);
  const hasIssue = device.status === 'Warning' || device.status === 'Fault';

  if (tab === 'conversion') return `<div class="section-title-v17"><div><h2>Power Conversion</h2><p class="muted">PCS converts battery DC energy to AC grid/load energy and AC energy back to DC during charge.</p></div></div>${pcsMetricCards(device)}
    <div class="telemetry-layout-v20"><div class="chart-card-v20"><div class="chart-card-head-v20"><strong>AC/DC conversion · Today</strong><small>AC Power / DC Power</small></div>${miniBarChartV20(hasIssue ? [0,80,140,220,312,260,190,120,60,0] : [0,120,240,360,420,438,390,280,160,60])}</div><div class="info-grid compact-info-v20"><div><span>AC Power</span><strong>${m.acPower}</strong></div><div><span>DC Power</span><strong>${m.dcPower}</strong></div><div><span>Efficiency</span><strong>${m.efficiency}</strong></div><div><span>Mode</span><strong>${m.mode}</strong></div><div><span>DC Voltage</span><strong>${m.dcVoltage}</strong></div><div><span>AC Voltage</span><strong>${m.acVoltage}</strong></div><div><span>Current</span><strong>${m.current}</strong></div><div><span>Frequency</span><strong>${m.frequency}</strong></div></div></div>`;

  if (tab === 'charge') return `<div class="section-title-v17"><div><h2>Charge / Discharge</h2><p class="muted">Capability-gated PCS operating functions. Write-actions remain controlled by Command Center and audit rules.</p></div></div>${pcsCommandRows(device)}`;

  if (tab === 'connectedBess') return `<div class="section-title-v17"><div><h2>Connected BESS</h2><p class="muted">PCS is linked to battery containers/racks through the storage DC bus. BESS remains a sibling storage asset under the plant.</p></div></div>${pcsConnectedBessRows(device, siblings)}<div class="section-title-v17 mini"><div><h3>PCS level rule</h3><p class="muted">PCS is not the whole battery. It is the conversion device between BESS DC side and AC grid/load side.</p></div></div>`;

  if (tab === 'grid') return `<div class="section-title-v17"><div><h2>Grid Connection</h2><p class="muted">AC-side connection, protection state and grid support context for the PCS.</p></div></div><div class="device-overview-grid-v19"><article><span>Grid State</span><strong>${m.gridState}</strong><small>AC breaker and grid sync</small></article><article><span>AC Voltage</span><strong>${m.acVoltage}</strong><small>Grid side</small></article><article><span>Frequency</span><strong>${m.frequency}</strong><small>Nominal frequency</small></article><article><span>Reactive Support</span><strong>Available</strong><small>Capability gated</small></article></div><div class="data-table compact-table pcs-grid-table-v24"><div class="data-head"><span>Protection</span><span>State</span><span>Last Event</span><span>Action</span></div><div class="data-row"><div><strong>Grid sync</strong><small>AC coupling</small></div><div><span class="badge success">Synchronized</span></div><div><span>Today · normal</span></div><div><button class="small-btn" type="button">View History</button></div></div><div class="data-row"><div><strong>Breaker state</strong><small>PCS AC breaker</small></div><div><span class="badge success">Closed</span></div><div><span>No trip</span></div><div><button class="small-btn" type="button">Open Events</button></div></div></div>`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">PCS alerts related to conversion, protection, grid sync and BESS communication.</p></div></div><div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${hasIssue ? 'Conversion limited / DC bus warning' : 'No active PCS issues'}</strong><small>${device.name}</small></div><div><span class="badge ${hasIssue ? 'warning' : 'success'}">${hasIssue ? 'Warning' : 'Normal'}</span></div><div><span>${hasIssue ? device.lastSeen : 'Now'}</span></div><div><span>${hasIssue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${hasIssue ? 'Open Alert' : 'View History'}</button></div></div></div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">PCS position in the storage and grid conversion chain.</p></div></div><div class="topology-path-v20"><span>Plant</span><b>→</b><span>BESS / Storage Yard</span><b>→</b><span>${device.name}</span><b>→</b><span>AC Grid Interface</span></div><div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Storage Yard<ul><li>BESS Container / Racks</li><li>${device.type} · ${device.name}<ul><li>DC bus</li><li>AC output</li><li>Grid protection</li><li>Command interface</li></ul></li></ul></li><li>Grid Side<ul><li>Transformer</li><li>Switchgear</li><li>Metering point</li></ul></li></ul></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static PCS master data and electrical ratings.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Rated Power</span><strong>${device.capacity}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div><div><span>DC Voltage Range</span><strong>600–900 V</strong></div><div><span>AC Output</span><strong>400 V · 50 Hz</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage and capability flags for PCS telemetry and commands.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} storage connector</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical PCS</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Capability Flags</span><strong>AC/DC telemetry · Grid sync · Commands gated</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">PCS operational history, command audit and protection events.</p></div></div><div class="status-timeline-v20"><div class="chart-card-head-v20"><strong>Status timeline</strong><small>Last 24 hours</small></div><div class="status-steps-v20"><span class="ok">Ready</span><span class="ok">Charge</span><span class="ok">Discharge</span><span class="${hasIssue ? 'warn' : 'ok'}">${hasIssue ? 'Limited' : 'Ready'}</span><span class="ok">Grid synced</span></div></div><div class="timeline-v17"><div><b>Today</b><span>PCS conversion telemetry refreshed from storage connector</span></div><div><b>Today</b><span>${hasIssue ? 'Conversion limit event linked to BESS workflow' : 'Charge/discharge conversion completed normally'}</span></div><div><b>Yesterday</b><span>Grid synchronization check completed</span></div><div><b>03 Jun</b><span>PCS linked to ${plant.name} storage topology</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>PCS Overview</h2><p class="muted">Power Conversion System workspace. PCS converts energy between battery DC side and AC grid/load side.</p></div></div>${pcsMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Conversion Role</span><strong>${device.children}</strong><small>${device.location}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>PCS level rule</h3><p class="muted">PCS is a storage infrastructure device, not a PV inverter. It belongs near BESS and grid device in the plant topology.</p></div></div>`;
}

function weatherDerivedMetrics(device: FleetDeviceRecord) {
  const offline = device.status === 'Offline' || device.status === 'Fault';
  const warning = device.status === 'Warning';
  return {
    irradiance: offline ? '—' : warning ? '612 W/m2' : '846 W/m2',
    ambient: offline ? '—' : warning ? '31°C' : '28°C',
    moduleTemp: offline ? '—' : warning ? '47°C' : '42°C',
    wind: offline ? '—' : '4.6 m/s',
    humidity: offline ? '—' : '42%',
    pressure: offline ? '—' : '1012 hPa',
    freshness: offline ? 'Stale' : warning ? 'Delayed' : 'Fresh',
    sensorsOnline: offline ? '0 / 5' : warning ? '4 / 5' : '5 / 5'
  };
}

function weatherMetricCards(device: FleetDeviceRecord): string {
  const m = weatherDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 weather-metric-grid-v23">
    <article><span>Irradiance</span><strong>${m.irradiance}</strong><small>Plane / plant sensor</small></article>
    <article><span>Ambient Temp</span><strong>${m.ambient}</strong><small>Air temperature</small></article>
    <article><span>Module Temp</span><strong>${m.moduleTemp}</strong><small>PV module sensor</small></article>
    <article><span>Wind</span><strong>${m.wind}</strong><small>Speed sensor</small></article>
    <article><span>Humidity</span><strong>${m.humidity}</strong><small>Weather context</small></article>
    <article><span>Sensors Online</span><strong>${m.sensorsOnline}</strong><small>Data quality</small></article>
  </div>`;
}

function weatherSensorRows(device: FleetDeviceRecord): string {
  const m = weatherDerivedMetrics(device);
  const rows = [
    ['Irradiance sensor', 'POA / GHI', m.irradiance, m.freshness, 'Used for performance ratio'],
    ['Ambient temperature', 'Temperature', m.ambient, m.freshness, 'Weather correction'],
    ['Module temperature', 'Temperature', m.moduleTemp, m.freshness, 'PV performance context'],
    ['Wind sensor', 'Wind speed', m.wind, device.status === 'Offline' ? 'Stale' : 'Fresh', 'Safety and diagnostics'],
    ['Humidity sensor', 'Humidity', m.humidity, device.status === 'Warning' ? 'Delayed' : m.freshness, 'Environmental context']
  ];
  return `<div class="data-table compact-table weather-sensor-table-v23"><div class="data-head"><span>Sensor</span><span>Type</span><span>Current</span><span>Quality</span><span>Purpose</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span>${r[1]}</span></div><div><strong>${r[2]}</strong></div><div><span class="badge ${r[3] === 'Fresh' ? 'success' : 'warning'}">${r[3]}</span></div><div><span>${r[4]}</span></div></div>`).join('')}</div>`;
}

function weatherDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const m = weatherDerivedMetrics(device);
  const hasIssue = device.status === 'Warning' || device.status === 'Offline' || device.status === 'Fault';

  if (tab === 'irradiance') return `<div class="section-title-v17"><div><h2>Irradiance</h2><p class="muted">Solar resource context used to explain production and performance ratio.</p></div></div>
    <div class="telemetry-layout-v20"><div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Irradiance curve · Today</strong><small>W/m2</small></div>${miniBarChartV20(hasIssue ? [0,0,140,280,420,612,520,380,170,0] : [0,80,240,480,720,846,790,610,360,90])}</div><div class="info-grid compact-info-v20"><div><span>Current Irradiance</span><strong>${m.irradiance}</strong></div><div><span>Quality</span><strong>${m.freshness}</strong></div><div><span>Sensor Role</span><strong>Performance context</strong></div><div><span>Linked Plant</span><strong>${plant.name}</strong></div></div></div>`;

  if (tab === 'temperature') return `<div class="section-title-v17"><div><h2>Temperature</h2><p class="muted">Ambient and module temperature readings used for diagnostics and performance interpretation.</p></div></div>
    <div class="device-overview-grid-v19"><article><span>Ambient</span><strong>${m.ambient}</strong><small>Air temperature</small></article><article><span>Module</span><strong>${m.moduleTemp}</strong><small>PV surface temperature</small></article><article><span>Delta</span><strong>${m.moduleTemp === '—' ? '—' : '+14°C'}</strong><small>Module vs ambient</small></article><article><span>Quality</span><strong>${m.freshness}</strong><small>Last seen ${device.lastSeen}</small></article></div>
    <div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Temperature profile · Today</strong><small>Module temperature</small></div>${miniBarChartV20(hasIssue ? [18,20,24,31,38,47,43,35,28,22] : [17,20,25,32,39,42,40,34,27,21])}</div>`;

  if (tab === 'wind') return `<div class="section-title-v17"><div><h2>Wind</h2><p class="muted">Wind conditions can support safety, soiling context and weather normalization.</p></div></div>
    <div class="device-overview-grid-v19"><article><span>Wind Speed</span><strong>${m.wind}</strong><small>Current value</small></article><article><span>Direction</span><strong>${m.wind === '—' ? '—' : 'NE'}</strong><small>Sensor estimate</small></article><article><span>Gust</span><strong>${m.wind === '—' ? '—' : '7.2 m/s'}</strong><small>Last interval</small></article><article><span>Quality</span><strong>${m.freshness}</strong><small>Weather sensor feed</small></article></div>`;

  if (tab === 'sensors') return `<div class="section-title-v17"><div><h2>Sensors</h2><p class="muted">Weather plant child sensors. These are subcomponents of the plant, not independent plant devices.</p></div></div>${weatherSensorRows(device)}`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Weather plant alerts affect performance interpretation and data quality confidence.</p></div></div>
    <div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${hasIssue ? 'Weather data delayed' : 'No active weather issues'}</strong><small>${device.name}</small></div><div>${hasIssue ? '<span class="badge warning">Warning</span>' : '<span class="badge success">Normal</span>'}</div><div><span>${hasIssue ? device.lastSeen : 'Now'}</span></div><div><span>${hasIssue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${hasIssue ? 'Open Alert' : 'View History'}</button></div></div></div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Weather plant belongs to the plant sensor layer and provides context to energy analytics.</p></div></div>
    <div class="topology-path-v20"><span>Plant</span><b>→</b><span>Sensor Mast / Roof</span><b>→</b><span>${device.name}</span><b>→</b><span>Weather sensors</span></div>
    <div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Weather / Sensor Layer<ul><li>${device.type} · ${device.name}<ul><li>Irradiance sensor</li><li>Ambient temperature</li><li>Module temperature</li><li>Wind speed / direction</li><li>Humidity / pressure</li></ul></li></ul></li></ul></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static weather station master data and sensor package information.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Sensor Package</span><strong>${device.capacity}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage and freshness for weather telemetry.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} weather connector</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical weather station</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Capability Flags</span><strong>Irradiance · Temperature · Wind · Humidity</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Weather data imports, sensor checks and data-quality events.</p></div></div><div class="timeline-v17"><div><b>Today</b><span>Weather telemetry normalized for ${plant.name}</span></div><div><b>Today</b><span>${hasIssue ? 'Weather feed delay flagged for data quality review' : 'All weather sensors reporting normally'}</span></div><div><b>Yesterday</b><span>Irradiance sensor calibration status checked</span></div><div><b>03 Jun</b><span>Weather plant linked to plant performance analytics</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Weather Station Overview</h2><p class="muted">Environmental context for solar generation, performance diagnostics and reporting.</p></div></div>${weatherMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Sensor Package</span><strong>${device.children}</strong><small>${device.location}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>Weather level rule</h3><p class="muted">Weather plant is a plant-level sensor asset. Its child objects are sensors, while inverters, meters and BESS remain sibling device.</p></div></div>`;
}


function loggerDerivedMetrics(device: FleetDeviceRecord) {
  const issue = device.status === 'Warning' || device.status === 'Offline' || device.status === 'Fault';
  const linked = parseInt(String(device.capacity || '').replace(/[^0-9]/g, ''), 10) || 48;
  return {
    linked,
    online: issue ? Math.max(0, linked - 6) : Math.max(0, linked - 1),
    signal: issue ? '64%' : '92%',
    uplink: issue ? 'Degraded' : 'Healthy',
    latency: issue ? '820 ms' : '84 ms',
    packetLoss: issue ? '4.8%' : '0.2%',
    protocol: device.vendor === 'Huawei' ? 'Modbus TCP / FusionSolar' : device.vendor === 'Sungrow' ? 'Modbus TCP / iSolarCloud' : 'Vendor gateway API',
    freshness: issue ? 'Delayed' : 'Fresh'
  };
}

function loggerMetricCards(device: FleetDeviceRecord): string {
  const m = loggerDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 logger-metric-grid-v23">
    <article><span>Linked Devices</span><strong>${m.linked}</strong><small>Child telemetry sources</small></article>
    <article><span>Online Devices</span><strong>${m.online}</strong><small>Currently reporting</small></article>
    <article><span>Signal Quality</span><strong>${m.signal}</strong><small>Network strength</small></article>
    <article><span>Uplink</span><strong>${m.uplink}</strong><small>Gateway connectivity</small></article>
    <article><span>Latency</span><strong>${m.latency}</strong><small>Current roundtrip</small></article>
    <article><span>Packet Loss</span><strong>${m.packetLoss}</strong><small>Last sync window</small></article>
  </div>`;
}

function loggerLinkedRows(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[]): string {
  const m = loggerDerivedMetrics(device);
  const linked = siblings.filter(x => x.id !== device.id).slice(0, 8);
  if (!linked.length) return `<div class="empty-state"><strong>No linked devices</strong><small>This gateway has no sample children in the current plant model.</small></div>`;
  return `<div class="data-table compact-table logger-linked-table-v23"><div class="data-head"><span>Device</span><span>Type</span><span>Link</span><span>Freshness</span><span>Status</span><span>Action</span></div>${linked.map((x,i)=>`<div class="data-row"><div><strong>${x.name}</strong><small>${x.id}</small></div><div><span>${x.type}</span></div><div><span>${i % 3 === 0 ? 'RS485 / Modbus' : 'Ethernet / TCP'}</span></div><div><span>${i === 2 && device.status === 'Warning' ? '18 min ago' : x.lastSeen}</span></div><div><span class="badge ${i === 2 && device.status === 'Warning' ? 'warning' : FleetClientModel.badge(x.status)}">${i === 2 && device.status === 'Warning' ? 'Delayed' : x.status}</span></div><div><button class="small-btn" type="button" data-open-device="${x.id}">Open Device</button></div></div>`).join('')}</div>`;
}

function loggerDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const m = loggerDerivedMetrics(device);
  const hasIssue = device.status === 'Warning' || device.status === 'Offline' || device.status === 'Fault';

  if (tab === 'connectivity') return `<div class="section-title-v17"><div><h2>Connectivity</h2><p class="muted">Gateway health, network quality and communication stability.</p></div></div>${loggerMetricCards(device)}
    <div class="telemetry-layout-v20"><div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Signal quality · Today</strong><small>Network strength</small></div>${miniBarChartV20(hasIssue ? [88,86,82,76,70,64,62,66,69,65] : [90,92,94,93,95,92,91,94,96,92])}</div><div class="info-grid compact-info-v20"><div><span>Protocol</span><strong>${m.protocol}</strong></div><div><span>Latency</span><strong>${m.latency}</strong></div><div><span>Packet Loss</span><strong>${m.packetLoss}</strong></div><div><span>Uplink</span><strong>${m.uplink}</strong></div></div></div>`;

  if (tab === 'linked') return `<div class="section-title-v17"><div><h2>Linked Devices</h2><p class="muted">Devices whose telemetry is collected through this logger or gateway.</p></div></div>${loggerLinkedRows(device, plant, siblings)}`;

  if (tab === 'sync') return `<div class="section-title-v17"><div><h2>Sync & Freshness</h2><p class="muted">Data freshness across child devices and connector stages.</p></div></div>
    <div class="data-table compact-table logger-sync-table-v23"><div class="data-head"><span>Stage</span><span>Last Success</span><span>Lag</span><span>Quality</span><span>Action</span></div>
      <div class="data-row"><div><strong>Gateway Poll</strong><small>${device.name}</small></div><div><span>${device.lastSeen}</span></div><div><span>${hasIssue ? '12 min' : '1 min'}</span></div><div><span class="badge ${hasIssue ? 'warning' : 'success'}">${m.freshness}</span></div><div><button class="small-btn" type="button">Open Trace</button></div></div>
      <div class="data-row"><div><strong>Raw Ingestion</strong><small>Payload capture</small></div><div><span>${hasIssue ? '14 min ago' : '1 min ago'}</span></div><div><span>${hasIssue ? 'Delayed' : 'Normal'}</span></div><div><span class="badge ${hasIssue ? 'warning' : 'success'}">${hasIssue ? 'Partial' : 'Fresh'}</span></div><div><button class="small-btn" type="button">View Raw</button></div></div>
      <div class="data-row"><div><strong>Core Write</strong><small>Canonical telemetry</small></div><div><span>${hasIssue ? '16 min ago' : '2 min ago'}</span></div><div><span>${hasIssue ? 'Delayed' : 'Normal'}</span></div><div><span class="badge ${hasIssue ? 'warning' : 'success'}">${hasIssue ? 'Delayed' : 'Fresh'}</span></div><div><button class="small-btn" type="button">Open Data Quality</button></div></div>
    </div>`;

  if (tab === 'network') return `<div class="section-title-v17"><div><h2>Network</h2><p class="muted">Communication channel, addressing and network diagnostics.</p></div></div><div class="info-grid"><div><span>Network Type</span><strong>Ethernet + RS485</strong></div><div><span>IP Address</span><strong>10.24.${m.linked % 20}.14</strong></div><div><span>Subnet</span><strong>Plant OT Network</strong></div><div><span>Signal</span><strong>${m.signal}</strong></div><div><span>Protocol</span><strong>${m.protocol}</strong></div><div><span>VPN / Tunnel</span><strong>${hasIssue ? 'Reconnecting' : 'Connected'}</strong></div></div>`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Gateway issues can impact many downstream devices, so they should be visible and prioritized.</p></div></div>
    <div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${hasIssue ? 'Gateway sync delayed' : 'No active gateway issues'}</strong><small>${device.name}</small></div><div>${hasIssue ? '<span class="badge warning">Warning</span>' : '<span class="badge success">Normal</span>'}</div><div><span>${hasIssue ? device.lastSeen : 'Now'}</span></div><div><span>${hasIssue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${hasIssue ? 'Open SOP' : 'View History'}</button></div></div></div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Logger / Gateway sits between plant device and the vendor connector. It collects child-device data but does not own the electrical hierarchy.</p></div></div>
    <div class="topology-path-v20"><span>Plant</span><b>→</b><span>OT Network</span><b>→</b><span>${device.name}</span><b>→</b><span>Linked Devices</span><b>→</b><span>Vendor Connector</span></div>
    <div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Communication Layer<ul><li>${device.type} · ${device.name}<ul><li>Inverter telemetry channels</li><li>Metering channel</li><li>Weather plant channel</li><li>BESS / PCS channel when installed</li></ul></li></ul></li><li>Electrical Layer<ul><li>Inverters</li><li>Meters</li><li>BESS / PCS</li><li>Transformer</li></ul></li></ul></div>${loggerLinkedRows(device, plant, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static gateway asset data and communication capabilities.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Capacity</span><strong>${device.capacity}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage for gateway and child-device payloads.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} gateway connector</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical logger / gateway</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div><div><span>Capability Flags</span><strong>Polling · Child devices · Sync trace · Alerts</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Gateway sync, child-device polling, network and governance timeline.</p></div></div><div class="timeline-v17"><div><b>Today</b><span>Gateway payload normalized for ${plant.name}</span></div><div><b>Today</b><span>${hasIssue ? 'Sync delay detected across linked devices' : 'All linked devices reporting within freshness threshold'}</span></div><div><b>Yesterday</b><span>Communication map refreshed from source connector</span></div><div><b>03 Jun</b><span>Gateway linked to plant OT network and Data Governance lineage</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Logger / Gateway Overview</h2><p class="muted">Communication gateway that collects device telemetry and forwards it into Zentrid through vendor connectors.</p></div></div>${loggerMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Gateway Role</span><strong>${device.children}</strong><small>${device.location}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>Gateway level rule</h3><p class="muted">Logger / Gateway is a communication asset. It links to child devices for data collection, but inverters, meters, BESS and transformers remain plant-level device in the asset hierarchy.</p></div></div>`;
}


function isTransformerDevice(device: FleetDeviceRecord): boolean {
  return device && (device.type === 'Transformer' || device.type === 'Grid Device' || String(device.name || '').toLowerCase().includes('transformer') || String(device.id || '').startsWith('TR-'));
}

function transformerDerivedMetrics(device: FleetDeviceRecord) {
  const hasIssue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const capacity = device.capacity || '2.5 MVA';
  return {
    capacity,
    load: hasIssue ? '71%' : '58%',
    hvVoltage: hasIssue ? '10.7 kV' : '11.0 kV',
    lvVoltage: hasIssue ? '392 V' : '400 V',
    temperature: hasIssue ? '78°C' : '62°C',
    oilStatus: hasIssue ? 'Check required' : 'Normal',
    protection: hasIssue ? 'Warning' : 'Normal',
    feederCount: String(device.children || '').toLowerCase().includes('switch') ? '4 feeders' : '2 feeders',
    freshness: hasIssue ? 'Delayed' : 'Fresh'
  };
}

function transformerMetricCards(device: FleetDeviceRecord): string {
  const m = transformerDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 transformer-metric-grid-v25">
    <article><span>Load</span><strong>${m.load}</strong><small>Current transformer load</small></article>
    <article><span>HV Voltage</span><strong>${m.hvVoltage}</strong><small>Grid side</small></article>
    <article><span>LV Voltage</span><strong>${m.lvVoltage}</strong><small>Plant side</small></article>
    <article><span>Temperature</span><strong>${m.temperature}</strong><small>Thermal state</small></article>
    <article><span>Oil / Insulation</span><strong>${m.oilStatus}</strong><small>Protection context</small></article>
    <article><span>Protection</span><strong>${m.protection}</strong><small>Relay / trip status</small></article>
  </div>`;
}

function transformerMeasurementRows(device: FleetDeviceRecord): string {
  const m = transformerDerivedMetrics(device);
  const rows = [
    ['HV voltage', m.hvVoltage, '11 kV nominal', m.freshness],
    ['LV voltage', m.lvVoltage, '400 V nominal', m.freshness],
    ['Load factor', m.load, 'Capacity ' + m.capacity, device.status === 'Warning' ? 'Check' : 'Normal'],
    ['Winding temperature', m.temperature, 'Thermal sensor', device.status === 'Warning' ? 'Elevated' : 'Normal'],
    ['Oil / insulation state', m.oilStatus, 'Inspection signal', device.status === 'Warning' ? 'Warning' : 'Normal']
  ];
  return `<div class="data-table compact-table transformer-measure-table-v25"><div class="data-head"><span>Measurement</span><span>Current</span><span>Reference</span><span>Quality</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span>${r[1]}</span></div><div><span>${r[2]}</span></div><div><span class="badge ${r[3] === 'Normal' || r[3] === 'Fresh' ? 'success' : 'warning'}">${r[3]}</span></div></div>`).join('')}</div>`;
}

function transformerProtectionRows(device: FleetDeviceRecord): string {
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const rows = issue ? [
    ['Temperature threshold', 'Warning', device.lastSeen, 'Open', 'Open Event'],
    ['Oil level inspection', 'Warning', 'Today', 'Pending', 'Create Task'],
    ['Breaker trip', 'Normal', 'No trip', 'Clear', 'View History']
  ] : [
    ['Differential protection', 'Normal', 'No event', 'Clear', 'View History'],
    ['Overcurrent protection', 'Normal', 'No event', 'Clear', 'View History'],
    ['Breaker trip', 'Normal', 'No trip', 'Clear', 'View History']
  ];
  return `<div class="data-table compact-table transformer-protection-table-v25"><div class="data-head"><span>Protection</span><span>Severity</span><span>Last Event</span><span>Status</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.location}</small></div><div><span class="badge ${r[1] === 'Normal' ? 'success' : 'warning'}">${r[1]}</span></div><div><span>${r[2]}</span></div><div><span>${r[3]}</span></div><div><button class="small-btn" type="button">${r[4]}</button></div></div>`).join('')}</div>`;
}

function transformerDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const m = transformerDerivedMetrics(device);
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';

  if (tab === 'measurements') return `<div class="section-title-v17"><div><h2>Electrical Measurements</h2><p class="muted">Transformer electrical state between plant generation/storage and the grid interface.</p></div></div>${transformerMetricCards(device)}${transformerMeasurementRows(device)}`;

  if (tab === 'protection') return `<div class="section-title-v17"><div><h2>Protection Events</h2><p class="muted">Relay, trip, thermal and insulation events. These should feed Alerts, SOP and Work Orders.</p></div></div>${transformerProtectionRows(device)}`;

  if (tab === 'grid') return `<div class="section-title-v17"><div><h2>Grid / Feeders</h2><p class="muted">Transformer relation to switchgear, feeders, meters and the plant AC bus.</p></div></div>
    <div class="device-overview-grid-v19"><article><span>Feeders</span><strong>${m.feederCount}</strong><small>Connected outgoing circuits</small></article><article><span>Grid Side</span><strong>${m.hvVoltage}</strong><small>HV connection</small></article><article><span>Plant Side</span><strong>${m.lvVoltage}</strong><small>LV bus</small></article><article><span>Metering Point</span><strong>${siblings.find(x => x.type === 'Meter')?.name || 'Main meter'}</strong><small>Related plant sibling</small></article></div>
    <div class="data-table compact-table transformer-feeder-table-v25"><div class="data-head"><span>Feeder</span><span>Connected Area</span><span>Load</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>Feeder A</strong><small>PV inverter area</small></div><div><span>Inverters / AC bus</span></div><div><span>42%</span></div><div><span class="badge success">Normal</span></div><div><button class="small-btn" type="button">View Feeder</button></div></div><div class="data-row"><div><strong>Feeder B</strong><small>Storage / auxiliary</small></div><div><span>BESS / PCS / Aux</span></div><div><span>${issue ? '71%' : '36%'}</span></div><div><span class="badge ${issue ? 'warning' : 'success'}">${issue ? 'Check' : 'Normal'}</span></div><div><button class="small-btn" type="button">Open Events</button></div></div></div>`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Transformer events connected to incident, SOP and work-order flows.</p></div></div><div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${issue ? 'Transformer temperature / oil status check' : 'No active transformer issues'}</strong><small>${device.name}</small></div><div><span class="badge ${issue ? 'warning' : 'success'}">${issue ? 'Warning' : 'Normal'}</span></div><div><span>${issue ? device.lastSeen : 'Now'}</span></div><div><span>${issue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${issue ? 'Open Alert' : 'View History'}</button></div></div></div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Transformer position in the plant electrical infrastructure.</p></div></div><div class="topology-path-v20"><span>Plant</span><b>→</b><span>AC Collection</span><b>→</b><span>${device.name}</span><b>→</b><span>Switchgear / Grid</span></div><div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Generation Side<ul><li>Inverters</li><li>PCS / BESS if available</li></ul></li><li>Electrical Infrastructure<ul><li>${device.type} · ${device.name}<ul><li>HV side</li><li>LV side</li><li>Protection relay</li><li>Feeders</li></ul></li><li>Switchgear / Breaker</li><li>Metering point</li></ul></li></ul></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static master data for transformer device.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model / Rating</span><strong>${device.model}</strong></div><div><span>Rated Capacity</span><strong>${device.capacity}</strong></div><div><span>Cooling / Oil</span><strong>Oil immersed · monitored</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div><div><span>Warranty</span><strong>Active · 2024–2029</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage for transformer operational state and protection events.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} / plant SCADA</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical transformer</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div><div><span>Capability Flags</span><strong>Measurements · Protection · Events</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Transformer operational, inspection and protection timeline.</p></div></div><div class="timeline-v17"><div><b>Today</b><span>Transformer measurements normalized for ${plant.name}</span></div><div><b>Today</b><span>${issue ? 'Temperature / oil status check routed to operations' : 'Protection state verified as normal'}</span></div><div><b>Yesterday</b><span>Feeder load snapshot refreshed</span></div><div><b>03 Jun</b><span>Transformer linked to plant infrastructure topology</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Transformer Overview</h2><p class="muted">Electrical infrastructure workspace for transformer load, voltage, temperature and protection state.</p></div></div>${transformerMetricCards(device)}<div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>Transformer</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Role</span><strong>${device.children}</strong><small>${device.location}</small></article></div><div class="section-title-v17 mini"><div><h3>Transformer level rule</h3><p class="muted">Transformer is plant-level electrical infrastructure. It connects generation/storage AC output to switchgear, metering and the grid side.</p></div></div>`;
}


function isSwitchgearDevice(device: FleetDeviceRecord): boolean {
  return device && (device.type === 'Switchgear' || String(device.name || '').toLowerCase().includes('switchgear') || String(device.id || '').startsWith('SW-'));
}

function switchgearDerivedMetrics(device: FleetDeviceRecord) {
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  return {
    breakerState: issue ? 'Check' : 'Closed',
    protection: issue ? 'Warning' : 'Normal',
    feederCount: issue ? '5 feeders' : '4 feeders',
    lastTrip: issue ? device.lastSeen : 'No trip',
    busVoltage: String(device.capacity || '').includes('400') ? '400 V' : String(device.capacity || '').includes('24') ? '24 kV' : '12 kV',
    load: issue ? '68%' : '44%',
    commandMode: issue ? 'Approval required' : 'Available',
    freshness: issue ? 'Delayed' : 'Fresh'
  };
}

function switchgearMetricCards(device: FleetDeviceRecord): string {
  const m = switchgearDerivedMetrics(device);
  return `<div class="device-metric-grid-v20 switchgear-metric-grid-v26">
    <article><span>Main Breaker</span><strong>${m.breakerState}</strong><small>Current breaker state</small></article>
    <article><span>Bus Voltage</span><strong>${m.busVoltage}</strong><small>Switchgear bus</small></article>
    <article><span>Load</span><strong>${m.load}</strong><small>Current feeder load</small></article>
    <article><span>Feeders</span><strong>${m.feederCount}</strong><small>Connected circuits</small></article>
    <article><span>Protection</span><strong>${m.protection}</strong><small>Relay / interlock state</small></article>
    <article><span>Last Trip</span><strong>${m.lastTrip}</strong><small>Protection event state</small></article>
  </div>`;
}

function switchgearBreakerRows(device: FleetDeviceRecord): string {
  const m = switchgearDerivedMetrics(device);
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const rows = [
    ['Main breaker', m.breakerState, 'Grid connection', issue ? 'Check' : 'Normal', 'View State'],
    ['PV feeder breaker', 'Closed', 'Inverter AC bus', 'Normal', 'Open Feeder'],
    ['BESS / PCS breaker', issue ? 'Limited' : 'Closed', 'Storage feeder', issue ? 'Warning' : 'Normal', 'Open Events'],
    ['Auxiliary breaker', 'Closed', 'Aux loads / control', 'Normal', 'View State']
  ];
  return `<div class="data-table compact-table switchgear-breaker-table-v26"><div class="data-head"><span>Breaker</span><span>State</span><span>Connected Circuit</span><span>Status</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span>${r[1]}</span></div><div><span>${r[2]}</span></div><div><span class="badge ${r[3] === 'Normal' ? 'success' : 'warning'}">${r[3]}</span></div><div><button class="small-btn" type="button">${r[4]}</button></div></div>`).join('')}</div>`;
}

function switchgearFeederRows(device: FleetDeviceRecord): string {
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const rows = [
    ['Feeder 01', 'PV inverters', '42%', 'Normal', 'Open Feeder'],
    ['Feeder 02', 'BESS / PCS', issue ? '68%' : '36%', issue ? 'Warning' : 'Normal', 'View Load'],
    ['Feeder 03', 'Transformer / grid', '51%', 'Normal', 'View Path'],
    ['Feeder 04', 'Auxiliary loads', '12%', 'Normal', 'View State']
  ];
  return `<div class="data-table compact-table switchgear-feeder-table-v26"><div class="data-head"><span>Feeder</span><span>Connected Asset</span><span>Load</span><span>Status</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.location}</small></div><div><span>${r[1]}</span></div><div><span>${r[2]}</span></div><div><span class="badge ${r[3] === 'Normal' ? 'success' : 'warning'}">${r[3]}</span></div><div><button class="small-btn" type="button">${r[4]}</button></div></div>`).join('')}</div>`;
}

function switchgearEventRows(device: FleetDeviceRecord): string {
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const rows = issue ? [
    ['Interlock check', 'Warning', device.lastSeen, 'Open', 'Open SOP'],
    ['BESS feeder load', 'Warning', 'Today', 'Pending', 'Create Task'],
    ['Breaker trip', 'Normal', 'No trip', 'Clear', 'View History']
  ] : [
    ['Protection relay', 'Normal', 'No event', 'Clear', 'View History'],
    ['Breaker trip', 'Normal', 'No trip', 'Clear', 'View History'],
    ['Interlock state', 'Normal', 'Verified today', 'Clear', 'View State']
  ];
  return `<div class="data-table compact-table switchgear-event-table-v26"><div class="data-head"><span>Event</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span class="badge ${r[1] === 'Normal' ? 'success' : 'warning'}">${r[1]}</span></div><div><span>${r[2]}</span></div><div><span>${r[3]}</span></div><div><button class="small-btn" type="button">${r[4]}</button></div></div>`).join('')}</div>`;
}

function switchgearCommandRows(device: FleetDeviceRecord): string {
  const m = switchgearDerivedMetrics(device);
  const rows = [
    ['Open breaker', 'Risky', 'Breaker open command', 'Approval required', 'View Command'],
    ['Close breaker', 'Risky', 'Breaker close command', m.commandMode, 'View Command'],
    ['Reset protection relay', 'Controlled', 'Relay reset after inspection', 'Operator approval', 'Prepare'],
    ['Request state refresh', 'Safe', 'Read-only status refresh', 'Available', 'Run Check']
  ];
  return `<div class="data-table compact-table switchgear-command-table-v26"><div class="data-head"><span>Command</span><span>Risk</span><span>Description</span><span>Status</span><span>Action</span></div>${rows.map(r=>`<div class="data-row"><div><strong>${r[0]}</strong><small>${device.name}</small></div><div><span class="badge ${r[1] === 'Safe' ? 'success' : r[1] === 'Controlled' ? 'warning' : 'danger'}">${r[1]}</span></div><div><span>${r[2]}</span></div><div><span>${r[3]}</span></div><div><button class="small-btn" type="button">${r[4]}</button></div></div>`).join('')}</div>`;
}

function switchgearDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const m = switchgearDerivedMetrics(device);
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const issue = device.status === 'Warning' || device.status === 'Fault' || device.status === 'Offline';
  const transformer = siblings.find(x => isTransformerDevice(x));
  const meter = siblings.find(x => x.type === 'Meter');

  if (tab === 'breakers') return `<div class="section-title-v17"><div><h2>Breakers</h2><p class="muted">Breaker and interlock state for plant grid infrastructure.</p></div></div>${switchgearMetricCards(device)}${switchgearBreakerRows(device)}`;

  if (tab === 'feeders') return `<div class="section-title-v17"><div><h2>Feeders</h2><p class="muted">Outgoing circuits connected to PV, BESS/PCS, transformer and auxiliary loads.</p></div></div>${switchgearFeederRows(device)}`;

  if (tab === 'events') return `<div class="section-title-v17"><div><h2>Protection Events</h2><p class="muted">Trip, relay, interlock and feeder protection events routed to Alerts, SOP and Work Orders.</p></div></div>${switchgearEventRows(device)}`;

  if (tab === 'commands') return `<div class="section-title-v17"><div><h2>Commands</h2><p class="muted">Switchgear commands are risky control actions. They must stay capability-gated and audited.</p></div></div>${switchgearCommandRows(device)}`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Switchgear events connected to incident, SOP and work-order flows.</p></div></div><div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div><div class="data-row"><div><strong>${issue ? 'Switchgear interlock / feeder check' : 'No active switchgear issues'}</strong><small>${device.name}</small></div><div><span class="badge ${issue ? 'warning' : 'success'}">${issue ? 'Warning' : 'Normal'}</span></div><div><span>${issue ? device.lastSeen : 'Now'}</span></div><div><span>${issue ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${issue ? 'Open Alert' : 'View History'}</button></div></div></div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Switchgear sits between transformer, feeders, metering point and grid connection.</p></div></div><div class="topology-path-v20"><span>Plant</span><b>→</b><span>Transformer</span><b>→</b><span>${device.name}</span><b>→</b><span>Feeders / Grid</span></div><div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>Electrical Infrastructure<ul><li>${transformer ? transformer.name : 'Transformer'}<ul><li>${device.type} · ${device.name}<ul><li>Main breaker</li><li>PV feeder</li><li>BESS / PCS feeder</li><li>Aux feeder</li><li>${meter ? meter.name : 'Metering point'}</li></ul></li></ul></li></ul></li></ul></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static switchgear master data and protection package.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Rated Capacity</span><strong>${device.capacity}</strong></div><div><span>Protection Relay</span><strong>${device.firmware}</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div><div><span>Warranty</span><strong>Active · 2024–2029</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage for switchgear state, breaker events and command capability.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor} / plant SCADA</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical switchgear</strong></div><div><span>Data Freshness</span><strong>${m.freshness}</strong></div><div><span>Capability Flags</span><strong>Breakers · Feeders · Protection · Commands</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Switchgear operational, protection and command audit timeline.</p></div></div><div class="timeline-v17"><div><b>Today</b><span>Switchgear state normalized for ${plant.name}</span></div><div><b>Today</b><span>${issue ? 'Feeder / interlock check routed to operations' : 'Breaker state verified as normal'}</span></div><div><b>Yesterday</b><span>Feeder load snapshot refreshed</span></div><div><b>03 Jun</b><span>Switchgear linked to transformer and grid topology</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Switchgear Overview</h2><p class="muted">Electrical infrastructure workspace for breaker state, feeders, protection and command readiness.</p></div></div>${switchgearMetricCards(device)}<div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>Switchgear</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Role</span><strong>${device.children}</strong><small>${device.location}</small></article></div><div class="section-title-v17 mini"><div><h3>Switchgear level rule</h3><p class="muted">Switchgear is plant-level electrical infrastructure. It groups breakers and feeders; it is related to transformer, meters and PCS through plant topology.</p></div></div>`;
}

function deviceDetailTab(device: FleetDeviceRecord, plant: FleetPlantRecord, siblings: FleetDeviceRecord[], tab: string | undefined): string {
  const statusBadge = `<span class="badge ${FleetClientModel.badge(device.status)}">${device.status}</span>`;
  const isInverter = device.type === 'Inverter';
  const metrics = inverterDerivedMetrics(device);
  const warningRow = device.status === 'Warning';

  if (device.type === 'Meter') return meterDetailTab(device, plant, siblings, tab);
  if (device.type === 'PCS') return pcsDetailTab(device, plant, siblings, tab);
  if (device.type === 'Battery') return bessDetailTab(device, plant, siblings, tab);
  if (device.type === 'Weather Station') return weatherDetailTab(device, plant, siblings, tab);
  if (device.type === 'Logger' || device.type === 'Gateway') return loggerDetailTab(device, plant, siblings, tab);
  if (isSwitchgearDevice(device)) return switchgearDetailTab(device, plant, siblings, tab);
  if (isTransformerDevice(device)) return transformerDetailTab(device, plant, siblings, tab);

  if (tab === 'telemetry') return `<div class="section-title-v17"><div><h2>Telemetry</h2><p class="muted">Inverter telemetry split by AC/DC power, voltage, current, frequency and temperature.</p></div></div>
    <div class="telemetry-layout-v20">
      <div class="chart-card-v20"><div class="chart-card-head-v20"><strong>Power curve · Today</strong><small>AC Power / DC Power</small></div>${miniBarChartV20(warningRow ? [18, 22, 34, 56, 72, 84, 72, 54, 36, 21] : [22, 31, 48, 76, 98, 116, 124, 106, 74, 42])}</div>
      <div class="info-grid compact-info-v20"><div><span>AC Power</span><strong>${metrics.acPower}</strong></div><div><span>DC Power</span><strong>${metrics.dcPower}</strong></div><div><span>DC Voltage</span><strong>${metrics.dcVoltage}</strong></div><div><span>AC Voltage</span><strong>${metrics.acVoltage}</strong></div><div><span>Current</span><strong>${metrics.current}</strong></div><div><span>Frequency</span><strong>${metrics.frequency}</strong></div><div><span>Temperature</span><strong>${metrics.temperature}</strong></div><div><span>Freshness</span><strong>${metrics.freshness}</strong></div></div>
    </div>
    <div class="data-table compact-table telemetry-table-v20"><div class="data-head"><span>Metric</span><span>Current</span><span>Previous</span><span>Quality</span></div>
      <div class="data-row"><div><strong>AC active power</strong><small>Grid-side output</small></div><div><span>${metrics.acPower}</span></div><div><span>${warningRow ? '118 kW' : '164 kW'}</span></div><div>${warningRow ? '<span class="badge warning">Delayed</span>' : '<span class="badge success">Fresh</span>'}</div></div>
      <div class="data-row"><div><strong>DC input power</strong><small>PV-side input</small></div><div><span>${metrics.dcPower}</span></div><div><span>${warningRow ? '129 kW' : '178 kW'}</span></div><div><span class="badge success">Fresh</span></div></div>
      <div class="data-row"><div><strong>Temperature</strong><small>Internal device sensor</small></div><div><span>${metrics.temperature}</span></div><div><span>${warningRow ? '54°C' : '41°C'}</span></div><div>${warningRow ? '<span class="badge warning">Check</span>' : '<span class="badge success">Normal</span>'}</div></div>
    </div>`;

  if (tab === 'alerts') return `<div class="section-title-v17"><div><h2>Alerts</h2><p class="muted">Device-level events connected to Alerts, SOP, Tasks and Work Orders.</p></div></div>
    <div class="data-table compact-table device-alert-table-v19"><div class="data-head"><span>Alert</span><span>Severity</span><span>Time</span><span>Status</span><span>Action</span></div>
      <div class="data-row"><div><strong>${warningRow ? 'Low performance / telemetry delay' : 'No active issues'}</strong><small>${device.name}</small></div><div>${warningRow ? '<span class="badge warning">Warning</span>' : '<span class="badge success">Normal</span>'}</div><div><span>${warningRow ? device.lastSeen : 'Now'}</span></div><div><span>${warningRow ? 'Open' : 'Clear'}</span></div><div><button class="small-btn" type="button">${warningRow ? 'Open Alert' : 'View History'}</button></div></div>
      ${warningRow ? '<div class="data-row"><div><strong>String imbalance detected</strong><small>MPPT 3 · String 5</small></div><div><span class="badge warning">Warning</span></div><div><span>23 min ago</span></div><div><span>Open</span></div><div><button class="small-btn" type="button">Open SOP</button></div></div>' : ''}
    </div>`;

  if (tab === 'topology') return `<div class="section-title-v17"><div><h2>Topology</h2><p class="muted">Device position inside the plant hierarchy and nearby related device.</p></div></div>
    <div class="topology-path-v20"><span>Tenant</span><b>→</b><span>${plant.name}</span><b>→</b><span>${device.location}</span><b>→</b><span>${device.name}</span></div>
    <div class="asset-tree-v17"><div>Plant · ${plant.name}</div><ul><li>${device.location}<ul><li>${device.type} · ${device.name}<ul>${isInverter ? '<li>MPPT 1–12</li><li>String groups 1–24</li><li>PV module groups</li><li>Linked meter is plant-level sibling, not inverter child</li>' : `<li>${device.children}</li>`}</ul></li></ul></li></ul></div>
    <div class="section-title-v17 mini"><div><h3>Sibling device in this plant</h3><p class="muted">Meters, weather stations, transformers and BESS are related through Plant, not normally mounted under the inverter.</p></div></div>${deviceSiblingList(device, siblings)}`;

  if (tab === 'mppt') return renderMpptStringsTab(device, warningRow);

  if (tab === 'passport') return `<div class="section-title-v17"><div><h2>Technical Passport</h2><p class="muted">Static master data. This should not be mixed with live telemetry.</p></div></div><div class="info-grid"><div><span>Device ID</span><strong>${device.id}</strong></div><div><span>Serial Number</span><strong>${device.serial}</strong></div><div><span>Vendor</span><strong>${device.vendor}</strong></div><div><span>Model</span><strong>${device.model}</strong></div><div><span>Rated Capacity</span><strong>${device.capacity}</strong></div><div><span>Firmware</span><strong>${device.firmware}</strong></div><div><span>Commissioning</span><strong>${plant.commissioning}</strong></div><div><span>Warranty</span><strong>Active · 2024–2029</strong></div><div><span>Plant</span><strong>${plant.name}</strong></div><div><span>Install Location</span><strong>${device.location}</strong></div></div>`;

  if (tab === 'source') return `<div class="section-title-v17"><div><h2>Source & Sync</h2><p class="muted">Connector lineage and freshness for this source device record.</p></div></div><div class="info-grid"><div><span>Source System</span><strong>${device.vendor === 'Huawei' ? 'Huawei FusionSolar' : device.vendor + ' connector'}</strong></div><div><span>Source Entity ID</span><strong>${device.serial}</strong></div><div><span>Zentrid Device ID</span><strong>${device.id}</strong></div><div><span>Last Seen</span><strong>${device.lastSeen}</strong></div><div><span>Mapping Status</span><strong>Mapped to canonical device</strong></div><div><span>Data Freshness</span><strong>${metrics.freshness}</strong></div><div><span>Raw Payload</span><strong>Available in Data Governance</strong></div><div><span>Capability Flags</span><strong>Telemetry · Alerts · Passport</strong></div></div>`;

  if (tab === 'activity') return `<div class="section-title-v17"><div><h2>Activity</h2><p class="muted">Recent operational and governance timeline for this device.</p></div></div><div class="status-timeline-v20"><div class="chart-card-head-v20"><strong>Status timeline</strong><small>Last 24 hours</small></div><div class="status-steps-v20"><span class="ok">Normal</span><span class="ok">Normal</span><span class="ok">Normal</span><span class="${warningRow ? 'warn' : 'ok'}">${warningRow ? 'Warning' : 'Normal'}</span><span class="${warningRow ? 'warn' : 'ok'}">${warningRow ? 'Warning' : 'Normal'}</span></div></div><div class="timeline-v17"><div><b>Today</b><span>${device.name} telemetry refreshed from source connector</span></div><div><b>Today</b><span>${warningRow ? 'Low performance alert created and linked to MPPT 3' : 'No active alert created during current period'}</span></div><div><b>Yesterday</b><span>Technical passport checked against source connector</span></div><div><b>03 Jun</b><span>Device hierarchy confirmed under ${plant.name}</span></div><div><b>01 Jun</b><span>Firmware version ${device.firmware} verified</span></div></div>`;

  return `<div class="section-title-v17"><div><h2>Inverter Overview</h2><p class="muted">Production-ready inverter detail shell with operational KPI, topology and source traceability.</p></div></div>
    ${inverterMetricCards(device)}
    <div class="device-overview-grid-v19"><article><span>Status</span><strong>${statusBadge}</strong><small>Last seen ${device.lastSeen}</small></article><article><span>Device Type</span><strong>${device.type}</strong><small>${device.vendor} · ${device.model}</small></article><article><span>Parent Plant</span><strong>${plant.name}</strong><small>${plant.code}</small></article><article><span>Traceability</span><strong>${device.location}</strong><small>${device.children}</small></article></div>
    <div class="section-title-v17 mini"><div><h3>Device level rule</h3><p class="muted">For an inverter, real children are MPPT inputs and strings. Meter, weather station, transformer and BESS are sibling plant-level devices unless the electrical design explicitly links them.</p></div></div>`;
}

function mpptRowsV23(device: FleetDeviceRecord): string {
  const warning = device.status === 'Warning';
  return Array.from({ length: 6 }).map((_, i) => {
    const mppt = `MPPT ${i + 1}`;
    const s1 = i * 2 + 1;
    const s2 = i * 2 + 2;
    const warn = warning && i === 2;
    return `<div class="mppt-card-v23">
      <div class="mppt-card-head-v23">
        <div><strong>${mppt}</strong><small>${device.id}-MPPT-${String(i + 1).padStart(2, '0')}</small></div>
        <span class="badge ${warn ? 'warning' : 'success'}">${warn ? 'Warning' : 'Normal'}</span>
      </div>
      <div class="mppt-metrics-v23">
        <div><span>DC Voltage</span><b>${790 + i * 4} V</b></div>
        <div><span>DC Current</span><b>${18 + (i % 4)}.${i} A</b></div>
        <div><span>DC Power</span><b>${Math.round((790 + i * 4) * (18 + (i % 4)) / 1000)} kW</b></div>
        <div><span>Strings</span><b>2</b></div>
      </div>
      <div class="string-list-v23">
        ${[s1, s2].map((num, idx) => {
          const stringId = `String-${String(num).padStart(2, '0')}`;
          const stringWarn = warn && idx === 0;
          return `<button type="button" class="string-pill-v23 ${stringWarn ? 'warning' : ''}" data-open-string="${stringId}" data-parent-mppt="${mppt}">
            <span>${stringId}</span><small>${stringWarn ? 'Current imbalance' : '24 PV modules · Normal'}</small>
          </button>`;
        }).join('')}
      </div>
      <button class="small-btn" type="button" data-open-mppt="${mppt}">Open MPPT Detail</button>
    </div>`;
  }).join('');
}

function renderMpptStringsTab(device: FleetDeviceRecord, warningRow: boolean): string {
  return `<div class="section-title-v17"><div><h2>MPPT / Strings</h2><p class="muted">Inverter-specific electrical hierarchy. MPPT inputs collect string groups, and strings trace down to PV module groups.</p></div></div>
    <div class="mppt-summary-v20"><article><span>MPPT Channels</span><strong>12</strong><small>Inputs monitored</small></article><article><span>String Groups</span><strong>24</strong><small>2 strings per MPPT</small></article><article><span>PV Modules</span><strong>approx. 546</strong><small>Estimated under inverter</small></article><article><span>Imbalance</span><strong>${warningRow ? 'Detected' : 'None'}</strong><small>String current variance</small></article></div>
    <div class="mppt-tree-v23"><div class="mppt-tree-title-v23"><strong>${device.name}</strong><small>Plant → Inverter → MPPT → String → PV Modules</small></div>${mpptRowsV23(device)}</div>
    <div class="data-table compact-table inverter-string-table-v19 inverter-string-table-v23"><div class="data-head"><span>MPPT</span><span>Strings</span><span>DC Voltage</span><span>Current</span><span>Status</span><span>Action</span></div>${Array.from({length:12}).map((_,i)=>`<div class="data-row"><div><strong>MPPT ${i+1}</strong><small>${device.id}-MPPT-${i+1}</small></div><div><strong>String ${i*2+1}–${i*2+2}</strong><small>PV module group</small></div><div><span>${790+i*4} V</span></div><div><span>${18+(i%4)}.${i} A</span></div><div><span class="badge ${i===2 && warningRow ? 'warning' : 'success'}">${i===2 && warningRow ? 'Warning' : 'Normal'}</span></div><div><button class="small-btn" type="button" data-open-mppt="MPPT ${i+1}">Open Detail</button></div></div>`).join('')}</div>`;
}

function ensureStringDrawerShell() {
  let drawer = document.getElementById('stringDetailDrawerV23');
  if (drawer) return drawer;
  drawer = document.createElement('aside');
  drawer.id = 'stringDetailDrawerV23';
  drawer.className = 'detail-drawer string-detail-drawer-v23';
  document.body.appendChild(drawer);
  return drawer;
}

function openMpptDrawer(device: FleetDeviceRecord, mpptName: string): void {
  const idx = parseInt(String(mpptName).replace(/[^0-9]/g, ''), 10) || 1;
  const drawer = ensureStringDrawerShell();
  drawer.innerHTML = `<button class="drawer-close" type="button" aria-label="Close">x</button>
    <div class="drawer-heading-v55"><h2>${mpptName}</h2><p>${device.name} · input channel detail</p></div>
    <div class="drawer-status-row"><span class="badge ${device.status === 'Warning' && idx === 3 ? 'warning' : 'success'}">${device.status === 'Warning' && idx === 3 ? 'Warning' : 'Normal'}</span><span>Last update ${device.lastSeen}</span></div>
    <div class="drawer-metrics rich mppt-drawer-metrics-v23"><div><span>DC Voltage</span><strong>${790 + idx * 4} V</strong></div><div><span>DC Current</span><strong>${18 + (idx % 4)}.${idx} A</strong></div><div><span>DC Power</span><strong>${Math.round((790 + idx * 4) * (18 + (idx % 4)) / 1000)} kW</strong></div><div><span>Connected Strings</span><strong>2</strong></div></div>
    <div class="drawer-body"><strong>MPPT role</strong><p>MPPT collects DC input from connected PV strings and is monitored under the inverter, not as a separate plant-level device.</p></div>
    <div class="drawer-action-grid"><button type="button" data-open-string="String-${String(idx*2-1).padStart(2,'0')}" data-parent-mppt="${mpptName}">Open String ${idx*2-1}</button><button type="button" data-open-string="String-${String(idx*2).padStart(2,'0')}" data-parent-mppt="${mpptName}">Open String ${idx*2}</button></div>`;
  drawer.classList.add('open');
  drawer.querySelector<HTMLElement>('.drawer-close')?.addEventListener('click', () => drawer.classList.remove('open'));
  drawer.querySelectorAll<HTMLElement>('[data-open-string]').forEach(btn => btn.addEventListener('click', () => {
    const stringName = btn.dataset.openString;
    if (stringName) openStringDrawer(device, stringName, btn.dataset.parentMppt || mpptName);
  }));
}

function openStringDrawer(device: FleetDeviceRecord, stringName: string, parentMppt: string): void {
  const n = parseInt(String(stringName).replace(/[^0-9]/g, ''), 10) || 1;
  const warning = device.status === 'Warning' && n === 5;
  const drawer = ensureStringDrawerShell();
  drawer.innerHTML = `<button class="drawer-close" type="button" aria-label="Close">x</button>
    <div class="drawer-heading-v55"><h2>${stringName}</h2><p>${parentMppt} · ${device.name}</p></div>
    <div class="drawer-status-row"><span class="badge ${warning ? 'warning' : 'success'}">${warning ? 'Warning' : 'Normal'}</span><span>Last update ${device.lastSeen}</span></div>
    <div class="drawer-metrics rich string-drawer-metrics-v23"><div><span>Voltage</span><strong>${620 + n * 3} V</strong></div><div><span>Current</span><strong>${warning ? '7.8 A' : (9 + (n % 3)) + '.4 A'}</strong></div><div><span>Power</span><strong>${warning ? '4.8 kW' : (6 + (n % 5)) + '.2 kW'}</strong></div><div><span>PV Modules</span><strong>24</strong></div></div>
    <div class="drawer-body"><strong>Electrical detail</strong><p>${warning ? 'Current is below neighbouring strings. This is a good candidate for inspection or SOP follow-up.' : 'String output is aligned with neighbouring strings in the same MPPT group.'}</p></div>
    <div class="drawer-body"><strong>PV Modules</strong><div class="pv-module-list-v23">${Array.from({length:12}).map((_,i)=>`<span>PV-${String(n).padStart(2,'0')}-${String(i+1).padStart(2,'0')}</span>`).join('')}</div><small class="muted">Showing 12 of 24 modules for prototype readability.</small></div>
    <div class="drawer-body"><strong>Alerts</strong><p>${warning ? 'Low string current · mismatch suspected · open investigation recommended.' : 'No active string-level alerts detected.'}</p></div>
    <div class="drawer-action-grid"><button type="button">View String Telemetry</button><button type="button">Create Inspection Task</button></div>`;
  drawer.classList.add('open');
  drawer.querySelector<HTMLElement>('.drawer-close')?.addEventListener('click', () => drawer.classList.remove('open'));
}

function deviceSiblingList(device: FleetDeviceRecord, siblings: FleetDeviceRecord[]): string {
  const list = siblings.filter(x => x.id !== device.id).slice(0, 5);
  if (!list.length) return `<div class="empty-state"><strong>No sibling device</strong><small>This plant has only one sample device record.</small></div>`;
  return `<div class="device-sibling-grid-v19">${list.map(x => `<article><strong>${x.name}</strong><small>${x.type} · ${x.status}</small></article>`).join('')}</div>`;
}


function createClientBuilderPlant(): void {
  try {
    const client = FleetClientModel.selectedClient();
    const body = document.getElementById('plantBuilderBodyV27');
    const values = Array.from(body?.querySelectorAll('input') || []).map(i => i.value);
    const selected = builderDevices();
    const now = Date.now();
    const plant: FleetPlantRecord = {
      id: `PL-LOCAL-${String(now).slice(-6)}`,
      code: values[1] || `AUTO-PL-${String(now).slice(-4)}`,
      externalId: 'LOCAL-STORAGE',
      name: values[0] || 'New Plant',
      clientId: client.id,
      tenantId: '',
      portfolio: 'Manual Client Portfolio',
      status: 'Draft',
      type: 'Commercial',
      country: values[2] || client.country || 'Armenia',
      region: values[3] || '—',
      city: client.city || '—',
      address: values[4] || client.address || '—',
      timezone: values[5] || 'Asia/Yerevan',
      capacityDc: '0 MWp',
      capacityAc: '0 MW',
      gridCapacity: '0 MW',
      commissioning: '—',
      owner: client.name,
      operator: client.tenant,
      om: client.tenant,
      powerNow: '0 kW',
      energyToday: '0 kWh',
      alerts: 0,
      health: 'Draft',
      panels: 0,
      inverters: selected.filter(x => String(x.kind).includes('Inverter')).length,
      strings: 0,
      transformers: 0,
      meters: selected.filter(x => String(x.kind).includes('Meter')).length,
      battery: selected.some(x => /Battery|BESS/i.test(x.kind)) ? 'Yes' : 'No',
      devices: []
    };
    const devices: FleetDeviceRecord[] = selected.map((x, index) => ({
      id: `DEV-LOCAL-${String(now).slice(-5)}-${index + 1}`,
      plantId: plant.id,
      type: x.kind || 'Device',
      name: `${x.kind || 'Device'} ${index + 1}`,
      vendor: x.vendor || 'Manual',
      manufacturer: x.vendor || 'Manual',
      model: x.model || 'Manual Model',
      serial: `LOCAL-${String(now).slice(-5)}-${index + 1}`,
      capacity: x.rating || '—',
      firmware: '—',
      status: 'Online',
      location: 'Plant level',
      lastSeen: 'Local draft',
      children: x.protocol || 'No child objects yet',
      plant: plant.name,
      tenant: client.tenant,
      integration: 'Manual / Local storage',
      sourceStatus: 'Local draft'
    }));
    plant.devices = devices.map(d => d.id);
    FleetClientModel.plants.push(plant);
    devices.forEach(d => FleetClientModel.devices.push(d));
    if (window.FleetLocalStore) {
      FleetLocalStore.addPlant(plant);
      devices.forEach(d => FleetLocalStore.addDevice(d));
    } else {
      const ps = JSON.parse(localStorage.getItem('zentrid_custom_plants') || '[]'); ps.unshift(plant); localStorage.setItem('zentrid_custom_plants', JSON.stringify(ps));
      const ds = JSON.parse(localStorage.getItem('zentrid_custom_devices') || '[]'); localStorage.setItem('zentrid_custom_devices', JSON.stringify([...devices, ...ds]));
    }
    FleetClientModel.selectPlant(plant.id);
    FleetLayout.toast('Plant created and saved locally');
    setTimeout(() => location.href = FleetLayout.pathFor('plant-detail'), 400);
  } catch (err) {
    console.error(err);
    FleetLayout.toast('Unable to save plant locally');
  }
}
