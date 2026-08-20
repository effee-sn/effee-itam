-- Final step of the GLPI-style asset type split: remove the base columns that were kept
-- populated during the dual-write window. Their values now live on the per-type detail
-- tables (computers.os_name / local_domain / workgroup / intune_enrolled, phones.imei), and
-- nothing has read them since reads were switched over.
--
-- THIS IS THE ONLY IRREVERSIBLE STEP IN THE SPLIT. Before running it anywhere, re-run the
-- preflight check that proves every remaining value is already mirrored into its detail
-- table — comparing each column with `<=>` (null-safe) against its replacement, and looking
-- for values stranded on a type that has no column for them (an IMEI on a monitor, say).
-- It was run and returned zero on every check before this migration was applied here.
--
-- Note assets.hostname, mac_address and ip_address deliberately STAY: they're shared across
-- types (printers and switches have hostnames and MACs too), which is why moving them was
-- rejected during design.

ALTER TABLE `assets` DROP COLUMN `operating_system`;
ALTER TABLE `assets` DROP COLUMN `local_domain`;
ALTER TABLE `assets` DROP COLUMN `workgroup`;
ALTER TABLE `assets` DROP COLUMN `intune_enrolled`;

-- The index has to go before the column it covers.
DROP INDEX `assets_imei_idx` ON `assets`;
ALTER TABLE `assets` DROP COLUMN `imei`;
