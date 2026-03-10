"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoleForAction } from "@/utils/auth/tenant";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createServerSupabaseClient } from "@/utils/supabase/server";

const analyzedItemSchema = z.object({
  product: z.string().trim().min(1).max(200),
  quantity: z.string().trim().min(1).max(100),
  batchNumber: z.string().trim().max(120).optional().default(""),
  expiryDate: z.string().trim().max(50).optional().default(""),
});

const analyzedInvoiceSchema = z.object({
  supplier: z.string().trim().min(1).max(200),
  documentNumber: z.string().trim().min(1).max(120),
  date: z.string().trim().min(1).max(30).optional(),
  items: z.array(analyzedItemSchema).min(1),
});

const saveInvoiceSchema = z.object({
  supplier: z.string().trim().min(1).max(200),
  documentNumber: z.string().trim().min(1).max(120),
  date: z.string().trim().min(1).max(30),
  storageBucket: z.string().trim().min(1),
  storagePath: z.string().trim().min(1),
  items: z.array(analyzedItemSchema).min(1),
});

export type IncomingEditableItem = z.infer<typeof analyzedItemSchema>;

export type AnalyzeIncomingResult =
  | {
      ok: true;
      message: string;
      data: {
        supplier: string;
        documentNumber: string;
        date: string;
        items: IncomingEditableItem[];
        storageBucket: string;
        storagePath: string;
        signedImageUrl: string | null;
      };
    }
  | {
      ok: false;
      message: string;
    };

export type SaveIncomingResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeDateInput(rawDate: string | undefined) {
  if (!rawDate) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function stripJsonCodeFence(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  return trimmed;
}

const verifiedBuckets = new Set<string>();

async function ensureBucketExists(bucketName: string) {
  if (verifiedBuckets.has(bucketName)) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const exists = buckets?.some((bucket) => bucket.name === bucketName);
  if (exists) {
    verifiedBuckets.add(bucketName);
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  if (createError) {
    throw new Error(createError.message);
  }

  verifiedBuckets.add(bucketName);
}

async function analyzeWithOpenAI(base64: string, mimeType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Липсва OPENAI_API_KEY за AI анализ.");
  }

  const prompt = `
Extract data from this invoice and return ONLY valid JSON with this exact shape:
{
  "supplier": "string",
  "documentNumber": "string",
  "date": "YYYY-MM-DD or closest available date string",
  "items": [
    {
      "product": "string",
      "quantity": "string",
      "batchNumber": "string",
      "expiryDate": "string"
    }
  ]
}
If a field is missing, use an empty string.
  `.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an OCR data extraction assistant. Return strict JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI грешка: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI не върна валиден резултат.");
  }

  return stripJsonCodeFence(content);
}

async function analyzeWithGemini(base64: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Липсва GEMINI_API_KEY/GOOGLE_AI_API_KEY за AI анализ.");
  }

  const prompt = `
Extract invoice data and return ONLY JSON with this shape:
{
  "supplier": "string",
  "documentNumber": "string",
  "date": "YYYY-MM-DD or closest available date string",
  "items": [
    {
      "product": "string",
      "quantity": "string",
      "batchNumber": "string",
      "expiryDate": "string"
    }
  ]
}
Use empty strings for missing fields.
  `.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini грешка: ${errorText}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts;
  const textPart = Array.isArray(parts) ? parts.find((part) => typeof part?.text === "string")?.text : null;

  if (!textPart) {
    throw new Error("Gemini не върна валиден резултат.");
  }

  return stripJsonCodeFence(textPart);
}

async function runAiInvoiceAnalysis(base64: string, mimeType: string) {
  if (process.env.OPENAI_API_KEY) {
    return analyzeWithOpenAI(base64, mimeType);
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
    return analyzeWithGemini(base64, mimeType);
  }

  throw new Error("Липсва AI ключ. Добавете OPENAI_API_KEY или GEMINI_API_KEY.");
}

export async function analyzeIncomingInvoiceAction(formData: FormData): Promise<AnalyzeIncomingResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const invoiceFile = formData.get("invoiceFile");

    if (!(invoiceFile instanceof File)) {
      return { ok: false, message: "Моля, изберете файл за анализ." };
    }

    if (invoiceFile.size > 10 * 1024 * 1024) {
      return { ok: false, message: "Файлът е твърде голям. Максимум 10 MB." };
    }

    if (!invoiceFile.type.startsWith("image/")) {
      return { ok: false, message: "Поддържат се само изображения в този етап." };
    }

    const bucket = process.env.SUPABASE_INCOMING_BUCKET ?? "incoming-invoices";
    await ensureBucketExists(bucket);

    const supabaseAdmin = createSupabaseAdminClient();
    const extension = invoiceFile.name.includes(".") ? invoiceFile.name.split(".").pop() : "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const storagePath = `org-${profile.organization_id}/${fileName}`;

    const arrayBuffer = await invoiceFile.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: invoiceFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    let parsedAiData: z.infer<typeof analyzedInvoiceSchema>;
    try {
      const aiRawJsonText = await runAiInvoiceAnalysis(fileBuffer.toString("base64"), invoiceFile.type);
      parsedAiData = analyzedInvoiceSchema.parse(JSON.parse(aiRawJsonText));
    } catch (aiError) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      throw aiError;
    }

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 30);

    return {
      ok: true,
      message: "AI анализът е готов. Прегледайте и потвърдете данните.",
      data: {
        supplier: parsedAiData.supplier,
        documentNumber: parsedAiData.documentNumber,
        date: normalizeDateInput(parsedAiData.date),
        items: parsedAiData.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          batchNumber: item.batchNumber ?? "",
          expiryDate: item.expiryDate ?? "",
        })),
        storageBucket: bucket,
        storagePath,
        signedImageUrl: signedUrlData?.signedUrl ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешен анализ.",
    };
  }
}

type SaveIncomingInput = z.infer<typeof saveInvoiceSchema>;

export async function saveIncomingInvoiceAction(input: SaveIncomingInput): Promise<SaveIncomingResult> {
  try {
    const profile = await requireRoleForAction(["owner", "manager", "staff"]);
    const parsed = saveInvoiceSchema.parse(input);

    if (!parsed.storagePath.startsWith(`org-${profile.organization_id}/`)) {
      return {
        ok: false,
        message: "Невалиден път на файл за текущата организация.",
      };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("incoming_logs").insert({
      organization_id: profile.organization_id,
      date: normalizeDateInput(parsed.date),
      supplier: parsed.supplier,
      invoice_number: parsed.documentNumber,
      items_json: parsed.items,
      image_url: `sb://${parsed.storageBucket}/${parsed.storagePath}`,
      user_id: profile.id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/dashboard/incoming");
    return { ok: true, message: "Входящият контрол е записан успешно." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Неуспешно записване.",
    };
  }
}
