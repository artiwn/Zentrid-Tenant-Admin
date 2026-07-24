type TenantAccessTab = 'overview' | 'users' | 'roles' | 'invitations' | 'security' | 'activity';
type TenantBadgeTone = 'success' | 'warning' | 'danger' | 'info';
type TenantAccessLoadState = 'loading' | 'ready' | 'empty' | 'error';
type TenantAccessRecord = Record<string, unknown>;

interface TenantAccessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  scope: string;
  client: string;
  plants: string[];
  modules: string[];
  status: string;
  mfa: string;
  lastLogin: string;
  review: string;
  risk: string;
  invitedBy: string;
  expires: string;
}

interface TenantAccessRole {
  id: string;
  name: string;
  description: string;
  scope: string;
  permissions: string[];
  modules: string[];
  sensitive: boolean | null;
  system: boolean | null;
  status: string;
}

interface TenantAccessInvite {
  id: string;
  email: string;
  name: string;
  role: string;
  scope: string;
  status: string;
  sent: string;
  expires: string;
  mfa: string;
  invitedBy: string;
}

interface TenantAccessEvent {
  event: string;
  description: string;
  time: string;
  actor: string;
  status: string;
}

interface TenantAccessPolicy {
  title: string;
  status: string;
  scope: string;
  note: string;
  enforcement: string;
}

