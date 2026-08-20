-- AlterTable: add new columns (nullable) alongside the retiring boolean
ALTER TABLE `maintenance_records`
    ADD COLUMN `resolution_type` ENUM('IN_HOUSE', 'WARRANTY_CLAIM', 'VENDOR_SERVICE') NULL,
    ADD COLUMN `service_mode` ENUM('ON_SITE', 'PICKUP_DROPOFF') NULL;

-- CreateTable
CREATE TABLE `maintenance_stage_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_record_id` INTEGER NOT NULL,
    `note` TEXT NOT NULL,
    `entry_date` DATETIME(3) NOT NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `maintenance_stage_log_maintenance_record_id_entry_date_idx`(`maintenance_record_id`, `entry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_parts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_record_id` INTEGER NOT NULL,
    `part_name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_cost` DECIMAL(12, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_stage_log` ADD CONSTRAINT `maintenance_stage_log_maintenance_record_id_fkey` FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_stage_log` ADD CONSTRAINT `maintenance_stage_log_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_record_id_fkey` FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill resolution_type for already-triaged (non-REPORTED) records from the
-- retiring is_warranty_claim boolean, before dropping it.
UPDATE `maintenance_records`
SET `resolution_type` = CASE
    WHEN `is_warranty_claim` = 1 THEN 'WARRANTY_CLAIM'
    WHEN `vendor_id` IS NOT NULL THEN 'VENDOR_SERVICE'
    ELSE 'IN_HOUSE'
END
WHERE `status` <> 'REPORTED';

-- AlterTable: drop the retired boolean now that its data has been migrated
ALTER TABLE `maintenance_records` DROP COLUMN `is_warranty_claim`;
