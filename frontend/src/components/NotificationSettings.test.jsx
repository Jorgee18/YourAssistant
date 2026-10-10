import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationSettings } from './NotificationSettings.jsx';

const pushApi = vi.hoisted(() => ({
  getPushConfig: vi.fn(),
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn()
}));

vi.mock('../services/push.api.js', () => pushApi);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NotificationSettings', () => {
  it('asks permission after a click and saves the device subscription', async () => {
    const user = userEvent.setup();
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/device',
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/device' }),
      unsubscribe: vi.fn(async () => true)
    };
    const pushManager = {
      getSubscription: vi.fn(async () => null),
      subscribe: vi.fn(async () => subscription)
    };
    const registration = { pushManager };
    const notificationApi = {
      permission: 'default',
      requestPermission: vi.fn(async () => {
        notificationApi.permission = 'granted';
        return 'granted';
      })
    };
    vi.stubGlobal('Notification', notificationApi);
    vi.stubGlobal('PushManager', class PushManager {});
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve(registration) }
    });
    pushApi.getPushConfig.mockResolvedValue({ publicKey: 'AQID' });
    pushApi.savePushSubscription.mockResolvedValue({ enabled: true });

    render(<NotificationSettings />);
    const enable = await screen.findByRole('button', { name: 'Activar notificaciones' });
    await user.click(enable);

    expect(notificationApi.requestPermission).toHaveBeenCalledOnce();
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array)
    });
    expect(pushApi.savePushSubscription).toHaveBeenCalledWith(subscription.toJSON());
    expect(await screen.findByText('Activas en este dispositivo')).toBeInTheDocument();
  });
});
