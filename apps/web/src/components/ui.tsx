import type { ReactNode } from 'react';
import { Link } from 'react-router';
import logoUrl from '../assets/logo-contikids.webp';
import waddlesUrl from '../assets/waddles.png';

/** Contenedor de cada pantalla: centrado, mobile-first, sin scroll horizontal. */
export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full flex-col gap-4 px-4 py-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
    >
      {children}
    </main>
  );
}

export function Logo({ size = 120 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={Math.round((size * 731) / 778)}
      alt="ContiKids, Aventura financiera"
      className="mx-auto"
    />
  );
}

/** Waddles con globo de diálogo. */
export function Waddles({ children, mood }: { children: ReactNode; mood?: 'oops' }) {
  return (
    <div className="flex items-end gap-3" role="status" aria-live="polite">
      <img
        src={waddlesUrl}
        width={60}
        height={71}
        alt="Waddles"
        className={`shrink-0 ${mood === 'oops' ? 'animate-wiggle' : ''}`}
      />
      <p className="card-game rounded-bl-md py-3 text-base leading-snug">{children}</p>
    </div>
  );
}

export function BackLink({ to, children = 'Volver' }: { to: string; children?: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-12 items-center gap-1 self-start rounded-full px-3 font-display text-sm font-extrabold text-ink"
    >
      ← {children}
    </Link>
  );
}

export function Avatar({ name, color, size = 64 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white"
      style={{
        background: color,
        width: size,
        height: size,
        fontSize: size * 0.42,
        boxShadow: '0 4px 0 rgba(6,24,89,.18)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Loading() {
  return (
    <Screen>
      <div className="my-auto text-center">
        <img src={waddlesUrl} width={80} height={95} alt="" className="mx-auto animate-pulse" />
        <p className="mt-3 text-muted">Cargando…</p>
      </div>
    </Screen>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl bg-[#ffe8e8] px-4 py-3 text-sm text-[#a52a2a]">
      {children}
    </p>
  );
}
