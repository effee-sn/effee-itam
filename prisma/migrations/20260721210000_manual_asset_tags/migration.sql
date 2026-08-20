-- Asset tags are now entered by hand ("i prefer adding the asset tag manually not need the
-- predefined code or something i will manage manually"), so nothing generates them any more.
--
-- `settings.asset_prefix` existed only to build the company segment of a generated tag
-- (EI/COM/26/001). With generation gone it has no reader, and leaving it on the Settings page
-- labelled "Used to generate new asset tags" would be actively misleading.
--
-- No data migration is needed and no asset changes: `assets.asset_tag` already holds a plain
-- string with a unique index, which is exactly what manual entry needs. Existing tags are
-- untouched.

ALTER TABLE `settings` DROP COLUMN `asset_prefix`;
