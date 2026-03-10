import { getLocalISODate } from "@/lib/date/local-day";
import { requireProfileForPage } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { FacilityHygieneForm } from "./facility-hygiene-form";
import type { FacilityHygieneStatus, UsedProductsSnapshotItem } from "./constants";

type CleaningProductRow = {
  id: string;
  name: string;
};

type FacilityAreaRow = {
  id: string;
  name: string;
};

type AreaProductMappingRow = {
  area_id: string;
  cleaning_product_id: string;
};

type FacilityHygieneLogRow = {
  id: string;
  area_id: string;
  status: FacilityHygieneStatus;
  notes: string | null;
  corrective_action: string | null;
  performed_at: string;
  performed_by_user_id: string;
  used_products_snapshot: UsedProductsSnapshotItem[] | null;
};

type ProfileRow = {
  id: string;
  username: string;
};

export default async function FacilityHygienePage() {
  const profile = await requireProfileForPage();
  const supabase = await createServerSupabaseClient();
  const today = getLocalISODate();

  const [
    { data: products, error: productsError },
    { data: areas, error: areasError },
    { data: areaProducts, error: areaProductsError },
    { data: todayLogs, error: todayLogsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("cleaning_products")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .order("name", { ascending: true }),
    supabase
      .from("facility_hygiene_areas")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .order("name", { ascending: true }),
    supabase
      .from("facility_hygiene_area_products")
      .select("area_id, cleaning_product_id")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("facility_hygiene_logs")
      .select("id, area_id, status, notes, corrective_action, performed_at, performed_by_user_id, used_products_snapshot")
      .eq("organization_id", profile.organization_id)
      .eq("check_date", today)
      .order("performed_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true),
  ]);

  if (productsError) throw new Error(productsError.message);
  if (areasError) throw new Error(areasError.message);
  if (areaProductsError) throw new Error(areaProductsError.message);
  if (todayLogsError) throw new Error(todayLogsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const productRows = (products ?? []) as CleaningProductRow[];
  const areaRows = (areas ?? []) as FacilityAreaRow[];
  const mappingRows = (areaProducts ?? []) as AreaProductMappingRow[];
  const logRows = (todayLogs ?? []) as FacilityHygieneLogRow[];
  const usernameById = Object.fromEntries(((profiles ?? []) as ProfileRow[]).map((item) => [item.id, item.username]));
  const productById = new Map(productRows.map((product) => [product.id, product]));
  const productIdsByAreaId = new Map<string, string[]>();

  for (const mapping of mappingRows) {
    const existing = productIdsByAreaId.get(mapping.area_id) ?? [];
    existing.push(mapping.cleaning_product_id);
    productIdsByAreaId.set(mapping.area_id, existing);
  }

  const configuredAreas = areaRows.map((area) => ({
    id: area.id,
    name: area.name,
    productIds: productIdsByAreaId.get(area.id) ?? [],
    products: (productIdsByAreaId.get(area.id) ?? [])
      .map((productId) => productById.get(productId))
      .filter((product): product is CleaningProductRow => Boolean(product)),
  }));

  return (
    <section className="space-y-4">
      <FacilityHygieneForm
        role={profile.role}
        todayDate={today}
        cleaningProducts={productRows}
        areas={configuredAreas}
        todayLogs={logRows}
        usernameById={usernameById}
      />
    </section>
  );
}
