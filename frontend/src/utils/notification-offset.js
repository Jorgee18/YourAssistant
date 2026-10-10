export const OFFSET_UNITS = [
  { value: 'minutes', label: 'minutos', singular: 'minuto', minutes: 1 },
  { value: 'hours', label: 'horas', singular: 'hora', minutes: 60 },
  { value: 'days', label: 'días', singular: 'día', minutes: 1440 },
  { value: 'weeks', label: 'semanas', singular: 'semana', minutes: 10080 }
];

export const OFFSET_PRESETS = [
  { value: 0, label: 'A la hora' },
  { value: 10, label: '10 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
  { value: 10080, label: '1 semana antes' }
];

export const getOffsetParts = offsetMinutes => {
  if (offsetMinutes === 0) return { amount: '0', unit: 'minutes' };
  const unit = [...OFFSET_UNITS].reverse().find(option => offsetMinutes % option.minutes === 0);
  return unit
    ? { amount: String(offsetMinutes / unit.minutes), unit: unit.value }
    : { amount: String(offsetMinutes), unit: 'minutes' };
};

export const toOffsetMinutes = (amount, unit) => {
  const numericAmount = Number(amount);
  const unitMinutes = OFFSET_UNITS.find(option => option.value === unit)?.minutes;
  if (!Number.isSafeInteger(numericAmount) || numericAmount < 1 || !unitMinutes) return null;
  const minutes = numericAmount * unitMinutes;
  return Number.isSafeInteger(minutes) && minutes <= 525600 ? minutes : null;
};

export const describeOffset = offsetMinutes => {
  if (offsetMinutes === 0) return 'A la hora';
  const { amount, unit } = getOffsetParts(offsetMinutes);
  const unitDefinition = OFFSET_UNITS.find(option => option.value === unit);
  const label = amount === '1' ? unitDefinition.singular : unitDefinition.label;
  return `${amount} ${label} antes`;
};
