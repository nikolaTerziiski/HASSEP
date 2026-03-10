"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileDown,
  FireExtinguisher,
  MapPin,
  Pencil,
  Plus,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/utils/auth/tenant";
import {
  createFireExtinguisherAction,
  createFireExtinguisherCheckAction,
  updateFireExtinguisherAction,
} from "./actions";
import {
  FIRE_EXTINGUISHER_STATUS_OPTIONS,
  FIRE_EXTINGUISHER_TYPE_OPTIONS,
  type FireExtinguisherStatus,
  type FireExtinguisherType,
  getFireExtinguisherStatusLabel,
  getFireExtinguisherTypeLabel,
} from "./constants";

type FireExtinguisherRow = {
  id: string;
  name: string;
  extinguisher_type: FireExtinguisherType;
  location: string;
  current_status: FireExtinguisherStatus;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
};

type FireExtinguisherCheckRow = {
  id: string;
  fire_extinguisher_id: string;
  checked_by_user_id: string;
  checked_at: string;
  check_date: string;
  status: FireExtinguisherStatus;
  notes: string | null;
};

type FireExtinguishersClientProps = {
  role: AppRole;
  todayDate: string;
  extinguishers: FireExtinguisherRow[];
  todayChecks: FireExtinguisherCheckRow[];
  usernameById: Record<string, string>;
};

type StatusTone = {
  card: string;
  badge: string;
  label: string;
};

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(check: FireExtinguisherCheckRow | null): StatusTone {
  if (!check) {
    return {
      card: "border-amber-200 bg-amber-50/60",
      badge: "bg-amber-100 text-amber-800",
      label: "Няма проверка днес",
    };
  }

  if (check.status === "serviceable") {
    return {
      card: "border-emerald-200 bg-emerald-50/70",
      badge: "bg-emerald-100 text-emerald-800",
      label: "Проверен - изправен",
    };
  }

  return {
    card: "border-red-200 bg-red-50/70",
    badge: "bg-red-100 text-red-800",
    label: "Проверен - неизправен",
  };
}

