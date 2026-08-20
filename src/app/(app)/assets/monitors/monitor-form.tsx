"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { OptionSelect } from "@/components/shared/OptionSelect";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";
import { assetSchemaFor } from "@/modules/assets/types/schemas";
import { FormSection as Section, CheckboxField } from "../_shared/form-section";

type Option = { id: number; name: string };

export type MonitorFormValues = {
  assetType: "MONITOR";
  assetTag: string;
  serialNumber?: string;
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
  // Monitor detail
  partNumber?: string;
  sizeInches?: string;
  resolution?: string;
  refreshRateHz?: string;
  panelType?: string;
  hasVga?: boolean;
  hasDvi?: boolean;
  hasHdmi?: boolean;
  hasDisplayPort?: boolean;
  hasUsbC?: boolean;
  hasUsbHub?: boolean;
  hasSpeakers?: boolean;
  hasMicrophone?: boolean;
  hasWebcam?: boolean;
  hasPivot?: boolean;
  heightAdjustable?: boolean;
  vesaMount?: string;
};

export type MonitorFormAsset = MonitorFormValues & { id: number };

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
];

const PANEL_OPTIONS = [
  { value: "IPS", label: "IPS" },
  { value: "VA", label: "VA" },
  { value: "TN", label: "TN" },
  { value: "OLED", label: "OLED" },
];

// Grouped the way someone actually checks a monitor over: what it plugs into, then what's
// built into it, then what the stand does.
const VIDEO_INPUTS = [
  { key: "hasVga", label: "VGA" },
  { key: "hasDvi", label: "DVI" },
  { key: "hasHdmi", label: "HDMI" },
  { key: "hasDisplayPort", label: "DisplayPort" },
  { key: "hasUsbC", label: "USB-C" },
] as const;

const BUILT_IN = [
  { key: "hasUsbHub", label: "USB Hub" },
  { key: "hasSpeakers", label: "Speakers" },
  { key: "hasMicrophone", label: "Microphone" },
  { key: "hasWebcam", label: "Webcam" },
] as const;

export function MonitorForm({
  asset,
  vendors,
  departments,
}: {
  asset?: MonitorFormAsset;
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
  } = useForm<MonitorFormValues>({
    // Fixed to the monitor schema — this form only ever creates monitors.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(assetSchemaFor("MONITOR")) as any,
    defaultValues: asset ?? { assetType: "MONITOR" },
  });

  const formErrors = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(data: MonitorFormValues) {
    const url = isEdit ? `/api/assets/${asset.id}` : "/api/assets";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, assetType: "MONITOR" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(isEdit ? "Monitor updated" : "Monitor created");
    navigate(`/assets/${isEdit ? asset.id : json.data.asset.id}`);
  }

  const pending = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-5">
      <Section title="Identification" description="Which monitor this is and who made it.">
        <Field>
          <FieldLabel htmlFor="assetTag">Asset Tag</FieldLabel>
          <Input id="assetTag" placeholder="e.g. EI-MON-007" {...register("assetTag")} />
          <FieldError errors={[formErrors.assetTag]} />
          <p className="text-xs text-neutral-500">Whatever is on the label. Must be unique.</p>
        </Field>
        <Field>
          <FieldLabel htmlFor="serialNumber">Serial Number</FieldLabel>
          <Input id="serialNumber" {...register("serialNumber")} />
          <FieldError errors={[errors.serialNumber]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="brand">Manufacturer</FieldLabel>
          <Input id="brand" placeholder="e.g. Dell, LG, Samsung" {...register("brand")} />
          <FieldError errors={[errors.brand]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="model">Model</FieldLabel>
          <Input id="model" placeholder="e.g. P2422H" {...register("model")} />
          <FieldError errors={[errors.model]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="partNumber">Part Number (MTM)</FieldLabel>
          <Input id="partNumber" placeholder="e.g. 62B9GAR1WW" {...register("partNumber")} />
          <FieldError errors={[formErrors.partNumber]} />
          <p className="text-xs text-neutral-500">
            The vendor&apos;s model code from the sticker on the back. Type it in — monitors don&apos;t report
            it, so the inventory agent can&apos;t fill this one in.
          </p>
        </Field>
      </Section>

      <Section title="Display" description="The panel itself.">
        <Field>
          <FieldLabel htmlFor="sizeInches">Screen Size (inches)</FieldLabel>
          <Input id="sizeInches" inputMode="decimal" placeholder="24" {...register("sizeInches")} />
          <FieldError errors={[formErrors.sizeInches]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="resolution">Resolution</FieldLabel>
          <Input id="resolution" placeholder="e.g. 1920x1080" {...register("resolution")} />
          <FieldError errors={[formErrors.resolution]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="refreshRateHz">Refresh Rate (Hz)</FieldLabel>
          <Input id="refreshRateHz" inputMode="numeric" placeholder="60" {...register("refreshRateHz")} />
          <FieldError errors={[formErrors.refreshRateHz]} />
        </Field>
        <Field>
          <FieldLabel>Panel Type</FieldLabel>
          <Controller
            control={control}
            name="panelType"
            render={({ field }) => (
              <OptionSelect
                value={field.value ?? "none"}
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                options={[{ value: "none", label: "— Not set —" }, ...PANEL_OPTIONS]}
                placeholder="Select panel type"
              />
            )}
          />
          <FieldError errors={[formErrors.panelType]} />
        </Field>
      </Section>

      <Section
        title="Video Inputs"
        description="Tick every port this monitor has, so a spare can be matched to a machine's outputs."
      >
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          {VIDEO_INPUTS.map((port) => (
            <CheckboxField key={port.key} label={port.label} {...register(port.key)} />
          ))}
        </div>
      </Section>

      <Section title="Built-in Features & Stand">
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          {BUILT_IN.map((feature) => (
            <CheckboxField key={feature.key} label={feature.label} {...register(feature.key)} />
          ))}
          <CheckboxField label="Pivot / Rotate" {...register("hasPivot")} />
          <CheckboxField label="Height Adjustable" {...register("heightAdjustable")} />
        </div>
        <Field>
          <FieldLabel htmlFor="vesaMount">VESA Mount</FieldLabel>
          <Input id="vesaMount" placeholder="e.g. 100x100" {...register("vesaMount")} />
          <FieldError errors={[formErrors.vesaMount]} />
          <p className="text-xs text-neutral-500">Leave blank if it can&apos;t be wall/arm mounted.</p>
        </Field>
      </Section>

      <Section
        title="Assignment"
        description={
          isEdit
            ? undefined
            : "Assign this monitor to a person after saving — that keeps a proper assignment history. To record which machine it's plugged into, connect it from that computer's page."
        }
      >
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
        </Field>
        {isEdit && (
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              )}
            />
            <FieldError errors={[errors.status]} />
          </Field>
        )}
      </Section>

      <Section title="Purchase & Warranty">
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
          <Input id="invoiceNumber" {...register("invoiceNumber")} />
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

      <Section title="Notes">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" rows={4} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Monitor"}
        </Button>
      </div>
    </form>
  );
}
