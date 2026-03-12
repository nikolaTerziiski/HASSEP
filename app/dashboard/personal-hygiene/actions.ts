"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value: string) {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

const personalHygieneSchema = z
  .object({
    checkDate: z.string().refine(isValidISODate, {
      message: "Невалидна дата.",
    }),
    checked: z.array(z.boolean()).optional(),
    notes: z
      .string()
      .trim()
      .max(1000, "Бележките може да са до 1000 символа.")
      .optional(),
  })
  .strict();

export type CreatePersonalHygieneLogInput = z.infer<typeof personalHygieneSchema>;

export type PersonalHygieneResult = {
  ok: boolean;
  message: string;
};

export async function createPersonalHygieneLogAction(
  input: CreatePersonalHygieneLogInput,
): Promise<PersonalHygieneResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = personalHygieneSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const notes = parsed.notes?.trim() || null;
    const hasReportedIssue = notes !== null;
    const allChecked =
      Array.isArray(parsed.checked) &&
      parsed.checked.length > 0 &&
      parsed.checked.every((item) => item === true);
    const isHealthy = !hasReportedIssue && allChecked;

    const { error } = await supabase.from("personal_hygiene_logs").upsert(
      {
        organization_id: profile.organization_id,
        user_id: profile.id,
        check_date: parsed.checkDate,
        all_passed: isHealthy,
        notes,
      },
      {
        onConflict: "organization_id,user_id,check_date",
      },
    );

    if (error) {
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
