import { Check, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatReminderTime } from '../utils/dates.js';
import {
  describeOffset,
  getOffsetParts,
  OFFSET_PRESETS,
  OFFSET_UNITS,
  toOffsetMinutes
} from '../utils/notification-offset.js';

const filters = [
  ['pending', 'Pendientes'],
  ['completed', 'Hechas'],
  ['cancelled', 'Canceladas'],
  ['all', 'Todas']
];

const statusNames = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

const statusActions = {
  pending: [
    { status: 'completed', label: 'Marcar completada', Icon: Check },
    { status: 'cancelled', label: 'Cancelar tarea', Icon: X }
  ],
  completed: [{ status: 'pending', label: 'Reabrir tarea', Icon: RotateCcw }],
  cancelled: [{ status: 'pending', label: 'Reactivar tarea', Icon: RotateCcw }]
};

const notificationIsInPast = (reminderDate, offsetMinutes) => (
  new Date(reminderDate).getTime() - offsetMinutes * 60_000 < Date.now()
);

export const ReminderPanel = ({
  reminders = [],
  loading,
  error,
  busyId,
  busyOffsetId,
  highlightedReminderId,
  onStatusChange,
  onOffsetChange,
  onRetry
}) => {
  const [filter, setFilter] = useState('pending');
  const [customReminderId, setCustomReminderId] = useState(null);
  const [customAmount, setCustomAmount] = useState('1');
  const [customUnit, setCustomUnit] = useState('hours');
  const visibleReminders = useMemo(() => reminders
    .filter(reminder => filter === 'all' || reminder.status === filter)
    .toSorted((left, right) => new Date(left.reminder_date) - new Date(right.reminder_date)), [reminders, filter]);

  useEffect(() => {
    if (!highlightedReminderId || loading) return;
    document.getElementById(`reminder-${highlightedReminderId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedReminderId, loading, reminders, filter]);

  return (
    <section className="reminder-panel px-6 py-7" aria-labelledby="tasks-title">
      <div className="mb-6 flex items-end justify-between gap-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Tu agenda</p>
          <h2 id="tasks-title" className="font-display text-2xl">Recordatorios</h2>
        </div>
        <span className="text-sm tabular-nums text-ink-faint">{visibleReminders.length}</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-3 gap-y-2 border-b border-rule pb-3" role="group" aria-label="Filtrar recordatorios">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`filter-tab ${filter === value ? 'filter-tab-active' : ''}`}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >{label}</button>
        ))}
      </div>

      {loading ? <div className="py-10 text-sm text-ink-muted" role="status">Cargando agenda…</div> : null}
      {error ? (
        <div className="border-l-2 border-rust py-2 pl-3 text-sm text-danger" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 underline underline-offset-4" onClick={onRetry}>Reintentar</button>
        </div>
      ) : null}
      {!loading && !error && visibleReminders.length === 0 ? (
        <div className="border-t border-rule py-7">
          <p className="font-display text-lg">Nada por aquí.</p>
          <p className="mt-1 text-sm text-ink-muted">Puedes pedirle al asistente que anote algo.</p>
        </div>
      ) : null}

      <ul className="divide-y divide-rule">
        {visibleReminders.map(reminder => (
          <li
            id={`reminder-${reminder.id}`}
            key={reminder.id}
            className={`reminder-row py-4 ${highlightedReminderId === reminder.id ? 'reminder-row-highlighted' : ''}`}
          >
            <div className="flex items-start gap-3">
              <span className={`status-mark status-mark-${reminder.status}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm font-semibold ${reminder.status === 'completed' ? 'line-through text-ink-faint' : ''}`}>
                  {reminder.title}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {new Date(reminder.reminder_date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}{formatReminderTime(reminder.reminder_date)}
                </p>
                {reminder.description ? <p className="mt-2 text-xs leading-relaxed text-ink-muted">{reminder.description}</p> : null}
                <div className="reminder-offset">
                  <label htmlFor={`offset-${reminder.id}`}>Avisarme</label>
                  <select
                    id={`offset-${reminder.id}`}
                    aria-label={`Aviso para ${reminder.title}`}
                    value={OFFSET_PRESETS.some(option => option.value === (reminder.notification_offset_minutes || 0))
                      ? String(reminder.notification_offset_minutes || 0)
                      : 'custom'}
                    disabled={busyOffsetId === reminder.id}
                    onChange={event => {
                      if (event.target.value === 'custom') {
                        const parts = getOffsetParts(reminder.notification_offset_minutes || 60);
                        setCustomAmount(parts.amount);
                        setCustomUnit(parts.unit);
                        setCustomReminderId(reminder.id);
                      } else {
                        setCustomReminderId(null);
                        onOffsetChange(reminder.id, Number(event.target.value));
                      }
                    }}
                  >
                    {OFFSET_PRESETS.map(option => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.value !== (reminder.notification_offset_minutes || 0)
                          && notificationIsInPast(reminder.reminder_date, option.value)}
                      >{option.label}</option>
                    ))}
                    <option value="custom">Personalizado</option>
                  </select>
                  {!OFFSET_PRESETS.some(option => option.value === (reminder.notification_offset_minutes || 0))
                    ? <span className="reminder-offset-current">{describeOffset(reminder.notification_offset_minutes)}</span>
                    : null}
                  {customReminderId === reminder.id ? (
                    <form
                      className="reminder-offset-custom"
                      onSubmit={event => {
                        event.preventDefault();
                        const minutes = toOffsetMinutes(customAmount, customUnit);
                        if (minutes !== null) {
                          onOffsetChange(reminder.id, minutes);
                          setCustomReminderId(null);
                        }
                      }}
                    >
                      <label className="sr-only" htmlFor={`offset-amount-${reminder.id}`}>Cantidad de adelanto</label>
                      <input
                        id={`offset-amount-${reminder.id}`}
                        type="number"
                        min="1"
                        max="525600"
                        value={customAmount}
                        onChange={event => setCustomAmount(event.target.value)}
                      />
                      <label className="sr-only" htmlFor={`offset-unit-${reminder.id}`}>Unidad de adelanto</label>
                      <select id={`offset-unit-${reminder.id}`} value={customUnit} onChange={event => setCustomUnit(event.target.value)}>
                        {OFFSET_UNITS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                      </select>
                      <button
                        type="submit"
                        className="task-action"
                        disabled={busyOffsetId === reminder.id
                          || toOffsetMinutes(customAmount, customUnit) === null
                          || notificationIsInPast(reminder.reminder_date, toOffsetMinutes(customAmount, customUnit) || 0)}
                        aria-busy={busyOffsetId === reminder.id}
                      >{busyOffsetId === reminder.id ? 'Guardando…' : 'Aplicar'}</button>
                    </form>
                  ) : null}
                  {customReminderId === reminder.id
                    && notificationIsInPast(reminder.reminder_date, toOffsetMinutes(customAmount, customUnit) || 0)
                    ? <span className="field-hint reminder-offset-hint">Ese aviso ya habría ocurrido. Elige un adelanto menor.</span>
                    : null}
                </div>
                <p className="sr-only">Estado: {statusNames[reminder.status] || reminder.status}</p>
                <div className="mt-3 flex gap-2">
                  {(statusActions[reminder.status] || []).map(({ status, label, Icon }) => (
                    <button
                      key={status}
                      type="button"
                      className="task-action"
                      disabled={busyId === reminder.id}
                      aria-label={label + ': ' + reminder.title}
                      aria-busy={busyId === reminder.id}
                      onClick={() => onStatusChange(reminder.id, status)}
                    ><Icon size={14} aria-hidden="true" /><span>{busyId === reminder.id ? 'Guardando…' : label}</span></button>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
