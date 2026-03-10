import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { createStaffUserAction, deactivateStaffUserAction } from "./actions";

type TeamProfileRow = {
  id: string;
  username: string;
  role: "owner" | "manager" | "staff";
  is_active: boolean;
  created_at: string;
};

export default async function TeamManagementPage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, is_active, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const team = (data ?? []) as TeamProfileRow[];
  const activeStaffCount = team.filter((member) => member.role === "staff" && member.is_active).length;
  const canManageTeam = profile.role === "owner";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Управление на екипа</h2>
        <p className="text-sm text-slate-600">
          Създавайте и деактивирайте служители за текущия обект.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добави служител</CardTitle>
          <CardDescription>
            Лимит: максимум 5 активни профила с роля <strong>staff</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManageTeam ? (
            <form action={createStaffUserAction} className="grid gap-3 md:grid-cols-4">
              <input
                type="hidden"
                name="role"
                value="staff"
              />
              <input
                name="username"
                placeholder="Потребителско име"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Парола"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                value={`Активни staff: ${activeStaffCount}/5`}
                readOnly
                className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Създай staff
              </button>
            </form>
          ) : (
            <p className="text-sm text-amber-700">
              Само собственикът (owner) може да управлява екипа в тази версия.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Текущи потребители</CardTitle>
          <CardDescription>Потребителите виждат само данни от своята организация.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {team.length === 0 ? <p className="text-sm text-slate-600">Няма добавени потребители.</p> : null}

          {team.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{member.username}</p>
                <p className="text-slate-600">
                  Роля: {member.role} | Статус: {member.is_active ? "активен" : "неактивен"}
                </p>
              </div>
              {canManageTeam && member.role === "staff" && member.is_active ? (
                <form action={deactivateStaffUserAction}>
                  <input type="hidden" name="userId" value={member.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Деактивирай
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
