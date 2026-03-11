"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  UserCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ─────────────────────────── Types ─────────────────────────── */

export type DashboardMetrics = {
  temperatures: { total: number; logged: number };
  facilityHygiene: { total: number; logged: number };
  personalHygiene: { logged: number };
  powerShutoff: { isShutoff: boolean; shutoffAt: string | null };
};

type DailyControlClientProps = {
  metrics: DashboardMetrics;
  className?: string;
};

type Tone = "emerald" | "amber" | "red" | "slate";

type ModuleCardConfig = {
  key: string;
  title: string;
  eyebrow: string;
  value: string;
  hint: string;
  status: string;
  tone: Tone;
  icon: LucideIcon;
  progress: number | null;
  href: string;
};

type SignalRow = {
  label: string;
  value: string;
  tone: Tone;
};

type HeroVariant = "operational" | "attention" | "closed";

/* ─────────────────────── Design tokens ─────────────────────── */

const toneStyles: Record<
  Tone,
  {
    card: string;
    icon: string;
    badge: string;
    track: string;
    fill: string;
  }
> = {
  emerald: {
    card: "border-emerald-200 bg-emerald-50/80",
    icon: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20",
    badge: "border-emerald-300/70 bg-emerald-50 text-emerald-700",
    track: "bg-emerald-100",
    fill: "bg-emerald-500",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/80",
    icon: "bg-amber-500 text-white shadow-lg shadow-amber-500/20",
    badge: "border-amber-300/70 bg-amber-50 text-amber-700",
    track: "bg-amber-100",
    fill: "bg-amber-500",
  },
  red: {
    card: "border-red-200 bg-red-50/80",
    icon: "bg-red-600 text-white shadow-lg shadow-red-600/20",
    badge: "border-red-300/70 bg-red-50 text-red-700",
    track: "bg-red-100",
    fill: "bg-red-500",
  },
  slate: {
    card: "border-slate-200 bg-white",
    icon: "bg-slate-900 text-white shadow-lg shadow-slate-900/15",
    badge: "border-slate-300/80 bg-slate-50 text-slate-700",
    track: "bg-slate-200",
    fill: "bg-slate-500",
  },
};

const toneText: Record<Tone, string> = {
  emerald: "text-emerald-900",
  amber: "text-amber-900",
  red: "text-red-900",
  slate: "text-slate-900",
};

const heroStyles: Record<
  HeroVariant,
  { shell: string; badge: string; board: string; dot: string }
> = {
  operational: {
    shell:
      "border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(30,41,59,0.96)_42%,rgba(226,232,240,0.92)_100%)] text-white",
    badge: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/25",
    board: "border-white/10 bg-slate-950/35",
    dot: "bg-sky-300",
  },
  attention: {
    shell:
      "border-amber-200 bg-[linear-gradient(135deg,rgba(120,53,15,1),rgba(180,83,9,0.94)_44%,rgba(255,251,235,0.92)_100%)] text-white",
    badge: "bg-white/12 text-amber-100 ring-1 ring-white/15",
    board: "border-white/10 bg-black/15",
    dot: "bg-amber-200",
  },
  closed: {
    shell:
      "border-emerald-300 bg-[linear-gradient(135deg,rgba(2,44,34,1),rgba(6,78,59,0.95)_42%,rgba(209,250,229,0.92)_100%)] text-white",
    badge: "bg-emerald-300/14 text-emerald-100 ring-1 ring-emerald-200/20",
    board: "border-white/10 bg-slate-950/30",
    dot: "bg-emerald-200",
  },
};

/* ─────────────────────────── Helpers ────────────────────────── */

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCoverage(logged: number, total: number) {
  if (total <= 0) {
    return { configured: false, complete: false, remaining: 0, percent: 0 };
  }
  const safeLogged = Math.max(0, Math.min(logged, total));
  return {
    configured: true,
    complete: safeLogged >= total,
    remaining: Math.max(total - safeLogged, 0),
    percent: clampPercentage((safeLogged / total) * 100),
  };
}

