-- Migration A of the GLPI-style asset type split. Purely ADDITIVE — adds the AssetType
-- discriminator to categories and assets, backfills it from the seeded category names, and
-- indexes it. Nothing is dropped and no behaviour changes; the app ignores these columns
-- until later phases. Safe to deploy on its own.

-- AlterTable
ALTER TABLE `asset_categories` ADD COLUMN `asset_type` ENUM('COMPUTER', 'MONITOR', 'PRINTER', 'PHONE', 'SIM_CARD', 'NETWORK_DEVICE', 'PERIPHERAL', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE `assets` ADD COLUMN `asset_type` ENUM('COMPUTER', 'MONITOR', 'PRINTER', 'PHONE', 'SIM_CARD', 'NETWORK_DEVICE', 'PERIPHERAL', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `ip_address` VARCHAR(191) NULL;

-- Backfill category types from the seeded names (mirrors ASSET_CATEGORIES in prisma/seed.ts).
-- Anything not listed — UPS, plus any admin-created category — correctly stays OTHER.
-- Desktop/Laptop/Server all map to COMPUTER on purpose: they share every field, so they're
-- one type distinguished by category, exactly as GLPI does it.
UPDATE `asset_categories` SET `asset_type` = CASE
  WHEN `name` IN ('Laptop', 'Desktop', 'Server') THEN 'COMPUTER'
  WHEN `name` = 'Monitor'                        THEN 'MONITOR'
  WHEN `name` = 'Printer'                        THEN 'PRINTER'
  WHEN `name` = 'Mobile'                         THEN 'PHONE'
  WHEN `name` = 'SIM'                            THEN 'SIM_CARD'
  WHEN `name` IN ('Firewall', 'Switch')          THEN 'NETWORK_DEVICE'
  WHEN `name` = 'Accessories'                    THEN 'PERIPHERAL'
  ELSE 'OTHER'
END;

-- Denormalise onto assets. No `deleted_at IS NULL` filter — soft-deleted assets need a
-- correct type too, because restoreAsset() can bring them back into the active list.
UPDATE `assets` `a`
  JOIN `asset_categories` `c` ON `c`.`id` = `a`.`category_id`
  SET `a`.`asset_type` = `c`.`asset_type`;

-- CreateIndex
CREATE INDEX `asset_categories_asset_type_idx` ON `asset_categories`(`asset_type`);

-- CreateIndex
CREATE INDEX `assets_asset_type_idx` ON `assets`(`asset_type`);

-- CreateIndex
CREATE INDEX `assets_asset_type_status_idx` ON `assets`(`asset_type`, `status`);
