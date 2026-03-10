"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { buildChecklistResult, areAllPassed } from "@/lib/domain/personal-hygiene";

const personalHygieneSchema = z.object({
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата."),
  /** Boolean per checklist item, in order of HYGIENE_CHECKLIST_ITEMS */
  checked: z.array(z.boolean()).length(6),
  notes: z.string().max(1000, "Бележките може да са до 1000 символа.").optional(),
});

export type PersonalHygieneResult = {
  ok: boolean;
  message: string;
};

export async function createPersonalHygieneLogAction(
  input: z.infer<typeof personalHygieneSchema>,
): Promise<PersonalHygieneResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = personalHygieneSchema.parse(input);
    const supabase = await createServerSupabaseClient();
    const checklistResult = buildChecklistResult(parsed.checked);
    const allPassed = areAllPassed(checklistResult);

    const { error } = await supabase.from("personal_hygiene_logs").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      check_date: parsed.checkDate,
      notes: parsed.notes?.trim() || null,
      checklist_result: checklistResult,
      all_passed: allPassed,
      performed_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "Вече сте подали проверка за днес." };
      }
      return { ok: false, message: error.message };
    }

    revalidatePath("/dashboard/personal-hygiene");
    return { ok: true, message: "Проверката е записана успешно." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}
