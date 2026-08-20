# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/) — group entries under **Added** /
**Changed** / **Fixed** / **Security** / **Removed**, newest release on top. Versioning follows
[SemVer](https://semver.org/): breaking changes bump the major version, new backwards-compatible
features bump the minor version, fixes-only bump the patch version.

## [Unreleased]

### Added
- **Asset Categories now declare an Asset Type** (Computer / Monitor / Printer / Phone / SIM Card /
  Network Device / Peripheral / Other) — the first step toward giving each kind of asset its own fields
  and its own list, GLPI-style. Desktop, Laptop and Server are all *Computer* types distinguished by
  their category, since they share identical fields. Existing categories were classified automatically
  on upgrade, and every existing asset was tagged with its category's type. A category's type can't be
  changed once assets are using it (create a new category instead), because the type determines which
  fields those assets carry. No visible change to the Assets pages yet.
- **Import and Export are now per-type.** Exporting from a type's own page (Computers, Phones, SIM
  Cards…) includes that type's own columns — a Computers export carries OS version, architecture, UUID
  and BIOS but no IMEI column; a SIM Cards export carries Mobile Number, ICCID and Plan. Exporting from
  **All Assets** gives a cross-type overview with an Asset Type column and the shared fields only, so
  you don't get dozens of mostly-empty columns. Import reads whichever columns are present and uses
  each row's Category to decide what it becomes, so **one file can mix types**. Older exports using the
  combined "Serial Number / Mobile Number" and "Vendor / Network Provider" headers still import.
- **Monitors now match GLPI's structure, the way Computers already do.** A monitor records its panel
  (screen size, resolution, refresh rate, panel type), each **video input as its own tick-box** — VGA,
  DVI, HDMI, DisplayPort, USB-C — its built-in extras (USB hub, speakers, microphone, webcam) and its
  stand (pivot/rotate, height adjustable, VESA mount size). The old single free-text "Connectors" box
  is gone: ticking the ports individually is what makes "which spare monitors can take DisplayPort?" an
  answerable question when you're working out what will actually plug into a machine.
- **Monitors have their own dedicated Add/Edit page** (`/assets/monitors/new`), grouped into
  Identification, Display, Video Inputs, Built-in Features & Stand, Assignment, Purchase & Warranty and
  Notes — the same sectioned layout Computers use, rather than the generic asset form. Fields that
  don't apply to a screen (Hostname, MAC Address, IP Address) aren't shown at all.
- **A monitor's page now shows the computer it's plugged into.** Previously connections were only
  visible from the computer's side, so a monitor that was in daily use looked unattached when you
  opened it. It now shows a linked **Connected To** field. This applies to printers and peripherals
  too, not just monitors.
- **Computers have their own dedicated Add/Edit page** (`/assets/computers/new`) instead of sharing the
  generic asset form. Fields are grouped into labelled sections — Identification, Hardware, Operating
  System, Network, Assignment, Purchase & Warranty, Notes — the way GLPI lays out a computer, so you're
  filling in related things together rather than scrolling one long list. The Type dropdown offers only
  Desktop / Laptop / Server, and editing a computer uses the same layout rather than dropping back to
  the generic form. Other asset types keep the shared form.
- **Computers now match GLPI's own structure.** Beyond the type split below, a computer records:
  - **Operating system broken into real fields** — name, version, architecture, service pack, kernel
    version, product key and install date — instead of one text box, so you can actually tell which
    machines are still on an old build or are 32-bit. Plus **UUID** and **BIOS version** for machine
    identity.
  - **Repeatable hardware components** (Components tab) — processors, memory, storage, graphics,
    network cards, motherboard, power supply, battery and more, each with its own specification,
    capacity, serial and quantity. A server with 2 CPUs and 4 memory modules is recorded accurately
    instead of being squashed into single boxes.
  - **Connected devices** (Connected Devices tab) — attach the monitors, printers and peripherals used
    with a machine, so a laptop's page shows its dock and screens. A device can only be connected to
    one computer at a time, and connecting a computer to another computer (or to itself) is rejected.
  - **Software** tab listing the licences assigned to that machine.
  These tabs appear only on computers; other asset types are unchanged.
