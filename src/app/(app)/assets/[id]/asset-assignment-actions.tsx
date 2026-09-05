"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type LucideIcon, UserPlus, Undo2, ArrowLeftRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPicker } from "./user-picker";

type UserOption = { id: number; name: string; employeeId: string };

function ActionDialog({
  trigger,
  title,
  subtitle,
  icon: Icon,
  needsUser,
  users,
  excludeUserId,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  needsUser: boolean;
  users: UserOption[];
  excludeUserId?: number | null;
  onSubmit: (data: { toUserId?: number; notes?: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = users.filter((user) => user.id !== excludeUserId);

  function reset() {
    setToUserId("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    if (needsUser && !toUserId) {
      setError("Please select a user");
      return;
    }
    setSubmitting(true);
    setError(null);
    const ok = await onSubmit({ toUserId: toUserId ? Number(toUserId) : undefined, notes });
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      reset();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">{subtitle}</DialogDescription>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {needsUser && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                User <span className="text-rose-500">*</span>
              </label>
              <UserPicker users={availableUsers} value={toUserId} onChange={setToUserId} placeholder="Search users..." />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes (optional)..."
            />
            <div className="mt-1 text-right text-xs text-neutral-400">{notes.length}/500</div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Confirm"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const darkBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200";
const outlineBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function AssetAssignmentActions({
  assetId,
  status,
  currentAssignedUserId,
  users,
  canAssign,
  canReturn,
}: {
  assetId: number;
  status: string;
  currentAssignedUserId: number | null;
  users: UserOption[];
  canAssign: boolean;
  canReturn: boolean;
}) {
  const router = useRouter();

  async function callApi(action: "assign" | "return" | "transfer", body: Record<string, unknown>, successMessage: string) {
    const res = await fetch(`/api/assets/${assetId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Action failed");
      return false;
    }
    toast.success(successMessage);
    router.refresh();
    return true;
  }

  if (status !== "AVAILABLE" && status !== "ASSIGNED") {
    return null;
  }

  return (
    <div className="flex gap-2">
      {status === "AVAILABLE" && canAssign && (
        <ActionDialog
          trigger={
            <button className={darkBtn}>
              <UserPlus className="h-4 w-4" /> Assign
            </button>
          }
          title="Assign Asset"
          subtitle="Assign this asset to a user"
          icon={UserPlus}
          needsUser
          users={users}
          onSubmit={(data) => callApi("assign", { toUserId: data.toUserId, notes: data.notes }, "Asset assigned")}
        />
      )}
      {status === "ASSIGNED" && canReturn && (
        <ActionDialog
          trigger={
            <button className={outlineBtn}>
              <Undo2 className="h-4 w-4" /> Return
            </button>
          }
          title="Return Asset"
          subtitle="Return this asset to the available pool"
          icon={Undo2}
          needsUser={false}
          users={users}
          onSubmit={(data) => callApi("return", { notes: data.notes }, "Asset returned")}
        />
      )}
      {status === "ASSIGNED" && canAssign && (
        <ActionDialog
          trigger={
            <button className={outlineBtn}>
              <ArrowLeftRight className="h-4 w-4" /> Transfer
            </button>
          }
          title="Transfer Asset"
          subtitle="Transfer this asset to another user"
          icon={ArrowLeftRight}
          needsUser
          users={users}
          excludeUserId={currentAssignedUserId}
          onSubmit={(data) => callApi("transfer", { toUserId: data.toUserId, notes: data.notes }, "Asset transferred")}
        />
      )}
    </div>
  );
}
