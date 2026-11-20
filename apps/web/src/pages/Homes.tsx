import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { Logo, Screen } from '../components/ui';
import { api } from '../lib/api';

/** Mensaje de la ruta protegida por rol (prueba los guards de punta a punta). */
function useHomeMessage(path: string) {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api<{ message: string }>(path)
      .then((r) => setMsg(r.message))
      .catch(() => setMsg(''));
  }, [path]);
  return msg;
}

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn-game btn-game--red w-full"
      onClick={() => void logout().then(() => navigate('/', { replace: true }))}
    >
      Salir
    </button>
  );
}

/** Destino provisional del docente (Fase 4: panel). */
export function TeacherHome() {
  const { user } = useAuth();
  const msg = useHomeMessage('/teacher/home');
  if (user?.role !== 'TEACHER') return null;
  return (
    <Screen>
      <Logo size={100} />
      <div className="card-game text-center">
        <h1 className="text-2xl">{msg || 'Panel docente — próximamente'}</h1>
        <p className="mt-2 text-muted">
          {user.fullName} · {user.email}
        </p>
      </div>
      <LogoutButton />
    </Screen>
  );
}
