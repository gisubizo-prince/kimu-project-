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

export function formatCatDate(value) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year}`;
}

export function formatCatTime(value) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CAT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTimeValue(value) {
  if (typeof value !== 'string') return '-';
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return value || '-';
  const hour = Number(match[1]);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${match[2]} ${suffix}`;
}

export function formatTimeRange(value) {
  if (typeof value !== 'string') return '-';
  const match = value.trim().match(/^(.+?)\s*-\s*(.+)$/);
  if (!match) return formatTimeValue(value);
  return `${formatTimeValue(match[1])} - ${formatTimeValue(match[2])}`;
}

export function formatCatDateTime(value) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute} ${values.dayPeriod.toUpperCase()}`;
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
