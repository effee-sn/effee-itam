"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/shared/OptionSelect";
import { REPORT_TYPES } from "@/modules/reports/constants";

export function ReportTypeSelector({ currentType }: { currentType: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <OptionSelect
      value={currentType}
      onValueChange={handleChange}
      options={REPORT_TYPES.map((type) => ({ value: type.value, label: type.label }))}
      placeholder="Select report"
      className="w-64"
    />
  );
}
