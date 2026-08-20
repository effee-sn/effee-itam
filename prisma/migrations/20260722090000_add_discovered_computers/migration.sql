-- Inventory agent support: machines the PowerShell agent reports that don't match an existing
-- asset land here (not as assets — assets need a human-assigned tag) until an admin onboards
-- them. Purely additive; nothing else changes.

CREATE TABLE `discovered_computers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `hostname` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `os_name` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'ONBOARDED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `onboarded_asset_id` INTEGER NULL,
    `first_seen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `discovered_computers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
