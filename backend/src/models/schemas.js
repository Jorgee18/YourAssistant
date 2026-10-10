import { z } from 'zod';

// Validaciones de Auth
export const RegisterSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Nombre obligatorio'),
  phone: z.string().regex(/^\+569\d{8}$/, 'El teléfono debe ser +569XXXXXXXX')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const LoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres.'),
  phone: z.string().regex(/^\+569\d{8}$/, 'El teléfono debe tener el formato +569XXXXXXXX'),
  avatarUrl: z.string().optional()
});

export const UpdateEmailSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido')
});

export const AssistantRequestSchema = z.object({
  message: z.string().trim().min(1, 'El campo message es obligatorio').max(2000, 'El mensaje es demasiado largo')
});

export const ReminderStatusSchema = z.enum(['pending', 'completed', 'cancelled']);

export const ReminderRangeSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime()
}).refine(({ from, to }) => new Date(from) < new Date(to), {
  message: 'La fecha final debe ser posterior a la inicial',
  path: ['to']
}).refine(({ from, to }) => new Date(to) - new Date(from) <= 366 * 24 * 60 * 60 * 1000, {
  message: 'El rango no puede superar un año',
  path: ['to']
});

export const UpdateReminderStatusSchema = z.object({
  status: ReminderStatusSchema
});

export const NotificationOffsetSchema = z.number().int().min(0).max(525600);

export const UpdateReminderNotificationSchema = z.object({
  notificationOffsetMinutes: NotificationOffsetSchema
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().refine(isAllowedPushEndpoint, 'Endpoint push no permitido'),
  expirationTime: z.number().int().positive().max(8640000000000000).nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(16).max(256),
    auth: z.string().min(8).max(256)
  })
});

export const PushEndpointSchema = z.object({
  endpoint: z.string().url().refine(isAllowedPushEndpoint, 'Endpoint push no permitido')
});

export const ReminderIdSchema = z.string().uuid();

function isAllowedPushEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'fcm.googleapis.com'
      || host === 'android.googleapis.com'
      || host.endsWith('.push.services.mozilla.com')
      || host === 'web.push.apple.com'
      || host.endsWith('.push.apple.com')
    );
  } catch {
    return false;
  }
}

export const ActiveModelSchema = z.object({
  model: z.string().trim().min(1).max(120)
});

// Validación del Contrato JSON del LLM (Ollama)
const ReminderDateSchema = z.iso.datetime();

export const LLMResponseSchema = z.object({
  action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'UNKNOWN']),
  data: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    reminder_date: ReminderDateSchema.optional(),
    reminder_id: z.string().uuid().optional()
  }).optional(),
  reply: z.string().trim().min(1)
}).superRefine((response, context) => {
  const addMissingFieldIssue = (field, message) => context.addIssue({
    code: 'custom',
    path: ['data', field],
    message
  });
  const data = response.data;

  if (response.action === 'CREATE') {
    if (!data?.title) addMissingFieldIssue('title', 'CREATE requiere un título');
    if (!data?.reminder_date) addMissingFieldIssue('reminder_date', 'CREATE requiere una fecha válida');
  }

  if (response.action === 'UPDATE') {
    if (!data?.reminder_id) addMissingFieldIssue('reminder_id', 'UPDATE requiere el ID del recordatorio');
    if (data && !data.title && data.description === undefined && !data.reminder_date) {
      addMissingFieldIssue('reminder_id', 'UPDATE requiere al menos un campo para modificar');
    }
  }

  if (response.action === 'DELETE' && !data?.reminder_id) {
    addMissingFieldIssue('reminder_id', 'DELETE requiere el ID del recordatorio');
  }
});
