const DEFAULT_TIMEZONE = 'Africa/Kigali';

function getLocalParts(value = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return parts.reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
}

function getLocalDateKey(value = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = getLocalParts(value, timeZone);
  if (!parts) return null;
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function dateKeyAsUtcDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function previousDateKey(dateKey) {
  const date = dateKeyAsUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

module.exports = { getLocalDateKey, dateKeyAsUtcDate, previousDateKey };