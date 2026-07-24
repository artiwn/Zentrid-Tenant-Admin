const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pages', 'users.html'), 'utf8');
const ts = fs.readFileSync(path.join(root, 'assets', 'js', 'page-scripts', 'users-access.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'src', '79-tenant-users-access.css'), 'utf8');

const requiredHtml = ['page-scripts/users-access.js', 'action-permissions.js', 'platform-api.js'];
const requiredTs = [
  'Users & Access',
  'User Directory',
  'Roles & Permissions',
  'Invitations',
  'Security Controls',
  'Access Activity',
  'Export Users',
  'ZentridPlatformAPI.auth.me()',
  'No users were returned by /api/Auth/me.',
  'active Swagger does not provide a Tenant Users & Access mutation endpoint.',
  "void loadUsersAccess()"
];
const forbiddenPlatform = ['Global Admin', 'Platform Administrator', 'All tenants', 'Integration Credentials'];
const forbiddenMocks = [
  'baseUsers',
  'baseRoles',
  'baseInvites',
  'baseEvents',
  'STORAGE_USERS',
  'STORAGE_ROLES',
  'STORAGE_INVITES',
  'STORAGE_EVENTS',
  'zentrid_tenant_access_users_v1436',
  'zentrid_tenant_access_roles_v1436',
  'zentrid_tenant_access_invites_v1436',
  'zentrid_tenant_access_events_v1436',
  'Anna Hakobyan',
  'David Martirosyan',
  'Arman Petrosyan',
  'Mariam Sargsyan',
  'Lilit Avagyan',
  'Ivan Petrov',
  'Narek Grigoryan',
  'Plant A',
  'Gyumri Solar West',
  'Arpi Rooftop 01',
  'Residential PV 01',
  'tenantUserInviteForm',
  'tenantUserEditForm',
  'tenantRoleForm',
  "addEvent('",
  'persist()'
];

for (const value of requiredHtml) if (!html.includes(value)) throw new Error(`Users & Access HTML missing ${value}`);
for (const value of requiredTs) if (!ts.includes(value)) throw new Error(`Users & Access script missing ${value}`);
for (const value of forbiddenPlatform) if (html.includes(value) || ts.includes(value)) throw new Error(`Tenant Users & Access contains forbidden platform action: ${value}`);
for (const value of forbiddenMocks) if (ts.includes(value)) throw new Error(`Users & Access still contains mock/local business data: ${value}`);
if (!css.includes('.tenant-users-page-v1436')) throw new Error('Users & Access CSS namespace missing.');
if (!css.includes('targeted Users & Access layout repairs')) throw new Error('Users toolbar/action/audit repair styles missing.');
if (html.includes('tenant-admin-pages.js')) throw new Error('Users page still uses simplified tenant-admin-pages renderer.');
const storageKeys = [...ts.matchAll(/localStorage\.(?:getItem|setItem)\((['"])(.*?)\1/g)].map(match => match[2]);
if (storageKeys.some(key => key !== 'zentrid_tenant_access_tab')) throw new Error('Users & Access contains unexpected localStorage business persistence.');
console.log('Users & Access API-only parity check passed.');
