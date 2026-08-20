-- Migration B of the GLPI-style asset type split: create the 7 per-type detail tables and
-- backfill one row per existing asset from its (still-present) base columns.
--
-- Deliberately NON-DESTRUCTIVE. The moved columns (operating_system, local_domain,
-- workgroup, intune_enrolled, imei) stay on `assets` and stay populated; the app dual-writes
-- to both places until reads have been switched over and verified. Dropping them is a
-- separate, much later migration — that's the only one-way door in this arc.

-- CreateTable
CREATE TABLE `computers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `operating_system` VARCHAR(191) NULL,
    `local_domain` VARCHAR(191) NULL,
    `workgroup` VARCHAR(191) NULL,
    `intune_enrolled` BOOLEAN NOT NULL DEFAULT false,
    `cpu` VARCHAR(191) NULL,
    `ram_gb` INTEGER NULL,
    `storage` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `computers_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `size_inches` DECIMAL(4, 1) NULL,
    `resolution` VARCHAR(191) NULL,
    `panel_type` VARCHAR(191) NULL,
    `connectors` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `monitors_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `printer_type` VARCHAR(191) NULL,
    `connection_type` VARCHAR(191) NULL,
    `page_count` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `printers_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `imei` VARCHAR(191) NULL,
    `os` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `phones_asset_id_key`(`asset_id`),
    INDEX `phones_imei_idx`(`imei`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sim_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `mobile_number` VARCHAR(191) NULL,
    `iccid` VARCHAR(191) NULL,
    `plan_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sim_cards_asset_id_key`(`asset_id`),
    INDEX `sim_cards_mobile_number_idx`(`mobile_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `network_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `device_type` VARCHAR(191) NULL,
    `port_count` INTEGER NULL,
    `firmware_version` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `network_devices_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peripherals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `peripheral_type` VARCHAR(191) NULL,
    `interface` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `peripherals_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `computers` ADD CONSTRAINT `computers_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitors` ADD CONSTRAINT `monitors_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printers` ADD CONSTRAINT `printers_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `phones` ADD CONSTRAINT `phones_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sim_cards` ADD CONSTRAINT `sim_cards_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `network_devices` ADD CONSTRAINT `network_devices_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `peripherals` ADD CONSTRAINT `peripherals_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill: exactly one detail row per asset, chosen by asset_type.
--
-- No `deleted_at IS NULL` filter anywhere below — soft-deleted assets need detail rows too,
-- because restoreAsset() can bring them back into the active list and they'd otherwise
-- return with an empty detail record.
-- ---------------------------------------------------------------------------

INSERT INTO `computers` (`asset_id`, `operating_system`, `local_domain`, `workgroup`, `intune_enrolled`, `updated_at`)
SELECT `id`, `operating_system`, `local_domain`, `workgroup`, `intune_enrolled`, NOW(3)
FROM `assets` WHERE `asset_type` = 'COMPUTER';

INSERT INTO `phones` (`asset_id`, `imei`, `os`, `updated_at`)
SELECT `id`, `imei`, `operating_system`, NOW(3)
FROM `assets` WHERE `asset_type` = 'PHONE';

-- SIM's mobile number has historically been crammed into serial_number (which is why the
-- export header reads "Serial Number / Mobile Number"). Copy it to its own column; the
-- source is deliberately left intact until the drop migration.
INSERT INTO `sim_cards` (`asset_id`, `mobile_number`, `updated_at`)
SELECT `id`, `serial_number`, NOW(3)
FROM `assets` WHERE `asset_type` = 'SIM_CARD';

INSERT INTO `monitors` (`asset_id`, `updated_at`)
SELECT `id`, NOW(3) FROM `assets` WHERE `asset_type` = 'MONITOR';

INSERT INTO `printers` (`asset_id`, `updated_at`)
SELECT `id`, NOW(3) FROM `assets` WHERE `asset_type` = 'PRINTER';

INSERT INTO `network_devices` (`asset_id`, `updated_at`)
SELECT `id`, NOW(3) FROM `assets` WHERE `asset_type` = 'NETWORK_DEVICE';

INSERT INTO `peripherals` (`asset_id`, `updated_at`)
SELECT `id`, NOW(3) FROM `assets` WHERE `asset_type` = 'PERIPHERAL';
