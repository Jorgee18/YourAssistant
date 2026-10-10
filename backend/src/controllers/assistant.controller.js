import { AssistantRequestSchema } from '../models/schemas.js';
import {
  handleAssistantMessage,
  AssistantSettingsNotFoundError,
  ReminderNotFoundError
} from '../services/assistant.service.js';

export const handleAssistantQuery = async (req, res) => {
  const parsedRequest = AssistantRequestSchema.safeParse(req.body);
  if (!parsedRequest.success) {
    return res.status(400).json({ error: parsedRequest.error.issues[0].message });
  }

  try {
    const userId = req.user.id;
    const response = await handleAssistantMessage(
      req.supabase,
      userId,
      parsedRequest.data.message
    );

    return res.json(response);

  } catch (err) {
    if (err instanceof ReminderNotFoundError) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }
    if (err instanceof AssistantSettingsNotFoundError) {
      return res.status(503).json({ error: 'La configuración del asistente aún no existe' });
    }
    console.error('Error en Assistant Controller:', err);
    return res.status(500).json({ 
      error: 'Hubo un problema al procesar tu solicitud con el asistente.' 
    });
  }
};
