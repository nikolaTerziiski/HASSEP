import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import { AttentionListCard } from "@/app/dashboard/_components/attention-list-card";
import { DailyControlMetricCard } from "@/app/dashboard/_components/daily-control-metric-card";
import { requireRoleForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";

type TeamProfileRow = {
  id: string;
  username: string;
  role: "manager" | "staff";
};

type PersonalHygieneLogRow = {
  user_id: string;
  notes: string | null;
};

type FacilityAreaRow = {
  id: string;
  name: string;
};

type FacilityHygieneLogRow = {
  area_id: string;
  status: "completed" | "issue_found";
};

type EquipmentRow = {
  id: string;
  name: string;
};

type TemperatureLogRow = {
  id: string;
  equipment_id: string;
  recorded_temp: number;
  recorded_at: string;
  is_out_of_range: boolean;
};

type IncomingLogRow = {
  id: string;
};

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
    { data: teamProfiles, error: teamError },
    { data: personalHygieneLogs, error: personalError },
    { data: facilityAreas, error: facilityAreasError },
    { data: facilityLogs, error: facilityLogsError },
    { data: equipment, error: equipmentError },
    { data: temperatureLogs, error: temperatureError },
    { data: incomingLogs, error: incomingError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, role")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .in("role", ["manager", "staff"])
      .order("username", { ascending: true }),
    supabase
      .from("personal_hygiene_logs")
      .select("user_id, notes")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today),
    supabase
      .from("facility_hygiene_areas")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .order("name", { ascending: true }),
    supabase
      .from("facility_hygiene_logs")
      .select("area_id, status")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today),
    supabase
      .from("equipment")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("haccp_logs")
      .select("id, equipment_id, recorded_temp, recorded_at, is_out_of_range")
      .eq("organization_id", profile.organization_id)
      .gte("recorded_at", start)
      .lt("recorded_at", end)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("incoming_logs")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("date", today),
  ]);

  if (teamError) throw new Error(teamError.message);
  if (personalError) throw new Error(personalError.message);
  if (facilityAreasError) throw new Error(facilityAreasError.message);
  if (facilityLogsError) throw new Error(facilityLogsError.message);
  if (equipmentError) throw new Error(equipmentError.message);
  if (temperatureError) throw new Error(temperatureError.message);
  if (incomingError) throw new Error(incomingError.message);

  const teamRows = (teamProfiles ?? []) as TeamProfileRow[];
  const personalRows = (personalHygieneLogs ?? []) as PersonalHygieneLogRow[];
  const facilityAreaRows = (facilityAreas ?? []) as FacilityAreaRow[];
  const facilityLogRows = (facilityLogs ?? []) as FacilityHygieneLogRow[];
  const equipmentRows = (equipment ?? []) as EquipmentRow[];
  const temperatureRows = (temperatureLogs ?? []) as TemperatureLogRow[];
  const incomingRows = (incomingLogs ?? []) as IncomingLogRow[];

  const personalLogByUser = new Map<string, PersonalHygieneLogRow>();
  for (const log of personalRows) {
    if (!personalLogByUser.has(log.user_id)) {
      personalLogByUser.set(log.user_id, log);
    }
  }

  const completedHygieneCount = teamRows.filter((member) => personalLogByUser.has(member.id)).length;
  const hygieneNotesCount = teamRows.filter((member) => {
    const notes = personalLogByUser.get(member.id)?.notes?.trim();
    return Boolean(notes);
  }).length;
  const missingHygieneMembers = teamRows
    .filter((member) => !personalLogByUser.has(member.id))
    .map((member) => member.username);

  const areaNameById = new Map(facilityAreaRows.map((area) => [area.id, area.name]));
  const completedAreaIds = new Set(facilityLogRows.map((log) => log.area_id));
  const issueAreaNames = facilityLogRows
    .filter((log) => log.status === "issue_found")
    .map((log) => areaNameById.get(log.area_id))
    .filter((name): name is string => Boolean(name));
  const missingFacilityAreas = facilityAreaRows
    .filter((area) => !completedAreaIds.has(area.id))
    .map((area) => area.name);

  const equipmentById = new Map(equipmentRows.map((item) => [item.id, item]));
  const loggedEquipmentIds = new Set(temperatureRows.map((log) => log.equipment_id));
  const missingTemperatureEquipment = equipmentRows
    .filter((item) => !loggedEquipmentIds.has(item.id))
    .map((item) => item.name);
  const criticalLogs = temperatureRows.filter((log) => log.is_out_of_range);
  const criticalLogPreview = criticalLogs.slice(0, 3).map((log) => {
    const equipmentName = equipmentById.get(log.equipment_id)?.name ?? "Неизвестен уред";
    return `${equipmentName}: ${log.recorded_temp}°C`;
  });

  const missingItems = [
    ...missingHygieneMembers.map((username) => `Лична хигиена: ${username}`),
    ...missingFacilityAreas.map((area) => `Хигиенно състояние: ${area}`),
    ...missingTemperatureEquipment.map((name) => `Температури: ${name}`),
  ];

  const personalTone =
    missingHygieneMembers.length > 0 ? "amber" : hygieneNotesCount > 0 ? "amber" : "emerald";
  const facilityTone =
    facilityAreaRows.length === 0
      ? "slate"
      : issueAreaNames.length > 0
        ? "red"
        : missingFacilityAreas.length > 0
          ? "amber"
          : "emerald";
  const temperatureTone =
    criticalLogs.length > 0
      ? "red"
      : missingTemperatureEquipment.length > 0
        ? "amber"
        : "emerald";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Дневен контрол</h2>
        <p className="text-sm text-slate-600">
          Бърз преглед на изпълнените HACCP дейности и липсите за {today}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DailyControlMetricCard
          title="Лична хигиена"
          value={`${completedHygieneCount} / ${teamRows.length}`}
          description="Служители с подадена проверка днес."
          icon={ShieldCheck}
          tone={personalTone}
          href="/dashboard/personal-hygiene"
          details={
            hygieneNotesCount > 0
              ? [`${hygieneNotesCount} записа са с бележки.`]
              : missingHygieneMembers.length > 0
                ? missingHygieneMembers.slice(0, 3).map((username) => `Липсва: ${username}`)
                : ["Всички активни служители са подали запис."]
          }
        />
        <DailyControlMetricCard
          title="Хигиенно състояние"
          value={`${completedAreaIds.size} / ${facilityAreaRows.length}`}
          description="Конфигурирани зони с дневно потвърждение."
          icon={ClipboardCheck}
          tone={facilityTone}
          href="/dashboard/facility-hygiene"
          details={
            facilityAreaRows.length === 0
              ? ["Няма конфигурирани зони."]
              : issueAreaNames.length > 0
                ? issueAreaNames.slice(0, 3).map((area) => `Проблем: ${area}`)
                : missingFacilityAreas.length > 0
                  ? missingFacilityAreas.slice(0, 3).map((area) => `Липсва: ${area}`)
                  : ["Всички зони са потвърдени."]
          }
        />
        <DailyControlMetricCard
          title="Температури"
          value={`${loggedEquipmentIds.size} / ${equipmentRows.length}`}
          description="Активни уреди с поне един запис днес."
          icon={Thermometer}
          tone={temperatureTone}
          href="/dashboard/temperature"
          details={
            missingTemperatureEquipment.length > 0
              ? missingTemperatureEquipment.slice(0, 3).map((name) => `Без запис: ${name}`)
              : ["Всички активни уреди имат запис днес."]
          }
        />
        <DailyControlMetricCard
          title="Критични отклонения"
          value={String(criticalLogs.length)}
          description="Записи извън допустимия диапазон за днес."
          icon={AlertTriangle}
          tone={criticalLogs.length > 0 ? "red" : "emerald"}
          href="/dashboard/temperature"
          details={criticalLogPreview.length > 0 ? criticalLogPreview : ["Няма критични отклонения."]}
        />
        <DailyControlMetricCard
          title="Входящ контрол"
          value={String(incomingRows.length)}
          description="Записи за доставки, създадени днес."
          icon={FileText}
          tone={incomingRows.length > 0 ? "emerald" : "slate"}
          href="/dashboard/incoming"
          details={
            incomingRows.length > 0
              ? [`${incomingRows.length} документа са обработени днес.`]
              : ["Няма входящи записи за днес."]
          }
        />
      </div>

      <AttentionListCard
        title="Липсващи действия"
        description="Незавършените ежедневни проверки, които изискват внимание."
        items={missingItems}
        emptyMessage="Няма липсващи действия за днес."
      />
    </section>
  );
}
