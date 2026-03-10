import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export type AppRole = "owner" | "manager" | "staff";

export type OrganizationSummary = {
  id: string;
  name: string;
  org_code: string;
  subscription_status: "active" | "trial" | "past_due";
};

export type UserProfile = {
  id: string;
  organization_id: string;
  role: AppRole;
  username: string;
  is_active: boolean;
  organizations: OrganizationSummary | null;
};

export function hasAnyRole(role: AppRole, allowedRoles: AppRole[]) {
  return allowedRoles.includes(role);
}

export async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        organization_id,
        role,
        username,
        is_active,
        organizations (
          id,
          name,
          org_code,
          subscription_status
        )
      `,
    )
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function requireProfileForPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/auth/login?error=Невалиден достъп. Моля, влезте отново.");
  }

  return profile;
}

export async function requireRoleForPage(allowedRoles: AppRole[]) {
  const profile = await requireProfileForPage();

  if (!hasAnyRole(profile.role, allowedRoles)) {
    redirect("/dashboard");
  }

  return profile;
}

export async function requireProfileForAction() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    throw new Error("Невалиден достъп. Моля, влезте отново.");
  }

  return profile;
}

export async function requireRoleForAction(allowedRoles: AppRole[]) {
  const profile = await requireProfileForAction();

  if (!hasAnyRole(profile.role, allowedRoles)) {
    throw new Error("Нямате права за тази операция.");
  }

  return profile;
}
