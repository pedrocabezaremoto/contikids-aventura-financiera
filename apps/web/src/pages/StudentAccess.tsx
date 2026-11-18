import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { PinPad } from '../components/PinPad';
import { Avatar, BackLink, Loading, Logo, Screen, Waddles } from '../components/ui';
import { api, ApiError } from '../lib/api';
import type { SectionProfiles } from '../lib/types';

const SECTION_KEY = 'contikids.sectionCode';

function savedSection(): string {
  try {
    return localStorage.getItem(SECTION_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Carga los perfiles de una sección (solo id, nombre corto y color). */
function useSection(code: string | undefined) {
  const [data, setData] = useState<SectionProfiles | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!code) return;
    let alive = true;
    api<SectionProfiles>(`/auth/students?sectionCode=${encodeURIComponent(code)}`, { auth: false })
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Error'));
    return () => {
      alive = false;
    };
  }, [code]);
  return { data, error };
}

/** 3. Código de sección (ej. DEMO-5A). Se recuerda en este dispositivo. */
export function SectionCode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState(savedSection);

  if (user?.role === 'STUDENT') return <Navigate to="/mapa" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    try {
      localStorage.setItem(SECTION_KEY, clean);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
    navigate(`/estudiante/${encodeURIComponent(clean)}`);
  };

  return (
    <Screen>
      <BackLink to="/" />
      <Logo size={110} />
      <Waddles>Escribe el código de tu salón. Te lo da tu maestra o maestro.</Waddles>
      <form onSubmit={submit} className="card-game grid gap-4">
        <label className="grid gap-2 text-center font-display text-lg font-extrabold">
          Código de sección
          <input
            className="h-16 w-full rounded-2xl border-2 border-[#cfd9ee] bg-card px-4 text-center font-display text-2xl tracking-widest text-ink uppercase outline-none focus:border-teal"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            placeholder="DEMO-5A"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-game btn-game--blue w-full" disabled={!code.trim()}>
          Continuar
        </button>
      </form>
    </Screen>
  );
}

/** 4. Elegir perfil (avatares de la sección). */
export function ProfilePicker() {
  const { code } = useParams();
  const { data, error } = useSection(code);

  if (error) {
    return (
      <Screen>
        <BackLink to="/estudiante">Cambiar código</BackLink>
        <Waddles mood="oops">{error}</Waddles>
      </Screen>
    );
  }
  if (!data) return <Loading />;

  return (
    <Screen>
      <BackLink to="/estudiante">Cambiar código</BackLink>
      <h1 className="text-center text-2xl">¿Quién eres?</h1>
      <p className="text-center text-sm text-muted">
        Sección {data.section.code} · {data.section.grade}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.students.map((s) => (
          <li key={s.id}>
            <Link
              to={`/estudiante/${encodeURIComponent(data.section.code)}/${s.id}`}
              state={{ name: s.name, color: s.avatarColor }}
              className="card-game flex min-h-32 flex-col items-center justify-center gap-2 transition-[translate] active:translate-y-[3px]"
            >
              <Avatar name={s.name} color={s.avatarColor} />
              <span className="font-display text-lg font-extrabold">{s.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {data.students.length === 0 && <Waddles>Esta sección todavía no tiene alumnos.</Waddles>}
    </Screen>
  );
}

/** 5. PIN con teclado grande. Mensaje amable si falla; aviso si el perfil queda en pausa. */
export function PinEntry() {
  const { code, studentId } = useParams();
  const { loginStudent } = useAuth();
  const navigate = useNavigate();
  const { data } = useSection(code);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [locked, setLocked] = useState(false);

  const id = Number(studentId);
  const profile = data?.students.find((s) => s.id === id);

  const submit = async (value: string) => {
    if (busy || locked) return;
    setBusy(true);
    setMessage('');
    try {
      await loginStudent(id, value);
      navigate('/mapa', { replace: true });
    } catch (err) {
      setPin('');
      if (err instanceof ApiError && err.body?.code === 'LOCKED') {
        setLocked(true);
        setMessage(err.message);
      } else if (err instanceof ApiError && err.body?.code === 'WRONG_PIN') {
        const left = Number(err.body.attemptsLeft);
        setMessage(
          `¡Uy! Ese PIN no es. ${left === 1 ? 'Te queda 1 intento.' : `Te quedan ${left} intentos.`}`,
        );
      } else if (err instanceof ApiError && err.status === 429) {
        setMessage('Muchos intentos seguidos. Espera un minuto, por favor.');
      } else {
        setMessage(err instanceof Error ? err.message : 'No se pudo entrar');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!Number.isInteger(id) || id < 1) return <Navigate to="/estudiante" replace />;

  return (
    <Screen>
      <BackLink to={`/estudiante/${encodeURIComponent(code ?? '')}`}>Cambiar perfil</BackLink>
      <div className="flex flex-col items-center gap-2">
        <Avatar name={profile?.name ?? '?'} color={profile?.avatarColor ?? '#2e9ca3'} size={80} />
        <h1 className="text-2xl">{profile ? `¡Hola, ${profile.name}!` : 'Tu PIN'}</h1>
      </div>
      {message ? (
        <Waddles mood="oops">{message}</Waddles>
      ) : (
        <Waddles>Escribe tu PIN secreto de 4 números.</Waddles>
      )}
      <PinPad value={pin} onChange={setPin} onSubmit={submit} disabled={busy || locked} />
    </Screen>
  );
}
