import {
  ReminderRangeSchema,
  ReminderIdSchema,
  UpdateReminderNotificationSchema,
  UpdateReminderStatusSchema
} from '../models/schemas.js';
import {
  findReminderSchedule,
  findRemindersInRange,
  updateReminderNotificationOffset,
  updateReminderStatus
} from '../models/reminder.model.js';

export const listReminders = async (req, res) => {
  const range = ReminderRangeSchema.safeParse(req.query);
  if (!range.success) {
    return res.status(400).json({ error: range.error.issues[0].message });
  }

  try {
    const reminders = await findRemindersInRange(
      req.supabase,
      req.user.id,
      range.data.from,
      range.data.to
    );
    return res.json({ reminders });
  } catch (err) {
    console.error('Error al consultar recordatorios:', err);
    return res.status(500).json({ error: 'No se pudieron cargar los recordatorios' });
  }
};

export const changeReminderStatus = async (req, res) => {
  const id = ReminderIdSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'ID de recordatorio inválido' });
  }

  const update = UpdateReminderStatusSchema.safeParse(req.body);
  if (!update.success) {
    return res.status(400).json({ error: update.error.issues[0].message });
  }

  try {
    const reminder = await updateReminderStatus(
      req.supabase,
      req.user.id,
      id.data,
      update.data.status
    );
    if (!reminder) return res.status(404).json({ error: 'Recordatorio no encontrado' });
    return res.json({ reminder });
  } catch (err) {
    console.error('Error al actualizar recordatorio:', err);
    return res.status(500).json({ error: 'No se pudo actualizar el recordatorio' });
  }
};

export const changeReminderNotificationOffset = async (req, res) => {
  const id = ReminderIdSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'ID de recordatorio inválido' });
  }

  const update = UpdateReminderNotificationSchema.safeParse(req.body);
  if (!update.success) {
    return res.status(400).json({ error: update.error.issues[0].message });
  }

  try {
    const current = await findReminderSchedule(req.supabase, req.user.id, id.data);
    if (!current) return res.status(404).json({ error: 'Recordatorio no encontrado' });

    const notificationAt = new Date(current.reminder_date).getTime()
      - update.data.notificationOffsetMinutes * 60_000;
    if (notificationAt < Date.now()) {
      return res.status(400).json({ error: 'Ese adelanto ya habría ocurrido; elige un plazo menor o cambia la fecha del recordatorio' });
    }

    const reminder = await updateReminderNotificationOffset(
      req.supabase,
      req.user.id,
      id.data,
      update.data.notificationOffsetMinutes
    );
    if (!reminder) return res.status(404).json({ error: 'Recordatorio no encontrado' });
    return res.json({ reminder });
  } catch (err) {
    console.error('Error al actualizar el adelanto de notificación:', err);
    return res.status(500).json({ error: 'No se pudo actualizar el aviso del recordatorio' });
  }
};
