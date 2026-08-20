-- CreateTable
CREATE TABLE `email_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_address` VARCHAR(191) NOT NULL,
    `department_id` INTEGER NULL,
    `assigned_user_id` INTEGER NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `email_accounts_email_address_idx`(`email_address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_account_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_account_id` INTEGER NOT NULL,
    `action` ENUM('ASSIGN', 'RETURN', 'TRANSFER', 'REPLACEMENT') NOT NULL,
    `from_user_id` INTEGER NULL,
    `to_user_id` INTEGER NULL,
    `performed_by_user_id` INTEGER NOT NULL,
    `action_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_account_assignments_email_account_id_action_date_idx`(`email_account_id`, `action_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_account_id` INTEGER NOT NULL,
    `issue_description` TEXT NOT NULL,
    `date_reported` DATETIME(3) NOT NULL,
    `date_resolved` DATETIME(3) NULL,
    `status` ENUM('REPORTED', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'REPORTED',
    `resolution_notes` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_accounts` ADD CONSTRAINT `email_accounts_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_accounts` ADD CONSTRAINT `email_accounts_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_account_assignments` ADD CONSTRAINT `email_account_assignments_email_account_id_fkey` FOREIGN KEY (`email_account_id`) REFERENCES `email_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_account_assignments` ADD CONSTRAINT `email_account_assignments_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_account_assignments` ADD CONSTRAINT `email_account_assignments_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_account_assignments` ADD CONSTRAINT `email_account_assignments_performed_by_user_id_fkey` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_requests` ADD CONSTRAINT `email_requests_email_account_id_fkey` FOREIGN KEY (`email_account_id`) REFERENCES `email_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
