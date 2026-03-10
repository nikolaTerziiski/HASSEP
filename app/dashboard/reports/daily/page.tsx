import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoleForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { formatLocalDate, getLocalISODate } from "@/lib/date/local-day";
import { deriveLogStatus } from "@/lib/domain/personal-hygiene";
import { computeComplianceStatus } from "@/lib/domain/reporting";
import { PrintButton } from "./print-button";

type TeamProfileRow = { id: string; username: string; role: "manager" | "staff" };
type HygieneLogRow = { user_id: string; notes: string | null; created_at: string };
type FacilityAreaRow = { id: string; name: string };
type UsedProductSnapshotItem = { id: string; name: string };
type FacilityLogRow = {
  area_id: string;
  status: "completed" | "issue_found";
  notes: string | null;
  corrective_action: string | null;
  used_products_snapshot: UsedProductSnapshotItem[] | null;
};
type TempLogRow = {
  id: string;
  equipment_id: string;
  recorded_temp: number;
  recorded_at: string;
  is_out_of_range: boolean;
  corrective_action: string | null;
};
type EquipmentRow = { id: string; name: string; type: string };
type IncomingLogRow = { id: string; supplier: string; invoice_number: string };

function StatusBadge({ status }: { status: "ok" | "warning" | "critical" }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    critical: "bg-red-100 text-red-800",
  };
  const labels = { ok: "В норма", warning: "Предупреждение", critical: "Критично" };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900 print:border-slate-300">
      {title}
    </h3>
  );
}

function formatProducts(snapshot: UsedProductSnapshotItem[] | null) {
  if (!snapshot || snapshot.length === 0) {
    return "—";
  }

  return snapshot.map((item) => item.name).join(", ");
}

