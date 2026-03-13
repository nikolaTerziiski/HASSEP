"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ShiftRosterProfile = {
  id: string;
  username: string;
};

export type ShiftRosterLog = {
  user_id: string;
  is_healthy: boolean;
  notes: string | null;
};

type ShiftRosterClientProps = {
  profiles: ShiftRosterProfile[];
  todayLogs: ShiftRosterLog[];
};

export function ShiftRosterClient({
  profiles,
  todayLogs,
}: ShiftRosterClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Дневен състав</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>Активни профили за избор: {profiles.length}</p>
        <p>Записани здравни статуса за днес: {todayLogs.length}</p>
      </CardContent>
    </Card>
  );
}
