import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalISODate } from "@/lib/date/local-day";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { FireExtinguishersClient } from "./fire-extinguishers-client";

type FireExtinguisherRow = {
  id: string;
  name: string;
  extinguisher_type: "water" | "powder" | "co2";
  location: string;
  current_status: "serviceable" | "unserviceable";
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
  status: "serviceable" | "unserviceable";
  notes: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
};

export default async function FireExtinguishersPage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const today = getLocalISODate();

  const [
    { data: extinguishers, error: extinguisherError },
    { data: todayChecks, error: checksError },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("fire_extinguishers")
      .select("id, name, extinguisher_type, location, current_status, is_active, notes, updated_at")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("location", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("fire_extinguisher_checks")
      .select("id, fire_extinguisher_id, checked_by_user_id, checked_at, check_date, status, notes")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today)
      .order("checked_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true),
  ]);

  if (extinguisherError) {
    throw new Error(extinguisherError.message);
  }

  if (checksError) {
    throw new Error(checksError.message);
  }

  const extinguisherRows = (extinguishers ?? []) as FireExtinguisherRow[];
  const checkRows = (todayChecks ?? []) as FireExtinguisherCheckRow[];
  const usernameById = Object.fromEntries(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item.username]));

  if (extinguisherRows.length === 0 && profile.role === "staff") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пожарогасители</CardTitle>
          <CardDescription>Все още няма активни пожарогасители за този обект.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Когато owner или manager добави пожарогасители, тук ще виждате дневните проверки.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FireExtinguishersClient
      role={profile.role}
      todayDate={today}
      extinguishers={extinguisherRows}
      todayChecks={checkRows}
      usernameById={usernameById}
    />
  );
}
