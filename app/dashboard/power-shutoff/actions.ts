"use server";

import { revalidatePath } from "next/cache";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getLocalISODate } from "@/lib/date/local-day";

export type PowerShutoffResult = {
  ok: boolean;
  message: string;
  shutoffTime?: string;
};

export async function createPowerShutoffAction(
  area: string,
): Promise<PowerShutoffResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const supabase = await createServerSupabaseClient();
    const today = getLocalISODate();
    const now = new Date().toISOString();

    const { error } = await supabase.from("power_shutoff_logs").upsert(
      {
        organization_id: profile.organization_id,
        user_id: profile.id,
        check_date: today,
        area,
        shutoff_at: now,
      },
      {
        onConflict: "organization_id,check_date,area",
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/dashboard/power-shutoff");
    return { ok: true, message: "Записано успешно.", shutoffTime: now };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}
