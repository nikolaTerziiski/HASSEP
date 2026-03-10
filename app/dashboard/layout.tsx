import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart2,
  ClipboardCheck,
  FireExtinguisher,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldUser,
  Thermometer,
  User,
  type LucideIcon,
} from "lucide-react";
import { type AppRole, requireProfileForPage } from "@/utils/auth/tenant";

type DashboardLayoutProps = {
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  primary?: boolean;
};

function getNavigationItems(role: AppRole): NavigationItem[] {
  if (role === "owner") {
    return [
      {
        href: "/dashboard/daily-control",
        label: "Дневен контрол",
        shortLabel: "Контрол",
        icon: LayoutDashboard,
        primary: true,
      },
      {
        href: "/dashboard/temperature",
        label: "Температурен дневник",
        shortLabel: "Темп.",
        icon: Thermometer,
        primary: true,
      },
      {
        href: "/dashboard/incoming",
        label: "Входящ контрол",
        shortLabel: "Входящ",
        icon: FileText,
        primary: true,
      },
      {
        href: "/dashboard/fire-extinguishers",
        label: "Пожарогасители",
        shortLabel: "Пожар",
        icon: FireExtinguisher,
        primary: true,
      },
      {
        href: "/dashboard/personal-hygiene",
        label: "Екипна хигиена",
        shortLabel: "Хигиена",
        icon: User,
        primary: true,
      },
      {
        href: "/dashboard/facility-hygiene",
        label: "Хигиенно състояние",
        shortLabel: "Обект",
        icon: ClipboardCheck,
      },
      {
        href: "/dashboard/reports/daily",
        label: "Дневен доклад",
        shortLabel: "Доклад",
        icon: BarChart2,
      },
      {
        href: "/dashboard/settings/team",
        label: "Екип",
        shortLabel: "Екип",
        icon: ShieldUser,
      },
      {
        href: "/dashboard/settings/equipment",
        label: "Настройки",
        shortLabel: "Настр.",
        icon: Settings,
      },
    ];
  }

  if (role === "manager") {
    return [
      {
        href: "/dashboard/daily-control",
        label: "Дневен контрол",
        shortLabel: "Контрол",
        icon: LayoutDashboard,
        primary: true,
      },
      {
        href: "/dashboard/temperature",
        label: "Температурен дневник",
        shortLabel: "Темп.",
        icon: Thermometer,
        primary: true,
      },
      {
        href: "/dashboard/incoming",
        label: "Входящ контрол",
        shortLabel: "Входящ",
        icon: FileText,
        primary: true,
      },
      {
        href: "/dashboard/fire-extinguishers",
        label: "Пожарогасители",
        shortLabel: "Пожар",
        icon: FireExtinguisher,
        primary: true,
      },
      {
        href: "/dashboard/personal-hygiene",
        label: "Екипна хигиена",
        shortLabel: "Хигиена",
        icon: User,
        primary: true,
      },
      {
        href: "/dashboard/facility-hygiene",
        label: "Хигиенно състояние",
        shortLabel: "Обект",
        icon: ClipboardCheck,
      },
      {
        href: "/dashboard/reports/daily",
        label: "Дневен доклад",
        shortLabel: "Доклад",
        icon: BarChart2,
      },
      {
        href: "/dashboard/settings/equipment",
        label: "Настройки",
        shortLabel: "Настр.",
        icon: Settings,
      },
    ];
  }

  return [
    {
      href: "/dashboard/temperature",
      label: "Температурен дневник",
      shortLabel: "Темп.",
      icon: Thermometer,
      primary: true,
    },
    {
      href: "/dashboard/incoming",
      label: "Входящ контрол",
      shortLabel: "Входящ",
      icon: FileText,
      primary: true,
    },
    {
      href: "/dashboard/fire-extinguishers",
      label: "Пожарогасители",
      shortLabel: "Пожар",
      icon: FireExtinguisher,
      primary: true,
    },
    {
      href: "/dashboard/personal-hygiene",
      label: "Моята хигиена",
      shortLabel: "Моята",
      icon: User,
      primary: true,
    },
    {
      href: "/dashboard/facility-hygiene",
      label: "Хигиенно състояние",
      shortLabel: "Обект",
      icon: ClipboardCheck,
      primary: true,
    },
  ];
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const profile = await requireProfileForPage();
  const organizationName = profile.organizations?.name ?? "Моят ресторант";
  const navigationItems = getNavigationItems(profile.role);
  const primaryItems = navigationItems.filter((item) => item.primary);
  const secondaryItems = navigationItems.filter((item) => !item.primary);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto flex max-w-7xl flex-col md:min-h-screen md:flex-row print:max-w-none">
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white md:block print:hidden">
          <div className="sticky top-0 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-900 p-2 text-white">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold">ХАСЕП управление</h1>
                <p className="text-xs text-slate-500">{organizationName}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              <span className="font-medium">Роля:</span> {profile.role} |{" "}
              <span className="font-medium">Потребител:</span> {profile.username}
            </div>
            <nav className="mt-6 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Изход</span>
                </button>
              </form>
            </nav>
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-slate-900 p-1.5 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{organizationName}</p>
              <p className="text-[10px] text-slate-500">
                {profile.username} ({profile.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg p-2 text-slate-500 transition active:bg-slate-100"
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg p-2 text-red-500 transition active:bg-red-50"
                aria-label="Изход"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8 print:p-0 print:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white safe-bottom md:hidden print:hidden">
          <div className="mx-auto flex max-w-lg justify-around px-2 py-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-slate-600 transition active:bg-slate-100"
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate text-[10px] font-medium">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
