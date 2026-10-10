export const monthRange = date => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { from: start.toISOString(), to: end.toISOString() };
};

export const calendarDays = date => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const total = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: total }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day < 1 || day > daysInMonth
      ? null
      : new Date(date.getFullYear(), date.getMonth(), day);
  });
};

export const sameDay = (left, right) => Boolean(left && right)
  && left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

export const dateKey = date => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

export const formatMonth = date => new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric'
}).format(date);

export const formatLongDate = date => new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
}).format(date);

export const formatReminderTime = value => new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value));
