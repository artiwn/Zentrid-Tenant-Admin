# Zentrid Tenant Admin — Standalone

This is a separate Tenant Admin application. It does not contain the Global Admin dashboard, routes, menus, tenant provisioning, platform consoles, tariff-plan management or payment settings.

## Windows

Run `START-WINDOWS.cmd`, or:

```powershell
npm.cmd ci
npm.cmd run start
```

Open: `http://localhost:5050/index.html`

The application accepts TenantAdmin, TenantAdministrator or OrganizationAdmin roles and fixes the tenant scope from the authenticated session.

## v1.42.1 login asset correction
- Restores the exact shared Zentrid primary/secondary action styling used by Global Admin.
- Generates `assets/release-manifest.json` on every build.
- Includes a real `favicon.ico` in the standalone application.
- Tenant Admin login now validates Tenant Admin / Tenant Administrator / Organization Admin roles instead of GlobalAdmin.

## v142.3 — Tenant Overview parity restoration

The Tenant Admin Overview is now a dedicated page implementation based on the Global Admin v140 Overview structure and interaction model. It keeps the standalone Tenant Admin scope while restoring the same KPI cards, dashboard grid, health visualization, map, alert and integration summaries, data reliability, top plants, trend chart, activity feed, drill-down drawer, shared component CSS, and responsive behavior.


## v142.3 Clients parity

- Clients Registry and Client Detail use the complete Global Admin component styling locally.
- Create Client keeps the original wizard structure but uses a fixed Tenant Admin scope instead of a tenant selector.
- Table, form, live-data, pagination, drawer, action and responsive CSS components are included in the standalone build.

## v142.4 — Plants parity

- Plant Registry now opens directly as a standalone Tenant Admin page without the hidden Groups workspace.
- The Global Admin v140 plant table, filters, server pagination, Create Plant wizard and Plant Detail workspace are preserved.
- Fallback plants, client assignment and vendor company fields are restricted to the authenticated tenant.
- Plant Detail exposes source freshness as read-only and does not allow Tenant Admin to run platform integration sync.


## v142.5 — Devices parity

- Device List and Device Detail preserve the Global Admin v140 structure, component classes, tables, KPI cards, type-specific tabs and responsive behavior.
- Live and fallback device records are restricted to the authenticated tenant scope.
- Add Device, firmware writes, remote commands, Command Center and Data Governance actions are not exposed to Tenant Admin.
- Configuration and Source & Sync remain complete read-only snapshots; navigation stays inside the standalone Tenant Admin application.

## v142.6 — Alerts & Events parity

- Alerts Registry and Alert Detail preserve the Global Admin v140 structure, KPI cards, filters, server pagination, alert table, detail hero, side navigation, classification, incident, SOP, timeline, related-object and activity views.
- The Tenant selector and cross-tenant demo records are removed; the page is fixed to the authenticated tenant and links alerts to its existing plants and devices.
- Quick acknowledgement updates the alert state in the registry, while detail actions support acknowledge, assignment, escalation, resolution, SOP progress and local technical follow-up context.
- Alert Dictionary, Admin Console and Data Governance routes are not exposed; vendor mapping is displayed as a read-only source snapshot.

## v142.7 — Runtime recovery and tenant-scope correction

- Removes false-positive CSP report-only warnings for the shared Global Admin inline chart/action primitives while keeping the enforced compatible CSP active.
- Prevents valid live Device, Plant and Alert records from being erased when backend tenant labels differ from the authenticated UI tenant label.
- Keeps Device List and Operational Alert Inbox populated by trusting the authenticated backend scope and normalizing display labels locally.
- Adds safe render boundaries for Client, Plant, Device and Alert detail pages so an unexpected record cannot leave a blank application shell.
- Reduces slow relation requests to 15 seconds and adds an 18-second loading watchdog; fallback or cached content remains visible instead of an endless loading state.

## v142.8 — Client/Plant Detail routing + Telemetry & Data
- Client Detail and Plant Detail now open by explicit `?id=` routes and retain a local record snapshot.
- Live client records are merged into a complete detail-safe model instead of replacing required fields.
- Telemetry & Data is a dedicated Tenant Admin workspace with normalized filters, KPIs, trend chart, quality states, samples and CSV export.
## v142.9 / v143.0 — UUID detail runtime stability
- Client Detail and Plant Detail preserve UUID routes and local snapshots.
- The recursive permission-summary MutationObserver loop is removed.
- Both heavy detail workspaces complete initial mount without a white screen or endless loading.

## v143.1 — Energy Analytics parity
- Replaces the simplified Energy Analytics renderer with a dedicated Tenant Admin module based on the Global Admin Production Center structure.
- Includes fixed-tenant filters, context KPIs, client and plant analytics tables, energy flow, day/week/month charts, performance, read-only source mapping, activity and CSV export.
- Plant Detail and Telemetry navigation stay inside the standalone Tenant Admin application.


## v143.3 — Zentrid rebrand

- Applies the Zentrid brand and technical namespace across the standalone Tenant Admin application.
- Uses Zentrid runtime globals, browser events, storage keys, release metadata and environment variables.
- Keeps the current backend hostnames as infrastructure endpoints until the API domains are migrated.


