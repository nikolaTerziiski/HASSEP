import { getLocalISODate } from "@/lib/date/local-day";
import { requireRoleForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  TemperatureReportClient,
  type TemperatureReportCell,
  type TemperatureReportEquipment,
  type TemperatureReportMatrix,
} from "./TemperatureReportClient";

type TemperatureReportPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
    year?: string | string[];
  }>;
};

type TemperatureLogRow = {
  id: string;
  equipment_id: string;
  user_id: string;
  recorded_temp: number;
  recorded_at: string;
  corrective_action: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

function getDefaultMonthYear() {
  const [year, month] = getLocalISODate().split("-").map(Number);

  return {
    year,
    month,
  };
}

function resolveMonthYear(params?: {
  month?: string | string[];
  year?: string | string[];
}) {
  const defaults = getDefaultMonthYear();
  const parsedMonth = parsePositiveInteger(getSingleParam(params?.month));
  const parsedYear = parsePositiveInteger(getSingleParam(params?.year));

  return {
    month:
      parsedMonth !== null && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : defaults.month,
    year:
      parsedYear !== null && parsedYear >= 2000 && parsedYear <= 9999
        ? parsedYear
        : defaults.year,
  };
}

function buildMonthRange(year: number, month: number) {
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    daysInMonth: Array.from({ length: totalDays }, (_, index) => index + 1),
    monthStart: `${year}-${padTwo(month)}-01T00:00:00.000Z`,
    monthEndExclusive: `${nextMonthYear}-${padTwo(nextMonth)}-01T00:00:00.000Z`,
  };
}

function getDayOfMonth(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCDate();
}

export default async function TemperatureReportPage({
  searchParams,
}: TemperatureReportPageProps) {
  const profile = await requireRoleForPage(["owner", "manager"]);
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = await searchParams;
  const { month, year } = resolveMonthYear(resolvedSearchParams);
  const { daysInMonth, monthStart, monthEndExclusive } = buildMonthRange(
    year,
    month,
  );

  const [
    { data: equipmentData, error: equipmentError },
    { data: logData, error: logError },
    { data: profileData, error: profileError },
  ] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, type")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("haccp_logs")
      .select(
        "id, equipment_id, user_id, recorded_temp, recorded_at, corrective_action",
      )
      .eq("organization_id", profile.organization_id)
      .gte("recorded_at", monthStart)
      .lt("recorded_at", monthEndExclusive)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username")
      .eq("organization_id", profile.organization_id),
  ]);

  if (equipmentError) {
    throw new Error(equipmentError.message);
  }

  if (logError) {
    throw new Error(logError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  const equipment = (equipmentData ?? []) as TemperatureReportEquipment[];
  const logs = (logData ?? []) as TemperatureLogRow[];
  const profiles = (profileData ?? []) as ProfileRow[];

  const signedByUsername = new Map(
    profiles.map((profileRow) => [profileRow.id, profileRow.username]),
  );

  const matrix: TemperatureReportMatrix = Object.fromEntries(
    daysInMonth.map((day) => [
      day,
      Object.fromEntries(
        equipment.map((item) => [item.id, null as TemperatureReportCell | null]),
      ),
    ]),
  ) as TemperatureReportMatrix;

  // Logs are sorted newest-first, so the first one wins for each day/equipment cell.
  for (const log of logs) {
    const dayOfMonth = getDayOfMonth(log.recorded_at);

    if (
      dayOfMonth === null ||
      !(dayOfMonth in matrix) ||
      !(log.equipment_id in matrix[dayOfMonth]) ||
      matrix[dayOfMonth][log.equipment_id] !== null
    ) {
      continue;
    }

    matrix[dayOfMonth][log.equipment_id] = {
      temp: log.recorded_temp,
      correctiveAction: log.corrective_action?.trim() || null,
      signedBy: signedByUsername.get(log.user_id) ?? null,
    };
  }

  const organizationName = profile.organizations?.name ?? "Организация";

  return (
    <TemperatureReportClient
      matrix={matrix}
      equipment={equipment}
      daysInMonth={daysInMonth}
      month={month}
      year={year}
      organizationName={organizationName}
    />
  );
}
