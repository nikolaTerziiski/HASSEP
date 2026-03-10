import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLocalDate, getLocalISODate } from "@/lib/date/local-day";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  getFireExtinguisherStatusLabel,
  getFireExtinguisherTypeLabel,
} from "../constants";
import { PrintButton } from "../print-button";

type FireExtinguisherReportPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
};

type FireExtinguisherRow = {
  id: string;
  name: string;
  extinguisher_type: "water" | "powder" | "co2";
  location: string;
  is_active: boolean;
};

type FireExtinguisherCheckRow = {
  id: string;
  fire_extinguisher_id: string;
  checked_by_user_id: string;
  checked_at: string;
  check_date: string;
  status: "serviceable" | "unserviceable";
  notes: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
};

function normalizeDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function FireExtinguisherReportPage({
  searchParams,
}: FireExtinguisherReportPageProps) {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = await searchParams;
  const today = getLocalISODate();
  const initialFrom = normalizeDate(resolvedSearchParams?.from, today);
  const initialTo = normalizeDate(resolvedSearchParams?.to, today);
  const [fromDate, toDate] = initialFrom <= initialTo
    ? [initialFrom, initialTo]
    : [initialTo, initialFrom];

  const [
    { data: extinguishers, error: extinguisherError },
    { data: checks, error: checksError },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("fire_extinguishers")
      .select("id, name, extinguisher_type, location, is_active")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("fire_extinguisher_checks")
      .select("id, fire_extinguisher_id, checked_by_user_id, checked_at, check_date, status, notes")
      .eq("organization_id", profile.organization_id)
      .gte("check_date", fromDate)
      .lte("check_date", toDate)
      .order("check_date", { ascending: false })
      .order("checked_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username")
      .eq("organization_id", profile.organization_id),
  ]);

  if (extinguisherError) {
    throw new Error(extinguisherError.message);
  }

  if (checksError) {
    throw new Error(checksError.message);
  }

  const extinguisherById = new Map(((extinguishers ?? []) as FireExtinguisherRow[]).map((item) => [item.id, item]));
  const usernameById = new Map(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item.username]));
  const checkRows = (checks ?? []) as FireExtinguisherCheckRow[];
  const serviceableCount = checkRows.filter((item) => item.status === "serviceable").length;
  const unserviceableCount = checkRows.length - serviceableCount;
  const organizationName = profile.organizations?.name ?? "Организация";

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-2xl font-semibold">Отчет за пожарогасители</h2>
          <p className="text-sm text-slate-600">
            Период: {formatLocalDate(fromDate)} - {formatLocalDate(toDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/fire-extinguishers"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{organizationName} - Отчет за пожарогасители</h1>
        <p className="text-sm text-slate-600">
          Период: {formatLocalDate(fromDate)} - {formatLocalDate(toDate)}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4" />
            Обобщение
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-2xl font-semibold text-slate-900">{checkRows.length}</p>
            <p className="text-sm text-slate-600">Общо проверки</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-2xl font-semibold text-emerald-700">{serviceableCount}</p>
            <p className="text-sm text-emerald-700/80">Изправни</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-2xl font-semibold text-red-700">{unserviceableCount}</p>
            <p className="text-sm text-red-700/80">Неизправни</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Проверки по период</CardTitle>
        </CardHeader>
        <CardContent>
          {checkRows.length === 0 ? (
            <p className="text-sm text-slate-600">Няма проверки за избрания период.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Дата</th>
                    <th className="py-2 pr-4">Час</th>
                    <th className="py-2 pr-4">Пожарогасител</th>
                    <th className="py-2 pr-4">Тип</th>
                    <th className="py-2 pr-4">Локация</th>
                    <th className="py-2 pr-4">Статус</th>
                    <th className="py-2 pr-4">Проверил</th>
                    <th className="py-2">Бележки</th>
                  </tr>
                </thead>
                <tbody>
                  {checkRows.map((check) => {
                    const extinguisher = extinguisherById.get(check.fire_extinguisher_id);
                    const statusClasses = check.status === "serviceable"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800";

                    return (
                      <tr key={check.id} className="border-t border-slate-100">
                        <td className="py-2 pr-4">{formatLocalDate(check.check_date)}</td>
                        <td className="py-2 pr-4 tabular-nums text-slate-600">{formatCheckedAt(check.checked_at)}</td>
                        <td className="py-2 pr-4 font-medium">{extinguisher?.name ?? "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">
                          {extinguisher ? getFireExtinguisherTypeLabel(extinguisher.extinguisher_type) : "—"}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">{extinguisher?.location ?? "—"}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}>
                            {getFireExtinguisherStatusLabel(check.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-600">{usernameById.get(check.checked_by_user_id) ?? "—"}</td>
                        <td className="py-2 text-slate-600">{check.notes?.trim() || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
