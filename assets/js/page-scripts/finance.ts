export {};

type FinanceTab = 'overview' | 'plan' | 'usage' | 'invoices' | 'payments' | 'profile' | 'activity';
type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';
type FinanceLoadState = 'loading' | 'ready' | 'empty' | 'error';
type UnknownRecord = Record<string, unknown>;

type FinanceInvoiceCharge = {
  type: string;
  basis: string;
  amount: number;
};

type FinanceInvoiceTrace = {
  step: string;
  note: string;
  amount: number;
};

type FinanceInvoice = {
  id: string;
  period: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  markups: number;
  discounts: number;
  taxes: number;
  total: number;
  charges: FinanceInvoiceCharge[];
  trace: FinanceInvoiceTrace[];
};

type FinancePayment = {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  status: 'Settled' | 'Processing' | 'Failed';
};

type UsageItem = {
  category: string;
  metric: string;
  included: string;
  actual: string;
  charge: number | null;
  source: string;
  status: 'Included' | 'Billable' | 'Review';
};

type BillingProfile = {
  legalEntity: string;
  taxId: string;
  billingAddress: string;
  contactName: string;
  contactEmail: string;
  currency: string;
  paymentTerms: string;
  billingType: string;
  paymentMethod: string;
  invoiceDelivery: string;
};

