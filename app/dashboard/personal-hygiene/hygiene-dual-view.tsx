"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import { MyHygieneForm } from "./my-hygiene-form";
import { TeamHygieneOverview } from "./team-hygiene-overview";

type TeamMember = {
  id: string;
  username: string;
  role: "manager" | "staff";
  status: "completed" | "notes" | "missing";
  notes: string | null;
  submittedAt: string | null;
};

type HygieneDualViewProps = {
  todayDate: string;
  hasLogToday: boolean;
  members: TeamMember[];
};

export function HygieneDualView({ todayDate, hasLogToday, members }: HygieneDualViewProps) {
  const [activeTab, setActiveTab] = useState<"mine" | "team">("mine");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition ${
            activeTab === "mine"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <User className="h-4 w-4" />
          Моята проверка
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition ${
            activeTab === "team"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="h-4 w-4" />
          Екип днес
          {members.filter((m) => m.status === "missing").length > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {members.filter((m) => m.status === "missing").length}
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === "mine" ? (
        <MyHygieneForm todayDate={todayDate} hasLogToday={hasLogToday} />
      ) : (
        <TeamHygieneOverview todayDate={todayDate} members={members} />
      )}
    </div>
  );
}