- **Assets are now split by type, GLPI-style — each kind of asset gets its own page, its own columns
  and its own fields.** The sidebar gained **Computers, Monitors, Printers, Phones, SIM Cards, Network
  Devices** and **Peripherals**, each listing only that type with columns that actually suit it (a
  Computers list shows Hostname and OS; a SIM Cards list shows Mobile Number and Plan). **All Assets**
  is still there as the cross-type search, and remains where uncategorised assets live.
  - **New per-type fields**: Computers get CPU / RAM / Storage on top of OS, domain, workgroup and
    Intune; Phones get IMEI, OS and phone number; SIM Cards get a real Mobile Number, ICCID and Plan;
    Monitors get size, resolution, panel type and connectors; Printers get type, connection and page
    count; Network Devices get device type, port count and firmware; Peripherals get type and interface.
    An IP Address field was added for every type that can have one.
  - The create/edit form and the asset detail page now show **only the fields relevant to the type**,
    and relabel where it makes sense (a SIM card's Vendor reads "Network Provider"). This replaces the
    old behaviour, which was hardcoded to the literal category names "SIM" and "Mobile" and had to be
    duplicated in two places — renaming those categories would silently have broken it.
  - Validation is per-type too: a Phone's IMEI is format-checked, and SIM mobile numbers are now
    checked for duplicates (previously they were only covered incidentally, via Serial Number).
  - Existing assets were migrated automatically and keep working exactly as before.
- Assets: **Hostname** and **MAC Address** fields — shown on the create/edit form and asset detail
  page (hidden for the SIM category, same as Brand/Model), included in the CSV/XLSX export, and
  searchable from the Assets list. MAC addresses are validated for format and must be unique across
  assets, matching the existing Serial Number behavior.
- A version badge (`vX.Y.Z`, sourced from `package.json`) now shows in the top bar on every page.
- **Departments and Users: Import and Export**, mirroring the existing Assets feature. Departments export/
  import a single "Name" column; existing names are rejected on import, not overwritten. Users export
  Employee ID/Name/Email/Phone/Department/Role/Designation/Status; import uses the same columns plus a
  required Password (passwords can't be exported, and new users are always created Active, so the import
  template isn't a byte-for-byte round-trip of the export the way Departments/Assets are). Department and
  Role on a Users import row must match an existing name exactly — neither is auto-created, unlike Assets
  import's Vendor/Department auto-create behavior, since silently creating new departments/roles from a
  bulk people-upload is a bigger governance risk than doing so for assets.
- **User details page** (`/users/[id]`, reachable by clicking a name on the Users list) — everything about
  one person in one place, for quick validation:
  - **Profile** (Employee ID, name, email, phone, department, role, designation, status) and **Security &
    Login** — last login, whether the account is locked out from failed attempts, and whether they still
    owe a password change (the last two highlighted when they apply, so "why can't this person log in?"
    is answerable at a glance).
  - **Currently Held** — assets and email accounts assigned to them right now, plus any active temporary
    allocations, each linking through to its own page.
  - **Permissions & Scope** — the data-visibility scopes their role grants across every module, plus the
    full granted permission list, so RBAC can be validated without cross-referencing the Roles page.
  - **Assignment History** — the full assign/return/transfer trail for both assets and email accounts.
  - **Recent Activity** — their 20 most recent audit-log entries.
- **Admin password reset, and forced password changes.** Users → row actions gained "Reset Password" —
  an admin can set a new password for any user without knowing their current one (gated by the same
  `users.edit` permission as Edit). Any account whose password an admin chooses — via Create, Import, or
  Reset Password — is now required to change it on next login: the whole app redirects to a new
  **Change Password** page until they do. A voluntary "Change Password" link is also in the top bar for
  anyone who wants to change their password without being forced to. The seeded Super Admin account gets
  this treatment on fresh installs too. Existing accounts (created before this change) are unaffected —
  nothing is retroactively forced.
- Assets: **View and restore deleted assets.** A "Show Deleted" checkbox on the Assets list flips it to
  show only deleted assets (with a "Restore" action instead of Edit/Delete); restoring clears the delete
  and the asset reappears in the normal list. Guards against restoring into a Serial Number/MAC/IMEI
  collision — those fields can legitimately be reused by a new asset once the original is deleted, so
  restoring is blocked (same "already exists" error as creating/editing) if that would create two active
  assets sharing one of those identifiers. Asset Tags are never reused even once deleted, so no such
  collision is possible for Asset Tag itself. Gated by a new **"View deleted assets"** permission
  (`assets.view_deleted`), assignable per role on the Roles page — existing roles that already had the
  Delete-assets permission keep the capability on upgrade.
- Assets: **Operating System** field (e.g. "Windows 11 Business"), same visibility/form treatment as
  Hostname/MAC Address.
- Assets: **Environment fields** — Local Domain, Workgroup, and an Intune Enrolled Yes/No toggle — shown
  on the create/edit form (grouped after Operating System) and the asset detail page, for every category
  except SIM (same visibility rule as Hostname/MAC Address/OS). Included in the CSV/XLSX export/import.
- Assets: **IMEI field for Mobile-category assets** — an additional field alongside Serial Number (a
  phone has both), shown only when the selected/asset's category is "Mobile". Validated as a 15-digit
  number and must be unique across assets, matching the existing Serial Number/MAC Address behavior.
  "Mobile" is now a system-protected category (same as "SIM"), since the asset form depends on that exact
  category name to know when to show the field.
- **New asset tag format**: `<CompanyCode>/<CategoryCode>/<YY>/<###>` (e.g. `EI/PC/26/001`), replacing
  the old flat `PREFIX-0001` scheme. Category codes are admin-editable per category on the Asset
  Categories page (new "Tag Code" field). Sequence numbers reset per category per year. Existing
  assets keep their old tags unchanged — the new format only applies to assets created from now on.
  Settings → Asset Tag Prefix is now used as the company-code segment (e.g. "EI").
- **Assets: Import and Export.** Export (CSV/XLSX) already existed; Import is new — upload an .xlsx
  file to bulk-create assets, using the exact same column layout Export produces, so exporting once
  (even with zero rows) gives you a ready-made template. Category must match an existing category;
  unknown Vendor/Department names are auto-created; an explicit Asset Tag column is preserved as-is
  (for bringing in legacy tag numbers), left blank it's auto-generated as usual. Existing Asset Tags/
  Serial Numbers/MAC Addresses are rejected, never silently overwritten — import is create-only.
  Per-row results (created / failed with a reason) are shown after upload so partial success is clear.
- **Per-module data-visibility scope.** Roles previously had one global All/Department/Owned scope
  setting that applied uniformly across Assets, Maintenance, and Email Accounts. Each of those 3
  modules now gets its own independent scope — a role can be, for example, "All" for Assets but
  "Owned" for Maintenance and "Department" for Email Accounts, solving the case where one person
  needs broad visibility for part of their job and narrower visibility for another part of it.
  Scope is set via checkboxes (All / Own department only / Assigned to me only) inside each of the
  three modules' own permission cards on the Roles page — no separate dropdown, and no new database
  table: each scope level is modeled as an ordinary permission (e.g. `assets.scope_department`),
  reusing the existing permissions system end to end. Existing roles were migrated automatically —
  every role's old single scope value was copied into all 3 new per-module scopes, so nothing
  changed behavior on upgrade until deliberately reconfigured per module.
- **Data-visibility switcher** on the Assets, Maintenance, and Email Accounts list pages — a small
  All / Department / Mine tab control that lets a user narrow their own view on the fly, without an
  admin needing to change their role. Only options at or below the user's actual role-granted ceiling
  are ever offered (e.g. a Department-scoped user sees only "Department" and "Mine," never "All"), and
  the choice is enforced server-side regardless of what a tampered URL might request — the switcher is
  a convenience for narrowing an already-permitted view, not a way to see more than the role allows.
  Hidden entirely when there's nothing to switch between (e.g. a role scoped to "Mine" only).
- **Maintenance: a second, independent scope for who a role can raise tickets about.** Until now,
  "which assets/email accounts can I raise a ticket for" was governed by a person's own Assets/Email
  visibility scope — so someone whose own scope was "Mine" couldn't raise a ticket on behalf of a
  colleague, even within their own department. This is the exact case where someone's device is broken
  badly enough that they can't log in to report it themselves. Maintenance now has its own dedicated
  "Whose assets/email accounts they can raise tickets for" setting (All / Own department only /
  Assigned to me only), completely independent of both the existing "which tickets they can see"
  scope and the person's own Assets/Email scope — e.g. a department coordinator can have Assets=Mine
  (doesn't browse everyone's hardware) but Maintenance-create=Department (can still raise a ticket for
  any colleague's device). Set the same way as every other scope — checkboxes on the Roles page, now
  two rows under the Maintenance permission card. Existing roles were migrated to mirror their current
  ticket-viewing scope as a safe starting point for the new setting; adjust it per role (e.g. Dept
  Head → Department) to actually enable the flexibility.

### Changed
- Asset Categories admin page gained a "Tag Code" column/field, used to build the new asset tag
  format.
- Roles list/edit pages: the single "Scope" column/field is now four — "Assets Scope",
  "Maintenance Scope", "Raise Tickets For", "Email Scope" — reflecting the per-module scope changes
  above. Resolving/editing a ticket stays a single flat permission (`maintenance.edit`), not a scoped
  one — anyone granted it can resolve any ticket company-wide.
- **Sidebar navigation now shows grouped section headers** (Overview / Asset Management / Other
  Resources / Organization / Administration) instead of one flat list of links. A section only
  appears for a given role if it has at least one item that role can actually see — e.g. an Employee
  with no admin permissions never sees an empty "Administration" header.
- **The asset type pages now collapse under a single "Assets" dropdown** in the sidebar, instead of
  listing all eight (Computers, Monitors, Printers, Phones, SIM Cards, Network Devices, Peripherals,
  All Assets) as separate top-level entries. It expands automatically when you're already on one of
  those pages, so links into a specific type still land with the section open.

### Fixed
- **Assets Import would have failed for computers** after the per-type split — it still wrote fields
  under their old names, which no longer existed. Import and Export now derive their columns from one
  shared definition, so a renamed or added field updates both automatically instead of silently
  breaking one of them.
- **Behind a reverse proxy, every redirect sent the browser to `localhost:3000`** instead of the address
  it was actually using — so opening the app by IP immediately bounced to a dead `http://localhost:3000/login`.
  Root cause: the middleware built redirects from `request.url`, whose origin is Next's *own internal*
  address behind a proxy, regardless of the `Host`/`X-Forwarded-Host` headers nginx correctly forwards.
  The middleware now resolves the origin from those headers itself, so redirects follow whatever address
  the user is on (IP, hostname, or a future HTTPS domain — `X-Forwarded-Proto` is honored too).
- **The login page ignored logo changes** until the next rebuild — it was statically prerendered, so it
  baked in whatever logo was set at build time while the rest of the app showed the current one. It now
  renders per-request. This also removes the old requirement to seed the database *before* building.
- **Assets Import crashed with a raw database error when an Asset Tag matched a previously deleted
  asset's tag** (e.g. "Unique constraint failed on the constraint: `assets_asset_tag_key`"), instead of
  the intended friendly "Asset Tag already exists" row error. Asset Tags are deliberately never reused,
  even after deletion — unlike Serial Number/MAC/IMEI, which can be reused once an asset is deleted —
  but the import's duplicate-tag check was only looking at non-deleted assets, so a tag belonging to a
  soft-deleted asset slipped past the check and failed at the database level instead.
- **Assets export/import: SIM cards' "Mobile Number" and "Network Provider" values were unfindable**,
  appearing only under the generic "Serial Number" and "Vendor" columns — the data was never missing,
  just not labeled the way the create/edit form and detail page already label it for SIM assets. Both
  columns are now headed "Serial Number / Mobile Number" and "Vendor / Network Provider" in both Export
  and Import (a spreadsheet column has one header for every row regardless of category, so it now names
  both meanings rather than picking one).
- **Login and logout redirects were silently breaking**, leaving the user stuck on the login/dashboard
  page until a manual browser refresh. Root cause: the version-badge feature imported `package.json`'s
  `version` as a named export, which is invalid for a JSON module and triggered repeated dev-mode
  rebuild warnings that aborted the in-flight client-side navigation. Fixed by importing the whole
  JSON object as a default import instead. Confirmed with 3 full login/logout round-trips, no manual
  refresh needed.
- **Login appeared to fail on a fresh HTTP-only deployment** (API returned a valid success response, but
  no session ever persisted). Root cause: the session cookie's `secure` flag was tied to
  `NODE_ENV === "production"`, which PM2 always sets regardless of whether HTTPS is actually in front of
  the app yet — a `Secure` cookie is silently discarded by the browser over plain HTTP. Replaced with an
  explicit `COOKIE_SECURE` env var (see `.env.example`), defaulting to `false`; flip it to `true` only
  once nginx+TLS is actually serving the app. See `DEPLOYMENT.md` Section 3.
- Fixed a real ordering bug in `DEPLOYMENT.md` itself: seeding was documented *after* `npm run build`, but
  the login page statically prerenders at build time and needs the `Settings` row to exist — on a fresh
  unseeded database, the build failed prerendering `/login`. Seed now comes before build in the guide, and
  the seed command was corrected to load `.env` properly (`node --env-file=.env ...`, not bare `npx tsx`).
  Added a Firewall (ufw) section covering opening/closing port 3000 for pre-nginx testing.

### Fixed
- **Opening a page you don't have permission for now cleanly redirects to the dashboard** instead
  of showing a broken "page not found". (For example, an employee typing `/settings` in the address
  bar.) The check moved into middleware, where the redirect actually takes effect; no page you're
  allowed to see is affected.
- **Connected devices now follow the computer when it's assigned.** Assigning a computer to a
  person now also assigns the monitors, docks and peripherals plugged into it — they're on the
  same desk, so they move together. This works both ways: returning the computer returns them,
  transferring it moves them to the new holder, and plugging a device into an already-assigned
  computer assigns it to that person. A connected device that can't cleanly follow (it's out for
  repair, or already held by someone else) is left as-is and never blocks the computer's own
  assignment.
- **Opening a connected device from a computer's page no longer 404s.** An employee viewing their
  computer could see its connected devices but got a "page not found" when clicking one, because
  the device wasn't separately assigned to them. You can now open any device connected to a
  computer you can see — it's part of your setup. (Viewing only; assigning and editing still need
  the usual permissions.)
- **Department heads were silently seeing only their own assets instead of their department's.**
  The DEPT_HEAD role had ended up holding two conflicting data-visibility settings at once
  ("own department" and "assigned to me"), and the system deliberately applies the most
  restrictive when they conflict — so the department view never took effect. Setup now clears
  the stale setting, and the roles it manages end up with exactly one visibility level each.
  Custom roles you've created are left untouched.
- **Signing in, signing out and the first-login password change now update the page immediately**
  — no more waiting on a screen that hasn't changed and refreshing by hand. All three swap the
  session cookie that every part of the page was built from, and the app was doing an in-app
  navigation that could leave the old screen on display. They now do a proper page load.
  - Pressing Back after signing out no longer shows a stale signed-in-looking page.

### Security
- **Sign-in and change-password forms are now `method="post"`.** They're normally submitted by
  JavaScript, but if the page hadn't finished loading, the browser fell back to a plain GET
  submit — which put the **password in the address bar**, browser history and server logs. A POST
  fallback keeps it in the request body.

### Added
- **Inventory agent (GLPI-style).** A PowerShell script (`scripts/inventory-agent.ps1`) run on a Windows
  machine collects its hardware and OS and sends it to the server.
  - A machine already in inventory is **matched by UUID (then serial) and updated automatically** — OS,
    network details and hardware components refreshed, no duplicates.
  - A machine that isn't in inventory yet shows up under a new **Discovered** page, where an admin onboards
    it by giving it an asset tag (nothing is auto-created with a machine-picked tag).
  - The ingest endpoint is **open by default** on a trusted network; set `INVENTORY_TOKEN` on the server to
    require a shared token. See DEPLOYMENT.md §12.
  - The agent detects **Intune / Entra (Azure AD) enrollment** — a cloud-joined machine is recorded as
    Intune Enrolled with its tenant as the domain, instead of being mislabelled as a "WORKGROUP" machine.
  - The agent detects **connected external monitors**. A monitor whose serial matches one already in
    inventory is **auto-linked** to the computer it's plugged into (and follows the machine if it moves
    desks). A monitor that *isn't* in inventory yet now appears under **Discovered** with its make, model,
    size and serial already filled in — you just give it an asset tag and it's created **and connected to
    the machine it was found on**. Built-in laptop panels and blank-serial displays are ignored, and
    nothing is ever created with a machine-picked tag.
  - Keyboards, mice and other USB peripherals are *not* collected: Windows doesn't give them serials, so
    they can't be matched or de-duplicated as assets.
  - The **Discovered** page now covers both computers and monitors, showing which machine each monitor
    was found on.
