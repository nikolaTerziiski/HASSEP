"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <section className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Възникна грешка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Нещо се обърка при зареждане на страницата. Моля, опитайте отново.
          </p>
          {error.digest ? (
            <p className="text-xs text-slate-400">Код: {error.digest}</p>
          ) : null}
          <Button onClick={reset} className="h-11 w-full">
            Опитай отново
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
