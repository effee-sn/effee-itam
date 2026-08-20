"use client";

import { useForm, Controller, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { OptionSelect } from "@/components/shared/OptionSelect";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";
import { assetSchemaFor } from "@/modules/assets/types/schemas";
import { descriptorFor, type FieldDescriptor } from "@/modules/assets/types/registry";
import type { AssetType } from "@/generated/prisma/client";
import { FormSection as Section, CheckboxField } from "./form-section";

type Option = { id: number; name: string };

export type AssetTypeFormValues = Record<string, unknown> & {
  assetType: AssetType;
  assetTag: string;
  status?: "AVAILABLE" | "ASSIGNED" | "UNDER_REPAIR" | "RETIRED" | "LOST";
};

export type AssetTypeFormAsset = AssetTypeFormValues & { id: number };

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
];

/**
 * The add/edit form for one asset type, locked to that type.
 *
 * There is no type or category picker: the page you're on decides what you're creating, and
 * `assetType` is submitted as a hidden constant. Which fields appear comes entirely from the
 * type's registry entry — its own detail fields, plus the shared fields it hasn't hidden — so
 * a Printer form shows printer things and a SIM form shows SIM things.
 *
 * Computers and Monitors deliberately do NOT use this: they carry enough fields to warrant
 * their own hand-grouped layouts (see computers/computer-form.tsx, monitors/monitor-form.tsx).
 */
