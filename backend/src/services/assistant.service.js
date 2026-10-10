import {
  createReminder,
  deleteReminder,
  findPendingReminders,
  updateReminder
} from '../models/reminder.model.js';
import { findAssistantSettings } from '../models/assistant-settings.model.js';
import { processAssistantPrompt } from './ollama.service.js';

export class ReminderNotFoundError extends Error {}
export class AssistantSettingsNotFoundError extends Error {}

export const handleAssistantMessage = async (client, userId, message) => {
  const [settings, existingReminders] = await Promise.all([
    findAssistantSettings(client),
    findPendingReminders(client, userId)
  ]);
  if (!settings) throw new AssistantSettingsNotFoundError();

  const result = await processAssistantPrompt(message, existingReminders, settings.active_model);
  let reminder = null;
  let updatedReminders = existingReminders;

  if (result.action === 'CREATE') {
    reminder = await createReminder(client, userId, result.data);
    updatedReminders = [...existingReminders, reminder];
  } else if (result.action === 'UPDATE') {
    reminder = await updateReminder(client, userId, result.data);
    if (!reminder) throw new ReminderNotFoundError();
    updatedReminders = existingReminders.map(existing =>
      existing.id === reminder.id ? reminder : existing
    );
  } else if (result.action === 'DELETE') {
    const deletedReminder = await deleteReminder(client, userId, result.data.reminder_id);
    if (!deletedReminder) throw new ReminderNotFoundError();
    updatedReminders = existingReminders.filter(
      existing => existing.id !== deletedReminder.id
    );
  }

  return {
    action: result.action,
    reply: result.reply,
    reminder,
    ...(result.action === 'UNKNOWN' ? {} : { updatedReminders })
  };
};
