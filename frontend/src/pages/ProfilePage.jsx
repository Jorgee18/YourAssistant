import { ArrowLeft, AtSign, Check, RefreshCw, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationSettings } from '../components/NotificationSettings.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getProfile,
  requestEmailChange,
  updateProfile
} from '../services/auth.api.js';

const emptyForm = { fullName: '', phone: '', avatarUrl: '' };

export const ProfilePage = () => {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newEmail, setNewEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [emailNotice, setEmailNotice] = useState('');

  useEffect(() => {
    let active = true;
    getProfile()
      .then(result => {
        if (!active) return;
        setProfile(result);
        setForm({
          fullName: result.profile.full_name || '',
          phone: result.profile.phone || '',
          avatarUrl: result.profile.avatar_url || ''
        });
        setPendingEmail(result.pendingEmail || null);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const updateField = event => {
    if (event.target.name === 'avatarUrl') setAvatarLoadError(false);
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  };

  const saveProfile = async event => {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const result = await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone,
        avatarUrl: form.avatarUrl.trim() || undefined
      });
      setProfile(current => ({ ...current, profile: result.profile }));
      setForm({
        fullName: result.profile.full_name || '',
        phone: result.profile.phone || '',
        avatarUrl: result.profile.avatar_url || ''
      });
      updateUser({ fullName: result.profile.full_name, phone: result.profile.phone });
      setNotice(result.message || 'Perfil actualizado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmail = async event => {
    event.preventDefault();
    setSavingEmail(true);
    setError('');
    setEmailNotice('');
    try {
      const result = await requestEmailChange(newEmail.trim());
      setProfile(current => ({ ...current, email: result.currentEmail }));
      setPendingEmail(result.pendingEmail);
      if (!result.pendingEmail && result.currentEmail) updateUser({ email: result.currentEmail });
      setNewEmail('');
      setEmailNotice(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProfile();
      setProfile(result);
      setPendingEmail(result.pendingEmail || null);
      updateUser({ email: result.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = (form.fullName || profile?.email || 'U')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link to="/" className="back-link"><ArrowLeft size={17} />Volver a tu espacio</Link>
        <span className="admin-access"><UserRound size={16} />Mi perfil</span>
      </header>

      <div className="admin-content profile-content">
        <p className="eyebrow">Tu cuenta</p>
        <h1 className="font-display admin-title">Tus datos, a tu manera.</h1>
        <p className="admin-lede">Mantén actualizada la información con la que te reconoce YourAssistant.</p>

        {error ? <div className="form-alert form-alert-error" role="alert">{error}</div> : null}
        {notice ? <div className="form-alert form-alert-success" role="status"><Check size={17} />{notice}</div> : null}

        {loading && !profile ? <p className="profile-loading" role="status">Cargando tu perfil…</p> : null}

        {profile ? (
          <>
            <section className="model-config profile-section" aria-labelledby="profile-details-title">
              <div className="profile-section-heading">
                <div className="profile-avatar" aria-hidden="true">
                  {form.avatarUrl && !avatarLoadError
                    ? <img src={form.avatarUrl} alt="" onError={() => setAvatarLoadError(true)} />
                    : initials}
                </div>
                <div>
                  <h2 id="profile-details-title" className="font-display text-xl">Datos personales</h2>
                  <p>{profile.email}</p>
                </div>
              </div>

              <form className="profile-form" onSubmit={saveProfile}>
                <label className="field-label">
                  Nombre completo
                  <span className="field-control"><input name="fullName" autoComplete="name" minLength={2} required value={form.fullName} onChange={updateField} /></span>
                </label>
                <label className="field-label">
                  Teléfono
                  <span className="field-control"><input name="phone" type="tel" autoComplete="tel" pattern="\+569[0-9]{8}" required value={form.phone} onChange={updateField} /></span>
                  <span className="field-hint">Formato requerido: +569 seguido de ocho dígitos.</span>
                </label>
                <label className="field-label profile-avatar-field">
                  URL del avatar <span className="field-hint">Opcional</span>
                  <span className="field-control"><input name="avatarUrl" type="url" autoComplete="url" value={form.avatarUrl} onChange={updateField} /></span>
                </label>
                <button type="submit" className="primary-button profile-save" disabled={loading || savingProfile} aria-busy={savingProfile}>
                  {savingProfile ? <span className="button-spinner" aria-hidden="true" /> : <Save size={16} />}
                  <span>{savingProfile ? 'Guardando…' : 'Guardar cambios'}</span>
                </button>
              </form>
            </section>

            <section className="model-config profile-section profile-email-section" aria-labelledby="profile-email-title">
              <div className="profile-section-heading">
                <div className="model-section-icon"><AtSign size={20} /></div>
                <div>
                  <h2 id="profile-email-title" className="font-display text-xl">Correo electrónico</h2>
                  <p>Actual: <strong>{profile.email}</strong></p>
                </div>
                <button type="button" className="icon-button ml-auto" onClick={refreshProfile} disabled={loading} aria-label="Revisar estado del correo" aria-busy={loading}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {pendingEmail ? (
                <div className="form-alert form-alert-success" role="status">
                  <AtSign size={17} />
                  <span>Confirmación pendiente para <strong>{pendingEmail}</strong>. El correo actual seguirá activo hasta que completes las confirmaciones solicitadas por Supabase.</span>
                </div>
              ) : null}
              {emailNotice ? <div className="form-alert form-alert-success" role="status"><Check size={17} />{emailNotice}</div> : null}

              <form className="profile-email-form" onSubmit={saveEmail}>
                <label className="field-label" htmlFor="new-profile-email">Nuevo correo</label>
                <div className="profile-email-row">
                  <span className="field-control"><input id="new-profile-email" type="email" autoComplete="email" required value={newEmail} onChange={event => setNewEmail(event.target.value)} /></span>
                  <button type="submit" className="primary-button" disabled={loading || savingEmail || !newEmail.trim()} aria-busy={savingEmail}>
                    {savingEmail ? <span className="button-spinner" aria-hidden="true" /> : <AtSign size={16} />}
                    <span>{savingEmail ? 'Enviando…' : 'Solicitar cambio'}</span>
                  </button>
                </div>
                <p className="field-hint">Sigue los enlaces de confirmación que requiera la configuración de Supabase. El correo actual seguirá activo mientras tanto.</p>
              </form>
            </section>
            <NotificationSettings />
          </>
        ) : null}
      </div>
    </main>
  );
};
