"use client";

import { useState } from "react";
import {
  Printer,
  Thermometer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─────────────────────────── Types ─────────────────────────── */

export type TemperatureReportEquipment = {
  id: string;
  name: string;
  type: "fridge" | "freezer" | "room";
};

export type TemperatureReportCell = {
  temp: number;
  correctiveAction: string | null;
  signedBy: string | null;
};

export type TemperatureReportMatrix = Record<
  number,
  Record<string, TemperatureReportCell | null>
>;

export type TemperatureReportClientProps = {
  matrix: TemperatureReportMatrix;
  equipment: TemperatureReportEquipment[];
  daysInMonth: number[];
  month: number;
  year: number;
  organizationName: string;
};

/* ─────────────────────────── Helpers ────────────────────────── */

const MONTH_NAMES_BG = [
  "Януари",
  "Февруари",
  "Март",
  "Април",
  "Май",
  "Юни",
  "Юли",
  "Август",
  "Септември",
  "Октомври",
  "Ноември",
  "Декември",
];

function formatType(type: TemperatureReportEquipment["type"]) {
  if (type === "fridge") return "Хл.";
  if (type === "freezer") return "Фр.";
  return "Пом.";
}

function getDayOfWeekBg(year: number, month: number, day: number) {
  const names = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return names[new Date(year, month - 1, day).getDay()];
}

function isWeekend(year: number, month: number, day: number) {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

/* ──────────────────────── Main component ────────────────────── */

export function TemperatureReportClient({
  matrix,
  equipment,
  daysInMonth,
  month,
  year,
  organizationName,
}: TemperatureReportClientProps) {
  const [showCorrective, setShowCorrective] = useState(true);

  // Stats
  let totalCells = 0;
  let filledCells = 0;
  let outOfRangeCells = 0;

  for (const day of daysInMonth) {
    for (const eq of equipment) {
      totalCells++;
      const cell = matrix[day]?.[eq.id];
      if (cell) {
        filledCells++;
        if (cell.correctiveAction) outOfRangeCells++;
      }
    }
  }

  const coveragePercent =
    totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ════════ Screen-only toolbar ════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Thermometer className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {MONTH_NAMES_BG[month - 1]} {year}
            </h2>
            <p className="text-xs text-slate-500">
              Температурен дневник &middot; {equipment.length} уреда
              &middot; Покритие {coveragePercent}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Month navigation */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 rounded-lg"
          >
            <a
              href={`?month=${month === 1 ? 12 : month - 1}&year=${month === 1 ? year - 1 : year}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 rounded-lg"
          >
            <a
              href={`?month=${month === 12 ? 1 : month + 1}&year=${month === 12 ? year + 1 : year}`}
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
          {/* Toggle corrective actions visibility */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg text-xs"
            onClick={() => setShowCorrective((prev) => !prev)}
          >
            {showCorrective ? "Скрий бележки" : "Покажи бележки"}
          </Button>
          {/* Print */}
          <Button
            onClick={() => window.print()}
            className="h-9 rounded-lg"
            size="sm"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Принтирай
          </Button>
        </div>
      </div>

      {/* ════════ Print header (hidden on screen) ════════ */}
      <div className="hidden print:block">
        <h1 className="text-center text-base font-bold uppercase tracking-wide">
          {organizationName}
        </h1>
        <h2 className="mt-1 text-center text-sm font-semibold">
          Температурен дневник &mdash; {MONTH_NAMES_BG[month - 1]} {year}
        </h2>
        <p className="mt-0.5 text-center text-[10px] text-slate-500">
          Генерирано: {new Date().toLocaleDateString("bg-BG")} г.
        </p>
      </div>

      {/* ════════ Summary bar (screen) ════════ */}
      <div className="grid grid-cols-3 gap-3 print:hidden">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-emerald-900">
            {filledCells}
          </p>
          <p className="text-xs text-emerald-700">Записа</p>
        </div>
        <div
          className={`rounded-xl border p-3 text-center ${
            outOfRangeCells > 0
              ? "border-red-200 bg-red-50/80"
              : "border-slate-200 bg-white"
          }`}
        >
          <p
            className={`text-2xl font-extrabold tracking-tight ${
              outOfRangeCells > 0 ? "text-red-900" : "text-slate-900"
            }`}
          >
            {outOfRangeCells}
          </p>
          <p
            className={`text-xs ${outOfRangeCells > 0 ? "text-red-700" : "text-slate-500"}`}
          >
            Отклонения
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">
            {coveragePercent}%
          </p>
          <p className="text-xs text-slate-500">Покритие</p>
        </div>
      </div>

      {/* ════════ THE TABLE ════════ */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white print:overflow-visible print:rounded-none print:border-black">
        <table className="w-full border-collapse text-[11px] print:text-[9px]">
          {/* Column header */}
          <thead>
            {/* Equipment names row */}
            <tr className="border-b-2 border-slate-400 bg-slate-50 print:border-black print:bg-white">
              <th
                rowSpan={2}
                className="sticky left-0 z-10 w-16 border-r border-slate-300 bg-slate-50 px-2 py-2 text-center font-bold text-slate-700 print:static print:border-black print:bg-white"
              >
                Дата
              </th>
              {equipment.map((eq) => (
                <th
                  key={eq.id}
                  colSpan={showCorrective ? 2 : 1}
                  className="border-l border-slate-300 px-2 py-2 text-center font-bold text-slate-800 print:border-black"
                >
                  {eq.name}
                </th>
              ))}
              <th
                rowSpan={2}
                className="w-20 border-l border-slate-300 px-2 py-2 text-center font-bold text-slate-700 print:border-black"
              >
                Подпис
              </th>
            </tr>
            {/* Sub-header row */}
            <tr className="border-b border-slate-300 bg-slate-50/80 print:border-black print:bg-white">
              {equipment.map((eq) => (
                <Fragment key={eq.id}>
                  <th className="border-l border-slate-200 px-1.5 py-1 text-center text-[10px] font-medium text-slate-500 print:border-black print:text-[8px]">
                    °C{" "}
                    <span className="text-slate-400">
                      ({formatType(eq.type)})
                    </span>
                  </th>
                  {showCorrective && (
                    <th className="border-l border-slate-200 px-1.5 py-1 text-center text-[10px] font-medium text-slate-500 print:border-black print:text-[8px]">
                      Кор. действие
                    </th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {daysInMonth.map((day) => {
              const dayRow = matrix[day];
              const weekend = isWeekend(year, month, day);
              const dow = getDayOfWeekBg(year, month, day);

              // Check if any cell has a corrective action
              const hasAnyCorrective = equipment.some(
                (eq) => dayRow?.[eq.id]?.correctiveAction,
              );

              // Check if row is completely empty
              const isEmptyRow = equipment.every(
                (eq) => !dayRow?.[eq.id],
              );

              // Collect unique signers for this day
              const signers = new Set<string>();
              for (const eq of equipment) {
                const cell = dayRow?.[eq.id];
                if (cell?.signedBy) signers.add(cell.signedBy);
              }

              return (
                <tr
                  key={day}
                  className={[
                    "border-b border-slate-200 print:border-slate-400",
                    weekend
                      ? "bg-slate-50/60 print:bg-white"
                      : "bg-white",
                    hasAnyCorrective ? "bg-red-50/40 print:bg-white" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Day cell */}
                  <td
                    className={`sticky left-0 z-10 border-r border-slate-300 px-2 py-1.5 text-center font-semibold tabular-nums print:static print:border-black ${
                      weekend
                        ? "bg-slate-50/60 text-slate-400 print:bg-white"
                        : "bg-white text-slate-800"
                    }`}
                  >
                    <span className="block">{day}</span>
                    <span
                      className={`block text-[9px] font-normal ${weekend ? "text-slate-400" : "text-slate-400"}`}
                    >
                      {dow}
                    </span>
                  </td>

                  {/* Equipment cells */}
                  {equipment.map((eq) => {
                    const cell = dayRow?.[eq.id] ?? null;

                    return (
                      <Fragment key={eq.id}>
                        {/* Temperature value */}
                        <td
                          className={`border-l border-slate-200 px-2 py-1.5 text-center tabular-nums print:border-slate-400 ${
                            cell
                              ? cell.correctiveAction
                                ? "font-bold text-red-700"
                                : "font-semibold text-slate-900"
                              : isEmptyRow
                                ? "text-slate-300"
                                : "text-slate-300"
                          }`}
                        >
                          {cell ? (
                            <span className="inline-flex items-center justify-center gap-0.5">
                              {cell.correctiveAction && (
                                <AlertTriangle className="inline h-3 w-3 shrink-0 text-red-500 print:hidden" />
                              )}
                              {cell.temp}°
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Corrective action */}
                        {showCorrective && (
                          <td className="max-w-[120px] truncate border-l border-slate-200 px-1.5 py-1.5 text-[10px] text-slate-500 print:max-w-[80px] print:border-slate-400 print:text-[8px]">
                            {cell?.correctiveAction ? (
                              <span className="font-medium text-red-700">
                                {cell.correctiveAction}
                              </span>
                            ) : (
                              ""
                            )}
                          </td>
                        )}
                      </Fragment>
                    );
                  })}

                  {/* Signature cell */}
                  <td className="border-l border-slate-300 px-2 py-1.5 text-center text-[10px] text-slate-600 print:border-black print:text-[8px]">
                    {signers.size > 0
                      ? [...signers].join(", ")
                      : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════════ Print footer (hidden on screen) ════════ */}
      <div className="hidden print:block">
        <div className="mt-6 grid grid-cols-3 gap-6 text-[10px]">
          <div className="text-center">
            <p className="text-slate-500">Общо записи: {filledCells}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500">Отклонения: {outOfRangeCells}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500">Покритие: {coveragePercent}%</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-16">
          <div>
            <p className="text-[10px] text-slate-500">Изготвил:</p>
            <div className="mt-10 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
              Подпис / Дата
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">
              Проверил (Мениджър):
            </p>
            <div className="mt-10 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
              Подпис / Дата
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────── React.Fragment shorthand for JSX ─────── */
function Fragment({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
