-- DropIndex
DROP INDEX `asset_categories_name_key` ON `asset_categories`;

-- DropIndex
DROP INDEX `departments_name_key` ON `departments`;

-- CreateIndex
CREATE INDEX `asset_categories_name_idx` ON `asset_categories`(`name`);

-- CreateIndex
CREATE INDEX `departments_name_idx` ON `departments`(`name`);

-- CreateIndex
CREATE INDEX `vendors_name_idx` ON `vendors`(`name`);
