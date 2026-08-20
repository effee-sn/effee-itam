-- GLPI-style monitor detail: structured video inputs, built-in extras and stand/mounting,
-- replacing the single free-text `connectors` column.
--
-- Dropping `connectors` in the same migration that adds its replacements breaks the standing
-- "add + copy, deploy, verify, drop later" rule, so it needs the same justification Phase 7
-- used: the table was PROVEN empty first. `SELECT COUNT(*) FROM monitors` returned 0, and
-- there are zero assets of type MONITOR at all (the Monitor category exists but has never
-- been used), so there is no value to migrate and nothing to lose. A backfill step here would
-- be parsing a free-text field that has never held a single row.
--
-- If this ever has to run against a database where monitors DO exist, do not apply it as-is:
-- add the new columns first, backfill the flags by matching `connectors` (LIKE '%HDMI%' etc.),
-- verify, and drop `connectors` in a later migration.

ALTER TABLE `monitors`
    ADD COLUMN `refresh_rate_hz` INTEGER NULL,
    ADD COLUMN `has_vga` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_dvi` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_hdmi` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_display_port` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_usb_c` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_usb_hub` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_speakers` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_microphone` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_webcam` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_pivot` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `height_adjustable` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `vesa_mount` VARCHAR(191) NULL;

ALTER TABLE `monitors` DROP COLUMN `connectors`;
