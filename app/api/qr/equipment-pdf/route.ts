import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { getCurrentProfile, hasAnyRole } from "@/utils/auth/tenant";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type EquipmentRow = {
  id: string;
  name: string;
  type: "fridge" | "freezer" | "room";
};

function formatType(type: "fridge" | "freezer" | "room") {
  if (type === "fridge") return "Хладилник";
  if (type === "freezer") return "Фризер";
  return "Помещение";
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasAnyRole(profile.role, ["owner", "manager"])) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, type")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const equipmentList = (data ?? []) as EquipmentRow[];
  if (equipmentList.length === 0) {
    return new NextResponse("No active equipment found.", { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const origin = request.nextUrl.origin;

  for (const item of equipmentList) {
    const page = pdf.addPage([595, 842]); // A4 portrait
    const qrTargetUrl = `${origin}/dashboard/temperature?equipment_id=${item.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 420,
      margin: 1,
    });

    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBytes = Uint8Array.from(Buffer.from(qrBase64, "base64"));
    const qrImage = await pdf.embedPng(qrBytes);
    const qrSize = 260;
    const qrX = (595 - qrSize) / 2;
    const qrY = 350;

    page.drawText(profile.organizations?.name ?? "Обект", {
      x: 50,
      y: 780,
      size: 20,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText(item.name, {
      x: 50,
      y: 745,
      size: 17,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`Тип: ${formatType(item.type)}`, {
      x: 50,
      y: 720,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("Сканирай за бързо попълване на температурния дневник", {
      x: 110,
      y: 325,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(qrTargetUrl, {
      x: 50,
      y: 295,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  const bytes = await pdf.save();
  const pdfBuffer = Buffer.from(bytes);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="equipment-qr-codes.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