export function AssetTypeForm({
  assetType,
  asset,
  vendors,
  departments,
}: {
  assetType: AssetType;
  asset?: AssetTypeFormAsset;
  vendors: Option[];
  departments: Option[];
}) {
  const isEdit = !!asset;
  const { isPending, navigate } = useGlobalProgress();
  const descriptor = descriptorFor(assetType);
  const hidden = new Set<string>(descriptor.hiddenBaseFields ?? []);
  const shows = (key: string) => !hidden.has(key);
  const labelFor = (key: string, fallback: string) =>
    (descriptor.baseFieldOverrides as Record<string, { label: string } | undefined> | undefined)?.[key]
      ?.label ?? fallback;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(assetSchemaFor(assetType)) as any,
    defaultValues: asset ?? { assetType },
  });

  const formErrors = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(data: FieldValues) {
    const url = isEdit ? `/api/assets/${asset.id}` : "/api/assets";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      // assetType is never user-editable — always the page's own type.
      body: JSON.stringify({ ...data, assetType }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(isEdit ? `${descriptor.labelSingular} updated` : `${descriptor.labelSingular} created`);
    navigate(`/assets/${isEdit ? asset.id : json.data.asset.id}`);
  }

  /** Renders one of the type's own detail fields according to its declared kind. */
  function DetailField({ field }: { field: FieldDescriptor }) {
    if (field.kind === "checkbox") {
      return (
        <div className="flex items-center">
          <CheckboxField label={field.label} {...register(field.key)} />
        </div>
      );
    }
    if (field.kind === "select") {
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <Controller
            control={control}
            name={field.key}
            render={({ field: f }) => (
              <OptionSelect
                value={(f.value as string) || "none"}
                onValueChange={(value) => f.onChange(value === "none" ? "" : value)}
                options={[{ value: "none", label: "— Not set —" }, ...(field.options ?? [])]}
                placeholder={`Select ${field.label.toLowerCase()}`}
              />
            )}
          />
          <FieldError errors={[formErrors[field.key]]} />
          {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
        </Field>
      );
    }
    return (
      <Field>
        <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
        <Input
          id={field.key}
          type={field.kind === "date" ? "date" : undefined}
          inputMode={field.kind === "number" ? "numeric" : field.kind === "decimal" ? "decimal" : undefined}
          placeholder={field.placeholder}
          {...register(field.key)}
        />
        <FieldError errors={[formErrors[field.key]]} />
        {field.help && <p className="text-xs text-neutral-500">{field.help}</p>}
      </Field>
    );
  }

  const pending = isSubmitting || isPending;
  const showsNetwork = shows("hostname") || shows("macAddress") || shows("ipAddress");
  const showsPurchase = shows("purchaseDate");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-5">
      <Section title="Identification">
        <Field>
          <FieldLabel htmlFor="assetTag">Asset Tag</FieldLabel>
          <Input id="assetTag" placeholder="e.g. EI-COM-014" {...register("assetTag")} />
          <FieldError errors={[formErrors.assetTag]} />
          <p className="text-xs text-neutral-500">
            Whatever is on the label. Must be unique.
          </p>
        </Field>
        <Field>
          <FieldLabel htmlFor="serialNumber">{labelFor("serialNumber", "Serial Number")}</FieldLabel>
          <Input id="serialNumber" {...register("serialNumber")} />
          <FieldError errors={[formErrors.serialNumber]} />
        </Field>
        {shows("brand") && (
          <Field>
            <FieldLabel htmlFor="brand">Manufacturer</FieldLabel>
            <Input id="brand" {...register("brand")} />
            <FieldError errors={[formErrors.brand]} />
          </Field>
        )}
        {shows("model") && (
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input id="model" {...register("model")} />
            <FieldError errors={[formErrors.model]} />
          </Field>
        )}
      </Section>

      {descriptor.fields.length > 0 && (
        <Section title={`${descriptor.labelSingular} Details`}>
          {descriptor.fields.map((field) => (
            <DetailField key={field.key} field={field} />
          ))}
        </Section>
      )}

      {showsNetwork && (
        <Section title="Network">
          {shows("hostname") && (
            <Field>
              <FieldLabel htmlFor="hostname">Hostname</FieldLabel>
              <Input id="hostname" {...register("hostname")} />
              <FieldError errors={[formErrors.hostname]} />
            </Field>
          )}
          {shows("macAddress") && (
            <Field>
              <FieldLabel htmlFor="macAddress">MAC Address</FieldLabel>
              <Input id="macAddress" placeholder="00:1A:2B:3C:4D:5E" {...register("macAddress")} />
              <FieldError errors={[formErrors.macAddress]} />
            </Field>
          )}
          {shows("ipAddress") && (
            <Field>
              <FieldLabel htmlFor="ipAddress">IP Address</FieldLabel>
              <Input id="ipAddress" placeholder="e.g. 192.168.1.50" {...register("ipAddress")} />
              <FieldError errors={[formErrors.ipAddress]} />
            </Field>
          )}
        </Section>
      )}

      <Section
        title="Assignment"
        description={
          isEdit
            ? undefined
            : `Assign this ${descriptor.labelSingular.toLowerCase()} to a person after saving — that keeps a proper assignment history.`
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
          <FieldError errors={[formErrors.departmentId]} />
        </Field>
        {isEdit && (
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <OptionSelect
                  value={(field.value as string) ?? ""}
                  onValueChange={field.onChange}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              )}
            />
            <FieldError errors={[formErrors.status]} />
          </Field>
        )}
      </Section>

      <Section title={showsPurchase ? "Purchase & Warranty" : "Supplier"}>
        <Field>
          <FieldLabel>{labelFor("vendorId", "Vendor")}</FieldLabel>
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
          <FieldError errors={[formErrors.vendorId]} />
        </Field>
        {showsPurchase && (
          <>
            <Field>
              <FieldLabel htmlFor="invoiceNumber">Invoice Number</FieldLabel>
              <Input id="invoiceNumber" {...register("invoiceNumber")} />
              <FieldError errors={[formErrors.invoiceNumber]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="purchaseDate">Purchase Date</FieldLabel>
              <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
              <FieldError errors={[formErrors.purchaseDate]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cost">Cost</FieldLabel>
              <Input id="cost" inputMode="decimal" placeholder="0.00" {...register("cost")} />
              <FieldError errors={[formErrors.cost]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="warrantyStart">Warranty Start</FieldLabel>
              <Input id="warrantyStart" type="date" {...register("warrantyStart")} />
              <FieldError errors={[formErrors.warrantyStart]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="warrantyEnd">Warranty End</FieldLabel>
              <Input id="warrantyEnd" type="date" {...register("warrantyEnd")} />
              <FieldError errors={[formErrors.warrantyEnd]} />
            </Field>
          </>
        )}
      </Section>

      <Section title="Notes">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" rows={4} {...register("notes")} />
          <FieldError errors={[formErrors.notes]} />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : isEdit ? "Save Changes" : `Create ${descriptor.labelSingular}`}
        </Button>
      </div>
    </form>
  );
}
