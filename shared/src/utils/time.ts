/** Timezone-aware date helpers used by the daily planner and summaries. */

function safeTimeZone(timeZone?: string): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** Return YYYY-MM-DD for the given instant in the target time zone. */
export function dateInTimeZone(date: Date, timeZone?: string): string {
  const tz = safeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

/** Offset (ms) such that localTime = utcTime + offset for the given zone/instant. */
function timeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

/**
 * UTC start/end instants for a calendar day (YYYY-MM-DD) in a time zone.
 * DST-aware: the offset is recomputed at the resolved boundary.
 */
export function dayRangeUtc(dateStr: string, timeZone?: string): { start: Date; end: Date } {
  const tz = safeTimeZone(timeZone);
  const utcGuess = Date.parse(`${dateStr}T00:00:00Z`);
  const offset = timeZoneOffsetMs(tz, new Date(utcGuess));
  let startMs = utcGuess - offset;
  const offset2 = timeZoneOffsetMs(tz, new Date(startMs));
  startMs = utcGuess - offset2;
  const start = new Date(startMs);
  const end = new Date(startMs + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Format an instant as HH:MM in a time zone. */
export function timeLabelInTimeZone(date: Date, timeZone?: string): string {
  const tz = safeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** ISO week range (Monday..Sunday) containing the given instant. */
export function weekRangeUtc(date: Date, timeZone?: string): { start: Date; end: Date } {
  const todayStr = dateInTimeZone(date, timeZone);
  const { start: todayStart } = dayRangeUtc(todayStr, timeZone);
  const dow = new Date(`${todayStr}T00:00:00Z`).getUTCDay();
  const diffToMonday = (dow + 6) % 7;
  const start = new Date(todayStart.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

export function monthRangeUtc(date: Date, timeZone?: string): { start: Date; end: Date } {
  const todayStr = dateInTimeZone(date, timeZone);
  const [year, month] = todayStr.split("-").map(Number);
  const startStr = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const { start } = dayRangeUtc(startStr, timeZone);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endStr = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  const { start: end } = dayRangeUtc(endStr, timeZone);
  return { start, end };
}