- **Employees and department heads now get a single asset page instead of the type menu.** Someone
  who can only see their own assets sees one sidebar entry, **My Assets**; a department head sees
  **Department Assets**. Both open one list containing everything they're allowed to see, of every
  type, reached through **tabs** across the top — one tab per type they actually have, each with
  a count (`Computers (1) | Monitors (2) | Phones (1)`). **Each tab shows that type's own
  columns** — a computer's Hostname and OS, a monitor's Size and Resolution, a phone's IMEI and
  number — rather than one generic set for everything. No empty tabs, and the chosen tab lives in
  the URL so a refresh or a shared link keeps it.
  - The old behaviour gave them all seven type pages, each holding a row or two — an employee with
    a laptop and a monitor had to visit two pages to see two items.
  - The per-type pages remain for roles that manage the whole estate. Anyone narrower who opens one
    (an old bookmark, a typed URL) is redirected to their own list.
  - **This follows the role's scope setting, not the role's name** — so a custom role you create
    with "Assigned to me only" gets the same treatment automatically.

### Changed
- **Dashboard quick actions now go to Computers** — "Add Computer" and "Assign Computer", since
  there's no generic add page or cross-type list to send you to any more. (The "Add Asset" button
  had been left pointing at the deleted `/assets/new` page.)