(() => {
  const tenantName = String(FleetLayout.state.tenant || localStorage.getItem('zentrid_tenant') || 'Tenant workspace');
  const storageKey = 'zentrid.tenant.finance.ui.v1433';

  let activeTab: FinanceTab = 'overview';
  let invoiceStatusFilter = 'All Statuses';
  let invoiceSearch = '';
  let loadState: FinanceLoadState = 'loading';
  let loadError = '';
  let loadedAt: Date | null = null;
  let clientCount: number | null = null;
  let plantCount: number | null = null;
  let deviceCount: number | null = null;
  let telemetryCount: number | null = null;
  let billingProfileData: BillingProfile | null = null;

  const invoices: FinanceInvoice[] = [];
  const payments: FinancePayment[] = [];

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<{ activeTab: FinanceTab }>;
    if (saved.activeTab) activeTab = saved.activeTab;
  } catch {
    // UI state only. Business data is never restored from browser storage.
  }

  function text(value: unknown, fallback = '—'): string {
    const resolved = String(value ?? '').trim();
    return resolved || fallback;
  }

  function normalize(value: unknown): string {
    return text(value, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function escapeHtml(value: unknown): string {
    return text(value, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function firstOf(row: UnknownRecord, keys: string[], fallback: unknown = ''): unknown {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return fallback;
  }

  function extractRows(payload: unknown, depth = 0): UnknownRecord[] {
    if (depth > 6) return [];
    if (Array.isArray(payload)) return payload.filter(isRecord);
    if (!isRecord(payload)) return [];
    for (const key of ['items', 'data', 'results', 'records', 'rows', 'clients', 'plants', 'devices', 'telemetry', 'samples', 'measurements']) {
      const candidate = payload[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
      if (isRecord(candidate)) {
        const nested = extractRows(candidate, depth + 1);
        if (nested.length) return nested;
      }
    }
    return [payload];
  }

  function totalCount(payload: unknown): number | null {
    if (Array.isArray(payload)) return payload.length;
    if (!isRecord(payload)) return null;
    for (const key of ['totalCount', 'total', 'count', 'recordsTotal', 'totalRecords']) {
      const value = Number(payload[key]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    for (const key of ['data', 'result', 'pagination', 'meta']) {
      const nested = payload[key];
      if (isRecord(nested)) {
        const count = totalCount(nested);
        if (count !== null) return count;
      }
    }
    const rows = extractRows(payload);
    return rows.length;
  }

  function mergeEntityCount(primaryPayload: unknown, secondaryPayload: unknown): number | null {
    const primaryRows = extractRows(primaryPayload);
    const secondaryRows = extractRows(secondaryPayload);
    const ids = new Set<string>();
    [...primaryRows, ...secondaryRows].forEach((row, index) => {
      const identity = text(firstOf(row, ['id', 'plantId', 'plant_id', 'externalId', 'code', 'name'], `row-${index}`), `row-${index}`);
      ids.add(normalize(identity) || `row-${index}`);
    });
    const explicit = [totalCount(primaryPayload), totalCount(secondaryPayload)].filter((value): value is number => value !== null);
    return ids.size || (explicit.length ? Math.max(...explicit) : null);
  }

  function unwrapRecord(payload: unknown): UnknownRecord | null {
    if (!isRecord(payload)) return null;
    for (const key of ['data', 'result', 'user', 'profile', 'tenant', 'organization']) {
      const candidate = payload[key];
      if (isRecord(candidate)) return candidate;
    }
    return payload;
  }

  function nestedRecord(row: UnknownRecord, keys: string[]): UnknownRecord | null {
    for (const key of keys) {
      const value = row[key];
      if (isRecord(value)) return value;
    }
    return null;
  }

  function explicitBillingProfile(payload: unknown): BillingProfile | null {
    const root = unwrapRecord(payload);
    if (!root) return null;
    const billing = nestedRecord(root, ['billingProfile', 'billing', 'invoiceProfile', 'commercialProfile']);
    const source = billing || root;
    const profile: BillingProfile = {
      legalEntity: text(firstOf(source, ['legalEntity', 'legalName', 'companyName', 'organizationName', 'tenantName'], ''), ''),
      taxId: text(firstOf(source, ['taxId', 'taxNumber', 'vatNumber', 'vatId'], ''), ''),
      billingAddress: text(firstOf(source, ['billingAddress', 'invoiceAddress', 'legalAddress'], ''), ''),
      contactName: text(firstOf(source, ['billingContactName', 'invoiceContactName'], ''), ''),
      contactEmail: text(firstOf(source, ['billingContactEmail', 'invoiceEmail', 'billingEmail'], ''), ''),
      currency: text(firstOf(source, ['billingCurrency', 'invoiceCurrency', 'currency'], ''), ''),
      paymentTerms: text(firstOf(source, ['paymentTerms', 'invoicePaymentTerms'], ''), ''),
      billingType: text(firstOf(source, ['billingType', 'invoiceBillingType'], ''), ''),
      paymentMethod: text(firstOf(source, ['paymentMethod', 'defaultPaymentMethod'], ''), ''),
      invoiceDelivery: text(firstOf(source, ['invoiceDelivery', 'deliveryMethod'], ''), '')
    };
    return Object.values(profile).some(Boolean) ? profile : null;
  }

  function money(value: number | null, code = 'EUR'): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function tone(value: unknown): string {
    const status = String(value || '').toLowerCase();
    if (status.includes('paid') || status.includes('settled') || status.includes('included') || status.includes('active')) return 'success';
    if (status.includes('pending') || status.includes('processing') || status.includes('draft') || status.includes('billable') || status.includes('review')) return 'warning';
    if (status.includes('overdue') || status.includes('failed') || status.includes('blocked')) return 'danger';
    return 'info';
  }

  function saveUiState(): void {
    localStorage.setItem(storageKey, JSON.stringify({ activeTab }));
  }

  function filteredInvoices(): FinanceInvoice[] {
    const query = normalize(invoiceSearch);
    return invoices.filter(invoice => {
      const matchesStatus = invoiceStatusFilter === 'All Statuses' || invoice.status === invoiceStatusFilter;
      const matchesQuery = !query || normalize(`${invoice.id} ${invoice.period} ${invoice.status}`).includes(query);
      return matchesStatus && matchesQuery;
    });
  }

  function freshnessText(): string {
    if (loadState === 'loading') return 'Loading API usage context…';
    if (loadState === 'error') return 'API usage context unavailable';
    if (!loadedAt) return 'No finance endpoint in active API';
    return `API usage context · updated ${loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function contextBar(): string {
    return `<section class="context-bar glass-card finance-context-v1433">
      <button class="ctx-item" type="button"><span>Tenant Scope</span><strong>${escapeHtml(tenantName)}</strong></button>
      <button class="ctx-item" type="button"><span>Billing Account</span><strong>—</strong></button>
      <button class="ctx-item" type="button"><span>Currency</span><strong>${escapeHtml(billingProfileData?.currency || '—')}</strong></button>
      <button class="ctx-item" type="button"><span>Billing Cycle</span><strong>—</strong></button>
      <button class="ctx-item" type="button"><span>Access Mode</span><strong>Read-only commercial configuration</strong></button>
    </section>`;
  }

  function kpis(): string {
    return `<section class="module-grid commercial-kpis-v78 billing-kpi-grid tenant-finance-kpis-v1433">
      <article class="module-card"><span>Current Estimate</span><strong>—</strong><small>Finance endpoint not available</small></article>
      <article class="module-card"><span>Open Balance</span><strong>—</strong><small>Invoice data not returned by API</small></article>
      <article class="module-card"><span>Paid Year to Date</span><strong>—</strong><small>Payment data not returned by API</small></article>
      <article class="module-card"><span>Next Billing Date</span><strong>—</strong><small>Subscription data not returned by API</small></article>
    </section>`;
  }

  function planSummary(): string {
    return `<section class="panel glass-card billing-config-panel tenant-plan-panel-v1433">
      <div class="panel-head billing-panel-head"><div><h2>Current Subscription</h2><p>Assigned tariff and commercial allowances. Changes are managed by the Zentrid service provider.</p></div><span class="badge info">Unavailable</span></div>
      <div class="empty-state"><strong>No subscription plan returned by the active API</strong><small>The current Swagger scope has no tenant plan or billing configuration endpoint.</small></div>
    </section>`;
  }

  function usageItems(): UsageItem[] {
    const values: UsageItem[] = [
      { category: 'Clients', metric: 'Tenant-scoped clients', included: '—', actual: clientCount === null ? '—' : String(clientCount), charge: null, source: '/api/admin/clients', status: 'Review' },
      { category: 'Plants', metric: 'Registered plants', included: '—', actual: plantCount === null ? '—' : String(plantCount), charge: null, source: '/api/plants + /api/admin/plants', status: 'Review' },
      { category: 'Devices', metric: 'Registered devices', included: '—', actual: deviceCount === null ? '—' : String(deviceCount), charge: null, source: '/api/devices', status: 'Review' },
      { category: 'Telemetry', metric: 'Returned telemetry samples', included: '—', actual: telemetryCount === null ? '—' : String(telemetryCount), charge: null, source: '/api/telemetry', status: 'Review' }
    ];
    return values;
  }

  function usageTable(): string {
    const items = usageItems();
    const rows = loadState === 'loading'
      ? '<div class="empty-state"><strong>Loading usage context…</strong><small>Reading Clients, Plants, Devices and Telemetry from the API.</small></div>'
      : items.map(item => `<div class="data-row tenant-finance-usage-row-v1433"><div><strong>${escapeHtml(item.category)}</strong><small>${escapeHtml(item.metric)}</small></div><div><strong>${escapeHtml(item.included)}</strong><small>Plan allowance</small></div><div><strong>${escapeHtml(item.actual)}</strong><small>Current API result</small></div><div><strong>${money(item.charge)}</strong><small>Charge unavailable</small></div><div><strong>${escapeHtml(item.source)}</strong><small>API source</small></div><div><span class="badge ${tone(item.status)}">${item.status}</span></div></div>`).join('');
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head billing-panel-head"><div><h2>Usage & Charges</h2><p>Tenant usage context mapped from the same Plant, Device and Telemetry APIs used across Zentrid. Charges remain unavailable without a billing contract endpoint.</p></div><button class="secondary-action" type="button" data-finance-export="usage" data-permission-action="export" data-permission-resource="finance">Export Usage</button></div><div class="data-table billing-config-table tenant-finance-usage-table-v1433"><div class="data-head"><span>Category</span><span>Included</span><span>Actual</span><span>Charge</span><span>Source</span><span>Status</span></div>${rows}</div></section>`;
  }

  function invoiceRegistry(compact = false): string {
    const rows = filteredInvoices();
    const body = rows.length
      ? rows.map(invoice => `<div class="data-row billing-invoice-row tenant-finance-invoice-row-v1433" data-finance-invoice="${invoice.id}" role="button" tabindex="0"><div><strong>${invoice.id}</strong><small>API invoice</small></div><div><strong>${invoice.period}</strong><small>Issued ${invoice.issueDate}</small></div><div><strong>${invoice.dueDate}</strong><small>Due date</small></div><div><strong>${money(invoice.total, invoice.currency)}</strong><small>Subtotal ${money(invoice.subtotal, invoice.currency)}</small></div><div><span class="badge ${tone(invoice.status)}">${invoice.status}</span></div><div class="billing-row-actions"><button class="secondary-action compact-action" type="button" data-finance-download="${invoice.id}">Download</button></div></div>`).join('')
      : '<div class="empty-state"><strong>No invoices returned by the active API</strong><small>The current Swagger scope has no invoice endpoint.</small></div>';
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head billing-panel-head"><div><h2>${compact ? 'Recent Invoices' : 'Invoices'}</h2><p>Tenant invoices with calculation snapshot, payment status and downloadable documents.</p></div><button class="secondary-action" type="button" data-finance-export="invoices" data-permission-action="export" data-permission-resource="finance">Export Invoices</button></div>${compact ? '' : `<div class="toolbar tenant-finance-toolbar-v1433"><input id="financeInvoiceSearch" value="${escapeHtml(invoiceSearch)}" placeholder="Search invoice or period..."/><select id="financeInvoiceStatus"><option ${invoiceStatusFilter === 'All Statuses' ? 'selected' : ''}>All Statuses</option>${(['Paid','Pending','Overdue','Draft'] as InvoiceStatus[]).map(status => `<option ${invoiceStatusFilter === status ? 'selected' : ''}>${status}</option>`).join('')}</select><button class="secondary-action" id="financeInvoiceReset" type="button">Reset</button></div>`}<div class="data-table billing-config-table billing-invoice-table tenant-finance-invoice-table-v1433"><div class="data-head"><span>Invoice</span><span>Period</span><span>Due Date</span><span>Amount</span><span>Status</span><span>Actions</span></div>${body}</div></section>`;
  }

  function invoiceDetail(): string {
    return `<section class="billing-detail-grid tenant-invoice-detail-v1433"><article class="panel glass-card billing-config-panel billing-detail-panel"><div class="panel-head"><div><h2>Invoice Detail</h2><p>No API-backed invoice selected.</p></div><span class="badge info">Unavailable</span></div><div class="empty-state"><strong>Invoice detail is unavailable</strong><small>The active API does not provide invoice records or calculation traces.</small></div></article><article class="panel glass-card billing-config-panel billing-result-panel"><div class="panel-head"><div><h2>Calculation Trace</h2><p>Read-only pricing trace saved with the invoice.</p></div></div><div class="empty-state"><strong>No calculation trace returned by API</strong><small>Pricing rules and invoice line items are not exposed by the current backend contract.</small></div></article></section>`;
  }

  function paymentsView(): string {
    const rows = payments.length
      ? payments.map(payment => `<div class="data-row tenant-finance-payment-row-v1433"><div><strong>${payment.id}</strong><small>${payment.reference}</small></div><div><strong>${payment.invoiceId}</strong><small>Allocated invoice</small></div><div><strong>${payment.date}</strong><small>Settlement date</small></div><div><strong>${money(payment.amount)}</strong><small>${payment.method}</small></div><div><span class="badge ${tone(payment.status)}">${payment.status}</span></div><div class="billing-row-actions"></div></div>`).join('')
      : '<div class="empty-state"><strong>No payments returned by the active API</strong><small>The current Swagger scope has no payment or settlement endpoint.</small></div>';
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head billing-panel-head"><div><h2>Payments</h2><p>Payment allocation and settlement history for invoices issued to ${escapeHtml(tenantName)}.</p></div><button class="secondary-action" type="button" data-finance-export="payments" data-permission-action="export" data-permission-resource="finance">Export Payments</button></div><section class="module-grid commercial-kpis-v78 billing-kpi-grid tenant-payment-kpis-v1433"><article class="module-card"><span>Settled</span><strong>—</strong><small>Payment endpoint unavailable</small></article><article class="module-card"><span>Payment Method</span><strong>—</strong><small>Not returned by API</small></article><article class="module-card"><span>Open Balance</span><strong>—</strong><small>Invoice endpoint unavailable</small></article><article class="module-card"><span>Account Status</span><strong>—</strong><small>Billing status not returned by API</small></article></section><div class="data-table billing-config-table tenant-finance-payment-table-v1433"><div class="data-head"><span>Payment</span><span>Invoice</span><span>Date</span><span>Amount / Method</span><span>Status</span><span>Document</span></div>${rows}</div></section>`;
  }

  function billingProfile(): string {
    const profile = billingProfileData;
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head billing-panel-head"><div><h2>Billing Profile</h2><p>Legal, invoice delivery and payment information used by Zentrid billing services.</p></div><span class="badge info">Read-only</span></div><div class="information-grid tenant-billing-profile-grid-v1433"><div><span>Legal Entity</span><strong>${escapeHtml(profile?.legalEntity || '—')}</strong><small>Invoice recipient</small></div><div><span>Tax ID</span><strong>${escapeHtml(profile?.taxId || '—')}</strong><small>Not returned by API</small></div><div><span>Billing Address</span><strong>${escapeHtml(profile?.billingAddress || '—')}</strong><small>Not returned by API</small></div><div><span>Billing Contact</span><strong>${escapeHtml(profile?.contactName || '—')}</strong><small>${escapeHtml(profile?.contactEmail || 'Not returned by API')}</small></div><div><span>Invoice Currency</span><strong>${escapeHtml(profile?.currency || '—')}</strong><small>Contract currency</small></div><div><span>Payment Terms</span><strong>${escapeHtml(profile?.paymentTerms || '—')}</strong><small>${escapeHtml(profile?.billingType || 'Not returned by API')}</small></div><div><span>Payment Method</span><strong>${escapeHtml(profile?.paymentMethod || '—')}</strong><small>Not returned by API</small></div><div><span>Invoice Delivery</span><strong>${escapeHtml(profile?.invoiceDelivery || '—')}</strong><small>Not returned by API</small></div></div><div class="billing-two-col"><div class="billing-rule-card"><strong>Banking Destination</strong><p>Banking destination is not exposed by the active API.</p></div><div class="billing-rule-card"><strong>Profile Changes</strong><p>Direct editing remains unavailable because the current API has no billing profile mutation endpoint.</p></div></div></section>`;
  }

  function activityView(): string {
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head"><div><h2>Billing Activity</h2><p>Read-only lifecycle events for tenant invoices, payments, usage snapshots and plan assignment.</p></div></div><div class="empty-state"><strong>No billing activity returned by the active API</strong><small>The current Swagger scope has no finance activity endpoint.</small></div></section>`;
  }

  function overview(): string {
    return `<section class="panel glass-card billing-config-panel"><div class="panel-head billing-panel-head"><div><h2>Finance & Billing Overview</h2><p>Tenant-level commercial visibility using the same Zentrid billing workflow and shared UI components as Global Admin.</p></div><div class="toolbar billing-inline-actions"><button class="secondary-action" type="button" data-finance-open-latest disabled>Open Latest Invoice</button><button class="secondary-action" type="button" data-finance-export="summary" data-permission-action="export" data-permission-resource="finance">Export Summary</button></div></div>${kpis()}<div class="commercial-governance-flow-v99 billing-flow-strip tenant-billing-flow-v1433"><article><span>01</span><strong>Usage Snapshot</strong><small>Plants, devices and telemetry</small></article><article><span>02</span><strong>Assigned Pricing</strong><small>Awaiting billing API contract</small></article><article><span>03</span><strong>Invoice</strong><small>Awaiting invoice endpoint</small></article><article><span>04</span><strong>Payment</strong><small>Awaiting payment endpoint</small></article><article><span>05</span><strong>Receipt</strong><small>Awaiting document endpoint</small></article></div></section>${planSummary()}${invoiceRegistry(true)}`;
  }

  function tabContent(): string {
    if (activeTab === 'plan') return planSummary();
    if (activeTab === 'usage') return usageTable();
    if (activeTab === 'invoices') return `${invoiceRegistry()}${invoiceDetail()}`;
    if (activeTab === 'payments') return paymentsView();
    if (activeTab === 'profile') return billingProfile();
    if (activeTab === 'activity') return activityView();
    return overview();
  }

  function sideTabs(): string {
    const tabs: Array<[FinanceTab, string]> = [
      ['overview', 'Overview'],
      ['plan', 'Current Plan'],
      ['usage', 'Usage & Charges'],
      ['invoices', 'Invoices'],
      ['payments', 'Payments'],
      ['profile', 'Billing Profile'],
      ['activity', 'Activity']
    ];
    return `<aside class="glass-card plant-side-card-v17 billing-side-nav"><h3>Finance & Billing</h3>${tabs.map(([key, label]) => `<button class="${activeTab === key ? 'active' : ''}" type="button" data-finance-tab="${key}">${label}</button>`).join('')}</aside>`;
  }

  function render(): void {
    FleetLayout.mount(`<div class="tenant-finance-page-v1433"><section class="page-hero billing-page-hero"><div><p class="eyebrow">Tenant Admin · Commercial & Billing</p><h1>Finance & Billing</h1><p class="muted">Subscription, billable usage, invoice documents, payment history and billing profile for the fixed tenant scope.</p></div><div class="hero-actions"><button class="secondary-action" type="button" data-finance-export="all" data-permission-action="export" data-permission-resource="finance">Export Billing Data</button><button class="freshness-card" type="button" data-finance-refresh><span class="pulse"></span><div><strong>Billing snapshot</strong><small>${escapeHtml(freshnessText())}</small></div></button></div></section>${contextBar()}<section class="plant-workspace-v17 billing-workspace-v100 billing-config-workspace tenant-finance-workspace-v1433">${sideTabs()}<section class="plant-main-card-v17 billing-main-card" id="tenantFinanceContent">${tabContent()}</section></section></div>`);
    wire();
    FleetLayout.enhanceActionMenus?.(document);
  }

  function switchTab(tab: FinanceTab): void {
    activeTab = tab;
    saveUiState();
    render();
  }

  function downloadBlob(filename: string, content: string, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadInvoice(id: string): void {
    const invoice = invoices.find(item => item.id === id);
    if (!invoice) return;
    const rows = [
      ['Invoice', invoice.id],
      ['Period', invoice.period],
      ['Issue Date', invoice.issueDate],
      ['Due Date', invoice.dueDate],
      ['Status', invoice.status],
      ['Subtotal', money(invoice.subtotal, invoice.currency)],
      ['Markups', money(invoice.markups, invoice.currency)],
      ['Discounts', money(invoice.discounts, invoice.currency)],
      ['Taxes', money(invoice.taxes, invoice.currency)],
      ['Total', money(invoice.total, invoice.currency)]
    ];
    downloadBlob(`${invoice.id}.csv`, rows.map(row => row.map(value => `\"${String(value).replace(/\"/g, '\"\"')}\"`).join(',')).join('\n'), 'text/csv;charset=utf-8');
    FleetLayout.toast(`${invoice.id} downloaded from API-backed invoice data.`);
  }

  function exportCsv(kind: string): void {
    let rows: Array<Array<string | number>> = [];
    let name = 'summary';
    if (kind === 'usage') {
      name = 'usage';
      rows = [['Category','Metric','Included','Actual','Charge EUR','Source','Status'], ...usageItems().map(item => [item.category,item.metric,item.included,item.actual,item.charge ?? '',item.source,item.status])];
    } else if (kind === 'payments') {
      name = 'payments';
      rows = [['Payment','Invoice','Date','Amount EUR','Method','Reference','Status']];
    } else if (kind === 'invoices') {
      name = 'invoices';
      rows = [['Invoice','Period','Issue Date','Due Date','Subtotal EUR','Tax EUR','Total EUR','Status']];
    } else {
      name = kind === 'all' ? 'billing-data' : 'finance-summary';
      rows = [['Tenant','Clients','Plants','Devices','Telemetry Samples','Finance API Status'],[tenantName,clientCount ?? '',plantCount ?? '',deviceCount ?? '',telemetryCount ?? '','No finance endpoint in active Swagger']];
    }
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(`zentrid-${name}-${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8');
    FleetLayout.toast('Finance & Billing API-backed data exported for the current tenant scope.');
  }

  function wire(): void {
    document.querySelectorAll<HTMLElement>('[data-finance-tab]').forEach(button => button.addEventListener('click', () => switchTab((button.dataset.financeTab || 'overview') as FinanceTab)));
    document.querySelectorAll<HTMLElement>('[data-finance-export]').forEach(button => button.addEventListener('click', () => exportCsv(button.dataset.financeExport || 'summary')));
    document.querySelectorAll<HTMLElement>('[data-finance-download]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); downloadInvoice(button.dataset.financeDownload || ''); }));
    document.querySelector<HTMLElement>('[data-finance-refresh]')?.addEventListener('click', () => { void loadFinanceData(true); });
    const searchInput = document.getElementById('financeInvoiceSearch') as HTMLInputElement | null;
    searchInput?.addEventListener('change', () => { invoiceSearch = searchInput.value; render(); });
    searchInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { invoiceSearch = searchInput.value; render(); } });
    const statusSelect = document.getElementById('financeInvoiceStatus') as HTMLSelectElement | null;
    statusSelect?.addEventListener('change', () => { invoiceStatusFilter = statusSelect.value; render(); });
    document.getElementById('financeInvoiceReset')?.addEventListener('click', () => { invoiceSearch = ''; invoiceStatusFilter = 'All Statuses'; render(); });
  }

  async function loadFinanceData(force = false): Promise<void> {
    loadState = 'loading';
    loadError = '';
    render();
    const requestOptions: ZentridRequestOptions = force ? { cache: 'no-store' } : {};
    const results = await Promise.allSettled([
      ZentridPlatformAPI.auth.me(),
      ZentridPlatformAPI.clients.list(),
      ZentridPlatformAPI.live.plants(requestOptions),
      ZentridPlatformAPI.plantRegistry.list(),
      ZentridPlatformAPI.live.devices(requestOptions),
      ZentridPlatformAPI.live.telemetry(requestOptions)
    ]);
    const failures: string[] = [];
    const valueAt = (index: number): unknown => {
      const result = results[index];
      if (result?.status === 'fulfilled') return result.value;
      if (result?.status === 'rejected') failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      return null;
    };
    const mePayload = valueAt(0);
    const clientsPayload = valueAt(1);
    const livePlantsPayload = valueAt(2);
    const adminPlantsPayload = valueAt(3);
    const devicesPayload = valueAt(4);
    const telemetryPayload = valueAt(5);

    billingProfileData = explicitBillingProfile(mePayload);
    clientCount = totalCount(clientsPayload);
    plantCount = mergeEntityCount(livePlantsPayload, adminPlantsPayload);
    deviceCount = totalCount(devicesPayload);
    telemetryCount = totalCount(telemetryPayload);
    loadedAt = failures.length === results.length ? null : new Date();
    loadError = [...new Set(failures)].join(' · ');
    const hasContext = [clientCount, plantCount, deviceCount, telemetryCount].some(value => value !== null);
    loadState = failures.length === results.length ? 'error' : hasContext || billingProfileData ? 'ready' : 'empty';
    render();
    if (force) FleetLayout.toast(loadState === 'error' ? 'Finance usage context refresh failed.' : 'Finance usage context refreshed from API data.');
  }

  render();
  void loadFinanceData();
})();
