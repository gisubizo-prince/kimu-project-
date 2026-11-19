export const CAT_TIME_ZONE = 'Africa/Kigali';

function parseDate(value) {
  if (value === null || value === undefined || value === '') return new Date(Number.NaN);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return value instanceof Date ? value : new Date(value);
}

export function catDateKey(value = new Date()) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatCatDate(value, locale = 'en-GB', options = {}) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    timeZone: CAT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatCatTime(value, locale = 'en-GB') {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: CAT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return formatted;
}

export function formatCatDateTime(value, locale = 'en-GB') {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: CAT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${formatted} CAT`;
}

export function formatCatWeekday(value, locale = 'en') {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: CAT_TIME_ZONE,
    weekday: 'short',
  }).format(date);
}

export function catHour(value = new Date()) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return 0;
  const hour = new Intl.DateTimeFormat('en', {
    timeZone: CAT_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}
