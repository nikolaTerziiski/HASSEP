import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AttentionListCardProps = {
  title: string;
  description: string;
  items: string[];
  emptyMessage: string;
  icon?: LucideIcon;
};

export function AttentionListCard({
  title,
  description,
  items,
  emptyMessage,
  icon: Icon = AlertCircle,
}: AttentionListCardProps) {
  const hasItems = items.length > 0;

  return (
    <Card className={hasItems ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={hasItems ? "h-5 w-5 text-red-600" : "h-5 w-5 text-emerald-600"} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasItems ? (
          <ul className="space-y-2 text-sm text-red-700">
            {items.map((item) => (
              <li key={item} className="rounded-md border border-red-200 bg-white/70 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-medium text-emerald-700">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
