"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Stethoscope,
  CircleDot,
  Hand,
  Shirt,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createPersonalHygieneLogAction } from "./actions";

const CHECKLIST = [
  {
    label: "Нямам стомашно-чревни разстройства или инфекции.",
    icon: HeartPulse,
  },
  {
    label: "Работното ми облекло е чисто.",
    icon: Shirt,
  },
  {
    label: "Нямам открити рани по ръцете.",
    icon: Hand,
  },
  {
    label: "Ръцете ми са измити и дезинфекцирани.",
    icon: Stethoscope,
  },
] as const;

type PersonalHygieneFormProps = {
  todayDate: string;
  hasLogToday: boolean;
};

export function PersonalHygieneForm({
  todayDate,
  hasLogToday,
}: PersonalHygieneFormProps) {
  const [checked, setChecked] = useState<boolean[]>(
    CHECKLIST.map(() => false),
  );
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(hasLogToday);
  const [isPending, startTransition] = useTransition();

  const allChecked = checked.every(Boolean);

  const toggle = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleConfirm = () => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await createPersonalHygieneLogAction({
        checkDate: todayDate,
        checked,
        notes: undefined,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      setServerMessage(result.message);
      setSubmitted(true);
    });
  };

  const handleReportIssue = () => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await createPersonalHygieneLogAction({
        checkDate: todayDate,
        checked,
        notes: issueNotes.trim() || "Служителят е докладвал здравословен проблем.",
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      setServerMessage(result.message);
      setSubmitted(true);
    });
  };

  // --- Success state ---
  if (submitted) {
    return (
      <Card className="rounded-2xl border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <UserCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-emerald-800">
              Готови сте за работа!
            </h3>
            <p className="mt-1 text-sm text-emerald-700/80">
              Проверката за {todayDate} е записана.
            </p>
          </div>
          {serverMessage && (
            <p className="text-sm font-medium text-emerald-700">
              {serverMessage}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // --- Checklist state ---
  const checkedCount = checked.filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main checklist card */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Дневна проверка — {todayDate}
          </p>
          <CardTitle className="text-lg text-slate-900">
            Потвърдете готовността си
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pb-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 pb-1">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${(checkedCount / CHECKLIST.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {checkedCount}/{CHECKLIST.length}
            </span>
          </div>

          {/* Checklist rows */}
          {CHECKLIST.map((item, index) => {
            const isChecked = checked[index];
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => toggle(index)}
                className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all duration-150 active:scale-[0.98] ${
                  isChecked
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Status circle */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isChecked
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isChecked ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <CircleDot className="h-5 w-5" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`flex-1 text-base font-medium leading-snug ${
                    isChecked ? "text-emerald-800" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </span>

                {/* Icon hint */}
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isChecked ? "text-emerald-400" : "text-slate-300"
                  }`}
                />
              </button>
            );
          })}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={!allChecked || isPending}
            className={`mt-2 h-14 w-full rounded-xl text-base font-bold shadow-md transition-all ${
              allChecked
                ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
                : "cursor-not-allowed bg-slate-300 text-slate-500"
            }`}
          >
            <UserCheck className="mr-2 h-5 w-5" />
            {isPending
              ? "Записване…"
              : allChecked
                ? "Потвърждавам готовност за работа"
                : `Изберете всички ${CHECKLIST.length} точки`}
          </Button>
        </CardContent>
      </Card>

      {/* Health issue section */}
      {!showIssuePanel ? (
        <button
          type="button"
          onClick={() => setShowIssuePanel(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 px-4 py-4 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50/80 active:scale-[0.98]"
        >
          <ShieldAlert className="h-5 w-5" />
          Имам здравословен проблем
        </button>
      ) : (
        <Card className="rounded-2xl border-red-200 bg-red-50/60">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-red-500">
              Здравословен проблем
            </p>
            <CardTitle className="text-base text-red-800">
              Опишете накратко проблема
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <Textarea
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="Напр. стомашни оплаквания, рана на ръката…"
              className="min-h-24 rounded-xl border-red-200 bg-white text-base focus-visible:ring-red-400"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowIssuePanel(false);
                  setIssueNotes("");
                }}
                className="h-12 flex-1 rounded-xl text-sm font-semibold"
              >
                Отказ
              </Button>
              <Button
                onClick={handleReportIssue}
                disabled={isPending}
                className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.98]"
              >
                <ShieldAlert className="mr-1 h-4 w-4" />
                {isPending ? "Записване…" : "Докладвай"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server error */}
      {serverError && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 px-4 py-4 text-sm font-medium text-red-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
          {serverError}
        </div>
      )}
    </div>
  );
}