function SummaryBadge({
  label,
  value,
  classes,
}: {
  label: string;
  value: number;
  classes?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", classes)}>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Затвори"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ManageExtinguisherDialog({
  mode,
  initialValue,
  onClose,
}: {
  mode: "create" | "edit";
  initialValue?: FireExtinguisherRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialValue?.name ?? "");
  const [extinguisherType, setExtinguisherType] = useState<FireExtinguisherType>(
    initialValue?.extinguisher_type ?? "powder",
  );
  const [location, setLocation] = useState(initialValue?.location ?? "");
  const [currentStatus, setCurrentStatus] = useState<FireExtinguisherStatus>(
    initialValue?.current_status ?? "serviceable",
  );
  const [notes, setNotes] = useState(initialValue?.notes ?? "");
  const [isActive, setIsActive] = useState(initialValue?.is_active ?? true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setServerError(null);

    startTransition(async () => {
      const payload = {
        id: initialValue?.id,
        name,
        extinguisherType,
        location,
        currentStatus,
        isActive,
        notes: notes.trim() || undefined,
      };

      const result = mode === "create"
        ? await createFireExtinguisherAction(payload)
        : await updateFireExtinguisherAction(payload);

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      router.refresh();
      onClose();
    });
  };

  return (
    <ModalShell
      title={mode === "create" ? "Нов пожарогасител" : "Редактирай пожарогасител"}
      description="Поддържай кратък и ясен опис. Полето за бележки е по избор."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fire-extinguisher-name">Име</Label>
          <Input
            id="fire-extinguisher-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Напр. Пожарогасител кухня"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fire-extinguisher-type">Тип</Label>
            <select
              id="fire-extinguisher-type"
              value={extinguisherType}
              onChange={(event) => setExtinguisherType(event.target.value as FireExtinguisherType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {FIRE_EXTINGUISHER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fire-extinguisher-status">Текущ статус</Label>
            <select
              id="fire-extinguisher-status"
              value={currentStatus}
              onChange={(event) => setCurrentStatus(event.target.value as FireExtinguisherStatus)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {FIRE_EXTINGUISHER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fire-extinguisher-location">Локация</Label>
          <Input
            id="fire-extinguisher-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Напр. До изхода на кухнята"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fire-extinguisher-notes">Бележки</Label>
          <Textarea
            id="fire-extinguisher-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Допълнителна информация по избор."
          />
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Активен пожарогасител
        </label>

        {serverError ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отказ
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? "Записване..." : mode === "create" ? "Добави" : "Запази"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function CheckExtinguisherDialog({
  extinguisher,
  todayDate,
  onClose,
}: {
  extinguisher: FireExtinguisherRow;
  todayDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FireExtinguisherStatus>("serviceable");
  const [notes, setNotes] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setServerError(null);

    startTransition(async () => {
      const result = await createFireExtinguisherCheckAction({
        fireExtinguisherId: extinguisher.id,
        checkDate: todayDate,
        status,
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      router.refresh();
      onClose();
    });
  };

  return (
    <ModalShell
      title={`Провери: ${extinguisher.name}`}
      description={`${extinguisher.location} • ${todayDate}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {FIRE_EXTINGUISHER_STATUS_OPTIONS.map((option) => {
            const selected = status === option.value;
            const selectedClasses = option.value === "serviceable"
              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
              : "border-red-400 bg-red-50 text-red-800";

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left text-sm font-medium transition",
                  selected ? selectedClasses : "border-slate-200 bg-white text-slate-700",
                )}
              >
                <span className="block text-base">{option.label}</span>
                <span className="mt-1 block text-xs opacity-80">
                  {option.value === "serviceable" ? "Готов за употреба" : "Има проблем и трябва реакция"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fire-check-notes">Бележки</Label>
          <Textarea
            id="fire-check-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="По избор: липсва пломба, нужда от сервиз и др."
          />
        </div>

        {serverError ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отказ
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? "Записване..." : "Запиши проверката"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ExportReportDialog({
  todayDate,
  onClose,
}: {
  todayDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(todayDate);
  const [toDate, setToDate] = useState(todayDate);

  const onSubmit = () => {
    const [fromValue, toValue] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    router.push(`/dashboard/fire-extinguishers/report?from=${fromValue}&to=${toValue}`);
    onClose();
  };

  return (
    <ModalShell
      title="Export PDF"
      description="Избери период. Отчетът ще се отвори в print-friendly изглед."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fire-report-from">От дата</Label>
            <Input
              id="fire-report-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire-report-to">До дата</Label>
            <Input
              id="fire-report-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отказ
          </Button>
          <Button type="button" onClick={onSubmit}>
            Отвори отчета
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function FireExtinguishersClient({
  role,
  todayDate,
  extinguishers,
  todayChecks,
  usernameById,
}: FireExtinguishersClientProps) {
  const canManage = role === "owner" || role === "manager";
  const [manageTarget, setManageTarget] = useState<FireExtinguisherRow | "create" | null>(null);
  const [checkTarget, setCheckTarget] = useState<FireExtinguisherRow | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const checksByExtinguisherId = new Map<string, FireExtinguisherCheckRow>();
  for (const check of todayChecks) {
    if (!checksByExtinguisherId.has(check.fire_extinguisher_id)) {
      checksByExtinguisherId.set(check.fire_extinguisher_id, check);
    }
  }

  const checkedToday = checksByExtinguisherId.size;
  const unserviceableToday = todayChecks.filter((item) => item.status === "unserviceable").length;
  const uncheckedToday = Math.max(extinguishers.length - checkedToday, 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Пожарогасители</h2>
          <p className="text-sm text-slate-600">
            Бърза дневна проверка на активните пожарогасители за {todayDate}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setShowExportDialog(true)}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          {canManage ? (
            <Button type="button" onClick={() => setManageTarget("create")}>
              <Plus className="h-4 w-4" />
              Добави пожарогасител
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryBadge label="Общо" value={extinguishers.length} />
        <SummaryBadge label="Проверени днес" value={checkedToday} classes="bg-emerald-50" />
        <SummaryBadge label="Непроверени днес" value={uncheckedToday} classes="bg-amber-50" />
        <SummaryBadge label="Неизправни днес" value={unserviceableToday} classes="bg-red-50" />
      </div>

      {extinguishers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Няма добавени пожарогасители</CardTitle>
            <CardDescription>Добави първия пожарогасител и започни дневните проверки.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {extinguishers.map((extinguisher) => {
            const todayCheck = checksByExtinguisherId.get(extinguisher.id) ?? null;
            const tone = getStatusTone(todayCheck);

            return (
              <Card key={extinguisher.id} className={tone.card}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FireExtinguisher className="h-5 w-5" />
                        {extinguisher.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4" />
                        {extinguisher.location}
                      </CardDescription>
                    </div>
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", tone.badge)}>
                      {tone.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Тип</p>
                      <p className="font-medium">{getFireExtinguisherTypeLabel(extinguisher.extinguisher_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Текущ статус</p>
                      <p className="font-medium">{getFireExtinguisherStatusLabel(extinguisher.current_status)}</p>
                    </div>
                  </div>

                  {todayCheck ? (
                    <div className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2 font-medium">
                        {todayCheck.status === "serviceable" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                        )}
                        {getFireExtinguisherStatusLabel(todayCheck.status)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Проверил: {usernameById[todayCheck.checked_by_user_id] ?? "Потребител"} в {formatCheckedAt(todayCheck.checked_at)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{todayCheck.notes?.trim() || "Няма бележки."}</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-600">
                      Няма записана проверка за днес.
                    </div>
                  )}

                  {extinguisher.notes?.trim() ? (
                    <div className="rounded-xl bg-white/70 p-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Бележки за уреда</p>
                      <p className="mt-1">{extinguisher.notes}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setCheckTarget(extinguisher)}
                      disabled={Boolean(todayCheck)}
                    >
                      {todayCheck ? "Проверен" : "Провери"}
                    </Button>
                    {canManage ? (
                      <Button type="button" variant="outline" onClick={() => setManageTarget(extinguisher)}>
                        <Pencil className="h-4 w-4" />
                        Редактирай
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {manageTarget === "create" ? (
        <ManageExtinguisherDialog mode="create" onClose={() => setManageTarget(null)} />
      ) : null}

      {manageTarget && manageTarget !== "create" ? (
        <ManageExtinguisherDialog
          key={manageTarget.id}
          mode="edit"
          initialValue={manageTarget}
          onClose={() => setManageTarget(null)}
        />
      ) : null}

      {checkTarget ? (
        <CheckExtinguisherDialog
          key={checkTarget.id}
          extinguisher={checkTarget}
          todayDate={todayDate}
          onClose={() => setCheckTarget(null)}
        />
      ) : null}

      {showExportDialog ? (
        <ExportReportDialog todayDate={todayDate} onClose={() => setShowExportDialog(false)} />
      ) : null}
    </section>
  );
}
