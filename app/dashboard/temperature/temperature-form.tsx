"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isTempOutOfRange, requiresCorrectiveAction } from "@/lib/domain/temperature";
import { createTemperatureLogAction } from "./actions";

type EquipmentType = "fridge" | "freezer" | "room";

type EquipmentOption = {
  id: string;
  name: string;
  type: EquipmentType;
  min_temp: number;
  max_temp: number;
};

type TemperatureFormProps = {
  equipmentList: EquipmentOption[];
  preselectedEquipmentId?: string;
};

const baseSchema = z.object({
  equipmentId: z.string().min(1, "Изберете уред."),
  recordedTemp: z
    .coerce
    .number({ invalid_type_error: "Въведете валидна температура." })
    .min(-30, "Температурата трябва да е минимум -30°C.")
    .max(100, "Температурата трябва да е максимум 100°C."),
  correctiveAction: z
    .string()
    .max(500, "Коригиращото действие може да е до 500 символа.")
    .optional(),
});

function formatTimestampToMinute(isoString: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function formatType(type: EquipmentType) {
  if (type === "fridge") return "Хладилник";
  if (type === "freezer") return "Фризер";
  return "Помещение";
}

export function TemperatureForm({ equipmentList, preselectedEquipmentId }: TemperatureFormProps) {
  const [lastRecordedAt, setLastRecordedAt] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const equipmentById = useMemo(
    () => new Map(equipmentList.map((equipment) => [equipment.id, equipment])),
    [equipmentList],
  );

  const schema = useMemo(
    () =>
      baseSchema.superRefine((values, ctx) => {
        const selectedEquipment = equipmentById.get(values.equipmentId);
        const correctiveAction = values.correctiveAction?.trim();

        if (!selectedEquipment) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["equipmentId"],
            message: "Изберете валиден уред.",
          });
          return;
        }

        if (requiresCorrectiveAction(values.recordedTemp, selectedEquipment) && !correctiveAction) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["correctiveAction"],
            message: `Температурата ${values.recordedTemp}°C е извън диапазона (${selectedEquipment.min_temp}°C – ${selectedEquipment.max_temp}°C). Въведете коригиращо действие.`,
          });
        }
      }),
    [equipmentById],
  );

  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      equipmentId: preselectedEquipmentId ?? "",
      recordedTemp: 0,
      correctiveAction: "",
    },
  });

  const selectedEquipmentId = useWatch({
    control: form.control,
    name: "equipmentId",
  });

  const watchedTemp = useWatch({
    control: form.control,
    name: "recordedTemp",
  });

  const selectedEquipment = useMemo(
    () => equipmentById.get(selectedEquipmentId),
    [equipmentById, selectedEquipmentId],
  );

  const tempNum = typeof watchedTemp === "number" ? watchedTemp : Number(watchedTemp);
  const isOutOfRange = selectedEquipment && !Number.isNaN(tempNum)
    ? isTempOutOfRange(tempNum, selectedEquipment)
    : false;

  const onSubmit = (values: z.infer<typeof baseSchema>) => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await createTemperatureLogAction({
        equipmentId: values.equipmentId,
        recordedTemp: values.recordedTemp,
        correctiveAction: values.correctiveAction,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      setServerMessage(result.message);
      if (result.recordedAt) {
        setLastRecordedAt(result.recordedAt);
      }

      form.reset({
        equipmentId: values.equipmentId,
        recordedTemp: 0,
        correctiveAction: "",
      });
    });
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Температурен дневник</CardTitle>
          <CardDescription>
            Изберете уред и въведете измерената температура.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Уред</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-base" data-testid="equipment-select">
                          <SelectValue placeholder="Изберете уред" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipmentList.map((equipment) => (
                          <SelectItem
                            key={equipment.id}
                            value={equipment.id}
                            className="py-3 text-base"
                          >
                            <span className="font-medium">{equipment.name}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {formatType(equipment.type)} ({equipment.min_temp}°C – {equipment.max_temp}°C)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedEquipment ? (
                      <div className="mt-1 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium">{formatType(selectedEquipment.type)}</span>
                        <span className="text-slate-400">|</span>
                        <span>Допустимо: {selectedEquipment.min_temp}°C – {selectedEquipment.max_temp}°C</span>
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recordedTemp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Температура (°C)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0.0"
                          step="0.1"
                          className={`h-14 text-center text-2xl font-bold tabular-nums ${
                            selectedEquipment
                              ? isOutOfRange
                                ? "border-red-400 bg-red-50 text-red-700 focus-visible:ring-red-400"
                                : "border-emerald-400 bg-emerald-50 text-emerald-700 focus-visible:ring-emerald-400"
                              : ""
                          }`}
                          data-testid="temperature-input"
                          {...field}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                        {selectedEquipment ? (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isOutOfRange ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </FormControl>
                    {selectedEquipment && isOutOfRange ? (
                      <p className="mt-1 flex items-center gap-1 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Извън допустимия диапазон! Необходимо е коригиращо действие.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="correctiveAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Коригиращо действие
                      {isOutOfRange ? (
                        <span className="ml-1 text-xs font-normal text-red-600">(задължително)</span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-slate-400">(при отклонение)</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишете предприетото действие при отклонение."
                        className={`min-h-20 text-base ${isOutOfRange ? "border-red-300" : ""}`}
                        data-testid="corrective-action-textarea"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {selectedEquipment
                        ? `Задължително при отклонение извън ${selectedEquipment.min_temp}°C – ${selectedEquipment.max_temp}°C.`
                        : "Задължително при температура извън допустимия диапазон."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full text-base font-semibold"
                  data-testid="submit-temperature"
                >
                  {isPending ? "Записване..." : "Запиши измерването"}
                </Button>

                {serverMessage ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {serverMessage}
                  </div>
                ) : null}
                {serverError ? (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {serverError}
                  </div>
                ) : null}
                {lastRecordedAt ? (
                  <p className="text-center text-xs text-slate-500">
                    Последно записване: {formatTimestampToMinute(lastRecordedAt)} ч.
                  </p>
                ) : null}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
