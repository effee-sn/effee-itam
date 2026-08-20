-- DropIndex
DROP INDEX `assets_serial_number_key` ON `assets`;

-- CreateIndex
CREATE INDEX `assets_serial_number_idx` ON `assets`(`serial_number`);
