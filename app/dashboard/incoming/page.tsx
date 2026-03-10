"use client";

import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function IncomingControlPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Входящ контрол</CardTitle>
          <CardDescription>
            Качете снимка, анализирайте с AI и потвърдете ръчно преди запис.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Стъпка A: Сканирай фактура с AI (Analyze)
            </p>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
                isDragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <FileUp className="mx-auto h-10 w-10 text-slate-500" />
              <p className="mt-3 text-sm text-slate-700">
                Плъзнете снимка на фактура или изберете файл.
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
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Избери файл
              </Button>
              {selectedFile ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">
                  Избран файл: {selectedFile.name}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Все още няма избран файл.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Анализиране...
                </>
              ) : (
                "Анализирай с AI"
              )}
            </Button>
            <p className="text-sm text-slate-500">
              Данните няма да се запишат автоматично. Първо ги проверете.
            </p>
          </div>

          {analysisMeta?.signedImageUrl ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Качена снимка</p>
              <Image
                src={analysisMeta.signedImageUrl}
                alt="Качена фактура"
                width={1024}
                height={640}
                className="max-h-64 w-auto rounded-md border border-slate-200 object-contain"
              />
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Стъпка B: Проверка и редакция (Verify)</CardTitle>
          <CardDescription>
            Редактирайте AI данните преди окончателно записване.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Доставчик</label>
              <Input {...form.register("supplier")} placeholder="Име на доставчик" />
              {form.formState.errors.supplier ? (
                <p className="text-xs text-red-700">{form.formState.errors.supplier.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Номер на документ</label>
              <Input {...form.register("documentNumber")} placeholder="INV-12345" />
              {form.formState.errors.documentNumber ? (
                <p className="text-xs text-red-700">{form.formState.errors.documentNumber.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Дата</label>
              <Input type="date" {...form.register("date")} />
              {form.formState.errors.date ? (
                <p className="text-xs text-red-700">{form.formState.errors.date.message}</p>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Партида / L-номер</TableHead>
                  <TableHead>Срок на годност</TableHead>
                  <TableHead className="w-20">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      Няма артикули. Стартирайте анализ или добавете ръчно ред.
                    </TableCell>
                  </TableRow>
                ) : null}

                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        {...form.register(`items.${index}.product`)}
                        placeholder="Продукт"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        {...form.register(`items.${index}.quantity`)}
                        placeholder="Количество"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        {...form.register(`items.${index}.batchNumber`)}
                        placeholder="Партида"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        {...form.register(`items.${index}.expiryDate`)}
                        placeholder="DD.MM.YYYY"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  product: "",
                  quantity: "",
                  batchNumber: "",
                  expiryDate: "",
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Добави ред
            </Button>
          </div>

          {form.formState.errors.items?.message ? (
            <p className="text-sm text-red-700">{form.formState.errors.items.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Стъпка C: Потвърди и запиши</CardTitle>
          <CardDescription>
            Записът в базата става само след натискане на този бутон.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={handleSave} disabled={isSaving || !analysisMeta}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Записване...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Потвърди и Запиши
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
