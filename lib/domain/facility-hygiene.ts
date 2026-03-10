export type FacilityAreaStatus = "passed" | "failed" | "needs_attention";

export type FacilityAreaLog = {
  area: string;
  status: FacilityAreaStatus;
  notes: string | null;
  corrective_action: string | null;
  performed_at: string | null;
};

export type AreaComplianceSummary = {
  total: number;
  passed: number;
  failed: number;
  needs_attention: number;
  missing: number;
  /** 0–100 compliance score */
  score: number;
};

/**
 * Returns true if the area has a critical compliance issue (failed status).
 */
export function isAreaCritical(log: FacilityAreaLog): boolean {
  return log.status === "failed";
}

/**
 * Returns true if corrective action is required but missing.
 */
export function needsCorrectiveAction(log: FacilityAreaLog): boolean {
  return (log.status === "failed" || log.status === "needs_attention") &&
    !log.corrective_action?.trim();
}

/**
 * Computes a compliance summary for the given set of areas vs completed logs.
 */
export function computeAreaSummary(
  allAreas: readonly string[],
  completedLogs: FacilityAreaLog[],
): AreaComplianceSummary {
  const logsByArea = new Map(completedLogs.map((l) => [l.area, l]));

  let passed = 0;
  let failed = 0;
  let needs_attention = 0;
  let missing = 0;

  for (const area of allAreas) {
    const log = logsByArea.get(area);
    if (!log) {
      missing++;
    } else if (log.status === "passed") {
      passed++;
    } else if (log.status === "failed") {
      failed++;
    } else {
      needs_attention++;
    }
  }

  const total = allAreas.length;
  const score = total === 0 ? 100 : Math.round((passed / total) * 100);

  return { total, passed, failed, needs_attention, missing, score };
}

/**
 * Returns areas not yet logged for the given set of all areas.
 */
export function getMissingAreas(
  allAreas: readonly string[],
  completedLogs: { area: string }[],
): string[] {
  const done = new Set(completedLogs.map((l) => l.area));
  return allAreas.filter((a) => !done.has(a));
}
