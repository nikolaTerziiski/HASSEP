import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  emerald: "border-emerald-200 bg-emerald-50/60",
  amber: "border-amber-200 bg-amber-50/70",
  red: "border-red-200 bg-red-50/70",
};

const iconToneStyles: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
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
  const content = (
    <Card className={cn("h-full transition", href ? "hover:border-slate-300" : "", toneStyles[tone])}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{title}</span>
          <span className={cn("rounded-xl p-2", iconToneStyles[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {details.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-600">
            {details.slice(0, 3).map((item) => (
              <li key={item} className="line-clamp-1">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
