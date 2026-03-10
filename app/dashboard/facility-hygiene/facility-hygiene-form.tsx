"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  ShieldAlert,
  Sparkles,
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
  createCleaningProductAction,
  createFacilityHygieneLogAction,
  saveFacilityHygieneAreaTemplateAction,
} from "./actions";
import {
  FACILITY_HYGIENE_STATUS_OPTIONS,
  type FacilityHygieneStatus,
  getFacilityHygieneStatusLabel,
  type UsedProductsSnapshotItem,
} from "./constants";

type CleaningProduct = {
  id: string;
  name: string;
};

type FacilityArea = {
  id: string;
  name: string;
  productIds: string[];
  products: CleaningProduct[];
};

type FacilityHygieneLog = {
  id: string;
  area_id: string;
  status: FacilityHygieneStatus;
  notes: string | null;
  corrective_action: string | null;
  performed_at: string;
  performed_by_user_id: string;
  used_products_snapshot: UsedProductsSnapshotItem[] | null;
};

type FacilityHygieneFormProps = {
  role: AppRole;
  todayDate: string;
  cleaningProducts: CleaningProduct[];
  areas: FacilityArea[];
  todayLogs: FacilityHygieneLog[];
  usernameById: Record<string, string>;
};

function formatPerformedAt(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({
  status,
}: {
  status: FacilityHygieneStatus | "missing";
}) {
  const classes = status === "completed"
    ? "bg-emerald-100 text-emerald-800"
    : status === "issue_found"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";

  const label = status === "missing" ? "Чака потвърждение" : getFacilityHygieneStatusLabel(status);

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", classes)}>{label}</span>;
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
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
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

function ProductPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}

function AreaTemplateDialog({
  allProducts,
  initialArea,
  onClose,
}: {
  allProducts: CleaningProduct[];
  initialArea?: FacilityArea;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialArea?.name ?? "");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialArea?.productIds ?? []);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const onSubmit = () => {
    setServerError(null);

    startTransition(async () => {
      const result = await saveFacilityHygieneAreaTemplateAction({
        areaId: initialArea?.id,
        name,
        productIds: selectedProductIds,
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
      title={initialArea ? "Редактирай зона" : "Нова зона"}
      description="Избери кои препарати са стандартни за тази зона."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="facility-area-name">Име на зона</Label>
          <Input
            id="facility-area-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Напр. Кухня - работни плотове"
          />
        </div>

        <div className="space-y-2">
          <Label>Стандартни препарати</Label>
          {allProducts.length === 0 ? (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Добави поне един препарат, преди да създадеш зона.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {allProducts.map((product) => {
                const checked = selectedProductIds.includes(product.id);
                return (
                  <label
                    key={product.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition",
                      checked ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>{product.name}</span>
                  </label>
                );
              })}
            </div>
          )}
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
          <Button type="button" onClick={onSubmit} disabled={isPending || allProducts.length === 0}>
            {isPending ? "Записване..." : initialArea ? "Запази" : "Добави зона"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DailyConfirmationDialog({
  area,
  todayDate,
  onClose,
}: {
  area: FacilityArea;
  todayDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FacilityHygieneStatus>("completed");
  const [notes, setNotes] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setServerError(null);

    startTransition(async () => {
      const result = await createFacilityHygieneLogAction({
        areaId: area.id,
        checkDate: todayDate,
        status,
        notes: notes.trim() || undefined,
        correctiveAction: correctiveAction.trim() || undefined,
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
      title={`Потвърди: ${area.name}`}
      description="Препаратите вече са заредени от шаблона. Нужно е само потвърждение."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Стандартни препарати</p>
          <div className="flex flex-wrap gap-2">
            {area.products.length > 0 ? (
              area.products.map((product) => <ProductPill key={product.id} label={product.name} />)
            ) : (
              <span className="text-sm text-slate-500">Няма зададени препарати.</span>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {FACILITY_HYGIENE_STATUS_OPTIONS.map((option) => {
            const selected = status === option.value;
            const selectedClasses = option.value === "completed"
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
                  {option.value === "completed" ? "Почистването е изпълнено" : "Има проблем в зоната"}
                </span>
              </button>
            );
          })}
        </div>

        {status === "issue_found" ? (
          <div className="space-y-2">
            <Label htmlFor="facility-corrective-action">
              Коригиращо действие <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="facility-corrective-action"
              value={correctiveAction}
              onChange={(event) => setCorrectiveAction(event.target.value)}
              placeholder="Опиши какво е предприето."
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="facility-notes">Бележки</Label>
          <Textarea
            id="facility-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="По избор: допълнителни наблюдения."
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
            {isPending ? "Записване..." : "Потвърди"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function FacilityHygieneForm({
  role,
  todayDate,
  cleaningProducts,
  areas,
  todayLogs,
  usernameById,
}: FacilityHygieneFormProps) {
  const canManage = role === "owner" || role === "manager";
  const [newProductName, setNewProductName] = useState("");
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [productPending, startProductTransition] = useTransition();
  const [editingArea, setEditingArea] = useState<FacilityArea | "create" | null>(null);
  const [confirmArea, setConfirmArea] = useState<FacilityArea | null>(null);
  const router = useRouter();

  const todayLogByAreaId = new Map<string, FacilityHygieneLog>();
  for (const log of todayLogs) {
    if (!todayLogByAreaId.has(log.area_id)) {
      todayLogByAreaId.set(log.area_id, log);
    }
  }

  const completedCount = todayLogs.filter((log) => log.status === "completed").length;
  const issueCount = todayLogs.filter((log) => log.status === "issue_found").length;
  const missingCount = Math.max(areas.length - todayLogByAreaId.size, 0);

  const onCreateProduct = () => {
    setProductMessage(null);
    setProductError(null);

    startProductTransition(async () => {
      const result = await createCleaningProductAction({ name: newProductName });

      if (!result.ok) {
        setProductError(result.message);
        return;
      }

      setNewProductName("");
      setProductMessage(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Хигиенно състояние</h2>
        <p className="text-sm text-slate-600">
          Дневно потвърждение по шаблон за {todayDate}. Препаратите вече са зададени по зони.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-slate-900">{areas.length}</p>
            <p className="text-sm text-slate-600">Зони за днес</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-emerald-700">{completedCount}</p>
            <p className="text-sm text-emerald-700/80">Изпълнени</p>
          </CardContent>
        </Card>
        <Card className={cn("border-amber-200 bg-amber-50/70", issueCount > 0 && "border-red-200 bg-red-50/70")}>
          <CardContent className="p-4">
            <p className={cn("text-2xl font-semibold", issueCount > 0 ? "text-red-700" : "text-amber-700")}>
              {issueCount > 0 ? issueCount : missingCount}
            </p>
            <p className={cn("text-sm", issueCount > 0 ? "text-red-700/80" : "text-amber-700/80")}>
              {issueCount > 0 ? "Зони с проблем" : "Непотвърдени"}
            </p>
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr,1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Препарати
              </CardTitle>
              <CardDescription>Добави почистващите препарати веднъж, после ги закачай към зоните.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newProductName}
                  onChange={(event) => setNewProductName(event.target.value)}
                  placeholder="Напр. Дезинфектант за плотове"
                />
                <Button type="button" onClick={onCreateProduct} disabled={productPending}>
                  {productPending ? "..." : "Добави"}
                </Button>
              </div>

              {productMessage ? (
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {productMessage}
                </div>
              ) : null}
              {productError ? (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {productError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {cleaningProducts.length > 0 ? (
                  cleaningProducts.map((product) => <ProductPill key={product.id} label={product.name} />)
                ) : (
                  <p className="text-sm text-slate-500">Още няма добавени препарати.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCheck className="h-5 w-5" />
                    Зони и шаблони
                  </CardTitle>
                  <CardDescription>Определи кои препарати са стандартни за всяка зона.</CardDescription>
                </div>
                <Button type="button" onClick={() => setEditingArea("create")}>
                  <Plus className="h-4 w-4" />
                  Добави зона
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {areas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Няма конфигурирани зони. Добави първата зона и ѝ задай стандартни препарати.
                </div>
              ) : (
                areas.map((area) => (
                  <div key={area.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{area.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {area.products.map((product) => (
                            <ProductPill key={product.id} label={product.name} />
                          ))}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingArea(area)}>
                        <Pencil className="h-4 w-4" />
                        Редактирай
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Дневни потвърждения</CardTitle>
          <CardDescription>
            {areas.length === 0
              ? "Няма конфигурирани зони за този обект."
              : "Всяка зона показва препаратите от шаблона. Нужно е само бързо потвърждение."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {areas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              {canManage
                ? "Първо добави препарати и поне една зона."
                : "Изчакай owner или manager да конфигурира зоните и препаратите."}
            </div>
          ) : (
            areas.map((area) => {
              const log = todayLogByAreaId.get(area.id) ?? null;
              const status = log?.status ?? "missing";
              const usedProducts = log?.used_products_snapshot?.length
                ? log.used_products_snapshot
                : area.products;

              return (
                <div
                  key={area.id}
                  className={cn(
                    "rounded-2xl border p-4 transition",
                    status === "completed"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : status === "issue_found"
                        ? "border-red-200 bg-red-50/60"
                        : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{area.name}</p>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {area.products.map((product) => (
                          <ProductPill key={product.id} label={product.name} />
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setConfirmArea(area)}
                      disabled={Boolean(log)}
                    >
                      {log ? "Потвърдено" : "Потвърди"}
                    </Button>
                  </div>

                  {log ? (
                    <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2 font-medium">
                        {log.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                        )}
                        {getFacilityHygieneStatusLabel(log.status)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Потвърдил: {usernameById[log.performed_by_user_id] ?? "Потребител"} в {formatPerformedAt(log.performed_at)}
                      </p>
                      <div className="mt-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Използвани препарати</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {usedProducts.length > 0 ? (
                            usedProducts.map((product) => (
                              <ProductPill key={`${area.id}-${product.id}`} label={product.name} />
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">Няма запазен списък.</span>
                          )}
                        </div>
                      </div>
                      {log.corrective_action?.trim() ? (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                          Коригиращо действие: {log.corrective_action}
                        </p>
                      ) : null}
                      {log.notes?.trim() ? (
                        <p className="mt-2 text-sm text-slate-600">{log.notes}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">Зоната още не е потвърдена за днес.</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {editingArea === "create" ? (
        <AreaTemplateDialog allProducts={cleaningProducts} onClose={() => setEditingArea(null)} />
      ) : null}

      {editingArea && editingArea !== "create" ? (
        <AreaTemplateDialog
          allProducts={cleaningProducts}
          initialArea={editingArea}
          onClose={() => setEditingArea(null)}
        />
      ) : null}

      {confirmArea ? (
        <DailyConfirmationDialog
          area={confirmArea}
          todayDate={todayDate}
          onClose={() => setConfirmArea(null)}
        />
      ) : null}
    </div>
  );
}
