-- Vendor part number / MTM off the sticker on the back of a monitor (Lenovo's term is MTM).
-- Manual-entry only: EDID carries no equivalent field, so the inventory agent cannot supply it.
-- Purely additive and nullable, so existing rows are untouched.
ALTER TABLE `monitors` ADD COLUMN `part_number` VARCHAR(191) NULL;