(() => {
  const layout = window.FleetLayout;
  const app = document.getElementById('app');
  if (!layout?.mount) {
    if (app) app.innerHTML = '<main class="main-content"><section class="empty-state zentrid-ux-state zentrid-ux-state-error"><strong>Workspace layout is unavailable.</strong><span>Reload the application after restarting the Zentrid server.</span></section></main>';
    return;
  }

  const tenantName = layout.state.tenant || 'Current tenant';
  let users: TenantAccessUser[] = [];
  let roles: TenantAccessRole[] = [];
  let invites: TenantAccessInvite[] = [];
  let events: TenantAccessEvent[] = [];
  let policies: TenantAccessPolicy[] = [];
  let activeTab = (localStorage.getItem('zentrid_tenant_access_tab') as TenantAccessTab | null) || 'overview';
  let selectedUserId = '';
  let loadState: TenantAccessLoadState = 'loading';
  let loadError = '';
  let loadedAt: Date | null = null;

  const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char] || char));
  const isRecord = (value: unknown): value is TenantAccessRecord => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();
  const text = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const result = String(value).trim();
      return result || fallback;
    }
    return fallback;
  };
  const firstOf = (record: TenantAccessRecord, keys: string[], fallback: unknown = ''): unknown => {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return fallback;
  };
  const stringList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(item => isRecord(item) ? text(firstOf(item, ['name','label','code','id'], '')) : text(item)).filter(Boolean);
    const single = text(value);
    return single ? single.split(',').map(item => item.trim()).filter(Boolean) : [];
  };
  const records = (value: unknown): TenantAccessRecord[] => {
    if (Array.isArray(value)) return value.filter(isRecord);
    if (!isRecord(value)) return [];
    for (const key of ['items','records','rows','data','result','users','roles','invitations','invites','events','activities','policies']) {
      const nested = value[key];
      if (Array.isArray(nested)) return nested.filter(isRecord);
      if (isRecord(nested)) {
        const nestedRows = records(nested);
        if (nestedRows.length) return nestedRows;
      }
    }
    return [];
  };
  const unwrap = (payload: unknown): TenantAccessRecord | null => {
    if (!isRecord(payload)) return null;
    for (const key of ['data','result','user','profile']) {
      const candidate = payload[key];
      if (isRecord(candidate)) return candidate;
    }
    return payload;
  };
  const tone = (value: unknown): TenantBadgeTone => {
    const valueText = normalize(value);
    if (/suspend|blocked|high|expired|failed|inactive|disabled/.test(valueText)) return 'danger';
    if (/invite|pending|required|medium|due|draft|unknown/.test(valueText)) return 'warning';
    if (/active|enabled|passed|low|approved|complete|accepted|valid/.test(valueText)) return 'success';
    return 'info';
  };
  const badge = (value: unknown): string => `<span class="badge ${tone(value)}">${esc(text(value, '—'))}</span>`;
  const notify = (message: string): void => layout.toast(message);
  const unsupportedMessage = 'This action is unavailable because the active Swagger does not provide a Tenant Users & Access mutation endpoint.';
  const unavailableAction = (): void => notify(unsupportedMessage);

  function explicitArray(root: TenantAccessRecord | null, keys: string[]): TenantAccessRecord[] {
    if (!root) return [];
    for (const key of keys) {
      const value = root[key];
      if (Array.isArray(value)) return value.filter(isRecord);
      if (isRecord(value)) {
        const rows = records(value);
        if (rows.length) return rows;
      }
    }
    return [];
  }

  function mapUser(row: TenantAccessRecord, fallbackIndex = 0): TenantAccessUser {
    const roleValues = stringList(firstOf(row, ['roles','roleNames','role','userRole'], ''));
    const statusRaw = firstOf(row, ['status','accountStatus','state'], '');
    const isActive = row.isActive;
    const status = text(statusRaw, typeof isActive === 'boolean' ? (isActive ? 'Active' : 'Inactive') : '—');
    const mfaValue = firstOf(row, ['mfaStatus','mfa','twoFactorStatus','twoFactorEnabled','mfaEnabled'], '');
    const mfa = typeof mfaValue === 'boolean' ? (mfaValue ? 'Enabled' : 'Disabled') : text(mfaValue, '—');
    const email = text(firstOf(row, ['email','emailAddress','mail','userPrincipalName','username','userName'], ''), '');
    const name = text(firstOf(row, ['fullName','displayName','name','legalName','username','userName'], ''), email || 'Authenticated user');
    const id = text(firstOf(row, ['id','userId','user_id','sub','subject','username','userName','email'], ''), `authenticated-user-${fallbackIndex + 1}`);
    return {
      id,
      name,
      email: email || '—',
      role: roleValues.join(', ') || '—',
      scope: text(firstOf(row, ['scope','accessScope','objectScope','tenantScope'], ''), '—'),
      client: text(firstOf(row, ['client','clientName','clientScope'], ''), '—'),
      plants: stringList(firstOf(row, ['plants','plantNames','assignedPlants','plantScope'], '')),
      modules: stringList(firstOf(row, ['modules','allowedModules','workspaces'], '')),
      status,
      mfa,
      lastLogin: text(firstOf(row, ['lastLogin','lastLoginAt','lastSignInAt','lastAuthenticatedAt'], ''), '—'),
      review: text(firstOf(row, ['review','accessReview','reviewStatus'], ''), '—'),
      risk: text(firstOf(row, ['risk','riskLevel','riskStatus'], ''), '—'),
      invitedBy: text(firstOf(row, ['invitedBy','createdBy','provisionedBy'], ''), '—'),
      expires: text(firstOf(row, ['expires','expiresAt','accessExpiresAt','validUntil'], ''), '—')
    };
  }

  function mapRole(row: TenantAccessRecord, fallbackIndex = 0): TenantAccessRole {
    const name = text(firstOf(row, ['name','roleName','label','code','role'], ''), `Role ${fallbackIndex + 1}`);
    const systemValue = firstOf(row, ['system','isSystem','builtIn'], null);
    const sensitiveValue = firstOf(row, ['sensitive','isSensitive','privileged'], null);
    return {
      id: text(firstOf(row, ['id','roleId','role_id','code'], ''), name),
      name,
      description: text(firstOf(row, ['description','note','summary'], ''), ''),
      scope: text(firstOf(row, ['scope','accessScope','objectScope'], ''), '—'),
      permissions: stringList(firstOf(row, ['permissions','actions','grants'], '')),
      modules: stringList(firstOf(row, ['modules','allowedModules','workspaces'], '')),
      sensitive: typeof sensitiveValue === 'boolean' ? sensitiveValue : null,
      system: typeof systemValue === 'boolean' ? systemValue : null,
      status: text(firstOf(row, ['status','state'], ''), '—')
    };
  }

  function mapInvite(row: TenantAccessRecord, fallbackIndex = 0): TenantAccessInvite {
    return {
      id: text(firstOf(row, ['id','invitationId','inviteId'], ''), `invite-${fallbackIndex + 1}`),
      email: text(firstOf(row, ['email','emailAddress','inviteeEmail'], ''), '—'),
      name: text(firstOf(row, ['name','fullName','inviteeName'], ''), '—'),
      role: text(firstOf(row, ['role','roleName'], ''), '—'),
      scope: text(firstOf(row, ['scope','accessScope'], ''), '—'),
      status: text(firstOf(row, ['status','state'], ''), '—'),
      sent: text(firstOf(row, ['sent','sentAt','createdAt'], ''), '—'),
      expires: text(firstOf(row, ['expires','expiresAt'], ''), '—'),
      mfa: text(firstOf(row, ['mfa','mfaStatus','mfaPolicy'], ''), '—'),
      invitedBy: text(firstOf(row, ['invitedBy','createdBy'], ''), '—')
    };
  }

  function mapEvent(row: TenantAccessRecord, fallbackIndex = 0): TenantAccessEvent {
    return {
      event: text(firstOf(row, ['event','title','action','type'], ''), `Event ${fallbackIndex + 1}`),
      description: text(firstOf(row, ['description','details','message','note'], ''), '—'),
      time: text(firstOf(row, ['time','timestamp','createdAt','occurredAt'], ''), '—'),
      actor: text(firstOf(row, ['actor','actorName','userName','createdBy'], ''), '—'),
      status: text(firstOf(row, ['status','result','outcome'], ''), '—')
    };
  }

  function mapPolicy(row: TenantAccessRecord, fallbackIndex = 0): TenantAccessPolicy {
    return {
      title: text(firstOf(row, ['title','name','policyName'], ''), `Policy ${fallbackIndex + 1}`),
      status: text(firstOf(row, ['status','state'], ''), '—'),
      scope: text(firstOf(row, ['scope','appliesTo'], ''), '—'),
      note: text(firstOf(row, ['note','description','details'], ''), '—'),
      enforcement: text(firstOf(row, ['enforcement','enforcedBy','source'], ''), '—')
    };
  }

  function normalizePayload(payload: unknown): void {
    const root = unwrap(payload);
    const userRows = explicitArray(root, ['users','tenantUsers','members','accounts']);
    const currentUser = root ? mapUser(root) : null;
    users = userRows.length ? userRows.map(mapUser) : (currentUser ? [currentUser] : []);

    const roleRows = explicitArray(root, ['roleTemplates','availableRoles','tenantRoles']);
    roles = roleRows.map(mapRole);
    if (!roles.length && root) {
      const explicitRoles = stringList(firstOf(root, ['roles','roleNames','role','userRole'], ''));
      roles = explicitRoles.map((name, index) => mapRole({ id: name, name, status: 'Active' }, index));
    }

    invites = explicitArray(root, ['invitations','invites','pendingInvitations']).map(mapInvite);
    events = explicitArray(root, ['activities','activity','events','history','auditTrail']).map(mapEvent);
    policies = explicitArray(root, ['policies','securityPolicies','accessPolicies']).map(mapPolicy);
    selectedUserId = users[0]?.id || '';
  }

  function stateBlock(title: string, detail: string, kind: 'empty' | 'error' | 'loading' = 'empty'): string {
    const extra = kind === 'error' ? ' zentrid-ux-state-error' : kind === 'loading' ? ' zentrid-ux-state-loading' : ' zentrid-ux-state-empty';
    return `<div class="empty-state zentrid-ux-state${extra}" role="status"><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`;
  }

  function disabledButton(label: string, className = 'primary-action'): string {
    return `<button class="${className}" type="button" data-users-action="unsupported" disabled title="No API endpoint in active Swagger">${label}</button>`;
  }

  function render(): void {
    layout.mount(`
      <div class="tenant-users-page-v1436" id="tenantUsersAccessRoot">
        <section class="page-hero rbac-hero tenant-users-hero-v1436">
          <div>
            <p class="eyebrow">Tenant Admin · Access Governance</p>
            <h1>Users & Access</h1>
            <p class="muted">Manage tenant users, role templates, invitations, object scope and security review without platform-level access.</p>
          </div>
          <button class="freshness-card" type="button" data-users-action="refresh">
            <span class="pulse"></span>
            <div><strong>Tenant access snapshot</strong><small>${loadState === 'loading' ? 'Loading from API…' : loadedAt ? `Updated ${esc(loadedAt.toLocaleTimeString())}` : loadState === 'error' ? 'API unavailable' : 'No access records'}</small></div>
          </button>
        </section>
        <section class="context-bar glass-card tenant-users-context-v1436">
          <button class="ctx-item" type="button"><span>Tenant</span><strong>${esc(tenantName)}</strong></button>
          <button class="ctx-item" type="button"><span>Access Boundary</span><strong>Tenant only</strong></button>
          <button class="ctx-item" type="button"><span>Platform Roles</span><strong>Not visible</strong></button>
          <button class="ctx-item" type="button"><span>Security</span><strong>${esc(users[0]?.mfa || '—')}</strong></button>
        </section>
        <section class="plant-workspace-v17 rbac-workspace tenant-users-workspace-v1436">
          <aside class="glass-card plant-side-card-v17 rbac-side tenant-users-side-v1436">
            <h3>Users & Access</h3>
            ${([
              ['overview','Overview'], ['users','User Directory'], ['roles','Roles & Permissions'], ['invitations','Invitations'], ['security','Security'], ['activity','Activity']
            ] as Array<[TenantAccessTab,string]>).map(([key,label]) => `<button type="button" class="${activeTab === key ? 'active' : ''}" data-users-tab="${key}">${label}</button>`).join('')}
          </aside>
          <section class="glass-card plant-main-card-v17 rbac-main tenant-users-main-v1436">
            <div id="tenantUsersTabContent"></div>
          </section>
        </section>
        <aside class="detail-drawer rbac-drawer tenant-users-drawer-v1436" id="tenantUsersDrawer" aria-hidden="true">
          <button class="drawer-close" type="button" data-users-close aria-label="Close details">×</button>
          <div id="tenantUsersDrawerContent"></div>
        </aside>
      </div>
    `);
    drawTab();
  }

  function drawTab(): void {
    const root = document.getElementById('tenantUsersTabContent');
    if (!root) return;
    const renderers: Record<TenantAccessTab, () => string> = {
      overview: overviewTab,
      users: usersTab,
      roles: rolesTab,
      invitations: invitationsTab,
      security: securityTab,
      activity: activityTab
    };
    root.innerHTML = renderers[activeTab]();
  }

  function overviewTab(): string {
    const active = users.filter(user => normalize(user.status) === 'active').length;
    const pending = invites.filter(invite => normalize(invite.status) === 'pending').length;
    const review = users.filter(user => user.review !== '—' && normalize(user.review) !== 'passed').length;
    const highRisk = users.filter(user => normalize(user.risk) === 'high').length;
    const mfaKnown = users.filter(user => user.mfa !== '—');
    const mfaEnabled = mfaKnown.filter(user => normalize(user.mfa) === 'enabled').length;
    return `
      <div class="section-title-v17 rbac-section-head">
        <div><h2>Tenant Access Overview</h2><p class="muted">Account health, role coverage, pending invitations and security actions for ${esc(tenantName)}.</p></div>
        <div class="rbac-head-actions"><button class="secondary-action" type="button" data-users-action="export" data-permission-action="export" data-permission-resource="user">Export Users</button>${disabledButton('+ Invite User')}</div>
      </div>
      ${loadState === 'loading' ? stateBlock('Loading Users & Access', 'Requesting the authenticated user from /api/Auth/me.', 'loading') : ''}
      ${loadState === 'error' ? stateBlock('Users & Access API unavailable', loadError || 'The authenticated user could not be loaded.', 'error') : ''}
      <div class="kpi-grid rbac-kpis tenant-users-kpis-v1436">
        ${[
          ['Active users', active, 'API-confirmed accounts'],
          ['Tenant roles', roles.length, 'Roles returned by API'],
          ['Pending invitations', pending, 'Invitations returned by API'],
          ['Review queue', review, 'API-confirmed review records'],
          ['High risk', highRisk, 'API-confirmed risk records'],
          ['MFA coverage', mfaKnown.length ? `${Math.round((mfaEnabled / mfaKnown.length) * 100)}%` : '—', 'Only when returned by API']
        ].map(([label,value,sub]) => `<article class="kpi-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`).join('')}
      </div>
      <div class="rbac-flow tenant-users-flow-v1436">
        ${[
          ['1','Invite','Identity, role and tenant scope'], ['2','Assign role','Use a tenant role template'], ['3','Bind objects','Client, plant or all-tenant scope'], ['4','Secure','MFA and session policy'], ['5','Review','Approve, update or suspend access']
        ].map(item => `<article><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`).join('')}
      </div>
      <div class="module-grid rbac-two-col">
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Access Review Queue</h2><p>Users that need tenant administrator attention.</p></div><button class="small-btn ghost" type="button" data-users-jump="users">Open Directory</button></div>
          ${userTable(users.filter(user => user.review !== '—' && (normalize(user.review) !== 'passed' || normalize(user.status) !== 'active')).slice(0, 5), true, 'No access review records were returned by /api/Auth/me.')}
        </section>
        <section class="panel glass-card embedded-panel-v32">
          <div class="panel-head"><div><h2>Role Coverage</h2><p>Assigned users by tenant role template.</p></div><button class="small-btn ghost" type="button" data-users-jump="roles">Open Roles</button></div>
          ${roles.length ? `<div class="data-table compact-table rbac-role-table tenant-role-overview-table-v1436"><div class="data-head"><span>Role</span><span>Scope</span><span>Users</span><span>Status</span></div>${roles.slice(0,5).map(role => `<div class="data-row"><div><strong>${esc(role.name)}</strong><small>${esc(role.description || '—')}</small></div><div><strong>${esc(role.scope)}</strong></div><div><strong>${users.filter(user => user.role.split(',').map(normalize).includes(normalize(role.name))).length}</strong><small>Assigned</small></div><div>${badge(role.status)}</div></div>`).join('')}</div>` : stateBlock('No role templates returned', 'The active Swagger does not provide a tenant roles endpoint.')}
        </section>
      </div>
      <div class="module-grid rbac-two-col">
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Security Snapshot</h2><p>Tenant access controls returned by the authentication API.</p></div><button class="small-btn ghost" type="button" data-users-jump="security">Open Security</button></div>${policies.length ? `<div class="placeholder-grid compact-cards rbac-policy-mini">${policies.slice(0,4).map(policy => `<article><div><strong>${esc(policy.title)}</strong><small>${esc(policy.note)}</small></div>${badge(policy.status)}</article>`).join('')}</div>` : stateBlock('No security policies returned', 'The active Swagger does not provide a tenant security-policy endpoint.')}</section>
        <section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Recent Access Activity</h2><p>Latest tenant user and scope changes returned by API.</p></div><button class="small-btn ghost" type="button" data-users-jump="activity">Open Activity</button></div>${activityList(events.slice(0,5))}</section>
      </div>
    `;
  }

  function usersTab(): string {
    return `
      <div class="section-title-v17 rbac-section-head"><div><h2>User Directory</h2><p class="muted">Users returned for ${esc(tenantName)}. The current Swagger exposes only /api/Auth/me.</p></div><div class="rbac-head-actions"><button class="secondary-action" type="button" data-users-action="export" data-permission-action="export" data-permission-resource="user">Export</button>${disabledButton('+ Invite User')}</div></div>
      <div class="rbac-toolbar tenant-users-toolbar-v1436"><input id="tenantUserSearch" type="search" placeholder="Search name, email or scope..." /><select id="tenantUserRoleFilter"><option value="">All roles</option>${roles.map(role => `<option>${esc(role.name)}</option>`).join('')}</select><select id="tenantUserStatusFilter"><option value="">All statuses</option>${[...new Set(users.map(user => user.status).filter(status => status !== '—'))].map(status => `<option>${esc(status)}</option>`).join('')}</select></div>
      <div id="tenantUserTableWrap">${userTable(users, false, loadState === 'error' ? loadError : 'No users were returned by /api/Auth/me.')}</div>
    `;
  }

  function userTable(list: TenantAccessUser[], compact = false, emptyDetail = 'No users were returned by API.'): string {
    if (!list.length) return stateBlock('No users available', emptyDetail, loadState === 'error' ? 'error' : 'empty');
    return `<div class="data-table rbac-user-table ${compact ? 'compact-table' : ''} tenant-user-table-v1436"><div class="data-head"><span>User</span><span>Role</span><span>Access Scope</span><span>Status</span><span>Security</span><span>Action</span></div>${list.map(user => `<div class="data-row" data-user-row="${esc(user.id)}"><div><strong>${esc(user.name)}</strong><small>${esc(user.email)}<br>${esc(user.id)}</small></div><div><strong>${esc(user.role)}</strong><small>${esc(user.client)}</small></div><div><strong>${esc(user.scope)}</strong><small>${esc(user.plants.join(', ') || '—')}</small></div><div>${badge(user.status)}<small>Last login: ${esc(user.lastLogin)}</small></div><div>${badge(`MFA ${user.mfa}`)}<small>${esc(user.review)} · Risk ${esc(user.risk)}</small></div><div class="row-actions single-action"><button class="secondary-action single-row-action" type="button" data-users-open="${esc(user.id)}">Open</button></div></div>`).join('')}</div>`;
  }

  function rolesTab(): string {
    const matrixModules = ['Clients','Plants','Devices','Alerts','Telemetry','Energy Analytics','Finance','Reports','Users & Access','Tenant Settings'];
    return `
      <div class="section-title-v17 rbac-section-head"><div><h2>Roles & Permissions</h2><p class="muted">Only roles and grants explicitly returned by the authentication API are displayed.</p></div>${disabledButton('+ Create Tenant Role')}</div>
      ${roles.length ? `<div class="tenant-role-grid-v1436">${roles.map(role => `<article class="panel glass-card tenant-role-card-v1436"><div class="tenant-role-card-head-v1436"><div><span class="badge info">API role</span><h3>${esc(role.name)}</h3><p>${esc(role.description || 'No description returned by API.')}</p></div>${badge(role.status)}</div><div class="tenant-role-card-stats-v1436"><div><span>Assigned users</span><strong>${users.filter(user => user.role.split(',').map(normalize).includes(normalize(role.name))).length}</strong></div><div><span>Scope</span><strong>${esc(role.scope)}</strong></div><div><span>Sensitive</span><strong>${role.sensitive === null ? '—' : role.sensitive ? 'Yes' : 'No'}</strong></div></div><div class="tenant-role-modules-v1436">${role.modules.length ? role.modules.map(module => `<span>${esc(module)}</span>`).join('') : '<span>—</span>'}</div><div class="drawer-actions"><button class="secondary-action" type="button" data-role-open="${esc(role.id)}">View Permissions</button></div></article>`).join('')}</div>` : stateBlock('No tenant roles returned', 'The current Swagger does not expose a tenant roles directory endpoint.')}
      <section class="panel glass-card tenant-permission-matrix-v1436"><div class="panel-head"><div><h2>Permission Matrix</h2><p>High-level module access returned by API for each tenant role.</p></div><span class="badge info">API-backed only</span></div>${roles.length ? `<div class="data-table rbac-matrix-table tenant-permission-table-v1436"><div class="data-head"><span>Module</span>${roles.map(role => `<span>${esc(role.name)}</span>`).join('')}</div>${matrixModules.map(module => `<div class="data-row"><div><strong>${esc(module)}</strong></div>${roles.map(role => `<div>${badge(role.modules.length ? (role.modules.includes(module) ? 'Allowed' : 'No access') : '—')}</div>`).join('')}</div>`).join('')}</div>` : stateBlock('Permission matrix unavailable', 'No permissions or role templates were returned by API.')}</section>
    `;
  }

  function invitationsTab(): string {
    return `
      <div class="section-title-v17 rbac-section-head"><div><h2>Invitations</h2><p class="muted">Review invitations returned by the current tenant API.</p></div>${disabledButton('+ Invite User')}</div>
      ${invites.length ? `<div class="data-table rbac-invite-table tenant-invite-table-v1436"><div class="data-head"><span>Invitee</span><span>Role / Scope</span><span>Status</span><span>Sent / Expiry</span><span>Security</span><span>Actions</span></div>${invites.map(invite => `<div class="data-row"><div><strong>${esc(invite.name)}</strong><small>${esc(invite.email)}<br>${esc(invite.id)}</small></div><div><strong>${esc(invite.role)}</strong><small>${esc(invite.scope)}</small></div><div>${badge(invite.status)}</div><div><strong>${esc(invite.sent)}</strong><small>Expires: ${esc(invite.expires)}</small></div><div><strong>MFA ${esc(invite.mfa)}</strong><small>Invited by ${esc(invite.invitedBy)}</small></div><div class="row-actions tenant-invite-actions-v1436"><button class="secondary-action" type="button" data-invite-open="${esc(invite.id)}">Review</button></div></div>`).join('')}</div>` : stateBlock('No invitations returned', 'The current Swagger does not expose a tenant invitations endpoint.')}
    `;
  }

  function securityTab(): string {
    const mfaKnown = users.filter(user => user.mfa !== '—');
    const enabled = mfaKnown.filter(user => normalize(user.mfa) === 'enabled').length;
    const required = mfaKnown.filter(user => normalize(user.mfa) === 'required').length;
    return `
      <div class="section-title-v17 rbac-section-head"><div><h2>Security Controls</h2><p class="muted">Only security and MFA fields explicitly returned by API are displayed.</p></div><span class="badge info">Read-only API data</span></div>
      ${policies.length ? `<div class="data-table rbac-security-table tenant-security-table-v1436"><div class="data-head"><span>Policy</span><span>Status</span><span>Scope</span><span>Enforcement</span><span>Details</span></div>${policies.map(policy => `<div class="data-row"><div><strong>${esc(policy.title)}</strong></div><div>${badge(policy.status)}</div><div><strong>${esc(policy.scope)}</strong></div><div><strong>${esc(policy.enforcement)}</strong></div><div><strong>${esc(policy.note)}</strong></div></div>`).join('')}</div>` : stateBlock('No security policies returned', 'The current Swagger does not expose tenant security controls.')}
      <div class="module-grid rbac-two-col tenant-security-summary-v1436"><section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>MFA Enrollment</h2><p>Current API-confirmed MFA coverage.</p></div></div><div class="information-grid"><div><span>Enabled</span><strong>${mfaKnown.length ? enabled : '—'}</strong><small>Returned by API</small></div><div><span>Required</span><strong>${mfaKnown.length ? required : '—'}</strong><small>Returned by API</small></div><div><span>Administrators</span><strong>—</strong><small>No roles endpoint</small></div><div><span>Exceptions</span><strong>—</strong><small>No policy endpoint</small></div></div></section><section class="panel glass-card embedded-panel-v32"><div class="panel-head"><div><h2>Security Review</h2><p>Current API-confirmed risk and review state.</p></div></div><div class="information-grid"><div><span>Passed</span><strong>${users.some(user => user.review !== '—') ? users.filter(user => normalize(user.review) === 'passed').length : '—'}</strong></div><div><span>Due</span><strong>${users.some(user => user.review !== '—') ? users.filter(user => normalize(user.review).includes('due')).length : '—'}</strong></div><div><span>Blocked</span><strong>${users.some(user => user.review !== '—') ? users.filter(user => normalize(user.review) === 'blocked').length : '—'}</strong></div><div><span>High Risk</span><strong>${users.some(user => user.risk !== '—') ? users.filter(user => normalize(user.risk) === 'high').length : '—'}</strong></div></div></section></div>
    `;
  }

  function activityTab(): string {
    return `
      <div class="section-title-v17 rbac-section-head"><div><h2>Access Activity</h2><p class="muted">Tenant audit events returned by API.</p></div><button class="secondary-action" type="button" data-users-action="export-activity" data-permission-action="export" data-permission-resource="user">Export Activity</button></div>
      ${activityList(events)}
    `;
  }

  function activityList(list: TenantAccessEvent[]): string {
    if (!list.length) return stateBlock('No access activity returned', 'The current Swagger does not expose a tenant access audit endpoint.');
    return `<div class="rbac-audit rbac-audit-inline tenant-access-activity-v1436">${list.map(item => `<article class="commercial-audit-item"><div class="commercial-audit-inline-main"><strong>${esc(item.event)}</strong><b>${esc(item.actor)}</b><small>${esc(item.description)}</small></div><span class="rbac-audit-time">${esc(item.time)}</span>${badge(item.status)}</article>`).join('')}</div>`;
  }

  function openDrawer(title: string, body: string): void {
    const drawer = document.getElementById('tenantUsersDrawer');
    const content = document.getElementById('tenantUsersDrawerContent');
    if (!drawer || !content) return;
    content.innerHTML = `<div class="drawer-body"><p class="eyebrow">Tenant Access</p><h2>${esc(title)}</h2>${body}</div>`;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer(): void {
    const drawer = document.getElementById('tenantUsersDrawer');
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
  }

  function openUser(id: string): void {
    const user = users.find(item => item.id === id);
    if (!user) return;
    selectedUserId = id;
    openDrawer(user.name, `
      <div class="tenant-user-detail-header-v1436">${badge(user.status)}${badge(`Risk ${user.risk}`)}<small>${esc(user.id)} · ${esc(user.email)}</small></div>
      <div class="information-grid rbac-info-grid tenant-user-info-v1436"><div><span>Role</span><strong>${esc(user.role)}</strong></div><div><span>Tenant</span><strong>${esc(tenantName)}</strong></div><div><span>Client Scope</span><strong>${esc(user.client)}</strong></div><div><span>Object Scope</span><strong>${esc(user.scope)}</strong></div><div><span>Plants</span><strong>${esc(user.plants.join(', ') || '—')}</strong></div><div><span>MFA</span><strong>${esc(user.mfa)}</strong></div><div><span>Last Login</span><strong>${esc(user.lastLogin)}</strong></div><div><span>Access Review</span><strong>${esc(user.review)}</strong></div><div><span>Invited By</span><strong>${esc(user.invitedBy)}</strong></div><div><span>Access Expiry</span><strong>${esc(user.expires)}</strong></div></div>
      <section class="tenant-user-modules-v1436"><h3>Allowed Modules</h3><div>${user.modules.length ? user.modules.map(module => `<span>${esc(module)}</span>`).join('') : '<span>—</span>'}</div></section>
      <div class="drawer-actions rbac-drawer-actions">${disabledButton('Edit Access', 'secondary-action')}${disabledButton('Suspend User', 'danger-action')}</div>
    `);
  }

  function openRole(id: string): void {
    const role = roles.find(item => item.id === id);
    if (!role) return;
    openDrawer(role.name, `<div class="tenant-user-detail-header-v1436">${badge(role.status)}<span class="badge info">API role</span></div><p class="muted">${esc(role.description || 'No description returned by API.')}</p><div class="information-grid rbac-info-grid"><div><span>Scope</span><strong>${esc(role.scope)}</strong></div><div><span>Assigned Users</span><strong>${users.filter(user => user.role.split(',').map(normalize).includes(normalize(role.name))).length}</strong></div><div><span>Sensitive Role</span><strong>${role.sensitive === null ? '—' : role.sensitive ? 'Yes' : 'No'}</strong></div><div><span>Role ID</span><strong>${esc(role.id)}</strong></div></div><section class="tenant-user-modules-v1436"><h3>Allowed Modules</h3><div>${role.modules.length ? role.modules.map(module => `<span>${esc(module)}</span>`).join('') : '<span>—</span>'}</div></section><section class="tenant-user-modules-v1436"><h3>Permissions</h3><div>${role.permissions.length ? role.permissions.map(permission => `<span>${esc(permission)}</span>`).join('') : '<span>—</span>'}</div></section>`);
  }

  function reviewInvite(id: string): void {
    const invite = invites.find(item => item.id === id);
    if (!invite) return;
    openDrawer(invite.name, `<div class="tenant-user-detail-header-v1436">${badge(invite.status)}<small>${esc(invite.id)} · ${esc(invite.email)}</small></div><div class="information-grid rbac-info-grid"><div><span>Role</span><strong>${esc(invite.role)}</strong></div><div><span>Scope</span><strong>${esc(invite.scope)}</strong></div><div><span>Sent</span><strong>${esc(invite.sent)}</strong></div><div><span>Expires</span><strong>${esc(invite.expires)}</strong></div><div><span>MFA</span><strong>${esc(invite.mfa)}</strong></div><div><span>Invited By</span><strong>${esc(invite.invitedBy)}</strong></div></div><div class="drawer-actions">${disabledButton('Resend Invitation', 'secondary-action')}${disabledButton('Revoke Invitation', 'danger-action')}</div>`);
  }

  function applyUserFilters(): void {
    const search = (document.getElementById('tenantUserSearch') as HTMLInputElement | null)?.value.trim().toLowerCase() || '';
    const role = (document.getElementById('tenantUserRoleFilter') as HTMLSelectElement | null)?.value || '';
    const status = (document.getElementById('tenantUserStatusFilter') as HTMLSelectElement | null)?.value || '';
    const filtered = users.filter(user => (!search || [user.name,user.email,user.scope,user.client,user.plants.join(' ')].join(' ').toLowerCase().includes(search)) && (!role || user.role.split(',').map(normalize).includes(normalize(role))) && (!status || user.status === status));
    const wrap = document.getElementById('tenantUserTableWrap');
    if (wrap) wrap.innerHTML = userTable(filtered, false, 'No API-backed users match the current filters.');
  }

  function exportCsv(activity = false): void {
    const rows: Array<Array<string | number>> = activity
      ? [['Event','Description','Time','Actor','Status'], ...events.map(item => [item.event,item.description,item.time,item.actor,item.status])]
      : [['User ID','Name','Email','Role','Scope','Client','Plants','Status','MFA','Last Login','Risk'], ...users.map(user => [user.id,user.name,user.email,user.role,user.scope,user.client,user.plants.join(' | '),user.status,user.mfa,user.lastLogin,user.risk])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = activity ? 'zentrid-tenant-access-activity-api.csv' : 'zentrid-tenant-users-api.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    notify(activity ? 'API-backed access activity exported.' : 'API-backed tenant users exported.');
  }

  async function loadUsersAccess(force = false): Promise<void> {
    loadState = 'loading';
    loadError = '';
    render();
    try {
      const payload = await ZentridPlatformAPI.auth.me();
      normalizePayload(payload);
      loadedAt = new Date();
      loadState = users.length || roles.length || invites.length || events.length || policies.length ? 'ready' : 'empty';
    } catch (error) {
      users = [];
      roles = [];
      invites = [];
      events = [];
      policies = [];
      selectedUserId = '';
      loadedAt = null;
      loadError = error instanceof Error ? error.message : String(error);
      loadState = 'error';
    }
    render();
    if (force) notify(loadState === 'error' ? 'Users & Access refresh failed.' : 'Users & Access refreshed from /api/Auth/me.');
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button,[data-users-open],[data-role-open],[data-invite-open]') : null;
    if (!target) return;
    const tab = target.dataset.usersTab as TenantAccessTab | undefined;
    if (tab) {
      activeTab = tab;
      localStorage.setItem('zentrid_tenant_access_tab', activeTab);
      render();
      return;
    }
    const jump = target.dataset.usersJump as TenantAccessTab | undefined;
    if (jump) {
      activeTab = jump;
      localStorage.setItem('zentrid_tenant_access_tab', activeTab);
      render();
      return;
    }
    if (target.hasAttribute('data-users-close')) { closeDrawer(); return; }
    if (target.dataset.usersOpen) { openUser(target.dataset.usersOpen); return; }
    if (target.dataset.roleOpen) { openRole(target.dataset.roleOpen); return; }
    if (target.dataset.inviteOpen) { reviewInvite(target.dataset.inviteOpen); return; }
    const action = target.dataset.usersAction;
    if (action === 'refresh') { void loadUsersAccess(true); return; }
    if (action === 'export') { exportCsv(false); return; }
    if (action === 'export-activity') { exportCsv(true); return; }
    if (action === 'unsupported') { unavailableAction(); }
  });

  document.addEventListener('input', event => {
    const target = event.target as HTMLElement | null;
    if (target?.id === 'tenantUserSearch') applyUserFilters();
  });
  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.id === 'tenantUserRoleFilter' || target?.id === 'tenantUserStatusFilter') applyUserFilters();
  });

  render();
  void loadUsersAccess();
})();
