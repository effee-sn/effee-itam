"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, UserCog, Cpu, Laptop, Network, ShieldCheck, Plus, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { OptionSelect } from "@/components/shared/OptionSelect";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";
import { assetSchemaFor } from "@/modules/assets/types/schemas";
import {
  FormSection as Section,
  FormGrid,
  FormActions,
  NotesCard,
  RequiredMark,
} from "../_shared/form-section";

type Option = { id: number; name: string };

export type ComputerFormValues = {
  assetType: "COMPUTER";
  assetTag: string;
  subType?: string;
  serialNumber?: string;
  hostname?: string;
  macAddress?: string;
  ipAddress?: string;
  brand?: string;
  model?: string;
  vendorId?: number;
  purchaseDate?: string;
  invoiceNumber?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  cost?: string;
  departmentId?: number;
  notes?: string;
  status?: "AVAILABLE" | "ASSIGNED" | "UNDER_REPAIR" | "RETIRED" | "LOST";
  // Computer detail
  osName?: string;
  osVersion?: string;
  osArchitecture?: string;
  osServicePack?: string;
  osKernelVersion?: string;
  osProductKey?: string;
  osInstallDate?: string;
  localDomain?: string;
  workgroup?: string;
  intuneEnrolled?: boolean;
  uuid?: string;
  biosVersion?: string;
};

export type ComputerFormAsset = ComputerFormValues & { id: number };

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
];

const ARCHITECTURE_OPTIONS = [
  { value: "64-bit", label: "64-bit" },
  { value: "32-bit", label: "32-bit" },
  { value: "ARM64", label: "ARM64" },
];

// Replaces the old Desktop/Laptop/Server categories. Kept in step with the same list in the
// registry's COMPUTER descriptor, which is what drives the detail page and exports.
const SUB_TYPE_OPTIONS = [
  { value: "Desktop", label: "Desktop" },
  { value: "Laptop", label: "Laptop" },
  { value: "Server", label: "Server" },
];

