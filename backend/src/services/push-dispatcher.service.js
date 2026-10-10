import {
  claimDuePushDeliveries,
  enqueueDuePushDeliveries,
  findPushDeliveryContext,
  requeueExpiredPushDeliveries,
  removePushSubscription,
  updatePushDelivery
} from '../models/push-delivery.model.js';
import { sendWebPushNotification } from './web-push.service.js';

const MAX_ATTEMPTS = 5;
const CATCH_UP_MS = 24 * 60 * 60 * 1000;

export const notificationSchedule = reminder => new Date(
  new Date(reminder.reminder_date).getTime()
  - (reminder.notification_offset_minutes || 0) * 60_000
);

const describeOffset = minutes => {
  if (minutes === 0) return 'a la hora programada';
  const units = [
    { size: 10080, one: 'semana', many: 'semanas' },
    { size: 1440, one: 'día', many: 'días' },
    { size: 60, one: 'hora', many: 'horas' },
    { size: 1, one: 'minuto', many: 'minutos' }
  ];
  const unit = units.find(candidate => minutes % candidate.size === 0);
  const amount = minutes / unit.size;
  return `${amount} ${amount === 1 ? unit.one : unit.many} antes`;
};

const retryDelay = attempts => Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000;

export const notificationPayload = reminder => ({
  title: 'YourAssistant',
  body: `Tienes un recordatorio ${describeOffset(reminder.notification_offset_minutes || 0)}.`,
  icon: '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
  tag: `reminder-${reminder.id}-${new Date(reminder.reminder_date).getTime()}`,
    data: {
      url: `/?section=tasks&at=${encodeURIComponent(reminder.reminder_date)}&reminderId=${encodeURIComponent(reminder.id)}`
    }
});

const rescheduleOrCancelJob = async (repository, client, job, reminder, now) => {
  const deliveryAt = notificationSchedule(reminder);
  const tooLate = now.getTime() - deliveryAt.getTime() > CATCH_UP_MS;
  await repository.updatePushDelivery(client, job.id, {
    notification_offset_minutes: reminder.notification_offset_minutes || 0,
    delivery_at: deliveryAt.toISOString(),
    next_attempt_at: deliveryAt > now ? deliveryAt.toISOString() : now.toISOString(),
    status: tooLate ? 'cancelled' : 'pending',
    lease_until: null,
    last_error: null
  });
  return tooLate ? 'cancelled' : 'rescheduled';
};

export const runPushDispatchCycle = async (
  client,
  now = new Date(),
  repository = {
    requeueExpiredPushDeliveries,
    enqueueDuePushDeliveries,
    claimDuePushDeliveries,
    findPushDeliveryContext,
    updatePushDelivery,
    removePushSubscription
  },
  sendPush = sendWebPushNotification
) => {
  await repository.requeueExpiredPushDeliveries(client, now);
  await repository.enqueueDuePushDeliveries(client, now);
  const jobs = await repository.claimDuePushDeliveries(client, now);
  const summary = { claimed: jobs.length, sent: 0, retried: 0, cancelled: 0, removedSubscriptions: 0 };

  for (const job of jobs) {
    try {
      const { reminder, subscription } = await repository.findPushDeliveryContext(client, job);
      if (!reminder || !subscription || reminder.status !== 'pending'
        || new Date(reminder.reminder_date).getTime() !== new Date(job.reminder_date).getTime()) {
        await repository.updatePushDelivery(client, job.id, { status: 'cancelled', lease_until: null });
        summary.cancelled += 1;
        continue;
      }

      const scheduledAt = notificationSchedule(reminder);
      const offset = reminder.notification_offset_minutes || 0;
      if (offset !== job.notification_offset_minutes
        || scheduledAt.getTime() !== new Date(job.delivery_at).getTime()) {
        if (await rescheduleOrCancelJob(repository, client, job, reminder, now) === 'cancelled') {
          summary.cancelled += 1;
        }
        continue;
      }

      if (now.getTime() - scheduledAt.getTime() > CATCH_UP_MS) {
        await repository.updatePushDelivery(client, job.id, { status: 'cancelled', lease_until: null });
        summary.cancelled += 1;
        continue;
      }

      await sendPush({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expiration_time
          ? new Date(subscription.expiration_time).getTime()
          : null,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      }, notificationPayload(reminder));

      await repository.updatePushDelivery(client, job.id, {
        status: 'sent',
        sent_at: now.toISOString(),
        lease_until: null,
        last_error: null
      });
      summary.sent += 1;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        try {
          await repository.removePushSubscription(client, job.subscription_id);
          summary.removedSubscriptions += 1;
        } catch (removeError) {
          console.error('No se pudo eliminar una suscripción push vencida:', removeError);
        }
        continue;
      }

      const shouldRetry = job.attempt_count < MAX_ATTEMPTS;
      try {
        await repository.updatePushDelivery(client, job.id, {
          status: shouldRetry ? 'retry' : 'failed',
          next_attempt_at: new Date(now.getTime() + retryDelay(job.attempt_count)).toISOString(),
          lease_until: null,
          last_error: String(error.message || 'Error al enviar push').slice(0, 500)
        });
        if (shouldRetry) summary.retried += 1;
      } catch (updateError) {
        console.error('No se pudo actualizar el estado de una entrega push:', updateError);
      }
      console.error('Error al enviar notificación push:', error.message || error);
    }
  }

  return summary;
};

export const buildReminderPushPayload = notificationPayload;
