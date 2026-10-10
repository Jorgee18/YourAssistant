const unwrapResult = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const enqueueDuePushDeliveries = async (client, now) => {
  const { data, error } = await client.rpc('enqueue_due_push_deliveries', {
    p_now: now.toISOString(),
    p_grace_minutes: 1440,
    p_max_offset_minutes: 525600
  });
  if (error) throw error;
  return data;
};

export const requeueExpiredPushDeliveries = async (client, now) => {
  const { data, error } = await client.rpc('requeue_expired_push_deliveries', {
    p_now: now.toISOString(),
    p_max_attempts: 5
  });
  if (error) throw error;
  return data;
};

export const claimDuePushDeliveries = async (client, now, limit = 10) => {
  const { data, error } = await client.rpc('claim_due_push_deliveries', {
    p_now: now.toISOString(),
    p_limit: limit,
    p_lease_seconds: 180
  });
  if (error) throw error;
  return data || [];
};

export const findPushDeliveryContext = async (client, job) => {
  const [reminderResult, subscriptionResult] = await Promise.all([
    client
      .from('reminders')
      .select('id, title, reminder_date, status, notification_offset_minutes')
      .eq('id', job.reminder_id)
      .eq('user_id', job.user_id)
      .maybeSingle(),
    client
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, expiration_time')
      .eq('id', job.subscription_id)
      .eq('user_id', job.user_id)
      .maybeSingle()
  ]);

  if (reminderResult.error) throw reminderResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;
  return { reminder: reminderResult.data, subscription: subscriptionResult.data };
};

export const updatePushDelivery = async (client, id, updates) => {
  const result = await client
    .from('push_deliveries')
    .update(updates)
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  return unwrapResult(result);
};

export const removePushSubscription = async (client, id) => {
  const result = await client
    .from('push_subscriptions')
    .delete()
    .eq('id', id);

  if (result.error) throw result.error;
};
