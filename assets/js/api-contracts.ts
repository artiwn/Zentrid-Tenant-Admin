/* Zentrid API contract and mapping layer.
   Backend DTO compatibility belongs here; page renderers consume normalized view models. */
(function () {
  type ContractRecord = Record<string, FleetLegacyCompat>;

  interface FleetApiBaseDto extends ContractRecord {
    id?: unknown;
    status?: unknown;
    provider?: unknown;
    vendorExtensions?: ContractRecord;
  }

  interface FleetClientDto extends FleetApiBaseDto { plants?: unknown[]; }
  interface FleetTenantDto extends FleetApiBaseDto {}
  interface FleetPlantDto extends FleetApiBaseDto {
    sourcePlantId?: unknown;
    currentPowerKw?: unknown;
    installedPowerKw?: unknown;
    todayEnergyKwh?: unknown;
    totalEnergyKwh?: unknown;
    lastDataAt?: unknown;
    dataQualityStatus?: unknown;
  }
  interface FleetDeviceDto extends FleetApiBaseDto {
    sourceDeviceId?: unknown;
    sourcePlantId?: unknown;
    serialNumber?: unknown;
    lastSeenAt?: unknown;
    dataQualityStatus?: unknown;
  }
  interface FleetAlertDto extends FleetApiBaseDto {
    sourceAlertId?: unknown;
    sourcePlantId?: unknown;
    sourceDeviceId?: unknown;
    title?: unknown;
    message?: unknown;
    severity?: unknown;
    occurredAtUtc?: unknown;
    lastSyncAt?: unknown;
  }
  interface FleetIntegrationDto extends FleetApiBaseDto {
    providerType?: unknown;
    vendor?: unknown;
    displayName?: unknown;
    name?: unknown;
    integrationName?: unknown;
    plantsCount?: unknown;
    plantCount?: unknown;
    plants?: unknown;
    devicesCount?: unknown;
    deviceCount?: unknown;
    devices?: unknown;
    alertsCount?: unknown;
    alertCount?: unknown;
    alerts?: unknown;
    plantsWithDataCount?: unknown;
    lastSyncText?: unknown;
    lastSyncAtUtc?: unknown;
    lastErrorMessage?: unknown;
  }

  type FleetContractMapperContext = {
    safeText(value: unknown, fallback?: unknown): string;
    firstOf(row: ContractRecord, keys: string[], fallback?: unknown): unknown;
    displayName(row: ContractRecord, keys: string[], entityLabel: string, index: number, typeHint?: unknown): string;
    formatDate(value: unknown, fallback?: string): string;
    integrationVendor(value: unknown): string;
    integrationSoftware(value: unknown): string;
  };

  type FleetContractEntity = 'clients' | 'plants' | 'devices' | 'alerts' | 'integrations';
  type FleetContractSeverity = 'error' | 'warning';
  type FleetContractExpectedType = 'scalar' | 'number';
  type FleetContractIssueCode = 'INVALID_RECORD' | 'MISSING_REQUIRED_FIELD' | 'INVALID_FIELD_TYPE';

  type FleetContractIssue = {
    entity: FleetContractEntity;
    entityLabel: string;
    index: number;
    severity: FleetContractSeverity;
    code: FleetContractIssueCode;
    field: string;
    aliases: string[];
    message: string;
  };

  type FleetContractValidation = {
    entity: FleetContractEntity;
    valid: boolean;
    issues: FleetContractIssue[];
  };

  type FleetContractRequirement = {
    field: string;
    aliases: string[];
    severity: FleetContractSeverity;
    expected: FleetContractExpectedType;
  };

  type FleetContractDefinition = {
    entity: FleetContractEntity;
    label: string;
    requirements: FleetContractRequirement[];
    optionalNumbers?: string[];
  };

  type FleetContractDiagnosticSummary = {
    total: number;
    errors: number;
    warnings: number;
    affectedEntities: FleetContractEntity[];
  };


  type FleetFieldFormat = 'identifier' | 'text' | 'status' | 'date' | 'count' | 'email' | 'phone' | 'relation' | 'power' | 'energy' | 'boolean' | 'raw';

  type FleetFieldMappingDefinition = {
    canonicalField: string;
    aliases: string[];
    uiTargets: string[];
    format: FleetFieldFormat;
    fallback: string;
    required?: FleetContractSeverity;
  };

  type FleetFieldAuditRecord = {
    entity: FleetContractEntity;
    index: number;
    mappedFields: string[];
    fallbackFields: string[];
    missingExpectedFields: string[];
    unmappedFields: string[];
    sourceByCanonical: Record<string, string>;
    rawFieldCount: number;
  };

  type FleetFieldAuditEntitySummary = {
    entity: FleetContractEntity;
    records: number;
    rawFields: number;
    mappedFields: number;
    fallbackFields: number;
    missingExpectedFields: number;
    unmappedFields: number;
  };

  type FleetFieldAuditSummary = {
    records: number;
    rawFields: number;
    mappedFields: number;
    fallbackFields: number;
    missingExpectedFields: number;
    unmappedFields: number;
    affectedEntities: FleetContractEntity[];
    byEntity: FleetFieldAuditEntitySummary[];
  };

  type FleetEntityContract<TDto extends FleetApiBaseDto> = {
    parse(value: unknown): TDto | null;
    validate(value: unknown, index?: number): FleetContractValidation;
    map(value: unknown, index: number, context: FleetContractMapperContext): ContractRecord;
    mapList(values: unknown[], context: FleetContractMapperContext): ContractRecord[];
  };

  function isRecord(value: unknown): value is ContractRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function parseDto<TDto extends FleetApiBaseDto>(value: unknown): TDto | null {
    return isRecord(value) ? value as TDto : null;
  }

  function pathValue(row: ContractRecord, path: string): unknown {
    let current: unknown = row;
    for (const part of path.split('.')) {
      if (!isRecord(current) || !(part in current)) return undefined;
      current = current[part];
    }
    return current;
  }

  function firstAlias(row: ContractRecord, aliases: string[]): { alias: string; value: unknown } | null {
    for (const alias of aliases) {
      const value = pathValue(row, alias);
      if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) return { alias, value };
    }
    return null;
  }

  function matchesExpectedType(value: unknown, expected: FleetContractExpectedType): boolean {
    if (expected === 'number') {
      if (typeof value === 'number') return Number.isFinite(value);
      return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
    }
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  const diagnosticIssues: FleetContractIssue[] = [];
  const diagnosticFingerprints = new Set<string>();

  const diagnostics = {
    clear(entity?: FleetContractEntity): void {
      if (!entity) {
        diagnosticIssues.splice(0, diagnosticIssues.length);
        diagnosticFingerprints.clear();
        return;
      }
      for (let index = diagnosticIssues.length - 1; index >= 0; index -= 1) {
        if (diagnosticIssues[index]!.entity === entity) diagnosticIssues.splice(index, 1);
      }
      diagnosticFingerprints.clear();
      diagnosticIssues.forEach(issue => diagnosticFingerprints.add(`${issue.entity}|${issue.index}|${issue.code}|${issue.field}|${issue.message}`));
    },
    report(issues: FleetContractIssue[]): void {
      issues.forEach(issue => {
        const fingerprint = `${issue.entity}|${issue.index}|${issue.code}|${issue.field}|${issue.message}`;
        if (diagnosticFingerprints.has(fingerprint)) return;
        diagnosticFingerprints.add(fingerprint);
        diagnosticIssues.push(issue);
      });
    },
    list(entity?: FleetContractEntity): FleetContractIssue[] {
      return diagnosticIssues.filter(issue => !entity || issue.entity === entity).map(issue => ({ ...issue, aliases: [...issue.aliases] }));
    },
    summary(entity?: FleetContractEntity): FleetContractDiagnosticSummary {
      const issues = diagnosticIssues.filter(issue => !entity || issue.entity === entity);
      return {
        total: issues.length,
        errors: issues.filter(issue => issue.severity === 'error').length,
        warnings: issues.filter(issue => issue.severity === 'warning').length,
        affectedEntities: Array.from(new Set(issues.map(issue => issue.entity)))
      };
    }
  };

  function validateContract(value: unknown, index: number, definition: FleetContractDefinition): FleetContractValidation {
    if (!isRecord(value)) {
      return {
        entity: definition.entity,
        valid: false,
        issues: [{
          entity: definition.entity,
          entityLabel: definition.label,
          index,
          severity: 'error',
          code: 'INVALID_RECORD',
          field: 'record',
          aliases: [],
          message: `${definition.label} record must be a JSON object.`
        }]
      };
    }

    const issues: FleetContractIssue[] = [];
    definition.requirements.forEach(requirement => {
      const matched = firstAlias(value, requirement.aliases);
      if (!matched) {
        issues.push({
          entity: definition.entity,
          entityLabel: definition.label,
          index,
          severity: requirement.severity,
          code: 'MISSING_REQUIRED_FIELD',
          field: requirement.field,
          aliases: [...requirement.aliases],
          message: `${definition.label} record is missing ${requirement.field}. Accepted fields: ${requirement.aliases.join(', ')}.`
        });
        return;
      }
      if (!matchesExpectedType(matched.value, requirement.expected)) {
        issues.push({
          entity: definition.entity,
          entityLabel: definition.label,
          index,
          severity: requirement.severity,
          code: 'INVALID_FIELD_TYPE',
          field: requirement.field,
          aliases: [...requirement.aliases],
          message: `${definition.label} field ${matched.alias} must be ${requirement.expected === 'number' ? 'numeric' : 'a scalar value'}.`
        });
      }
    });

    (definition.optionalNumbers || []).forEach(field => {
      const valueAtPath = pathValue(value, field);
      if (valueAtPath === undefined || valueAtPath === null || valueAtPath === '') return;
      if (!matchesExpectedType(valueAtPath, 'number')) {
        issues.push({
          entity: definition.entity,
          entityLabel: definition.label,
          index,
          severity: 'warning',
          code: 'INVALID_FIELD_TYPE',
          field,
          aliases: [field],
          message: `${definition.label} field ${field} should be numeric when provided.`
        });
      }
    });

    return { entity: definition.entity, valid: !issues.some(issue => issue.severity === 'error'), issues };
  }

  function createContract<TDto extends FleetApiBaseDto>(definition: FleetContractDefinition, mapper: (dto: TDto, index: number, context: FleetContractMapperContext) => ContractRecord): FleetEntityContract<TDto> {
    return {
      parse: parseDto<TDto>,
      validate(value, index = 0) {
        return validateContract(value, index, definition);
      },
      map(value, index, context) {
        const dto = parseDto<TDto>(value);
        const validation = validateContract(value, index, definition);
        diagnostics.report(validation.issues);
        const mappingAudit = auditFieldMapping(definition.entity, value, index);
        const mapped = mapper(dto || {} as TDto, index, context);
        mapped.contractEntity = definition.entity;
        mapped.contractValid = validation.valid;
        mapped.contractIssues = validation.issues;
        mapped.fieldAudit = mappingAudit;
        return mapped;
      },
      mapList(values, context) {
        diagnostics.clear(definition.entity);
        fieldAudit.clear(definition.entity);
        return (Array.isArray(values) ? values : []).map((value, index) => this.map(value, index, context));
      }
    };
  }

  function requirement(field: string, aliases: string[], severity: FleetContractSeverity = 'error', expected: FleetContractExpectedType = 'scalar'): FleetContractRequirement {
    return { field, aliases, severity, expected };
  }

  const CONTRACT_DEFINITIONS: Record<FleetContractEntity, FleetContractDefinition> = {
    clients: {
      entity: 'clients', label: 'Client',
      requirements: [
        requirement('identity', ['id', 'clientId', 'canonicalId', 'sourceEntityId', 'externalId'], 'warning'),
        requirement('display name', ['vendorExtensions.clientName', 'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name'])
      ],
      optionalNumbers: ['plantCount', 'plantsCount', 'assignedPlantCount', 'deviceCount', 'devicesCount']
    },
    plants: {
      entity: 'plants', label: 'Plant',
      requirements: [
        requirement('identity', ['id', 'plantId', 'canonicalId', 'sourcePlantId']),
        requirement('display name', ['vendorExtensions.plantName', 'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'name']),
        requirement('provider', ['provider', 'sourceScheme', 'adminRecord.sourceScheme'], 'warning')
      ],
      optionalNumbers: ['currentPowerKw', 'installedPowerKw', 'todayEnergyKwh', 'totalEnergyKwh']
    },
    devices: {
      entity: 'devices', label: 'Device',
      requirements: [
        requirement('identity', ['id', 'deviceId', 'canonicalId', 'sourceDeviceId', 'serialNumber']),
        requirement('display name', ['vendorExtensions.deviceName', 'sourceDeviceName', 'deviceName', 'equipmentName', 'displayName', 'sourceEntityName', 'name']),
        requirement('provider', ['provider'], 'warning'),
        requirement('plant relation', ['sourcePlantId', 'plantId'], 'warning')
      ]
    },
    alerts: {
      entity: 'alerts', label: 'Alert',
      requirements: [
        requirement('identity', ['id', 'alertId', 'sourceAlertId']),
        requirement('display text', ['vendorExtensions.alertName', 'sourceAlertName', 'alertName', 'title', 'message', 'name']),
        requirement('severity', ['severity'], 'warning'),
        requirement('provider', ['provider'], 'warning')
      ]
    },
    integrations: {
      entity: 'integrations', label: 'Integration',
      requirements: [
        requirement('provider', ['provider', 'providerType', 'vendor', 'providerName', 'vendorName', 'producerVendorTemplate'], 'error'),
        requirement('display name', ['displayName', 'name', 'integrationName'], 'warning'),
        requirement('status', ['status', 'integrationStatus'], 'warning')
      ],
      optionalNumbers: ['plantsCount', 'plantCount', 'plants', 'devicesCount', 'deviceCount', 'devices', 'alertsCount', 'alertCount', 'alerts', 'plantsWithDataCount']
    }
  };

  function field(canonicalField: string, aliases: string[], uiTargets: string[], format: FleetFieldFormat, fallback = '—', required?: FleetContractSeverity): FleetFieldMappingDefinition {
    return { canonicalField, aliases, uiTargets, format, fallback, ...(required ? { required } : {}) };
  }

  const FIELD_MAPPING_MANIFEST: Record<FleetContractEntity, FleetFieldMappingDefinition[]> = {
    clients: [
      field('id', ['id', 'clientId', 'canonicalId', 'sourceEntityId', 'externalId'], ['Client Registry row ID', 'Client Detail identity'], 'identifier', 'Generated live ID', 'warning'),
      field('code', ['clientCode', 'code', 'externalId'], ['Client Registry code', 'Client Detail code'], 'identifier', 'ID'),
      field('name', ['vendorExtensions.clientName', 'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name'], ['Client Registry name', 'Client Detail heading'], 'text', 'Client N', 'error'),
      field('managingTenant', ['managingTenant', 'tenant', 'tenantName', 'organizationName'], ['Client Registry tenant', 'Client Detail tenant'], 'relation', 'Backend Live API'),
      field('clientType', ['clientType', 'type', 'entityType'], ['Client Registry type', 'Client Detail identity'], 'text', 'Legal Entity'),
      field('accountActivation', ['accountActivation', 'status', 'accountStatus', 'lifecycleStatus'], ['Client Registry status', 'Client Detail status'], 'status', 'Active'),
      field('country', ['country', 'address.country'], ['Client Registry location', 'Client Detail location'], 'text', '—'),
      field('region', ['region', 'address.region'], ['Client Detail location'], 'text', '—'),
      field('city', ['city', 'address.city'], ['Client Registry city', 'Client Detail location'], 'text', '—'),
      field('address', ['address', 'detailedAddress', 'addressLine'], ['Client Detail address'], 'text', '—'),
      field('email', ['email', 'contactEmail', 'contact.email'], ['Client Registry contact', 'Client Detail contacts'], 'email', '—'),
      field('phoneNumber1', ['phoneNumber1', 'contactPhone', 'phone1', 'phone', 'contact.phone'], ['Client Detail primary phone'], 'phone', '—'),
      field('phoneNumber2', ['phoneNumber2', 'phone2', 'secondaryPhone'], ['Client Detail secondary phone'], 'phone', ''),
      field('username', ['username', 'portalUsername'], ['Client Detail portal access'], 'identifier', ''),
      field('documents', ['hasClientPassportFile', 'hasStateRegistrationDocumentFile', 'hasProjectDocFile', 'documents', 'documentCount'], ['Client Detail documents KPI'], 'boolean', '0'),
      field('createdAt', ['createdAtUtc'], ['Client Detail source/freshness'], 'date', 'No backend timestamp'),
      field('updatedAt', ['updatedAtUtc'], ['Client Registry updated', 'Client Detail source/freshness'], 'date', 'createdAtUtc'),
      field('plants', ['plants', 'plantCount', 'plantsCount', 'assignedPlantCount'], ['Client Registry plants', 'Client Detail assigned plants'], 'count', '0'),
      field('devices', ['deviceCount', 'devicesCount'], ['Client Registry devices'], 'count', '0')
    ],
    plants: [
      field('id', ['id', 'plantId', 'canonicalId', 'adminRecord.id'], ['Plant Registry row ID', 'Plant Detail identity'], 'identifier', 'Generated live ID', 'error'),
      field('plantCode', ['plantCode', 'sourcePlantId', 'code', 'adminRecord.plantCode', 'vendorExtensions.plantCode'], ['Plant Registry code', 'Plant Detail code'], 'identifier', 'Generated code'),
      field('plantName', ['adminName', 'liveName', 'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'sourceEntityName', 'name', 'adminRecord.plantName', 'liveRecord.plantName'], ['Plant Registry name', 'Plant Detail heading'], 'text', 'Plant N', 'error'),
      field('provider', ['provider', 'sourceScheme', 'adminRecord.sourceScheme'], ['Plant Registry provider', 'Plant Detail source'], 'text', 'Backend', 'warning'),
      field('clientId', ['clientId', 'adminRecord.clientId'], ['Plant Detail client relation'], 'relation', ''),
      field('client', ['client', 'clientName', 'adminRecord.client'], ['Plant Registry owner', 'Plant Detail client'], 'relation', '—'),
      field('managingTenant', ['managingTenant', 'tenantName', 'tenant', 'adminRecord.managingTenant'], ['Plant Registry tenant', 'Plant Detail operator'], 'relation', 'Backend Live API'),
      field('recordStatus', ['recordStatus', 'status', 'adminRecord.recordStatus'], ['Plant Registry status', 'Plant Detail lifecycle'], 'status', 'Unknown'),
      field('plantType', ['plantType', 'type', 'adminRecord.plantType'], ['Plant Registry type', 'Plant Detail type'], 'text', 'Solar Plant'),
      field('countryRegion', ['countryRegion', 'country', 'vendorExtensions.country', 'adminRecord.countryRegion'], ['Plant Registry country', 'Plant Detail location'], 'text', '—'),
      field('region', ['region', 'vendorExtensions.region', 'adminRecord.region'], ['Plant Detail location'], 'text', '—'),
      field('city', ['city', 'vendorExtensions.city', 'adminRecord.city'], ['Plant Detail location'], 'text', '—'),
      field('plantTimeZone', ['plantTimeZone', 'timezone', 'vendorExtensions.timezone', 'adminRecord.plantTimeZone'], ['Plant Detail timezone'], 'text', '—'),
      field('devicesCount', ['devicesCount', 'vendorExtensions.devicesCount', 'adminRecord.devicesCount', 'vendorExtensions.onlineDeviceCount'], ['Plant Registry devices', 'Plant Detail devices KPI'], 'count', '0'),
      field('alertsCount', ['vendorExtensions.alertsCount', 'vendorExtensions.alarmCount'], ['Plant Registry alerts', 'Plant Detail alerts KPI'], 'count', '0'),
      field('currentPowerKw', ['currentPowerKw'], ['Plant Registry live power', 'Plant Detail telemetry'], 'power', '0 kW'),
      field('installedPowerKw', ['installedPowerKw'], ['Plant Detail installed capacity'], 'power', '0'),
      field('todayEnergyKwh', ['todayEnergyKwh'], ['Plant Registry today energy', 'Plant Detail telemetry'], 'energy', '0 kWh'),
      field('totalEnergyKwh', ['totalEnergyKwh'], ['Plant Detail lifetime energy'], 'energy', '—'),
      field('lastDataAt', ['lastDataAt', 'lastSyncAt'], ['Plant Registry freshness', 'Plant Detail telemetry freshness'], 'date', 'No live data'),
      field('dataQualityStatus', ['dataQualityStatus', 'vendorExtensions.dataFreshness'], ['Plant Registry quality', 'Plant Detail freshness'], 'status', 'Unknown'),
      field('batteryCapacityKwh', ['vendorExtensions.batteryCapacityKwh'], ['Plant Detail storage metadata'], 'energy', '—'),
      field('monthlyYieldKwh', ['vendorExtensions.monthlyYieldKwh'], ['Plant Detail telemetry metadata'], 'energy', '—'),
      field('yearlyYieldKwh', ['vendorExtensions.yearlyYieldKwh'], ['Plant Detail telemetry metadata'], 'energy', '—'),
      field('warningCount', ['vendorExtensions.warningCount'], ['Plant Detail alert metadata'], 'count', '0'),
      field('offlineDeviceCount', ['vendorExtensions.offlineDeviceCount'], ['Plant Detail device metadata'], 'count', '0'),
      field('createdAt', ['createdAtUtc', 'adminRecord.createdAtUtc'], ['Plant Detail source/freshness'], 'date', '—'),
      field('updatedAt', ['updatedAtUtc', 'adminRecord.updatedAtUtc'], ['Plant Registry updated', 'Plant Detail source/freshness'], 'date', 'createdAtUtc'),
      field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.sourceSystem', 'vendorExtensions.sourceEntityType', 'vendorExtensions.communicationStatus', 'vendorExtensions.canonicalSource'], ['Raw payload diagnostics'], 'raw', '')
    ],
    devices: [
      field('id', ['id', 'deviceId', 'canonicalId'], ['Device Registry row ID', 'Device Detail identity'], 'identifier', 'Generated live ID', 'error'),
      field('provider', ['provider', 'vendorExtensions.provider'], ['Device Registry provider', 'Device Detail source'], 'text', 'Backend', 'warning'),
      field('sourceDeviceId', ['sourceDeviceId', 'deviceId', 'serialNumber'], ['Device Registry code', 'Device Detail external ID'], 'identifier', '—', 'error'),
      field('sourcePlantId', ['sourcePlantId', 'plantId', 'vendorExtensions.sourcePlantId'], ['Device Registry plant relation', 'Device Detail plant'], 'relation', '—', 'warning'),
      field('deviceName', ['vendorExtensions.deviceName', 'sourceDeviceName', 'deviceName', 'equipmentName', 'displayName', 'sourceEntityName', 'name'], ['Device Registry name', 'Device Detail heading'], 'text', 'Device N', 'error'),
      field('deviceType', ['deviceType', 'vendorExtensions.deviceType', 'vendorExtensions.rawDeviceType', 'type'], ['Device Registry type', 'Device Detail type'], 'text', 'Device'),
      field('status', ['status', 'vendorExtensions.onlineStatus', 'vendorExtensions.rawStatus'], ['Device Registry status', 'Device Detail status'], 'status', 'Unknown'),
      field('serialNumber', ['serialNumber'], ['Device Registry serial', 'Device Detail serial'], 'identifier', '—'),
      field('plantName', ['plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName'], ['Device Registry plant', 'Device Detail plant'], 'relation', 'Unknown Plant'),
      field('lastSeenAt', ['lastSeenAt'], ['Device Registry last seen', 'Device Detail freshness'], 'date', 'No live data'),
      field('lastSyncAt', ['lastSyncAt'], ['Device Detail sync metadata'], 'date', 'No sync'),
      field('dataQualityStatus', ['dataQualityStatus', 'vendorExtensions.dataFreshness'], ['Device Registry data quality', 'Device Detail source status'], 'status', 'Unknown'),
      field('alarmStatus', ['vendorExtensions.alarmStatus', 'alarmStatus'], ['Device Detail alarm state'], 'status', 'Unknown'),
      field('vendorModel', ['vendorExtensions.vendorModel', 'vendorExtensions.model', 'model'], ['Device Registry model', 'Device Detail model'], 'text', '—'),
      field('productModel', ['vendorExtensions.productModel'], ['Device Detail product model'], 'text', '—'),
      field('ratedPowerKw', ['vendorExtensions.ratedPowerKw', 'ratedPowerKw'], ['Device Registry capacity', 'Device Detail rated power'], 'power', '—'),
      field('firmwareVersion', ['vendorExtensions.firmwareVersion', 'vendorExtensions.firmware', 'firmwareVersion'], ['Device Registry firmware', 'Device Detail firmware'], 'text', '—'),
      field('protocolVersion', ['vendorExtensions.protocolVersion'], ['Device Detail protocol'], 'text', '—'),
      field('parentDeviceId', ['vendorExtensions.parentDeviceId', 'parentDeviceId'], ['Device Detail topology'], 'relation', '—'),
      field('sourceSystem', ['vendorExtensions.sourceSystem', 'sourceSystem'], ['Device Detail source'], 'text', 'Provider'),
      field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.sourceEntityType', 'vendorExtensions.canonicalSource'], ['Raw payload diagnostics'], 'raw', '')
    ],
    alerts: [
      field('id', ['id', 'alertId'], ['Alert Registry row ID', 'Alert Detail identity'], 'identifier', 'Generated live ID', 'error'),
      field('provider', ['provider'], ['Alert Registry provider', 'Alert Detail source'], 'text', 'Backend', 'warning'),
      field('sourceAlertId', ['sourceAlertId', 'vendorExtensions.alarmCode'], ['Alert Registry vendor code', 'Alert Detail source code'], 'identifier', '—', 'error'),
      field('sourcePlantId', ['sourcePlantId'], ['Alert Registry plant relation', 'Alert Detail plant'], 'relation', '—'),
      field('sourceDeviceId', ['sourceDeviceId', 'vendorExtensions.deviceSn'], ['Alert Registry device relation', 'Alert Detail device'], 'relation', '—'),
      field('plantName', ['plantName', 'sourcePlantName', 'vendorExtensions.plantName'], ['Alert Registry plant', 'Alert Detail plant'], 'relation', 'Unknown Plant'),
      field('deviceName', ['deviceName', 'vendorExtensions.deviceName'], ['Alert Registry device', 'Alert Detail device'], 'relation', 'Unknown Device'),
      field('title', ['title', 'vendorExtensions.alertName', 'sourceAlertName', 'alertName', 'name'], ['Alert Registry title', 'Alert Detail heading'], 'text', 'Live backend alert', 'error'),
      field('message', ['message'], ['Alert Registry message', 'Alert Detail description'], 'text', '—'),
      field('severity', ['severity'], ['Alert Registry severity', 'Alert Detail severity'], 'status', 'Unknown', 'warning'),
      field('status', ['status'], ['Alert Registry status', 'Alert Detail status'], 'status', 'Open'),
      field('occurredAtUtc', ['occurredAtUtc'], ['Alert Registry occurred', 'Alert Detail timeline'], 'date', 'No occurrence time'),
      field('lastSyncAt', ['lastSyncAt'], ['Alert Registry updated', 'Alert Detail timeline'], 'date', 'No sync'),
      field('alarmType', ['vendorExtensions.alarmType', 'vendorExtensions.category'], ['Alert Registry category', 'Alert Detail category'], 'text', 'Backend Live API'),
      field('reason', ['vendorExtensions.reason', 'vendorExtensions.probableCause'], ['Alert Detail probable cause'], 'text', 'No backend probable cause'),
      field('solution', ['vendorExtensions.solution', 'vendorExtensions.recommendation'], ['Alert Detail recommendation'], 'text', 'Review source data'),
      field('acknowledgedAtUtc', ['vendorExtensions.acknowledgedAtUtc'], ['Alert Detail timeline metadata'], 'date', '—'),
      field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.canonicalSource'], ['Raw payload diagnostics'], 'raw', '')
    ],
    integrations: [
      field('id', ['id', 'integrationId'], ['Integration Registry row ID', 'Integration Detail identity'], 'identifier', 'Provider-derived live ID'),
      field('integrationCode', ['integrationCode', 'code'], ['Integration Registry code', 'Integration Detail code'], 'identifier', 'Generated live code'),
      field('integrationName', ['integrationName', 'displayName', 'name'], ['Integration Registry name', 'Integration Detail heading'], 'text', 'Provider', 'warning'),
      field('provider', ['provider', 'providerType', 'providerName', 'vendorName', 'vendor', 'producerVendorTemplate'], ['Integration Registry provider', 'Integration Detail vendor'], 'text', 'Unknown', 'error'),
      field('producerVendorTemplate', ['producerVendorTemplate'], ['Integration Detail template'], 'text', '—'),
      field('integrationStatus', ['integrationStatus', 'status'], ['Integration Registry status', 'Integration Detail lifecycle'], 'status', 'Unknown', 'warning'),
      field('plantsCount', ['plantsCount', 'plantCount', 'plants', 'vendorExtensions.plantsCount'], ['Integration Registry plants KPI', 'Integration Detail discovery'], 'count', '0'),
      field('plantsWithDataCount', ['plantsWithDataCount', 'vendorExtensions.plantsWithDataCount'], ['Integration operational coverage'], 'count', '0'),
      field('plantsWithoutDataCount', ['plantsWithoutDataCount', 'vendorExtensions.plantsWithoutDataCount'], ['Integration operational coverage'], 'count', '0'),
      field('stalePlantsCount', ['stalePlantsCount', 'vendorExtensions.stalePlantsCount'], ['Integration operational health'], 'count', '0'),
      field('devicesCount', ['devicesCount', 'deviceCount', 'devices', 'vendorExtensions.devicesCount'], ['Integration Registry devices KPI', 'Integration Detail discovery'], 'count', '0'),
      field('alertsCount', ['alertsCount', 'alertCount', 'alerts', 'vendorExtensions.activeAlertsCount'], ['Integration Registry alerts KPI', 'Integration Detail discovery'], 'count', '0'),
      field('errorRatePct', ['errorRatePct'], ['Integration operational health'], 'count', '0'),
      field('lastSyncAtUtc', ['lastSyncAtUtc'], ['Integration Registry last sync', 'Integration Detail freshness'], 'date', 'No sync'),
      field('lastSyncText', ['lastSyncText'], ['Integration Registry last activity'], 'text', 'No data'),
      field('lastErrorMessage', ['lastErrorMessage'], ['Integration Detail last error'], 'text', ''),
      field('createdAtUtc', ['createdAtUtc'], ['Integration Detail created'], 'date', '—'),
      field('updatedAtUtc', ['updatedAtUtc'], ['Integration Detail updated'], 'date', 'createdAtUtc'),
      field('sourceMetadata', ['vendorExtensions.provider', 'vendorExtensions.displayName'], ['Raw payload diagnostics'], 'raw', '')
    ]
  };

  const fieldAuditRecords = new Map<string, FleetFieldAuditRecord>();

  function flattenLeafPaths(value: unknown, prefix = '', output: string[] = []): string[] {
    if (!isRecord(value)) return output;
    Object.entries(value).forEach(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isRecord(child)) flattenLeafPaths(child, path, output);
      else output.push(path);
    });
    return output;
  }

  function aliasCoversPath(alias: string, path: string): boolean {
    return alias === path || path.startsWith(`${alias}.`) || alias.startsWith(`${path}.`);
  }

  function auditFieldMapping(entity: FleetContractEntity, value: unknown, index: number): FleetFieldAuditRecord {
    const row = isRecord(value) ? value : {};
    const definitions = FIELD_MAPPING_MANIFEST[entity];
    const rawFields = flattenLeafPaths(row);
    const sourceByCanonical: Record<string, string> = {};
    const mappedFields: string[] = [];
    const fallbackFields: string[] = [];
    const missingExpectedFields: string[] = [];

    definitions.forEach(definition => {
      const matched = firstAlias(row, definition.aliases);
      if (matched) {
        mappedFields.push(definition.canonicalField);
        sourceByCanonical[definition.canonicalField] = matched.alias;
      } else {
        if (definition.fallback !== '') fallbackFields.push(definition.canonicalField);
        if (definition.required) missingExpectedFields.push(definition.canonicalField);
      }
    });

    const knownAliases = definitions.flatMap(definition => definition.aliases);
    const unmappedFields = rawFields.filter(path => !knownAliases.some(alias => aliasCoversPath(alias, path)));
    const record: FleetFieldAuditRecord = {
      entity,
      index,
      mappedFields,
      fallbackFields,
      missingExpectedFields,
      unmappedFields,
      sourceByCanonical,
      rawFieldCount: rawFields.length
    };
    fieldAuditRecords.set(`${entity}|${index}`, record);
    return record;
  }

  const fieldAudit = {
    clear(entity?: FleetContractEntity): void {
      if (!entity) {
        fieldAuditRecords.clear();
        return;
      }
      [...fieldAuditRecords.keys()].forEach(key => {
        if (key.startsWith(`${entity}|`)) fieldAuditRecords.delete(key);
      });
    },
    manifest(entity?: FleetContractEntity): Record<FleetContractEntity, FleetFieldMappingDefinition[]> | FleetFieldMappingDefinition[] {
      if (entity) return FIELD_MAPPING_MANIFEST[entity].map(item => ({ ...item, aliases: [...item.aliases], uiTargets: [...item.uiTargets] }));
      return Object.fromEntries((Object.keys(FIELD_MAPPING_MANIFEST) as FleetContractEntity[]).map(name => [name, FIELD_MAPPING_MANIFEST[name].map(item => ({ ...item, aliases: [...item.aliases], uiTargets: [...item.uiTargets] }))])) as Record<FleetContractEntity, FleetFieldMappingDefinition[]>;
    },
    list(entity?: FleetContractEntity): FleetFieldAuditRecord[] {
      return [...fieldAuditRecords.values()]
        .filter(record => !entity || record.entity === entity)
        .map(record => ({
          ...record,
          mappedFields: [...record.mappedFields],
          fallbackFields: [...record.fallbackFields],
          missingExpectedFields: [...record.missingExpectedFields],
          unmappedFields: [...record.unmappedFields],
          sourceByCanonical: { ...record.sourceByCanonical }
        }));
    },
    summary(entity?: FleetContractEntity): FleetFieldAuditSummary {
      const records = [...fieldAuditRecords.values()].filter(record => !entity || record.entity === entity);
      const entities = [...new Set(records.map(record => record.entity))];
      const byEntity = entities.map(name => {
        const scoped = records.filter(record => record.entity === name);
        return {
          entity: name,
          records: scoped.length,
          rawFields: scoped.reduce((sum, record) => sum + record.rawFieldCount, 0),
          mappedFields: scoped.reduce((sum, record) => sum + record.mappedFields.length, 0),
          fallbackFields: scoped.reduce((sum, record) => sum + record.fallbackFields.length, 0),
          missingExpectedFields: scoped.reduce((sum, record) => sum + record.missingExpectedFields.length, 0),
          unmappedFields: scoped.reduce((sum, record) => sum + record.unmappedFields.length, 0)
        };
      });
      return {
        records: records.length,
        rawFields: byEntity.reduce((sum, item) => sum + item.rawFields, 0),
        mappedFields: byEntity.reduce((sum, item) => sum + item.mappedFields, 0),
        fallbackFields: byEntity.reduce((sum, item) => sum + item.fallbackFields, 0),
        missingExpectedFields: byEntity.reduce((sum, item) => sum + item.missingExpectedFields, 0),
        unmappedFields: byEntity.reduce((sum, item) => sum + item.unmappedFields, 0),
        affectedEntities: entities,
        byEntity
      };
    }
  };

  function normalizedId(row: ContractRecord, fallback: string, context: FleetContractMapperContext): string {
    return context.safeText(context.firstOf(row, [
      'id', 'tenantId', 'clientId', 'plantId', 'deviceId', 'integrationId',
      'canonicalId', 'sourceEntityId', 'sourcePlantId', 'sourceDeviceId', 'sourceAlertId'
    ]), fallback);
  }

  const clients = createContract<FleetClientDto>(CONTRACT_DEFINITIONS.clients, (row, index, context) => {
    const id = normalizedId(row, `LIVE-CLIENT-${index + 1}`, context);
    const name = context.displayName(row, [
      'vendorExtensions.clientName', 'vendorExtensions.displayName', 'vendorExtensions.name',
      'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name'
    ], 'Client', index, 'Client');
    const type = context.safeText(context.firstOf(row, ['type', 'clientType', 'entityType'], 'Not provided'));
    return {
      dataOrigin: 'live', id,
      code: context.safeText(context.firstOf(row, ['code', 'clientCode', 'externalId'], id)),
      name, vendorDisplayName: name,
      registeredName: context.safeText(context.firstOf(row, ['name', 'clientName', 'displayName', 'sourceEntityId', 'id'], name)),
      plantCount: Array.isArray(row.plants) ? row.plants.length : Number(context.firstOf(row, ['plantCount', 'plantsCount', 'assignedPlantCount'], 0) || 0),
      deviceCount: Number(context.firstOf(row, ['deviceCount', 'devicesCount'], 0) || 0),
      totalCapacity: context.safeText(context.firstOf(row, ['totalCapacity', 'capacity', 'capacityDc', 'installedCapacity'], '—')),
      type,
      legalForm: context.safeText(context.firstOf(row, ['legalForm', 'companyType'], 'Not provided')),
      registrationNo: context.safeText(context.firstOf(row, ['registrationNo', 'registrationNumber', 'registryNumber'], '—')),
      taxId: context.safeText(context.firstOf(row, ['taxId', 'tin', 'vat', 'taxNumber'], '—')),
      country: context.safeText(context.firstOf(row, ['country', 'address.country'], '—')),
      region: context.safeText(context.firstOf(row, ['region', 'address.region'], '—')),
      city: context.safeText(context.firstOf(row, ['city', 'address.city'], '—')),
      address: context.safeText(context.firstOf(row, ['address', 'detailedAddress', 'addressLine'], '—')),
      status: context.safeText(context.firstOf(row, ['status', 'accountActivation', 'accountStatus', 'lifecycleStatus'], 'Unknown')),
      verification: context.safeText(context.firstOf(row, ['verification', 'verificationStatus', 'kycStatus'], 'Not provided')),
      account: context.safeText(context.firstOf(row, ['account', 'accountManager', 'manager'], '—')),
      primaryContact: context.safeText(context.firstOf(row, ['primaryContact', 'contactName', 'contact.name'], '—')),
      contactEmail: context.safeText(context.firstOf(row, ['contactEmail', 'email', 'contact.email'], '—')),
      contactPhone: context.safeText(context.firstOf(row, ['contactPhone', 'phoneNumber1', 'phone1', 'phone', 'contact.phone'], '—')),
      phone2: context.safeText(context.firstOf(row, ['phoneNumber2', 'phone2', 'secondaryPhone'], '')),
      username: context.safeText(context.firstOf(row, ['username', 'portalUsername'], '')),
      portalUsername: context.safeText(context.firstOf(row, ['username', 'portalUsername'], '')),
      tenant: context.safeText(context.firstOf(row, ['managingTenant', 'tenant', 'tenantName', 'organizationName'], 'Not provided')),
      plants: Array.isArray(row.plants) ? row.plants : [],
      users: Number(context.firstOf(row, ['users', 'userCount'], 0) || 0),
      documents: Number(context.firstOf(row, ['documents', 'documentCount'], Number(Boolean(row.hasClientPassportFile)) + Number(Boolean(row.hasStateRegistrationDocumentFile)) + Number(Boolean(row.hasProjectDocFile))) || 0),
      billing: context.safeText(context.firstOf(row, ['billing', 'billingPlan', 'servicePlan'], '—')),
      supportTier: context.safeText(context.firstOf(row, ['supportTier', 'supportPlan'], '—')),
      accessScope: context.safeText(context.firstOf(row, ['accessScope', 'dataScope'], 'Not provided')),
      exportPolicy: context.safeText(context.firstOf(row, ['exportPolicy'], '—')),
      assignmentRole: context.safeText(context.firstOf(row, ['assignmentRole', 'role'], 'Not provided')),
      onboarding: context.safeText(context.firstOf(row, ['onboarding', 'onboardingStatus', 'accountActivation'], '—')),
      updated: context.formatDate(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc']), 'No backend timestamp'),
      lastSyncAt: context.safeText(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc'], ''), ''),
      raw: row
    };
  });

  const plants = createContract<FleetPlantDto>(CONTRACT_DEFINITIONS.plants, (row, index, context) => {
    const provider = context.safeText(context.firstOf(row, ['provider', 'sourceScheme', 'adminRecord.sourceScheme'], 'Backend'));
    const name = context.displayName(row, [
      'adminName', 'liveName', 'vendorExtensions.plantName', 'vendorExtensions.stationName',
      'vendorExtensions.siteName', 'vendorExtensions.displayName', 'vendorExtensions.name',
      'adminRecord.plantName', 'adminRecord.stationName', 'adminRecord.siteName',
      'adminRecord.displayName', 'adminRecord.name', 'liveRecord.plantName',
      'liveRecord.stationName', 'liveRecord.siteName', 'liveRecord.displayName', 'liveRecord.name',
      'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'sourceEntityName', 'name'
    ], 'Plant', index, 'Plant');
    const powerKw = Number(row.currentPowerKw || 0);
    const installedKw = Number(row.installedPowerKw || 0);
    return {
      dataOrigin: 'live',
      id: context.safeText(context.firstOf(row, ['id', 'plantId', 'adminRecord.id']), `LIVE-PLANT-${index + 1}`),
      externalId: context.safeText(context.firstOf(row, ['sourcePlantId', 'plantCode', 'externalId', 'adminRecord.plantCode']), '—'),
      code: context.safeText(context.firstOf(row, ['plantCode', 'sourcePlantId', 'code', 'adminRecord.plantCode']), `LIVE-PLT-${index + 1}`),
      name, vendorDisplayName: name,
      registeredName: context.safeText(context.firstOf(row, ['sourcePlantId', 'plantId', 'code', 'id'], name)),
      tenant: context.safeText(context.firstOf(row, ['managingTenant', 'tenantName', 'tenant', 'adminRecord.managingTenant'], 'Backend Live API')),
      clientId: context.safeText(context.firstOf(row, ['clientId', 'adminRecord.clientId'], '')),
      portfolio: provider, integration: `${provider} live integration`, vendor: provider,
      status: context.safeText(context.firstOf(row, ['status', 'recordStatus', 'adminRecord.recordStatus'], 'Unknown')),
      health: context.safeText(context.firstOf(row, ['status', 'recordStatus', 'adminRecord.recordStatus'], 'Unknown')),
      type: context.safeText(context.firstOf(row, ['plantType', 'type', 'adminRecord.plantType'], 'Solar Plant')),
      country: context.safeText(context.firstOf(row, ['countryRegion', 'country', 'vendorExtensions.country', 'adminRecord.countryRegion'], '—')),
      region: context.safeText(context.firstOf(row, ['region', 'vendorExtensions.region', 'adminRecord.region'], '—')),
      city: context.safeText(context.firstOf(row, ['city', 'vendorExtensions.city', 'adminRecord.city'], '—')),
      address: context.safeText(context.firstOf(row, ['address', 'vendorExtensions.address', 'adminRecord.address'], '—')),
      lat: context.safeText(row.vendorExtensions?.latitude, '—'),
      lng: context.safeText(row.vendorExtensions?.longitude, '—'),
      timezone: context.safeText(context.firstOf(row, ['plantTimeZone', 'timezone', 'vendorExtensions.timezone', 'adminRecord.plantTimeZone'], '—')),
      capacityDc: installedKw ? Number((installedKw / 1000).toFixed(2)) : 0,
      capacityAc: installedKw ? Number((installedKw / 1000).toFixed(2)) : 0,
      gridCapacity: installedKw ? Number((installedKw / 1000).toFixed(2)) : 0,
      panels: 0, inverters: 0, strings: 0, transformers: 0, meters: 0, battery: 'Unknown',
      devices: Number(context.firstOf(row, ['devicesCount', 'vendorExtensions.devicesCount', 'adminRecord.devicesCount'], 0) || 0),
      alerts: row.vendorExtensions?.alertsCount === undefined || row.vendorExtensions?.alertsCount === null ? '—' : Number(row.vendorExtensions.alertsCount),
      livePower: powerKw ? `${(powerKw / 1000).toFixed(2)} MW` : '0 kW',
      today: row.todayEnergyKwh ? `${Number(row.todayEnergyKwh).toFixed(1)} kWh` : '0 kWh',
      month: '—', pr: '—',
      lastData: context.formatDate(row.lastDataAt, 'No live data'),
      freshness: context.safeText(row.dataQualityStatus, 'Unknown'),
      commissioned: context.formatDate(context.firstOf(row, ['commissioningDate', 'createdAtUtc', 'adminRecord.createdAtUtc']), '—'),
      owner: context.safeText(context.firstOf(row, ['client', 'clientName', 'adminRecord.client'], '—')),
      operator: context.safeText(context.firstOf(row, ['managingTenant', 'adminRecord.managingTenant'], '—')),
      om: context.safeText(context.firstOf(row, ['serviceProvider', 'omProvider'], '—')),
      sourceSystem: context.safeText(context.firstOf(row, ['sourceScheme', 'adminRecord.sourceScheme'], provider)),
      updated: context.formatDate(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc', 'adminRecord.updatedAtUtc', 'adminRecord.createdAtUtc']), 'No backend timestamp'),
      lastSyncAt: context.safeText(context.firstOf(row, ['lastDataAt', 'updatedAtUtc', 'createdAtUtc'], ''), ''),
      totalEnergy: row.totalEnergyKwh, raw: row
    };
  });

  const devices = createContract<FleetDeviceDto>(CONTRACT_DEFINITIONS.devices, (row, index, context) => {
    const provider = context.safeText(context.firstOf(row, ['provider', 'vendorExtensions.provider'], 'Backend'));
    const deviceType = context.safeText(context.firstOf(row, ['deviceType', 'vendorExtensions.deviceType', 'type'], 'Device'));
    const name = context.displayName(row, [
      'vendorExtensions.deviceName', 'vendorExtensions.equipmentName', 'vendorExtensions.displayName',
      'vendorExtensions.name', 'sourceDeviceName', 'deviceName', 'equipmentName',
      'displayName', 'sourceEntityName', 'name'
    ], 'Device', index, deviceType);
    return {
      dataOrigin: 'live',
      id: context.safeText(row.id, `LIVE-DEVICE-${index + 1}`),
      externalId: context.safeText(row.sourceDeviceId, '—'),
      name, vendorDisplayName: name,
      registeredName: context.safeText(context.firstOf(row, ['sourceDeviceId', 'deviceId', 'serialNumber', 'code', 'id'], name)),
      type: deviceType,
      subtype: context.safeText(context.firstOf(row, ['vendorExtensions.subtype', 'vendorExtensions.rawDeviceType'], 'Backend live record')),
      manufacturer: provider,
      model: context.safeText(context.firstOf(row, ['vendorExtensions.vendorModel', 'vendorExtensions.productModel', 'vendorExtensions.model', 'model'], '—')),
      serial: context.safeText(row.serialNumber, '—'),
      firmware: context.safeText(context.firstOf(row, ['vendorExtensions.firmwareVersion', 'vendorExtensions.firmware', 'firmwareVersion'], '—')),
      ip: context.safeText(row.vendorExtensions?.ip, '—'),
      mac: context.safeText(row.vendorExtensions?.mac, '—'),
      plantId: context.safeText(row.sourcePlantId, '—'),
      plant: context.safeText(context.firstOf(row, ['plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName', 'vendorExtensions.stationName'], 'Unknown Plant')),
      tenant: 'Backend Live API', vendor: provider, integration: `${provider} live integration`,
      status: context.safeText(row.status, 'Unknown'), lifecycle: context.safeText(context.firstOf(row, ['lifecycleStatus', 'recordStatus', 'vendorExtensions.lifecycleStatus'], 'Unknown')),
      capacity: Number(context.firstOf(row, ['vendorExtensions.ratedPowerKw', 'ratedPowerKw'], 0) || 0) > 0
        ? `${Number(context.firstOf(row, ['vendorExtensions.ratedPowerKw', 'ratedPowerKw'], 0))} kW`
        : context.safeText(context.firstOf(row, ['vendorExtensions.capacity', 'capacity'], '—')),
      installation: context.formatDate(context.firstOf(row, ['vendorExtensions.installationDate', 'vendorExtensions.commissioningDate', 'installationDate', 'commissioningDate']), '—'),
      warranty: context.formatDate(context.firstOf(row, ['vendorExtensions.warrantyUntil', 'vendorExtensions.warrantyDate', 'warrantyUntil', 'warrantyDate']), '—'),
      lastSeen: context.formatDate(row.lastSeenAt, 'No live data'),
      alerts: row.vendorExtensions?.alertsCount === undefined || row.vendorExtensions?.alertsCount === null ? '—' : Number(row.vendorExtensions.alertsCount),
      power: context.safeText(context.firstOf(row, ['vendorExtensions.power', 'vendorExtensions.activePower', 'activePower'], '—')),
      reactivePower: context.safeText(context.firstOf(row, ['vendorExtensions.reactivePower', 'reactivePower'], '—')),
      powerFactor: context.safeText(context.firstOf(row, ['vendorExtensions.powerFactor', 'powerFactor'], '—')),
      voltage: context.safeText(context.firstOf(row, ['vendorExtensions.voltage', 'voltage'], '—')),
      lineVoltage: context.safeText(context.firstOf(row, ['vendorExtensions.lineVoltage', 'lineVoltage'], '—')),
      current: context.safeText(context.firstOf(row, ['vendorExtensions.current', 'current'], '—')),
      phaseCurrent: context.safeText(context.firstOf(row, ['vendorExtensions.phaseCurrent', 'phaseCurrent'], '—')),
      frequency: context.safeText(context.firstOf(row, ['vendorExtensions.frequency', 'frequency'], '—')),
      temperature: context.safeText(context.firstOf(row, ['vendorExtensions.temperature', 'temperature'], '—')),
      dailyEnergy: context.safeText(context.firstOf(row, ['vendorExtensions.dailyEnergy', 'vendorExtensions.todayEnergy', 'dailyEnergy'], '—')),
      monthlyYield: context.safeText(context.firstOf(row, ['vendorExtensions.monthlyYield', 'monthlyYield'], '—')),
      totalYield: context.safeText(context.firstOf(row, ['vendorExtensions.totalYield', 'vendorExtensions.totalEnergy', 'totalYield'], '—')),
      insulation: context.safeText(context.firstOf(row, ['vendorExtensions.insulationResistance', 'vendorExtensions.insulation', 'insulationResistance'], '—')),
      startup: context.safeText(context.firstOf(row, ['vendorExtensions.startupTime', 'startupTime'], '—')),
      shutdown: context.safeText(context.firstOf(row, ['vendorExtensions.shutdownTime', 'shutdownTime'], '—')),
      soc: context.safeText(context.firstOf(row, ['vendorExtensions.soc', 'soc'], '—')),
      soh: context.safeText(context.firstOf(row, ['vendorExtensions.soh', 'soh'], '—')),
      rated: context.safeText(context.firstOf(row, ['vendorExtensions.ratedCapacity', 'vendorExtensions.ratedEnergy', 'ratedCapacity'], '—')),
      charged: context.safeText(context.firstOf(row, ['vendorExtensions.chargedToday', 'chargedToday'], '—')),
      discharged: context.safeText(context.firstOf(row, ['vendorExtensions.dischargedToday', 'dischargedToday'], '—')),
      packages: context.safeText(context.firstOf(row, ['vendorExtensions.packageQuantity', 'vendorExtensions.packages', 'packageQuantity'], '—')),
      chargeVoltage: context.safeText(context.firstOf(row, ['vendorExtensions.chargeEndVoltage', 'vendorExtensions.chargeVoltage', 'chargeEndVoltage'], '—')),
      dischargeVoltage: context.safeText(context.firstOf(row, ['vendorExtensions.dischargeEndVoltage', 'vendorExtensions.dischargeVoltage', 'dischargeEndVoltage'], '—')),
      chargeCurrent: context.safeText(context.firstOf(row, ['vendorExtensions.chargeLimitCurrent', 'vendorExtensions.chargeCurrent', 'chargeLimitCurrent'], '—')),
      dischargeCurrent: context.safeText(context.firstOf(row, ['vendorExtensions.dischargeLimitCurrent', 'vendorExtensions.dischargeCurrent', 'dischargeLimitCurrent'], '—')),
      signal: context.safeText(context.firstOf(row, ['vendorExtensions.signalStrength', 'vendorExtensions.signal', 'signalStrength'], '—')),
      wlan: context.safeText(context.firstOf(row, ['vendorExtensions.wlanSignal', 'vendorExtensions.wlan', 'wlanSignal'], '—')),
      dataLag: context.safeText(context.firstOf(row, ['vendorExtensions.dataLag', 'dataLag'], '—')),
      lanIp: context.safeText(context.firstOf(row, ['vendorExtensions.lanIp', 'vendorExtensions.ip', 'lanIp'], '—')),
      cybersecurity: context.safeText(context.firstOf(row, ['vendorExtensions.cybersecurityVersion', 'vendorExtensions.cybersecurity', 'cybersecurityVersion'], '—')),
      irradiance: context.safeText(context.firstOf(row, ['vendorExtensions.irradiance', 'irradiance'], '—')),
      ambient: context.safeText(context.firstOf(row, ['vendorExtensions.ambientTemperature', 'vendorExtensions.ambient', 'ambientTemperature'], '—')),
      moduleTemp: context.safeText(context.firstOf(row, ['vendorExtensions.moduleTemperature', 'vendorExtensions.moduleTemp', 'moduleTemperature'], '—')),
      wind: context.safeText(context.firstOf(row, ['vendorExtensions.windSpeed', 'vendorExtensions.wind', 'windSpeed'], '—')),
      humidity: context.safeText(context.firstOf(row, ['vendorExtensions.humidity', 'humidity'], '—')),
      rainfall: context.safeText(context.firstOf(row, ['vendorExtensions.rainfall', 'rainfall'], '—')),
      import: context.safeText(context.firstOf(row, ['vendorExtensions.totalImport', 'vendorExtensions.import', 'totalImport'], '—')),
      export: context.safeText(context.firstOf(row, ['vendorExtensions.totalExport', 'vendorExtensions.export', 'totalExport'], '—')),
      todayImport: context.safeText(context.firstOf(row, ['vendorExtensions.todayImport', 'todayImport'], '—')),
      todayExport: context.safeText(context.firstOf(row, ['vendorExtensions.todayExport', 'todayExport'], '—')),
      string: context.safeText(context.firstOf(row, ['vendorExtensions.string', 'string'], '—')),
      mppt: context.safeText(context.firstOf(row, ['vendorExtensions.mppt', 'mppt'], '—')),
      position: context.safeText(context.firstOf(row, ['vendorExtensions.position', 'position'], '—')),
      protocol: context.safeText(context.firstOf(row, ['vendorExtensions.protocolVersion', 'vendorExtensions.protocol', 'protocolVersion'], '—')),
      sourceStatus: context.safeText(context.firstOf(row, ['vendorExtensions.dataFreshness', 'dataQualityStatus'], 'Live API')),
      dataQualityStatus: context.safeText(row.dataQualityStatus, 'Unknown'),
      alarmStatus: context.safeText(context.firstOf(row, ['vendorExtensions.alarmStatus', 'alarmStatus'], 'Unknown')),
      sourceSystem: context.safeText(context.firstOf(row, ['vendorExtensions.sourceSystem', 'sourceSystem'], provider)),
      parent: context.safeText(context.firstOf(row, ['vendorExtensions.parentDeviceId', 'vendorExtensions.parent', 'parentDeviceId'], '—')),
      children: context.safeText(row.vendorExtensions?.children, '—'), raw: row
    };
  });

  const alerts = createContract<FleetAlertDto>(CONTRACT_DEFINITIONS.alerts, (row, index, context) => {
    const provider = context.safeText(context.firstOf(row, ['provider','providerName','vendor','vendorName'], 'Backend'), 'Backend');
    const severity = context.safeText(row.severity, 'Unknown');
    const alertDeviceType = context.safeText(context.firstOf(row, ['vendorExtensions.deviceType', 'deviceType'], '—'));
    const occurredAt = context.firstOf(row, ['occurredAtUtc','occurredAt','createdAtUtc','createdAt'], '');
    const lastSyncAt = context.firstOf(row, ['lastSyncAt','lastSyncAtUtc','updatedAtUtc','updatedAt'], '');
    const timeline = [
      occurredAt ? `${context.formatDate(occurredAt)} · Alert received from ${provider}` : '',
      lastSyncAt ? `${context.formatDate(lastSyncAt)} · Last synchronized with Zentrid` : ''
    ].filter(Boolean);
    const priority = context.safeText(context.firstOf(row, ['priority','vendorExtensions.priority'], ''), '') || (severity === 'Critical' ? 'P1' : severity === 'Warning' ? 'P2' : 'P3');
    const title = context.displayName(row, [
      'vendorExtensions.alertName', 'vendorExtensions.displayName', 'vendorExtensions.name',
      'sourceAlertName', 'alertName', 'title', 'message', 'name'
    ], 'Alert', index, alertDeviceType === '—' ? 'Alert' : `${alertDeviceType} Alert`);
    const tenant = context.safeText(context.firstOf(row, ['tenantName','tenant','organizationName','vendorExtensions.tenantName'], ''), '');
    const integration = context.safeText(context.firstOf(row, ['integrationName','integration','sourceSystem','vendorExtensions.integrationName'], ''), '') || `${provider} live integration`;
    return {
      dataOrigin: 'live',
      id: context.safeText(context.firstOf(row, ['id','alertId','sourceAlertId'], `LIVE-ALERT-${index + 1}`)),
      fleetCode: context.safeText(context.firstOf(row, ['vendorExtensions.fleetCode', 'fleetCode'], '')),
      vendorRawCode: context.safeText(context.firstOf(row, ['sourceAlertId','vendorExtensions.alarmCode','alarmCode'], '')),
      vendorCode: context.safeText(context.firstOf(row, ['sourceAlertId','vendorExtensions.alarmCode','alarmCode'], '')),
      vendorMessage: context.safeText(context.firstOf(row, ['message','vendorExtensions.message'], '')),
      severity,
      priority,
      title: context.safeText(title, 'Live backend alert'),
      vendorDisplayName: context.safeText(title, 'Live backend alert'),
      registeredName: context.safeText(context.firstOf(row, ['sourceAlertId','id','title'], title), title),
      status: context.safeText(row.status, 'Unknown'),
      category: context.safeText(context.firstOf(row, ['vendorExtensions.alarmType', 'vendorExtensions.category','alarmType','category'], '—')),
      tenant,
      plantId: context.safeText(context.firstOf(row, ['sourcePlantId','plantId'], '—')),
      plant: context.safeText(context.firstOf(row, ['plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName', 'vendorExtensions.stationName'], '—')),
      deviceId: context.safeText(context.firstOf(row, ['sourceDeviceId','deviceId','vendorExtensions.deviceSn'], '—')),
      device: context.safeText(context.firstOf(row, ['deviceName','sourceDeviceName','vendorExtensions.deviceName'], '—')),
      deviceType: alertDeviceType,
      vendor: provider,
      source: context.safeText(context.firstOf(row, ['sourceSystem','provider','vendorExtensions.sourceSystem'], provider), provider),
      integration,
      created: occurredAt ? context.formatDate(occurredAt) : '—',
      updated: lastSyncAt ? context.formatDate(lastSyncAt) : '—',
      age: context.safeText(context.firstOf(row, ['age','duration','vendorExtensions.age'], '—')),
      sla: context.safeText(context.firstOf(row, ['sla','slaStatus','vendorExtensions.sla'], '—')),
      owner: context.safeText(context.firstOf(row, ['owner','assignedTo','assignee','vendorExtensions.owner'], '—')),
      telemetry: context.safeText(context.firstOf(row, ['telemetry','vendorExtensions.telemetry'], '—')),
      description: context.safeText(context.firstOf(row, ['message','description','vendorExtensions.description'], title), title),
      probableCause: context.safeText(context.firstOf(row, ['vendorExtensions.reason', 'vendorExtensions.probableCause','reason','probableCause'], '')),
      recommendation: context.safeText(context.firstOf(row, ['vendorExtensions.solution', 'vendorExtensions.recommendation','solution','recommendation'], '')),
      timeline,
      related: {
        telemetryMetric: context.safeText(context.firstOf(row, ['telemetryMetric','vendorExtensions.telemetryMetric'], '—')),
        caseId: context.safeText(context.firstOf(row, ['caseId','incidentCaseId','vendorExtensions.caseId'], '—')),
        taskId: context.safeText(context.firstOf(row, ['taskId','vendorExtensions.taskId'], '—'))
      },
      raw: row
    };
  });

  const integrations = createContract<FleetIntegrationDto>(CONTRACT_DEFINITIONS.integrations, (row, index, context) => {
    const provider = context.integrationVendor(context.firstOf(row, ['provider', 'providerType', 'providerName', 'vendorName', 'vendor', 'producerVendorTemplate', 'displayName', 'integrationName', 'name'], 'Unknown'));
    const status = context.safeText(context.firstOf(row, ['status', 'integrationStatus'], 'Unknown'));
    return {
      dataOrigin: 'live',
      id: context.safeText(context.firstOf(row, ['id', 'integrationId'], `LIVE-${provider}-${index + 1}`)),
      code: context.safeText(context.firstOf(row, ['integrationCode', 'code'], `LIVE-${provider.toUpperCase()}-${String(index + 1).padStart(3, '0')}`)),
      name: context.safeText(context.firstOf(row, ['displayName', 'integrationName', 'name'], provider)),
      tenant: 'Backend Live API', vendor: provider, software: context.integrationSoftware(provider), status, health: status,
      auth: 'Backend managed', discovery: Number(row.plantsCount || 0) > 0 ? 'Completed' : 'No plant data',
      plants: Number(row.plantsCount || row.plantCount || row.plants || 0),
      devices: Number(row.devicesCount || row.deviceCount || row.devices || 0),
      metrics: Number(row.vendorExtensions?.metricsCount || 0),
      alerts: Number(row.alertsCount || row.alertCount || row.alerts || row.vendorExtensions?.activeAlertsCount || 0),
      lastSync: context.safeText(row.lastSyncText, context.formatDate(row.lastSyncAtUtc)),
      assignedTenants: 'Global', activeIntegrations: Number(row.plantsWithDataCount || row.vendorExtensions?.plantsWithDataCount || 0),
      plantsWithoutData: Number(context.firstOf(row, ['plantsWithoutDataCount', 'vendorExtensions.plantsWithoutDataCount'], 0) || 0),
      stalePlants: Number(context.firstOf(row, ['stalePlantsCount', 'vendorExtensions.stalePlantsCount'], 0) || 0),
      errorRate: Number(context.firstOf(row, ['errorRatePct'], 0) || 0),
      version: 'Backend live', apiVersion: 'Swagger v1', mappingVersion: 'Normalized live summary',
      authType: 'Server-side connector auth', discoveryEnabled: 'Yes', baseUrl: 'Managed by backend',
      createdBy: 'Backend', createdAt: context.formatDate(row.createdAtUtc, '—'), updatedBy: 'Backend',
      updatedAt: context.formatDate(context.firstOf(row, ['lastSyncAtUtc', 'updatedAtUtc', 'createdAtUtc']), 'No sync'),
      lastActivity: context.safeText(row.lastSyncText, 'No data'),
      lastSuccessfulSync: context.safeText(row.lastSyncText, 'No data'),
      vendorName: context.safeText(context.firstOf(row, ['vendorName', 'providerName', 'displayName'], provider)),
      producerVendorTemplate: context.safeText(row.producerVendorTemplate, ''),
      lastErrorMessage: context.safeText(row.lastErrorMessage, ''),
      vendorExtensions: row.vendorExtensions || {}
    };
  });

  window.FleetAPIContracts = { clients, plants, devices, alerts, integrations, diagnostics, fieldAudit };
})();
