import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { Avatar, Logo } from '../components/ui';
import { useMap } from '../lib/queries';
import { CoinIcon, GiftIcon, MapIcon, UserIcon, XpIcon } from './icons';

const NAV = [
  { to: '/mapa', label: 'Mapa', icon: MapIcon, end: false },
  { to: '/recompensas', label: 'Recompensas', icon: GiftIcon, end: true },
  { to: '/perfil', label: 'Perfil', icon: UserIcon, end: true },
] as const;

function Chip({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | undefined;
  label: string;
}) {
  return (
    <span
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-3 font-display text-base font-extrabold shadow-[0_3px_0_rgba(6,24,89,.18)]"
      aria-label={`${label}: ${value ?? 'cargando'}`}
    >
      {icon}
      <span aria-hidden="true">{value ?? '–'}</span>
    </span>
  );
}

/** Arriba: monedas y XP (de /me/map). Abajo (móvil) o a la izquierda (≥ 1024 px): la navegación. */
export function StudentLayout() {
  const { user } = useAuth();
  const map = useMap();
  if (user?.role !== 'STUDENT') return null;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 font-display text-xs font-extrabold lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${
      isActive ? 'bg-sky-b text-teal-shadow' : 'text-muted'
    }`;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 p-5 lg:flex">
        <Logo size={120} />
        <nav aria-label="Principal" className="card-game flex flex-col gap-1 p-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col lg:max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-sm">
          <Avatar name={user.name} color={user.avatarColor} size={44} />
          <span className="min-w-0 flex-1 truncate font-display text-base font-extrabold">
            {user.name}
          </span>
          <Chip icon={<CoinIcon />} value={map.data?.coins} label="Monedas" />
          <Chip icon={<XpIcon />} value={map.data?.xp} label="XP" />
        </header>

        <main className="flex flex-1 flex-col gap-4 px-4 pb-28 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-sky-b bg-card px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="mx-auto flex max-w-md gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
