const unwrapResult = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const savePushSubscription = async (client, userId, subscription, userAgent) => {
  const result = await client
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expiration_time: subscription.expirationTime
        ? new Date(subscription.expirationTime).toISOString()
        : null,
      user_agent: userAgent?.slice(0, 400) || null,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'endpoint' })
    .select('id')
    .single();

  return unwrapResult(result);
};

export const deletePushSubscription = async (client, userId, endpoint) => {
  const result = await client
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .select('id')
    .maybeSingle();

  return unwrapResult(result);
};
