-- AlterTable
ALTER TABLE `maintenance_records` ADD COLUMN `replacement_asset_id` INTEGER NULL,
    MODIFY `resolution_type` ENUM('IN_HOUSE', 'WARRANTY_CLAIM', 'VENDOR_SERVICE', 'REPLACEMENT') NULL;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_replacement_asset_id_fkey` FOREIGN KEY (`replacement_asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
