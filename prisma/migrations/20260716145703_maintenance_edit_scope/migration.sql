-- Add the 3 new "which tickets they can resolve/edit" scope permissions for Maintenance —
-- a third independent scope dimension, alongside the existing "which tickets they can
-- see" and "whose assets/email accounts they can raise tickets for" ones. Same
-- modeled-as-permissions approach, no new table.
INSERT IGNORE INTO `permissions` (`code`, `module`, `description`, `created_at`) VALUES
  ('maintenance.edit_scope_all', 'maintenance', 'Can resolve/edit any ticket', NOW()),
  ('maintenance.edit_scope_department', 'maintenance', 'Can resolve/edit only their own department''s tickets', NOW()),
  ('maintenance.edit_scope_self', 'maintenance', 'Can resolve/edit only tickets assigned to them', NOW());

-- Backfill, preserving exact current behavior: before this change, updateMaintenanceRecord
-- was completely unscoped — any role with the flat maintenance.edit permission could
-- resolve/edit ANY ticket company-wide. So every role that already has maintenance.edit
-- gets edit_scope_all (matches what they could already do), not a guess based on their
-- ticket-viewing scope. Roles without maintenance.edit can't reach this code path at all,
-- so they get the safe placeholder edit_scope_self (least-privilege, unreachable either way).
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `rp`.`role_id`, `p2`.`id`
FROM `role_permissions` `rp`
JOIN `permissions` `p1` ON `p1`.`id` = `rp`.`permission_id` AND `p1`.`code` = 'maintenance.edit'
JOIN `permissions` `p2` ON `p2`.`code` = 'maintenance.edit_scope_all'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp2` WHERE `rp2`.`role_id` = `rp`.`role_id` AND `rp2`.`permission_id` = `p2`.`id`
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `r`.`id`, `p`.`id`
FROM `roles` `r`
JOIN `permissions` `p` ON `p`.`code` = 'maintenance.edit_scope_self'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp`
  JOIN `permissions` `pe` ON `pe`.`id` = `rp`.`permission_id` AND `pe`.`code` = 'maintenance.edit'
  WHERE `rp`.`role_id` = `r`.`id`
)
AND NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp2` WHERE `rp2`.`role_id` = `r`.`id` AND `rp2`.`permission_id` = `p`.`id`
);
