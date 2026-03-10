import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/auth/login", request.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(request: NextRequest) {
  // Redirect GET to login — logout must be POST to prevent CSRF
  const redirectUrl = new URL("/auth/login", request.url);
  return NextResponse.redirect(redirectUrl);
}
