import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import type { Prisma } from "@/generated/prisma/client";

export async function getAssignmentHistory(assetId: number) {
  return prisma.assetAssignment.findMany({
    where: { assetId },
    orderBy: { actionDate: "desc" },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
      performedBy: { select: { id: true, name: true } },
    },
  });
}

/**
 * Core assign writes, kept tx-parameterized so a caller can run this as part of its
 * own larger transaction.
 */
export async function executeAssetAssignment(
  tx: Prisma.TransactionClient,
  params: { assetId: number; toUserId: number; actorUserId: number; notes?: string | null },
) {
  const { assetId, toUserId, actorUserId, notes } = params;
  const asset = await tx.asset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);
  if (asset.status !== "AVAILABLE") {
    throw new AppError("INVALID_STATE", "Only available assets can be assigned", 409);
  }

  const assignment = await tx.assetAssignment.create({
    data: { assetId, action: "ASSIGN", toUserId, performedByUserId: actorUserId, notes: notes || null },
  });
  await tx.asset.update({
    where: { id: assetId },
    data: { status: "ASSIGNED", currentAssignedUserId: toUserId },
  });

  return assignment;
}

/** Core return writes, tx-parameterized — see executeAssetAssignment. */
export async function executeAssetReturn(
  tx: Prisma.TransactionClient,
  params: { assetId: number; actorUserId: number; notes?: string | null },
) {
  const { assetId, actorUserId, notes } = params;
  const asset = await tx.asset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);
  if (asset.status !== "ASSIGNED" || !asset.currentAssignedUserId) {
    throw new AppError("INVALID_STATE", "Only assigned assets can be returned", 409);
  }

  const fromUserId = asset.currentAssignedUserId;

  const assignment = await tx.assetAssignment.create({
    data: { assetId, action: "RETURN", fromUserId, performedByUserId: actorUserId, notes: notes || null },
  });
  await tx.asset.update({
    where: { id: assetId },
    data: { status: "AVAILABLE", currentAssignedUserId: null },
  });

  return assignment;
}

/** Core transfer writes, tx-parameterized — see executeAssetAssignment. Returns the holder it
 * moved the asset away from, which the connected-device cascade needs. */
export async function executeAssetTransfer(
  tx: Prisma.TransactionClient,
  params: { assetId: number; toUserId: number; actorUserId: number; notes?: string | null },
) {
  const { assetId, toUserId, actorUserId, notes } = params;
  const asset = await tx.asset.findFirst({ where: { id: assetId, deletedAt: null } });
  if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);
  if (asset.status !== "ASSIGNED" || !asset.currentAssignedUserId) {
    throw new AppError("INVALID_STATE", "Only assigned assets can be transferred", 409);
  }
  if (asset.currentAssignedUserId === toUserId) {
    throw new AppError("INVALID_STATE", "Asset is already assigned to this user", 409);
  }

  const fromUserId = asset.currentAssignedUserId;
  const assignment = await tx.assetAssignment.create({
    data: { assetId, action: "TRANSFER", fromUserId, toUserId, performedByUserId: actorUserId, notes: notes || null },
  });
  await tx.asset.update({ where: { id: assetId }, data: { currentAssignedUserId: toUserId } });

  return { assignment, fromUserId };
}

/**
 * When a computer changes hands, the monitors, docks and other devices plugged into it move
 * with it — they're on the same desk. Runs inside the caller's transaction so the whole
 * change is atomic.
 *
 * Tolerant by design: only devices that can cleanly make the SAME move are touched, so a
 * connected device that can't (it's under repair, or already held by someone else) is quietly
 * left as-is and never fails the computer's own assignment. A no-op for non-computers, which
 * have no connected devices. Returns the device ids it moved, for auditing after commit.
 */
