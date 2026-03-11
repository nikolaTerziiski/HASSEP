import { requireRoleForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";
import { DailyControlClient } from "./DailyControlClient";
import type { DashboardMetrics } from "./DailyControlClient";

function getTodayRange() {
  const today = getLocalISODate();
  const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

  return {
    today,
    start: `${today}T00:00:00.000Z`,
    end: tomorrowDate.toISOString(),
  };
}

export default async function DailyControlPage() {
  const profile = await requireRoleForPage(["owner", "manager"]);
  const supabase = await createServerSupabaseClient();
  const { today, start, end } = getTodayRange();

  const [
    { data: personalHygieneLogs, error: personalError },
    { data: facilityAreas, error: facilityAreasError },
    { data: facilityLogs, error: facilityLogsError },
    { data: equipment, error: equipmentError },
    { data: temperatureLogs, error: temperatureError },
    { data: powerShutoffLog, error: powerError },
  ] = await Promise.all([
    supabase
      .from("personal_hygiene_logs")
      .select("user_id")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today),
    supabase
      .from("facility_hygiene_areas")
      .select("id")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("facility_hygiene_logs")
      .select("area_id")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today),
    supabase
      .from("equipment")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true),
    supabase
      .from("haccp_logs")
      .select("equipment_id")
      .eq("organization_id", profile.organization_id)
      .gte("recorded_at", start)
      .lt("recorded_at", end),
    supabase
      .from("power_shutoff_logs")
      .select("shutoff_at")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today)
      .maybeSingle(),
  ]);

  if (personalError) throw new Error(personalError.message);
  if (facilityAreasError) throw new Error(facilityAreasError.message);
  if (facilityLogsError) throw new Error(facilityLogsError.message);
  if (equipmentError) throw new Error(equipmentError.message);
  if (temperatureError) throw new Error(temperatureError.message);
  if (powerError) throw new Error(powerError.message);

  const uniquePersonalIds = new Set(
    ((personalHygieneLogs ?? []) as { user_id: string }[]).map((l) => l.user_id),
  );
  const totalAreas = (facilityAreas ?? []).length;
  const loggedAreaIds = new Set(
    ((facilityLogs ?? []) as { area_id: string }[]).map((l) => l.area_id),
  );
  const totalEquipment = (equipment ?? []).length;
  const loggedEquipmentIds = new Set(
    ((temperatureLogs ?? []) as { equipment_id: string }[]).map(
      (l) => l.equipment_id,
    ),
  );

  const metrics: DashboardMetrics = {
    temperatures: {
      total: totalEquipment,
      logged: loggedEquipmentIds.size,
    },
    facilityHygiene: {
      total: totalAreas,
      logged: loggedAreaIds.size,
    },
    personalHygiene: {
      logged: uniquePersonalIds.size,
    },
    powerShutoff: {
      isShutoff: powerShutoffLog !== null,
      shutoffAt:
        (powerShutoffLog as { shutoff_at: string } | null)?.shutoff_at ?? null,
    },
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Дневен контрол</h2>
        <p className="text-sm text-slate-600">
          Бърз преглед на изпълнените HACCP дейности за {today}.
        </p>
      </div>

      <DailyControlClient metrics={metrics} />
    </section>
  );
}
