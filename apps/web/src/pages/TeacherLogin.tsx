import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { BackLink, ErrorText, Logo, Screen } from '../components/ui';
import { ApiError } from '../lib/api';

const input =
  'h-14 w-full rounded-2xl border-2 border-[#cfd9ee] bg-card px-4 text-base text-ink outline-none focus:border-teal';

/** 2. Login docente: correo + contraseña. */
export function TeacherLogin() {
  const { user, loginTeacher } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'TEACHER') return <Navigate to="/docente" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await loginTeacher(email, password);
      navigate('/docente', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Demasiados intentos. Espera un minuto.'
          : err instanceof Error
            ? err.message
            : 'No se pudo entrar',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackLink to="/" />
      <Logo size={110} />
      <form onSubmit={submit} className="card-game grid gap-4" noValidate>
        <h1 className="text-center text-2xl">Panel docente</h1>
        <label className="grid gap-1 text-sm">
          Correo
          <input
            className={input}
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Contraseña
          <input
            className={input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <button type="submit" className="btn-game w-full" disabled={busy || !email || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Screen>
  );
}
