// Small timezone helpers built on Intl, so "today" means Denise's today, not the server's (UTC on Vercel).

const DAY = 86_400_000;

function parts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// Milliseconds the zone is ahead of UTC at a given instant (negative for the Americas).
function offset(date: Date, tz: string) {
  const p = parts(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The UTC instant of a wall-clock time in a zone (handles DST by re-checking the offset).
export function zonedTime(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offset(new Date(guess), tz);
  t = guess - offset(new Date(t), tz);
  return new Date(t);
}

export function startOfDay(date: Date, tz: string): Date {
  const p = parts(date, tz);
  return zonedTime(p.y, p.m, p.d, 0, 0, tz);
}

export function endOfDay(date: Date, tz: string): Date {
  const p = parts(new Date(startOfDay(date, tz).getTime() + 36 * 3_600_000), tz);
  return new Date(zonedTime(p.y, p.m, p.d, 0, 0, tz).getTime() - 1);
}

// Calendar days between two instants in the zone (yesterday = 1, even if only 2 hours ago).
export function calendarDaysBetween(from: Date, to: Date, tz: string): number {
  const a = parts(from, tz);
  const b = parts(to, tz);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY);
}

// Whole 24h periods elapsed — used for "No reply in N days".
export function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / DAY);
}

export function timeAgo(date: Date, now: Date, tz: string): string {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const days = calendarDaysBetween(date, now, tz);
  if (days === 0) return `${Math.floor(mins / 60)}h ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// "today", "tomorrow", "yesterday", "2 days ago", "Thu, Oct 9"
export function relativeDay(date: Date, now: Date, tz: string): string {
  const days = calendarDaysBetween(now, date, tz);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  return formatDate(date, tz);
}

export function formatDate(date: Date, tz: string): string {
  return date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date, tz: string): string {
  return date.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hourIn(date: Date, tz: string): number {
  return parts(date, tz).h;
}

// "2026-10-06" in the zone, for <input type="date">.
export function toDateInput(date: Date | null, tz: string): string {
  if (!date) return "";
  const p = parts(date, tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

// "2026-10-06" -> that day at the given hour in the zone.
export function fromDateInput(value: string, tz: string, hour = 9): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return zonedTime(+m[1], +m[2], +m[3], hour, 0, tz);
}

// Tomorrow at 9:00 in the zone.
export function tomorrowMorning(now: Date, tz: string): Date {
  const p = parts(new Date(startOfDay(now, tz).getTime() + 36 * 3_600_000), tz);
  return zonedTime(p.y, p.m, p.d, 9, 0, tz);
}

// Monday 00:00 of the week containing `date`, in the zone.
export function startOfWeek(date: Date, tz: string): Date {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  const back = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day);
  return startOfDay(new Date(startOfDay(date, tz).getTime() - back * DAY + 12 * 3_600_000), tz);
}

export function startOfMonth(date: Date, tz: string): Date {
  const p = parts(date, tz);
  return zonedTime(p.y, p.m, 1, 0, 0, tz);
}
