-- Removes Asset Categories. The user found maintaining a second, admin-managed
-- classification on top of the AssetType enum confusing ("remove the asset categories i
-- dont want that"), especially once every type gained its own dedicated form.
--
-- What the category used to provide, and what replaces it:
--   * the asset's TYPE      -> now set directly by whichever type-specific form created it
--                              (assets.asset_type already holds this and is already correct
--                              for every existing row, so there is nothing to derive).
--   * Desktop/Laptop/Server -> now computers.sub_type, a fixed list on the type itself.
--   * the asset tag code    -> now comes from the type's registry entry (EI/COM/26/001),
--                              not category.tag_code. EXISTING TAGS ARE NOT REWRITTEN —
--                              an asset tag is a permanent physical label, so old tags stay
--                              exactly as they are and only new tags use the new scheme.
--
-- IRREVERSIBLE. Verified before writing: 2 assets exist, both asset_type = 'COMPUTER' with
-- category 'Laptop'; every other category has 0 assets. The backfill below is therefore
-- exact rather than best-effort, and it runs BEFORE the column is dropped.

ALTER TABLE `computers` ADD COLUMN `sub_type` VARCHAR(191) NULL;

-- Carry each computer's old category name across as its sub-type while the join still
-- exists. Only names that are real sub-types are mapped; anything else is left NULL rather
-- than guessed at.
UPDATE `computers` c
  JOIN `assets` a ON a.`id` = c.`asset_id`
  JOIN `asset_categories` cat ON cat.`id` = a.`category_id`
  SET c.`sub_type` = cat.`name`
  WHERE cat.`name` IN ('Desktop', 'Laptop', 'Server');

-- Same idea for the types that already had a free-text type column but were relying on the
-- category to say what the thing actually was. Only fills in where it is currently empty,
-- so a value someone typed in deliberately is never overwritten.
UPDATE `network_devices` n
  JOIN `assets` a ON a.`id` = n.`asset_id`
  JOIN `asset_categories` cat ON cat.`id` = a.`category_id`
  SET n.`device_type` = cat.`name`
  WHERE (n.`device_type` IS NULL OR n.`device_type` = '')
    AND cat.`name` IN ('Switch', 'Router', 'Firewall', 'Access Point');

UPDATE `peripherals` p
  JOIN `assets` a ON a.`id` = p.`asset_id`
  JOIN `asset_categories` cat ON cat.`id` = a.`category_id`
  SET p.`peripheral_type` = cat.`name`
  WHERE (p.`peripheral_type` IS NULL OR p.`peripheral_type` = '');

ALTER TABLE `assets` DROP FOREIGN KEY `assets_category_id_fkey`;
DROP INDEX `assets_category_id_fkey` ON `assets`;
ALTER TABLE `assets` DROP COLUMN `category_id`;

DROP TABLE `asset_categories`;

-- Permission rows for the removed module. seed.ts only upserts, never deletes, so these
-- have to go explicitly or they linger on the Roles page doing nothing. role_permissions
-- rows cascade.
DELETE FROM `permissions` WHERE `module` = 'categories';
