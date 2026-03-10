import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";
import { deriveLogStatus } from "@/lib/domain/personal-hygiene";
import { MyHygieneForm } from "./my-hygiene-form";
import { HygieneDualView } from "./hygiene-dual-view";

type TeamProfileRow = {
  id: string;
  username: string;
  role: "manager" | "staff";
};

type PersonalHygieneLogRow = {
  user_id: string;
  notes: string | null;
  created_at: string;
};

export default async function PersonalHygienePage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();

  const today = getLocalISODate();

  if (profile.role === "owner" || profile.role === "manager") {
    const [{ data: teamProfiles, error: teamError }, { data: todayLogs, error: logsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, role")
          .eq("organization_id", profile.organization_id)
          .eq("is_active", true)
          .in("role", ["manager", "staff"])
          .order("username", { ascending: true }),
        supabase
          .from("personal_hygiene_logs")
          .select("user_id, notes, created_at")
          .eq("organization_id", profile.organization_id)
          .eq("check_date", today)
          .order("created_at", { ascending: false }),
      ]);

    if (teamError) {
      throw new Error(teamError.message);
    }

    if (logsError) {
      throw new Error(logsError.message);
    }

    const latestLogByUser = new Map<string, PersonalHygieneLogRow>();
    for (const log of (todayLogs ?? []) as PersonalHygieneLogRow[]) {
      if (!latestLogByUser.has(log.user_id)) {
        latestLogByUser.set(log.user_id, log);
      }
    }

    const members = ((teamProfiles ?? []) as TeamProfileRow[]).map((member) => {
      const latestLog = latestLogByUser.get(member.id) ?? null;
      return {
        id: member.id,
        username: member.username,
        role: member.role,
        status: deriveLogStatus(latestLog),
        notes: latestLog?.notes ?? null,
        submittedAt: latestLog?.created_at ?? null,
      } as const;
    });

    const ownLog = latestLogByUser.get(profile.id) ?? null;

    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Лична хигиена</h2>
          <p className="text-sm text-slate-600">
            Вашата проверка и статус на екипа за {today}.
          </p>
        </div>
        <HygieneDualView todayDate={today} hasLogToday={ownLog !== null} members={members} />
      </section>
    );
  }

  const { data: existingLog } = await supabase
    .from("personal_hygiene_logs")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", profile.id)
    .eq("check_date", today)
    .maybeSingle();

  return (
    <MyHygieneForm todayDate={today} hasLogToday={!!existingLog} />
  );
}
