import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "slate" | "emerald" | "amber" | "red";

type DailyControlMetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  details?: string[];
};

const toneStyles: Record<Tone, string> = {
  slate: "border-slate-200 bg-white",
  emerald: "border-emerald-200 bg-emerald-50/80",
  amber: "border-amber-200 bg-amber-50/80",
  red: "border-red-200 bg-red-50/80",
};

const iconToneStyles: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const textToneStyles: Record<Tone, string> = {
  slate: "text-slate-900",
  emerald: "text-emerald-900",
  amber: "text-amber-900",
  red: "text-red-900",
};

export function DailyControlMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "slate",
  href,
  details = [],
}: DailyControlMetricCardProps) {
  const card = (
    <Card
      className={cn(
        "h-full rounded-2xl border transition-all duration-300",
        href && "hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]",
        toneStyles[tone],
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <div className={cn("shrink-0 rounded-2xl p-3", iconToneStyles[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {/* Metric */}
        <p
          className={cn(
            "mt-5 text-4xl font-extrabold tracking-tight",
            textToneStyles[tone],
          )}
        >
          {value}
        </p>

        {/* Detail lines */}
        {details.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {details.slice(0, 3).map((item) => (
              <li
                key={item}
                className="line-clamp-1 text-sm text-slate-600"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  );
}
