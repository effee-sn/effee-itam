-- New "View deleted assets" permission — gates both the Show Deleted toggle on the Assets
-- list and (in effect) the Restore action, which already requires assets.delete. Same
-- "permissions as data" pattern, no schema change.
INSERT IGNORE INTO `permissions` (`code`, `module`, `description`, `created_at`) VALUES
  ('assets.view_deleted', 'assets', 'View deleted assets and restore them', NOW());

-- Backfill: grant it to every role that already has assets.delete — restoring was
-- previously reachable by anyone with assets.delete (the only gate the Restore button
-- itself checked), and viewing the deleted list had no gate at all, so this preserves the
-- broadest pre-existing behavior (assets.delete holders) rather than silently removing
-- capability from roles that already had assets.delete configured.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `rp`.`role_id`, `p2`.`id`
FROM `role_permissions` `rp`
JOIN `permissions` `p1` ON `p1`.`id` = `rp`.`permission_id` AND `p1`.`code` = 'assets.delete'
JOIN `permissions` `p2` ON `p2`.`code` = 'assets.view_deleted'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` `rp2` WHERE `rp2`.`role_id` = `rp`.`role_id` AND `rp2`.`permission_id` = `p2`.`id`
);
