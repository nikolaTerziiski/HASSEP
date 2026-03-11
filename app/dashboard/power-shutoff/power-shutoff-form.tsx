"use client";

import { useState, useTransition } from "react";
import { PowerOff, ShieldCheck, Clock, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPowerShutoffAction } from "./actions";

type PowerShutoffFormProps = {
  hasShutoffToday: boolean;
  shutoffTime: string | null;
};

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function PowerShutoffForm({
  hasShutoffToday,
  shutoffTime,
}: PowerShutoffFormProps) {
  const [confirmed, setConfirmed] = useState(hasShutoffToday);
  const [recordedTime, setRecordedTime] = useState<string | null>(shutoffTime);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleShutoff = () => {
    setServerError(null);

    startTransition(async () => {
      const result = await createPowerShutoffAction("Основен обект");

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      setRecordedTime(result.shutoffTime ?? new Date().toISOString());
      setConfirmed(true);
    });
  };

  // ── Success: "Night Mode" ──
  if (confirmed) {
    return (
      <Card className="overflow-hidden rounded-2xl border-0 bg-slate-900 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-6 px-6 py-12">
          {/* Glowing shield icon */}
          <div className="relative">
            <div className="absolute -inset-3 animate-pulse rounded-full bg-emerald-500/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">
              Обектът е обезопасен
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Всички уреди са изключени. Приятна вечер!
            </p>
          </div>

          {/* Timestamp badge */}
          {recordedTime && (
            <div className="flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 ring-1 ring-slate-700">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">
                Записано в {formatTime(recordedTime)}
              </span>
            </div>
          )}

          {/* Area label */}
          <p className="text-xs font-medium uppercase tracking-widest text-slate-600">
            Основен обект
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Pending: "Shut it down" ──
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-amber-200 bg-amber-50/60">
        <CardContent className="flex flex-col items-center gap-6 px-6 py-10">
          {/* Pulsing power icon */}
          <div className="relative">
            <div className="absolute -inset-2 animate-pulse rounded-full bg-amber-400/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Zap className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          {/* Instruction */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
              Край на работния ден
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Изключихте ли уредите и тока?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Уверете се, че всички фурни, печки, хладилници (без постоянно
              работещите) и осветлението са изключени.
            </p>
          </div>

          {/* THE BUTTON */}
          <Button
            onClick={handleShutoff}
            disabled={isPending}
            className="h-20 w-full rounded-2xl bg-amber-500 text-xl font-bold text-white shadow-lg transition-all hover:bg-amber-600 hover:shadow-xl active:scale-[0.97] disabled:opacity-70"
          >
            <PowerOff className="mr-3 h-7 w-7" />
            {isPending ? "Записване…" : "Изключих уредите и тока"}
          </Button>
        </CardContent>
      </Card>

      {/* Server error */}
      {serverError && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 px-4 py-4 text-sm font-medium text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          {serverError}
        </div>
      )}
    </div>
  );
}
