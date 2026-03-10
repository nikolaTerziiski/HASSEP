import { describe, it, expect } from "vitest";
import { computeComplianceStatus, getMissingStaff, getMissingAreasFromRows, type StaffHygieneRow, type AreaHygieneRow } from "./reporting";

const makeReport = (overrides: {
  hygiene_missing?: number;
  facility_failed?: number;
  facility_missing?: number;
  facility_attention?: number;
  temp_out?: number;
} = {}) => ({
  personal_hygiene: {
    total_staff: 3,
    submitted: 3 - (overrides.hygiene_missing ?? 0),
    with_notes: 0,
    missing: overrides.hygiene_missing ?? 0,
  },
  facility_hygiene: {
    total_areas: 7,
    passed: 7 - (overrides.facility_failed ?? 0) - (overrides.facility_missing ?? 0) - (overrides.facility_attention ?? 0),
    failed: overrides.facility_failed ?? 0,
    needs_attention: overrides.facility_attention ?? 0,
    missing: overrides.facility_missing ?? 0,
  },
  temperature: {
    total_logs: 4,
    out_of_range: overrides.temp_out ?? 0,
  },
});

describe("computeComplianceStatus", () => {
  it("returns ok when everything is completed and in range", () => {
    expect(computeComplianceStatus(makeReport())).toBe("ok");
  });

  it("returns critical when temperature out of range", () => {
    expect(computeComplianceStatus(makeReport({ temp_out: 1 }))).toBe("critical");
  });

  it("returns critical when facility area failed", () => {
    expect(computeComplianceStatus(makeReport({ facility_failed: 1 }))).toBe("critical");
  });

  it("returns warning when hygiene checks missing", () => {
    expect(computeComplianceStatus(makeReport({ hygiene_missing: 1 }))).toBe("warning");
  });

  it("returns warning when facility areas missing", () => {
    expect(computeComplianceStatus(makeReport({ facility_missing: 2 }))).toBe("warning");
  });

  it("returns warning when facility needs attention", () => {
    expect(computeComplianceStatus(makeReport({ facility_attention: 1 }))).toBe("warning");
  });

  it("prefers critical over warning", () => {
    expect(computeComplianceStatus(makeReport({ temp_out: 1, hygiene_missing: 1 }))).toBe("critical");
  });
});

describe("getMissingStaff", () => {
  const members: StaffHygieneRow[] = [
    { id: "1", username: "alice", role: "staff", status: "completed", notes: null, submittedAt: "2024-01-01T08:00:00Z" },
    { id: "2", username: "bob", role: "staff", status: "missing", notes: null, submittedAt: null },
    { id: "3", username: "manager1", role: "manager", status: "notes", notes: "бележка", submittedAt: "2024-01-01T09:00:00Z" },
  ];

  it("returns only members with missing status", () => {
    const missing = getMissingStaff(members);
    expect(missing).toHaveLength(1);
    expect(missing[0].username).toBe("bob");
  });

  it("returns empty when all submitted", () => {
    const all = members.map((m) => ({ ...m, status: "completed" as const }));
    expect(getMissingStaff(all)).toHaveLength(0);
  });
});

describe("getMissingAreasFromRows", () => {
  const areas: AreaHygieneRow[] = [
    { area: "Кухня — подове", status: "passed", notes: null, corrective_action: null, performedAt: null },
    { area: "Санитарни помещения", status: "missing", notes: null, corrective_action: null, performedAt: null },
    { area: "Складово помещение", status: "failed", notes: "замърсен под", corrective_action: null, performedAt: null },
  ];

  it("returns only missing areas", () => {
    const missing = getMissingAreasFromRows(areas);
    expect(missing).toHaveLength(1);
    expect(missing[0].area).toBe("Санитарни помещения");
  });

  it("returns empty when no missing areas", () => {
    const all = areas.map((a) => ({ ...a, status: "passed" as const }));
    expect(getMissingAreasFromRows(all)).toHaveLength(0);
  });
});
