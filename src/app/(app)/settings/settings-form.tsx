"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { settingsSchema, type SettingsInput } from "@/modules/settings/validators";

type SettingsData = {
  companyName: string;
  logoPath: string | null;
  address: string | null;
};

export function SettingsForm({ settings, canEdit }: { settings: SettingsData; canEdit: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: settings.companyName,
      address: settings.address ?? "",
    },
  });

  async function onSubmit(data: SettingsInput) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success("Settings updated");
    router.refresh();
  }

  async function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
    const json = await res.json();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to upload logo");
      return;
    }
    toast.success("Logo updated");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-3">
        <FieldLabel>Company Logo</FieldLabel>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-48 items-center justify-center overflow-hidden rounded-md border bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900">
            {settings.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoPath} alt="Company logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-neutral-400">No logo</span>
            )}
          </div>
          {canEdit && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onLogoChange}
                disabled={uploading}
                className="text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">JPEG, PNG, WEBP or GIF. Max 2MB.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field>
          <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
          <Input id="companyName" disabled={!canEdit} {...register("companyName")} />
          <FieldError errors={[errors.companyName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Textarea id="address" disabled={!canEdit} rows={3} {...register("address")} />
          <FieldError errors={[errors.address]} />
        </Field>
        {canEdit && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </form>
    </div>
  );
}
