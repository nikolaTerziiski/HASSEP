import { PersonalHygieneForm } from "./personal-hygiene-form";

type MyHygieneFormProps = {
  todayDate: string;
  hasLogToday: boolean;
};

export function MyHygieneForm({ todayDate, hasLogToday }: MyHygieneFormProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Моята лична хигиена</h2>
        <p className="text-sm text-slate-600">
          Попълнете дневната си проверка преди започване на работа.
        </p>
      </div>

      <PersonalHygieneForm todayDate={todayDate} hasLogToday={hasLogToday} />
    </section>
  );
}
