import { AlertTriangle, CheckCircle2, ClipboardList, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TeamMemberRole = "manager" | "staff";

type TeamHygieneMember = {
  id: string;
  username: string;
  role: TeamMemberRole;
  status: "completed" | "notes" | "missing";
  notes: string | null;
  submittedAt: string | null;
};

type TeamHygieneOverviewProps = {
  todayDate: string;
  members: TeamHygieneMember[];
};

function formatRoleLabel(role: TeamMemberRole) {
  return role === "manager" ? "Мениджър" : "Служител";
}

function formatStatusLabel(status: TeamHygieneMember["status"]) {
  if (status === "completed") {
    return "Минал";
  }

  if (status === "notes") {
    return "Има бележки";
  }

  return "Не е минал";
}

function formatStatusClasses(status: TeamHygieneMember["status"]) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "notes") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
}

function formatSubmissionTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function compareMembers(a: TeamHygieneMember, b: TeamHygieneMember) {
  const weights: Record<TeamHygieneMember["status"], number> = {
    missing: 0,
    notes: 1,
    completed: 2,
  };

  if (weights[a.status] !== weights[b.status]) {
    return weights[a.status] - weights[b.status];
  }

  return a.username.localeCompare(b.username, "bg");
}

export function TeamHygieneOverview({ todayDate, members }: TeamHygieneOverviewProps) {
  const sortedMembers = [...members].sort(compareMembers);
  const completedCount = members.filter((member) => member.status === "completed").length;
  const notesCount = members.filter((member) => member.status === "notes").length;
  const missingCount = members.filter((member) => member.status === "missing").length;

  if (members.length === 0) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Екип — лична хигиена днес</h2>
          <p className="text-sm text-slate-600">
            Преглед на ежедневните проверки за {todayDate}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Няма активни служители</CardTitle>
            <CardDescription>
              За този обект няма активни потребители с роля staff или manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Екип — лична хигиена днес</h2>
        <p className="text-sm text-slate-600">
          Следете кои активни служители са подали дневната си проверка за {todayDate}.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-semibold text-emerald-700">{completedCount}</p>
              <p className="text-sm text-emerald-700">Минали без бележки</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-semibold text-amber-700">{notesCount}</p>
              <p className="text-sm text-amber-700">Подадени с бележки</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-semibold text-red-700">{missingCount}</p>
              <p className="text-sm text-red-700">Липсващи проверки</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            Екип днес
          </CardTitle>
          <CardDescription>
            {completedCount + notesCount} / {members.length} служители са подали запис за днес.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Име</th>
                <th className="px-3 py-2">Роля</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Час</th>
                <th className="px-3 py-2">Бележки</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-medium text-slate-900">{member.username}</td>
                  <td className="px-3 py-3 text-slate-600">{formatRoleLabel(member.role)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${formatStatusClasses(member.status)}`}
                    >
                      {formatStatusLabel(member.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{formatSubmissionTime(member.submittedAt)}</td>
                  <td className="max-w-xs px-3 py-3 text-slate-600">
                    {member.notes?.trim() ? (
                      <span className="line-clamp-2">{member.notes}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
