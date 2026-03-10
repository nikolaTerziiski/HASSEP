export const FACILITY_HYGIENE_STATUS_OPTIONS = [
  { value: "completed", label: "Изпълнено" },
  { value: "issue_found", label: "Проблем" },
] as const;

export type FacilityHygieneStatus = (typeof FACILITY_HYGIENE_STATUS_OPTIONS)[number]["value"];

export type UsedProductsSnapshotItem = {
  id: string;
  name: string;
};

export function getFacilityHygieneStatusLabel(status: FacilityHygieneStatus) {
  return FACILITY_HYGIENE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
