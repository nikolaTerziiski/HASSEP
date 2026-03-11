"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Thermometer,
  Snowflake,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createTemperatureLogAction } from "./actions";

type EquipmentType = "fridge" | "freezer" | "room";

type Equipment = {
  id: string;
  name: string;
  type: EquipmentType;
  min_temp: number;
  max_temp: number;
};

type TemperatureFormProps = {
  equipmentList: Equipment[];
  alreadyLoggedIds?: string[];
  /** @deprecated kept for backwards compat with page.tsx */
  preselectedEquipmentId?: string;
};

type EntryState = {
  temp: string;
  correctiveAction: string;
};

function isInRange(temp: number, eq: Equipment): boolean {
  return temp >= eq.min_temp && temp <= eq.max_temp;
}

function equipmentIcon(type: EquipmentType) {
  if (type === "freezer") return Snowflake;
  return Thermometer;
}

export function TemperatureForm({
  equipmentList,
  alreadyLoggedIds = [],
}: TemperatureFormProps) {
  const loggedSet = useMemo(
    () => new Set(alreadyLoggedIds),
    [alreadyLoggedIds],
  );

  const [entries, setEntries] = useState<Record<string, EntryState>>(() => {
    const init: Record<string, EntryState> = {};
    for (const eq of equipmentList) {
      if (!loggedSet.has(eq.id)) {
        init[eq.id] = { temp: "", correctiveAction: "" };
      }
    }
    return init;
  });

  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateEntry = useCallback(
    (id: string, patch: Partial<EntryState>) => {
      setEntries((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    [],
  );

  const stepTemp = useCallback((id: string, delta: number) => {
    setEntries((prev) => {
      const current = prev[id];
      const currentVal = current.temp === "" ? 0 : parseFloat(current.temp);
      const next = Math.round((currentVal + delta) * 10) / 10;
      return {
        ...prev,
        [id]: { ...current, temp: String(next) },
      };
    });
  }, []);

  // Collect pending vs completed equipment
  const pendingEquipment = equipmentList.filter(
    (eq) => !loggedSet.has(eq.id) && !justSaved.has(eq.id),
  );
  const completedEquipment = equipmentList.filter(
    (eq) => loggedSet.has(eq.id) || justSaved.has(eq.id),
  );

  // Entries that are valid and ready to submit
  const filledEntries = pendingEquipment.filter((eq) => {
    const entry = entries[eq.id];
    if (!entry || entry.temp === "") return false;
    const temp = parseFloat(entry.temp);
    if (Number.isNaN(temp)) return false;
    if (!isInRange(temp, eq) && !entry.correctiveAction.trim()) return false;
    return true;
  });

  const canSubmit = filledEntries.length > 0 && !isPending;

  const handleSubmitAll = () => {
    setServerError(null);

    startTransition(async () => {
      const toSubmit = filledEntries.map((eq) => ({
        eq,
        entry: entries[eq.id],
      }));

      const results = await Promise.all(
        toSubmit.map(({ eq, entry }) =>
          createTemperatureLogAction({
            equipmentId: eq.id,
            recordedTemp: parseFloat(entry.temp),
            correctiveAction: entry.correctiveAction.trim() || undefined,
          }).then((res) => ({ eqId: eq.id, ...res })),
        ),
      );

      const succeeded = results.filter((r) => r.ok).map((r) => r.eqId);
      const failed = results.filter((r) => !r.ok);

      if (succeeded.length > 0) {
        setJustSaved((prev) => {
          const next = new Set(prev);
          for (const id of succeeded) next.add(id);
          return next;
        });
      }

      if (failed.length > 0) {
        setServerError(
          `Грешка при ${failed.length} от ${results.length} записа: ${failed[0].message}`,
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Section label */}
      {pendingEquipment.length > 0 && (
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Очакващи проверка — {pendingEquipment.length} уреда
        </p>
      )}

      {/* ── Pending equipment cards ── */}
      {pendingEquipment.map((eq) => {
        const entry = entries[eq.id] ?? { temp: "", correctiveAction: "" };
        const tempVal = entry.temp === "" ? null : parseFloat(entry.temp);
        const hasValue = tempVal !== null && !Number.isNaN(tempVal);
        const inRange = hasValue ? isInRange(tempVal, eq) : null;
        const Icon = equipmentIcon(eq.type);

        let cardClasses = "rounded-2xl border-2 transition-all duration-200";
        if (!hasValue) {
          cardClasses += " border-slate-200 bg-white";
        } else if (inRange) {
          cardClasses += " border-emerald-300 bg-emerald-50/60";
        } else {
          cardClasses += " border-red-300 bg-red-50/60";
        }

        return (
          <Card key={eq.id} className={cardClasses}>
            <CardContent className="px-5 py-5">
              {/* Equipment header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      !hasValue
                        ? "bg-slate-100 text-slate-400"
                        : inRange
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {eq.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {eq.min_temp}°C – {eq.max_temp}°C
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                {hasValue && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      inRange
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {inRange ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Нормална
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Критично!
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── Stepper input ── */}
              <div className="flex items-center gap-2">
                {/* Minus button */}
                <button
                  type="button"
                  onClick={() => stepTemp(eq.id, -0.5)}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition active:scale-95 active:bg-slate-200"
                  aria-label="Намали с 0.5°C"
                >
                  <Minus className="h-6 w-6" />
                </button>

                {/* Temperature input */}
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="—"
                    value={entry.temp}
                    onChange={(e) =>
                      updateEntry(eq.id, { temp: e.target.value })
                    }
                    className={`h-14 w-full rounded-xl border-2 bg-white text-center text-3xl font-bold tabular-nums outline-none transition-colors ${
                      !hasValue
                        ? "border-slate-200 text-slate-900 focus:border-slate-400"
                        : inRange
                          ? "border-emerald-300 text-emerald-700 focus:border-emerald-500"
                          : "border-red-300 text-red-700 focus:border-red-500"
                    }`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    °C
                  </span>
                </div>

                {/* Plus button */}
                <button
                  type="button"
                  onClick={() => stepTemp(eq.id, 0.5)}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition active:scale-95 active:bg-slate-200"
                  aria-label="Увеличи с 0.5°C"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* ── Out-of-range: corrective action ── */}
              {hasValue && !inRange && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl bg-red-100/80 px-3 py-2 text-xs font-semibold text-red-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Извън допустимия диапазон! Въведете корективно действие.
                  </div>
                  <Textarea
                    placeholder="Напр. преместих продуктите в друг хладилник…"
                    value={entry.correctiveAction}
                    onChange={(e) =>
                      updateEntry(eq.id, {
                        correctiveAction: e.target.value,
                      })
                    }
                    className="min-h-20 rounded-xl border-red-200 bg-white text-base focus-visible:ring-red-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Submit all button ── */}
      {pendingEquipment.length > 0 && (
        <Button
          onClick={handleSubmitAll}
          disabled={!canSubmit}
          className={`h-16 w-full rounded-2xl text-lg font-bold shadow-lg transition-all ${
            canSubmit
              ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
              : "cursor-not-allowed bg-slate-300 text-slate-500"
          }`}
        >
          <Save className="mr-2 h-6 w-6" />
          {isPending
            ? "Записване…"
            : canSubmit
              ? `Запиши температурите (${filledEntries.length})`
              : "Въведете температури"}
        </Button>
      )}

      {/* Server error */}
      {serverError && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 px-4 py-4 text-sm font-medium text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          {serverError}
        </div>
      )}

      {/* ── Completed equipment ── */}
      {completedEquipment.length > 0 && (
        <>
          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Проверени днес — {completedEquipment.length}
          </p>
          <div className="space-y-2">
            {completedEquipment.map((eq) => {
              const Icon = equipmentIcon(eq.type);
              return (
                <div
                  key={eq.id}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 text-sm font-medium text-emerald-800">
                    {eq.name}
                  </span>
                  <span className="text-xs font-medium text-emerald-600">
                    Проверен
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* All done state */}
      {pendingEquipment.length === 0 && completedEquipment.length > 0 && (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-emerald-800">
              Всички уреди са проверени!
            </h3>
            <p className="text-sm text-emerald-700/80">
              Температурният дневник за днес е завършен.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
