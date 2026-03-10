"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const cleaningProductSchema = z.object({
  name: z.string().trim().min(2, "Името трябва да е поне 2 символа.").max(120),
});

const facilityAreaTemplateSchema = z.object({
  areaId: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Името на зоната трябва да е поне 2 символа.").max(160),
  productIds: z.array(z.string().uuid()).min(1, "Изберете поне един препарат."),
});

const facilityHygieneSchema = z.object({
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата."),
  areaId: z.string().uuid("Изберете зона."),
  status: z.enum(["completed", "issue_found"]).default("completed"),
  notes: z.string().trim().max(1000, "Бележките може да са до 1000 символа.").optional(),
  correctiveAction: z
    .string()
    .trim()
    .max(1000, "Коригиращото действие може да е до 1000 символа.")
    .optional(),
});

export type FacilityHygieneResult = {
  ok: boolean;
  message: string;
};

type CleaningProductRow = {
  id: string;
  name: string;
};

function revalidateFacilityHygieneViews() {
  revalidatePath("/dashboard/facility-hygiene");
  revalidatePath("/dashboard/daily-control");
  revalidatePath("/dashboard/reports/daily");
}

export async function createCleaningProductAction(
  input: z.infer<typeof cleaningProductSchema>,
): Promise<FacilityHygieneResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager"]);
    const parsed = cleaningProductSchema.parse(input);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("cleaning_products").insert({
      organization_id: profile.organization_id,
      name: parsed.name,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "Вече има препарат с това име." };
      }

      return { ok: false, message: error.message };
    }

    revalidateFacilityHygieneViews();
    return { ok: true, message: "Препаратът е добавен." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно добавяне на препарат.",
    };
  }
}

export async function saveFacilityHygieneAreaTemplateAction(
  input: z.infer<typeof facilityAreaTemplateSchema>,
): Promise<FacilityHygieneResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager"]);
    const parsed = facilityAreaTemplateSchema.parse(input);
    const productIds = [...new Set(parsed.productIds)];
    const supabase = await createServerSupabaseClient();

    const { data: validProducts, error: productsError } = await supabase
      .from("cleaning_products")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .in("id", productIds);

    if (productsError) {
      return { ok: false, message: productsError.message };
    }

    if ((validProducts ?? []).length !== productIds.length) {
      return { ok: false, message: "Избрани са невалидни препарати." };
    }

    let areaId = parsed.areaId;
    let createdNewArea = false;

    if (areaId) {
      const { error: updateError } = await supabase
        .from("facility_hygiene_areas")
        .update({
          name: parsed.name,
        })
        .eq("id", areaId)
        .eq("organization_id", profile.organization_id);

      if (updateError) {
        if (updateError.code === "23505") {
          return { ok: false, message: "Вече има зона с това име." };
        }
        return { ok: false, message: updateError.message };
      }
    } else {
      const { data: createdArea, error: insertError } = await supabase
        .from("facility_hygiene_areas")
        .insert({
          organization_id: profile.organization_id,
          name: parsed.name,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError) {
        if (insertError.code === "23505") {
          return { ok: false, message: "Вече има зона с това име." };
        }
        return { ok: false, message: insertError.message };
      }

      areaId = createdArea.id;
      createdNewArea = true;
    }

    const { error: deleteMappingsError } = await supabase
      .from("facility_hygiene_area_products")
      .delete()
      .eq("organization_id", profile.organization_id)
      .eq("area_id", areaId);

    if (deleteMappingsError) {
      return { ok: false, message: deleteMappingsError.message };
    }

    const { error: insertMappingsError } = await supabase
      .from("facility_hygiene_area_products")
      .insert(
        productIds.map((productId) => ({
          organization_id: profile.organization_id,
          area_id: areaId,
          cleaning_product_id: productId,
        })),
      );

    if (insertMappingsError) {
      if (createdNewArea) {
        await supabase
          .from("facility_hygiene_areas")
          .delete()
          .eq("id", areaId)
          .eq("organization_id", profile.organization_id);
      }

      return { ok: false, message: insertMappingsError.message };
    }

    revalidateFacilityHygieneViews();
    return {
      ok: true,
      message: createdNewArea ? "Зоната е добавена." : "Зоната е обновена.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване на зоната.",
    };
  }
}

export async function createFacilityHygieneLogAction(
  input: z.infer<typeof facilityHygieneSchema>,
): Promise<FacilityHygieneResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = facilityHygieneSchema.parse(input);
    const correctiveAction = parsed.correctiveAction?.trim() || null;

    if (parsed.status === "issue_found" && !correctiveAction) {
      return { ok: false, message: "При проблем коригиращото действие е задължително." };
    }

    const supabase = await createServerSupabaseClient();

    const { data: area, error: areaError } = await supabase
      .from("facility_hygiene_areas")
      .select("id, name")
      .eq("id", parsed.areaId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle<{ id: string; name: string }>();

    if (areaError) {
      return { ok: false, message: areaError.message };
    }

    if (!area) {
      return { ok: false, message: "Зоната не беше намерена." };
    }

    const { data: mappings, error: mappingsError } = await supabase
      .from("facility_hygiene_area_products")
      .select("cleaning_product_id")
      .eq("organization_id", profile.organization_id)
      .eq("area_id", parsed.areaId);

    if (mappingsError) {
      return { ok: false, message: mappingsError.message };
    }

    const productIds = [...new Set((mappings ?? []).map((item) => item.cleaning_product_id as string))];

    const { data: products, error: productsError } = productIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("cleaning_products")
          .select("id, name")
          .eq("organization_id", profile.organization_id)
          .in("id", productIds);

    if (productsError) {
      return { ok: false, message: productsError.message };
    }

    const snapshot = ((products ?? []) as CleaningProductRow[]).map((product) => ({
      id: product.id,
      name: product.name,
    }));

    const { error } = await supabase.from("facility_hygiene_logs").insert({
      organization_id: profile.organization_id,
      area_id: parsed.areaId,
      check_date: parsed.checkDate,
      performed_at: new Date().toISOString(),
      performed_by_user_id: profile.id,
      status: parsed.status,
      corrective_action: correctiveAction,
      notes: parsed.notes?.trim() || null,
      used_products_snapshot: snapshot,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "За тази зона вече има потвърждение за днес." };
      }
      return { ok: false, message: error.message };
    }

    revalidateFacilityHygieneViews();
    return { ok: true, message: `Зоната "${area.name}" е потвърдена.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}
