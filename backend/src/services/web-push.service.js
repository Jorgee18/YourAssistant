import webPush from 'web-push';

let configured = false;

const configureVapid = () => {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('Falta configurar VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT');
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
};

export const getVapidPublicKey = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    throw new Error('La configuración VAPID está incompleta');
  }
  return publicKey;
};

export const sendWebPushNotification = async (subscription, payload) => {
  configureVapid();
  return webPush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 86400,
    urgency: 'normal',
    timeout: 10000
  });
};
