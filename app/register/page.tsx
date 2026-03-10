import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerOwnerAction } from "./actions";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Регистрация на ресторант</CardTitle>
          <CardDescription>
            Създайте нов обект и owner акаунт за ХАСЕП системата.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerOwnerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Име на ресторант</Label>
              <Input
                id="restaurantName"
                name="restaurantName"
                placeholder="Напр. Happy Bar & Grill"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationCode">Желан код (slug)</Label>
              <Input
                id="organizationCode"
                name="organizationCode"
                placeholder="Напр. happy-bar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerUsername">Потребителско име на собственика</Label>
              <Input id="ownerUsername" name="ownerUsername" placeholder="Напр. owner1" required />
              <p className="text-sm text-slate-600">
                Ще влизате с код на обект, това потребителско име и парола.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email на собственика</Label>
              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="owner@restaurant.bg"
                required
              />
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
              Създай ресторант и влез
            </Button>

            <p className="text-center text-sm text-slate-600">
              Вече имате акаунт?{" "}
              <Link href="/auth/login" className="font-medium text-slate-900 underline">
                Вход
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