- **You now type the asset tag yourself — nothing is generated.** Every Add form has an Asset Tag
  box at the top; put in whatever is on the physical label. The tag is **required** (a blank one is
  rejected rather than filled in for you) and must be unique.
  - **Tags can be corrected later.** The Asset Tag field is editable on the Edit page, so a typo can
    be fixed without deleting and re-adding the asset. The detail page, printed label and QR code
    all follow the new value.
  - A tag belonging to a **deleted** asset is still blocked, and now says so — restore that asset or
    pick a different tag. (Serial numbers, MAC addresses and IMEIs still free up on deletion; asset
    tags never do.)
  - **Import requires an Asset Tag on every row.** A row without one is reported as an error instead
    of silently receiving an invented tag.
  - **Existing tags are untouched.** Assets keep the tags already on them.
  - The **Asset Tag Prefix** setting has been removed from Settings — it only existed to build
    generated tags, so it no longer had any effect.
- **Every asset type now has its own Add form — there is no shared "New Asset" page any more.**
  Adding a printer starts on the Printers page and shows printer fields; adding a SIM card shows
  SIM fields. Nothing asks you to pick a category first, and no form shows fields that don't apply
  to what you're adding. Computers and Monitors keep their detailed sectioned layouts; the other
  six types get a form built from their own field list.
