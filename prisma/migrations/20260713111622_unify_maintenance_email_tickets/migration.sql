-- DropForeignKey
ALTER TABLE `email_requests` DROP FOREIGN KEY `email_requests_email_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `maintenance_records` DROP FOREIGN KEY `maintenance_records_asset_id_fkey`;

-- DropIndex
DROP INDEX `maintenance_records_asset_id_fkey` ON `maintenance_records`;

-- AlterTable
ALTER TABLE `maintenance_records` ADD COLUMN `email_account_id` INTEGER NULL,
    MODIFY `asset_id` INTEGER NULL;

-- DropTable
DROP TABLE `email_requests`;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_email_account_id_fkey` FOREIGN KEY (`email_account_id`) REFERENCES `email_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
