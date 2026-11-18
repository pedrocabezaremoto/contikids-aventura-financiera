import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { Avatar, Logo, Screen, Waddles } from '../components/ui';
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

/** 6a. Destino provisional del estudiante (Fase 2: mapa de islas). */
export function StudentHome() {
  const { user } = useAuth();
  const msg = useHomeMessage('/student/home');
  if (user?.role !== 'STUDENT') return null;
  return (
    <Screen>
      <Logo size={100} />
      <div className="card-game flex flex-col items-center gap-3 text-center">
        <Avatar name={user.name} color={user.avatarColor} size={88} />
        <h1 className="text-3xl">¡Hola, {user.name}!</h1>
        <p className="text-muted">Sección {user.sectionCode}</p>
      </div>
      <Waddles>{msg || 'Tu mapa llega pronto'} 🗺️</Waddles>
      <LogoutButton />
    </Screen>
  );
}

/** 6b. Destino provisional del docente (Fase 4: panel). */
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
