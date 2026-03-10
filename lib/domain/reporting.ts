import type { HygieneLogStatus } from "./personal-hygiene";
import type { FacilityAreaStatus } from "./facility-hygiene";

export type TemperatureLogItem = {
  equipment_id: string;
  equipment_name: string;
  recorded_temp: number;
  is_out_of_range: boolean;
  corrective_action: string | null;
  recorded_at: string;
};

export type DailyReportData = {
  date: string;
  organization_name: string;
  personal_hygiene: {
    total_staff: number;
    submitted: number;
    with_notes: number;
    missing: number;
  };
  facility_hygiene: {
    total_areas: number;
    passed: number;
    failed: number;
    needs_attention: number;
    missing: number;
  };
  temperature: {
    total_logs: number;
    out_of_range: number;
  };
  incoming: {
    total_invoices: number;
  };
  /** Overall compliance: "ok" | "warning" | "critical" */
  compliance_status: "ok" | "warning" | "critical";
};

/**
 * Determines overall day compliance status from partial report data.
 * - "critical": any temperature out of range OR any facility area failed
 * - "warning": any missing hygiene checks OR any facility area needs attention
 * - "ok": everything completed and within range
 */
export function computeComplianceStatus(
  report: Pick<DailyReportData, "personal_hygiene" | "facility_hygiene" | "temperature">,
): "ok" | "warning" | "critical" {
  const { personal_hygiene, facility_hygiene, temperature } = report;

  if (temperature.out_of_range > 0 || facility_hygiene.failed > 0) {
    return "critical";
  }

  if (
    personal_hygiene.missing > 0 ||
    facility_hygiene.missing > 0 ||
    facility_hygiene.needs_attention > 0
  ) {
    return "warning";
  }

  return "ok";
}

export type StaffHygieneRow = {
  id: string;
  username: string;
  role: "manager" | "staff";
  status: HygieneLogStatus;
  notes: string | null;
  submittedAt: string | null;
};

export type AreaHygieneRow = {
  area: string;
  status: FacilityAreaStatus | "missing";
  notes: string | null;
  corrective_action: string | null;
  performedAt: string | null;
};

/**
 * Returns staff members who have not submitted a hygiene log.
 */
export function getMissingStaff(members: StaffHygieneRow[]): StaffHygieneRow[] {
  return members.filter((m) => m.status === "missing");
}

/**
 * Returns areas not yet inspected today.
 */
export function getMissingAreasFromRows(areas: AreaHygieneRow[]): AreaHygieneRow[] {
  return areas.filter((a) => a.status === "missing");
}