- **"Other Assets" is now a proper type with its own page**, for things that fit none of the
  specific types — a projector, a UPS, furniture. Previously these had no home of their own.
- **Asset tags now use the type's code**: EI/COM/26/001 for computers, EI/MON/26/001 for monitors,
  EI/PRN/26/001 for printers, and so on. **Existing tags are never rewritten** — an asset tag is a
  permanent physical label, so assets keep the tags already stuck on them and only new assets use
  the new codes.
- Lists, exports, reports and the dashboard chart now group by **Type** where they used to group by
  Category. Exports write a readable "Asset Type" column ("SIM Card", not SIM_CARD), and import
  accepts either that or an old file's "Category" column, so previously exported files still load.

### Removed
- **The "All Assets" list is gone.** Each type has its own page with its own search, so the
  cross-type list was an extra menu entry for a view you rarely wanted. **Trade-off worth knowing:
  there's no longer a single place to search every type at once** — if you have a tag and don't
  know what kind of thing it is, you'll need to check the relevant type's page.
- **"Other Assets" is gone.** Peripherals already offers "Other" in its type list (and covers UPS),
  so the catch-all was mostly redundant. Anything genuinely odd — a projector, say — is best
  recorded as a Peripheral now.
- **Asset Categories are gone** — the module, its page, its permissions and its database table.
  Maintaining a second, admin-managed classification on top of the built-in asset types was the
  source of the confusion; the type now does that job on its own.
  - **Desktop / Laptop / Server is still recorded**, as a built-in Type dropdown on the computer
    form rather than a category you have to create first. Existing computers kept their value —
    both laptops carried across automatically. Printers, Network Devices and Peripherals gained
    the same kind of built-in list (Laser/Inkjet…, Switch/Router/Firewall…, Keyboard/Mouse/Dock…).
  - **An asset's type is now fixed once created.** Previously changing an asset's category could
    silently move it to a different type; each type has its own form now, so editing can't change
    what an asset is.
