export type EquipmentTempRange = {
  min_temp: number;
  max_temp: number;
};

export function isTempOutOfRange(
  recordedTemp: number,
  equipment: EquipmentTempRange,
): boolean {
  return recordedTemp < equipment.min_temp || recordedTemp > equipment.max_temp;
}

export function requiresCorrectiveAction(
  recordedTemp: number,
  equipment: EquipmentTempRange,
): boolean {
  return isTempOutOfRange(recordedTemp, equipment);
}
