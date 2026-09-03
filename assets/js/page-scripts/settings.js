"use strict";
(() => {
    const layout = window.FleetLayout;
    const app = document.getElementById('app');
    if (!layout?.mount) {
        if (app)
            app.innerHTML = '<main class="main-content"><section class="empty-state zentrid-ux-state zentrid-ux-state-error"><strong>Workspace layout is unavailable.</strong><span>Reload the application after restarting the Zentrid server.</span></section></main>';
        return;
    }
    const SETTINGS_SOURCE = '/api/Auth/me';
    let activeTab = 'overview';
    let loadState = 'loading';
    let loadError = '';
    let loadedAt = null;
    let profile = {
        organization: '—', tenantCode: '—', legalName: '—', registrationNumber: '—', taxId: '—', country: '—', city: '—', address: '—', primaryContact: '—', email: '—', phone: '—', supportTier: '—', lifecycle: '—', region: '—', contract: '—', workspace: 'Tenant Admin'
    };
    let branding = { displayName: '—', shortName: '—', portalSubtitle: '—', theme: '', status: '—', showTenantName: null, includeBrandingInReports: null };
    let localization = { timezone: '—', language: '—', currency: '—', dateFormat: '—', numberFormat: '—', powerUnit: '—', energyUnit: '—', temperatureUnit: '—', irradianceUnit: '—' };
    let notifications = { operationalEmail: '—', financeEmail: '—', reportRecipients: '—', criticalAlerts: null, warningAlerts: null, offlineDevices: null, integrationHealth: null, dailySummary: null, invoiceUpdates: null, reportReady: null, accessChanges: null, emailChannel: null, inAppChannel: null };
    let dataSettings = { defaultTimeRange: '—', telemetryGranularity: '—', defaultReportFormat: '—', reportFrequency: '—', reportDelivery: '—', includeRawData: null, includeQualityFlags: null, useNormalizedData: null, completenessThreshold: '—', freshnessThreshold: '—', retentionPolicy: '—', mappingPolicy: '—', storageRegion: '—', sourceSync: '—' };
    let security = { adminMfa: null, stepUpAuth: null, sessionTimeout: '—', invitationExpiry: '—', accessReviewCadence: '—', externalUserExpiry: '—', exportReauthentication: null, restrictExternalSharing: null };
    let events = [];
    const esc = (value) => String(value ?? '—').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));
    const notify = (message) => layout.toast(message);
    const unsupportedMessage = 'This setting is read-only because the active Swagger does not provide a Tenant Settings mutation endpoint.';
    const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
    const text = (value, fallback = '—') => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            const result = String(value).trim();
            return result || fallback;
        }
        return fallback;
    };
    const firstOf = (record, keys, fallback = undefined) => {
        if (!record)
            return fallback;
        for (const key of keys) {
            const value = record[key];
            if (value !== undefined && value !== null && String(value).trim() !== '')
                return value;
        }
        return fallback;
    };
    const recordOf = (record, keys) => {
        if (!record)
            return null;
        for (const key of keys)
            if (isRecord(record[key]))
                return record[key];
        return null;
    };
    const mergeRecords = (...records) => Object.assign({}, ...records.filter(Boolean));
    const bool = (value) => {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value !== 0;
        if (typeof value !== 'string')
            return null;
        const normalized = value.trim().toLowerCase();
        if (['true', 'enabled', 'active', 'yes', 'required', 'enforced', 'on'].includes(normalized))
            return true;
        if (['false', 'disabled', 'inactive', 'no', 'optional', 'off'].includes(normalized))
            return false;
        return null;
    };
    const arrayRecords = (record, keys) => {
        if (!record)
            return [];
        for (const key of keys) {
            const value = record[key];
            if (Array.isArray(value))
                return value.filter(isRecord);
            if (isRecord(value)) {
                for (const nestedKey of ['items', 'records', 'rows', 'data', 'events', 'activity']) {
                    const nested = value[nestedKey];
                    if (Array.isArray(nested))
                        return nested.filter(isRecord);
                }
            }
        }
        return [];
    };
    const themeValue = (value) => {
        const candidate = text(value, '').toLowerCase();
        return ['ocean', 'emerald', 'violet', 'graphite'].includes(candidate) ? candidate : '';
    };
    const tone = (value) => {
        const normalized = value.toLowerCase();
        if (normalized === '—' || normalized.includes('unavailable') || normalized.includes('disabled') || normalized.includes('failed') || normalized.includes('blocked'))
            return 'danger';
        if (normalized.includes('pending') || normalized.includes('review') || normalized.includes('attention'))
            return 'warning';
        if (normalized.includes('managed') || normalized.includes('read-only') || normalized.includes('info'))
            return 'info';
        return 'success';
    };
    const badge = (value) => `<span class="badge ${tone(value)}">${esc(value)}</span>`;
    const boolStatus = (value) => value === true ? 'Enabled' : value === false ? 'Disabled' : '—';
    const known = (value) => Boolean(value && value !== '—');
    const mapEvent = (row, index) => ({
        id: text(firstOf(row, ['id', 'eventId', 'auditId', 'reference']), `event-${index + 1}`),
        event: text(firstOf(row, ['event', 'title', 'action', 'type'])),
        area: text(firstOf(row, ['area', 'category', 'section', 'scope'])),
        description: text(firstOf(row, ['description', 'details', 'message', 'note'])),
        actor: text(firstOf(row, ['actor', 'actorName', 'userName', 'createdBy'])),
        time: text(firstOf(row, ['time', 'timestamp', 'createdAt', 'occurredAt', 'updatedAt'])),
        status: text(firstOf(row, ['status', 'result', 'outcome']))
    });
    const applyPayload = (payload) => {
        if (!isRecord(payload))
            throw new Error('Current user response is not an object.');
        const root = recordOf(payload, ['data', 'result', 'user', 'profile']) || payload;
        const tenant = recordOf(root, ['tenant', 'organization', 'tenantProfile', 'company']);
        const settings = recordOf(root, ['tenantSettings', 'settings', 'configuration', 'preferences']);
        const profileSource = mergeRecords(tenant, recordOf(settings, ['profile', 'organizationProfile', 'organization']), root);
        const brandSource = mergeRecords(recordOf(settings, ['branding', 'brand']), recordOf(tenant, ['branding', 'brand']));
        const localizationSource = mergeRecords(recordOf(settings, ['localization', 'regional', 'locale']), recordOf(root, ['localization', 'regional', 'locale']));
        const notificationSource = mergeRecords(recordOf(settings, ['notifications', 'notificationSettings']), recordOf(root, ['notifications', 'notificationSettings']));
        const dataSource = mergeRecords(recordOf(settings, ['data', 'dataSettings', 'reports', 'reportSettings']), recordOf(root, ['dataSettings', 'reportSettings']));
        const securitySource = mergeRecords(recordOf(settings, ['security', 'securitySettings', 'securityDefaults']), recordOf(root, ['securitySettings', 'securityDefaults']));
        profile = {
            organization: text(firstOf(tenant, ['displayName', 'name', 'tenantName', 'organizationName'], firstOf(root, ['tenantName', 'organizationName', 'organization']))),
            tenantCode: text(firstOf(profileSource, ['tenantCode', 'code', 'tenantId', 'organizationCode'])),
            legalName: text(firstOf(profileSource, ['legalName', 'registeredName', 'companyName'])),
            registrationNumber: text(firstOf(profileSource, ['registrationNumber', 'registrationNo', 'companyNumber'])),
            taxId: text(firstOf(profileSource, ['taxId', 'taxNumber', 'vatNumber'])),
            country: text(firstOf(profileSource, ['country', 'countryName'])),
            city: text(firstOf(profileSource, ['city', 'locality'])),
            address: text(firstOf(profileSource, ['address', 'registeredAddress', 'streetAddress'])),
            primaryContact: text(firstOf(profileSource, ['primaryContact', 'contactName', 'supportContact'])),
            email: text(firstOf(profileSource, ['contactEmail', 'primaryContactEmail', 'supportEmail'])),
            phone: text(firstOf(profileSource, ['contactPhone', 'primaryContactPhone', 'phone'])),
            supportTier: text(firstOf(profileSource, ['supportTier', 'serviceTier', 'planName'])),
            lifecycle: text(firstOf(profileSource, ['lifecycle', 'lifecycleStatus', 'tenantStatus', 'status'])),
            region: text(firstOf(profileSource, ['region', 'infrastructureRegion', 'dataRegion'])),
            contract: text(firstOf(profileSource, ['contract', 'contractId', 'agreementId'])),
            workspace: 'Tenant Admin'
        };
        branding = {
            displayName: text(firstOf(brandSource, ['displayName', 'name', 'tenantName'])),
            shortName: text(firstOf(brandSource, ['shortName', 'initials', 'abbreviation'])),
            portalSubtitle: text(firstOf(brandSource, ['portalSubtitle', 'subtitle', 'tagline'])),
            theme: themeValue(firstOf(brandSource, ['theme', 'themePreset', 'preset'])),
            status: text(firstOf(brandSource, ['status', 'publicationStatus', 'state'])),
            showTenantName: bool(firstOf(brandSource, ['showTenantName', 'tenantNameVisible'])),
            includeBrandingInReports: bool(firstOf(brandSource, ['includeBrandingInReports', 'reportBranding', 'brandingInReports']))
        };
        localization = {
            timezone: text(firstOf(localizationSource, ['timezone', 'timeZone'])), language: text(firstOf(localizationSource, ['language', 'locale'])), currency: text(firstOf(localizationSource, ['currency', 'currencyCode'])), dateFormat: text(firstOf(localizationSource, ['dateFormat'])), numberFormat: text(firstOf(localizationSource, ['numberFormat'])), powerUnit: text(firstOf(localizationSource, ['powerUnit'])), energyUnit: text(firstOf(localizationSource, ['energyUnit'])), temperatureUnit: text(firstOf(localizationSource, ['temperatureUnit'])), irradianceUnit: text(firstOf(localizationSource, ['irradianceUnit']))
        };
        notifications = {
            operationalEmail: text(firstOf(notificationSource, ['operationalEmail', 'operationsEmail'])), financeEmail: text(firstOf(notificationSource, ['financeEmail', 'billingEmail'])), reportRecipients: text(firstOf(notificationSource, ['reportRecipients', 'reportEmails'])), criticalAlerts: bool(firstOf(notificationSource, ['criticalAlerts'])), warningAlerts: bool(firstOf(notificationSource, ['warningAlerts'])), offlineDevices: bool(firstOf(notificationSource, ['offlineDevices'])), integrationHealth: bool(firstOf(notificationSource, ['integrationHealth'])), dailySummary: bool(firstOf(notificationSource, ['dailySummary'])), invoiceUpdates: bool(firstOf(notificationSource, ['invoiceUpdates'])), reportReady: bool(firstOf(notificationSource, ['reportReady'])), accessChanges: bool(firstOf(notificationSource, ['accessChanges'])), emailChannel: bool(firstOf(notificationSource, ['emailChannel', 'emailEnabled'])), inAppChannel: bool(firstOf(notificationSource, ['inAppChannel', 'inAppEnabled']))
        };
        dataSettings = {
            defaultTimeRange: text(firstOf(dataSource, ['defaultTimeRange', 'timeRange'])), telemetryGranularity: text(firstOf(dataSource, ['telemetryGranularity', 'granularity'])), defaultReportFormat: text(firstOf(dataSource, ['defaultReportFormat', 'reportFormat'])), reportFrequency: text(firstOf(dataSource, ['reportFrequency', 'frequency'])), reportDelivery: text(firstOf(dataSource, ['reportDelivery', 'delivery'])), includeRawData: bool(firstOf(dataSource, ['includeRawData'])), includeQualityFlags: bool(firstOf(dataSource, ['includeQualityFlags'])), useNormalizedData: bool(firstOf(dataSource, ['useNormalizedData', 'normalizedData'])), completenessThreshold: text(firstOf(dataSource, ['completenessThreshold'])), freshnessThreshold: text(firstOf(dataSource, ['freshnessThreshold'])), retentionPolicy: text(firstOf(dataSource, ['retentionPolicy', 'retention'])), mappingPolicy: text(firstOf(dataSource, ['mappingPolicy', 'mappingVersion'])), storageRegion: text(firstOf(dataSource, ['storageRegion', 'dataRegion'])), sourceSync: text(firstOf(dataSource, ['sourceSync', 'syncPolicy']))
        };
        security = {
            adminMfa: bool(firstOf(securitySource, ['adminMfa', 'requireAdminMfa', 'mfaRequired'])), stepUpAuth: bool(firstOf(securitySource, ['stepUpAuth', 'requireStepUpAuth', 'sensitiveActionReauthentication'])), sessionTimeout: text(firstOf(securitySource, ['sessionTimeout', 'idleTimeout'])), invitationExpiry: text(firstOf(securitySource, ['invitationExpiry', 'inviteExpiry'])), accessReviewCadence: text(firstOf(securitySource, ['accessReviewCadence', 'reviewCadence'])), externalUserExpiry: text(firstOf(securitySource, ['externalUserExpiry', 'externalAccessExpiry'])), exportReauthentication: bool(firstOf(securitySource, ['exportReauthentication', 'requireExportReauthentication'])), restrictExternalSharing: bool(firstOf(securitySource, ['restrictExternalSharing', 'externalSharingRestricted']))
        };
        const eventRows = [
            ...arrayRecords(settings, ['activity', 'events', 'auditTrail', 'settingsActivity']),
            ...arrayRecords(root, ['settingsActivity', 'activity', 'events', 'auditTrail'])
        ];
        events = eventRows.map(mapEvent).filter(item => item.event !== '—');
    };
    const loadSettings = async () => {
        loadState = 'loading';
        loadError = '';
        render();
        try {
            const api = window.ZentridPlatformAPI?.auth?.me || window.ZentridAuth?.me;
            if (typeof api !== 'function')
                throw new Error(`${SETTINGS_SOURCE} runtime is unavailable.`);
            const payload = await api();
            applyPayload(payload);
            loadedAt = new Date();
            loadState = 'ready';
        }
        catch (error) {
            loadState = 'error';
            loadError = error instanceof Error ? error.message : String(error);
        }
        render();
    };
    const initials = () => {
        const source = known(branding.shortName) ? branding.shortName : known(branding.displayName) ? branding.displayName.split(/\s+/).map(item => item[0] || '').join('').slice(0, 2) : '—';
        return source.toUpperCase().slice(0, 3);
    };
    const render = () => {
        layout.mount(`
      <div class="tenant-settings-page-v1437 theme-${esc(branding.theme || 'ocean')}" id="tenantSettingsRoot">
        <section class="page-hero tenant-settings-hero-v1437">
          <div>
            <p class="eyebrow">Tenant Admin · Configuration</p>
            <h1>Tenant Settings</h1>
            <p class="muted">Manage organization identity, branding, localization, notifications, data defaults and tenant security policies without platform-level configuration access.</p>
          </div>
          <button class="freshness-card" type="button" data-settings-action="export">
            <span class="pulse"></span>
            <div><strong>${loadState === 'loading' ? 'Loading configuration' : loadState === 'error' ? 'Configuration unavailable' : 'Configuration snapshot'}</strong><small>${loadState === 'error' ? esc(loadError || 'API request failed') : loadedAt ? `Updated ${esc(loadedAt.toLocaleString())}` : 'Waiting for API'}</small></div>
          </button>
        </section>
        <section class="context-bar glass-card tenant-settings-context-v1437">
          <button class="ctx-item" type="button"><span>Tenant</span><strong>${esc(profile.organization)}</strong></button>
          <button class="ctx-item" type="button"><span>Configuration Scope</span><strong>Tenant only</strong></button>
          <button class="ctx-item" type="button"><span>Timezone</span><strong>${esc(localization.timezone)}</strong></button>
          <button class="ctx-item" type="button"><span>Security</span><strong>${security.adminMfa === true ? 'MFA enforced' : security.adminMfa === false ? 'Disabled' : '—'}</strong></button>
        </section>
        <section class="plant-workspace-v17 tenant-settings-workspace-v1437">
          <aside class="glass-card plant-side-card-v17 tenant-settings-side-v1437">
            <h3>Tenant Settings</h3>
            ${[
            ['overview', 'Overview'], ['profile', 'Organization Profile'], ['branding', 'Branding'], ['localization', 'Localization & Units'], ['notifications', 'Notifications'], ['data', 'Data & Reports'], ['security', 'Security Defaults'], ['activity', 'Activity']
        ].map(([key, label]) => `<button type="button" class="${activeTab === key ? 'active' : ''}" data-settings-tab="${key}">${label}</button>`).join('')}
          </aside>
          <section class="glass-card plant-main-card-v17 tenant-settings-main-v1437">
            <div id="tenantSettingsTabContent"></div>
          </section>
        </section>
        <aside class="detail-drawer tenant-settings-drawer-v1437" id="tenantSettingsDrawer" aria-hidden="true">
          <button class="drawer-close" type="button" data-settings-close aria-label="Close settings editor">×</button>
          <div id="tenantSettingsDrawerContent"></div>
        </aside>
      </div>
    `);
        drawTab();
    };
    const drawTab = () => {
        const root = document.getElementById('tenantSettingsTabContent');
        if (!root)
            return;
        const renderers = {
            overview: overviewTab,
            profile: profileTab,
            branding: brandingTab,
            localization: localizationTab,
            notifications: notificationsTab,
            data: dataTab,
            security: securityTab,
            activity: activityTab
        };
        root.innerHTML = renderers[activeTab]();
    };
    const sectionHead = (title, description, actions = '') => `<div class="section-title-v17 tenant-settings-section-head-v1437"><div><h2>${esc(title)}</h2><p class="muted">${esc(description)}</p></div>${actions ? `<div class="tenant-settings-head-actions-v1437">${actions}</div>` : ''}</div>`;
    function overviewTab() {
        const notificationValues = [notifications.criticalAlerts, notifications.warningAlerts, notifications.offlineDevices, notifications.integrationHealth, notifications.dailySummary, notifications.invoiceUpdates, notifications.reportReady, notifications.accessChanges];
        const securityValues = [security.adminMfa, security.stepUpAuth, security.exportReauthentication, security.restrictExternalSharing];
        const notificationCount = notificationValues.some(value => value !== null) ? notificationValues.filter(value => value === true).length : null;
        const securityScore = securityValues.some(value => value !== null) ? securityValues.filter(value => value === true).length : null;
        return `
      ${sectionHead('Tenant Configuration Overview', `Current organization, user experience and governance defaults for ${profile.organization}.`, `<button class="secondary-action" type="button" data-settings-action="export">Export Snapshot</button>`)}
      <div class="kpi-grid tenant-settings-kpis-v1437">
        ${[
            ['Organization', profile.organization, profile.tenantCode],
            ['Brand Theme', branding.theme ? branding.theme.charAt(0).toUpperCase() + branding.theme.slice(1) : '—', branding.displayName],
            ['Timezone', localization.timezone, `${localization.language} · ${localization.currency}`],
            ['Notifications', notificationCount === null ? '—' : `${notificationCount}/8`, notificationCount === null ? 'No notification settings returned' : 'Operational preferences enabled'],
            ['Data Layer', dataSettings.useNormalizedData === true ? 'Normalized' : dataSettings.useNormalizedData === false ? 'Vendor raw' : '—', known(dataSettings.telemetryGranularity) ? `${dataSettings.telemetryGranularity} default` : '—'],
            ['Security Controls', securityScore === null ? '—' : `${securityScore}/4`, security.adminMfa === true ? 'Admin MFA enforced' : security.adminMfa === false ? 'MFA disabled' : 'No security settings returned']
        ].map(([label, value, sub]) => `<article class="kpi-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`).join('')}
      </div>
      <div class="tenant-settings-flow-v1437">
        ${[
            ['1', 'Identity', 'Legal and operational profile'], ['2', 'Experience', 'Branding, language and units'], ['3', 'Communication', 'Alerts, reports and billing notices'], ['4', 'Data Defaults', 'Telemetry and report behavior'], ['5', 'Governance', 'Tenant security and audit trail']
        ].map(item => `<article><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`).join('')}
      </div>
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Configuration Readiness</h2><p>Coverage of required tenant-level settings.</p></div></div>
          <div class="tenant-settings-readiness-v1437">
            ${[
            ['Organization profile', known(profile.organization) && known(profile.email) && known(profile.primaryContact), profile.primaryContact],
            ['Branding', known(branding.displayName) && known(branding.shortName), branding.theme || '—'],
            ['Localization', known(localization.timezone) && known(localization.currency), `${localization.powerUnit} · ${localization.energyUnit}`],
            ['Notifications', notifications.emailChannel === true || notifications.inAppChannel === true, notificationCount === null ? '—' : `${notificationCount} preferences enabled`],
            ['Data defaults', dataSettings.useNormalizedData === true, dataSettings.defaultReportFormat],
            ['Security', security.adminMfa === true && security.stepUpAuth === true, security.sessionTimeout]
        ].map(([label, ready, note]) => `<button type="button" data-settings-jump="${label === 'Organization profile' ? 'profile' : label.toLowerCase().split(' ')[0]}" class="tenant-settings-readiness-row-v1437"><div><strong>${esc(label)}</strong><small>${esc(note)}</small></div>${badge(ready ? 'Configured' : 'Review required')}</button>`).join('')}
          </div>
        </section>
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Recent Configuration Activity</h2><p>Latest tenant setting changes and reviews.</p></div><button class="small-btn ghost" type="button" data-settings-jump="activity">Open Activity</button></div>
          ${activityList(events.slice(0, 5))}
        </section>
      </div>
      <div class="tenant-settings-boundary-v1437">
        <div><strong>Tenant configuration boundary</strong><small>Platform infrastructure, authentication providers, API credentials, tariffs, payment routing, vendor mappings and data-retention policies are managed outside this workspace.</small></div>
        ${badge('Tenant only')}
      </div>
    `;
    }
    function profileTab() {
        return `
      ${sectionHead('Organization Profile', 'Identity, legal and operational contact information used across the tenant workspace.', `<button class="primary-action" type="button" data-settings-edit="profile" data-permission-action="edit" data-permission-resource="settings">Edit Profile</button>`)}
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Organization Identity</h2><p>Primary tenant identity shown in Zentrid.</p></div>${badge(profile.lifecycle)}</div>
          <div class="information-grid tenant-settings-info-v1437">
            <div><span>Organization</span><strong>${esc(profile.organization)}</strong></div>
            <div><span>Tenant Code</span><strong>${esc(profile.tenantCode)}</strong></div>
            <div><span>Legal Name</span><strong>${esc(profile.legalName)}</strong></div>
            <div><span>Registration Number</span><strong>${esc(profile.registrationNumber)}</strong></div>
            <div><span>Tax ID</span><strong>${esc(profile.taxId)}</strong></div>
            <div><span>Support Tier</span><strong>${esc(profile.supportTier)}</strong></div>
          </div>
        </section>
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Contact & Address</h2><p>Operational contact used for tenant communications.</p></div></div>
          <div class="information-grid tenant-settings-info-v1437">
            <div><span>Primary Contact</span><strong>${esc(profile.primaryContact)}</strong></div>
            <div><span>Email</span><strong>${esc(profile.email)}</strong></div>
            <div><span>Phone</span><strong>${esc(profile.phone)}</strong></div>
            <div><span>Country</span><strong>${esc(profile.country)}</strong></div>
            <div><span>City</span><strong>${esc(profile.city)}</strong></div>
            <div><span>Address</span><strong>${esc(profile.address)}</strong></div>
          </div>
        </section>
      </div>
      <section class="panel glass-card tenant-settings-managed-v1437">
        <div><strong>Provider-managed fields</strong><small>Tenant lifecycle status, contract, service tier assignment and infrastructure region are visible here but changed by the Zentrid service provider.</small></div>
        <div class="tenant-settings-managed-grid-v1437"><span>Lifecycle: ${esc(profile.lifecycle)}</span><span>Region: ${esc(profile.region)}</span><span>Contract: ${esc(profile.contract)}</span><span>Workspace: ${esc(profile.workspace)}</span></div>
      </section>
    `;
    }
    function brandingTab() {
        return `
      ${sectionHead('Branding', 'Tenant-facing identity used in navigation, generated reports and portal communication.', `<button class="primary-action" type="button" data-settings-edit="branding" data-permission-action="edit" data-permission-resource="settings">Edit Branding</button>`)}
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Brand Preview</h2><p>Preview of the selected tenant identity.</p></div>${badge(branding.status)}</div>
          <div class="tenant-brand-preview-v1437 preset-${esc(branding.theme)}">
            <div class="tenant-brand-mark-v1437">${esc(initials())}</div>
            <div><strong>${esc(branding.displayName)}</strong><small>${esc(branding.portalSubtitle)}</small></div>
          </div>
          <div class="information-grid tenant-settings-info-v1437">
            <div><span>Display Name</span><strong>${esc(branding.displayName)}</strong></div>
            <div><span>Short Name</span><strong>${esc(branding.shortName)}</strong></div>
            <div><span>Theme Preset</span><strong>${esc(branding.theme)}</strong></div>
            <div><span>Portal Tenant Name</span><strong>${branding.showTenantName === true ? 'Visible' : branding.showTenantName === false ? 'Hidden' : '—'}</strong></div>
            <div><span>Report Branding</span><strong>${branding.includeBrandingInReports === true ? 'Included' : branding.includeBrandingInReports === false ? 'Not included' : '—'}</strong></div>
          </div>
        </section>
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Theme Presets</h2><p>Approved Zentrid visual variants. Custom CSS is not permitted.</p></div></div>
          <div class="tenant-theme-grid-v1437">
            ${['ocean', 'emerald', 'violet', 'graphite'].map(theme => `<button type="button" class="tenant-theme-card-v1437 preset-${theme} ${branding.theme === theme ? 'active' : ''}" data-theme-preview="${theme}"><span></span><strong>${theme.charAt(0).toUpperCase() + theme.slice(1)}</strong><small>${branding.theme === theme ? 'Current preset' : 'Available preset'}</small></button>`).join('')}
          </div>
          <div class="tenant-settings-note-v1437"><strong>Safe branding</strong><small>Theme presets preserve contrast, responsive behavior and CSP compliance across all Tenant Admin pages.</small></div>
        </section>
      </div>
    `;
    }
    function localizationTab() {
        const unitRows = [
            ['Power', localization.powerUnit, 'Canonical power display'],
            ['Energy', localization.energyUnit, 'Canonical energy display'],
            ['Temperature', localization.temperatureUnit, 'Weather and device temperature'],
            ['Irradiance', localization.irradianceUnit, 'Solar resource display']
        ];
        return `
      ${sectionHead('Localization & Units', 'Default language, timezone, currency and normalized engineering units for tenant users.', `<button class="primary-action" type="button" data-settings-edit="localization" data-permission-action="edit" data-permission-resource="settings">Edit Localization</button>`)}
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Regional Preferences</h2><p>Applied by default to new tenant users and reports.</p></div></div><div class="information-grid tenant-settings-info-v1437"><div><span>Timezone</span><strong>${esc(localization.timezone)}</strong></div><div><span>Language</span><strong>${esc(localization.language)}</strong></div><div><span>Currency</span><strong>${esc(localization.currency)}</strong></div><div><span>Date Format</span><strong>${esc(localization.dateFormat)}</strong></div><div><span>Number Format</span><strong>${esc(localization.numberFormat)}</strong></div></div></section>
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Normalization Policy</h2><p>All vendor values are displayed through the canonical Zentrid data layer.</p></div>${badge(dataSettings.useNormalizedData === true ? 'Normalized' : dataSettings.useNormalizedData === false ? 'Vendor raw' : '—')}</div><div class="tenant-settings-note-list-v1437"><article><strong>Vendor source preserved</strong><small>Raw values remain traceable in source metadata.</small></article><article><strong>Canonical labels</strong><small>Users see one consistent field name across vendors.</small></article><article><strong>Canonical units</strong><small>Selected display units apply consistently across supported pages.</small></article></div></section>
      </div>
      <section class="panel glass-card"><div class="panel-head"><div><h2>Engineering Units</h2><p>Tenant display preferences for normalized metrics.</p></div></div><div class="data-table tenant-settings-unit-table-v1437"><div class="data-head"><span>Domain</span><span>Display Unit</span><span>Usage</span><span>Status</span></div>${unitRows.map(row => `<div class="data-row"><div><strong>${esc(row[0])}</strong></div><div><strong>${esc(row[1])}</strong></div><div><strong>${esc(row[2])}</strong></div><div>${badge('Active')}</div></div>`).join('')}</div></section>
    `;
    }
    function notificationsTab() {
        const preferences = [
            ['Critical alerts', 'Immediate operational alert notifications', notifications.criticalAlerts],
            ['Warning alerts', 'Warning and performance degradation events', notifications.warningAlerts],
            ['Offline devices', 'Device and gateway offline notifications', notifications.offlineDevices],
            ['Integration health', 'Synchronization delay and connector health', notifications.integrationHealth],
            ['Daily summary', 'Daily operating summary for tenant assets', notifications.dailySummary],
            ['Invoice updates', 'Invoice issue, due date and payment updates', notifications.invoiceUpdates],
            ['Report ready', 'Generated and scheduled report completion', notifications.reportReady],
            ['Access changes', 'User invitation, role and suspension events', notifications.accessChanges]
        ];
        return `
      ${sectionHead('Notifications', 'Default recipients, channels and event categories for tenant operational communication.', `<button class="primary-action" type="button" data-settings-edit="notifications" data-permission-action="edit" data-permission-resource="settings">Edit Notifications</button>`)}
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Delivery Channels</h2><p>Enabled channels for tenant notifications.</p></div></div><div class="tenant-channel-grid-v1437"><article><span>✉</span><div><strong>Email</strong><small>${esc(notifications.operationalEmail)}</small></div>${badge(boolStatus(notifications.emailChannel))}</article><article><span>●</span><div><strong>In-app</strong><small>Zentrid notification center</small></div>${badge(boolStatus(notifications.inAppChannel))}</article></div><div class="information-grid tenant-settings-info-v1437"><div><span>Operational Email</span><strong>${esc(notifications.operationalEmail)}</strong></div><div><span>Finance Email</span><strong>${esc(notifications.financeEmail)}</strong></div><div><span>Report Recipients</span><strong>${esc(notifications.reportRecipients)}</strong></div></div></section>
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Event Preferences</h2><p>Notifications enabled for this tenant.</p></div></div><div class="tenant-preference-list-v1437">${preferences.map(([label, note, enabled]) => `<article><div><strong>${esc(label)}</strong><small>${esc(note)}</small></div>${badge(boolStatus(enabled))}</article>`).join('')}</div></section>
      </div>
      <div class="tenant-settings-boundary-v1437"><div><strong>Escalation ownership</strong><small>Platform incident routing, provider escalation and integration credential alerts remain managed by the Zentrid service provider.</small></div>${badge('Provider managed')}</div>
    `;
    }
    function dataTab() {
        return `
      ${sectionHead('Data & Reports', 'Default telemetry, data quality and report behavior used across the tenant workspace.', `<button class="primary-action" type="button" data-settings-edit="data" data-permission-action="edit" data-permission-resource="settings">Edit Defaults</button>`)}
      <div class="module-grid tenant-settings-two-col-v1437">
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Telemetry Defaults</h2><p>Default exploration behavior for operational data.</p></div>${badge(dataSettings.useNormalizedData === true ? 'Normalized' : dataSettings.useNormalizedData === false ? 'Vendor raw' : '—')}</div><div class="information-grid tenant-settings-info-v1437"><div><span>Default Time Range</span><strong>${esc(dataSettings.defaultTimeRange)}</strong></div><div><span>Granularity</span><strong>${esc(dataSettings.telemetryGranularity)}</strong></div><div><span>Completeness Threshold</span><strong>${esc(dataSettings.completenessThreshold)}</strong></div><div><span>Freshness Threshold</span><strong>${esc(dataSettings.freshnessThreshold)}</strong></div><div><span>Quality Flags</span><strong>${boolStatus(dataSettings.includeQualityFlags)}</strong></div><div><span>Raw Data Attachment</span><strong>${boolStatus(dataSettings.includeRawData)}</strong></div></div></section>
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Report Defaults</h2><p>Defaults used when opening the Tenant Report Builder.</p></div></div><div class="information-grid tenant-settings-info-v1437"><div><span>Default Format</span><strong>${esc(dataSettings.defaultReportFormat)}</strong></div><div><span>Frequency</span><strong>${esc(dataSettings.reportFrequency)}</strong></div><div><span>Delivery</span><strong>${esc(dataSettings.reportDelivery)}</strong></div><div><span>Tenant Branding</span><strong>${branding.includeBrandingInReports === true ? 'Included' : branding.includeBrandingInReports === false ? 'Not included' : '—'}</strong></div><div><span>Timezone</span><strong>${esc(localization.timezone)}</strong></div><div><span>Currency</span><strong>${esc(localization.currency)}</strong></div></div></section>
      </div>
      <section class="panel glass-card tenant-settings-managed-v1437"><div><strong>Platform-managed data policies</strong><small>Retention, archival, canonical mapping versions, source onboarding and telemetry ingestion schedules are read-only for Tenant Admin.</small></div><div class="tenant-settings-managed-grid-v1437"><span>Retention: ${esc(dataSettings.retentionPolicy)}</span><span>Mapping: ${esc(dataSettings.mappingPolicy)}</span><span>Storage region: ${esc(dataSettings.storageRegion)}</span><span>Source sync: ${esc(dataSettings.sourceSync)}</span></div></section>
    `;
    }
    function securityTab() {
        const policies = [
            ['Tenant Administrator MFA', boolStatus(security.adminMfa), 'Tenant Administrator', 'Required before privileged access'],
            ['Sensitive action re-authentication', boolStatus(security.stepUpAuth), 'Tenant administrators', 'User, settings and export changes'],
            ['Session timeout', security.sessionTimeout, 'All tenant users', 'Idle session control'],
            ['Invitation expiry', security.invitationExpiry, 'New users', 'Pending tenant invitations'],
            ['Access review cadence', security.accessReviewCadence, 'All active users', 'Tenant access certification'],
            ['External user expiry', security.externalUserExpiry, 'External users', 'Default time-limited access'],
            ['Export re-authentication', boolStatus(security.exportReauthentication), 'Sensitive exports', 'Finance and user exports'],
            ['External sharing restriction', boolStatus(security.restrictExternalSharing), 'Reports and files', 'Tenant boundary enforcement']
        ];
        return `
      ${sectionHead('Security Defaults', 'Tenant-level security defaults applied to users, invitations, sessions and sensitive actions.', `<button class="primary-action" type="button" data-settings-edit="security" data-permission-action="edit" data-permission-resource="settings">Edit Security Defaults</button>`)}
      <div class="kpi-grid tenant-settings-security-kpis-v1437">${[
            ['Admin MFA', security.adminMfa === true ? 'Enforced' : security.adminMfa === false ? 'Disabled' : '—', 'Privileged tenant users'],
            ['Session Timeout', security.sessionTimeout, 'Idle session control'],
            ['Access Review', security.accessReviewCadence, 'Certification cadence'],
            ['External Access', security.externalUserExpiry, 'Default expiry'],
            ['Sensitive Exports', security.exportReauthentication === true ? 'Re-auth required' : security.exportReauthentication === false ? 'Standard session' : '—', 'Finance and access data'],
            ['Sharing Boundary', security.restrictExternalSharing === true ? 'Restricted' : security.restrictExternalSharing === false ? 'Open' : '—', 'Tenant files and reports']
        ].map(([label, value, note]) => `<article class="kpi-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('')}</div>
      <section class="panel glass-card"><div class="panel-head"><div><h2>Tenant Security Policy</h2><p>Security defaults applied within the current tenant boundary.</p></div>${badge('Tenant policy')}</div><div class="data-table tenant-settings-security-table-v1437"><div class="data-head"><span>Control</span><span>Value</span><span>Applies To</span><span>Purpose</span></div>${policies.map(row => `<div class="data-row"><div><strong>${esc(row[0])}</strong></div><div>${badge(row[1])}</div><div><strong>${esc(row[2])}</strong></div><div><strong>${esc(row[3])}</strong></div></div>`).join('')}</div></section>
      <div class="tenant-settings-boundary-v1437"><div><strong>Authentication infrastructure</strong><small>Identity provider configuration, password policy, SSO, certificates, service accounts and platform security controls are not editable by Tenant Admin.</small></div>${badge('Platform managed')}</div>
    `;
    }
    function activityTab() {
        return `
      ${sectionHead('Settings Activity', 'Audit history for tenant-level configuration changes and reviews.', `<button class="secondary-action" type="button" data-settings-action="export-activity">Export Activity</button>`)}
      <div class="tenant-settings-activity-filters-v1437 toolbar"><input id="settingsActivitySearch" type="search" placeholder="Search activity..." /><select id="settingsActivityArea"><option value="">All Areas</option>${['Profile', 'Branding', 'Localization', 'Notifications', 'Data & Reports', 'Security'].map(item => `<option>${item}</option>`).join('')}</select></div>
      <div id="tenantSettingsActivityWrap">${activityTable(events)}</div>
    `;
    }
    const activityList = (items) => `<div class="tenant-settings-activity-list-v1437">${items.map(item => `<article><span class="tenant-settings-activity-dot-v1437"></span><div><strong>${esc(item.event)}</strong><small>${esc(item.description)}</small><em>${esc(item.time)} · ${esc(item.actor)}</em></div>${badge(item.status)}</article>`).join('')}</div>`;
    const activityTable = (items) => `<div class="data-table tenant-settings-activity-table-v1437"><div class="data-head"><span>Event</span><span>Area</span><span>Description</span><span>Actor</span><span>Time</span><span>Status</span></div>${items.length ? items.map(item => `<div class="data-row"><div><strong>${esc(item.event)}</strong><small>${esc(item.id)}</small></div><div><strong>${esc(item.area)}</strong></div><div><strong>${esc(item.description)}</strong></div><div><strong>${esc(item.actor)}</strong></div><div><strong>${esc(item.time)}</strong></div><div>${badge(item.status)}</div></div>`).join('') : '<div class="empty-state zentrid-ux-state zentrid-ux-state-empty"><strong>No settings activity found</strong><p>No settings activity was returned by the API.</p></div>'}</div>`;
    const openDrawer = (title, body) => {
        const drawer = document.getElementById('tenantSettingsDrawer');
        const content = document.getElementById('tenantSettingsDrawerContent');
        if (!drawer || !content)
            return;
        content.innerHTML = `<div class="drawer-body"><p class="eyebrow">Tenant Settings</p><h2>${esc(title)}</h2>${body}</div>`;
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
    };
    const closeDrawer = () => {
        const drawer = document.getElementById('tenantSettingsDrawer');
        drawer?.classList.remove('open');
        drawer?.setAttribute('aria-hidden', 'true');
    };
    const textInput = (id, label, value, type = 'text', required = false) => `<label>${esc(label)}<input id="${id}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} /></label>`;
    const selectInput = (id, label, value, options) => `<label>${esc(label)}<select id="${id}">${options.map(option => `<option ${option === value ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select></label>`;
    const checkboxInput = (id, label, checked, note) => `<label class="tenant-setting-toggle-v1437"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''} /><span><strong>${esc(label)}</strong><small>${esc(note)}</small></span></label>`;
    const fieldValue = (id) => document.getElementById(id)?.value.trim() || '';
    const checkedValue = (id) => Boolean(document.getElementById(id)?.checked);
    const editProfile = () => openDrawer('Edit Organization Profile', `<form id="tenantProfileForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${textInput('settingOrganization', 'Organization Display Name', profile.organization, 'text', true)}${textInput('settingTenantCode', 'Tenant Code', profile.tenantCode, 'text', true)}${textInput('settingLegalName', 'Legal Name', profile.legalName, 'text', true)}${textInput('settingRegistration', 'Registration Number', profile.registrationNumber)}${textInput('settingTaxId', 'Tax ID', profile.taxId)}${selectInput('settingSupportTier', 'Support Tier', profile.supportTier, ['Enterprise', 'Professional', 'Standard'])}${textInput('settingContact', 'Primary Contact', profile.primaryContact, 'text', true)}${textInput('settingEmail', 'Contact Email', profile.email, 'email', true)}${textInput('settingPhone', 'Phone', profile.phone)}${selectInput('settingCountry', 'Country', profile.country, ['Armenia', 'Georgia', 'Kazakhstan', 'United Arab Emirates', 'Other'])}${textInput('settingCity', 'City', profile.city)}<label class="full">Address<textarea id="settingAddress" rows="3">${esc(profile.address)}</textarea></label></div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Save Profile</button></div></form>`);
    const editBranding = () => openDrawer('Edit Branding', `<form id="tenantBrandingForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${textInput('settingBrandDisplay', 'Display Name', branding.displayName, 'text', true)}${textInput('settingBrandShort', 'Short Name / Initials', branding.shortName, 'text', true)}<label class="full">Portal Subtitle<input id="settingBrandSubtitle" value="${esc(branding.portalSubtitle)}" /></label>${selectInput('settingBrandTheme', 'Theme Preset', branding.theme, ['ocean', 'emerald', 'violet', 'graphite'])}</div><div class="tenant-settings-toggle-grid-v1437">${checkboxInput('settingShowTenant', 'Show tenant name in workspace', branding.showTenantName, 'Display the tenant name in portal context and generated assets.')}${checkboxInput('settingReportBrand', 'Include tenant branding in reports', branding.includeBrandingInReports, 'Apply display name and approved theme to generated reports.')}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Publish Branding</button></div></form>`);
    const editLocalization = () => openDrawer('Edit Localization & Units', `<form id="tenantLocalizationForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${selectInput('settingTimezone', 'Timezone', localization.timezone, ['Asia/Yerevan', 'Asia/Tbilisi', 'Asia/Almaty', 'Europe/London', 'Europe/Berlin', 'UTC'])}${selectInput('settingLanguage', 'Language', localization.language, ['English', 'Armenian', 'Russian'])}${selectInput('settingCurrency', 'Currency', localization.currency, ['EUR', 'USD', 'AMD', 'GEL', 'KZT'])}${selectInput('settingDateFormat', 'Date Format', localization.dateFormat, ['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'])}${selectInput('settingNumberFormat', 'Number Format', localization.numberFormat, ['1,234.56', '1 234,56', '1.234,56'])}${selectInput('settingPowerUnit', 'Power Unit', localization.powerUnit, ['kW / MW', 'W / kW', 'MW'])}${selectInput('settingEnergyUnit', 'Energy Unit', localization.energyUnit, ['kWh / MWh', 'Wh / kWh', 'MWh'])}${selectInput('settingTemperature', 'Temperature Unit', localization.temperatureUnit, ['°C', '°F'])}${selectInput('settingIrradiance', 'Irradiance Unit', localization.irradianceUnit, ['W/m²', 'kW/m²'])}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Save Localization</button></div></form>`);
    const editNotifications = () => openDrawer('Edit Notifications', `<form id="tenantNotificationsForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${textInput('settingOpsEmail', 'Operational Email', notifications.operationalEmail, 'email', true)}${textInput('settingFinanceEmail', 'Finance Email', notifications.financeEmail, 'email', true)}<label class="full">Report Recipients<input id="settingReportRecipients" value="${esc(notifications.reportRecipients)}" placeholder="email@example.com, second@example.com" /></label></div><h3>Channels</h3><div class="tenant-settings-toggle-grid-v1437">${checkboxInput('settingEmailChannel', 'Email channel', notifications.emailChannel, 'Deliver selected tenant notifications by email.')}${checkboxInput('settingInAppChannel', 'In-app channel', notifications.inAppChannel, 'Show notifications in the Zentrid notification center.')}</div><h3>Event Categories</h3><div class="tenant-settings-toggle-grid-v1437">${checkboxInput('settingCritical', 'Critical alerts', notifications.criticalAlerts, 'Immediate critical operational events.')}${checkboxInput('settingWarning', 'Warning alerts', notifications.warningAlerts, 'Warning and performance degradation events.')}${checkboxInput('settingOffline', 'Offline devices', notifications.offlineDevices, 'Device, gateway and logger offline events.')}${checkboxInput('settingIntegrationHealth', 'Integration health', notifications.integrationHealth, 'Synchronization delay and connector health.')}${checkboxInput('settingDailySummary', 'Daily summary', notifications.dailySummary, 'Daily tenant operational summary.')}${checkboxInput('settingInvoice', 'Invoice updates', notifications.invoiceUpdates, 'Invoice issue, due date and payment updates.')}${checkboxInput('settingReportReady', 'Report ready', notifications.reportReady, 'Report generation and schedule completion.')}${checkboxInput('settingAccessChanges', 'Access changes', notifications.accessChanges, 'User invitation, role and suspension changes.')}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Save Notifications</button></div></form>`);
    const editData = () => openDrawer('Edit Data & Report Defaults', `<form id="tenantDataForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${selectInput('settingDefaultRange', 'Default Time Range', dataSettings.defaultTimeRange, ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Current month'])}${selectInput('settingGranularity', 'Telemetry Granularity', dataSettings.telemetryGranularity, ['5 minutes', '15 minutes', '30 minutes', '1 hour'])}${selectInput('settingReportFormat', 'Default Report Format', dataSettings.defaultReportFormat, ['PDF', 'XLSX', 'PDF + XLSX', 'CSV'])}${selectInput('settingReportFrequency', 'Report Frequency', dataSettings.reportFrequency, ['One-time', 'Daily', 'Weekly', 'Monthly'])}${selectInput('settingReportDelivery', 'Report Delivery', dataSettings.reportDelivery, ['Portal', 'Email', 'Email + Portal'])}${selectInput('settingCompleteness', 'Completeness Threshold', dataSettings.completenessThreshold, ['95%', '97%', '98%', '99%'])}${selectInput('settingFreshness', 'Freshness Threshold', dataSettings.freshnessThreshold, ['5 minutes', '10 minutes', '15 minutes', '30 minutes'])}</div><div class="tenant-settings-toggle-grid-v1437">${checkboxInput('settingNormalizedData', 'Use normalized data by default', dataSettings.useNormalizedData, 'Open Telemetry and Analytics on the canonical Zentrid data layer.')}${checkboxInput('settingQualityFlags', 'Include quality flags', dataSettings.includeQualityFlags, 'Include validity, estimated and delayed markers in reports.')}${checkboxInput('settingRawData', 'Include raw data attachment', dataSettings.includeRawData, 'Attach vendor raw data where the report format supports it.')}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Save Defaults</button></div></form>`);
    const editSecurity = () => openDrawer('Edit Security Defaults', `<form id="tenantSecurityForm" class="tenant-settings-form-v1437"><div class="tenant-settings-form-grid-v1437">${selectInput('settingSessionTimeout', 'Session Timeout', security.sessionTimeout, ['15 minutes', '30 minutes', '1 hour', '4 hours'])}${selectInput('settingInvitationExpiry', 'Invitation Expiry', security.invitationExpiry, ['3 days', '7 days', '14 days', '30 days'])}${selectInput('settingReviewCadence', 'Access Review Cadence', security.accessReviewCadence, ['Monthly', 'Quarterly', 'Semi-annually'])}${selectInput('settingExternalExpiry', 'External User Expiry', security.externalUserExpiry, ['30 days', '60 days', '90 days', '180 days'])}</div><div class="tenant-settings-toggle-grid-v1437">${checkboxInput('settingAdminMfa', 'Require MFA for Tenant Administrators', security.adminMfa, 'Privileged tenant users must enroll MFA.')}${checkboxInput('settingStepUp', 'Require re-authentication for sensitive changes', security.stepUpAuth, 'Protect users, settings and sensitive actions.')}${checkboxInput('settingExportReauth', 'Require re-authentication for sensitive exports', security.exportReauthentication, 'Protect finance and access exports.')}${checkboxInput('settingExternalSharing', 'Restrict external report sharing', security.restrictExternalSharing, 'Keep generated reports inside the tenant boundary by default.')}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-settings-close>Cancel</button><button class="primary-action" type="submit" data-permission-action="edit" data-permission-resource="settings">Save Security Defaults</button></div></form>`);
    const exportSnapshot = () => {
        const snapshot = { exportedAt: new Date().toISOString(), product: 'Zentrid Tenant Admin', version: 'v143.7', tenant: profile.organization, profile, branding, localization, notifications, data: dataSettings, security };
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'zentrid-tenant-settings-snapshot.json';
        anchor.click();
        URL.revokeObjectURL(url);
        notify('Tenant settings snapshot exported.');
    };
    const exportActivity = () => {
        const rows = [['Event ID', 'Event', 'Area', 'Description', 'Actor', 'Time', 'Status'], ...events.map(item => [item.id, item.event, item.area, item.description, item.actor, item.time, item.status])];
        const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'zentrid-tenant-settings-activity.csv';
        anchor.click();
        URL.revokeObjectURL(url);
        notify('Settings activity exported.');
    };
    const applyActivityFilters = () => {
        const search = fieldValue('settingsActivitySearch').toLowerCase();
        const area = fieldValue('settingsActivityArea');
        const filtered = events.filter(item => (!search || [item.event, item.description, item.actor, item.area, item.status].join(' ').toLowerCase().includes(search)) && (!area || item.area === area));
        const wrap = document.getElementById('tenantSettingsActivityWrap');
        if (wrap)
            wrap.innerHTML = activityTable(filtered);
    };
    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target.closest('button,[data-settings-tab],[data-settings-jump],[data-settings-edit],[data-theme-preview],[data-settings-close]') : null;
        if (!target)
            return;
        const tab = target.dataset.settingsTab;
        const jump = target.dataset.settingsJump;
        if (tab || jump) {
            activeTab = tab || jump || 'overview';
            document.querySelectorAll('[data-settings-tab]').forEach(button => button.classList.toggle('active', button.dataset.settingsTab === activeTab));
            drawTab();
            return;
        }
        if (target.hasAttribute('data-settings-close')) {
            closeDrawer();
            return;
        }
        const edit = target.dataset.settingsEdit;
        if (edit === 'profile')
            editProfile();
        if (edit === 'branding')
            editBranding();
        if (edit === 'localization')
            editLocalization();
        if (edit === 'notifications')
            editNotifications();
        if (edit === 'data')
            editData();
        if (edit === 'security')
            editSecurity();
        const preview = target.dataset.themePreview;
        if (preview)
            notify(unsupportedMessage);
        const action = target.dataset.settingsAction;
        if (action === 'export')
            exportSnapshot();
        if (action === 'export-activity')
            exportActivity();
    });
    document.addEventListener('input', event => {
        const target = event.target;
        if (target?.id === 'settingsActivitySearch')
            applyActivityFilters();
    });
    document.addEventListener('change', event => {
        const target = event.target;
        if (target?.id === 'settingsActivityArea')
            applyActivityFilters();
    });
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!form?.id)
            return;
        event.preventDefault();
        notify(unsupportedMessage);
    });
    render();
    void loadSettings();
})();