- **The Email Accounts and Software Licenses modules have been removed entirely** — their pages,
  APIs, permissions and database tables. No operational data was lost: there was one test email
  account, one test licence and no licence assignments at all.
  - **The "Software" tab on a computer is gone with them.** That tab listed the licences assigned
    to a machine, so Software Licenses was its only data source. It had no entries. Computers keep
    their Components, Connected Devices, Images, Documents and Assignment History tabs.
  - Roles lose the Email Accounts and Licenses permissions and the email scope setting; the Roles
    page no longer shows an "Email Scope" column, leaving Assets as the only scope setting. Reports
    loses the Software Licenses report — Asset Inventory, Department Assets and Warranty Expiry all
    remain. A person's page no longer lists their email accounts or email assignment history.
  - **Audit history was kept**, same as with the Maintenance removal.
- **The Maintenance module has been removed entirely** — tickets, the process/stage log, spares
  used on a repair, procurement requests, temporary allocations, and every maintenance page,
  permission and database table. Two modules that existed only to serve it went with it:
  **Spare Parts** (parts consumed on a ticket, and procurement to restock them) and **Issue
  Categories** (the ticket category picker). No operational data was lost — there were no tickets,
  spare parts or allocations recorded; the only rows were the ten seeded default issue categories,
  which are meaningless without tickets to categorise.
  - **Asset replacement tracking is gone with it.** Retiring an asset and linking it to the one
    that replaced it was only ever done by resolving a ticket, so the "Replaced By" / "Replaces"
    fields no longer appear on an asset. Assets are still retired and new ones created — there is
    just no formal link between the two.
  - **"Under Repair" is now a status you set yourself.** It used to be applied automatically while
    a ticket was open and cleared when it was resolved. Any asset sitting in that state has been
    returned to Assigned or Available, since nothing would ever have moved it back.
  - **Audit history was deliberately kept.** Past maintenance activity remains in the Audit Logs.
  - Roles lose the Maintenance permissions and both maintenance scope settings; the Roles page no
    longer shows the "Maintenance Scope" and "Raise Tickets For" columns. Reports loses its
    Maintenance report. No other module's permissions changed.
