-- CreateTable
CREATE TABLE `issue_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `applies_to_asset` BOOLEAN NOT NULL DEFAULT true,
    `applies_to_email_account` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `issue_categories_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default categories: the 6 originals (preserving the retiring enum's meaning)
-- plus 4 new ones relevant only to email account tickets.
INSERT INTO `issue_categories` (`name`, `applies_to_asset`, `applies_to_email_account`, `created_at`, `updated_at`) VALUES
('Hardware', true, false, NOW(3), NOW(3)),
('Software', true, true, NOW(3), NOW(3)),
('Network', true, false, NOW(3), NOW(3)),
('Physical Damage', true, false, NOW(3), NOW(3)),
('Performance', true, false, NOW(3), NOW(3)),
('Other', true, true, NOW(3), NOW(3)),
('Account Access', false, true, NOW(3), NOW(3)),
('Spam / Phishing', false, true, NOW(3), NOW(3)),
('Storage / Quota', false, true, NOW(3), NOW(3)),
('Configuration', false, true, NOW(3), NOW(3));

-- AlterTable: add the new FK column, nullable for now
ALTER TABLE `maintenance_records` ADD COLUMN `category_id` INTEGER NULL;

-- Backfill category_id from the retiring `category` enum column before it's dropped
UPDATE `maintenance_records` mr
JOIN `issue_categories` ic ON (
    (mr.`category` = 'HARDWARE' AND ic.`name` = 'Hardware') OR
    (mr.`category` = 'SOFTWARE' AND ic.`name` = 'Software') OR
    (mr.`category` = 'NETWORK' AND ic.`name` = 'Network') OR
    (mr.`category` = 'PHYSICAL_DAMAGE' AND ic.`name` = 'Physical Damage') OR
    (mr.`category` = 'PERFORMANCE' AND ic.`name` = 'Performance') OR
    (mr.`category` = 'OTHER' AND ic.`name` = 'Other')
)
SET mr.`category_id` = ic.`id`;

-- AlterTable: now safe to require it (every row was backfilled above)
ALTER TABLE `maintenance_records` MODIFY `category_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `issue_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropColumn: the old enum column, now fully replaced
ALTER TABLE `maintenance_records` DROP COLUMN `category`;
