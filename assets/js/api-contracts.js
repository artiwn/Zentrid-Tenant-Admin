"use strict";
/* Zentrid API contract and mapping layer.
   Backend DTO compatibility belongs here; page renderers consume normalized view models. */
(function () {
    function isRecord(value) {
        return Boolean(value && typeof value === 'object' && !Array.isArray(value));
    }
    function parseDto(value) {
        return isRecord(value) ? value : null;
    }
    function pathValue(row, path) {
        let current = row;
        for (const part of path.split('.')) {
            if (!isRecord(current) || !(part in current))
                return undefined;
            current = current[part];
        }
        return current;
    }
    function firstAlias(row, aliases) {
        for (const alias of aliases) {
            const value = pathValue(row, alias);
            if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === ''))
                return { alias, value };
        }
        return null;
    }
    function matchesExpectedType(value, expected) {
        if (expected === 'number') {
            if (typeof value === 'number')
                return Number.isFinite(value);
            return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
        }
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    }
    const diagnosticIssues = [];
    const diagnosticFingerprints = new Set();
    const diagnostics = {
        clear(entity) {
            if (!entity) {
                diagnosticIssues.splice(0, diagnosticIssues.length);
                diagnosticFingerprints.clear();
                return;
            }
            for (let index = diagnosticIssues.length - 1; index >= 0; index -= 1) {
                if (diagnosticIssues[index].entity === entity)
                    diagnosticIssues.splice(index, 1);
            }
            diagnosticFingerprints.clear();
            diagnosticIssues.forEach(issue => diagnosticFingerprints.add(`${issue.entity}|${issue.index}|${issue.code}|${issue.field}|${issue.message}`));
        },
        report(issues) {
            issues.forEach(issue => {
                const fingerprint = `${issue.entity}|${issue.index}|${issue.code}|${issue.field}|${issue.message}`;
                if (diagnosticFingerprints.has(fingerprint))
                    return;
                diagnosticFingerprints.add(fingerprint);
                diagnosticIssues.push(issue);
            });
        },
        list(entity) {
            return diagnosticIssues.filter(issue => !entity || issue.entity === entity).map(issue => ({ ...issue, aliases: [...issue.aliases] }));
        },
        summary(entity) {
            const issues = diagnosticIssues.filter(issue => !entity || issue.entity === entity);
            return {
                total: issues.length,
                errors: issues.filter(issue => issue.severity === 'error').length,
                warnings: issues.filter(issue => issue.severity === 'warning').length,
                affectedEntities: Array.from(new Set(issues.map(issue => issue.entity)))
            };
        }
    };
    function validateContract(value, index, definition) {
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
        const issues = [];
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
            if (valueAtPath === undefined || valueAtPath === null || valueAtPath === '')
                return;
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
    function createContract(definition, mapper) {
        return {
            parse: (parseDto),
            validate(value, index = 0) {
                return validateContract(value, index, definition);
            },
            map(value, index, context) {
                const dto = parseDto(value);
                const validation = validateContract(value, index, definition);
                diagnostics.report(validation.issues);
                const mappingAudit = auditFieldMapping(definition.entity, value, index);
                const mapped = mapper(dto || {}, index, context);
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
    function requirement(field, aliases, severity = 'error', expected = 'scalar') {
        return { field, aliases, severity, expected };
    }
    const CONTRACT_DEFINITIONS = {
        clients: {
            entity: 'clients', label: 'Client',
            requirements: [
                requirement('identity', ['id', 'clientId', 'canonicalId', 'sourceEntityId', 'externalId'], 'warning'),
                requirement('display name', ['vendorExtensions.clientName', 'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name'])
            ],
            optionalNumbers: ['plantCount', 'plantsCount', 'assignedPlantCount', 'deviceCount', 'devicesCount']
        },
        tenants: {
            entity: 'tenants', label: 'Tenant',
            requirements: [
                requirement('identity', ['id', 'tenantId', 'canonicalId', 'sourceEntityId'], 'warning'),
                requirement('display label', ['vendorExtensions.tenantName', 'vendorExtensions.organizationName', 'vendorExtensions.displayName', 'vendorExtensions.name', 'generalInformation.tenantName', 'generalInformation.displayName', 'generalInformation.legalName',
                    'tenant.name', 'tenant.tenantName', 'organization.name', 'organization.organizationName', 'company.name', 'profile.displayName', 'sourceTenantName', 'tenantName', 'organizationName', 'displayName', 'legalName', 'companyName', 'name', 'tenantCode', 'organizationCode', 'externalId', 'tenantId', 'sourceEntityId', 'id'])
            ],
            optionalNumbers: ['setup', 'setupPct', 'onboardingProgress']
        },
        plants: {
            entity: 'plants', label: 'Plant',
            requirements: [
                requirement('identity', ['id', 'plantId', 'canonicalId', 'sourcePlantId']),
                requirement('display name', ['vendorExtensions.plantName', 'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'name']),
                requirement('provider', ['provider', 'providerType', 'providerName', 'vendor', 'vendorName', 'sourceScheme', 'sourceSystem', 'source.provider', 'source.vendor', 'integration.provider', 'adminRecord.provider', 'adminRecord.providerType', 'adminRecord.providerName', 'adminRecord.vendor', 'adminRecord.vendorName', 'adminRecord.sourceScheme', 'adminRecord.sourceSystem', 'vendorPlatform.sourceScheme', 'adminRecord.vendorPlatform.sourceScheme'], 'warning')
            ],
            optionalNumbers: ['currentPowerKw', 'installedPowerKw', 'todayEnergyKwh', 'totalEnergyKwh']
        },
        devices: {
            entity: 'devices', label: '—',
            requirements: [
                requirement('identity', ['id', 'deviceId', 'canonicalId', 'sourceDeviceId', 'serialNumber']),
                requirement('display name', ['identity.deviceName', 'vendorExtensions.deviceName', 'sourceDeviceName', 'deviceName', 'equipmentName', 'displayName', 'sourceEntityName', 'name']),
                requirement('provider', ['source.provider', 'provider'], 'warning'),
                requirement('plant relation', ['plantRelation.plantId', 'sourcePlantId', 'plantId'], 'warning')
            ]
        },
        alerts: {
            entity: 'alerts', label: 'Alert',
            requirements: [
                requirement('identity', ['id', 'alertId', 'sourceAlertId']),
                requirement('display text', ['canonical.canonicalName', 'canonicalName', 'guidance.description', 'vendor.vendorMessage', 'vendorMessage', 'vendorExtensions.alertName', 'sourceAlertName', 'alertName', 'title', 'message', 'name']),
                requirement('severity', ['canonical.canonicalSeverity', 'canonicalSeverity', 'severity', 'vendorSeverity'], 'warning'),
                requirement('provider', ['vendor.provider', 'provider'], 'warning')
            ]
        },
        telemetry: {
            entity: 'telemetry', label: 'Telemetry',
            requirements: [
                requirement('metric', ['metric', 'metricCode', 'metricName', 'name', 'key', 'parameter', 'measurement', 'field'], 'warning'),
                requirement('value', ['value', 'metricValue', 'numericValue', 'textValue', 'booleanValue', 'reading', 'currentValue'], 'warning')
            ]
        },
        integrations: {
            entity: 'integrations', label: 'Integration',
            requirements: [
                requirement('provider', ['provider', 'providerType', 'vendor', 'providerName', 'vendorName', 'producerVendorTemplate', 'vendorExtensions.provider', 'vendorExtensions.providerType', 'vendorExtensions.providerName', 'vendorExtensions.vendorName', 'source.provider', 'source.vendor', 'connector.provider', 'connector.vendor', 'integration.provider', 'integration.vendor', 'providerIntegration.providerType', 'sourceScheme'], 'error'),
                requirement('display name', ['displayName', 'name', 'integrationName', 'vendorExtensions.displayName', 'vendorExtensions.integrationName', 'connector.displayName', 'connector.name', 'integration.displayName', 'integration.name', 'providerIntegration.displayName', 'provider', 'providerType', 'providerName', 'vendorName', 'vendorExtensions.provider'], 'warning'),
                requirement('status', ['status', 'integrationStatus', 'vendorExtensions.status', 'vendorExtensions.integrationStatus', 'health', 'healthStatus', 'connectionStatus', 'lifecycleStatus', 'state', 'connector.status', 'integration.status', 'providerIntegration.status'], 'warning')
            ],
            optionalNumbers: ['plantsCount', 'plantCount', 'plants', 'devicesCount', 'deviceCount', 'devices', 'alertsCount', 'alertCount', 'alerts', 'plantsWithDataCount']
        }
    };
    function field(canonicalField, aliases, uiTargets, format, fallback = '—', required) {
        return { canonicalField, aliases, uiTargets, format, fallback, ...(required ? { required } : {}) };
    }
    const FIELD_MAPPING_MANIFEST = {
        clients: [
            field('id', ['id', 'clientId', 'canonicalId', 'sourceEntityId', 'externalId'], ['Client Registry row ID', 'Client Detail identity'], 'identifier', '—', 'warning'),
            field('code', ['clientCode', 'code', 'externalId'], ['Client Registry code', 'Client Detail code'], 'identifier', 'ID'),
            field('name', ['vendorExtensions.clientName', 'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name', 'identity.fullName', 'identity.companyName', 'identity.firstName', 'identity.lastName', 'identity.middleName'], ['Client Registry name', 'Client Detail heading'], 'text', '—', 'error'),
            field('managingTenant', ['tenantLink.managingTenantName', 'tenantLink.managingTenantId', 'managingTenant', 'tenant', 'tenantName', 'organizationName'], ['Client Registry tenant', 'Client Detail tenant'], 'relation', '—'),
            field('clientType', ['tenantLink.clientType', 'clientType', 'type', 'entityType'], ['Client Registry type', 'Client Detail identity'], 'text', '—'),
            field('accountActivation', ['tenantLink.status', 'accountActivation', 'status', 'accountStatus', 'lifecycleStatus'], ['Client Registry status', 'Client Detail status'], 'status', '—'),
            field('activationAt', ['tenantLink.activationAt', 'activationAt'], ['Client Detail lifecycle'], 'date', ''),
            field('firstName', ['identity.firstName', 'firstName'], ['Client Detail identity'], 'text', ''),
            field('lastName', ['identity.lastName', 'lastName'], ['Client Detail identity'], 'text', ''),
            field('middleName', ['identity.middleName', 'middleName'], ['Client Detail identity'], 'text', ''),
            field('companyName', ['identity.companyName', 'companyName'], ['Client Detail identity'], 'text', ''),
            field('legalForm', ['identity.legalForm', 'legalForm', 'companyType'], ['Client Detail identity'], 'text', ''),
            field('registrationNumber', ['identity.registrationNumber', 'registrationNo', 'registrationNumber', 'registryNumber'], ['Client Detail identity'], 'identifier', ''),
            field('taxIdVatNumber', ['identity.taxIdVatNumber', 'generalInformation.taxIdVatNumber', 'generalInformation.taxId', 'taxIdVatNumber', 'taxId', 'tin', 'vat', 'taxNumber'], ['Client Detail identity'], 'identifier', ''),
            field('identityRole', ['identity.role', 'identityRole', 'role'], ['Client Detail identity'], 'text', ''),
            field('dateOfBirth', ['identity.dateOfBirth', 'dateOfBirth'], ['Client Detail identity'], 'date', ''),
            field('preferredLanguage', ['identity.preferredLanguage', 'preferences.language', 'language'], ['Client Detail preferences'], 'text', ''),
            field('country', ['country', 'address.country'], ['Client Registry location', 'Client Detail location'], 'text', '—'),
            field('region', ['address.stateRegion', 'region', 'address.region'], ['Client Detail location'], 'text', '—'),
            field('city', ['city', 'address.city'], ['Client Registry city', 'Client Detail location'], 'text', '—'),
            field('address', ['address.streetAddress', 'detailedAddress', 'addressLine'], ['Client Detail address'], 'text', '—'),
            field('primaryContact', ['primaryContact.fullName', 'contactName', 'contact.name'], ['Client Detail contacts'], 'text', ''),
            field('email', ['primaryContact.email', 'email', 'contactEmail', 'contact.email'], ['Client Registry contact', 'Client Detail contacts'], 'email', '—'),
            field('phoneNumber1', ['primaryContact.phoneNumber1', 'phoneNumber1', 'contactPhone', 'phone1', 'phone', 'contact.phone'], ['Client Detail primary phone'], 'phone', '—'),
            field('phoneNumber2', ['primaryContact.phoneNumber2', 'phoneNumber2', 'phone2', 'secondaryPhone'], ['Client Detail secondary phone'], 'phone', ''),
            field('timeZone', ['preferences.timeZone', 'timezone', 'timeZone'], ['Client Detail preferences'], 'text', ''),
            field('temperatureUnit', ['preferences.temperatureUnit', 'temperatureUnit'], ['Client Detail preferences'], 'text', ''),
            field('currency', ['preferences.currency', 'currency'], ['Client Detail preferences'], 'text', ''),
            field('irradiationUnit', ['preferences.irradiationUnit', 'irradiationUnit'], ['Client Detail preferences'], 'text', ''),
            field('username', ['portalAccount.username', 'username', 'portalUsername'], ['Client Detail portal access'], 'identifier', ''),
            field('portalRole', ['portalAccount.role', 'portalRole'], ['Client Detail portal access'], 'text', ''),
            field('documents', ['documentation', 'documentRecords', 'hasClientPassportFile', 'hasStateRegistrationDocumentFile', 'hasProjectDocFile', 'documents', 'documentCount'], ['Client Detail documents KPI', 'Client Detail documents'], 'raw', ''),
            field('bankAccounts', ['bankAccounts'], ['Client Detail commercial & payments'], 'raw', ''),
            field('verification', ['verification', 'verificationStatus', 'kycStatus'], ['Client Detail identity'], 'status', ''),
            field('accessScope', ['accessScope', 'dataScope'], ['Client Detail portal access', 'Client Detail commercial scope'], 'raw', ''),
            field('exportPolicy', ['exportPolicy'], ['Client Detail portal access', 'Client Detail commercial scope'], 'raw', ''),
            field('portalUsers', ['portalUsers'], ['Client Detail portal access'], 'raw', ''),
            field('accountManager', ['accountManager', 'account', 'manager'], ['Client Detail identity'], 'text', ''),
            field('createdAt', ['createdAtUtc'], ['Client Detail source/freshness'], 'date', 'No backend timestamp'),
            field('updatedAt', ['updatedAtUtc'], ['Client Registry updated', 'Client Detail source/freshness'], 'date', 'createdAtUtc'),
            field('plants', ['plants', 'plantCount', 'plantsCount', 'assignedPlantCount'], ['Client Registry plants', 'Client Detail assigned plants'], 'count', '0'),
            field('devices', ['deviceCount', 'devicesCount'], ['Client Registry devices'], 'count', '0')
        ],
        tenants: [
            field('id', ['id', 'generalInformation.tenantId', 'tenantId', 'canonicalId', 'sourceEntityId'], ['Tenant Registry row ID', 'Tenant Detail identity'], 'identifier', '—', 'warning'),
            field('tenantCode', ['generalInformation.tenantCode', 'tenantCode', 'code', 'organizationCode', 'externalId'], ['Tenant Registry code', 'Tenant Detail code'], 'identifier', 'ID'),
            field('tenantName', ['vendorExtensions.tenantName', 'vendorExtensions.organizationName', 'vendorExtensions.displayName', 'vendorExtensions.name', 'generalInformation.tenantName', 'generalInformation.displayName', 'generalInformation.legalName', 'tenant.name', 'tenant.tenantName', 'organization.name', 'organization.organizationName', 'company.name', 'profile.displayName', 'sourceTenantName', 'tenantName', 'organizationName', 'displayName', 'legalName', 'companyName', 'name', 'tenantCode', 'organizationCode', 'externalId', 'tenantId', 'sourceEntityId', 'id'], ['Tenant Registry name', 'Tenant Detail heading'], 'text', '—', 'warning'),
            field('legalName', ['generalInformation.legalName', 'legalName', 'companyName', 'organizationName'], ['Tenant Detail legal name'], 'text', '—'),
            field('tradeName', ['generalInformation.tradeName', 'tradeName'], ['Tenant Detail general information'], 'text', ''),
            field('registrationNumber', ['generalInformation.registrationNumber', 'registrationNo', 'registrationNumber', 'registration', 'registryNumber'], ['Tenant Detail general information'], 'identifier', ''),
            field('taxIdVatNumber', ['generalInformation.taxIdVatNumber', 'generalInformation.taxId', 'taxIdVatNumber', 'taxId', 'tin', 'vat', 'taxNumber'], ['Tenant Detail general information'], 'identifier', ''),
            field('tenantStatus', ['generalInformation.tenantStatus', 'tenantStatus', 'status', 'lifecycleStatus', 'accountStatus'], ['Tenant Registry status', 'Tenant lifecycle'], 'status', '—'),
            field('entityType', ['generalInformation.entityType', 'entityType', 'legalEntityType', 'personType'], ['Tenant Detail entity type'], 'text', '—'),
            field('tenantType', ['generalInformation.tenantType', 'tenantType', 'type', 'organizationType'], ['Tenant Registry type', 'Tenant Detail tenant type'], 'text', '—'),
            field('accountManager', ['generalInformation.accountManager', 'accountManager'], ['Tenant Detail general information'], 'text', ''),
            field('industrySector', ['generalInformation.industrySector', 'industrySector'], ['Tenant Detail general information'], 'text', ''),
            field('businessCategory', ['generalInformation.businessCategory', 'businessCategory'], ['Tenant Detail general information', 'Tenant classification'], 'text', ''),
            field('parentCompany', ['generalInformation.parentCompany', 'parentCompany'], ['Tenant Detail general information'], 'text', ''),
            field('numberOfEmployees', ['generalInformation.numberOfEmployees', 'numberOfEmployees'], ['Tenant Detail general information'], 'count', ''),
            field('annualRevenueRange', ['generalInformation.annualRevenueRange', 'annualRevenueRange'], ['Tenant Detail general information'], 'text', ''),
            field('website', ['generalInformation.website', 'website'], ['Tenant Detail general information'], 'text', ''),
            field('country', ['generalInformation.country', 'addressInformation.legalAddress.country', 'country', 'address.country', 'vendorExtensions.country'], ['Tenant Registry country', 'Tenant Detail location'], 'text', '—'),
            field('region', ['addressInformation.legalAddress.stateRegion', 'addressInformation.legalAddress.region', 'region', 'address.region', 'vendorExtensions.region'], ['Tenant Detail location'], 'text', '—'),
            field('city', ['addressInformation.legalAddress.city', 'city', 'address.city', 'vendorExtensions.city'], ['Tenant Detail location'], 'text', '—'),
            field('streetAddress', ['addressInformation.legalAddress.streetAddress', 'addressInformation.legalAddress.address', 'streetAddress', 'address'], ['Tenant Detail legal address'], 'text', ''),
            field('buildingNumber', ['addressInformation.legalAddress.buildingNumber', 'buildingNumber'], ['Tenant Detail legal address'], 'text', ''),
            field('postalCode', ['addressInformation.legalAddress.postalCode', 'postalCode'], ['Tenant Detail legal address'], 'text', ''),
            field('businessAddressSameAsLegalAddress', ['addressInformation.businessAddressSameAsLegalAddress', 'addressInformation.businessAddressSameAsLegal', 'businessAddressSameAsLegalAddress', 'businessAddressSameAsLegal'], ['Tenant Detail business address'], 'boolean', ''),
            field('businessCountry', ['addressInformation.businessAddress.country', 'businessCountry'], ['Tenant Detail business address'], 'text', ''),
            field('businessRegion', ['addressInformation.businessAddress.stateRegion', 'addressInformation.businessAddress.region', 'businessStateRegion', 'businessRegion'], ['Tenant Detail business address'], 'text', ''),
            field('businessCity', ['addressInformation.businessAddress.city', 'businessCity'], ['Tenant Detail business address'], 'text', ''),
            field('businessStreetAddress', ['addressInformation.businessAddress.streetAddress', 'addressInformation.businessAddress.address', 'businessStreetAddress', 'businessAddress'], ['Tenant Detail business address'], 'text', ''),
            field('businessBuildingNumber', ['addressInformation.businessAddress.buildingNumber', 'businessBuildingNumber'], ['Tenant Detail business address'], 'text', ''),
            field('businessPostalCode', ['addressInformation.businessAddress.postalCode', 'businessPostalCode'], ['Tenant Detail business address'], 'text', ''),
            field('contact', ['contactPersons.contacts.0.fullName', 'contactPersons.contacts.0.name', 'contactName', 'primaryContact', 'contact.name'], ['Tenant Detail contacts'], 'text', '—'),
            field('email', ['primaryContact.email', 'contactEmail', 'email', 'contact.email'], ['Tenant Detail contacts'], 'email', '—'),
            field('phone', ['contactPersons.contacts.0.mobilePhone', 'contactPersons.contacts.0.phone', 'contactPhone', 'phone', 'contact.phone'], ['Tenant Detail contacts'], 'phone', '—'),
            field('tenantCategory', ['tenantClassification.tenantCategory', 'generalInformation.businessCategory', 'category', 'businessArea', 'tenantCategory'], ['Tenant Detail classification'], 'text', ''),
            field('accountTier', ['tenantClassification.accountTier', 'servicePlan', 'supportTier', 'tier'], ['Tenant Detail classification'], 'text', ''),
            field('tenantPriority', ['tenantClassification.tenantPriority', 'tenantClassification.priority', 'tenantPriority', 'priority'], ['Tenant Detail classification'], 'text', ''),
            field('riskCategory', ['tenantClassification.riskCategory', 'risk', 'riskLevel'], ['Tenant Detail classification'], 'text', ''),
            field('acquisitionSource', ['tenantClassification.acquisitionSource', 'acquisitionSource'], ['Tenant Detail classification'], 'text', ''),
            field('preferredLanguage', ['communicationPreferences.preferredLanguage', 'preferredLanguage'], ['Tenant Detail communication preferences'], 'text', ''),
            field('preferredTimeZone', ['communicationPreferences.preferredTimeZone', 'communicationPreferences.timezone', 'preferredTimeZone', 'timezone'], ['Tenant Detail communication preferences'], 'text', ''),
            field('preferredCommunicationChannel', ['communicationPreferences.preferredCommunicationChannel', 'communicationPreferences.communicationChannel', 'preferredCommunicationChannel', 'communicationChannel'], ['Tenant Detail communication preferences'], 'text', ''),
            field('businessHours', ['communicationPreferences.businessHours', 'businessHours'], ['Tenant Detail communication preferences'], 'text', ''),
            field('receivePlatformNotifications', ['communicationPreferences.receivePlatformNotifications', 'communicationPreferences.platformNotifications', 'receivePlatformNotifications', 'platformNotifications'], ['Tenant Detail communication preferences'], 'boolean', ''),
            field('receiveServiceNotifications', ['communicationPreferences.receiveServiceNotifications', 'communicationPreferences.serviceNotifications', 'receiveServiceNotifications', 'serviceNotifications'], ['Tenant Detail communication preferences'], 'boolean', ''),
            field('receiveInvoiceNotifications', ['communicationPreferences.receiveInvoiceNotifications', 'communicationPreferences.invoiceNotifications', 'receiveInvoiceNotifications', 'invoiceNotifications'], ['Tenant Detail communication preferences'], 'boolean', ''),
            field('receiveSecurityNotifications', ['communicationPreferences.receiveSecurityNotifications', 'communicationPreferences.securityNotifications', 'receiveSecurityNotifications', 'securityNotifications'], ['Tenant Detail communication preferences'], 'boolean', ''),
            field('notificationRecipients', ['communicationPreferences.notificationRecipients', 'notificationRecipients'], ['Tenant Detail communication preferences'], 'raw', ''),
            field('dataProcessingAgreement', ['legalCompliance.dataProcessingAgreement', 'legalCompliance.dataProcessingAgreementStatus', 'dataProcessingAgreement', 'dataProcessingAgreementStatus'], ['Tenant Detail legal compliance'], 'status', ''),
            field('ndaStatus', ['legalCompliance.ndaStatus', 'ndaStatus'], ['Tenant Detail legal compliance'], 'status', ''),
            field('complianceStatus', ['legalCompliance.complianceStatus', 'compliance', 'complianceStatus', 'certificationState'], ['Tenant Detail legal compliance'], 'status', ''),
            field('confidentialityLevel', ['legalCompliance.confidentialityLevel', 'confidentialityLevel'], ['Tenant Detail legal compliance'], 'text', ''),
            field('dataControllerType', ['legalCompliance.dataControllerType', 'dataControllerType'], ['Tenant Detail legal compliance'], 'text', ''),
            field('consentStatus', ['legalCompliance.consentStatus', 'consentStatus'], ['Tenant Detail legal compliance'], 'status', ''),
            field('consentExpiryDate', ['legalCompliance.consentExpiryDate', 'consentExpiryDate'], ['Tenant Detail legal compliance'], 'date', ''),
            field('documents', ['legalCompliance.documents', 'documents'], ['Tenant Detail documents'], 'raw', ''),
            field('notes', ['generalInformation.notes', 'addressInformation.notes', 'contactPersons.notes', 'tenantClassification.notes', 'communicationPreferences.notes', 'legalCompliance.notes'], ['Tenant Detail notes'], 'raw', ''),
            field('createdAt', ['createdAtUtc'], ['Tenant Detail source/freshness'], 'date', 'No backend timestamp'),
            field('updatedAt', ['updatedAtUtc'], ['Tenant Registry updated', 'Tenant Detail source/freshness'], 'date', 'createdAtUtc')
        ],
        plants: [
            field('id', ['id', 'plantId', 'canonicalId', 'adminRecord.id'], ['Plant Registry row ID', 'Plant Detail identity'], 'identifier', '—', 'error'),
            field('plantCode', ['plantCode', 'sourcePlantId', 'code', 'adminRecord.plantCode', 'vendorExtensions.plantCode'], ['Plant Registry code', 'Plant Detail code'], 'identifier', '—'),
            field('plantName', ['adminName', 'liveName', 'technical.plantName', 'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'sourceEntityName', 'name', 'adminRecord.plantName', 'adminRecord.technical.plantName', 'liveRecord.plantName'], ['Plant Registry name', 'Plant Detail heading'], 'text', '—', 'error'),
            field('provider', ['providerData.provider', 'provider', 'providerType', 'providerName', 'vendor', 'vendorName', 'sourceScheme', 'sourceSystem', 'source.provider', 'source.vendor', 'integration.provider', 'adminRecord.provider', 'adminRecord.providerType', 'adminRecord.providerName', 'adminRecord.vendor', 'adminRecord.vendorName', 'adminRecord.sourceScheme', 'adminRecord.sourceSystem', 'vendorPlatform.sourceScheme', 'adminRecord.vendorPlatform.sourceScheme'], ['Plant Registry provider', 'Plant Detail source'], 'text', '—', 'warning'),
            field('clientId', ['clientAssignment.clientId', 'operationalData.clientId', 'clientId', 'ClientId', 'client.id', 'client.clientId', 'owner.id', 'owner.clientId', 'adminRecord.clientId', 'adminRecord.ClientId', 'adminRecord.client.id'], ['Plant Detail client relation'], 'relation', ''),
            field('client', ['clientAssignment.client.name', 'clientAssignment.client.clientName', 'clientAssignment.client.code', 'clientAssignment.client', 'operationalData.clientName', 'client.name', 'client.clientName', 'client.code', 'client', 'Client', 'clientName', 'owner.name', 'owner.clientName', 'adminRecord.client.name', 'adminRecord.client.clientName', 'adminRecord.client.code', 'adminRecord.client', 'adminRecord.Client'], ['Plant Registry owner', 'Plant Detail client'], 'relation', '—'),
            field('managingTenant', ['clientAssignment.managingTenant.name', 'clientAssignment.managingTenant.tenantName', 'clientAssignment.managingTenant.code', 'clientAssignment.managingTenant.id', 'clientAssignment.managingTenant', 'clientAssignment.managingTenantId', 'operationalData.tenantName', 'operationalData.tenantId', 'managingTenant.name', 'managingTenant.tenantName', 'managingTenant.code', 'managingTenant.id', 'managingTenant', 'managingTenantId', 'tenant.name', 'tenant.tenantName', 'tenant.code', 'tenant.id', 'tenantName', 'tenant', 'operator.name', 'operator.id', 'adminRecord.managingTenant.name', 'adminRecord.managingTenant.tenantName', 'adminRecord.managingTenant.code', 'adminRecord.managingTenant.id', 'adminRecord.managingTenant', 'adminRecord.managingTenantId'], ['Plant Registry tenant', 'Plant Detail operator'], 'relation', '—'),
            field('recordStatus', ['vendorPlatform.recordStatus', 'recordStatus', 'lifecycleStatus', 'lifecycle.status', 'status', 'adminRecord.vendorPlatform.recordStatus', 'adminRecord.recordStatus', 'adminRecord.lifecycleStatus', 'adminRecord.lifecycle.status'], ['Plant Registry status', 'Plant Detail lifecycle'], 'status', '—'),
            field('plantType', ['plantType', 'technical.plantType', 'type', 'adminRecord.plantType', 'adminRecord.technical.plantType'], ['Plant Registry type', 'Plant Detail type'], 'text', '—'),
            field('countryRegion', ['location.countryRegion', 'location.country', 'countryRegion', 'country', 'vendorExtensions.country', 'adminRecord.location.countryRegion', 'adminRecord.location.country', 'adminRecord.countryRegion'], ['Plant Registry country', 'Plant Detail location'], 'text', '—'),
            field('region', ['location.region', 'location.stateRegion', 'region', 'vendorExtensions.region', 'adminRecord.location.region', 'adminRecord.location.stateRegion', 'adminRecord.region'], ['Plant Detail location'], 'text', '—'),
            field('city', ['location.city', 'city', 'vendorExtensions.city', 'adminRecord.location.city', 'adminRecord.city'], ['Plant Detail location'], 'text', '—'),
            field('address', ['location.address', 'location.street', 'location.detailedAddress', 'address', 'detailedAddress', 'vendorExtensions.address', 'adminRecord.location.address', 'adminRecord.location.street', 'adminRecord.location.detailedAddress', 'adminRecord.address'], ['Plant Detail location'], 'text', ''),
            field('latitude', ['location.latitude', 'location.lat', 'latitude', 'lat', 'vendorExtensions.latitude', 'adminRecord.location.latitude', 'adminRecord.location.lat'], ['Plant Detail coordinates'], 'text', ''),
            field('longitude', ['location.longitude', 'location.lng', 'longitude', 'lng', 'vendorExtensions.longitude', 'adminRecord.location.longitude', 'adminRecord.location.lng'], ['Plant Detail coordinates'], 'text', ''),
            field('creationMode', ['vendorPlatform.creationMode', 'creationMode', 'adminRecord.vendorPlatform.creationMode', 'adminRecord.creationMode'], ['Plant Detail source & sync'], 'text', ''),
            field('plantTimeZone', ['location.plantTimeZone', 'location.timezone', 'location.timeZone', 'plantTimeZone', 'timezone', 'vendorExtensions.timezone', 'adminRecord.location.timezone', 'adminRecord.location.timeZone', 'adminRecord.plantTimeZone'], ['Plant Detail timezone'], 'text', '—'),
            field('devicesCount', ['operationalData.deviceCount', 'devicesCount', 'vendorExtensions.devicesCount', 'adminRecord.devicesCount', 'vendorExtensions.onlineDeviceCount', 'devices'], ['Plant Registry devices', 'Plant Detail devices KPI'], 'count', '0'),
            field('alertsCount', ['operationalData.openAlertCount', 'alertsCount', 'vendorExtensions.alertsCount', 'vendorExtensions.alarmCount'], ['Plant Registry alerts', 'Plant Detail alerts KPI'], 'count', '0'),
            field('currentPowerKw', ['operationalData.currentPowerKw', 'providerData.currentPowerKw', 'currentPowerKw', 'liveRecord.currentPowerKw'], ['Plant Registry live power', 'Plant Detail telemetry'], 'power', '—'),
            field('installedPowerKw', ['technical.installedPowerKw', 'operationalData.installedCapacityKwp', 'installedPowerKw', 'adminRecord.technical.installedPowerKw', 'adminRecord.installedPowerKw'], ['Plant Detail installed capacity'], 'power', '0'),
            field('todayEnergyKwh', ['operationalData.todayEnergyKwh', 'todayEnergyKwh', 'liveRecord.todayEnergyKwh'], ['Plant Registry today energy', 'Plant Detail telemetry'], 'energy', '—'),
            field('totalEnergyKwh', ['operationalData.totalEnergyKwh', 'totalEnergyKwh', 'liveRecord.totalEnergyKwh'], ['Plant Detail lifetime energy'], 'energy', '—'),
            field('lastDataAt', ['operationalData.lastDataAtUtc', 'lastDataAtUtc', 'lastDataAt', 'lastSyncAt', 'liveRecord.lastDataAt'], ['Plant Registry freshness', 'Plant Detail telemetry freshness'], 'date', 'No live data'),
            field('dataQualityStatus', ['operationalData.dataQualityStatus', 'dataQualityStatus', 'liveRecord.dataQualityStatus'], ['Plant Registry quality', 'Plant Detail freshness'], 'status', '—'),
            field('batteryCapacityKwh', ['technical.batteryCapacityKwh', 'operationalData.batteryCapacityKwh', 'batteryCapacityKwh', 'vendorExtensions.batteryCapacityKwh'], ['Plant Detail storage metadata'], 'energy', '—'),
            field('monthlyYieldKwh', ['vendorExtensions.monthlyYieldKwh'], ['Plant Detail telemetry metadata'], 'energy', '—'),
            field('yearlyYieldKwh', ['vendorExtensions.yearlyYieldKwh'], ['Plant Detail telemetry metadata'], 'energy', '—'),
            field('warningCount', ['vendorExtensions.warningCount'], ['Plant Detail alert metadata'], 'count', '0'),
            field('offlineDeviceCount', ['vendorExtensions.offlineDeviceCount'], ['Plant Detail device metadata'], 'count', '0'),
            field('createdAt', ['createdAtUtc', 'adminRecord.createdAtUtc'], ['Plant Detail source/freshness'], 'date', '—'),
            field('updatedAt', ['updatedAtUtc', 'adminRecord.updatedAtUtc'], ['Plant Registry updated', 'Plant Detail source/freshness'], 'date', 'createdAtUtc'),
            field('sourcePlantId', ['providerData.sourceEntityId', 'providerData.sourcePlantCode', 'providerData.sourcePlantId', 'sourcePlantId'], ['Plant Detail source identity', 'Provider assignment resolution'], 'identifier', ''),
            field('canonicalPlantId', ['operationalData.canonicalPlantId', 'canonicalPlantId', 'liveRecord.id'], ['Plant Detail canonical / Platform Live identity'], 'identifier', ''),
            field('providerAccount', ['providerData.providerAccount', 'providerAccount'], ['Plant Detail source & sync'], 'identifier', ''),
            field('providerStatus', ['providerData.providerStatus'], ['Plant Detail provider status'], 'status', ''),
            field('operationalStatus', ['operationalData.status', 'providerData.providerStatus', 'operationalStatus', 'liveRecord.status'], ['Plant Detail operational health'], 'status', ''),
            field('communicationStatus', ['operationalData.communicationStatus', 'communicationStatus'], ['Plant Detail operational connectivity'], 'status', ''),
            field('dataFreshness', ['operationalData.dataFreshness', 'vendorExtensions.dataFreshness', 'dataFreshness'], ['Plant Detail source/freshness'], 'status', ''),
            field('lastSyncAt', ['operationalData.lastSyncAtUtc', 'providerData.lastSyncAtUtc', 'lastSyncAtUtc', 'lastSyncAt', 'liveRecord.lastSyncAt'], ['Plant Detail source/freshness'], 'date', ''),
            field('capacityDc', ['technical.installedCapacityDcMw', 'technical.installedPowerKw', 'operationalData.installedCapacityKwp', 'installedCapacityDcMw', 'installedPowerKw'], ['Plant Detail installed DC capacity'], 'power', ''),
            field('capacityAc', ['technical.installedCapacityAcMw', 'installedCapacityAcMw', 'capacityAcMw', 'capacityAc'], ['Plant Detail installed AC capacity'], 'power', ''),
            field('gridCapacity', ['technical.gridConnectionCapacityMw', 'gridConnectionCapacityMw', 'gridCapacityMw', 'gridCapacity'], ['Plant Detail grid capacity'], 'power', ''),
            field('commissioningDate', ['technical.commissioningDate', 'commissioningDate'], ['Plant Detail commissioning'], 'date', ''),
            field('serviceProvider', ['technical.serviceProvider', 'commercial.serviceProvider', 'serviceProvider', 'omProvider'], ['Plant Detail O&M provider'], 'relation', ''),
            field('payloadStrategy', ['vendorPlatform.payloadStrategy', 'payloadStrategy', 'adminRecord.vendorPlatform.payloadStrategy'], ['Plant Detail source diagnostics'], 'text', ''),
            field('rawPayloadRef', ['providerData.rawPayloadRef', 'rawPayloadRef'], ['Plant Detail raw payload diagnostics'], 'raw', ''),
            field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.sourceSystem', 'vendorExtensions.sourceEntityType', 'vendorExtensions.communicationStatus', 'vendorExtensions.canonicalSource', 'providerData.extensions', 'technical.company', 'technical.evChargerOnlyPlant', 'technical.gridConnectionType', 'technical.tilt', 'technical.azimuth', 'technical.externalReference', 'technical.plantOverview', 'commercial.currency', 'commercial.unitPrice', 'commercial.tariffType', 'commercial.totalCost', 'commercial.subsidy', 'commercial.dailyRepayment', 'commercial.ownerEmail', 'stringCapacity.stringCapacities', 'otherInfo.plantLogoFileName', 'otherInfo.safeRunningStartDate', 'otherInfo.totalYieldStatistics', 'documents'], ['Raw payload diagnostics'], 'raw', '')
        ],
        devices: [
            field('id', ['id', 'deviceId', 'canonicalId'], ['Device Registry row ID', 'Device Detail identity'], 'identifier', '—', 'error'),
            field('provider', ['source.provider', 'provider', 'vendorExtensions.provider'], ['Device Registry provider', 'Device Detail source'], 'text', '—', 'warning'),
            field('sourceDeviceId', ['source.sourceDeviceId', 'sourceDeviceId', 'identity.deviceCode', 'deviceCode', 'deviceId', 'serialNumber'], ['Device Registry code', 'Device Detail external ID'], 'identifier', '—', 'error'),
            field('sourcePlantId', ['plantRelation.plantId', 'sourcePlantId', 'plantId', 'vendorExtensions.sourcePlantId'], ['Device Registry plant relation', 'Device Detail plant'], 'relation', '—', 'warning'),
            field('deviceName', ['identity.deviceName', 'vendorExtensions.deviceName', 'vendorExtensions.equipmentName', 'vendorExtensions.displayName', 'vendorExtensions.name', 'sourceDeviceName', 'deviceName', 'equipmentName', 'displayName', 'sourceEntityName', 'name'], ['Device Registry name', 'Device Detail heading'], 'text', '—', 'error'),
            field('deviceType', ['identity.deviceType', 'deviceType', 'vendorExtensions.deviceType', 'vendorExtensions.rawDeviceType', 'type'], ['Device Registry type', 'Device Detail type'], 'text', '—'),
            field('manufacturer', ['identity.manufacturer', 'manufacturer'], ['Device Detail manufacturer'], 'text', ''),
            field('subtype', ['specification.inverterCategory', 'specification.deviceCategory', 'vendorExtensions.subtype', 'subtype', 'vendorExtensions.rawDeviceType'], ['Device Detail subtype'], 'text', ''),
            field('status', ['status.operationalStatus', 'operationalStatus', 'status', 'vendorExtensions.onlineStatus', 'vendorExtensions.rawStatus'], ['Device Registry status', 'Device Detail status'], 'status', '—'),
            field('serialNumber', ['identity.serialNumber', 'serialNumber'], ['Device Registry serial', 'Device Detail serial'], 'identifier', '—'),
            field('plantName', ['plantRelation.plantName', 'plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName', 'vendorExtensions.stationName'], ['Device Registry plant', 'Device Detail plant'], 'relation', '—'),
            field('tenantId', ['plantRelation.tenantId', 'tenantId'], ['Device Registry tenant relation', 'Device Detail tenant'], 'relation', ''),
            field('tenant', ['plantRelation.tenantName', 'plantRelation.managingTenant', 'tenant', 'tenantName', 'managingTenant', 'vendorExtensions.tenantName'], ['Device Registry tenant relation', 'Device Detail tenant'], 'relation', ''),
            field('integration', ['source.integration', 'integration', 'integrationName', 'sourceIntegrationName'], ['Device Detail source'], 'relation', ''),
            field('lastSeenAt', ['telemetry.lastSeenAtUtc', 'lastSeenAtUtc', 'lastSeenAt', 'vendorExtensions.collectionTime', 'collectionTime'], ['Device Registry last seen', 'Device Detail freshness'], 'date', 'No live data'),
            field('lastSyncAt', ['lastSyncAt', 'vendorExtensions.collectionTime', 'collectionTime'], ['Device Detail sync metadata'], 'date', 'No sync'),
            field('dataQualityStatus', ['status.dataQualityStatus', 'dataQualityStatus', 'vendorExtensions.dataFreshness'], ['Device Registry data quality', 'Device Detail source status'], 'status', '—'),
            field('alarmStatus', ['vendorExtensions.alarmStatus', 'alarmStatus'], ['Device Detail alarm state'], 'status', '—'),
            field('alertsCount', ['alertsCount', 'vendorExtensions.alertsCount'], ['Device Registry alerts', 'Device Detail alerts'], 'count', ''),
            field('vendorModel', ['identity.model', 'technical.vendorModel', 'vendorModel', 'vendorExtensions.vendorModel', 'vendorExtensions.model', 'model'], ['Device Registry model', 'Device Detail model'], 'text', '—'),
            field('productModel', ['vendorExtensions.productModel'], ['Device Detail product model'], 'text', '—'),
            field('productId', ['vendorExtensions.productId', 'productId'], ['Device Detail source identity'], 'identifier', ''),
            field('ratedPowerKw', ['specification.ratedActivePowerKw', 'technical.ratedPowerKw', 'vendorExtensions.ratedPowerKw', 'ratedPowerKw'], ['Device Registry capacity', 'Device Detail rated power'], 'power', '—'),
            field('firmwareVersion', ['technical.firmwareVersion', 'firmwareVersion', 'vendorExtensions.firmwareVersion', 'vendorExtensions.firmware'], ['Device Registry firmware', 'Device Detail firmware'], 'text', '—'),
            field('protocolVersion', ['technical.protocolVersion', 'communication.protocol', 'vendorExtensions.protocolVersion', 'protocolVersion', 'protocol'], ['Device Detail protocol'], 'text', '—'),
            field('parentDeviceId', ['topology.parentDeviceId', 'parentRelation.parentDeviceId', 'vendorExtensions.parentDeviceId', 'parentDeviceId'], ['Device Detail topology'], 'relation', '—'),
            field('parentDeviceName', ['topology.parentDeviceName', 'parentRelation.parentDeviceName', 'parentDeviceName', 'vendorExtensions.parent'], ['Device Detail topology'], 'relation', ''),
            field('childCount', ['topology.childCount', 'childCount', 'vendorExtensions.childCount', 'vendorExtensions.children', 'children'], ['Device Detail topology'], 'count', ''),
            field('connectivityStatus', ['vendorExtensions.connectStatus', 'connectStatus', 'connectivityStatus'], ['Device Detail connectivity'], 'status', ''),
            field('collectionTime', ['vendorExtensions.collectionTime', 'collectionTime'], ['Device Detail source/freshness'], 'date', ''),
            field('sourceSystem', ['source.provider', 'vendorExtensions.sourceSystem', 'sourceSystem'], ['Device Detail source'], 'text', 'Provider'),
            field('rawPayloadRef', ['vendorExtensions.rawPayloadRef', 'rawPayloadRef'], ['Device Detail source diagnostics'], 'raw', ''),
            field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.sourceEntityType', 'vendorExtensions.canonicalSource', 'deviceCode', 'identity.deviceCode', 'status.deviceStatus', 'technical.role', 'locationRelation.locationId', 'lifecycle.installDate', 'lifecycle.commissionedAt', 'lifecycle.warrantyExpiresAt', 'relations.protectionRelayDeviceId', 'relations.stringId', 'relations.mpptId', 'linkedDevices', 'documents', 'auditHistory'], ['Raw payload diagnostics'], 'raw', '')
        ],
        alerts: [
            field('id', ['id', 'alertId'], ['Alert Registry row ID', 'Alert Detail identity'], 'identifier', '—', 'error'),
            field('provider', ['vendor.provider', 'provider'], ['Alert Registry provider', 'Alert Detail source'], 'text', '—', 'warning'),
            field('sourceAlertId', ['vendor.sourceAlertId', 'sourceAlertId', 'vendorRawCode', 'vendorExtensions.alarmCode'], ['Alert Registry vendor code', 'Alert Detail source code'], 'identifier', '—', 'error'),
            field('zentridCode', ['canonical.canonicalCode', 'canonicalCode', 'zentridCode', 'vendorExtensions.zentridCode'], ['Alert Registry canonical code', 'Alert Detail canonical code'], 'identifier', ''),
            field('sourcePlantId', ['plant.sourcePlantId', 'sourcePlantId'], ['Alert Registry source plant relation', 'Alert Detail source plant'], 'relation', '—'),
            field('sourceDeviceId', ['device.sourceDeviceId', 'sourceDeviceId', 'vendorExtensions.deviceSn'], ['Alert Registry source device relation', 'Alert Detail source device'], 'relation', '—'),
            field('plantId', ['plant.plantId', 'plantId'], ['Alert Registry canonical plant relation', 'Alert Detail plant'], 'relation', ''),
            field('deviceId', ['device.deviceId', 'deviceId'], ['Alert Registry canonical device relation', 'Alert Detail device'], 'relation', ''),
            field('plantName', ['plant.plantName', 'plantName', 'sourcePlantName', 'plant', 'vendorExtensions.plantName'], ['Alert Registry plant', 'Alert Detail plant'], 'relation', '—'),
            field('deviceName', ['device.deviceName', 'deviceName', 'device', 'vendorExtensions.deviceName'], ['Alert Registry device', 'Alert Detail device'], 'relation', '—'),
            field('tenantId', ['tenant.tenantId', 'tenantId'], ['Alert Registry tenant relation', 'Alert Detail tenant'], 'relation', ''),
            field('tenant', ['tenant.tenantName', 'tenant'], ['Alert Registry tenant relation', 'Alert Detail tenant'], 'relation', ''),
            field('title', ['canonical.canonicalName', 'canonicalName', 'title', 'guidance.description', 'vendor.vendorMessage', 'vendorMessage', 'vendorExtensions.alertName', 'sourceAlertName', 'alertName', 'name'], ['Alert Registry title', 'Alert Detail heading'], 'text', '—', 'error'),
            field('message', ['guidance.description', 'vendor.vendorMessage', 'vendorMessage', 'message'], ['Alert Registry message', 'Alert Detail description'], 'text', '—'),
            field('canonicalCategory', ['canonical.canonicalCategory', 'canonicalCategory', 'category'], ['Alert Registry canonical category', 'Alert Detail category'], 'text', ''),
            field('severity', ['canonical.canonicalSeverity', 'canonicalSeverity', 'severity', 'vendorSeverity'], ['Alert Registry severity', 'Alert Detail severity'], 'status', '—', 'warning'),
            field('vendorSeverity', ['vendor.vendorSeverity', 'vendorSeverity'], ['Alert Detail source severity'], 'status', ''),
            field('status', ['workflow.status', 'status'], ['Alert Registry status', 'Alert Detail status'], 'status', '—'),
            field('priority', ['workflow.priority', 'priority'], ['Alert Registry priority', 'Alert Detail workflow'], 'status', ''),
            field('occurrenceStatus', ['workflow.occurrenceStatus', 'occurrenceStatus'], ['Alert Detail workflow'], 'status', ''),
            field('occurredAtUtc', ['workflow.occurredAtUtc', 'occurredAtUtc', 'created'], ['Alert Registry occurred', 'Alert Detail timeline'], 'date', 'No occurrence time'),
            field('lastSyncAt', ['workflow.lastSyncAtUtc', 'lastSyncAt', 'updated'], ['Alert Registry updated', 'Alert Detail timeline'], 'date', 'No sync'),
            field('created', ['created', 'workflow.occurredAtUtc', 'occurredAtUtc'], ['Alert Detail timeline'], 'date', ''),
            field('updated', ['updated', 'audit.updatedAtUtc', 'workflow.lastSyncAtUtc', 'lastSyncAt'], ['Alert Detail timeline'], 'date', ''),
            field('alarmType', ['canonical.canonicalCategory', 'canonicalCategory', 'category', 'vendorExtensions.alarmType', 'vendorExtensions.category'], ['Alert Registry category', 'Alert Detail category'], 'text', '—'),
            field('reason', ['guidance.probableCause', 'probableCause', 'vendorExtensions.reason', 'vendorExtensions.probableCause'], ['Alert Detail probable cause'], 'text', 'No backend probable cause'),
            field('solution', ['guidance.recommendation', 'recommendation', 'solution', 'vendorExtensions.suggestion', 'vendorExtensions.solution', 'vendorExtensions.recommendation'], ['Alert Detail recommendation'], 'text', 'Review source data'),
            field('mappingStatus', ['mapping.mappingStatus', 'mappingStatus'], ['Alert Detail mapping diagnostics'], 'status', ''),
            field('source', ['vendor.sourceSystem', 'source', 'vendor.provider', 'provider'], ['Alert Detail source'], 'text', ''),
            field('owner', ['assignment.assigneeName', 'owner'], ['Alert Detail assignment'], 'text', ''),
            field('sla', ['sla.text', 'sla.status', 'sla'], ['Alert Detail SLA'], 'text', ''),
            field('acknowledgedAtUtc', ['vendorExtensions.acknowledgedAtUtc'], ['Alert Detail timeline metadata'], 'date', '—'),
            field('sourceMetadata', ['vendorExtensions.runId', 'vendorExtensions.ordinal', 'vendorExtensions.seedMode', 'vendorExtensions.canonicalSource'], ['Raw payload diagnostics'], 'raw', '')
        ],
        telemetry: [
            field('id', ['id', 'telemetryId', 'metricId', 'canonicalId', 'sourceEntityId', 'telemetry.id', 'measurement.id', 'reading.id', 'data.id', 'payload.id'], ['Telemetry record identity', 'Raw payload diagnostics'], 'identifier', ''),
            field('metric', ['metricCode', 'metricName', 'metric.name', 'metric.key', 'metric.code', 'measurement.name', 'measurement.metricName', 'reading.metricName', 'telemetry.metricName', 'data.metricName', 'payload.metricName', 'name', 'key', 'parameter', 'measurementName', 'field', 'metric'], ['Telemetry metric label', 'Telemetry filters'], 'text', '—', 'warning'),
            field('value', ['value.value', 'measurement.value', 'reading.value', 'telemetry.value', 'data.value', 'payload.value', 'metric.value', 'latest.value', 'point.value', 'sample.value', 'metricValue', 'numericValue', 'textValue', 'booleanValue', 'currentValue', 'rawValue', 'reading', 'value'], ['Telemetry value', 'Telemetry stream preview'], 'raw', '—', 'warning'),
            field('unit', ['value.unit', 'measurement.unit', 'reading.unit', 'telemetry.unit', 'data.unit', 'payload.unit', 'metric.unit', 'latest.unit', 'point.unit', 'sample.unit', 'unit', 'unitSymbol', 'uom', 'measurementUnit'], ['Telemetry value unit', 'Telemetry stream preview'], 'text', ''),
            field('timestamp', ['measurement.timestamp', 'measurement.measuredAtUtc', 'reading.timestamp', 'reading.measuredAtUtc', 'telemetry.timestamp', 'data.timestamp', 'payload.timestamp', 'latest.timestamp', 'point.timestamp', 'sample.timestamp', 'timestampUtc', 'timestamp', 'occurredAtUtc', 'measuredAtUtc', 'recordedAtUtc', 'collectedAtUtc', 'capturedAtUtc', 'createdAtUtc', 'lastDataAt', 'lastSyncAt'], ['Telemetry timestamp', 'Telemetry freshness'], 'date', 'No timestamp'),
            field('quality', ['quality.status', 'measurement.quality', 'reading.quality', 'telemetry.quality', 'data.quality', 'payload.quality', 'dataQualityStatus', 'quality', 'qualityStatus', 'freshness', 'status'], ['Telemetry quality', 'Telemetry freshness'], 'status', '—'),
            field('provider', ['source.provider', 'source.vendor', 'source.system', 'integration.provider', 'telemetry.provider', 'data.provider', 'payload.provider', 'provider', 'vendor', 'sourceSystem', 'providerName', 'vendorExtensions.provider'], ['Telemetry source provider'], 'text', '—'),
            field('tenantId', ['tenant.id', 'tenant.tenantId', 'telemetry.tenantId', 'data.tenantId', 'payload.tenantId', 'tenantId', 'sourceTenantId'], ['Telemetry tenant relation'], 'relation', ''),
            field('tenantName', ['tenant.name', 'tenant.tenantName', 'telemetry.tenantName', 'data.tenantName', 'payload.tenantName', 'tenantName', 'tenant', 'managingTenant', 'vendorExtensions.tenantName'], ['Telemetry tenant relation'], 'relation', '—'),
            field('plantId', ['plant.id', 'plant.plantId', 'plant.sourcePlantId', 'telemetry.plantId', 'data.plantId', 'payload.plantId', 'sourcePlantId', 'plantId'], ['Telemetry plant relation'], 'relation', ''),
            field('plantName', ['plant.name', 'plant.plantName', 'plant.stationName', 'telemetry.plantName', 'data.plantName', 'payload.plantName', 'plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName'], ['Telemetry plant relation'], 'relation', '—'),
            field('deviceId', ['device.id', 'device.deviceId', 'device.sourceDeviceId', 'device.serialNumber', 'telemetry.deviceId', 'data.deviceId', 'payload.deviceId', 'sourceDeviceId', 'deviceId', 'serialNumber'], ['Telemetry device relation'], 'relation', ''),
            field('deviceName', ['device.name', 'device.deviceName', 'device.equipmentName', 'telemetry.deviceName', 'data.deviceName', 'payload.deviceName', 'deviceName', 'sourceDeviceName', 'equipmentName', 'vendorExtensions.deviceName'], ['Telemetry device relation'], 'relation', '—'),
            field('deviceType', ['device.type', 'device.deviceType', 'telemetry.deviceType', 'data.deviceType', 'payload.deviceType', 'deviceType', 'type', 'vendorExtensions.deviceType'], ['Telemetry device type'], 'text', '—'),
            field('granularity', ['granularity', 'aggregationGranularity', 'interval'], ['Telemetry filters', 'Telemetry stream metadata'], 'text', ''),
            field('sourceMetadata', ['metadata', 'tags', 'dimensions', 'source', 'vendorExtensions', 'telemetry.metadata', 'data.metadata', 'payload.metadata'], ['Raw payload diagnostics'], 'raw', '')
        ],
        integrations: [
            field('id', ['id', 'integrationId'], ['Integration Registry row ID', 'Integration Detail identity'], 'identifier', 'Provider-derived live ID'),
            field('integrationCode', ['integrationCode', 'code'], ['Integration Registry code', 'Integration Detail code'], 'identifier', 'Generated live code'),
            field('integrationName', ['integrationName', 'displayName', 'name', 'vendorExtensions.displayName', 'vendorExtensions.integrationName', 'connector.displayName', 'connector.name', 'integration.displayName', 'integration.name', 'providerIntegration.displayName', 'provider', 'providerType', 'providerName', 'vendorName', 'vendorExtensions.provider'], ['Integration Registry name', 'Integration Detail heading'], 'text', 'Provider', 'warning'),
            field('provider', ['provider', 'providerType', 'providerName', 'vendorName', 'vendor', 'producerVendorTemplate', 'vendorExtensions.provider', 'vendorExtensions.providerType', 'vendorExtensions.providerName', 'vendorExtensions.vendorName', 'source.provider', 'source.vendor', 'connector.provider', 'connector.vendor', 'integration.provider', 'integration.vendor', 'providerIntegration.providerType', 'sourceScheme'], ['Integration Registry provider', 'Integration Detail vendor'], 'text', '—', 'error'),
            field('producerVendorTemplate', ['producerVendorTemplate'], ['Integration Detail template'], 'text', '—'),
            field('integrationStatus', ['integrationStatus', 'status', 'vendorExtensions.status', 'vendorExtensions.integrationStatus', 'health', 'healthStatus', 'connectionStatus', 'lifecycleStatus', 'state', 'connector.status', 'integration.status', 'providerIntegration.status'], ['Integration Registry status', 'Integration Detail lifecycle'], 'status', '—', 'warning'),
            field('plantsCount', ['plantsCount', 'plantCount', 'plants', 'vendorExtensions.plantsCount'], ['Integration Registry plants KPI', 'Integration Detail discovery'], 'count', '0'),
            field('plantsWithDataCount', ['plantsWithDataCount', 'vendorExtensions.plantsWithDataCount'], ['Integration operational coverage'], 'count', '0'),
            field('plantsWithoutDataCount', ['plantsWithoutDataCount', 'vendorExtensions.plantsWithoutDataCount'], ['Integration operational coverage'], 'count', '0'),
            field('stalePlantsCount', ['stalePlantsCount', 'vendorExtensions.stalePlantsCount'], ['Integration operational health'], 'count', '0'),
            field('devicesCount', ['devicesCount', 'deviceCount', 'devices', 'vendorExtensions.devicesCount'], ['Integration Registry devices KPI', 'Integration Detail discovery'], 'count', '0'),
            field('alertsCount', ['alertsCount', 'alertCount', 'alerts', 'vendorExtensions.activeAlertsCount'], ['Integration Registry alerts KPI', 'Integration Detail discovery'], 'count', '0'),
            field('errorRatePct', ['errorRatePct'], ['Raw backend integration metric; semantics must be verified before UX interpretation'], 'count', '0'),
            field('lastSyncAtUtc', ['lastSyncAtUtc'], ['Integration Registry last sync', 'Integration Detail freshness'], 'date', 'No sync'),
            field('lastSyncText', ['lastSyncText'], ['Integration Registry last activity'], 'text', 'No data'),
            field('lastErrorMessage', ['lastErrorMessage'], ['Integration Detail last error'], 'text', ''),
            field('createdAtUtc', ['createdAtUtc'], ['Integration Detail created'], 'date', '—'),
            field('updatedAtUtc', ['updatedAtUtc'], ['Integration Detail updated'], 'date', 'createdAtUtc'),
            field('sourceMetadata', ['vendorExtensions.provider', 'vendorExtensions.displayName'], ['Raw payload diagnostics'], 'raw', '')
        ]
    };
    const fieldAuditRecords = new Map();
    function flattenLeafPaths(value, prefix = '', output = []) {
        if (!isRecord(value))
            return output;
        Object.entries(value).forEach(([key, child]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (isRecord(child))
                flattenLeafPaths(child, path, output);
            else
                output.push(path);
        });
        return output;
    }
    function aliasCoversPath(alias, path) {
        return alias === path || path.startsWith(`${alias}.`) || alias.startsWith(`${path}.`);
    }
    function auditFieldMapping(entity, value, index) {
        const row = isRecord(value) ? value : {};
        const definitions = FIELD_MAPPING_MANIFEST[entity];
        const rawFields = flattenLeafPaths(row);
        const sourceByCanonical = {};
        const mappedFields = [];
        const fallbackFields = [];
        const missingExpectedFields = [];
        definitions.forEach(definition => {
            const matched = firstAlias(row, definition.aliases);
            if (matched) {
                mappedFields.push(definition.canonicalField);
                sourceByCanonical[definition.canonicalField] = matched.alias;
            }
            else {
                if (definition.fallback !== '')
                    fallbackFields.push(definition.canonicalField);
                if (definition.required)
                    missingExpectedFields.push(definition.canonicalField);
            }
        });
        const knownAliases = definitions.flatMap(definition => definition.aliases);
        const unmappedFields = rawFields.filter(path => !knownAliases.some(alias => aliasCoversPath(alias, path)));
        const record = {
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
        clear(entity) {
            if (!entity) {
                fieldAuditRecords.clear();
                return;
            }
            [...fieldAuditRecords.keys()].forEach(key => {
                if (key.startsWith(`${entity}|`))
                    fieldAuditRecords.delete(key);
            });
        },
        manifest(entity) {
            if (entity)
                return FIELD_MAPPING_MANIFEST[entity].map(item => ({ ...item, aliases: [...item.aliases], uiTargets: [...item.uiTargets] }));
            return Object.fromEntries(Object.keys(FIELD_MAPPING_MANIFEST).map(name => [name, FIELD_MAPPING_MANIFEST[name].map(item => ({ ...item, aliases: [...item.aliases], uiTargets: [...item.uiTargets] }))]));
        },
        list(entity) {
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
        summary(entity) {
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
    function normalizedId(row, context) {
        return context.safeText(context.firstOf(row, [
            'id', 'generalInformation.tenantId', 'tenantId', 'clientId', 'plantId', 'deviceId', 'integrationId', 'telemetryId', 'metricId',
            'canonicalId', 'sourceEntityId', 'sourcePlantId', 'sourceDeviceId', 'sourceAlertId'
        ], ''), '');
    }
    function optionalNumber(value) {
        if (value === undefined || value === null || value === '')
            return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    function normalizeTelemetryUnit(value) {
        const raw = sourceValue(value, '').trim();
        if (!raw)
            return '';
        const key = raw.toLowerCase().replace(/\s+/g, '');
        if (['c', '°c', 'degc', 'celsius'].includes(key))
            return '°C';
        if (key === 'kw')
            return 'kW';
        if (key === 'kwh')
            return 'kWh';
        if (key === 'hz')
            return 'Hz';
        if (key === 'v')
            return 'V';
        if (key === 'a')
            return 'A';
        return raw;
    }
    function sourceValue(value, fallback = '—') {
        if (value === undefined || value === null)
            return fallback;
        const text = String(value).trim();
        return text || fallback;
    }
    function normalizationKey(value) {
        const text = sourceValue(value, '');
        if (!text)
            return '';
        return text
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    }
    function aliasValue(value, aliases, fallback = '—') {
        const text = sourceValue(value, fallback);
        if (text === fallback)
            return fallback;
        return aliases[normalizationKey(text)] || text;
    }
    const countryAliases = {
        am: 'Armenia', arm: 'Armenia', armenia: 'Armenia',
        us: 'United States', usa: 'United States', 'united states of america': 'United States', 'united states': 'United States',
        gb: 'United Kingdom', gbr: 'United Kingdom', uk: 'United Kingdom', 'great britain': 'United Kingdom', 'united kingdom': 'United Kingdom',
        ge: 'Georgia', geo: 'Georgia', georgia: 'Georgia',
        de: 'Germany', deu: 'Germany', germany: 'Germany',
        fr: 'France', fra: 'France', france: 'France',
        it: 'Italy', ita: 'Italy', italy: 'Italy',
        es: 'Spain', esp: 'Spain', spain: 'Spain',
        nl: 'Netherlands', nld: 'Netherlands', netherlands: 'Netherlands',
        ru: 'Russia', rus: 'Russia', russia: 'Russia',
        ua: 'Ukraine', ukr: 'Ukraine', ukraine: 'Ukraine',
        kz: 'Kazakhstan', kaz: 'Kazakhstan', kazakhstan: 'Kazakhstan',
        ae: 'United Arab Emirates', are: 'United Arab Emirates', uae: 'United Arab Emirates', 'united arab emirates': 'United Arab Emirates',
        in: 'India', ind: 'India', india: 'India',
        cn: 'China', chn: 'China', china: 'China',
        jp: 'Japan', jpn: 'Japan', japan: 'Japan',
        au: 'Australia', aus: 'Australia', australia: 'Australia',
        ca: 'Canada', can: 'Canada', canada: 'Canada'
    };
    function normalizeCountry(value) {
        const text = sourceValue(value);
        if (text === '—')
            return text;
        const direct = countryAliases[normalizationKey(text)];
        if (direct)
            return direct;
        const regionCode = text.toUpperCase();
        if (/^[A-Z]{2}$/.test(regionCode) && typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
            try {
                const display = new Intl.DisplayNames(['en'], { type: 'region' }).of(regionCode);
                if (display && display !== regionCode)
                    return display;
            }
            catch {
                // Preserve an unknown backend value instead of fabricating a country.
            }
        }
        return text;
    }
    function normalizeClientType(value) {
        return aliasValue(value, {
            commercial: 'Legal Entity', corporate: 'Legal Entity', company: 'Legal Entity', business: 'Legal Entity',
            organization: 'Legal Entity', organisation: 'Legal Entity', 'legal entity': 'Legal Entity', legalentity: 'Legal Entity',
            juridical: 'Legal Entity', 'juridical person': 'Legal Entity', llc: 'Legal Entity', jsc: 'Legal Entity', cjsc: 'Legal Entity',
            individual: 'Individual', person: 'Individual', personal: 'Individual', private: 'Individual',
            'natural person': 'Individual', naturalperson: 'Individual'
        });
    }
    function normalizeTenantType(value) {
        return aliasValue(value, {
            owner: 'Owner', assetowner: 'Owner', 'asset owner': 'Owner', plantowner: 'Owner', 'plant owner': 'Owner',
            operator: 'Operator', operatorcompany: 'Operator', 'operator company': 'Operator',
            investor: 'Investor', investment: 'Investor',
            epc: 'EPC', contractor: 'EPC', 'epc contractor': 'EPC',
            om: 'O&M', 'o and m': 'O&M', operationsandmaintenance: 'O&M', 'operations and maintenance': 'O&M',
            utility: 'Utility', gridoperator: 'Utility', 'grid operator': 'Utility'
        });
    }
    function normalizeEntityType(value) {
        const text = sourceValue(value);
        if (text === '—')
            return text;
        const key = normalizationKey(text);
        const mapped = {
            commercial: 'Legal Entity', corporate: 'Legal Entity', company: 'Legal Entity', business: 'Legal Entity',
            organization: 'Legal Entity', organisation: 'Legal Entity', 'legal entity': 'Legal Entity', legalentity: 'Legal Entity',
            juridical: 'Legal Entity', 'juridical person': 'Legal Entity', llc: 'Legal Entity', jsc: 'Legal Entity', cjsc: 'Legal Entity',
            nonprofit: 'Legal Entity', 'non profit': 'Legal Entity',
            individual: 'Individual', person: 'Individual', personal: 'Individual', private: 'Individual',
            'natural person': 'Individual', naturalperson: 'Individual'
        }[key];
        if (mapped)
            return mapped;
        const tenantType = normalizeTenantType(text);
        return tenantType !== text ? '—' : text;
    }
    function normalizeProvider(value) {
        const text = sourceValue(value);
        if (text === '—')
            return text;
        const key = normalizationKey(text);
        if (/huawei|fusion solar|fusionsolar/.test(key))
            return 'Huawei';
        if (/deye|solarman/.test(key))
            return 'Deye';
        if (/goodwe|sems/.test(key))
            return 'GoodWe';
        if (/solis/.test(key))
            return 'Solis';
        if (/solax|solarx/.test(key))
            return 'SolaX';
        if (/sungrow|isolarcloud/.test(key))
            return 'Sungrow';
        if (/growatt|shine server|shineserver/.test(key))
            return 'Growatt';
        if (/fronius|solar web/.test(key))
            return 'Fronius';
        if (/\bsma\b|sunny portal/.test(key))
            return 'SMA';
        if (/sofar/.test(key))
            return 'Sofar';
        if (/peimar/.test(key))
            return 'Peimar';
        return text;
    }
    function normalizeIntegrationProvider(value) {
        const family = normalizeProvider(value);
        if (family === 'Deye')
            return 'DeyeCloud';
        if (family === 'SolaX')
            return 'SolaX';
        return family;
    }
    function normalizeClientStatus(value) {
        return aliasValue(value, {
            online: 'Active', active: 'Active', enabled: 'Active', activated: 'Active', verified: 'Active',
            review: 'Review', 'under review': 'Review', pendingreview: 'Review', 'pending review': 'Review', verification: 'Review',
            pending: 'Pending', draft: 'Pending', inactive: 'Pending', invited: 'Pending', onboarding: 'Pending'
        });
    }
    function normalizeTenantStatus(value) {
        return aliasValue(value, {
            online: 'Active', active: 'Active', enabled: 'Active', activated: 'Active',
            inactive: 'Inactive', disabled: 'Inactive', deactivated: 'Inactive',
            suspended: 'Suspended', blocked: 'Suspended',
            archived: 'Archived', deleted: 'Archived',
            pending: 'Inactive', draft: 'Inactive'
        });
    }
    function normalizePlantStatus(value) {
        return aliasValue(value, {
            online: 'Normal', active: 'Normal', operational: 'Normal', normal: 'Normal', healthy: 'Normal', ok: 'Normal', running: 'Normal', connected: 'Normal',
            warning: 'Warning', degraded: 'Warning', attention: 'Warning', alarm: 'Warning', partial: 'Warning', stale: 'Warning',
            fault: 'Fault', error: 'Fault', failed: 'Fault', critical: 'Fault',
            offline: 'Offline', disconnected: 'Offline', unavailable: 'Offline', 'no data': 'Offline', lost: 'Offline',
            pending: 'Pending Review', review: 'Pending Review', pendingreview: 'Pending Review', 'pending review': 'Pending Review',
            draft: 'Draft', new: 'Draft', inactive: 'Inactive', disabled: 'Inactive', archived: 'Archived'
        });
    }
    function normalizeDeviceStatus(value) {
        return aliasValue(value, {
            online: 'Online', active: 'Online', operational: 'Online', normal: 'Online', healthy: 'Online', ok: 'Online', running: 'Online', connected: 'Online',
            warning: 'Warning', degraded: 'Warning', delayed: 'Warning', attention: 'Warning', stale: 'Warning',
            fault: 'Fault', error: 'Fault', failed: 'Fault', critical: 'Fault', alarm: 'Fault',
            offline: 'Offline', disconnected: 'Offline', inactive: 'Offline', disabled: 'Offline', unavailable: 'Offline', 'no data': 'Offline',
            pending: 'Draft', draft: 'Draft', new: 'Draft'
        });
    }
    function normalizeAlertStatus(value) {
        return aliasValue(value, {
            active: 'Open', open: 'Open', new: 'Open', raised: 'Open', triggered: 'Open', unacknowledged: 'Open',
            acknowledged: 'Acknowledged', ack: 'Acknowledged', confirmed: 'Acknowledged', assigned: 'Acknowledged',
            escalated: 'Escalated', escalation: 'Escalated',
            resolved: 'Resolved', closed: 'Resolved', clear: 'Resolved', cleared: 'Resolved', recovered: 'Resolved'
        });
    }
    function normalizeAlertSeverity(value) {
        return aliasValue(value, {
            critical: 'Critical', emergency: 'Critical', fatal: 'Critical', p1: 'Critical', severity1: 'Critical',
            high: 'High', major: 'High', p2: 'High', severity2: 'High',
            warning: 'Warning', medium: 'Warning', minor: 'Warning', p3: 'Warning', severity3: 'Warning',
            info: 'Info', informational: 'Info', low: 'Info', p4: 'Info', severity4: 'Info'
        });
    }
    function normalizeIntegrationStatus(value) {
        return aliasValue(value, {
            online: 'Active', active: 'Active', enabled: 'Active', activated: 'Active', healthy: 'Active',
            warning: 'Warning', degraded: 'Warning', attention: 'Warning', stale: 'Warning', partial: 'Warning',
            suspended: 'Suspended', inactive: 'Suspended', disabled: 'Suspended', paused: 'Suspended',
            archived: 'Archived', deleted: 'Archived',
            failed: 'Failed', fault: 'Failed', error: 'Failed', unhealthy: 'Failed',
            draft: 'Draft', pending: 'Draft', new: 'Draft'
        });
    }
    const normalization = {
        country: normalizeCountry,
        clientType: normalizeClientType,
        entityType: normalizeEntityType,
        tenantType: normalizeTenantType,
        provider: normalizeProvider,
        integrationProvider: normalizeIntegrationProvider,
        clientStatus: normalizeClientStatus,
        tenantStatus: normalizeTenantStatus,
        plantStatus: normalizePlantStatus,
        deviceStatus: normalizeDeviceStatus,
        alertStatus: normalizeAlertStatus,
        alertSeverity: normalizeAlertSeverity,
        integrationStatus: normalizeIntegrationStatus,
        normalize(domain, value) {
            return this[domain](value);
        }
    };
    function strictDisplayName(row, context, keys, identityKeys) {
        const named = context.safeText(context.firstOf(row, keys, ''), '').trim();
        if (named)
            return named;
        const identity = context.safeText(context.firstOf(row, identityKeys, ''), '').trim();
        return identity || '—';
    }
    const clients = createContract(CONTRACT_DEFINITIONS.clients, (row, _index, context) => {
        const id = normalizedId(row, context);
        const identityFirstName = context.safeText(context.firstOf(row, ['identity.firstName', 'firstName'], ''), '').trim();
        const identityLastName = context.safeText(context.firstOf(row, ['identity.lastName', 'lastName'], ''), '').trim();
        const identityMiddleName = context.safeText(context.firstOf(row, ['identity.middleName', 'middleName'], ''), '').trim();
        const composedIdentityName = [identityFirstName, identityLastName, identityMiddleName].filter(Boolean).join(' ');
        const explicitName = context.safeText(context.firstOf(row, [
            'vendorExtensions.clientName', 'vendorExtensions.displayName', 'vendorExtensions.name',
            'sourceClientName', 'clientName', 'displayName', 'legalName', 'companyName', 'fullName', 'name',
            'identity.fullName', 'identity.companyName'
        ], ''), '').trim();
        const identityFallback = context.safeText(context.firstOf(row, ['clientId', 'sourceEntityId', 'externalId', 'id'], ''), '').trim();
        const name = explicitName || composedIdentityName || identityFallback || '—';
        const explicitDocuments = context.firstOf(row, ['documents', 'documentCount'], undefined);
        const nestedDocumentation = context.firstOf(row, ['documentation'], undefined);
        const documentFlags = [
            context.firstOf(row, ['hasClientPassportFile'], undefined),
            context.firstOf(row, ['hasStateRegistrationDocumentFile'], undefined),
            context.firstOf(row, ['hasProjectDocFile'], undefined),
            context.firstOf(row, ['documentation.identityDocument'], undefined),
            context.firstOf(row, ['documentation.registrationDocument'], undefined)
        ].filter(value => value !== undefined && value !== null && value !== '');
        return {
            dataOrigin: 'live', id,
            code: context.safeText(context.firstOf(row, ['code', 'clientCode', 'externalId'], ''), ''),
            name, vendorDisplayName: name,
            registeredName: context.safeText(context.firstOf(row, ['name', 'clientName', 'displayName', 'sourceEntityId', 'id'], ''), ''),
            plantCount: Array.isArray(row.plants) ? row.plants.length : optionalNumber(context.firstOf(row, ['plantCount', 'plantsCount', 'assignedPlantCount'], undefined)),
            deviceCount: optionalNumber(context.firstOf(row, ['deviceCount', 'devicesCount'], undefined)),
            totalCapacity: context.safeText(context.firstOf(row, ['totalCapacity', 'capacity', 'capacityDc', 'installedCapacity'], '—')),
            type: normalization.clientType(context.firstOf(row, ['tenantLink.clientType', 'type', 'clientType', 'entityType'], '—')),
            firstName: identityFirstName,
            lastName: identityLastName,
            middleName: identityMiddleName,
            companyName: context.safeText(context.firstOf(row, ['identity.companyName', 'companyName'], ''), ''),
            legalForm: context.safeText(context.firstOf(row, ['identity.legalForm', 'legalForm', 'companyType'], '—')),
            registrationNo: context.safeText(context.firstOf(row, ['identity.registrationNumber', 'registrationNo', 'registrationNumber', 'registryNumber'], '—')),
            taxId: context.safeText(context.firstOf(row, ['identity.taxIdVatNumber', 'generalInformation.taxIdVatNumber', 'generalInformation.taxId', 'taxIdVatNumber', 'taxId', 'tin', 'vat', 'taxNumber'], '—')),
            country: normalization.country(context.firstOf(row, ['country', 'address.country'], '—')),
            region: context.safeText(context.firstOf(row, ['address.stateRegion', 'region', 'address.region'], '—')),
            city: context.safeText(context.firstOf(row, ['city', 'address.city'], '—')),
            address: context.safeText(context.firstOf(row, ['address.streetAddress', 'detailedAddress', 'addressLine'], '—')),
            status: normalization.clientStatus(context.firstOf(row, ['tenantLink.status', 'status', 'accountActivation', 'accountStatus', 'lifecycleStatus'], '—')),
            verification: context.safeText(context.firstOf(row, ['verification', 'verificationStatus', 'kycStatus'], '—')),
            account: context.safeText(context.firstOf(row, ['accountManager', 'account', 'manager'], '—')),
            primaryContact: context.safeText(context.firstOf(row, ['primaryContact.fullName', 'contactName', 'contact.name', 'primaryContact.email', 'primaryContact.phoneNumber1'], '—')),
            contactEmail: context.safeText(context.firstOf(row, ['primaryContact.email', 'contactEmail', 'email', 'contact.email'], '—')),
            contactPhone: context.safeText(context.firstOf(row, ['primaryContact.phoneNumber1', 'contactPhone', 'phoneNumber1', 'phone1', 'phone', 'contact.phone'], '—')),
            phone2: context.safeText(context.firstOf(row, ['primaryContact.phoneNumber2', 'phoneNumber2', 'phone2', 'secondaryPhone'], '')),
            language: context.safeText(context.firstOf(row, ['preferences.language', 'identity.preferredLanguage', 'language'], '—')),
            timezone: context.safeText(context.firstOf(row, ['preferences.timeZone', 'timezone', 'timeZone'], '—')),
            temperature: context.safeText(context.firstOf(row, ['preferences.temperatureUnit', 'temperatureUnit'], '—')),
            currency: context.safeText(context.firstOf(row, ['preferences.currency', 'currency'], '—')),
            irradiation: context.safeText(context.firstOf(row, ['preferences.irradiationUnit', 'irradiationUnit'], '—')),
            dob: context.safeText(context.firstOf(row, ['identity.dateOfBirth', 'dateOfBirth'], '')),
            username: context.safeText(context.firstOf(row, ['portalAccount.username', 'username', 'portalUsername'], '')),
            portalUsername: context.safeText(context.firstOf(row, ['portalAccount.username', 'username', 'portalUsername'], '')),
            tenant: context.safeText(context.firstOf(row, ['tenantLink.managingTenantName', 'tenantLink.managingTenantId', 'managingTenant', 'tenant', 'tenantName', 'organizationName'], '—')),
            plants: Array.isArray(row.plants) ? row.plants : [],
            users: Array.isArray(row.portalUsers) ? row.portalUsers.length : optionalNumber(context.firstOf(row, ['users', 'userCount'], undefined)),
            documents: explicitDocuments !== undefined
                ? optionalNumber(explicitDocuments)
                : (Array.isArray(row.documentRecords) ? row.documentRecords.length : (documentFlags.length ? documentFlags.reduce((count, value) => count + Number(Boolean(value)), 0) : (nestedDocumentation && typeof nestedDocumentation === 'object' ? Object.values(nestedDocumentation).filter(Boolean).length : null))),
            billing: context.safeText(context.firstOf(row, ['billing', 'billingPlan', 'servicePlan'], '—')),
            supportTier: context.safeText(context.firstOf(row, ['supportTier', 'supportPlan'], '—')),
            accessScope: context.safeText(context.firstOf(row, ['accessScope', 'dataScope'], '—')),
            exportPolicy: context.safeText(context.firstOf(row, ['exportPolicy'], '—')),
            identityRole: context.safeText(context.firstOf(row, ['identity.role', 'identityRole'], '—')),
            portalRole: context.safeText(context.firstOf(row, ['portalAccount.role', 'portalRole'], '—')),
            assignmentRole: context.safeText(context.firstOf(row, ['accessScope', 'assignmentRole', 'portalAccount.role', 'identity.role', 'role'], '—')),
            onboarding: context.safeText(context.firstOf(row, ['tenantLink.status', 'onboarding', 'onboardingStatus', 'accountActivation'], '—')),
            activationAt: context.safeText(context.firstOf(row, ['tenantLink.activationAt', 'activationAt'], ''), ''),
            createdAtUtc: context.safeText(context.firstOf(row, ['createdAtUtc', 'createdAt'], ''), ''),
            updatedAtUtc: context.safeText(context.firstOf(row, ['updatedAtUtc', 'updatedAt'], ''), ''),
            updated: context.formatDate(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc'], undefined), '—'),
            lastSyncAt: context.safeText(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc'], ''), ''),
            documentRecords: Array.isArray(row.documentRecords) ? row.documentRecords.map((document) => ({
                id: context.safeText(document?.id ?? document?.documentId ?? '', ''),
                name: context.safeText(document?.name ?? document?.fileName ?? document?.originalFileName ?? document?.filename ?? 'Document', 'Document'),
                type: context.safeText(document?.type ?? document?.documentType ?? document?.category ?? 'Document', 'Document'),
                status: context.safeText(document?.status ?? document?.state ?? 'Uploaded', 'Uploaded'),
                expiry: context.safeText(document?.expiry ?? document?.expiresAt ?? document?.expiryAt ?? '', '')
            })) : [],
            portalUsers: Array.isArray(row.portalUsers) ? row.portalUsers : [],
            bankAccounts: Array.isArray(row.bankAccounts) ? row.bankAccounts : [],
            raw: row
        };
    });
    const tenants = createContract(CONTRACT_DEFINITIONS.tenants, (row, _index, context) => {
        const id = normalizedId(row, context);
        const name = strictDisplayName(row, context, [
            'vendorExtensions.tenantName', 'vendorExtensions.organizationName', 'vendorExtensions.displayName', 'vendorExtensions.name',
            'generalInformation.tenantName', 'generalInformation.displayName', 'generalInformation.legalName',
            'tenant.name', 'tenant.tenantName', 'organization.name', 'organization.organizationName',
            'company.name', 'profile.displayName', 'sourceTenantName', 'tenantName', 'organizationName',
            'displayName', 'legalName', 'companyName', 'name', 'tenantCode', 'organizationCode', 'externalId'
        ], ['tenantId', 'sourceEntityId', 'id']);
        const rawTenantType = context.firstOf(row, ['generalInformation.tenantType', 'tenantType', 'type', 'organizationType'], '—');
        const rawEntityType = context.firstOf(row, ['generalInformation.entityType', 'entityType', 'legalEntityType', 'personType', 'organizationType', 'generalInformation.tenantType', 'tenantType', 'type'], '—');
        const tenantType = normalization.tenantType(rawTenantType);
        return {
            dataOrigin: 'live', id,
            code: context.safeText(context.firstOf(row, ['generalInformation.tenantCode', 'code', 'tenantCode', 'organizationCode', 'externalId'], ''), ''),
            name, vendorDisplayName: name,
            registeredName: context.safeText(context.firstOf(row, ['generalInformation.tenantName', 'generalInformation.displayName', 'name', 'tenantName', 'organizationName', 'displayName', 'sourceEntityId', 'id'], ''), ''),
            legal: context.safeText(context.firstOf(row, ['generalInformation.legalName', 'legalName', 'companyName', 'organizationName'], '—')),
            entityType: normalization.entityType(rawEntityType),
            types: tenantType === '—' ? [] : [tenantType],
            profileCountry: normalization.country(context.firstOf(row, ['generalInformation.country', 'country', 'vendorExtensions.country'], '—')),
            country: normalization.country(context.firstOf(row, ['generalInformation.country', 'addressInformation.legalAddress.country', 'country', 'address.country', 'vendorExtensions.country'], '—')),
            legalCountry: normalization.country(context.firstOf(row, ['addressInformation.legalAddress.country'], '—')),
            region: context.safeText(context.firstOf(row, ['addressInformation.legalAddress.stateRegion', 'addressInformation.legalAddress.region', 'stateRegion', 'region'], '—')),
            city: context.safeText(context.firstOf(row, ['addressInformation.legalAddress.city'], '—')),
            address: context.safeText(context.firstOf(row, ['addressInformation.legalAddress.streetAddress', 'addressInformation.legalAddress.address', 'streetAddress', 'address'], '—')),
            registration: context.safeText(context.firstOf(row, ['generalInformation.registrationNumber', 'registrationNo', 'registrationNumber', 'registration', 'registryNumber'], '—')),
            tax: context.safeText(context.firstOf(row, ['identity.taxIdVatNumber', 'generalInformation.taxIdVatNumber', 'generalInformation.taxId', 'taxIdVatNumber', 'taxId', 'tin', 'vat', 'taxNumber'], '—')),
            tier: context.safeText(context.firstOf(row, ['tenantClassification.accountTier', 'servicePlan', 'supportTier', 'tier'], '—')),
            category: context.safeText(context.firstOf(row, ['tenantClassification.tenantCategory', 'generalInformation.businessCategory', 'category', 'businessArea', 'tenantCategory'], '—')),
            risk: context.safeText(context.firstOf(row, ['tenantClassification.riskCategory', 'risk', 'riskLevel'], '—')),
            status: normalization.tenantStatus(context.firstOf(row, ['generalInformation.tenantStatus', 'status', 'tenantStatus', 'lifecycleStatus', 'accountStatus'], '—')),
            compliance: context.safeText(context.firstOf(row, ['legalCompliance.complianceStatus', 'compliance', 'complianceStatus', 'certificationState'], '—')),
            setup: optionalNumber(context.firstOf(row, ['setup', 'setupPct', 'onboardingProgress'], undefined)),
            contact: context.safeText(context.firstOf(row, ['contactPersons.contacts.0.fullName', 'contactPersons.contacts.0.name', 'contactName', 'primaryContact', 'contact.name'], '—')),
            email: context.safeText(context.firstOf(row, ['primaryContact.email', 'contactEmail', 'email', 'contact.email'], '—')),
            phone: context.safeText(context.firstOf(row, ['contactPersons.contacts.0.mobilePhone', 'contactPersons.contacts.0.phone', 'contactPhone', 'phone', 'contact.phone'], '—')),
            trade: context.safeText(context.firstOf(row, ['generalInformation.tradeName', 'tradeName'], '—')),
            displayName: context.safeText(context.firstOf(row, ['generalInformation.displayName', 'displayName'], '—')),
            account: context.safeText(context.firstOf(row, ['generalInformation.accountManager', 'accountManager'], '—')),
            industry: context.safeText(context.firstOf(row, ['generalInformation.industrySector', 'industrySector'], '—')),
            businessCategory: context.safeText(context.firstOf(row, ['generalInformation.businessCategory', 'businessCategory'], '—')),
            parentCompany: context.safeText(context.firstOf(row, ['generalInformation.parentCompany', 'parentCompany'], '—')),
            employees: optionalNumber(context.firstOf(row, ['generalInformation.numberOfEmployees', 'numberOfEmployees'], undefined)),
            annualRevenue: context.safeText(context.firstOf(row, ['generalInformation.annualRevenueRange', 'annualRevenueRange'], '—')),
            webplant: context.safeText(context.firstOf(row, ['generalInformation.website', 'website'], '—')),
            building: context.safeText(context.firstOf(row, ['addressInformation.legalAddress.buildingNumber', 'buildingNumber'], '—')),
            postal: context.safeText(context.firstOf(row, ['addressInformation.legalAddress.postalCode', 'postalCode'], '—')),
            businessSame: Boolean(context.firstOf(row, ['addressInformation.businessAddressSameAsLegalAddress', 'addressInformation.businessAddressSameAsLegal', 'businessAddressSameAsLegalAddress', 'businessAddressSameAsLegal'], false)),
            businessCountry: normalization.country(context.firstOf(row, ['addressInformation.businessAddress.country', 'businessCountry'], '—')),
            businessRegion: context.safeText(context.firstOf(row, ['addressInformation.businessAddress.stateRegion', 'addressInformation.businessAddress.region', 'businessStateRegion', 'businessRegion'], '—')),
            businessCity: context.safeText(context.firstOf(row, ['addressInformation.businessAddress.city'], '—')),
            businessAddress: context.safeText(context.firstOf(row, ['addressInformation.businessAddress.streetAddress', 'addressInformation.businessAddress.address', 'businessStreetAddress', 'businessAddress'], '—')),
            businessBuilding: context.safeText(context.firstOf(row, ['addressInformation.businessAddress.buildingNumber', 'businessBuildingNumber'], '—')),
            businessPostal: context.safeText(context.firstOf(row, ['addressInformation.businessAddress.postalCode', 'businessPostalCode'], '—')),
            priority: context.safeText(context.firstOf(row, ['tenantClassification.tenantPriority', 'tenantClassification.priority', 'tenantPriority', 'priority'], '—')),
            acquisitionSource: context.safeText(context.firstOf(row, ['tenantClassification.acquisitionSource', 'acquisitionSource'], '—')),
            language: context.safeText(context.firstOf(row, ['communicationPreferences.preferredLanguage', 'preferredLanguage'], '—')),
            timezone: context.safeText(context.firstOf(row, ['communicationPreferences.preferredTimeZone', 'communicationPreferences.timezone', 'preferredTimeZone', 'timezone'], '—')),
            channel: context.safeText(context.firstOf(row, ['communicationPreferences.preferredCommunicationChannel', 'communicationPreferences.communicationChannel', 'preferredCommunicationChannel', 'communicationChannel'], '—')),
            businessHours: context.safeText(context.firstOf(row, ['communicationPreferences.businessHours', 'businessHours'], '—')),
            platformNotifications: Boolean(context.firstOf(row, ['communicationPreferences.receivePlatformNotifications', 'communicationPreferences.platformNotifications', 'receivePlatformNotifications', 'platformNotifications'], false)) ? 'Yes' : 'No',
            serviceNotifications: Boolean(context.firstOf(row, ['communicationPreferences.receiveServiceNotifications', 'communicationPreferences.serviceNotifications', 'receiveServiceNotifications', 'serviceNotifications'], false)) ? 'Yes' : 'No',
            invoiceNotifications: Boolean(context.firstOf(row, ['communicationPreferences.receiveInvoiceNotifications', 'communicationPreferences.invoiceNotifications', 'receiveInvoiceNotifications', 'invoiceNotifications'], false)) ? 'Yes' : 'No',
            securityNotifications: Boolean(context.firstOf(row, ['communicationPreferences.receiveSecurityNotifications', 'communicationPreferences.securityNotifications', 'receiveSecurityNotifications', 'securityNotifications'], false)) ? 'Yes' : 'No',
            notificationRecipients: context.safeText(context.firstOf(row, ['communicationPreferences.notificationRecipients', 'notificationRecipients'], '—')),
            dpa: context.safeText(context.firstOf(row, ['legalCompliance.dataProcessingAgreement', 'legalCompliance.dataProcessingAgreementStatus', 'dataProcessingAgreement', 'dataProcessingAgreementStatus'], '—')),
            nda: context.safeText(context.firstOf(row, ['legalCompliance.ndaStatus', 'ndaStatus'], '—')),
            confidentiality: context.safeText(context.firstOf(row, ['legalCompliance.confidentialityLevel', 'confidentialityLevel'], '—')),
            controllerType: context.safeText(context.firstOf(row, ['legalCompliance.dataControllerType', 'dataControllerType'], '—')),
            consent: context.safeText(context.firstOf(row, ['legalCompliance.consentStatus', 'consentStatus'], '—')),
            consentExpiry: (() => {
                const rawValue = context.safeText(context.firstOf(row, ['legalCompliance.consentExpiryDate', 'consentExpiryDate'], '—'));
                const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
                return match?.[1] || rawValue;
            })(),
            contacts: (Array.isArray(context.firstOf(row, ['contactPersons.contacts', 'contacts'], [])) ? context.firstOf(row, ['contactPersons.contacts', 'contacts'], []) : []).map(contact => ({
                ...contact,
                first: context.safeText(context.firstOf(contact, ['firstName', 'first'], ''), ''),
                last: context.safeText(context.firstOf(contact, ['lastName', 'last'], ''), ''),
                full: context.safeText(context.firstOf(contact, ['fullName', 'name'], ''), ''),
                position: context.safeText(context.firstOf(contact, ['position'], ''), ''),
                department: context.safeText(context.firstOf(contact, ['department'], ''), ''),
                role: context.safeText(context.firstOf(contact, ['role'], ''), ''),
                email: context.safeText(context.firstOf(contact, ['email'], ''), ''),
                mobile: context.safeText(context.firstOf(contact, ['mobilePhone', 'mobile', 'phone'], ''), ''),
                office: context.safeText(context.firstOf(contact, ['officePhone', 'office'], ''), ''),
                language: context.safeText(context.firstOf(contact, ['preferredLanguage', 'language'], ''), ''),
                method: context.safeText(context.firstOf(contact, ['preferredContactMethod', 'method'], ''), ''),
                active: Boolean(context.firstOf(contact, ['active', 'isActive'], true)) ? 'Yes' : 'No'
            })),
            documents: (Array.isArray(context.firstOf(row, ['legalCompliance.documents', 'documents'], [])) ? context.firstOf(row, ['legalCompliance.documents', 'documents'], []) : []).map(document => ({
                ...document,
                name: context.safeText(context.firstOf(document, ['name', 'documentName'], ''), ''),
                type: context.safeText(context.firstOf(document, ['type', 'documentType'], ''), ''),
                id: context.safeText(context.firstOf(document, ['id', 'documentId'], ''), ''),
                expiry: context.safeText(context.firstOf(document, ['expiry', 'expiryDate'], ''), ''),
                uploaded: Boolean(context.firstOf(document, ['uploaded', 'isUploaded'], false)),
                fileName: context.safeText(context.firstOf(document, ['fileName', 'file', 'storageRef'], ''), ''),
                filePath: context.safeText(context.firstOf(document, ['filePath', 'path', 'storageRef'], ''), ''),
                file: context.safeText(context.firstOf(document, ['fileName', 'file', 'storageRef'], ''), '')
            })),
            notes: {
                general: context.safeText(context.firstOf(row, ['generalInformation.notes'], ''), ''),
                address: context.safeText(context.firstOf(row, ['addressInformation.notes'], ''), ''),
                contacts: context.safeText(context.firstOf(row, ['contactPersons.notes'], ''), ''),
                classification: context.safeText(context.firstOf(row, ['tenantClassification.notes'], ''), ''),
                communication: context.safeText(context.firstOf(row, ['communicationPreferences.notes'], ''), ''),
                legal: context.safeText(context.firstOf(row, ['legalCompliance.notes'], ''), '')
            },
            created: context.formatDate(context.firstOf(row, ['createdAtUtc'], undefined), '—'),
            activationAt: context.safeText(context.firstOf(row, ['tenantLink.activationAt', 'activationAt'], ''), ''),
            createdAtUtc: context.safeText(context.firstOf(row, ['createdAtUtc', 'createdAt'], ''), ''),
            updatedAtUtc: context.safeText(context.firstOf(row, ['updatedAtUtc', 'updatedAt'], ''), ''),
            updated: context.formatDate(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc'], undefined), '—'),
            lastSyncAt: context.safeText(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc'], ''), ''),
            source: 'Live API', raw: row
        };
    });
    const plants = createContract(CONTRACT_DEFINITIONS.plants, (row, _index, context) => {
        const id = normalizedId(row, context);
        const provider = normalization.provider(context.firstOf(row, [
            'providerData.provider', 'provider', 'providerType', 'providerName', 'vendor', 'vendorName', 'sourceSystem',
            'source.provider', 'source.vendor', 'integration.provider', 'vendorExtensions.sourceSystem',
            'adminRecord.provider', 'adminRecord.providerType', 'adminRecord.providerName', 'adminRecord.vendor',
            'adminRecord.vendorName', 'adminRecord.sourceSystem'
        ], '—'));
        const name = strictDisplayName(row, context, [
            'adminName', 'liveName', 'vendorExtensions.plantName', 'vendorExtensions.stationName',
            'vendorExtensions.siteName', 'vendorExtensions.displayName', 'vendorExtensions.name',
            'adminRecord.plantName', 'adminRecord.stationName', 'adminRecord.siteName',
            'adminRecord.displayName', 'adminRecord.name', 'liveRecord.plantName',
            'liveRecord.stationName', 'liveRecord.siteName', 'liveRecord.displayName', 'liveRecord.name',
            'technical.plantName', 'adminRecord.technical.plantName',
            'sourcePlantName', 'plantName', 'stationName', 'siteName', 'displayName', 'sourceEntityName', 'name'
        ], ['plantId', 'sourcePlantId', 'plantCode', 'id']);
        const powerKw = optionalNumber(context.firstOf(row, ['operationalData.currentPowerKw', 'providerData.currentPowerKw', 'currentPowerKw', 'liveRecord.currentPowerKw'], undefined));
        const installedKw = optionalNumber(context.firstOf(row, ['technical.installedPowerKw', 'installedPowerKw', 'operationalData.installedCapacityKwp', 'adminRecord.technical.installedPowerKw', 'adminRecord.installedPowerKw'], undefined));
        const installedDcMw = optionalNumber(context.firstOf(row, ['technical.installedCapacityDcMw', 'installedCapacityDcMw', 'technical.capacityDcMw', 'capacityDcMw', 'adminRecord.technical.installedCapacityDcMw', 'adminRecord.installedCapacityDcMw'], undefined));
        const todayEnergy = optionalNumber(context.firstOf(row, ['operationalData.todayEnergyKwh', 'todayEnergyKwh', 'liveRecord.todayEnergyKwh'], undefined));
        const integration = context.safeText(context.firstOf(row, ['integrationName', 'integration', 'sourceIntegrationName', 'adminRecord.integration'], '—'));
        const embeddedCanonicalPlantId = context.safeText(context.firstOf(row, ['operationalData.canonicalPlantId', 'canonicalPlantId', 'liveRecord.id'], ''), '');
        const explicitAdminPlantId = context.safeText(context.firstOf(row, ['adminRecord.id', 'adminRecord.plantId', 'adminRecord.canonicalId', 'adminRecord.sourceEntityId'], ''), '');
        const looksLikeOperationalPlant = !embeddedCanonicalPlantId && (row.currentPowerKw !== undefined || row.lastDataAt !== undefined || (row.sourcePlantId !== undefined && row.provider !== undefined));
        const canonicalPlantId = embeddedCanonicalPlantId || (looksLikeOperationalPlant ? id : '');
        const registryPlantId = embeddedCanonicalPlantId ? id : explicitAdminPlantId;
        return {
            dataOrigin: 'live', id,
            adminId: explicitAdminPlantId,
            registryPlantId,
            canonicalPlantId,
            operationalId: canonicalPlantId,
            sourcePlantId: context.safeText(context.firstOf(row, ['providerData.sourceEntityId', 'providerData.sourcePlantCode', 'providerData.sourcePlantId', 'sourcePlantId', 'plantCode', 'externalId', 'adminRecord.plantCode'], ''), ''),
            sourcePlantCode: context.safeText(context.firstOf(row, ['providerData.sourcePlantCode', 'providerData.sourceEntityId', 'sourcePlantId', 'plantCode'], ''), ''),
            providerAccount: context.safeText(context.firstOf(row, ['providerData.providerAccount', 'providerAccount'], ''), ''),
            providerStatus: context.safeText(context.firstOf(row, ['providerData.providerStatus', 'operationalData.status'], ''), ''),
            rawPayloadRef: context.safeText(context.firstOf(row, ['providerData.rawPayloadRef', 'rawPayloadRef'], ''), ''),
            operationalExternalId: context.safeText(context.firstOf(row, ['providerData.sourceEntityId', 'providerData.sourcePlantCode', 'providerData.sourcePlantId', 'sourcePlantId', 'plantCode', 'externalId', 'adminRecord.plantCode'], ''), ''),
            externalId: context.safeText(context.firstOf(row, ['providerData.sourceEntityId', 'providerData.sourcePlantCode', 'providerData.sourcePlantId', 'sourcePlantId', 'plantCode', 'externalId', 'adminRecord.plantCode'], '—')),
            code: context.safeText(context.firstOf(row, ['plantCode', 'sourcePlantId', 'code', 'adminRecord.plantCode'], ''), ''),
            name, vendorDisplayName: name,
            registeredName: context.safeText(context.firstOf(row, ['sourcePlantId', 'plantId', 'code', 'id'], ''), ''),
            tenant: context.safeText(context.firstOf(row, ['clientAssignment.managingTenant.name', 'clientAssignment.managingTenant.tenantName', 'clientAssignment.managingTenant.code', 'clientAssignment.managingTenant.id', 'clientAssignment.managingTenant', 'clientAssignment.managingTenantId', 'operationalData.tenantName', 'operationalData.tenantId', 'managingTenant.name', 'managingTenant.tenantName', 'managingTenant.code', 'managingTenant.id', 'managingTenant', 'managingTenantId', 'tenant.name', 'tenant.tenantName', 'tenant.code', 'tenant.id', 'tenantName', 'tenant', 'operator.name', 'operator.id', 'adminRecord.managingTenant.name', 'adminRecord.managingTenant.tenantName', 'adminRecord.managingTenant.code', 'adminRecord.managingTenant.id', 'adminRecord.managingTenant', 'adminRecord.managingTenantId'], '—')),
            clientId: context.safeText(context.firstOf(row, ['clientAssignment.clientId', 'operationalData.clientId', 'clientId', 'ClientId', 'client.id', 'client.clientId', 'owner.id', 'owner.clientId', 'adminRecord.clientId', 'adminRecord.ClientId', 'adminRecord.client.id'], ''), ''),
            portfolio: context.safeText(context.firstOf(row, ['portfolio', 'portfolioName', 'groupName'], '—')),
            integration, vendor: provider,
            sourceScheme: context.safeText(context.firstOf(row, ['sourceScheme', 'vendorPlatform.sourceScheme', 'adminRecord.sourceScheme', 'adminRecord.vendorPlatform.sourceScheme'], '—')),
            creationMode: context.safeText(context.firstOf(row, ['vendorPlatform.creationMode', 'creationMode', 'adminRecord.vendorPlatform.creationMode', 'adminRecord.creationMode'], '—')),
            payloadStrategy: context.safeText(context.firstOf(row, ['vendorPlatform.payloadStrategy', 'payloadStrategy', 'adminRecord.vendorPlatform.payloadStrategy'], '—')),
            status: normalization.plantStatus(context.firstOf(row, ['adminRecord.vendorPlatform.recordStatus', 'adminRecord.recordStatus', 'adminRecord.lifecycleStatus', 'adminRecord.lifecycle.status', 'vendorPlatform.recordStatus', 'recordStatus', 'lifecycleStatus', 'lifecycle.status'], '—')),
            health: normalization.plantStatus(context.firstOf(row, ['operationalData.status', 'providerData.providerStatus', 'liveRecord.status', 'liveRecord.operationalStatus', 'health', 'operationalStatus', 'status', 'vendorPlatform.operationalStatus'], 'Unknown')),
            type: context.safeText(context.firstOf(row, ['plantType', 'technical.plantType', 'type', 'adminRecord.plantType', 'adminRecord.technical.plantType'], '—')),
            country: normalization.country(context.firstOf(row, ['location.countryRegion', 'location.country', 'countryRegion', 'country', 'vendorExtensions.country', 'adminRecord.location.countryRegion', 'adminRecord.location.country', 'adminRecord.countryRegion'], '—')),
            region: context.safeText(context.firstOf(row, ['location.region', 'location.stateRegion', 'region', 'vendorExtensions.region', 'adminRecord.location.region', 'adminRecord.location.stateRegion', 'adminRecord.region'], '—')),
            city: context.safeText(context.firstOf(row, ['location.city', 'city', 'vendorExtensions.city', 'adminRecord.location.city', 'adminRecord.city'], '—')),
            address: context.safeText(context.firstOf(row, ['location.address', 'location.street', 'location.detailedAddress', 'address', 'detailedAddress', 'vendorExtensions.address', 'adminRecord.location.address', 'adminRecord.location.street', 'adminRecord.location.detailedAddress', 'adminRecord.address'], '—')),
            lat: context.safeText(context.firstOf(row, ['location.latitude', 'location.lat', 'latitude', 'lat', 'vendorExtensions.latitude', 'adminRecord.location.latitude', 'adminRecord.location.lat'], '—')),
            lng: context.safeText(context.firstOf(row, ['location.longitude', 'location.lng', 'longitude', 'lng', 'vendorExtensions.longitude', 'adminRecord.location.longitude', 'adminRecord.location.lng'], '—')),
            timezone: context.safeText(context.firstOf(row, ['location.plantTimeZone', 'location.timezone', 'location.timeZone', 'plantTimeZone', 'timezone', 'vendorExtensions.timezone', 'adminRecord.location.timezone', 'adminRecord.location.timeZone', 'adminRecord.plantTimeZone'], '—')),
            capacityDc: installedDcMw !== null ? installedDcMw : installedKw === null ? null : installedKw / 1000,
            capacityAc: optionalNumber(context.firstOf(row, ['technical.installedCapacityAcMw', 'installedCapacityAcMw', 'technical.capacityAcMw', 'capacityAcMw', 'capacityAc', 'technical.installedPowerAcKw', 'installedPowerAcKw', 'vendorExtensions.capacityAc', 'adminRecord.technical.installedCapacityAcMw', 'adminRecord.installedCapacityAcMw'], undefined)),
            gridCapacity: optionalNumber(context.firstOf(row, ['technical.gridConnectionCapacityMw', 'gridConnectionCapacityMw', 'technical.gridCapacityMw', 'gridCapacityMw', 'gridCapacity', 'technical.gridCapacityKw', 'gridCapacityKw', 'vendorExtensions.gridCapacity', 'adminRecord.technical.gridConnectionCapacityMw', 'adminRecord.gridConnectionCapacityMw'], undefined)),
            panels: optionalNumber(context.firstOf(row, ['panels', 'panelCount', 'vendorExtensions.panelCount'], undefined)),
            inverters: optionalNumber(context.firstOf(row, ['inverters', 'inverterCount', 'vendorExtensions.inverterCount'], undefined)),
            strings: optionalNumber(context.firstOf(row, ['strings', 'stringCount', 'vendorExtensions.stringCount'], undefined)),
            transformers: optionalNumber(context.firstOf(row, ['transformers', 'transformerCount', 'vendorExtensions.transformerCount'], undefined)),
            meters: optionalNumber(context.firstOf(row, ['meters', 'meterCount', 'vendorExtensions.meterCount'], undefined)),
            battery: (() => { const explicit = context.firstOf(row, ['technical.batteryInstalled', 'batteryInstalled', 'battery', 'vendorExtensions.batteryInstalled', 'adminRecord.technical.batteryInstalled'], ''); if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '')
                return context.safeText(explicit, '—'); const capacity = optionalNumber(context.firstOf(row, ['technical.batteryCapacityKwh', 'operationalData.batteryCapacityKwh', 'batteryCapacityKwh', 'vendorExtensions.batteryCapacityKwh', 'adminRecord.technical.batteryCapacityKwh', 'adminRecord.batteryCapacityKwh'], '')); return capacity !== null ? (capacity > 0 ? `Yes · ${capacity} kWh` : 'No') : '—'; })(),
            devices: (() => { const explicit = optionalNumber(context.firstOf(row, ['operationalData.deviceCount', 'devicesCount', 'vendorExtensions.devicesCount', 'adminRecord.devicesCount'], undefined)); return explicit !== null ? explicit : (Array.isArray(row.devices) ? row.devices.length : null); })(),
            alerts: optionalNumber(context.firstOf(row, ['operationalData.openAlertCount', 'alertsCount', 'vendorExtensions.alertsCount', 'vendorExtensions.alarmCount'], undefined)),
            livePower: powerKw === null ? '—' : `${powerKw} kW`,
            today: todayEnergy === null ? '—' : `${todayEnergy} kWh`,
            month: context.safeText(context.firstOf(row, ['monthEnergy', 'monthlyEnergyKwh', 'vendorExtensions.monthlyEnergyKwh'], '—')),
            pr: context.safeText(context.firstOf(row, ['performanceRatio', 'pr', 'vendorExtensions.performanceRatio'], '—')),
            lastData: context.formatDate(context.firstOf(row, ['operationalData.lastDataAtUtc', 'lastDataAtUtc', 'lastDataAt', 'liveRecord.lastDataAt'], undefined), '—'),
            freshness: context.safeText(context.firstOf(row, ['operationalData.dataQualityStatus', 'dataQualityStatus', 'liveRecord.dataQualityStatus'], '—')),
            dataFreshness: context.safeText(context.firstOf(row, ['operationalData.dataFreshness', 'vendorExtensions.dataFreshness', 'dataFreshness'], '—')),
            commissioned: context.formatDate(context.firstOf(row, ['commissioningDate', 'technical.commissioningDate', 'adminRecord.commissioningDate', 'adminRecord.technical.commissioningDate'], undefined), '—'),
            owner: context.safeText(context.firstOf(row, ['clientAssignment.client.name', 'clientAssignment.client.clientName', 'clientAssignment.client.code', 'clientAssignment.client', 'client.name', 'client.clientName', 'client.code', 'client', 'Client', 'clientName', 'owner.name', 'owner.clientName', 'ownerName', 'adminRecord.client.name', 'adminRecord.client.clientName', 'adminRecord.client.code', 'adminRecord.client', 'adminRecord.Client'], '—')),
            operator: context.safeText(context.firstOf(row, ['clientAssignment.managingTenant.name', 'clientAssignment.managingTenant.tenantName', 'clientAssignment.managingTenant.code', 'clientAssignment.managingTenant.id', 'clientAssignment.managingTenant', 'clientAssignment.managingTenantId', 'managingTenant.name', 'managingTenant.tenantName', 'managingTenant.code', 'managingTenant.id', 'managingTenant', 'managingTenantId', 'operator.name', 'operator.tenantName', 'operator.id', 'operatorName', 'tenant.name', 'tenant.tenantName', 'tenant.code', 'tenant.id', 'adminRecord.managingTenant.name', 'adminRecord.managingTenant.tenantName', 'adminRecord.managingTenant.code', 'adminRecord.managingTenant.id', 'adminRecord.managingTenant', 'adminRecord.managingTenantId'], '—')),
            om: context.safeText(context.firstOf(row, ['serviceProvider.name', 'serviceProvider', 'omProvider.name', 'omProvider', 'commercial.serviceProvider', 'technical.serviceProvider', 'adminRecord.serviceProvider.name', 'adminRecord.serviceProvider'], '—')),
            sourceSystem: context.safeText(context.firstOf(row, ['providerData.provider', 'sourceSystem', 'provider', 'providerType', 'providerName', 'vendor', 'vendorName', 'source.provider', 'source.vendor', 'adminRecord.sourceSystem', 'adminRecord.provider', 'adminRecord.providerType', 'adminRecord.providerName', 'adminRecord.vendor'], provider), provider),
            updated: context.formatDate(context.firstOf(row, ['updatedAtUtc', 'createdAtUtc', 'adminRecord.updatedAtUtc', 'adminRecord.createdAtUtc'], undefined), '—'),
            lastDataAt: context.safeText(context.firstOf(row, ['operationalData.lastDataAtUtc', 'lastDataAtUtc', 'lastDataAt', 'liveRecord.lastDataAt'], ''), ''),
            lastSyncAt: context.safeText(context.firstOf(row, ['operationalData.lastSyncAtUtc', 'providerData.lastSyncAtUtc', 'lastSyncAt', 'lastSyncAtUtc', 'liveRecord.lastSyncAt', 'updatedAtUtc', 'adminRecord.updatedAtUtc'], ''), ''),
            dataQualityStatus: context.safeText(context.firstOf(row, ['operationalData.dataQualityStatus', 'dataQualityStatus', 'liveRecord.dataQualityStatus'], '—')),
            totalEnergy: optionalNumber(context.firstOf(row, ['operationalData.totalEnergyKwh', 'totalEnergyKwh', 'liveRecord.totalEnergyKwh'], undefined)), raw: row
        };
    });
    const devices = createContract(CONTRACT_DEFINITIONS.devices, (row, _index, context) => {
        const id = normalizedId(row, context);
        const provider = normalization.provider(context.firstOf(row, ['source.provider', 'provider', 'vendorExtensions.provider'], '—'));
        const deviceType = context.safeText(context.firstOf(row, ['identity.deviceType', 'deviceType', 'vendorExtensions.deviceType', 'type'], '—'));
        const name = strictDisplayName(row, context, [
            'identity.deviceName', 'vendorExtensions.deviceName', 'vendorExtensions.equipmentName', 'vendorExtensions.displayName',
            'vendorExtensions.name', 'sourceDeviceName', 'deviceName', 'equipmentName',
            'displayName', 'sourceEntityName', 'name'
        ], ['deviceCode', 'identity.deviceCode', 'deviceId', 'source.sourceDeviceId', 'sourceDeviceId', 'identity.serialNumber', 'serialNumber', 'id']);
        const ratedPower = optionalNumber(context.firstOf(row, ['specification.ratedActivePowerKw', 'technical.ratedPowerKw', 'vendorExtensions.ratedPowerKw', 'ratedPowerKw'], undefined));
        const lifecycleStatus = context.safeText(context.firstOf(row, ['status.lifecycleStatus', 'status.deviceStatus', 'lifecycleStatus', 'lifecycle'], '—'));
        const operationalStatus = context.safeText(context.firstOf(row, ['status.operationalStatus', 'operationalStatus', 'status'], 'Unknown'));
        return {
            dataOrigin: 'live', id,
            adminId: id,
            registryDeviceId: context.safeText(context.firstOf(row, ['registryDeviceId', 'adminRecord.id', 'adminRecord.deviceId'], ''), ''),
            canonicalDeviceId: context.safeText(context.firstOf(row, ['canonicalDeviceId', 'liveDeviceId'], ''), ''),
            sourceDeviceId: context.safeText(context.firstOf(row, ['source.sourceDeviceId', 'sourceDeviceId', 'identity.deviceCode', 'deviceCode'], ''), ''),
            externalId: context.safeText(context.firstOf(row, ['source.sourceDeviceId', 'sourceDeviceId', 'identity.deviceCode', 'deviceCode'], '—')),
            name, vendorDisplayName: name,
            registeredName: context.safeText(context.firstOf(row, ['deviceCode', 'identity.deviceCode', 'source.sourceDeviceId', 'sourceDeviceId', 'deviceId', 'identity.serialNumber', 'serialNumber', 'code', 'id'], ''), ''),
            type: deviceType,
            subtype: context.safeText(context.firstOf(row, ['specification.inverterCategory', 'specification.deviceCategory', 'vendorExtensions.subtype', 'subtype', 'vendorExtensions.rawDeviceType'], '—')),
            manufacturer: context.safeText(context.firstOf(row, ['identity.manufacturer', 'manufacturer'], '—'), '—'),
            model: context.safeText(context.firstOf(row, ['identity.model', 'technical.vendorModel', 'vendorModel', 'vendorExtensions.vendorModel', 'vendorExtensions.productModel', 'vendorExtensions.model', 'model'], '—')),
            serial: context.safeText(context.firstOf(row, ['identity.serialNumber', 'serialNumber'], '—')),
            firmware: context.safeText(context.firstOf(row, ['technical.firmwareVersion', 'firmwareVersion', 'vendorExtensions.firmwareVersion', 'vendorExtensions.firmware'], '—')),
            protocol: context.safeText(context.firstOf(row, ['technical.protocolVersion', 'communication.protocol', 'protocol'], '—')),
            ip: context.safeText(context.firstOf(row, ['technical.ipAddress', 'network.ipAddress', 'vendorExtensions.ip'], '—')),
            mac: context.safeText(context.firstOf(row, ['technical.macAddress', 'network.macAddress', 'vendorExtensions.mac'], '—')),
            plantId: context.safeText(context.firstOf(row, ['plantRelation.plantId', 'plantId', 'sourcePlantId'], ''), ''),
            plant: context.safeText(context.firstOf(row, ['plantRelation.plantName', 'plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName', 'vendorExtensions.stationName'], '—')),
            tenantId: context.safeText(context.firstOf(row, ['plantRelation.tenantId', 'tenantId'], ''), ''),
            tenant: context.safeText(context.firstOf(row, ['plantRelation.tenantName', 'plantRelation.managingTenant', 'tenant', 'tenantName', 'managingTenant', 'vendorExtensions.tenantName'], '—')),
            vendor: provider,
            integration: context.safeText(context.firstOf(row, ['source.integration', 'integration', 'integrationName', 'sourceIntegrationName'], '—')),
            status: normalization.deviceStatus(operationalStatus),
            lifecycle: lifecycleStatus,
            capacity: ratedPower === null
                ? context.safeText(context.firstOf(row, ['technical.ratedPowerKw', 'vendorExtensions.capacity', 'capacity'], '—'))
                : `${ratedPower} kW`,
            installation: context.formatDate(context.firstOf(row, ['lifecycle.installedAt', 'lifecycle.installDate', 'installationDate', 'installDate'], undefined), '—'),
            installDate: context.formatDate(context.firstOf(row, ['lifecycle.installDate', 'lifecycle.installedAt', 'installationDate', 'installDate'], undefined), '—'),
            warranty: context.safeText(context.firstOf(row, ['technical.warranty', 'lifecycle.warrantyExpiresAt', 'warranty', 'warrantyStatus', 'warrantyEndDate'], '—')),
            lastSeen: context.formatDate(context.firstOf(row, ['telemetry.lastSeenAtUtc', 'lastSeenAtUtc', 'lastSeenAt', 'vendorExtensions.collectionTime', 'collectionTime'], undefined), '—'),
            lastSeenAt: context.safeText(context.firstOf(row, ['telemetry.lastSeenAtUtc', 'lastSeenAtUtc', 'lastSeenAt', 'vendorExtensions.collectionTime', 'collectionTime'], ''), ''),
            alerts: optionalNumber(context.firstOf(row, ['alertsCount', 'vendorExtensions.alertsCount'], undefined)),
            power: context.safeText(context.firstOf(row, ['telemetry.power', 'telemetry.currentPowerKw', 'power', 'currentPowerKw', 'vendorExtensions.power'], '—')),
            voltage: context.safeText(context.firstOf(row, ['telemetry.voltage', 'voltage', 'vendorExtensions.voltage'], '—')),
            current: context.safeText(context.firstOf(row, ['telemetry.current', 'current', 'vendorExtensions.current'], '—')),
            temperature: context.safeText(context.firstOf(row, ['telemetry.temperature', 'temperature', 'vendorExtensions.temperature'], '—')),
            sourceStatus: context.safeText(context.firstOf(row, ['status.dataQualityStatus', 'vendorExtensions.dataFreshness', 'dataQualityStatus'], '—')),
            dataQualityStatus: context.safeText(context.firstOf(row, ['status.dataQualityStatus', 'dataQualityStatus'], '—')),
            alarmStatus: context.safeText(context.firstOf(row, ['vendorExtensions.alarmStatus', 'alarmStatus'], '—')),
            productId: context.safeText(context.firstOf(row, ['vendorExtensions.productId', 'productId'], ''), ''),
            connectivityStatus: context.safeText(context.firstOf(row, ['vendorExtensions.connectStatus', 'connectStatus', 'connectivityStatus'], ''), ''),
            collectionTime: context.safeText(context.firstOf(row, ['vendorExtensions.collectionTime', 'collectionTime'], ''), ''),
            rawPayloadRef: context.safeText(context.firstOf(row, ['vendorExtensions.rawPayloadRef', 'rawPayloadRef'], ''), ''),
            sourceSystem: context.safeText(context.firstOf(row, ['source.provider', 'vendorExtensions.sourceSystem', 'sourceSystem'], provider), provider),
            parent: context.safeText(context.firstOf(row, ['topology.parentDeviceName', 'parentRelation.parentDeviceName', 'parentDeviceName', 'topology.parentDeviceId', 'parentRelation.parentDeviceId', 'vendorExtensions.parentDeviceId', 'vendorExtensions.parent', 'parentDeviceId'], '—')),
            children: context.firstOf(row, ['topology.childCount', 'childCount', 'vendorExtensions.childCount', 'vendorExtensions.children', 'children'], null),
            location: context.safeText(context.firstOf(row, ['locationRelation.locationName', 'technical.location', 'location'], '—')),
            documents: Array.isArray(context.firstOf(row, ['documents'], [])) ? context.firstOf(row, ['documents'], []) : [],
            raw: row
        };
    });
    const alerts = createContract(CONTRACT_DEFINITIONS.alerts, (row, _index, context) => {
        const id = normalizedId(row, context);
        const provider = normalization.provider(context.firstOf(row, ['vendor.provider', 'provider'], 'Unknown'));
        const severity = normalization.alertSeverity(context.firstOf(row, ['canonical.canonicalSeverity', 'canonicalSeverity', 'severity', 'vendorSeverity'], 'Unknown'));
        const title = context.safeText(context.firstOf(row, ['canonical.canonicalName', 'canonicalName', 'title', 'message', 'vendor.vendorMessage', 'vendorMessage'], 'Unknown alert'));
        const occurredRaw = context.firstOf(row, ['workflow.occurredAtUtc', 'occurredAtUtc', 'created'], undefined);
        const updatedRaw = context.firstOf(row, ['audit.updatedAtUtc', 'workflow.lastSyncAtUtc', 'lastSyncAt', 'updated'], undefined);
        const occurredAt = context.formatDate(occurredRaw, '—');
        const updatedAt = context.formatDate(updatedRaw, '—');
        const timelineRows = Array.isArray(row.__timeline) ? row.__timeline : [];
        const timeline = timelineRows.map((event) => `${context.formatDate(event.occurredAtUtc, '—')} · ${context.safeText(event.eventType, 'Event')}${event.actor ? ` · ${context.safeText(event.actor)}` : ''}${event.comment ? ` · ${context.safeText(event.comment)}` : ''}`);
        const relatedPayload = (row.__related && typeof row.__related === 'object') ? row.__related : (row.related || {});
        const telemetryCurve = (row.__telemetryCurve && typeof row.__telemetryCurve === 'object') ? row.__telemetryCurve : {};
        const sop = (row.__sop && typeof row.__sop === 'object') ? row.__sop : null;
        return {
            dataOrigin: 'live', id,
            zentridCode: context.safeText(context.firstOf(row, ['canonical.canonicalCode', 'canonicalCode', 'zentridCode', 'vendorExtensions.zentridCode', 'vendorExtensions.alarmCode'], ''), ''),
            vendorRawCode: context.safeText(context.firstOf(row, ['vendor.vendorCode', 'vendorRawCode', 'sourceAlertId'], ''), ''),
            vendorCode: context.safeText(context.firstOf(row, ['vendor.vendorCode', 'vendorRawCode', 'sourceAlertId'], ''), ''),
            vendorMessage: context.safeText(context.firstOf(row, ['vendor.vendorMessage', 'vendorMessage', 'message'], ''), ''),
            vendorSeverity: context.safeText(context.firstOf(row, ['vendor.vendorSeverity', 'vendorSeverity'], ''), ''),
            canonicalCode: context.safeText(context.firstOf(row, ['canonical.canonicalCode', 'canonicalCode', 'zentridCode'], ''), ''),
            canonicalName: context.safeText(context.firstOf(row, ['canonical.canonicalName', 'canonicalName', 'title'], title), title),
            canonicalCategory: context.safeText(context.firstOf(row, ['canonical.canonicalCategory', 'canonicalCategory', 'category'], ''), ''),
            canonicalSeverity: context.safeText(context.firstOf(row, ['canonical.canonicalSeverity', 'canonicalSeverity'], ''), ''),
            severity,
            priority: context.safeText(context.firstOf(row, ['workflow.priority', 'priority'], '—')),
            title, vendorDisplayName: title,
            registeredName: context.safeText(context.firstOf(row, ['vendor.sourceAlertId', 'sourceAlertId', 'id'], ''), ''),
            status: normalization.alertStatus(context.firstOf(row, ['workflow.status', 'status'], 'Unknown')),
            occurrenceStatus: context.safeText(context.firstOf(row, ['workflow.occurrenceStatus', 'occurrenceStatus'], '—')),
            category: context.safeText(context.firstOf(row, ['canonical.canonicalCategory', 'canonicalCategory', 'category', 'vendorExtensions.alarmType'], '—')),
            tenant: context.safeText(context.firstOf(row, ['tenant.tenantName', 'tenant'], '—')),
            tenantId: context.safeText(context.firstOf(row, ['tenant.tenantId', 'tenantId'], ''), ''),
            plantId: context.safeText(context.firstOf(row, ['plant.plantId', 'plantId'], ''), ''),
            plant: context.safeText(context.firstOf(row, ['plant.plantName', 'plantName', 'plant'], '—')),
            deviceId: context.safeText(context.firstOf(row, ['device.deviceId', 'deviceId'], ''), ''),
            device: context.safeText(context.firstOf(row, ['device.deviceName', 'deviceName', 'device'], '—')),
            deviceType: context.safeText(context.firstOf(row, ['device.deviceType', 'deviceType'], '—')),
            vendor: provider,
            source: context.safeText(context.firstOf(row, ['vendor.sourceSystem', 'vendor.provider', 'source'], provider), provider),
            integration: context.safeText(context.firstOf(row, ['integration.integrationName', 'integrationName'], '—')),
            created: occurredAt,
            updated: updatedAt,
            age: context.safeText(context.firstOf(row, ['age', 'ageText'], '—')),
            sla: context.safeText(context.firstOf(row, ['sla.text', 'sla.status', 'sla'], '—')),
            owner: context.safeText(context.firstOf(row, ['assignment.assigneeName', 'owner'], '—')),
            telemetry: context.safeText(telemetryCurve.metricCode || relatedPayload.telemetryMetric || '—'),
            description: context.safeText(context.firstOf(row, ['guidance.description', 'vendor.vendorMessage', 'vendorMessage', 'message', 'vendorExtensions.alarmName'], '—')),
            probableCause: context.safeText(context.firstOf(row, ['guidance.probableCause', 'probableCause', 'vendorExtensions.reason'], '—')),
            recommendation: context.safeText(context.firstOf(row, ['guidance.recommendation', 'recommendation', 'solution', 'vendorExtensions.suggestion', 'vendorExtensions.solution'], '—')),
            sourceAlertId: context.safeText(context.firstOf(row, ['vendor.sourceAlertId', 'sourceAlertId'], ''), ''),
            sourcePlantId: context.safeText(context.firstOf(row, ['plant.sourcePlantId', 'sourcePlantId'], ''), ''),
            sourceDeviceId: context.safeText(context.firstOf(row, ['device.sourceDeviceId', 'sourceDeviceId'], ''), ''),
            mappingStatus: context.safeText(context.firstOf(row, ['mapping.mappingStatus', 'mappingStatus'], '—')),
            mappingVersion: context.safeText(context.firstOf(row, ['mapping.mappingVersion', 'mappingVersion'], '—')),
            rawPayloadRef: context.safeText(context.firstOf(row, ['audit.rawPayloadRef', 'vendorExtensions.rawPayloadRef'], '—')),
            lastSyncAtUtc: context.safeText(context.firstOf(row, ['workflow.lastSyncAtUtc', 'lastSyncAt'], '—')),
            timeline,
            related: {
                telemetryMetric: context.safeText(relatedPayload.telemetryMetric || telemetryCurve.metricCode || '—'),
                caseId: context.safeText(relatedPayload.caseId || '—'),
                taskId: context.safeText(relatedPayload.taskId || '—'),
                workOrderId: context.safeText(relatedPayload.workOrderId || '—')
            },
            canonical: row.canonical,
            mapping: row.mapping,
            workflow: row.workflow,
            assignment: row.assignment,
            guidance: row.guidance,
            vendorExtensions: row.vendorExtensions || {},
            audit: row.audit,
            sop,
            telemetryCurve,
            raw: row
        };
    });
    const telemetry = createContract(CONTRACT_DEFINITIONS.telemetry, (row, _index, context) => {
        const rawValue = context.firstOf(row, ['value.value', 'measurement.value', 'reading.value', 'telemetry.value', 'data.value', 'payload.value', 'metric.value', 'latest.value', 'point.value', 'sample.value', 'metricValue', 'numericValue', 'textValue', 'booleanValue', 'currentValue', 'rawValue', 'reading', 'value'], null);
        const metric = context.safeText(context.firstOf(row, ['metricCode', 'metricName', 'metric.name', 'metric.key', 'metric.code', 'measurement.name', 'measurement.metricName', 'reading.metricName', 'telemetry.metricName', 'data.metricName', 'payload.metricName', 'name', 'key', 'parameter', 'measurementName', 'field', 'metric'], '—'));
        const unit = normalizeTelemetryUnit(context.firstOf(row, ['value.unit', 'measurement.unit', 'reading.unit', 'telemetry.unit', 'data.unit', 'payload.unit', 'metric.unit', 'latest.unit', 'point.unit', 'sample.unit', 'unit', 'unitSymbol', 'uom', 'measurementUnit'], ''));
        const timestampRaw = context.firstOf(row, ['measurement.timestamp', 'measurement.measuredAtUtc', 'reading.timestamp', 'reading.measuredAtUtc', 'telemetry.timestamp', 'data.timestamp', 'payload.timestamp', 'latest.timestamp', 'point.timestamp', 'sample.timestamp', 'timestampUtc', 'timestamp', 'occurredAtUtc', 'measuredAtUtc', 'recordedAtUtc', 'collectedAtUtc', 'capturedAtUtc', 'createdAtUtc', 'lastDataAt', 'lastSyncAt'], undefined);
        const quality = context.safeText(context.firstOf(row, ['quality.status', 'measurement.quality', 'reading.quality', 'telemetry.quality', 'data.quality', 'payload.quality', 'dataQualityStatus', 'quality', 'qualityStatus', 'freshness', 'status'], '—'));
        return {
            dataOrigin: 'live',
            id: context.safeText(context.firstOf(row, ['id', 'telemetryId', 'metricId', 'canonicalId', 'sourceEntityId', 'telemetry.id', 'measurement.id', 'reading.id', 'data.id', 'payload.id'], ''), ''),
            metric,
            value: rawValue,
            valueText: rawValue === undefined || rawValue === null || rawValue === '' ? '—' : context.safeText(rawValue, '—'),
            numericValue: optionalNumber(rawValue),
            unit,
            displayValue: rawValue === undefined || rawValue === null || rawValue === ''
                ? '—'
                : `${context.safeText(rawValue, '—')}${unit ? ` ${unit}` : ''}`,
            timestamp: context.formatDate(timestampRaw, '—'),
            timestampRaw: timestampRaw === undefined || timestampRaw === null ? '' : context.safeText(timestampRaw, ''),
            quality,
            status: context.safeText(context.firstOf(row, ['status', 'quality.status', 'dataQualityStatus', 'qualityStatus', 'measurement.status', 'reading.status'], quality)),
            provider: normalization.provider(context.firstOf(row, ['source.provider', 'source.vendor', 'source.system', 'integration.provider', 'telemetry.provider', 'data.provider', 'payload.provider', 'provider', 'vendor', 'sourceSystem', 'providerName', 'vendorExtensions.provider'], '—')),
            tenantId: context.safeText(context.firstOf(row, ['tenant.id', 'tenant.tenantId', 'telemetry.tenantId', 'data.tenantId', 'payload.tenantId', 'tenantId', 'sourceTenantId'], ''), ''),
            tenant: context.safeText(context.firstOf(row, ['tenant.name', 'tenant.tenantName', 'telemetry.tenantName', 'data.tenantName', 'payload.tenantName', 'tenantName', 'tenant', 'managingTenant', 'vendorExtensions.tenantName'], '—')),
            plantId: context.safeText(context.firstOf(row, ['plant.id', 'plant.plantId', 'plant.sourcePlantId', 'telemetry.plantId', 'data.plantId', 'payload.plantId', 'sourcePlantId', 'plantId'], ''), ''),
            plant: context.safeText(context.firstOf(row, ['plant.name', 'plant.plantName', 'plant.stationName', 'telemetry.plantName', 'data.plantName', 'payload.plantName', 'plantName', 'sourcePlantName', 'stationName', 'siteName', 'vendorExtensions.plantName'], '—')),
            deviceId: context.safeText(context.firstOf(row, ['device.id', 'device.deviceId', 'device.sourceDeviceId', 'device.serialNumber', 'telemetry.deviceId', 'data.deviceId', 'payload.deviceId', 'sourceDeviceId', 'deviceId', 'serialNumber'], ''), ''),
            device: context.safeText(context.firstOf(row, ['device.name', 'device.deviceName', 'device.equipmentName', 'telemetry.deviceName', 'data.deviceName', 'payload.deviceName', 'deviceName', 'sourceDeviceName', 'equipmentName', 'vendorExtensions.deviceName'], '—')),
            granularity: context.safeText(context.firstOf(row, ['granularity', 'aggregationGranularity', 'interval'], ''), ''),
            deviceType: context.safeText(context.firstOf(row, ['device.type', 'device.deviceType', 'telemetry.deviceType', 'data.deviceType', 'payload.deviceType', 'deviceType', 'type', 'vendorExtensions.deviceType'], '—')),
            metadata: context.firstOf(row, ['metadata', 'tags', 'dimensions', 'source', 'vendorExtensions', 'telemetry.metadata', 'data.metadata', 'payload.metadata'], null),
            raw: row
        };
    });
    const integrations = createContract(CONTRACT_DEFINITIONS.integrations, (row, _index, context) => {
        const rawProvider = context.firstOf(row, ['provider', 'providerType', 'providerName', 'vendorName', 'vendor', 'producerVendorTemplate', 'vendorExtensions.provider', 'vendorExtensions.providerType', 'vendorExtensions.providerName', 'vendorExtensions.vendorName', 'source.provider', 'source.vendor', 'connector.provider', 'connector.vendor', 'integration.provider', 'integration.vendor', 'providerIntegration.providerType', 'sourceScheme'], '');
        const provider = rawProvider ? normalization.integrationProvider(rawProvider) : '—';
        const id = normalizedId(row, context);
        const name = context.safeText(context.firstOf(row, ['displayName', 'integrationName', 'name', 'vendorExtensions.displayName', 'vendorExtensions.integrationName', 'connector.displayName', 'connector.name', 'integration.displayName', 'integration.name', 'providerIntegration.displayName'], provider));
        const status = normalization.integrationStatus(context.firstOf(row, ['status', 'integrationStatus', 'vendorExtensions.status', 'vendorExtensions.integrationStatus', 'health', 'healthStatus', 'connectionStatus', 'lifecycleStatus', 'state', 'connector.status', 'integration.status', 'providerIntegration.status'], '—'));
        return {
            dataOrigin: 'live', id,
            code: context.safeText(context.firstOf(row, ['integrationCode', 'code'], ''), ''),
            name,
            tenant: context.safeText(context.firstOf(row, ['tenant', 'tenantName', 'managingTenant'], '—')),
            vendor: provider,
            software: context.safeText(context.firstOf(row, ['software', 'softwareName'], provider === '—' ? '—' : context.integrationSoftware(provider))),
            status, health: context.safeText(context.firstOf(row, ['health', 'healthStatus', 'connectionStatus', 'vendorExtensions.health', 'vendorExtensions.healthStatus', 'status', 'integrationStatus', 'vendorExtensions.status', 'vendorExtensions.integrationStatus'], status)),
            auth: context.safeText(context.firstOf(row, ['auth', 'authStatus', 'authenticationStatus'], '—')),
            discovery: context.safeText(context.firstOf(row, ['discovery', 'discoveryStatus'], '—')),
            plants: optionalNumber(context.firstOf(row, ['plantsCount', 'plantCount', 'plants'], undefined)),
            devices: optionalNumber(context.firstOf(row, ['devicesCount', 'deviceCount', 'devices'], undefined)),
            metrics: optionalNumber(context.firstOf(row, ['metricsCount', 'vendorExtensions.metricsCount'], undefined)),
            alerts: optionalNumber(context.firstOf(row, ['alertsCount', 'alertCount', 'alerts', 'vendorExtensions.activeAlertsCount'], undefined)),
            lastSync: context.safeText(row.lastSyncText, context.formatDate(row.lastSyncAtUtc, '—')),
            assignedTenants: context.safeText(context.firstOf(row, ['assignedTenants', 'tenantCount'], '—')),
            activeIntegrations: optionalNumber(context.firstOf(row, ['plantsWithDataCount', 'vendorExtensions.plantsWithDataCount'], undefined)),
            plantsWithoutData: optionalNumber(context.firstOf(row, ['plantsWithoutDataCount', 'vendorExtensions.plantsWithoutDataCount'], undefined)),
            stalePlants: optionalNumber(context.firstOf(row, ['stalePlantsCount', 'vendorExtensions.stalePlantsCount'], undefined)),
            errorRate: optionalNumber(context.firstOf(row, ['errorRatePct'], undefined)),
            version: context.safeText(context.firstOf(row, ['version', 'connectorVersion'], '—')),
            apiVersion: context.safeText(context.firstOf(row, ['apiVersion'], '—')),
            mappingVersion: context.safeText(context.firstOf(row, ['mappingVersion'], '—')),
            authType: context.safeText(context.firstOf(row, ['authType'], '—')),
            discoveryEnabled: context.safeText(context.firstOf(row, ['discoveryEnabled'], '—')),
            baseUrl: context.safeText(context.firstOf(row, ['baseUrl'], '—')),
            createdBy: context.safeText(context.firstOf(row, ['createdBy'], '—')),
            createdAt: context.formatDate(row.createdAtUtc, '—'),
            updatedBy: context.safeText(context.firstOf(row, ['updatedBy'], '—')),
            updatedAt: context.formatDate(context.firstOf(row, ['lastSyncAtUtc', 'updatedAtUtc', 'createdAtUtc'], undefined), '—'),
            lastActivity: context.safeText(context.firstOf(row, ['lastActivity', 'lastSyncText'], '—')),
            lastSuccessfulSync: context.safeText(context.firstOf(row, ['lastSuccessfulSync', 'lastSyncText'], '—')),
            vendorName: context.safeText(context.firstOf(row, ['vendorName', 'providerName', 'vendorExtensions.vendorName', 'vendorExtensions.providerName'], provider)),
            producerVendorTemplate: context.safeText(context.firstOf(row, ['producerVendorTemplate', 'vendorExtensions.producerVendorTemplate', 'providerTemplate', 'templateName'], ''), ''),
            lastErrorMessage: context.safeText(row.lastErrorMessage, ''),
            vendorExtensions: row.vendorExtensions || {}, raw: row
        };
    });
    window.ZentridAPIContracts = { clients, tenants, plants, devices, alerts, telemetry, integrations, diagnostics, fieldAudit, normalization };
    window.FleetAPIContracts = window.ZentridAPIContracts;
})();
