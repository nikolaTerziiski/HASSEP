"use client";

import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, FileUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeIncomingInvoiceAction, saveIncomingInvoiceAction } from "./actions";

const verifyItemSchema = z.object({
  product: z.string().trim().min(1, "Продуктът е задължителен."),
  quantity: z.string().trim().min(1, "Количеството е задължително."),
  batchNumber: z.string().trim().max(120).optional().default(""),
  expiryDate: z.string().trim().max(50).optional().default(""),
});

const verifyFormSchema = z.object({
  supplier: z.string().trim().min(1, "Доставчикът е задължителен.").max(200),
  documentNumber: z.string().trim().min(1, "Номерът на документа е задължителен.").max(120),
  date: z.string().trim().min(1, "Датата е задължителна."),
  items: z.array(verifyItemSchema).min(1, "Добавете поне един артикул."),
});

type VerifyFormValues = z.infer<typeof verifyFormSchema>;

type AnalysisMeta = {
  storageBucket: string;
  storagePath: string;
  signedImageUrl: string | null;
};

export function IncomingForm() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoodsOk, setIsGoodsOk] = useState(true);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifyFormSchema),
    defaultValues: {
      supplier: "",
      documentNumber: "",
      date: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      setSelectedFile(file);
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleAnalyze = () => {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startAnalyzeTransition(async () => {
      const formData = new FormData();
      formData.append("invoiceFile", selectedFile);

      const result = await analyzeIncomingInvoiceAction(formData);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setAnalysisMeta({
        storageBucket: result.data.storageBucket,
        storagePath: result.data.storagePath,
        signedImageUrl: result.data.signedImageUrl,
      });

      form.setValue("supplier", result.data.supplier);
      form.setValue("documentNumber", result.data.documentNumber);
      form.setValue("date", result.data.date);
      replace(result.data.items);
      setSuccessMessage(result.message);
    });
  };

  const onSubmitVerified = (values: VerifyFormValues) => {
    if (!analysisMeta) {
      setErrorMessage("Първо стартирайте анализ и прегледайте резултатите.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startSaveTransition(async () => {
      const result = await saveIncomingInvoiceAction({
        supplier: values.supplier,
        documentNumber: values.documentNumber,
        date: values.date,
        items: values.items,
        storageBucket: analysisMeta.storageBucket,
        storagePath: analysisMeta.storagePath,
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setSelectedFile(null);
      setAnalysisMeta(null);
      setIsGoodsOk(true);
      form.reset({
        supplier: "",
        documentNumber: "",
        date: new Date().toISOString().slice(0, 10),
        items: [],
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const handleSave = () => {
    void form.handleSubmit(onSubmitVerified)();
  };

  return (
    <div className="space-y-4">
      {/* ── Step A: AI Invoice Scan ── */}
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragActive
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <FileUp className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">
              Плъзнете снимка или изберете файл
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              Избери файл
            </Button>
            {selectedFile ? (
              <p className="mt-2 truncate text-sm font-medium text-emerald-700">
                {selectedFile.name}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Все още няма избран файл.</p>
            )}
          </div>

          {/* ── BIG AI Scan Button ── */}
          <Button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-semibold shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-emerald-300 active:scale-[0.98]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Анализиране...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Сканирай фактура с AI
              </>
            )}
          </Button>

          {/* ── Image preview ── */}
          {analysisMeta?.signedImageUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Image
                src={analysisMeta.signedImageUrl}
                alt="Качена фактура"
                width={1024}
                height={640}
                className="max-h-48 w-full object-contain"
              />
            </div>
          ) : null}

          {/* ── Messages ── */}
          {errorMessage ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Step B: Verify & Save ── */}
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base">Проверка на данните</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          {/* ── Header fields ── */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Доставчик
              </label>
              <Input
                {...form.register("supplier")}
                placeholder="Име на доставчик"
                className="mt-1 rounded-xl"
              />
              {form.formState.errors.supplier ? (
                <p className="mt-0.5 text-xs text-red-600">
                  {form.formState.errors.supplier.message}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Документ №
                </label>
                <Input
                  {...form.register("documentNumber")}
                  placeholder="INV-12345"
                  className="mt-1 rounded-xl"
                />
                {form.formState.errors.documentNumber ? (
                  <p className="mt-0.5 text-xs text-red-600">
                    {form.formState.errors.documentNumber.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Дата
                </label>
                <Input
                  type="date"
                  {...form.register("date")}
                  className="mt-1 rounded-xl"
                />
                {form.formState.errors.date ? (
                  <p className="mt-0.5 text-xs text-red-600">
                    {form.formState.errors.date.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Item cards ── */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Артикули
            </label>

            {fields.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Няма артикули. Стартирайте анализ или добавете ръчно.
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          {...form.register(`items.${index}.product`)}
                          placeholder="Продукт"
                          className="rounded-lg font-medium"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            {...form.register(`items.${index}.quantity`)}
                            placeholder="Количество"
                            className="rounded-lg"
                          />
                          <Input
                            {...form.register(`items.${index}.batchNumber`)}
                            placeholder="Партида / L-№"
                            className="rounded-lg"
                          />
                        </div>
                        <Input
                          {...form.register(`items.${index}.expiryDate`)}
                          placeholder="Срок на годност"
                          className="rounded-lg"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 shrink-0 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full rounded-xl"
              onClick={() =>
                append({ product: "", quantity: "", batchNumber: "", expiryDate: "" })
              }
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Добави артикул
            </Button>

            {form.formState.errors.items?.message ? (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.items.message}
              </p>
            ) : null}
          </div>

          {/* ── Perfect Condition Toggle ── */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors active:bg-slate-50"
            onClick={() => setIsGoodsOk((prev) => !prev)}
          >
            <span className="text-sm font-medium leading-snug">
              &#x2705; Стоката е изрядна (Няма забележки)
            </span>
            <span
              role="switch"
              aria-checked={isGoodsOk}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                isGoodsOk ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5.5 w-5.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${
                  isGoodsOk ? "translate-x-[22px]" : "translate-x-[3px]"
                }`}
              />
            </span>
          </button>

          {/* ── Corrective Action (animated reveal) ── */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isGoodsOk
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="pt-1">
                <label className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Коригиращо действие
                </label>
                <Textarea
                  placeholder="Опишете забележките и предприетите мерки..."
                  className="mt-1 rounded-xl border-red-200 focus-visible:ring-red-400"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ── Submit Button ── */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !analysisMeta}
            className="h-12 w-full rounded-2xl text-base font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Записване...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Потвърди и Запиши
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
