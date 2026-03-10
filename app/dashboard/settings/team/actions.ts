"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildSyntheticEmail, normalizeIdentifier } from "@/utils/auth/synthetic-email";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const createStaffSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Потребителското име трябва да е поне 3 символа.")
    .max(32, "Потребителското име може да е до 32 символа."),
  password: z
    .string()
    .min(6, "Паролата трябва да е поне 6 символа.")
    .max(128, "Паролата е твърде дълга."),
  role: z.literal("staff"),
});

function revalidateTeamViews() {
  revalidatePath("/dashboard/settings/team");
}

export async function createStaffUserAction(formData: FormData) {
  const ownerProfile = await requireRoleForAction(["owner"]);
  const parsed = createStaffSchema.parse({
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  const supabase = await createServerSupabaseClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const normalizedUsername = normalizeIdentifier(parsed.username);

  const [{ count: activeStaffCount, error: countError }, { data: organization, error: organizationError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { head: true, count: "exact" })
        .eq("organization_id", ownerProfile.organization_id)
        .eq("role", "staff")
        .eq("is_active", true),
      supabase
        .from("organizations")
        .select("org_code")
        .eq("id", ownerProfile.organization_id)
        .single(),
    ]);

  if (countError) {
    throw new Error(countError.message);
  }

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if ((activeStaffCount ?? 0) >= 5) {
    throw new Error("Достигнат е лимитът от 5 активни служители (staff).");
  }

  const { data: existingUser, error: existingUserError } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", ownerProfile.organization_id)
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(existingUserError.message);
  }

  if (existingUser) {
    throw new Error("Потребителското име вече съществува в този обект.");
  }

  const syntheticEmail = buildSyntheticEmail(normalizedUsername, organization.org_code);
  const { data: createdAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: syntheticEmail,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      organization_code: organization.org_code,
      username: normalizedUsername,
    },
  });

  if (createAuthError || !createdAuthUser.user) {
    throw new Error(createAuthError?.message ?? "Неуспешно създаване на auth потребител.");
  }

  const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
    id: createdAuthUser.user.id,
    organization_id: ownerProfile.organization_id,
    role: "staff",
    username: normalizedUsername,
    is_active: true,
  });

  if (profileInsertError) {
    await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.user.id);
    throw new Error(profileInsertError.message);
  }

  revalidateTeamViews();
}

export async function deactivateStaffUserAction(formData: FormData) {
  const ownerProfile = await requireRoleForAction(["owner"]);
  const userId = z.string().uuid().parse(formData.get("userId"));

  if (ownerProfile.id === userId) {
    throw new Error("Не можете да деактивирате собствения си акаунт.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId)
    .eq("organization_id", ownerProfile.organization_id)
    .eq("role", "staff");

  if (error) {
    throw new Error(error.message);
  }

  revalidateTeamViews();
}
