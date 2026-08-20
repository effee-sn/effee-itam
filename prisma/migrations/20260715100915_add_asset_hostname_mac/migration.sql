-- AlterTable
ALTER TABLE `assets` ADD COLUMN `hostname` VARCHAR(191) NULL,
    ADD COLUMN `mac_address` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `assets_mac_address_idx` ON `assets`(`mac_address`);