async function cascadeToConnectedDevices(
  tx: Prisma.TransactionClient,
  params: {
    computerAssetId: number;
    action: "ASSIGN" | "RETURN" | "TRANSFER";
    toUserId?: number; // ASSIGN, TRANSFER
    fromUserId?: number | null; // RETURN, TRANSFER — the computer's holder before the change
    actorUserId: number;
    notes?: string | null;
  },
): Promise<number[]> {
  const { computerAssetId, action, toUserId, fromUserId, actorUserId, notes } = params;
  const links = await tx.assetConnection.findMany({
    where: { computerAssetId },
    include: { connectedAsset: { select: { id: true, status: true, currentAssignedUserId: true } } },
  });

  const moved: number[] = [];
  for (const { connectedAsset: device } of links) {
    // The precondition is checked here, and execute* re-checks the same thing inside this
    // transaction, so these calls never throw — no try/catch (which wouldn't work anyway: a
    // throw inside a Prisma interactive transaction poisons the whole tx).
    if (action === "ASSIGN" && device.status === "AVAILABLE" && toUserId) {
      await executeAssetAssignment(tx, { assetId: device.id, toUserId, actorUserId, notes });
      moved.push(device.id);
    } else if (action === "RETURN" && device.status === "ASSIGNED" && device.currentAssignedUserId === fromUserId) {
      await executeAssetReturn(tx, { assetId: device.id, actorUserId, notes });
      moved.push(device.id);
    } else if (
      action === "TRANSFER" &&
      device.status === "ASSIGNED" &&
      device.currentAssignedUserId === fromUserId &&
      toUserId
    ) {
      await executeAssetTransfer(tx, { assetId: device.id, toUserId, actorUserId, notes });
      moved.push(device.id);
    }
  }
  return moved;
}

/** One audit row per connected device the cascade moved, so the trail isn't just the computer. */
async function auditCascaded(deviceIds: number[], action: "ASSIGN" | "RETURN", computerAssetId: number, actorUserId: number) {
  for (const id of deviceIds) {
    await auditLog({
      userId: actorUserId,
      action,
      module: "assets",
      entityType: "Asset",
      entityId: id,
      description: `${action === "ASSIGN" ? "Assigned" : "Returned"} with connected computer #${computerAssetId}`,
    });
  }
}

export async function assignAsset(assetId: number, toUserId: number, notes: string | undefined, actorUserId: number) {
  const { assignment, cascaded } = await prisma.$transaction(async (tx) => {
    const assignment = await executeAssetAssignment(tx, { assetId, toUserId, actorUserId, notes });
    const cascaded = await cascadeToConnectedDevices(tx, { computerAssetId: assetId, action: "ASSIGN", toUserId, actorUserId, notes });
    return { assignment, cascaded };
  });

  await auditLog({ userId: actorUserId, action: "ASSIGN", module: "assets", entityType: "Asset", entityId: assetId });
  await auditCascaded(cascaded, "ASSIGN", assetId, actorUserId);

  return assignment;
}

export async function returnAsset(assetId: number, notes: string | undefined, actorUserId: number) {
  const { assignment, cascaded } = await prisma.$transaction(async (tx) => {
    const assignment = await executeAssetReturn(tx, { assetId, actorUserId, notes });
    // assignment.fromUserId is the holder the computer just came back from — only devices held
    // by that same person are pulled back with it.
    const cascaded = await cascadeToConnectedDevices(tx, {
      computerAssetId: assetId,
      action: "RETURN",
      fromUserId: assignment.fromUserId,
      actorUserId,
      notes,
    });
    return { assignment, cascaded };
  });

  await auditLog({ userId: actorUserId, action: "RETURN", module: "assets", entityType: "Asset", entityId: assetId });
  await auditCascaded(cascaded, "RETURN", assetId, actorUserId);

  return assignment;
}

export async function transferAsset(
  assetId: number,
  toUserId: number,
  notes: string | undefined,
  actorUserId: number,
) {
  const { assignment, cascaded } = await prisma.$transaction(async (tx) => {
    const { assignment, fromUserId } = await executeAssetTransfer(tx, { assetId, toUserId, actorUserId, notes });
    const cascaded = await cascadeToConnectedDevices(tx, {
      computerAssetId: assetId,
      action: "TRANSFER",
      toUserId,
      fromUserId,
      actorUserId,
      notes,
    });
    return { assignment, cascaded };
  });

  await auditLog({
    userId: actorUserId,
    action: "ASSIGN",
    module: "assets",
    entityType: "Asset",
    entityId: assetId,
    description: "Transferred to a different user",
  });
  // A transferred device is still, on balance, an ASSIGN in the global log's vocabulary.
  await auditCascaded(cascaded, "ASSIGN", assetId, actorUserId);

  return assignment;
}
