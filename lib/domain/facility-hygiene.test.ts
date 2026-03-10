import { describe, it, expect } from "vitest";
import {
  isAreaCritical,
  needsCorrectiveAction,
  computeAreaSummary,
  getMissingAreas,
  type FacilityAreaLog,
} from "./facility-hygiene";

const makeLog = (overrides: Partial<FacilityAreaLog> = {}): FacilityAreaLog => ({
  area: "Кухня — подове",
  status: "passed",
  notes: null,
  corrective_action: null,
  performed_at: new Date().toISOString(),
  ...overrides,
});

const AREAS = ["Кухня — работни плотове", "Кухня — подове", "Санитарни помещения"] as const;

describe("isAreaCritical", () => {
  it("returns true for failed status", () => {
    expect(isAreaCritical(makeLog({ status: "failed" }))).toBe(true);
  });

  it("returns false for passed", () => {
    expect(isAreaCritical(makeLog({ status: "passed" }))).toBe(false);
  });

  it("returns false for needs_attention", () => {
    expect(isAreaCritical(makeLog({ status: "needs_attention" }))).toBe(false);
  });
});

describe("needsCorrectiveAction", () => {
  it("returns true when failed and no corrective action", () => {
    expect(needsCorrectiveAction(makeLog({ status: "failed", corrective_action: null }))).toBe(true);
  });

  it("returns true when needs_attention and no corrective action", () => {
    expect(needsCorrectiveAction(makeLog({ status: "needs_attention", corrective_action: null }))).toBe(true);
  });

  it("returns false when failed but corrective action provided", () => {
    expect(needsCorrectiveAction(makeLog({ status: "failed", corrective_action: "Почистено" }))).toBe(false);
  });

  it("returns false when passed", () => {
    expect(needsCorrectiveAction(makeLog({ status: "passed" }))).toBe(false);
  });

  it("returns true when whitespace-only corrective action", () => {
    expect(needsCorrectiveAction(makeLog({ status: "failed", corrective_action: "   " }))).toBe(true);
  });
});

describe("computeAreaSummary", () => {
  it("returns all missing when no logs", () => {
    const summary = computeAreaSummary(AREAS, []);
    expect(summary.missing).toBe(3);
    expect(summary.passed).toBe(0);
    expect(summary.score).toBe(0);
  });

  it("returns 100 score when all areas passed", () => {
    const logs = AREAS.map((area) => makeLog({ area, status: "passed" }));
    const summary = computeAreaSummary(AREAS, logs);
    expect(summary.passed).toBe(3);
    expect(summary.missing).toBe(0);
    expect(summary.score).toBe(100);
  });

  it("computes partial score correctly", () => {
    const logs = [makeLog({ area: AREAS[0], status: "passed" })];
    const summary = computeAreaSummary(AREAS, logs);
    expect(summary.passed).toBe(1);
    expect(summary.missing).toBe(2);
    expect(summary.score).toBe(33);
  });

  it("counts failed and needs_attention separately", () => {
    const logs = [
      makeLog({ area: AREAS[0], status: "failed" }),
      makeLog({ area: AREAS[1], status: "needs_attention" }),
    ];
    const summary = computeAreaSummary(AREAS, logs);
    expect(summary.failed).toBe(1);
    expect(summary.needs_attention).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.score).toBe(0);
  });

  it("handles empty areas list", () => {
    const summary = computeAreaSummary([], []);
    expect(summary.total).toBe(0);
    expect(summary.score).toBe(100);
  });
});

describe("getMissingAreas", () => {
  it("returns all areas when no logs", () => {
    expect(getMissingAreas(AREAS, [])).toEqual([...AREAS]);
  });

  it("returns empty when all areas logged", () => {
    const logs = AREAS.map((area) => ({ area }));
    expect(getMissingAreas(AREAS, logs)).toEqual([]);
  });

  it("returns only unlogged areas", () => {
    const logs = [{ area: AREAS[0] }];
    const missing = getMissingAreas(AREAS, logs);
    expect(missing).toHaveLength(2);
    expect(missing).not.toContain(AREAS[0]);
  });
});