- **The asset type split is complete** — the old shared columns that every asset carried regardless of
  type (Operating System, Local Domain, Workgroup, Intune Enrolled, IMEI) are gone from the assets
  table. Those values now live only on the type that actually has them: OS/domain/workgroup/Intune on
  Computers, IMEI on Phones. A monitor no longer has an empty IMEI field behind the scenes. Nothing
  changes on screen — the fields have been read from their own type since the previous step; this
  removes the now-unused duplicates. Serial Number, Hostname, MAC Address and IP Address deliberately
  stay shared, since printers, switches and computers all legitimately have them.
- Asset Label (the QR/barcode card on the asset detail page) no longer renders a Code128 barcode —
  QR code only now. The `jsbarcode` dependency was dropped since nothing else used it.

---

## [1.0.0] — 2026-07-14

First production release.

### Added

**Assets**
- Full asset lifecycle: create, edit, assign, return, transfer, retire.
- Category-aware forms — the SIM category relabels/hides hardware-only fields (Brand/Model/Purchase/
  Invoice/Warranty/Cost) since SIM connections are HR-maintained, not IT-tracked hardware.
- Barcode + QR asset label, printable, shown alongside the asset's detail fields.
- Tabbed detail page: Images, Documents, Assignment History, Maintenance History.
- Formal Asset Replacement linking — when an asset is replaced, both assets cross-link with full
  assignment-history traceability back to the maintenance ticket that caused it.
- Role-scoped visibility (`ALL` / `DEPARTMENT` / `SELF`) — an Employee sees only their own assigned
  assets, a Dept Head sees their department's, IT/Admin roles see everything.

**Maintenance & Tickets**
- Unified ticketing for both physical assets and email accounts — one ticket table, one list, one
  history view, regardless of what the ticket targets.
