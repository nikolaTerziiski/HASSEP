export const FIRE_EXTINGUISHER_TYPE_OPTIONS = [
  { value: "water", label: "Воден" },
  { value: "powder", label: "Прахов" },
  { value: "co2", label: "CO2" },
] as const;

export const FIRE_EXTINGUISHER_STATUS_OPTIONS = [
  { value: "serviceable", label: "Изправен" },
  { value: "unserviceable", label: "Неизправен" },
] as const;

export type FireExtinguisherType = (typeof FIRE_EXTINGUISHER_TYPE_OPTIONS)[number]["value"];
export type FireExtinguisherStatus = (typeof FIRE_EXTINGUISHER_STATUS_OPTIONS)[number]["value"];

export function getFireExtinguisherTypeLabel(type: FireExtinguisherType) {
  return FIRE_EXTINGUISHER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getFireExtinguisherStatusLabel(status: FireExtinguisherStatus) {
  return FIRE_EXTINGUISHER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
