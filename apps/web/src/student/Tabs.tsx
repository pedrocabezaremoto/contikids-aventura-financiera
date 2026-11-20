import { useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { Avatar, Waddles } from '../components/ui';

/** /recompensas — llega en la sub-fase 2.5. */
export function RewardsPage() {
  return (
    <>
      <h1 className="text-center text-2xl">Recompensas</h1>
      <Waddles>¡Aquí guardaré tus medallas y monedas! Muy pronto estará listo.</Waddles>
    </>
  );
}

/** /perfil — avatar, sección y Salir (el progreso por módulo llega en la 2.5). */
export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (user?.role !== 'STUDENT') return null;
  return (
    <>
      <div className="card-game flex flex-col items-center gap-3 text-center">
        <Avatar name={user.name} color={user.avatarColor} size={88} />
        <h1 className="text-3xl">¡Hola, {user.name}!</h1>
        <p className="text-muted">Sección {user.sectionCode}</p>
      </div>
      <Waddles>Muy pronto verás aquí tu progreso en cada isla.</Waddles>
      <button
        type="button"
        className="btn-game btn-game--red w-full"
        onClick={() => void logout().then(() => navigate('/', { replace: true }))}
      >
        Salir
      </button>
    </>
  );
}
