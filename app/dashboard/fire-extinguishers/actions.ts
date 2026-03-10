"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const extinguisherTypeSchema = z.enum(["water", "powder", "co2"]);
const extinguisherStatusSchema = z.enum(["serviceable", "unserviceable"]);

const manageFireExtinguisherSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Името трябва да е поне 2 символа.").max(120),
  extinguisherType: extinguisherTypeSchema,
  location: z.string().trim().min(2, "Локацията трябва да е поне 2 символа.").max(160),
  currentStatus: extinguisherStatusSchema,
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000, "Бележките може да са до 1000 символа.").optional(),
});

const createDailyCheckSchema = z.object({
  fireExtinguisherId: z.string().uuid(),
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата."),
  status: extinguisherStatusSchema,
  notes: z.string().trim().max(1000, "Бележките може да са до 1000 символа.").optional(),
});

export type FireExtinguisherActionResult = {
  ok: boolean;
  message: string;
};

function revalidateFireExtinguisherViews() {
  revalidatePath("/dashboard/fire-extinguishers");
  revalidatePath("/dashboard/fire-extinguishers/report");
}

export async function createFireExtinguisherAction(
  input: z.infer<typeof manageFireExtinguisherSchema>,
): Promise<FireExtinguisherActionResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager"]);
    const parsed = manageFireExtinguisherSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("fire_extinguishers").insert({
      organization_id: profile.organization_id,
      name: parsed.name,
      extinguisher_type: parsed.extinguisherType,
      location: parsed.location,
      current_status: parsed.currentStatus,
      is_active: parsed.isActive,
      notes: parsed.notes?.trim() || null,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateFireExtinguisherViews();
    return { ok: true, message: "Пожарогасителят е добавен." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно добавяне.",
    };
  }
}

export async function updateFireExtinguisherAction(
  input: z.infer<typeof manageFireExtinguisherSchema>,
): Promise<FireExtinguisherActionResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager"]);
    const parsed = manageFireExtinguisherSchema.extend({ id: z.string().uuid() }).parse(input);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("fire_extinguishers")
      .update({
        name: parsed.name,
        extinguisher_type: parsed.extinguisherType,
        location: parsed.location,
        current_status: parsed.currentStatus,
        is_active: parsed.isActive,
        notes: parsed.notes?.trim() || null,
      })
      .eq("id", parsed.id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateFireExtinguisherViews();
    return { ok: true, message: "Пожарогасителят е обновен." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешна редакция.",
    };
  }
}

export async function createFireExtinguisherCheckAction(
  input: z.infer<typeof createDailyCheckSchema>,
): Promise<FireExtinguisherActionResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = createDailyCheckSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("fire_extinguisher_checks").insert({
      organization_id: profile.organization_id,
      fire_extinguisher_id: parsed.fireExtinguisherId,
      checked_by_user_id: profile.id,
      checked_at: new Date().toISOString(),
      check_date: parsed.checkDate,
      status: parsed.status,
      notes: parsed.notes?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "За този пожарогасител вече има проверка за днес." };
      }

      return { ok: false, message: error.message };
    }

    revalidateFireExtinguisherViews();
    return { ok: true, message: "Дневната проверка е записана." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване на проверката.",
    };
  }
}
