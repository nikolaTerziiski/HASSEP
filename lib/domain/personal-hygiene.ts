export const HYGIENE_CHECKLIST_ITEMS = [
  "Нямам стомашно-чревни разстройства или инфекции.",
  "Работното ми облекло е чисто.",
  "Нямам открити рани по ръцете.",
  "Ръцете ми са измити и дезинфекцирани.",
] as const;

export type HygieneChecklistItem = (typeof HYGIENE_CHECKLIST_ITEMS)[number];

/** Keyed by item label → passed (true) or failed (false). */
export type ChecklistResult = Record<string, boolean>;

/**
 * Returns true if every item in the checklist is marked passed.
 */
export function areAllPassed(result: ChecklistResult): boolean {
  return HYGIENE_CHECKLIST_ITEMS.every((item) => result[item] === true);
}

/**
 * Returns labels of items not explicitly marked as passed (including missing keys).
 */
export function getFailedItems(result: ChecklistResult): string[] {
  return HYGIENE_CHECKLIST_ITEMS.filter((item) => result[item] !== true);
}

/**
 * Builds a ChecklistResult from an array of booleans aligned with HYGIENE_CHECKLIST_ITEMS.
 */
export function buildChecklistResult(checked: boolean[]): ChecklistResult {
  return Object.fromEntries(
    HYGIENE_CHECKLIST_ITEMS.map((item, i) => [item, checked[i] ?? false]),
  );
}

/**
 * Auto-generates notes from failed items, prepended to any user notes.
 * Returns undefined if no failed items and no user notes.
 */
export function buildNotes(result: ChecklistResult, userNotes?: string): string | undefined {
  const failed = getFailedItems(result);
  const failedLine = failed.length > 0 ? `Непокрити: ${failed.join(", ")}` : "";
  const trimmedUser = userNotes?.trim() ?? "";

  if (!failedLine && !trimmedUser) return undefined;
  if (!failedLine) return trimmedUser;
  if (!trimmedUser) return failedLine;
  return `${failedLine}\n${trimmedUser}`;
}

export type HygieneLogStatus = "completed" | "notes" | "missing";

/**
 * Derives a display status from whether a log exists and has notes.
 */
export function deriveLogStatus(
  log: { notes: string | null } | null | undefined,
): HygieneLogStatus {
  if (!log) return "missing";
  return log.notes?.trim() ? "notes" : "completed";
}
