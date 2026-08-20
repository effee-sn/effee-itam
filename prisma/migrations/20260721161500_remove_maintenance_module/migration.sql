-- Removes the Maintenance module entirely, on the user's explicit instruction, along with
-- the two modules that existed only to serve it: Spare Parts (parts consumed on a ticket +
-- procurement to restock them) and Issue Categories (the ticket category picker).
--
-- IRREVERSIBLE. Verified before writing this: maintenance_records = 0, maintenance_parts = 0,
-- maintenance_attachments = 0, maintenance_stage_log = 0, procurement_requests = 0,
-- temporary_allocations = 0, spare_parts = 0. Only issue_categories had rows (10), all of
-- them the seeded defaults, which are meaningless without tickets to categorise. No
-- operational data is lost.
--
-- Deliberately NOT touched:
--   * audit_logs — history for these modules stays. It's a generic append-only log and
--     deleting real history to tidy up module names would be worse than leaving it.
--   * assets.status UNDER_REPAIR — kept as a manually-settable status. Previously it was
--     driven automatically by open tickets; now it's just a status someone can pick.
--   * asset_assignments.related_asset_id and the REPLACEMENT value of its action enum —
--     these predate Maintenance as blueprint scaffolding and return to being unused, which
--     is what dropping replacement tracking means. Dropping them would be a second
--     irreversible migration for no gain.

-- FKs first: MySQL refuses to drop a table another table still references.
ALTER TABLE `maintenance_attachments` DROP FOREIGN KEY `maintenance_attachments_maintenance_record_id_fkey`;
ALTER TABLE `maintenance_parts` DROP FOREIGN KEY `maintenance_parts_maintenance_record_id_fkey`;
ALTER TABLE `maintenance_parts` DROP FOREIGN KEY `maintenance_parts_spare_part_id_fkey`;
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_asset_id_fkey`;
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_category_id_fkey`;
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_email_account_id_fkey`;
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_replacement_asset_id_fkey`;
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_vendor_id_fkey`;
ALTER TABLE `maintenance_stage_log` DROP FOREIGN KEY `maintenance_stage_log_created_by_user_id_fkey`;
ALTER TABLE `maintenance_stage_log` DROP FOREIGN KEY `maintenance_stage_log_maintenance_record_id_fkey`;
ALTER TABLE `procurement_requests` DROP FOREIGN KEY `procurement_requests_maintenance_record_id_fkey`;
ALTER TABLE `procurement_requests` DROP FOREIGN KEY `procurement_requests_received_by_user_id_fkey`;
ALTER TABLE `procurement_requests` DROP FOREIGN KEY `procurement_requests_requested_by_user_id_fkey`;
ALTER TABLE `procurement_requests` DROP FOREIGN KEY `procurement_requests_spare_part_id_fkey`;
ALTER TABLE `temporary_allocations` DROP FOREIGN KEY `temporary_allocations_asset_id_fkey`;
ALTER TABLE `temporary_allocations` DROP FOREIGN KEY `temporary_allocations_assigned_by_user_id_fkey`;
ALTER TABLE `temporary_allocations` DROP FOREIGN KEY `temporary_allocations_maintenance_record_id_fkey`;
ALTER TABLE `temporary_allocations` DROP FOREIGN KEY `temporary_allocations_resolved_by_user_id_fkey`;
ALTER TABLE `temporary_allocations` DROP FOREIGN KEY `temporary_allocations_user_id_fkey`;

DROP TABLE `temporary_allocations`;
DROP TABLE `procurement_requests`;
DROP TABLE `maintenance_parts`;
DROP TABLE `maintenance_stage_log`;
DROP TABLE `maintenance_attachments`;
DROP TABLE `maintenance_records`;
DROP TABLE `spare_parts`;
DROP TABLE `issue_categories`;

-- Any asset left UNDER_REPAIR was put there by an open ticket. With no tickets left,
-- nothing would ever move it back, so it would be stuck out of circulation forever —
-- return it to the status its assignment implies.
UPDATE `assets` SET `status` = 'ASSIGNED'
  WHERE `status` = 'UNDER_REPAIR' AND `current_assigned_user_id` IS NOT NULL;
UPDATE `assets` SET `status` = 'AVAILABLE'
  WHERE `status` = 'UNDER_REPAIR' AND `current_assigned_user_id` IS NULL;

-- Permission rows for the removed modules. seed.ts only ever upserts, never deletes, so
-- codes removed from PERMISSIONS have to be deleted here or they linger on the Roles page
-- as grantable permissions that do nothing. role_permissions rows cascade.
DELETE FROM `permissions`
  WHERE `module` IN ('maintenance', 'spare_parts', 'issue_categories');
