import { createServiceRoleSupabaseClient } from '../config/supabase.js';
import { PushEndpointSchema, PushSubscriptionSchema } from '../models/schemas.js';
import {
  deletePushSubscription,
  savePushSubscription
} from '../models/push-subscription.model.js';
import { getVapidPublicKey } from '../services/web-push.service.js';

const getServiceClient = () => {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    throw new Error('La integración push no está configurada en el backend');
  }
};

export const getPushConfig = (req, res) => {
  try {
    return res.json({ publicKey: getVapidPublicKey() });
  } catch {
    return res.status(503).json({ error: 'Las notificaciones push no están configuradas' });
  }
};

export const registerPushSubscription = async (req, res) => {
  const parsed = PushSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const subscription = await savePushSubscription(
      getServiceClient(),
      req.user.id,
      parsed.data,
      req.headers['user-agent']
    );
    return res.status(201).json({ enabled: true, subscriptionId: subscription.id });
  } catch (err) {
    console.error('No se pudo registrar la suscripción push:', err);
    return res.status(503).json({ error: 'No se pudo activar este dispositivo para recibir notificaciones' });
  }
};

export const removePushSubscription = async (req, res) => {
  const parsed = PushEndpointSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    await deletePushSubscription(getServiceClient(), req.user.id, parsed.data.endpoint);
    return res.json({ enabled: false });
  } catch (err) {
    console.error('No se pudo eliminar la suscripción push:', err);
    return res.status(503).json({ error: 'No se pudo desactivar este dispositivo' });
  }
};
