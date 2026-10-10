import { ArrowLeft, Check, Cpu, RefreshCw, Save, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAdminAccess, getModelSettings, setActiveModel } from '../services/admin.api.js';

export const AdminPage = () => {
  const [access, setAccess] = useState('checking');
  const [settings, setSettings] = useState(null);
  const [selection, setSelection] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getModelSettings();
      setSettings(result);
      setSelection(result.activeModel);
      setAccess('allowed');
    } catch (err) {
      if (err.status === 403) setAccess('denied');
      else {
        setAccess('allowed');
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (access === 'denied') return <Navigate to="/" replace />;

  const saveModel = async event => {
    event.preventDefault();
    if (!selection || selection === settings?.activeModel) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await setActiveModel(selection);
      setSettings(current => ({ ...current, activeModel: result.activeModel, updatedAt: result.updatedAt }));
      setNotice('Modelo actualizado. Las próximas consultas usarán esta selección.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link to="/" className="back-link"><ArrowLeft size={17} />Volver a tu espacio</Link>
        <span className="admin-access"><ShieldCheck size={16} />Zona de administración</span>
      </header>
      <div className="admin-content">
        <p className="eyebrow">Configuración global</p>
        <h1 className="font-display admin-title">El modelo que acompaña.</h1>
        <p className="admin-lede">Elige cuál de los modelos disponibles en Ollama responderá las conversaciones de YourAssistant.</p>

        {error ? <div className="form-alert form-alert-error" role="alert">{error}</div> : null}
        {notice ? <div className="form-alert form-alert-success" role="status"><Check size={17} />{notice}</div> : null}

        <section className="model-config" aria-labelledby="model-config-title">
          <div className="model-section-heading">
            <div className="model-section-icon"><Cpu size={20} /></div>
            <div>
              <h2 id="model-config-title" className="font-display text-xl">Modelo activo</h2>
              <p className="text-sm text-ink-muted">La selección se aplica a nivel de toda la aplicación.</p>
            </div>
            <button type="button" className="icon-button ml-auto" onClick={load} disabled={loading} aria-label="Actualizar lista de modelos" aria-busy={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <form onSubmit={saveModel}>
            <label className="field-label" htmlFor="active-model">Disponible en este servidor</label>
            <div className="model-select-row">
              <select id="active-model" value={selection} onChange={event => setSelection(event.target.value)} disabled={loading || !settings?.models?.length}>
                {settings?.models?.length ? settings.models.map(model => <option key={model} value={model}>{model}</option>) : <option value="">No hay modelos disponibles</option>}
                {settings?.activeModel && !settings.models.includes(settings.activeModel) ? <option value={settings.activeModel}>{settings.activeModel} (no encontrado)</option> : null}
              </select>
              <button type="submit" className="primary-button" disabled={loading || saving || !selection || selection === settings?.activeModel} aria-busy={saving}>
                {saving ? <span className="button-spinner" aria-hidden="true" /> : <Save size={16} />}
                <span>{saving ? 'Guardando…' : 'Guardar modelo'}</span>
              </button>
            </div>
          </form>

          <div className="active-model-line">
            <span className="active-indicator" aria-hidden="true" />
            <span>En uso ahora</span>
            <strong>{settings?.activeModel || (loading ? 'Cargando…' : 'Sin configurar')}</strong>
          </div>
          {settings?.updatedAt ? <p className="model-updated">Último cambio: {new Date(settings.updatedAt).toLocaleString('es-CL')}</p> : null}
        </section>

        <aside className="admin-note">
          <Server size={17} />
          <p>Esta lista refleja los modelos descargados en el servidor Ollama conectado a la API. Instala un modelo en ese servidor para que aparezca aquí.</p>
        </aside>
      </div>
    </main>
  );
};
