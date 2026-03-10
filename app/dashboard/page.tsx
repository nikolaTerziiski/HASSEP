import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentStatusCard } from "@/app/dashboard/_components/equipment-status-card";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type EquipmentRow = {
  id: string;
  name: string;
  type: "fridge" | "freezer" | "room";
  min_temp: number;
  max_temp: number;
};

type HaccpLogRow = {
  id: string;
  equipment_id: string;
  recorded_temp: number;
  recorded_at: string;
  is_out_of_range: boolean;
};

export default async function DashboardOverviewPage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();

  const [{ data: equipment, error: equipmentError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase
        .from("equipment")
        .select("id, name, type, min_temp, max_temp")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("haccp_logs")
        .select("id, equipment_id, recorded_temp, recorded_at, is_out_of_range")
        .eq("organization_id", profile.organization_id)
        .order("recorded_at", { ascending: false })
        .limit(200),
    ]);

  if (equipmentError) {
    throw new Error(equipmentError.message);
  }

  if (logsError) {
    throw new Error(logsError.message);
  }

  const equipmentRows = (equipment ?? []) as EquipmentRow[];
  const logRows = (logs ?? []) as HaccpLogRow[];

  const latestByEquipment = new Map<string, HaccpLogRow>();
  for (const log of logRows) {
    if (!latestByEquipment.has(log.equipment_id)) {
      latestByEquipment.set(log.equipment_id, log);
    }
  }

  const criticalLogs = logRows.filter((log) => log.is_out_of_range).slice(0, 10);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Обзор на обекта</h2>
        <p className="text-sm text-slate-600">
          Следете текущото състояние на уредите и критичните отклонения.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Критични аларми ({criticalLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalLogs.length === 0 ? (
            <p className="text-sm text-emerald-700">Няма критични отклонения в последните записи.</p>
          ) : (
            <ul className="space-y-2 text-sm text-red-700">
              {criticalLogs.map((log) => {
                const currentEquipment = equipmentRows.find((item) => item.id === log.equipment_id);
                return (
                  <li key={log.id} className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    {currentEquipment?.name ?? "Неизвестен уред"}: {log.recorded_temp}°C
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {equipmentRows.map((item) => {
          const latestLog = latestByEquipment.get(item.id);

          return (
            <EquipmentStatusCard
              key={item.id}
              equipmentId={item.id}
              equipmentName={item.name}
              equipmentType={item.type}
              minTemp={item.min_temp}
              maxTemp={item.max_temp}
              lastRecordedTemp={latestLog?.recorded_temp ?? null}
              lastRecordedAt={latestLog?.recorded_at ?? null}
              isCritical={latestLog?.is_out_of_range ?? false}
            />
          );
        })}
      </div>
    </section>
  );
}
