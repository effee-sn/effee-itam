-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- DropIndex
DROP INDEX `users_employee_id_key` ON `users`;

-- CreateIndex
CREATE INDEX `users_employee_id_idx` ON `users`(`employee_id`);

-- CreateIndex
CREATE INDEX `users_email_idx` ON `users`(`email`);
