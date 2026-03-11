import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";
import { TemperatureForm } from "./temperature-form";

type TemperaturePageProps = {
  searchParams?: Promise<{
    equipment_id?: string;
  }>;
};

type EquipmentRow = {
  id: string;
  name: string;
  type: "fridge" | "freezer" | "room";
  min_temp: number;
  max_temp: number;
  is_active: boolean;
};

type RecentLogRow = {
  id: string;
  equipment_id: string;
  recorded_temp: number;
  recorded_at: string;
  is_out_of_range: boolean;
  corrective_action: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TemperaturePage({ searchParams }: TemperaturePageProps) {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const resolvedParams = await searchParams;

  const today = getLocalISODate();

  const [{ data, error }, { data: recentLogs }, { data: todayLogs }] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, type, min_temp, max_temp, is_active")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("haccp_logs")
      .select("id, equipment_id, recorded_temp, recorded_at, is_out_of_range, corrective_action")
      .eq("organization_id", profile.organization_id)
      .order("recorded_at", { ascending: false })
      .limit(20),
    supabase
      .from("haccp_logs")
      .select("equipment_id")
      .eq("organization_id", profile.organization_id)
      .gte("recorded_at", `${today}T00:00:00`)
      .lt("recorded_at", `${today}T23:59:59.999`),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const equipmentList = (data ?? []) as EquipmentRow[];
  const logRows = (recentLogs ?? []) as RecentLogRow[];
  const equipmentById = new Map(equipmentList.map((eq) => [eq.id, eq]));

  if (equipmentList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Температурен дневник</CardTitle>
          <CardDescription>Преди да записвате температури, добавете уреди от Настройки.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Няма активни уреди за текущата организация.
          </p>
        </CardContent>
      </Card>
    );
  }

  const alreadyLoggedIds = [
    ...new Set(
      ((todayLogs ?? []) as { equipment_id: string }[]).map((l) => l.equipment_id),
    ),
  ];

  return (
    <div className="space-y-4">
      <TemperatureForm
        equipmentList={equipmentList}
        alreadyLoggedIds={alreadyLoggedIds}
      />

      {logRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Последни записи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logRows.map((log) => {
                const eq = equipmentById.get(log.equipment_id);
                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      log.is_out_of_range
                        ? "border-red-200 bg-red-50"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {log.is_out_of_range ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                      <div>
                        <span className="font-medium">{eq?.name ?? "Уред"}</span>
                        <span className={`ml-2 font-bold tabular-nums ${
                          log.is_out_of_range ? "text-red-700" : "text-slate-900"
                        }`}>
                          {log.recorded_temp}°C
                        </span>
                        {log.corrective_action ? (
                          <p className="text-xs text-slate-500 line-clamp-1">{log.corrective_action}</p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(log.recorded_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
