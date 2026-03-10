/**
 * Returns the current date as an ISO string (YYYY-MM-DD) in the given timezone.
 * Defaults to "Europe/Sofia" (UTC+2/UTC+3).
 *
 * Using `sv-SE` locale with `dateStyle: "short"` gives YYYY-MM-DD format directly
 * without any further slicing.
 */
export function getLocalISODate(timezone: string = "Europe/Sofia"): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    dateStyle: "short",
  }).format(new Date());
}

/**
 * Formats a date string or Date for display in Bulgarian locale.
 */
export function formatLocalDate(value: string | Date, timezone: string = "Europe/Sofia"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
