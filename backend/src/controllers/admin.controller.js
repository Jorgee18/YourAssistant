import { ActiveModelSchema } from '../models/schemas.js';
import { findAdministrator } from '../models/administrator.model.js';
import {
  findAssistantSettings,
  updateActiveModel
} from '../models/assistant-settings.model.js';
import { listOllamaModels } from '../services/ollama.service.js';

export const getAdminAccess = async (req, res) => {
  try {
    const administrator = await findAdministrator(req.supabase, req.user.id);
    return res.json({ isAdmin: Boolean(administrator) });
  } catch (err) {
    console.error('Error al comprobar permisos administrativos:', err);
    return res.status(500).json({ error: 'No se pudieron comprobar los permisos' });
  }
};

export const getModelSettings = async (req, res) => {
  try {
    const [settings, models] = await Promise.all([
      findAssistantSettings(req.supabase),
      listOllamaModels()
    ]);

    if (!settings) {
      return res.status(503).json({ error: 'La configuración del asistente aún no existe' });
    }

    return res.json({
      activeModel: settings.active_model,
      models,
      updatedAt: settings.updated_at
    });
  } catch (err) {
    console.error('Error al cargar configuración de modelos:', err);
    return res.status(502).json({ error: 'No se pudo consultar Ollama o Supabase' });
  }
};

export const changeActiveModel = async (req, res) => {
  const parsed = ActiveModelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const models = await listOllamaModels();
    if (!models.includes(parsed.data.model)) {
      return res.status(400).json({ error: 'El modelo no está disponible en Ollama' });
    }

    const settings = await updateActiveModel(
      req.supabase,
      parsed.data.model,
      req.user.id
    );
    return res.json({
      activeModel: settings.active_model,
      updatedAt: settings.updated_at
    });
  } catch (err) {
    console.error('Error al cambiar modelo activo:', err);
    return res.status(502).json({ error: 'No se pudo guardar el modelo seleccionado' });
  }
};
