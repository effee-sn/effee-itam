-- 1. Add the 9 scope-level permissions (data, not schema) — one ALL/DEPARTMENT/SELF
--    triple per scoped module (assets, maintenance, email_accounts).
INSERT IGNORE INTO `permissions` (`code`, `module`, `description`, `created_at`) VALUES
  ('assets.scope_all', 'assets', 'Data visibility: see all assets', NOW()),
  ('assets.scope_department', 'assets', 'Data visibility: see own department''s assets only', NOW()),
  ('assets.scope_self', 'assets', 'Data visibility: see only assets assigned to them', NOW()),
  ('maintenance.scope_all', 'maintenance', 'Data visibility: see all maintenance tickets', NOW()),
  ('maintenance.scope_department', 'maintenance', 'Data visibility: see own department tickets only', NOW()),
  ('maintenance.scope_self', 'maintenance', 'Data visibility: see only tickets assigned to them', NOW()),
  ('email_accounts.scope_all', 'email_accounts', 'Data visibility: see all email accounts', NOW()),
  ('email_accounts.scope_department', 'email_accounts', 'Data visibility: see own department email accounts only', NOW()),
  ('email_accounts.scope_self', 'email_accounts', 'Data visibility: see only email accounts assigned to them', NOW());

-- 2. Carry forward each role's current single `scope` value into all 3 scoped modules,
--    as granted permissions — preserves existing behavior exactly (critical for
--    SUPER_ADMIN/IT_ADMIN, currently ALL-scoped, so they don't lose visibility).
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `r`.`id`, `p`.`id` FROM `roles` `r`
JOIN `permissions` `p` ON `p`.`code` = CONCAT('assets.scope_', LOWER(`r`.`scope`))
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp` WHERE `rp`.`role_id` = `r`.`id` AND `rp`.`permission_id` = `p`.`id`
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `r`.`id`, `p`.`id` FROM `roles` `r`
JOIN `permissions` `p` ON `p`.`code` = CONCAT('maintenance.scope_', LOWER(`r`.`scope`))
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp` WHERE `rp`.`role_id` = `r`.`id` AND `rp`.`permission_id` = `p`.`id`
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `r`.`id`, `p`.`id` FROM `roles` `r`
JOIN `permissions` `p` ON `p`.`code` = CONCAT('email_accounts.scope_', LOWER(`r`.`scope`))
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp` WHERE `rp`.`role_id` = `r`.`id` AND `rp`.`permission_id` = `p`.`id`
);

-- 3. Drop the now-superseded single global scope column.
ALTER TABLE `roles` DROP COLUMN `scope`;
