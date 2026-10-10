import { ChevronLeft, ChevronRight } from 'lucide-react';
import { calendarDays, dateKey, formatMonth, sameDay } from '../utils/dates.js';

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const CalendarPanel = ({ date, selectedDate, reminders = [], onSelectDate, onChangeMonth }) => {
  const days = calendarDays(date);
  const reminderDays = new Set(reminders.map(reminder => dateKey(new Date(reminder.reminder_date))));

  return (
    <section className="calendar-panel px-6 py-7" aria-labelledby="calendar-title">
      <div className="mb-7 flex items-center justify-between gap-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Planifica</p>
          <h2 id="calendar-title" className="font-display text-2xl">{formatMonth(date)}</h2>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="icon-button"
            aria-label="Mes anterior"
            onClick={() => onChangeMonth(-1)}
          ><ChevronLeft size={18} /></button>
          <button
            type="button"
            className="icon-button"
            aria-label="Mes siguiente"
            onClick={() => onChangeMonth(1)}
          ><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="calendar-grid mb-2" aria-hidden="true">
        {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="calendar-grid" role="group" aria-label={`Días de ${formatMonth(date)}`}>
        {days.map((day, index) => day ? (
          <button
            key={dateKey(day)}
            type="button"
            className={`calendar-day ${reminderDays.has(dateKey(day)) ? 'has-reminders' : ''}`}
            aria-label={`${day.getDate()}${reminderDays.has(dateKey(day)) ? ', tiene tareas' : ''}`}
            aria-pressed={sameDay(day, selectedDate)}
            onClick={() => onSelectDate(day)}
          >{day.getDate()}</button>
        ) : <span key={`empty-${index}`} aria-hidden="true" />)}
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Día elegido</p>
        <p className="font-display text-xl">{selectedDate.toLocaleDateString('es-CL', { weekday: 'long' })}</p>
        <p className="mt-1 text-sm text-ink-muted">{selectedDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</p>
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">Los puntos óxido señalan días con tareas programadas.</p>
      </div>
    </section>
  );
};
