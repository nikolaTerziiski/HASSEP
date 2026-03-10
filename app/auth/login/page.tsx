import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход в ХАСЕП системата</CardTitle>
          <CardDescription>
            Въведете кода на обекта, потребителско име и парола.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationCode">Код на обект</Label>
              <Input id="organizationCode" name="organizationCode" placeholder="Напр. happy-bg" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Потребител</Label>
              <Input id="username" name="username" placeholder="Напр. ivan.petrov" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Парола</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full">
              Влез
            </Button>

            <p className="text-center text-sm text-slate-600">
              Нямате обект?{" "}
              <Link href="/register" className="font-medium text-slate-900 underline">
                Регистрирайте ресторант
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
