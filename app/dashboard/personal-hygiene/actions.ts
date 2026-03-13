"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocalISODate } from "@/lib/date/local-day";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const shiftRosterEntrySchema = z
  .object({
    user_id: z.string().uuid("Невалиден потребител."),
    is_healthy: z.boolean(),
    notes: z
      .string()
      .trim()
      .max(1000, "Бележките може да са до 1000 символа.")
      .nullable(),
  })
  .strict();

const saveShiftRosterSchema = z
  .array(shiftRosterEntrySchema)
  .superRefine((entries, ctx) => {
    const seenUserIds = new Set<string>();

    entries.forEach((entry, index) => {
      if (seenUserIds.has(entry.user_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Дублиран user_id в дневния състав.",
          path: [index, "user_id"],
        });
        return;
      }

      seenUserIds.add(entry.user_id);
    });
  });

export type SaveShiftRosterInput = z.infer<typeof saveShiftRosterSchema>;

export type SaveShiftRosterResult = {
  ok: boolean;
  message: string;
};

const legacyPersonalHygieneSchema = z
  .object({
    checkDate: z.string(),
    checked: z.array(z.boolean()).optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

export type CreatePersonalHygieneLogInput = z.infer<
  typeof legacyPersonalHygieneSchema
>;

export async function saveShiftRosterAction(
  input: SaveShiftRosterInput,
): Promise<SaveShiftRosterResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager"]);
    const parsed = saveShiftRosterSchema.parse(input);
    const supabase = await createServerSupabaseClient();
    const checkDate = getLocalISODate();

    if (parsed.length === 0) {
      revalidatePath("/dashboard/personal-hygiene");
      return { ok: true, message: "Дневният състав е записан." };
    }

    const payload = parsed.map((entry) => ({
      organization_id: profile.organization_id,
      user_id: entry.user_id,
      check_date: checkDate,
      all_passed: entry.is_healthy,
      notes: entry.notes?.trim() || null,
    }));

    const { error } = await supabase.from("personal_hygiene_logs").upsert(payload, {
      onConflict: "organization_id,user_id,check_date",
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/dashboard/personal-hygiene");
    return { ok: true, message: "Дневният състав е записан успешно." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}

export async function createPersonalHygieneLogAction(
  input: CreatePersonalHygieneLogInput,
): Promise<SaveShiftRosterResult> {
  legacyPersonalHygieneSchema.parse(input);

  return {
    ok: false,
    message:
      "Индивидуалният health check flow е спрян. Използвайте дневния състав.",
  };
}
