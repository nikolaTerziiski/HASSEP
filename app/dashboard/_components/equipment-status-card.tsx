import Link from "next/link";
import { AlertTriangle, CheckCircle2, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EquipmentStatusCardProps = {
  equipmentId: string;
  equipmentName: string;
  equipmentType: "fridge" | "freezer" | "room";
  minTemp: number;
  maxTemp: number;
  lastRecordedTemp: number | null;
  lastRecordedAt: string | null;
  isCritical: boolean;
};

function formatType(type: "fridge" | "freezer" | "room") {
  if (type === "fridge") return "Хладилник";
  if (type === "freezer") return "Фризер";
  return "Помещение";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EquipmentStatusCard({
  equipmentId,
  equipmentName,
  equipmentType,
  minTemp,
  maxTemp,
  lastRecordedTemp,
  lastRecordedAt,
  isCritical,
}: EquipmentStatusCardProps) {
  return (
    <Link
      href={`/dashboard/temperature?equipment_id=${equipmentId}`}
      className="block"
    >
      <Card className={`transition active:scale-[0.98] ${isCritical ? "border-red-300 bg-red-50/30" : "border-emerald-200"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-start justify-between gap-2 text-sm">
            <div>
              <p className="font-semibold">{equipmentName}</p>
              <p className="text-xs font-normal text-slate-500">
                {formatType(equipmentType)} · {minTemp}°C – {maxTemp}°C
              </p>
            </div>
            {isCritical ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Критично
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                OK
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between pt-0">
          <div className="flex items-center gap-1.5">
            <Thermometer className={`h-5 w-5 ${isCritical ? "text-red-500" : "text-slate-400"}`} />
            <span className={`text-2xl font-bold tabular-nums ${isCritical ? "text-red-700" : "text-slate-900"}`}>
              {lastRecordedTemp === null ? "–" : `${lastRecordedTemp}°C`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {lastRecordedAt ? formatDateTime(lastRecordedAt) : "Няма данни"}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
