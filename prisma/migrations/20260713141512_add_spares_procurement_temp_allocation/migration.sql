-- AlterTable
ALTER TABLE `maintenance_parts` ADD COLUMN `spare_part_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `spare_parts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `quantity_in_stock` INTEGER NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(12, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `spare_parts_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_record_id` INTEGER NOT NULL,
    `spare_part_id` INTEGER NOT NULL,
    `quantity_requested` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('REQUESTED', 'RECEIVED') NOT NULL DEFAULT 'REQUESTED',
    `requested_by_user_id` INTEGER NOT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `received_quantity` INTEGER NULL,
    `received_by_user_id` INTEGER NULL,
    `received_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `procurement_requests_maintenance_record_id_idx`(`maintenance_record_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temporary_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenance_record_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `assigned_by_user_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_by_user_id` INTEGER NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `temporary_allocations_maintenance_record_id_idx`(`maintenance_record_id`),
    INDEX `temporary_allocations_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_spare_part_id_fkey` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_requests` ADD CONSTRAINT `procurement_requests_maintenance_record_id_fkey` FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_requests` ADD CONSTRAINT `procurement_requests_spare_part_id_fkey` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_requests` ADD CONSTRAINT `procurement_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_requests` ADD CONSTRAINT `procurement_requests_received_by_user_id_fkey` FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temporary_allocations` ADD CONSTRAINT `temporary_allocations_maintenance_record_id_fkey` FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temporary_allocations` ADD CONSTRAINT `temporary_allocations_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temporary_allocations` ADD CONSTRAINT `temporary_allocations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temporary_allocations` ADD CONSTRAINT `temporary_allocations_assigned_by_user_id_fkey` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temporary_allocations` ADD CONSTRAINT `temporary_allocations_resolved_by_user_id_fkey` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
