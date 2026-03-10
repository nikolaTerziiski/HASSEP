"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createPersonalHygieneLogAction } from "./actions";

const CHECKLIST_ITEMS = [
  "Чисто работно облекло",
  "Чисти ръце / дезинфекция",
  "Без бижута и часовник",
  "Без видими наранявания по ръцете",
  "Добро общо здравословно състояние",
  "Коса прибрана / шапка",
];

type PersonalHygieneFormProps = {
  todayDate: string;
  hasLogToday: boolean;
};

export function PersonalHygieneForm({ todayDate, hasLogToday }: PersonalHygieneFormProps) {
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [notes, setNotes] = useState("");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(hasLogToday);
  const [isPending, startTransition] = useTransition();

  const allChecked = checked.every(Boolean);

  const toggle = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const onSubmit = () => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await createPersonalHygieneLogAction({
        checkDate: todayDate,
        checked,
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      setServerMessage(result.message);
      setSubmitted(true);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Лична хигиена — {todayDate}</CardTitle>
        <CardDescription>
          Ежедневна проверка на хигиената преди започване на работа.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Днешната проверка е записана.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, index) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition active:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked[index]}
                    onChange={() => toggle(index)}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>

            {!allChecked ? (
              <p className="flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Непокритите точки ще бъдат записани в бележките.
              </p>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Допълнителни бележки
                <span className="ml-1 text-xs font-normal text-slate-400">(по избор)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: лек хремав, но допуснат до работа с маска."
                className="min-h-16 text-base"
              />
            </div>

            <Button
              onClick={onSubmit}
              disabled={isPending}
              className="h-12 w-full text-base font-semibold"
            >
              {isPending ? "Записване..." : "Запиши проверката"}
            </Button>
          </>
        )}

        {serverMessage && !submitted ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {serverMessage}
          </div>
        ) : null}
        {serverError ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