## v143.3 Finance & Billing
Tenant-scoped current plan, usage, invoices, payments, billing profile and audit activity using shared Zentrid billing components.

## v143.5 Reports
- Replaces the simplified Reports renderer with a dedicated Tenant Admin report workspace.
- Adds report library, saved templates, filters, preview drawer, builder, scheduled reports, activity, email delivery and working PDF / Excel-compatible / CSV downloads.
- Keeps report scope fixed to the authenticated tenant and excludes system-wide Global Admin report governance.


## Integration Health v143.5

Read-only tenant connector monitoring with live API enrichment, safe fallback, synchronization SLA, data coverage, failures, source mapping, activity, detail drawer and CSV diagnostics export.

## Users & Access v143.7

- Replaces the simplified users table with a dedicated tenant access-governance workspace.
- Adds User Directory, tenant roles and permission matrix, invitations, security controls, audit activity, working invite/edit/suspend/reactivate flows and CSV export.
- Keeps the boundary fixed to the authenticated tenant and excludes Global Admin, platform roles, cross-tenant users and integration credential administration.


## Tenant Settings v143.7

Tenant Settings now uses a dedicated tenant-only workspace for organization profile, approved branding presets, localization and units, notifications, data/report defaults, security defaults and settings activity. Platform infrastructure, credentials, tariffs and integration configuration remain outside Tenant Admin scope.

## v144.2 — Layout runtime and Integration Health

- Exposes `FleetLayout` through `window.FleetLayout` for Reports, Users & Access and Tenant Settings.
- Rebuilds Integration Health using the shared Zentrid workspace, registry table, KPI, detail drawer and operational panels.
- Adds a release-integrity check for the global layout contract.


## v144.0 — Standalone release stabilization

- Removes the retired simplified Tenant Admin renderer from the production source tree.
- Removes stale route mappings for Global Admin-only pages that do not exist in the standalone application.
- Maps normalization metadata to the actual Energy Analytics route.
- Normalizes all page titles and Integration Health freshness labels.
- Adds a complete release-integrity gate covering all 17 HTML routes, navigation targets, page scripts, branding and forbidden cross-workspace routes.

## v144.3 — Targeted visual containment fixes

- Completed Integration Health summary card styling and table containment.
- Added spacing before Sync Health tables and Data Coverage lists.
- Completed Finance & Billing profile card styling.
- Restored native dark Zentrid styles for the Users & Access filter toolbar.
- Kept Energy Analytics action cells inside their clickable rows with a controlled horizontal-scroll fallback.


## v144.4 — Access Review Queue containment
- Compact user rows now expand to the full width of all grid columns so the row background includes the Action cell and Open button.

## v144.5 — Tenant user detail information grid

Added scoped card styling for `tenant-user-info-v1436` inside the Users & Access detail drawer only.

## GitHub and Vercel deployment

The repository is prepared for a static Vercel deployment while preserving the local Express proxy workflow.

### Vercel settings

Vercel reads `vercel.json` automatically:

- Install command: validates the npm registry and runs `npm ci`
- Build command: `npm run build:vercel`
- Output directory: `dist`
- `/api/Auth/*` and `/.well-known/*` are rewritten to the FleetOS Auth service
- `/api/*` is rewritten to the FleetOS API service
- API rewrite caching is disabled
- Browser security headers are applied globally

### Recommended verification before push

```bash
npm ci
npm run verify:vercel
```

The Vercel build intentionally excludes `dist/proxy-server.js`; the local build still includes it and can be started with:

```bash
npm start
```

## Runtime / Freshness v1
- Tenant data freshness upgraded to timestamp-based record evaluation: Fresh / Stale / Very stale / Unknown.
- Backend freshness contradictions are detected when status and timestamps disagree.
- Plants, Devices and Alerts filters now emit server-query refreshes instead of being limited to the current browser page.
- Device filters pass search/type/status/plant scope to repositories; Alerts pass search/severity/status/vendor/plant/device context; Plants pass search/status/vendor.
- Existing Tenant-specific renderers and navigation are preserved.

## v1.44.6 — Tenant Device lifecycle / documents / audit

- Device Detail lifecycle actions now call DeviceRegistry activate / deactivate / archive endpoints through the shared mutation runtime.
- Device Documents now support multipart upload, download and delete using DeviceRegistry document endpoints. Existing document metadata returned with a device is merged with the current-session upload cache.
- Device Audit is lazy-loaded from `GET /api/admin/devices/{id}/audit` and rendered in Audit / Activity sections.
- Tenant frontend permissions now align with the already-wired Client/Plant lifecycle actions and allow tenant-scoped lifecycle/document operations for Clients, Plants and Devices. Backend RBAC remains authoritative.
- `POST /api/admin/devices/{id}/commands` remains intentionally disabled in the UI because the current Swagger snapshot exposes the endpoint but not a request DTO; FleetOS does not invent command payloads.
- Root Live Server runtime is synchronized with `dist` after build.
