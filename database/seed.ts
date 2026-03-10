/**
 * Seed script: creates a test organization, owner, staff user, and sample equipment.
 *
 * Usage:
 *   npx tsx database/seed.ts
 *
 * Prerequisites:
 *   - .env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Migrations 001 and 002 must already be applied via the Supabase SQL Editor
 *
 * Test credentials after running:
 *   Owner login:   org code "demo-bg" / username "admin" / password "demo123456"
 *   Staff login:   org code "demo-bg" / username "staff1" / password "demo123456"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (we are outside of Next.js)
function loadEnvLocal() {
  try {
    const envPath = resolve(__dirname, "../.env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local might not exist — rely on environment variables
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AUTH_DOMAIN = "auth.hassep.local";
const ORG_NAME = "Демо Ресторант";
const ORG_CODE = "demo-bg";
const OWNER_USERNAME = "admin";
const OWNER_EMAIL = `${OWNER_USERNAME}__${ORG_CODE}@${AUTH_DOMAIN}`;
const STAFF_USERNAME = "staff1";
const STAFF_EMAIL = `${STAFF_USERNAME}__${ORG_CODE}@${AUTH_DOMAIN}`;
const PASSWORD = "demo123456";

async function main() {
  console.log("--- HASSEP Seed Script ---\n");

  // 1. Create owner auth user
  console.log("1. Creating owner auth user...");
  let ownerUserId: string;

  // Try to find existing user first
  const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const existingOwnerUser = allUsers?.find((u) => u.email === OWNER_EMAIL);

  if (existingOwnerUser) {
    console.log(`   Owner already exists (${existingOwnerUser.id}), reusing.`);
    ownerUserId = existingOwnerUser.id;
  } else {
    const { data: createdOwner, error: ownerError } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { organization_code: ORG_CODE, username: OWNER_USERNAME, role: "owner" },
    });

    if (ownerError) {
      console.error("   Failed to create owner:", ownerError.message);
      process.exit(1);
    }

    ownerUserId = createdOwner.user.id;
    console.log(`   Created owner: ${ownerUserId}`);
  }

  // 2. Create organization + profile via the DB function
  console.log("2. Creating organization...");
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("org_code", ORG_CODE)
    .maybeSingle();

  let orgId: string;

  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`   Organization already exists (${orgId}), reusing.`);
  } else {
    const { data: newOrgId, error: orgError } = await supabase.rpc(
      "create_organization_with_owner",
      {
        p_owner_user_id: ownerUserId,
        p_name: ORG_NAME,
        p_org_code: ORG_CODE,
        p_owner_username: OWNER_USERNAME,
        p_contact_email: "admin@demo.bg",
      },
    );

    if (orgError) {
      console.error("   Failed to create organization:", orgError.message);
      process.exit(1);
    }

    orgId = newOrgId;
    console.log(`   Created organization: ${orgId}`);
  }

  // 3. Create staff user
  console.log("3. Creating staff user...");
  const existingStaffUser = allUsers?.find((u) => u.email === STAFF_EMAIL);
  let staffUserId: string;

  if (existingStaffUser) {
    staffUserId = existingStaffUser.id;
    console.log(`   Staff user already exists (${staffUserId}), reusing.`);
  } else {
    const { data: createdStaff, error: staffAuthError } = await supabase.auth.admin.createUser({
      email: STAFF_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { organization_code: ORG_CODE, username: STAFF_USERNAME },
    });

    if (staffAuthError) {
      console.error("   Failed to create staff auth user:", staffAuthError.message);
      process.exit(1);
    }

    staffUserId = createdStaff.user.id;
    console.log(`   Created staff auth user: ${staffUserId}`);

    // Insert staff profile
    const { error: staffProfileError } = await supabase.from("profiles").insert({
      id: staffUserId,
      organization_id: orgId,
      role: "staff",
      username: STAFF_USERNAME,
      is_active: true,
    });

    if (staffProfileError) {
      console.error("   Failed to create staff profile:", staffProfileError.message);
    } else {
      console.log("   Created staff profile.");
    }
  }

  // 4. Create sample equipment
  console.log("4. Creating sample equipment...");
  const equipmentItems = [
    { name: "Хладилник кухня", type: "fridge", min_temp: 0, max_temp: 5 },
    { name: "Хладилник бар", type: "fridge", min_temp: 0, max_temp: 8 },
    { name: "Фризер", type: "freezer", min_temp: -22, max_temp: -16 },
    { name: "Склад", type: "room", min_temp: 15, max_temp: 25 },
  ];

  for (const eq of equipmentItems) {
    const { data: existing } = await supabase
      .from("equipment")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", eq.name)
      .maybeSingle();

    if (existing) {
      console.log(`   "${eq.name}" already exists, skipping.`);
      continue;
    }

    const { error } = await supabase.from("equipment").insert({
      organization_id: orgId,
      name: eq.name,
      type: eq.type,
      min_temp: eq.min_temp,
      max_temp: eq.max_temp,
      is_active: true,
    });

    if (error) {
      console.error(`   Failed to create "${eq.name}":`, error.message);
    } else {
      console.log(`   Created "${eq.name}" (${eq.type}: ${eq.min_temp}°C – ${eq.max_temp}°C)`);
    }
  }

  console.log("\n--- Seed complete! ---\n");
  console.log("Login credentials:");
  console.log("  Owner:  org code = demo-bg | username = admin  | password = demo123456");
  console.log("  Staff:  org code = demo-bg | username = staff1 | password = demo123456");
  console.log(`\nStart the app with: npm run dev`);
  console.log("Then open: http://localhost:3000/auth/login");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
