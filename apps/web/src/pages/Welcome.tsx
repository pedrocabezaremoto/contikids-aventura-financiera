import { Link, Navigate } from 'react-router';
import { homeFor, useAuth } from '../auth/auth-context';
import { Loading, Logo, Screen, Waddles } from '../components/ui';

/** 1. Bienvenida: ¿Docente o Estudiante? */
export function Welcome() {
  const { status, user } = useAuth();
  if (status === 'loading') return <Loading />;
  if (user) return <Navigate to={homeFor(user)} replace />;

  return (
    <Screen>
      <Logo size={150} />
      <Waddles>¡Hola! Soy Waddles. ¿Quién eres hoy?</Waddles>
      <div className="mt-2 grid gap-4">
        <Link to="/estudiante" className="btn-game btn-game--blue min-h-20 text-xl">
          🎒 Soy estudiante
        </Link>
        <Link to="/docente/entrar" className="btn-game min-h-20 text-xl">
          🍎 Soy docente
        </Link>
      </div>
    </Screen>
  );
}
