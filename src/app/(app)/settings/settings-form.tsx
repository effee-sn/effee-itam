"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Upload, Trash2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    defaultValues: { companyName: settings.companyName, address: settings.address ?? "" },
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

  async function removeLogo() {
    setUploading(true);
    const res = await fetch("/api/settings/logo", { method: "DELETE" });
    const json = await res.json();
    setUploading(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to remove logo");
      return;
    }
    toast.success("Logo removed");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Company Information</h2>
          <p className="text-xs text-neutral-500">Update your company details and logo.</p>
        </div>
      </div>

      {/* Logo */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">Company Logo</label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
            {settings.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoPath} alt="Company logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-neutral-400">No logo</span>
            )}
          </div>
          {canEdit && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onLogoChange} disabled={uploading} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" /> Choose File
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={uploading || !settings.logoPath}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
              <p className="text-xs text-neutral-500">JPEG, PNG, WEBP or GIF. Max 2MB.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium">
            Company Name <span className="text-rose-500">*</span>
          </label>
          <Input id="companyName" disabled={!canEdit} className="h-11! px-3!" {...register("companyName")} />
          {errors.companyName && <p className="mt-1 text-sm text-rose-600">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium">Address</label>
          <Textarea id="address" disabled={!canEdit} rows={3} {...register("address")} />
          {errors.address && <p className="mt-1 text-sm text-rose-600">{errors.address.message}</p>}
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        )}
      </form>
    </div>
  );
}
