-- Generalise the discovered-inventory table so it holds external MONITORS as well as computers.
-- Unknown monitors now wait here for an admin to onboard them with a tag (and get auto-connected
-- to the machine they were found on), instead of being silently ignored.
--
-- Written by hand rather than taking Prisma's auto-diff: that diff was DROP TABLE + CREATE TABLE,
-- which would throw away existing discovered rows. Renaming preserves them, and every existing
-- row is a computer, which is exactly what the new column defaults to.

ALTER TABLE `discovered_computers` RENAME TO `discovered_devices`;

-- Index names survive a table rename, so bring them in line or Prisma reports permanent drift.
-- NOTE: MariaDB has no `ALTER TABLE ... RENAME INDEX` (that's MySQL 8 only) — drop and recreate.
ALTER TABLE `discovered_devices` DROP INDEX `discovered_computers_status_idx`;
CREATE INDEX `discovered_devices_status_idx` ON `discovered_devices`(`status`);

ALTER TABLE `discovered_devices`
    ADD COLUMN `device_type` ENUM('COMPUTER', 'MONITOR') NOT NULL DEFAULT 'COMPUTER',
    ADD COLUMN `seen_on_asset_id` INTEGER NULL;

CREATE INDEX `discovered_devices_device_type_status_idx` ON `discovered_devices`(`device_type`, `status`);
