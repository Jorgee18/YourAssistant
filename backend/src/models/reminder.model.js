const unwrapResult = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const findPendingReminders = async (client, userId) => {
  const result = await client
    .from('reminders')
    .select('id, title, description, reminder_date, status, notification_offset_minutes')
    .eq('user_id', userId)
    .eq('status', 'pending');

  return unwrapResult(result);
};

export const findRemindersInRange = async (client, userId, from, to) => {
  const result = await client
    .from('reminders')
    .select('id, title, description, reminder_date, status, notification_offset_minutes')
    .eq('user_id', userId)
    .gte('reminder_date', from)
    .lt('reminder_date', to)
    .order('reminder_date', { ascending: true });

  return unwrapResult(result);
};

export const createReminder = async (client, userId, reminder) => {
  const result = await client
    .from('reminders')
    .insert({
      user_id: userId,
      title: reminder.title,
      description: reminder.description || '',
      reminder_date: reminder.reminder_date
    })
    .select()
    .single();

  return unwrapResult(result);
};

export const updateReminder = async (client, userId, reminder) => {
  const { reminder_id: reminderId, ...fields } = reminder;
  const updates = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
  const result = await client
    .from('reminders')
    .update(updates)
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return unwrapResult(result);
};

export const updateReminderStatus = async (client, userId, reminderId, status) => {
  const result = await client
    .from('reminders')
    .update({ status })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select('id, title, description, reminder_date, status, notification_offset_minutes')
    .maybeSingle();

  return unwrapResult(result);
};

export const findReminderSchedule = async (client, userId, reminderId) => {
  const result = await client
    .from('reminders')
    .select('id, reminder_date')
    .eq('id', reminderId)
    .eq('user_id', userId)
    .maybeSingle();

  return unwrapResult(result);
};

export const updateReminderNotificationOffset = async (client, userId, reminderId, offsetMinutes) => {
  const result = await client
    .from('reminders')
    .update({ notification_offset_minutes: offsetMinutes })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select('id, title, description, reminder_date, status, notification_offset_minutes')
    .maybeSingle();

  return unwrapResult(result);
};

export const deleteReminder = async (client, userId, reminderId) => {
  const result = await client
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  return unwrapResult(result);
};
