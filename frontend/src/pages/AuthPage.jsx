import { ArrowRight, Check, KeyRound, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const { session, signIn, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (session) return <Navigate to="/" replace />;

  const updateField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async event => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isRegister) {
        await signUp({
          fullName: form.fullName,
          phone: `+569${form.phone}`,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword
        });
        setSuccess('Cuenta creada. Revisa tu correo si Supabase requiere confirmar la dirección antes de iniciar sesión.');
      } else {
        await signIn({ email: form.email, password: form.password });
        navigate(location.state?.from?.pathname || '/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-copy" aria-label="YourAssistant">
        <Link className="brand-lockup" to="/login">
          <span className="brand-glyph">Y<span>.</span></span>
          <span>YourAssistant</span>
        </Link>
        <div className="auth-manifesto">
          <p className="eyebrow">Una cosa a la vez</p>
          <h1 className="font-display">Haz espacio para lo que importa.</h1>
          <p>Una conversación tranquila para poner en orden tus pendientes, tus días y tus ideas.</p>
        </div>
        <p className="auth-footnote">Tu agenda, a tu propio ritmo.</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <p className="eyebrow">{isRegister ? 'Comienza aquí' : 'Qué bueno verte'}</p>
          <h2 className="font-display">{isRegister ? 'Crea tu espacio.' : 'Volvamos a tu día.'}</h2>
          <p className="auth-intro">{isRegister ? 'Un lugar sencillo para organizar lo que viene.' : 'Inicia sesión para continuar donde lo dejaste.'}</p>

          {error ? <div className="form-alert form-alert-error" role="alert">{error}</div> : null}
          {success ? <div className="form-alert form-alert-success" role="status"><Check size={17} />{success}</div> : null}

          <form className="auth-form" onSubmit={submit}>
            {isRegister ? (
              <>
                <label className="field-label">
                  Nombre completo
                  <span className="field-control"><UserRound size={17} /><input name="fullName" autoComplete="name" minLength={2} required value={form.fullName} onChange={updateField} /></span>
                </label>
                <label className="field-label">
                  Teléfono
                  <span className="field-control"><span className="phone-prefix">+56 9</span><input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{8}" placeholder="12345678" required value={form.phone} onChange={updateField} /></span>
                  <span className="field-hint">Ingresa los ocho dígitos de tu número móvil.</span>
                </label>
              </>
            ) : null}
            <label className="field-label">
              Correo electrónico
              <span className="field-control"><Mail size={17} /><input name="email" type="email" autoComplete="email" required value={form.email} onChange={updateField} /></span>
            </label>
            <label className="field-label">
              Contraseña
              <span className="field-control"><KeyRound size={17} /><input name="password" type="password" minLength={isRegister ? 6 : 1} autoComplete={isRegister ? 'new-password' : 'current-password'} required value={form.password} onChange={updateField} /></span>
            </label>
            {isRegister ? (
              <label className="field-label">
                Confirma tu contraseña
                <span className="field-control"><KeyRound size={17} /><input name="confirmPassword" type="password" minLength={6} autoComplete="new-password" required value={form.confirmPassword} onChange={updateField} /></span>
              </label>
            ) : null}
            <button type="submit" className="primary-button auth-submit" disabled={loading} aria-busy={loading}>
              <span>{loading ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</span>
              {loading ? <span className="button-spinner" aria-hidden="true" /> : <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Inicia sesión' : 'Regístrate'}</Link>
          </p>
        </div>
      </section>
    </main>
  );
};
