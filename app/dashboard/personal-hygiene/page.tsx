import { getLocalISODate } from "@/lib/date/local-day";
import { requireRoleForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  ShiftRosterClient,
type ShiftRosterLog,
  type ShiftRosterProfile,
} from "./ShiftRosterClient";

export default async function PersonalHygienePage() {
  const profile = await requireRoleForPage(["owner", "manager"]);
  const supabase = await createServerSupabaseClient();
  const today = getLocalISODate();

  const [{ data: profilesData, error: profilesError }, { data: todayLogsData, error: todayLogsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username")
        .eq("organization_id", profile.organization_id)
        .order("username", { ascending: true }),
      supabase
        .from("personal_hygiene_logs")
        .select("user_id, all_passed, notes")
        .eq("organization_id", profile.organization_id)
        .eq("check_date", today)
        .order("user_id", { ascending: true }),
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (todayLogsError) {
    throw new Error(todayLogsError.message);
  }

  const profiles = (profilesData ?? []) as ShiftRosterProfile[];
  const todayLogs = ((todayLogsData ?? []) as Array<{
    user_id: string;
    all_passed: boolean;
    notes: string | null;
  }>).map((log): ShiftRosterLog => ({
    user_id: log.user_id,
    is_healthy: log.all_passed,
    notes: log.notes,
  }));

  return <ShiftRosterClient profiles={profiles} todayLogs={todayLogs} />;
}
