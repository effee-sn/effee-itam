-- AlterTable
ALTER TABLE `maintenance_records` ADD COLUMN `category` ENUM('HARDWARE', 'SOFTWARE', 'NETWORK', 'PHYSICAL_DAMAGE', 'PERFORMANCE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `resolution_notes` TEXT NULL;

-- CreateTable
CREATE TABLE `maintenance_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_record_id` INTEGER NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_attachments` ADD CONSTRAINT `maintenance_attachments_maintenance_record_id_fkey` FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