export function ComputerForm({
  asset,
  vendors,
  departments,
}: {
  asset?: ComputerFormAsset;
  vendors: Option[];
  departments: Option[];
}) {
  const isEdit = !!asset;
  const { isPending, navigate } = useGlobalProgress();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComputerFormValues>({
    // Fixed to the computer schema — this form only ever creates computers, so there's no
    // need for the generic form's per-category resolver.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(assetSchemaFor("COMPUTER")) as any,
    defaultValues: asset ?? { assetType: "COMPUTER", status: "AVAILABLE" },
  });

  const formErrors = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(data: ComputerFormValues) {
    const url = isEdit ? `/api/assets/${asset.id}` : "/api/assets";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, assetType: "COMPUTER" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(isEdit ? "Computer updated" : "Computer created");
    navigate(`/assets/${isEdit ? asset.id : json.data.asset.id}`);
  }

  const pending = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormGrid>
        <Section icon={FileText} title="Identification" description="Basic information to identify this asset">
          <Field>
            <FieldLabel htmlFor="assetTag">Asset Tag<RequiredMark /></FieldLabel>
            <Input id="assetTag" placeholder="e.g. EII-COM-014" {...register("assetTag")} />
            <FieldError errors={[formErrors.assetTag]} />
            <p className="text-xs text-neutral-500">Must be unique.</p>
          </Field>
          <Field>
            <FieldLabel>Type<RequiredMark /></FieldLabel>
            <Controller
              control={control}
              name="subType"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  options={[{ value: "none", label: "Select type" }, ...SUB_TYPE_OPTIONS]}
                  placeholder="Select type"
                />
              )}
            />
            <FieldError errors={[formErrors.subType]} />
            <p className="text-xs text-neutral-500">Desktop, Laptop or Server.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="hostname">Hostname</FieldLabel>
            <Input id="hostname" placeholder="e.g. FIN-LAP-014" {...register("hostname")} />
            <FieldError errors={[errors.hostname]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="serialNumber">Serial Number</FieldLabel>
            <Input id="serialNumber" placeholder="e.g. 5CD2500P9L" {...register("serialNumber")} />
            <FieldError errors={[errors.serialNumber]} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="uuid">UUID</FieldLabel>
            <Input id="uuid" placeholder="e.g. 4C4C4544-0035-5110-8034-..." {...register("uuid")} />
            <FieldError errors={[formErrors.uuid]} />
            <p className="text-xs text-neutral-500">Reported by inventory agents; unique per machine.</p>
          </Field>
        </Section>

        <Section icon={UserCog} title="Status & Assignment" description="Current status and assignment details">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? "AVAILABLE"}
                  onValueChange={field.onChange}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              )}
            />
            <FieldError errors={[errors.status]} />
            <p className="text-xs text-neutral-500">Current availability status.</p>
          </Field>
          <Field>
            <FieldLabel>Department</FieldLabel>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : Number(value))}
                  options={[
                    { value: "none", label: "— None —" },
                    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                  ]}
                  placeholder="Select department"
                />
              )}
            />
            <FieldError errors={[errors.departmentId]} />
            <p className="text-xs text-neutral-500">Assign to a department.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="workgroup">Workgroup</FieldLabel>
            <Input id="workgroup" placeholder="e.g. WORKGROUP" {...register("workgroup")} />
            <FieldError errors={[errors.workgroup]} />
          </Field>
          <div className="flex items-start pt-6">
            <label className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-blue-600" {...register("intuneEnrolled")} />
              <span>
                <span className="font-medium">Intune Enrolled</span>
                <span className="mt-0.5 block text-xs text-neutral-500">Mark if enrolled in Microsoft Intune.</span>
              </span>
            </label>
          </div>
        </Section>

        <Section icon={Cpu} title="Hardware" description="Manufacturer, model and hardware details">
          <Field>
            <FieldLabel htmlFor="brand">Manufacturer</FieldLabel>
            <Input id="brand" placeholder="e.g. Dell, Lenovo, HP" {...register("brand")} />
            <FieldError errors={[errors.brand]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input id="model" placeholder="e.g. OptiPlex 7020" {...register("model")} />
            <FieldError errors={[errors.model]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="biosVersion">BIOS Version</FieldLabel>
            <Input id="biosVersion" placeholder="e.g. 1.24.0" {...register("biosVersion")} />
            <FieldError errors={[formErrors.biosVersion]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="osProductKey">Product Key</FieldLabel>
            <Input id="osProductKey" placeholder="e.g. XXXXX-XXXXX-XXXXX" {...register("osProductKey")} />
            <FieldError errors={[formErrors.osProductKey]} />
            <p className="text-xs text-neutral-500">Windows product key (if available).</p>
          </Field>
        </Section>

        <Section icon={Laptop} title="Operating System" description="Operating system and version information">
          <Field>
            <FieldLabel htmlFor="osName">Operating System</FieldLabel>
            <Input id="osName" placeholder="e.g. Windows 11 Business" {...register("osName")} />
            <FieldError errors={[formErrors.osName]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="osVersion">Version</FieldLabel>
            <Input id="osVersion" placeholder="e.g. 23H2" {...register("osVersion")} />
            <FieldError errors={[formErrors.osVersion]} />
          </Field>
          <Field>
            <FieldLabel>Architecture</FieldLabel>
            <Controller
              control={control}
              name="osArchitecture"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  options={[{ value: "none", label: "Select architecture" }, ...ARCHITECTURE_OPTIONS]}
                  placeholder="Select architecture"
                />
              )}
            />
            <FieldError errors={[formErrors.osArchitecture]} />
            <p className="text-xs text-neutral-500">32-bit or 64-bit.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="osKernelVersion">Kernel / Build</FieldLabel>
            <Input id="osKernelVersion" placeholder="e.g. 10.0.22631" {...register("osKernelVersion")} />
            <FieldError errors={[formErrors.osKernelVersion]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="osServicePack">Service Pack</FieldLabel>
            <Input id="osServicePack" placeholder="e.g. SP1" {...register("osServicePack")} />
            <FieldError errors={[formErrors.osServicePack]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="osInstallDate">Install Date</FieldLabel>
            <Input id="osInstallDate" type="date" {...register("osInstallDate")} />
            <FieldError errors={[formErrors.osInstallDate]} />
          </Field>
        </Section>

        <Section icon={Network} title="Network" description="Network and domain information">
          <Field>
            <FieldLabel htmlFor="macAddress">MAC Address</FieldLabel>
            <Input id="macAddress" placeholder="e.g. 00:1A:2B:3C:4D:5E" {...register("macAddress")} />
            <FieldError errors={[errors.macAddress]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ipAddress">IP Address</FieldLabel>
            <Input id="ipAddress" placeholder="e.g. 192.168.1.50" {...register("ipAddress")} />
            <FieldError errors={[errors.ipAddress]} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="localDomain">Domain</FieldLabel>
            <Input id="localDomain" placeholder="e.g. corp.local" {...register("localDomain")} />
            <FieldError errors={[errors.localDomain]} />
          </Field>
        </Section>

        <Section icon={ShieldCheck} title="Purchase & Warranty" description="Procurement and warranty details">
          <Field>
            <FieldLabel>Vendor</FieldLabel>
            <Controller
              control={control}
              name="vendorId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : Number(value))}
                  options={[
                    { value: "none", label: "— None —" },
                    ...vendors.map((v) => ({ value: String(v.id), label: v.name })),
                  ]}
                  placeholder="Select vendor"
                />
              )}
            />
            <FieldError errors={[errors.vendorId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="invoiceNumber">Invoice Number</FieldLabel>
            <Input id="invoiceNumber" placeholder="e.g. INV-001" {...register("invoiceNumber")} />
            <FieldError errors={[errors.invoiceNumber]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="purchaseDate">Purchase Date</FieldLabel>
            <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
            <FieldError errors={[errors.purchaseDate]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cost">Cost</FieldLabel>
            <Input id="cost" inputMode="decimal" placeholder="0.00" {...register("cost")} />
            <FieldError errors={[errors.cost]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="warrantyStart">Warranty Start</FieldLabel>
            <Input id="warrantyStart" type="date" {...register("warrantyStart")} />
            <FieldError errors={[errors.warrantyStart]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="warrantyEnd">Warranty End</FieldLabel>
            <Input id="warrantyEnd" type="date" {...register("warrantyEnd")} />
            <FieldError errors={[errors.warrantyEnd]} />
          </Field>
        </Section>

        <NotesCard control={control} register={register} />
      </FormGrid>

      <FormActions
        pending={pending}
        submitLabel={isEdit ? "Save Changes" : "Create Computer"}
        submitIcon={isEdit ? Save : Plus}
        cancelHref={isEdit && asset ? `/assets/${asset.id}` : "/assets/computers"}
        hint={isEdit ? undefined : "You can add components and connected devices once the computer is created."}
      />
    </form>
  );
}
