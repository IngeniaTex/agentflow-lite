import {
  addDays,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from "date-fns";

const WEEKDAY_RESOLVERS: Record<string, (from: Date) => Date> = {
  lunes: nextMonday,
  martes: nextTuesday,
  miercoles: nextWednesday,
  miércoles: nextWednesday,
  jueves: nextThursday,
  viernes: nextFriday,
  sabado: nextSaturday,
  sábado: nextSaturday,
};

function atHour(date: Date, hour: number) {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hour), 0), 0), 0);
}

/** Extrae una hora del texto ("a las 5", "17:00", "5 pm"). Default: 10:00. */
function extractHour(text: string): number {
  const explicit = text.match(/\b(\d{1,2})\s*[:.]\s*(\d{2})\b/);
  if (explicit) {
    const hour = Number(explicit[1]);
    if (hour >= 0 && hour <= 23) return hour;
  }

  const meridiem = text.match(/\b(\d{1,2})\s*(am|a\.m\.|pm|p\.m\.)/i);
  if (meridiem) {
    let hour = Number(meridiem[1]);
    const isPm = /p/i.test(meridiem[2]);
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return hour;
  }

  const spoken = text.match(/a\s+las?\s+(\d{1,2})/i);
  if (spoken) {
    const hour = Number(spoken[1]);
    if (hour >= 1 && hour <= 7) return hour + 12; // "a las 5" => 17:00
    if (hour >= 0 && hour <= 23) return hour;
  }

  return 10;
}

/**
 * Interpreta fechas en lenguaje natural en español.
 * Cubre los casos del MVP: hoy, mañana, pasado mañana, días de la semana,
 * "próxima semana" y "en N días". Si no reconoce nada, propone en 2 días.
 */
export function parseSpanishDate(text: string, from = new Date()): Date {
  const normalized = text.toLowerCase();
  const hour = extractHour(normalized);
  const base = startOfDay(from);

  if (/\bhoy\b/.test(normalized)) return atHour(base, hour);
  if (/\bpasado\s+ma(ñ|n)ana\b/.test(normalized)) return atHour(addDays(base, 2), hour);
  if (/\bma(ñ|n)ana\b/.test(normalized)) return atHour(addDays(base, 1), hour);
  if (/pr(ó|o)xima\s+semana|siguiente\s+semana/.test(normalized)) {
    return atHour(nextMonday(base), hour);
  }

  const inDays = normalized.match(/\ben\s+(\d{1,2})\s+d(í|i)as?\b/);
  if (inDays) return atHour(addDays(base, Number(inDays[1])), hour);

  for (const [weekday, resolver] of Object.entries(WEEKDAY_RESOLVERS)) {
    if (normalized.includes(weekday)) return atHour(resolver(base), hour);
  }

  return atHour(addDays(base, 2), hour);
}

/** Convierte una fecha ISO devuelta por el modelo en Date válida. */
export function safeParseISO(value: string | undefined | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
