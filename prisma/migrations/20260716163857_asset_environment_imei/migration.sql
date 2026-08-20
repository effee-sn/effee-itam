-- Environment fields (Local Domain, Workgroup, Intune Enrolled) for Assets, plus an IMEI
-- field for Mobile-category assets. Both requested directly by the user; IMEI is an
-- additional field alongside Serial Number (phones have both), not a replacement.
ALTER TABLE `assets` ADD COLUMN `imei` VARCHAR(191) NULL,
    ADD COLUMN `intune_enrolled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `local_domain` VARCHAR(191) NULL,
    ADD COLUMN `workgroup` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `assets_imei_idx` ON `assets`(`imei`);