export default async function DailyReportPage() {
  const profile = await requireRoleForPage(["owner", "manager"]);
  const supabase = await createServerSupabaseClient();
  const today = getLocalISODate();
  const displayDate = formatLocalDate(today);
  const orgName = profile.organizations?.name ?? "Организация";

  const todayStart = `${today}T00:00:00.000Z`;
  const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const todayEnd = tomorrowDate.toISOString();

  const [
    { data: teamProfiles },
    { data: personalLogs },
    { data: facilityAreas },
    { data: facilityLogs },
    { data: equipment },
    { data: tempLogs },
    { data: incomingLogs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, role")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .in("role", ["manager", "staff"])
      .order("username"),
    supabase
      .from("personal_hygiene_logs")
      .select("user_id, notes, created_at")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today)
      .order("created_at", { ascending: false }),
    supabase
      .from("facility_hygiene_areas")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .order("name", { ascending: true }),
    supabase
      .from("facility_hygiene_logs")
      .select("area_id, status, notes, corrective_action, used_products_snapshot")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today),
    supabase
      .from("equipment")
      .select("id, name, type")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("haccp_logs")
      .select("id, equipment_id, recorded_temp, recorded_at, is_out_of_range, corrective_action")
      .eq("organization_id", profile.organization_id)
      .gte("recorded_at", todayStart)
      .lt("recorded_at", todayEnd)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("incoming_logs")
      .select("id, supplier, invoice_number")
      .eq("organization_id", profile.organization_id)
      .eq("date", today),
  ]);

  const team = (teamProfiles ?? []) as TeamProfileRow[];
  const hygieneByUser = new Map<string, HygieneLogRow>();
  for (const log of (personalLogs ?? []) as HygieneLogRow[]) {
    if (!hygieneByUser.has(log.user_id)) {
      hygieneByUser.set(log.user_id, log);
    }
  }
  const facilityAreaRows = (facilityAreas ?? []) as FacilityAreaRow[];
  const facilityRows = (facilityLogs ?? []) as FacilityLogRow[];
  const facilityByAreaId = new Map(facilityRows.map((row) => [row.area_id, row]));
  const equipmentRows = (equipment ?? []) as EquipmentRow[];
  const equipmentById = new Map(equipmentRows.map((item) => [item.id, item]));
  const tempRows = (tempLogs ?? []) as TempLogRow[];
  const incomingRows = (incomingLogs ?? []) as IncomingLogRow[];

  const hygieneMissing = team.filter((member) => !hygieneByUser.has(member.id)).length;
  const facilityMissing = facilityAreaRows.filter((area) => !facilityByAreaId.has(area.id)).length;
  const facilityIssueCount = facilityRows.filter((row) => row.status === "issue_found").length;
  const tempOutOfRange = tempRows.filter((row) => row.is_out_of_range).length;

  const complianceStatus = computeComplianceStatus({
    personal_hygiene: {
      total_staff: team.length,
      submitted: team.length - hygieneMissing,
      with_notes: 0,
      missing: hygieneMissing,
    },
    facility_hygiene: {
      total_areas: facilityAreaRows.length,
      passed: facilityAreaRows.length - facilityMissing - facilityIssueCount,
      failed: facilityIssueCount,
      needs_attention: 0,
      missing: facilityMissing,
    },
    temperature: { total_logs: tempRows.length, out_of_range: tempOutOfRange },
  });

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-semibold">Дневен доклад</h2>
          <p className="text-sm text-slate-600">Пълен ХАСЕП доклад за {displayDate}.</p>
        </div>
        <PrintButton />
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{orgName} - Дневен ХАСЕП доклад</h1>
        <p className="text-sm text-slate-600">
          {displayDate} | Генерирано: {new Date().toLocaleTimeString("bg-BG")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Обща оценка на съответствието</span>
            <StatusBadge status={complianceStatus} />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {team.length - hygieneMissing}/{team.length}
            </p>
            <p className="text-xs text-slate-600">Лична хигиена</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {facilityAreaRows.length - facilityMissing}/{facilityAreaRows.length}
            </p>
            <p className="text-xs text-slate-600">Зони потвърдени</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className={`text-2xl font-bold ${tempOutOfRange > 0 ? "text-red-700" : "text-slate-900"}`}>
              {tempOutOfRange}
            </p>
            <p className="text-xs text-slate-600">Критични темп.</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{incomingRows.length}</p>
            <p className="text-xs text-slate-600">Входящи записи</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Лична хигиена на екипа</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionHeader title="Проверки на служители" />
          {team.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Няма активни служители.</p>
          ) : (
            <table className="mt-2 min-w-full text-sm print:text-xs">
              <thead className="text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Служител</th>
                  <th className="py-1.5 pr-4">Статус</th>
                  <th className="py-1.5">Бележки</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => {
                  const log = hygieneByUser.get(member.id) ?? null;
                  const status = deriveLogStatus(log);
                  return (
                    <tr key={member.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium">{member.username}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "notes"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {status === "completed"
                            ? "Минал"
                            : status === "notes"
                              ? "Има бележки"
                              : "Липсва"}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{log?.notes?.trim() || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Хигиенно състояние на обекта</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionHeader title="Потвърждения по зони" />
          {facilityAreaRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Няма конфигурирани зони.</p>
          ) : (
            <table className="mt-2 min-w-full text-sm print:text-xs">
              <thead className="text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Зона</th>
                  <th className="py-1.5 pr-4">Статус</th>
                  <th className="py-1.5 pr-4">Препарати</th>
                  <th className="py-1.5">Бележки / Коригиращо действие</th>
                </tr>
              </thead>
              <tbody>
                {facilityAreaRows.map((area) => {
                  const log = facilityByAreaId.get(area.id);
                  const status = log?.status ?? "missing";

                  return (
                    <tr key={area.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium">{area.name}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "issue_found"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status === "completed"
                            ? "Изпълнено"
                            : status === "issue_found"
                              ? "Проблем"
                              : "Не е потвърдено"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {log ? formatProducts(log.used_products_snapshot) : "—"}
                      </td>
                      <td className="py-2 text-slate-600">
                        {log?.corrective_action?.trim() || log?.notes?.trim() || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Температурен дневник</CardTitle>
        </CardHeader>
        <CardContent>
          {tempRows.length === 0 ? (
            <p className="text-sm text-slate-500">Няма температурни записи за днес.</p>
          ) : (
            <table className="min-w-full text-sm print:text-xs">
              <thead className="text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Уред</th>
                  <th className="py-1.5 pr-4">Температура</th>
                  <th className="py-1.5 pr-4">Час</th>
                  <th className="py-1.5">Коригиращо действие</th>
                </tr>
              </thead>
              <tbody>
                {tempRows.map((log) => {
                  const equipmentItem = equipmentById.get(log.equipment_id);
                  return (
                    <tr
                      key={log.id}
                      className={`border-t border-slate-100 ${log.is_out_of_range ? "bg-red-50/50" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium">{equipmentItem?.name ?? "—"}</td>
                      <td className={`py-2 pr-4 font-bold tabular-nums ${log.is_out_of_range ? "text-red-700" : ""}`}>
                        {log.recorded_temp}°C
                      </td>
                      <td className="py-2 pr-4 text-slate-500 tabular-nums">
                        {new Intl.DateTimeFormat("bg-BG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(log.recorded_at))}
                      </td>
                      <td className="py-2 text-slate-600">{log.corrective_action?.trim() || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Входящ контрол на доставки</CardTitle>
        </CardHeader>
        <CardContent>
          {incomingRows.length === 0 ? (
            <p className="text-sm text-slate-500">Няма входящи записи за днес.</p>
          ) : (
            <table className="min-w-full text-sm print:text-xs">
              <thead className="text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Доставчик</th>
                  <th className="py-1.5">Фактура №</th>
                </tr>
              </thead>
              <tbody>
                {incomingRows.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium">{log.supplier}</td>
                    <td className="py-2 text-slate-600">{log.invoice_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <div className="mt-8 grid grid-cols-2 gap-16">
          <div>
            <p className="text-xs text-slate-500">Изготвил:</p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-xs text-slate-500">Подпис и дата</div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Проверил (Мениджър):</p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-xs text-slate-500">Подпис и дата</div>
          </div>
        </div>
      </div>
    </div>
  );
}
