import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import { executeAssetAssignment } from "@/modules/assignments/service";
import type { ComponentType } from "@/generated/prisma/client";
import type { ComponentInput, ConnectionInput } from "./computers-validators";

// ---------------------------------------------------------------------------
// GLPI-style computer extras: repeatable hardware components, and devices
// physically connected to a machine.
// ---------------------------------------------------------------------------

/** Resolves the computer detail row for an asset, or explains why there isn't one. */
async function requireComputer(assetId: number) {
  const computer = await prisma.computer.findUnique({ where: { assetId } });
  if (!computer) {
    throw new AppError("NOT_A_COMPUTER", "Components can only be added to computers", 400);
  }
  return computer;
}

export async function listComponents(assetId: number) {
  const computer = await prisma.computer.findUnique({
    where: { assetId },
    include: { components: { orderBy: [{ type: "asc" }, { id: "asc" }] } },
  });
  return computer?.components ?? [];
}

export async function addComponent(assetId: number, data: ComponentInput, actorUserId: number) {
  const computer = await requireComputer(assetId);

  const component = await prisma.computerComponent.create({
    data: {
      computerId: computer.id,
      type: data.type as ComponentType,
      name: data.name,
      specification: data.specification || null,
      capacity: data.capacity || null,
      serialNumber: data.serialNumber || null,
      quantity: data.quantity ? Number.parseInt(data.quantity, 10) || 1 : 1,
      notes: data.notes || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: assetId,
    description: `Component added: ${data.type} — ${data.name}`,
  });

  return component;
}

export async function removeComponent(componentId: number, actorUserId: number) {
  // Fetch first so the audit entry can name the asset, not just the component row.
  const component = await prisma.computerComponent.findUniqueOrThrow({
    where: { id: componentId },
    include: { computer: { select: { assetId: true } } },
  });

  await prisma.computerComponent.delete({ where: { id: componentId } });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: component.computer.assetId,
    description: `Component removed: ${component.type} — ${component.name}`,
  });
}

/** Devices attached to this computer, plus the computer this asset is attached to (if any). */
export async function getConnections(assetId: number) {
  const [connectedDevices, connectedToComputer] = await Promise.all([
    prisma.assetConnection.findMany({
      where: { computerAssetId: assetId },
      orderBy: { connectedAt: "desc" },
      include: {
        connectedAsset: {
          select: { id: true, assetTag: true, assetType: true, brand: true, model: true },
        },
      },
    }),
    prisma.assetConnection.findUnique({
      where: { connectedAssetId: assetId },
      include: { computerAsset: { select: { id: true, assetTag: true, brand: true, model: true } } },
    }),
  ]);
  return { connectedDevices, connectedToComputer };
}

/**
 * Assets that can still be plugged into this computer: not deleted, not the computer itself,
 * not another computer, and not already connected somewhere else (the unique constraint on
 * connectedAssetId enforces that at the DB level too — this just keeps them out of the picker).
 */
export async function listConnectableAssets(computerAssetId: number) {
  return prisma.asset.findMany({
    where: {
      deletedAt: null,
      id: { not: computerAssetId },
      assetType: { not: "COMPUTER" },
      connectedToComputer: null,
    },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, assetType: true, brand: true, model: true },
  });
}

export async function connectAsset(computerAssetId: number, data: ConnectionInput, actorUserId: number) {
  await requireComputer(computerAssetId);

  if (data.connectedAssetId === computerAssetId) {
    throw new AppError("INVALID_CONNECTION", "An asset cannot be connected to itself", 400);
  }

  // The computer's own assignment: a device plugged into an already-assigned machine should
  // land with the same person, mirroring the cascade that runs when the computer is assigned.
  const computerAsset = await prisma.asset.findFirstOrThrow({
    where: { id: computerAssetId },
    select: { status: true, currentAssignedUserId: true },
  });

  const device = await prisma.asset.findFirst({
    where: { id: data.connectedAssetId, deletedAt: null },
    include: { connectedToComputer: true },
  });
  if (!device) throw new AppError("NOT_FOUND", "Device not found", 404);
  if (device.assetType === "COMPUTER") {
    throw new AppError("INVALID_CONNECTION", "Computers cannot be connected to each other", 400);
  }
  if (device.connectedToComputer) {
    throw new AppError("ALREADY_CONNECTED", "This device is already connected to another computer", 409);
  }

  const inheritsHolder =
    computerAsset.status === "ASSIGNED" &&
    computerAsset.currentAssignedUserId !== null &&
    device.status === "AVAILABLE";

  const connection = await prisma.$transaction(async (tx) => {
    const created = await tx.assetConnection.create({
      data: { computerAssetId, connectedAssetId: data.connectedAssetId, notes: data.notes || null },
    });
    if (inheritsHolder) {
      await executeAssetAssignment(tx, {
        assetId: device.id,
        toUserId: computerAsset.currentAssignedUserId!,
        actorUserId,
        notes: `Assigned with connected computer #${computerAssetId}`,
      });
    }
    return created;
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: computerAssetId,
    description: `Device connected: ${device.assetTag}`,
  });
  if (inheritsHolder) {
    await auditLog({
      userId: actorUserId,
      action: "ASSIGN",
      module: "assets",
      entityType: "Asset",
      entityId: device.id,
      description: `Assigned with connected computer #${computerAssetId}`,
    });
  }

  return connection;
}

export async function disconnectAsset(connectionId: number, actorUserId: number) {
  const connection = await prisma.assetConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { connectedAsset: { select: { assetTag: true } } },
  });

  await prisma.assetConnection.delete({ where: { id: connectionId } });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "Asset",
    entityId: connection.computerAssetId,
    description: `Device disconnected: ${connection.connectedAsset.assetTag}`,
  });
}
