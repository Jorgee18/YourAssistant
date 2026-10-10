import { Bell, BellOff, CircleHelp, LoaderCircle, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getPushConfig,
  removePushSubscription,
  savePushSubscription
} from '../services/push.api.js';

const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isInstalledApp = () => window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true;

const decodeApplicationServerKey = value => {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
};

export const NotificationSettings = () => {
  const [permission, setPermission] = useState(() => (
    'Notification' in window ? Notification.permission : 'unsupported'
  ));
  const [subscription, setSubscription] = useState(null);
  const [serverRegistered, setServerRegistered] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const appleMobile = isAppleMobile();
  const needsHomeScreen = appleMobile && !isInstalledApp();
  const supported = window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  useEffect(() => {
    let active = true;
    const loadSubscription = async () => {
      if (!supported || needsHomeScreen) {
        setLoading(false);
        return;
      }

      try {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(resolve => setTimeout(() => resolve(null), 8000))
        ]);
        if (!registration) throw new Error('El Service Worker aún no está activo. Abre la PWA instalada o ejecuta la versión de producción.');
        if (active) setWorkerReady(true);
        const current = await registration.pushManager.getSubscription();
        if (active) setSubscription(current);
        if (current && Notification.permission === 'granted') {
          await savePushSubscription(current.toJSON());
          if (active) setServerRegistered(true);
        }
      } catch (err) {
        if (active) {
          setServerRegistered(false);
          setError(err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSubscription();
    return () => { active = false; };
  }, [supported, needsHomeScreen]);

  const enableNotifications = async () => {
    setWorking(true);
    setError('');
    setNotice('');
    try {
      let nextPermission = Notification.permission;
      if (nextPermission === 'default') nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        setError(nextPermission === 'denied'
          ? 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador o del dispositivo.'
          : 'No se concedió permiso para mostrar notificaciones.');
        return;
      }

      const [{ publicKey }, registration] = await Promise.all([
        getPushConfig(),
        navigator.serviceWorker.ready
      ]);
      const nextSubscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey)
        });

      try {
        await savePushSubscription(nextSubscription.toJSON());
        setServerRegistered(true);
      } catch (err) {
        if (!subscription) await nextSubscription.unsubscribe();
        throw err;
      }

      setSubscription(nextSubscription);
      setNotice('Este dispositivo ya recibirá avisos para tus recordatorios.');
    } catch (err) {
      setError(err.message || 'No se pudieron activar las notificaciones.');
    } finally {
      setWorking(false);
    }
  };

  const disableNotifications = async () => {
    if (!subscription) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      setServerRegistered(false);
      setNotice('Se desactivaron los avisos en este dispositivo.');
    } catch (err) {
      setError(err.message || 'No se pudo desactivar este dispositivo.');
    } finally {
      setWorking(false);
    }
  };

  const enabled = permission === 'granted' && Boolean(subscription) && serverRegistered;

  return (
    <section className="model-config profile-section notification-settings" aria-labelledby="notification-settings-title">
      <div className="profile-section-heading">
        <div className="model-section-icon"><Bell size={20} /></div>
        <div>
          <h2 id="notification-settings-title" className="font-display text-xl">Notificaciones</h2>
          <p>Recibe avisos incluso cuando YourAssistant no esté abierto.</p>
        </div>
        <span className={`push-state ${enabled ? 'push-state-enabled' : ''}`}>
          <span aria-hidden="true" />{enabled ? 'Activas en este dispositivo' : 'Desactivadas'}
        </span>
      </div>

      {error ? <div className="form-alert form-alert-error" role="alert">{error}</div> : null}
      {notice ? <div className="form-alert form-alert-success" role="status">{notice}</div> : null}

      {needsHomeScreen ? (
        <div className="push-guidance" role="status">
          <Smartphone size={18} />
          <p>En iPhone o iPad, primero añade YourAssistant a la pantalla de inicio: abre esta página en Safari, pulsa Compartir y elige “Añadir a pantalla de inicio”. Luego abre la aplicación instalada para activar Push.</p>
        </div>
      ) : !supported ? (
        <div className="push-guidance" role="status">
          <CircleHelp size={18} />
          <p>Este navegador o contexto no admite Web Push. Usa un navegador compatible y una conexión HTTPS.</p>
        </div>
      ) : permission === 'denied' ? (
        <div className="push-guidance" role="status">
          <BellOff size={18} />
          <p>El permiso está bloqueado para esta aplicación. Cámbialo en los ajustes del navegador o del dispositivo y vuelve aquí para activarlo.</p>
        </div>
      ) : enabled ? (
        <button type="button" className="task-action" onClick={disableNotifications} disabled={working} aria-busy={working}>
          {working ? <LoaderCircle size={15} className="animate-spin" /> : <BellOff size={15} />}
          <span>{working ? 'Desactivando…' : 'Desactivar en este dispositivo'}</span>
        </button>
      ) : (
        <button
          type="button"
          className="primary-button"
          onClick={enableNotifications}
          disabled={loading || working || !workerReady || permission === 'denied'}
          aria-busy={loading || working}
        >
          {loading || working ? <span className="button-spinner" aria-hidden="true" /> : <Bell size={16} />}
          <span>{loading ? 'Comprobando…' : working ? 'Activando…' : subscription ? 'Sincronizar este dispositivo' : 'Activar notificaciones'}</span>
        </button>
      )}

      <p className="push-note">Los avisos salen del servidor cuando vence el adelanto de cada recordatorio. El sistema operativo puede retrasar su entrega.</p>
    </section>
  );
};
