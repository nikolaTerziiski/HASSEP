"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requiresCorrectiveAction } from "@/lib/domain/temperature";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const createTemperatureLogSchema = z.object({
  equipmentId: z.string().uuid(),
  recordedTemp: z.coerce.number().min(-30).max(100),
  correctiveAction: z.string().max(500).optional(),
});

export type CreateTemperatureLogInput = z.infer<typeof createTemperatureLogSchema>;

export type CreateTemperatureLogResult = {
  ok: boolean;
  message: string;
  recordedAt?: string;
};

export async function createTemperatureLogAction(
  input: CreateTemperatureLogInput,
): Promise<CreateTemperatureLogResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = createTemperatureLogSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("id, organization_id, type, min_temp, max_temp")
      .eq("id", parsed.equipmentId)
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (equipmentError) {
      return { ok: false, message: equipmentError.message };
    }

    if (!equipment) {
      return { ok: false, message: "Уредът не е намерен в текущия обект." };
    }

    const trimmedCorrectiveAction = parsed.correctiveAction?.trim();
    if (requiresCorrectiveAction(parsed.recordedTemp, equipment) && !trimmedCorrectiveAction) {
      return {
        ok: false,
        message: `Температурата ${parsed.recordedTemp}°C е извън допустимия диапазон (${equipment.min_temp}°C – ${equipment.max_temp}°C). Моля, въведете коригиращо действие.`,
      };
    }

    const recordedAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("haccp_logs").insert({
      organization_id: profile.organization_id,
      equipment_id: parsed.equipmentId,
      recorded_temp: parsed.recordedTemp,
      corrective_action: trimmedCorrectiveAction || null,
      recorded_at: recordedAt,
      user_id: profile.id,
    });

    if (insertError) {
      return { ok: false, message: insertError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/temperature");

    return {
      ok: true,
      message: "Измерването е записано успешно.",
      recordedAt,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}
