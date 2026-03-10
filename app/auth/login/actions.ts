"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { buildLoginIdentifier } from "@/lib/domain/auth";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const loginSchema = z.object({
  organizationCode: z
    .string()
    .min(2, "Кодът на обекта трябва да е поне 2 символа.")
    .max(64, "Кодът на обекта е твърде дълъг."),
  username: z
    .string()
    .min(3, "Потребителското име трябва да е поне 3 символа.")
    .max(64, "Потребителското име е твърде дълго."),
  password: z
    .string()
    .min(6, "Паролата трябва да е поне 6 символа.")
    .max(128, "Паролата е твърде дълга."),
});

function redirectWithError(message: string): never {
  const params = new URLSearchParams({
    error: message,
  });

  redirect(`/auth/login?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    organizationCode: formData.get("organizationCode"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("Невалидни входни данни.");
  }

  const values = parsed.data;
  const loginIdentifier = buildLoginIdentifier({
    organizationCode: values.organizationCode,
    username: values.username,
  });

  if (loginIdentifier.organizationCode.length < 2 || loginIdentifier.username.length < 3) {
    redirectWithError("Невалидни входни данни.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginIdentifier.email,
    password: values.password,
  });

  if (error) {
    redirectWithError("Грешен код на обект, потребител или парола.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectWithError("Възникна проблем при вход. Опитайте отново.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirectWithError("Профилът е неактивен или липсва.");
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("org_code")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (orgError || !organization || organization.org_code !== loginIdentifier.organizationCode) {
    await supabase.auth.signOut();
    redirectWithError("Профилът не принадлежи към посочения обект.");
  }

  redirect("/dashboard");
}
