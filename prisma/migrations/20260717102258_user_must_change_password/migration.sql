-- Supports admin-initiated password reset + forcing a password change on first login
-- (freshly created/imported users, and anyone whose password an admin resets).
ALTER TABLE `users` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;
