-- Add the 3 new "who can they raise a ticket for" scope permissions for Maintenance —
-- a second, independent scope dimension from the existing "which tickets can they see"
-- one (maintenance.scope_*). Same modeled-as-permissions approach, no new table.
INSERT IGNORE INTO `permissions` (`code`, `module`, `description`, `created_at`) VALUES
  ('maintenance.create_scope_all', 'maintenance', 'Can raise tickets about any asset/email account', NOW()),
  (
    'maintenance.create_scope_department',
    'maintenance',
    'Can raise tickets about their own department''s assets/email accounts only',
    NOW()
  ),
  (
    'maintenance.create_scope_self',
    'maintenance',
    'Can raise tickets only about assets/email accounts assigned to them',
    NOW()
  );

-- Backfill: every role that already has a maintenance.scope_<level> (ticket-viewing scope)
-- grant gets the matching maintenance.create_scope_<level> grant too, as a safe starting
-- point — mirrors their existing ticket-visibility breadth rather than guessing. The admin
-- can then deliberately widen a specific role's create-scope afterward (e.g. DEPT_HEAD to
-- "department", so a coordinator can raise tickets for colleagues) via the Roles page.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `rp`.`role_id`, `p2`.`id`
FROM `role_permissions` `rp`
JOIN `permissions` `p1` ON `p1`.`id` = `rp`.`permission_id` AND `p1`.`code` LIKE 'maintenance.scope\_%'
JOIN `permissions` `p2` ON `p2`.`code` = CONCAT('maintenance.create_scope_', SUBSTRING_INDEX(`p1`.`code`, '_', -1))
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp2` WHERE `rp2`.`role_id` = `rp`.`role_id` AND `rp2`.`permission_id` = `p2`.`id`
);