- Full raise → triage → resolve lifecycle with a mandatory resolution declaration before closing.
- Four dedicated resolution paths, each with its own fields:
  - **In-House Repair** — shared Spare Parts inventory ("Use From Stock" decrements live stock),
    Procurement requests (raise → receive → stock increments), and Temporary Asset assignment
    (issue a stand-in device while the original is being worked on).
  - **Warranty Claim** — at-a-glance warranty status on the ticket, dedicated Claim / RMA Reference
    field.
  - **Vendor Service (Paid)** — service mode (on-site vs. pickup/drop-off), dedicated Job / Service
    Reference field, total cost tracking.
  - **Asset Replacement** — retires the old asset and links a replacement, fully traceable from
    either asset's own page.
- **Make Permanent** — converts an active Temporary Allocation directly into a permanent Replacement
  without an unnecessary return/reassign round-trip.
- Append-only Process Updates log per ticket (timestamped notes, never edited/deleted — corrections
  happen via a new entry).
- Photo attachments on tickets.
- Admin-manageable Issue Categories, independently flaggable as applying to assets, email accounts,
  or both.

**Spare Parts**
- Central shared inventory (`/spare-parts`) that Maintenance tickets draw from and restock through.

**Email Accounts**
- Independent module (not folded into Assets) — assign/return/transfer, and the same unified ticket
  system as physical assets.

**Software Licenses**
- Seat counts, expiry tracking, and per-asset assignment.

**Departments, Vendors, Users**
- Standard admin CRUD for all three, referenced throughout Assets/Maintenance/Email Accounts.

**Roles & Permissions**
- Custom role builder — admins can create roles and assign permissions per module/action, not just
  use the 5 built-in seeded roles.
- Three visibility scopes (`ALL` / `DEPARTMENT` / `SELF`) drive row-level data access everywhere.

**Reports**
- CSV/XLSX export for assets and maintenance history.

**Audit Logs**
- Read-only trail of every create/update/delete/assign/return action, filterable by user, module,
  action, and date.

**Settings**
- Company name and logo, shown across the sidebar and login page.

**Platform**
- JWT/jose session auth, bcrypt password hashing.
- Global top-of-page navigation progress indicator (client-side transitions, exports, form submits).
- **Login lockout**: 5 failed attempts locks an account for 15 minutes, with a clear on-screen message.
- Upload hardening: per-category MIME allowlist, per-category file size caps, sanitized + UUID-prefixed
  filenames for every upload (asset images/documents, maintenance attachments, company logo).
- Full onboarding user guide, published as a standalone reference page with real screenshots and
  worked end-to-end examples for every ticket resolution path.
- Deployment tooling: `ecosystem.config.js` (PM2), `scripts/backup-db.sh` (nightly DB backup with
  rotation), `DEPLOYMENT.md` (Ubuntu + PM2 runbook).

### Changed

- Asset Replacement moved from a standalone, disconnected action into the Maintenance ticket
  resolution flow itself, so every replacement is tied to the ticket that caused it with one
  unified audit trail (superseded the original standalone "Replace with New" button).
- Email issue reporting was unified into the main Maintenance ticket system instead of a separate
  `EmailRequest` table, so every issue on the platform — asset or email — shares one audit trail.
- Issue Category converted from a hardcoded enum to a real admin-manageable table, so categories can
  be added/edited without a code change and independently scoped to assets, email accounts, or both.
- Asset detail page layout: barcode/QR label moved beside the fields grid instead of stacking below
  it; Images/Documents/Assignment History/Maintenance History became tabs instead of stacked sections.
- Sidebar navigation regrouped by purpose (Overview → Asset management → Other resources →
  Organization → Administration).

### Fixed

- Asset tag generation no longer collides after a deletion (was deriving the next number from a row
  count, which breaks once any asset is ever deleted; now derives from the highest existing tag
  number).
- Maintenance ticket "Latest Update" no longer shows a stale entry when two Process Update entries
  share the same date (added a secondary sort key).
- The disabled "Replacement Asset" field on a resolved ticket no longer falls back to placeholder
  text once the chosen asset leaves the "available" pool.
- Custom role deletion no longer 500s when a soft-deleted user still references that role.

### Security

- Added brute-force login lockout (see Added, Platform).
- Confirmed upload validation (MIME allowlist, size caps, filename sanitization) meets baseline
  requirements for internal-network use.
