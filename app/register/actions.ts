"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeOwnerRegistrationInput } from "@/lib/domain/auth";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const registerSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Името на ресторанта трябва да е поне 2 символа.")
    .max(120, "Името на ресторанта е твърде дълго."),
  organizationCode: z
    .string()
    .trim()
    .min(2, "Кодът трябва да е поне 2 символа.")
    .max(64, "Кодът е твърде дълъг."),
  ownerUsername: z
    .string()
    .trim()
    .min(3, "Потребителското име трябва да е поне 3 символа.")
    .max(32, "Потребителското име може да е до 32 символа."),
  ownerEmail: z
    .string()
    .trim()
    .email("Невалиден имейл адрес.")
    .max(255, "Имейлът е твърде дълъг."),
  password: z
    .string()
    .min(6, "Паролата трябва да е поне 6 символа.")
    .max(128, "Паролата е твърде дълга."),
});

function redirectWithError(message: string): never {
  const params = new URLSearchParams({
    error: message,
  });

  redirect(`/register?${params.toString()}`);
}

export async function registerOwnerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    restaurantName: formData.get("restaurantName"),
    organizationCode: formData.get("organizationCode"),
    ownerUsername: formData.get("ownerUsername"),
    ownerEmail: formData.get("ownerEmail"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("Невалидни входни данни.");
  }

  const values = parsed.data;
  const normalizedInput = normalizeOwnerRegistrationInput(values);

  if (normalizedInput.organizationCode.length < 2) {
    redirectWithError("Кодът трябва да съдържа поне 2 валидни символа.");
  }

  if (normalizedInput.ownerUsername.length < 3) {
    redirectWithError("Потребителското име трябва да съдържа поне 3 валидни символа.");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: existingOrganization, error: orgCheckError } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("org_code", normalizedInput.organizationCode)
    .maybeSingle();

  if (orgCheckError) {
    redirectWithError(orgCheckError.message);
  }

  if (existingOrganization) {
    redirectWithError("Този код на обект вече е зает.");
  }

  const { data: createdAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedInput.syntheticEmail,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      organization_code: normalizedInput.organizationCode,
      username: normalizedInput.ownerUsername,
      role: "owner",
    },
  });

  if (authError || !createdAuthUser.user) {
    redirectWithError(authError?.message ?? "Неуспешно създаване на потребител.");
  }

  const ownerUserId = createdAuthUser.user.id;

  const { data: createdOrganizationId, error: dbError } = await supabaseAdmin.rpc(
    "create_organization_with_owner",
    {
      p_owner_user_id: ownerUserId,
      p_name: normalizedInput.restaurantName,
      p_org_code: normalizedInput.organizationCode,
      p_owner_username: normalizedInput.ownerUsername,
      p_contact_email: normalizedInput.ownerEmail,
    },
  );

  if (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
    redirectWithError(dbError.message);
  }

  if (!createdOrganizationId) {
    await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
    redirectWithError("Неуспешно създаване на организация.");
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedInput.syntheticEmail,
    password: values.password,
  });

  if (signInError) {
    redirectWithError("Регистрацията е успешна, но входът не успя. Моля, влезте ръчно.");
  }

  redirect("/dashboard");
}
