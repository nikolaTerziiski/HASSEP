import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { createEquipmentAction, deleteEquipmentAction, updateEquipmentAction } from "./actions";

type EquipmentRow = {
  id: string;
  name: string;
  type: "fridge" | "freezer" | "room";
  min_temp: number;
  max_temp: number;
  is_active: boolean;
};

export default async function EquipmentSettingsPage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const canManageEquipment = profile.role === "owner" || profile.role === "manager";

  if (!canManageEquipment) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, type, min_temp, max_temp, is_active")
    .eq("organization_id", profile.organization_id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const equipmentList = (data ?? []) as EquipmentRow[];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Оборудване</h2>
          <p className="text-sm text-slate-600">Добавяйте и управлявайте хладилници, фризери и помещения.</p>
        </div>
        <Link
          href="/api/qr/equipment-pdf"
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Download className="h-4 w-4" />
          Генерирай QR PDF
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добави нов уред</CardTitle>
          <CardDescription>
            Новодобавените уреди се появяват автоматично в Температурния дневник.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEquipmentAction} className="grid gap-3 md:grid-cols-6">
            <input
              name="name"
              placeholder="Име на уред"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              required
            />
            <select name="type" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required>
              <option value="fridge">Хладилник</option>
              <option value="freezer">Фризер</option>
              <option value="room">Помещение</option>
            </select>
            <input
              name="minTemp"
              type="number"
              step="0.1"
              placeholder="Мин. °C"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              name="maxTemp"
              type="number"
              step="0.1"
              placeholder="Макс. °C"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked />
              Активен
            </label>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 md:col-span-6 md:w-fit"
            >
              Добави уред
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Списък с уреди</CardTitle>
          <CardDescription>Редактирайте диапазони, активност и имена на уреди.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipmentList.length === 0 ? (
            <p className="text-sm text-slate-600">Все още няма добавени уреди.</p>
          ) : null}

          {equipmentList.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <form action={updateEquipmentAction} className="grid gap-2 md:grid-cols-7">
                <input type="hidden" name="equipmentId" value={item.id} />
                <input
                  name="name"
                  defaultValue={item.name}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  required
                />
                <select
                  name="type"
                  defaultValue={item.type}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="fridge">Хладилник</option>
                  <option value="freezer">Фризер</option>
                  <option value="room">Помещение</option>
                </select>
                <input
                  name="minTemp"
                  type="number"
                  step="0.1"
                  defaultValue={item.min_temp}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="maxTemp"
                  type="number"
                  step="0.1"
                  defaultValue={item.max_temp}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={item.is_active} />
                  Активен
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Запази
                </button>
              </form>
              <form action={deleteEquipmentAction} className="mt-2">
                <input type="hidden" name="equipmentId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Изтрий
                </button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
