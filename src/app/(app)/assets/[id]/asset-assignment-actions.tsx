"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OptionSelect } from "@/components/shared/OptionSelect";

type UserOption = { id: number; name: string; employeeId: string };

function ActionDialog({
  trigger,
  title,
  needsUser,
  users,
  excludeUserId,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
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
      setToUserId("");
      setNotes("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setToUserId("");
          setNotes("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {needsUser && (
            <Field>
              <FieldLabel>User</FieldLabel>
              <OptionSelect
                value={toUserId}
                onValueChange={setToUserId}
                options={availableUsers.map((user) => ({
                  value: String(user.id),
                  label: `${user.name} (${user.employeeId})`,
                }))}
                placeholder="Select user"
              />
            </Field>
          )}
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          trigger={<Button size="sm">Assign</Button>}
          title="Assign Asset"
          needsUser
          users={users}
          onSubmit={(data) => callApi("assign", { toUserId: data.toUserId, notes: data.notes }, "Asset assigned")}
        />
      )}
      {status === "ASSIGNED" && canReturn && (
        <ActionDialog
          trigger={
            <Button size="sm" variant="outline">
              Return
            </Button>
          }
          title="Return Asset"
          needsUser={false}
          users={users}
          onSubmit={(data) => callApi("return", { notes: data.notes }, "Asset returned")}
        />
      )}
      {status === "ASSIGNED" && canAssign && (
        <ActionDialog
          trigger={
            <Button size="sm" variant="outline">
              Transfer
            </Button>
          }
          title="Transfer Asset"
          needsUser
          users={users}
          excludeUserId={currentAssignedUserId}
          onSubmit={(data) => callApi("transfer", { toUserId: data.toUserId, notes: data.notes }, "Asset transferred")}
        />
      )}
    </div>
  );
}
