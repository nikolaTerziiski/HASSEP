import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShieldCheck, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  {
    icon: Thermometer,
    title: "Температурни дневници",
    description: "Следете температури, отклонения и коригиращи действия на едно място.",
  },
  {
    icon: ClipboardCheck,
    title: "Оперативен контрол",
    description: "Поддържайте входящ контрол и хигиенни записи без хартиени таблици.",
  },
  {
    icon: ShieldCheck,
    title: "Роли и достъп",
    description: "Влизайте сигурно с код на обект, потребителско име и парола.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              ХАСЕП за ресторанти
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Управлявайте ХАСЕП дневниците на обекта без хаос и ръчни таблици.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Централизирайте температурен контрол, входящи доставки и оперативни записи в
                една система, достъпна за целия екип.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-slate-200">
                <Link href="/auth/login">
                  Вход
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="border-white/10 bg-white/5 text-white shadow-2xl">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="rounded-xl bg-white/10 p-3 text-slate-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold">{item.title}</h2>
                      <p className="text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </div>
      </div>
    </main>
  );
}
