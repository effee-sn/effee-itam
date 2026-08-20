-- Removes the Email Accounts and Software Licenses modules entirely, on the user's explicit
-- instruction ("remove the email accounts modules and software licenses modules").
--
-- IRREVERSIBLE. Verified before writing this: email_accounts = 1, email_account_assignments = 1,
-- software_licenses = 1, license_assignments = 0 — test rows only, no operational data.
--
-- Knock-on effect worth recording: license_assignments was the sole data source for the
-- "Software" tab on a computer's detail page (GLPI-style installed-software list). That tab
-- is removed with this migration because nothing else can populate it. It had 0 rows.
--
-- Deliberately NOT touched:
--   * audit_logs — history for both modules stays, same reasoning as the Maintenance removal.
--   * departments / users / vendors — all three referenced these tables but are themselves
--     unaffected; only the FKs pointing INTO the dropped tables go.
--   * AssignmentAction enum — shared with asset_assignments, which still uses it.

-- FKs first: MySQL refuses to drop a table another table still references.
ALTER TABLE `email_account_assignments` DROP FOREIGN KEY `email_account_assignments_email_account_id_fkey`;
ALTER TABLE `email_account_assignments` DROP FOREIGN KEY `email_account_assignments_from_user_id_fkey`;
ALTER TABLE `email_account_assignments` DROP FOREIGN KEY `email_account_assignments_performed_by_user_id_fkey`;
ALTER TABLE `email_account_assignments` DROP FOREIGN KEY `email_account_assignments_to_user_id_fkey`;
ALTER TABLE `email_accounts` DROP FOREIGN KEY `email_accounts_assigned_user_id_fkey`;
ALTER TABLE `email_accounts` DROP FOREIGN KEY `email_accounts_department_id_fkey`;
ALTER TABLE `license_assignments` DROP FOREIGN KEY `license_assignments_asset_id_fkey`;
ALTER TABLE `license_assignments` DROP FOREIGN KEY `license_assignments_license_id_fkey`;
ALTER TABLE `software_licenses` DROP FOREIGN KEY `software_licenses_vendor_id_fkey`;

DROP TABLE `email_account_assignments`;
DROP TABLE `email_accounts`;
DROP TABLE `license_assignments`;
DROP TABLE `software_licenses`;

-- Permission rows for the removed modules. seed.ts only ever upserts, never deletes, so
-- codes removed from PERMISSIONS have to be deleted here or they linger on the Roles page
-- as grantable permissions that do nothing. role_permissions rows cascade.
--
-- This also removes the last email_accounts.scope_* rows, leaving `assets` as the only
-- scope dimension in SCOPE_DIMENSIONS.
DELETE FROM `permissions` WHERE `module` IN ('email_accounts', 'licenses');
