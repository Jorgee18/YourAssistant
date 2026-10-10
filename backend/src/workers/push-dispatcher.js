import dotenv from 'dotenv';
import { createServiceRoleSupabaseClient } from '../config/supabase.js';
import { runPushDispatchCycle } from '../services/push-dispatcher.service.js';
import { getVapidPublicKey } from '../services/web-push.service.js';

dotenv.config();

getVapidPublicKey();
const client = createServiceRoleSupabaseClient();
const intervalMs = Math.max(10000, Number(process.env.PUSH_POLL_INTERVAL_MS) || 30000);
let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  try {
    const result = await runPushDispatchCycle(client);
    if (result.claimed) console.log('Push dispatcher:', result);
  } catch (err) {
    console.error('Error en el ciclo del push dispatcher:', err);
  } finally {
    running = false;
  }
};

const timer = setInterval(tick, intervalMs);
tick();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    clearInterval(timer);
    process.exit(0);
  });
}
