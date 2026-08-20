-- AlterTable
ALTER TABLE `temporary_allocations` MODIFY `status` ENUM('ACTIVE', 'RETURNED', 'MADE_PERMANENT') NOT NULL DEFAULT 'ACTIVE';
