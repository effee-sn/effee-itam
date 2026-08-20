-- GLPI-style Computers: split the single Operating System box into GLPI's own fields, add
-- machine identity (UUID / BIOS), make components repeatable, and let devices be connected
-- to a computer.
--
-- Ordering matters: add the new columns and COPY the old OS value across BEFORE dropping
-- anything, so no data is lost even though this environment happens to have none yet.

-- 1. New Computer columns
ALTER TABLE `computers`
    ADD COLUMN `os_name` VARCHAR(191) NULL,
    ADD COLUMN `os_version` VARCHAR(191) NULL,
    ADD COLUMN `os_architecture` VARCHAR(191) NULL,
    ADD COLUMN `os_service_pack` VARCHAR(191) NULL,
    ADD COLUMN `os_kernel_version` VARCHAR(191) NULL,
    ADD COLUMN `os_product_key` VARCHAR(191) NULL,
    ADD COLUMN `os_install_date` DATETIME(3) NULL,
    ADD COLUMN `uuid` VARCHAR(191) NULL,
    ADD COLUMN `bios_version` VARCHAR(191) NULL;

-- 2. Carry the existing free-text OS value into its dedicated column.
UPDATE `computers` SET `os_name` = `operating_system` WHERE `operating_system` IS NOT NULL;

-- 3. Drop the replaced columns. cpu/ram_gb/storage are superseded by computer_components
--    below; verified empty (0 of 2 computer rows had any value) before writing this, and
--    these columns have never shipped — they were added earlier in this same unreleased
--    change. operating_system is dropped only after the copy above.
ALTER TABLE `computers`
    DROP COLUMN `operating_system`,
    DROP COLUMN `cpu`,
    DROP COLUMN `ram_gb`,
    DROP COLUMN `storage`;

-- 4. Repeatable hardware components (a server can have 2 CPUs and 8 RAM modules).
CREATE TABLE `computer_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `computer_id` INTEGER NOT NULL,
    `type` ENUM('PROCESSOR', 'MEMORY', 'STORAGE', 'GRAPHICS', 'NETWORK_CARD', 'MOTHERBOARD', 'POWER_SUPPLY', 'SOUND_CARD', 'CASE', 'BATTERY', 'OTHER') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specification` VARCHAR(191) NULL,
    `capacity` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `computer_components_computer_id_type_idx`(`computer_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Devices attached to a computer (GLPI's computers_items). connected_asset_id is UNIQUE:
--    a monitor is plugged into at most one machine at a time.
CREATE TABLE `asset_connections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `computer_asset_id` INTEGER NOT NULL,
    `connected_asset_id` INTEGER NOT NULL,
    `connected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `asset_connections_connected_asset_id_key`(`connected_asset_id`),
    INDEX `asset_connections_computer_asset_id_idx`(`computer_asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `computers_uuid_idx` ON `computers`(`uuid`);

-- AddForeignKey
ALTER TABLE `computer_components` ADD CONSTRAINT `computer_components_computer_id_fkey` FOREIGN KEY (`computer_id`) REFERENCES `computers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_connections` ADD CONSTRAINT `asset_connections_computer_asset_id_fkey` FOREIGN KEY (`computer_asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_connections` ADD CONSTRAINT `asset_connections_connected_asset_id_fkey` FOREIGN KEY (`connected_asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
