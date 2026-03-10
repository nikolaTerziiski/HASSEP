"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const equipmentTypeSchema = z.enum(["fridge", "freezer", "room"]);

const createEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: equipmentTypeSchema,
  minTemp: z.coerce.number().min(-60).max(150),
  maxTemp: z.coerce.number().min(-60).max(150),
  isActive: z.boolean().default(true),
});

const updateEquipmentSchema = createEquipmentSchema.extend({
  equipmentId: z.string().uuid(),
});

function validateTempRange(minTemp: number, maxTemp: number) {
  if (minTemp > maxTemp) {
    throw new Error("Минималната температура трябва да е по-малка или равна на максималната.");
  }
}

function revalidateEquipmentViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/equipment");
  revalidatePath("/dashboard/settings/team");
  revalidatePath("/dashboard/temperature");
}

export async function createEquipmentAction(formData: FormData) {
  const profile = await requireRoleForAction(["owner", "manager"]);
  const parsed = createEquipmentSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    minTemp: formData.get("minTemp"),
    maxTemp: formData.get("maxTemp"),
    isActive: formData.get("isActive") === "on",
  });

  validateTempRange(parsed.minTemp, parsed.maxTemp);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("equipment").insert({
    organization_id: profile.organization_id,
    name: parsed.name,
    type: parsed.type,
    min_temp: parsed.minTemp,
    max_temp: parsed.maxTemp,
    is_active: parsed.isActive,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateEquipmentViews();
}

export async function updateEquipmentAction(formData: FormData) {
  const profile = await requireRoleForAction(["owner", "manager"]);
  const parsed = updateEquipmentSchema.parse({
    equipmentId: formData.get("equipmentId"),
    name: formData.get("name"),
    type: formData.get("type"),
    minTemp: formData.get("minTemp"),
    maxTemp: formData.get("maxTemp"),
    isActive: formData.get("isActive") === "on",
  });

  validateTempRange(parsed.minTemp, parsed.maxTemp);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("equipment")
    .update({
      name: parsed.name,
      type: parsed.type,
      min_temp: parsed.minTemp,
      max_temp: parsed.maxTemp,
      is_active: parsed.isActive,
    })
    .eq("id", parsed.equipmentId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateEquipmentViews();
}

export async function deleteEquipmentAction(formData: FormData) {
  const profile = await requireRoleForAction(["owner", "manager"]);
  const equipmentId = z.string().uuid().parse(formData.get("equipmentId"));
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", equipmentId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateEquipmentViews();
}
