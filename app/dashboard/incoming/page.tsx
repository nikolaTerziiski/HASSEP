import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";
import { IncomingForm } from "./incoming-form";

type ItemEntry = {
  product: string;
  quantity: string;
  batchNumber?: string;
  expiryDate?: string;
};

type IncomingLogRow = {
  id: string;
  supplier: string;
  invoice_number: string;
  items_json: ItemEntry[];
  corrective_action: string | null;
  created_at: string;
};

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export default async function IncomingControlPage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const today = getLocalISODate();

  const { data: todayLogs } = await supabase
    .from("incoming_logs")
    .select("id, supplier, invoice_number, items_json, corrective_action, created_at")
    .eq("organization_id", profile.organization_id)
    .eq("date", today)
    .order("created_at", { ascending: false });

  const logs = (todayLogs ?? []) as IncomingLogRow[];

  return (
    <section className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
      {/* ── Left column: Form ── */}
      <div>
        <div className="mb-4 px-1">
          <h1 className="text-xl font-bold tracking-tight">Входящ контрол</h1>
          <p className="text-sm text-slate-500">
            Сканирайте фактура, проверете данните и запишете доставка.
          </p>
        </div>
        <IncomingForm />
      </div>

      {/* ── Right column: Today's deliveries ── */}
      <div>
        <h2 className="mb-3 px-1 text-lg font-semibold tracking-tight">
          Днешни приеми
        </h2>

        {logs.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">
            Все още няма записи за днес.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log) => {
              const items: ItemEntry[] = Array.isArray(log.items_json)
                ? log.items_json
                : [];
              const productSummary = items
                .map((i) => i.product)
                .filter(Boolean)
                .join(", ");
              const batchSummary = items
                .map((i) => i.batchNumber)
                .filter(Boolean)
                .join(", ");
              const hasProblem = !!log.corrective_action;

              return (
                <Card
                  key={log.id}
                  className={`rounded-2xl border-0 shadow-sm transition-shadow hover:shadow-md ${
                    hasProblem ? "ring-1 ring-red-200" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Top row: supplier (bold) + status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {log.supplier}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {formatTime(log.created_at)}
                        </span>
                      </div>
                      {hasProblem ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          ПРОБЛЕМ
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ИЗРЯДНО
                        </span>
                      )}
                    </div>

                    {/* Middle row: products + batch (secondary text) */}
                    {productSummary ? (
                      <p className="mt-2 line-clamp-1 text-sm text-slate-500">
                        {productSummary}
                      </p>
                    ) : null}
                    {batchSummary ? (
                      <p className="mt-0.5 text-xs text-slate-400">
                        L: {batchSummary}
                      </p>
                    ) : null}

                    {/* Bottom row: invoice number */}
                    <div className="mt-2">
                      <span className="text-xs text-slate-400">
                        &#x1F4C4; {log.invoice_number}
                      </span>
                    </div>

                    {/* Corrective action detail (only when problem) */}
                    {hasProblem ? (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs italic text-red-700">
                        {log.corrective_action}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