function formatShutoffTime(value: string | null) {
  if (!value) return "Не е отчетено";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ──────────────────────── Sub-components ────────────────────── */

function SignalPill({ label, value, tone }: SignalRow) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-50"
      : tone === "amber"
        ? "border-amber-200/20 bg-amber-200/10 text-amber-50"
        : tone === "red"
          ? "border-red-300/25 bg-red-300/10 text-red-50"
          : "border-white/15 bg-white/10 text-white/90";

  const dotClass =
    tone === "emerald"
      ? "bg-emerald-300"
      : tone === "amber"
        ? "bg-amber-200"
        : tone === "red"
          ? "bg-red-300"
          : "bg-white/60";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        toneClass,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span className="text-xs font-medium uppercase tracking-[0.16em]">
        {label}
      </span>
      <span className="text-sm font-semibold normal-case tracking-normal">
        {value}
      </span>
    </div>
  );
}

function ModuleCard({
  card,
  index,
}: {
  card: ModuleCardConfig;
  index: number;
}) {
  const theme = toneStyles[card.tone];

  return (
    <Link href={card.href} className="block h-full">
      <Card
        className={cn(
          "relative h-full overflow-hidden rounded-2xl border transition-all duration-300",
          "hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]",
          "animate-in fade-in-50 slide-in-from-bottom-2 duration-500",
          theme.card,
        )}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <CardContent className="relative p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {card.eyebrow}
              </p>
              <h3
                className={cn(
                  "mt-2 text-lg font-semibold tracking-tight",
                  toneText[card.tone],
                )}
              >
                {card.title}
              </h3>
            </div>
            <div className={cn("rounded-2xl p-3", theme.icon)}>
              <card.icon className="h-6 w-6" />
            </div>
          </div>

          {/* Metric + hint */}
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p
                className={cn(
                  "text-4xl font-extrabold tracking-tight",
                  toneText[card.tone],
                )}
              >
                {card.value}
              </p>
              <p className="mt-2 max-w-[24ch] text-sm leading-6 text-slate-600">
                {card.hint}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                theme.badge,
              )}
            >
              {card.status}
            </span>
          </div>

          {/* Progress bar */}
          {card.progress !== null && (
            <div className="mt-5 space-y-2">
              <div
                className={cn("h-2 overflow-hidden rounded-full", theme.track)}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    theme.fill,
                  )}
                  style={{ width: `${card.progress}%` }}
                />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Покритие {card.progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/* ──────────────────────── Main component ────────────────────── */

export function DailyControlClient({
  metrics,
  className,
}: DailyControlClientProps) {
  const temperature = getCoverage(
    metrics.temperatures.logged,
    metrics.temperatures.total,
  );
  const facility = getCoverage(
    metrics.facilityHygiene.logged,
    metrics.facilityHygiene.total,
  );
  const personalLogged = Math.max(0, metrics.personalHygiene.logged);
  const powerRecorded = metrics.powerShutoff.isShutoff;
  const shutoffTimeLabel = formatShutoffTime(metrics.powerShutoff.shutoffAt);

  /* ── Attention logic ── */

  const blockingItems = [
    temperature.configured && !temperature.complete
      ? `Температури: чакат ${temperature.remaining} записа.`
      : null,
    facility.configured && !facility.complete
      ? `Хигиена на обекта: чакат ${facility.remaining} зони.`
      : null,
    personalLogged === 0 ? "Лична хигиена: няма подаден check-in." : null,
  ].filter((item): item is string => item !== null);

  const attentionItems = [
    ...blockingItems,
    !powerRecorded
      ? "Електрозахранване: финалното изключване още не е отчетено."
      : null,
  ].filter((item): item is string => item !== null);

  /* ── Hero variant ── */

  const heroVariant: HeroVariant = powerRecorded
    ? "closed"
    : blockingItems.length > 0
      ? "attention"
      : "operational";
  const heroTheme = heroStyles[heroVariant];

  const heroCopy =
    heroVariant === "closed"
      ? {
          badge: "Режим затваряне",
          title: "Обектът е обезопасен за деня",
          description: `Електрозахранването е отчетено като изключено в ${shutoffTimeLabel}. По-долу остават видими всички ключови сигнали за деня.`,
        }
      : heroVariant === "attention"
        ? {
            badge: "Нужен фокус",
            title: "Има незавършени дневни контроли",
            description:
              "Поне един ключов модул не е приключил. Мениджърът трябва да види какво липсва без да отваря няколко екрана.",
          }
        : {
            badge: "Под контрол",
            title: "Оперативният ден изглежда стабилен",
            description:
              "Основните проверки са в ход или приключени. Остава финалното изключване на тока в края на смяната.",
          };

  /* ── Signals ── */

  const signals: SignalRow[] = [
    {
      label: "Темп.",
      value: temperature.configured
        ? `${metrics.temperatures.logged}/${metrics.temperatures.total}`
        : "Няма точки",
      tone: !temperature.configured
        ? "slate"
        : temperature.complete
          ? "emerald"
          : "amber",
    },
    {
      label: "Обект",
      value: facility.configured
        ? `${metrics.facilityHygiene.logged}/${metrics.facilityHygiene.total}`
        : "Няма зони",
      tone: !facility.configured
        ? "slate"
        : facility.complete
          ? "emerald"
          : "amber",
    },
    {
      label: "Екип",
      value: `${personalLogged} check-in`,
      tone: personalLogged > 0 ? "emerald" : "amber",
    },
    {
      label: "Ток",
      value: powerRecorded ? shutoffTimeLabel : "Очаква се",
      tone: powerRecorded ? "emerald" : "amber",
    },
  ];

  const greenSignals = signals.filter((s) => s.tone === "emerald").length;

  /* ── Module cards ── */

  const moduleCards: ModuleCardConfig[] = [
    {
      key: "temperatures",
      title: "Температурен контрол",
      eyebrow: "HACCP точки",
      value: `${metrics.temperatures.logged}/${metrics.temperatures.total}`,
      hint: !temperature.configured
        ? "Няма активни температурни точки за следене."
        : temperature.complete
          ? "Всички уреди имат запис за днес."
          : `${temperature.remaining} температурни точки чакат запис.`,
      status: !temperature.configured
        ? "Без конфигурация"
        : temperature.complete
          ? "Завършено"
          : "Чака запис",
      tone: !temperature.configured
        ? "slate"
        : temperature.complete
          ? "emerald"
          : "amber",
      icon: Thermometer,
      progress: temperature.configured ? temperature.percent : null,
      href: "/dashboard/temperature",
    },
    {
      key: "facility",
      title: "Хигиена на обекта",
      eyebrow: "Зони",
      value: `${metrics.facilityHygiene.logged}/${metrics.facilityHygiene.total}`,
      hint: !facility.configured
        ? "Няма конфигурирани зони за дневна проверка."
        : facility.complete
          ? "Всички зони са потвърдени за днес."
          : `${facility.remaining} зони още не са отчетени.`,
      status: !facility.configured
        ? "Без конфигурация"
        : facility.complete
          ? "Потвърдено"
          : "Непълно",
      tone: !facility.configured
        ? "slate"
        : facility.complete
          ? "emerald"
          : "amber",
      icon: ClipboardCheck,
      progress: facility.configured ? facility.percent : null,
      href: "/dashboard/facility-hygiene",
    },
    {
      key: "personal",
      title: "Лична хигиена",
      eyebrow: "Екип",
      value: `${personalLogged}`,
      hint:
        personalLogged > 0
          ? `${personalLogged} служители са подали днешен health check.`
          : "Все още няма подадени лични check-in-и.",
      status: personalLogged > 0 ? "Има активност" : "Изчакване",
      tone: personalLogged > 0 ? "emerald" : "amber",
      icon: UserCheck,
      progress: null,
      href: "/dashboard/personal-hygiene",
    },
    {
      key: "power",
      title: "Изключване на тока",
      eyebrow: "Край на смяната",
      value: powerRecorded ? shutoffTimeLabel : "--:--",
      hint: powerRecorded
        ? "Обектът е маркиран като безопасно изключен."
        : "Все още няма отчетено изключване на електрозахранването.",
      status: powerRecorded ? "Записано" : "Отворено",
      tone: powerRecorded ? "emerald" : "slate",
      icon: PowerOff,
      progress: powerRecorded ? 100 : 0,
      href: "/dashboard/power-shutoff",
    },
  ];

  /* ── Attention footer tone ── */

  const footerTone: Tone =
    attentionItems.length === 0
      ? "emerald"
      : blockingItems.length > 0
        ? "amber"
        : "slate";

  return (
    <section className={cn("space-y-6", className)}>
      {/* ════════════════════ Hero card ════════════════════ */}
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border shadow-2xl",
          heroTheme.shell,
        )}
      >
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <CardContent className="relative p-6 md:p-7">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
            {/* Left column */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
                    heroTheme.badge,
                  )}
                >
                  {heroCopy.badge}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                  <span
                    className={cn("h-2 w-2 rounded-full", heroTheme.dot)}
                  />
                  Днес
                </span>
              </div>

              <div className="max-w-3xl">
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {heroCopy.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                  {heroCopy.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {signals.map((signal) => (
                  <SignalPill key={signal.label} {...signal} />
                ))}
              </div>
            </div>

            {/* Signal board */}
            <div
              className={cn(
                "rounded-2xl border p-5 backdrop-blur-sm",
                heroTheme.board,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                    Signal Board
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Една дъска. Четири сигнала. Нула скролване.
                  </p>
                </div>
                {powerRecorded ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-200" />
                ) : blockingItems.length > 0 ? (
                  <ShieldAlert className="h-6 w-6 text-amber-200" />
                ) : (
                  <Zap className="h-6 w-6 text-sky-200" />
                )}
              </div>

              <div className="mt-8 flex items-end gap-3">
                <span className="text-6xl font-extrabold tracking-tight">
                  {greenSignals}
                </span>
                <div className="pb-2">
                  <p className="text-sm font-medium text-white/75">
                    зелени сигнала
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    от 4 ключови модула
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {signals.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          signal.tone === "emerald"
                            ? "bg-emerald-300"
                            : signal.tone === "amber"
                              ? "bg-amber-200"
                              : signal.tone === "red"
                                ? "bg-red-300"
                                : "bg-white/50",
                        )}
                      />
                      <span className="text-sm font-medium text-white/90">
                        {signal.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {signal.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════ Module cards grid ════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {moduleCards.map((card, index) => (
          <ModuleCard key={card.key} card={card} index={index} />
        ))}
      </div>

      {/* ════════════════════ Attention footer ════════════════════ */}
      <Card
        className={cn(
          "rounded-2xl border",
          toneStyles[footerTone].card,
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                {attentionItems.length === 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      "h-6 w-6",
                      blockingItems.length > 0
                        ? "text-amber-600"
                        : "text-slate-700",
                    )}
                  />
                )}
                <h3
                  className={cn(
                    "text-base font-semibold",
                    toneText[footerTone],
                  )}
                >
                  Следващ фокус
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {attentionItems.length === 0
                  ? "Днешният контрол изглежда завършен. Няма отворени точки за внимание."
                  : blockingItems.length > 0
                    ? "Покажи това на мениджъра и той веднага ще разбере кои дневни проверки още липсват."
                    : "Основните проверки са наред. Остава единствено финалното изключване на тока."}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-black/5">
              <Clock className="h-4 w-4" />
              {powerRecorded
                ? `Shutoff в ${shutoffTimeLabel}`
                : "Shutoff очаква потвърждение"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attentionItems.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-4 text-sm font-medium text-emerald-700">
                Всички ключови сигнали за днес са отчетени.
              </div>
            ) : (
              attentionItems.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/80 bg-white/75 px-4 py-4 text-sm font-medium text-slate-800 ring-1 ring-black/5"
                >
                  {item}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
