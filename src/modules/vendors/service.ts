import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import type { VendorInput } from "./validators";

function normalizeVendorInput(data: VendorInput) {
  return {
    name: data.name,
    contactPerson: data.contactPerson || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
  };
}

export async function listVendors({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendor.count({ where }),
  ]);

  return { items, total };
}

export async function listVendorOptions() {
  return prisma.vendor.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

async function assertNameAvailable(name: string, excludeId?: number) {
  const existing = await prisma.vendor.findFirst({
    where: { name, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A vendor with this name already exists", 409);
  }
}

export async function createVendor(data: VendorInput, actorUserId: number) {
  await assertNameAvailable(data.name);
  const vendor = await prisma.vendor.create({ data: normalizeVendorInput(data) });
  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "vendors",
    entityType: "Vendor",
    entityId: vendor.id,
  });
  return vendor;
}

export async function updateVendor(id: number, data: VendorInput, actorUserId: number) {
  await assertNameAvailable(data.name, id);
  const vendor = await prisma.vendor.update({ where: { id }, data: normalizeVendorInput(data) });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "vendors",
    entityType: "Vendor",
    entityId: vendor.id,
  });
  return vendor;
}

export async function deleteVendor(id: number, actorUserId: number) {
  await prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: actorUserId,
    action: "DELETE",
    module: "vendors",
    entityType: "Vendor",
    entityId: id,
  });
}
