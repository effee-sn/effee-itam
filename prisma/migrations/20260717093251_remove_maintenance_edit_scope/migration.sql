-- Revert the "which tickets they can resolve/edit" scope dimension added earlier —
-- user explicitly asked for ticket resolution to go back to a single flat permission
-- (maintenance.edit: anyone granted it can resolve ANY ticket company-wide), not a
-- scoped All/Department/Self setting. seed.ts only upserts, never deletes, so these 3
-- now-orphaned permission rows must be removed directly; role_permissions rows
-- referencing them cascade-delete automatically (see RolePermission's onDelete: Cascade).
DELETE FROM `permissions` WHERE `code` IN (
  'maintenance.edit_scope_all',
  'maintenance.edit_scope_department',
  'maintenance.edit_scope_self'
);
