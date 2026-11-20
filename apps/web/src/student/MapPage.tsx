import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { MapModule } from '@contikids/shared';
import { Waddles } from '../components/ui';
import { useMap } from '../lib/queries';
import { LOCKED_COLOR, shadeOf, textOn } from './colors';
import { CheckIcon, LockIcon } from './icons';
import { QueryError } from './QueryState';

/**
 * El camino se dibuja en un viewBox de 300×780 y los nodos se colocan con % de esas mismas
 * medidas: todo escala junto con el ancho, así las 5 islas nunca se solapan (ni a 360 px).
 */
const VB = { w: 300, h: 780 };
const POINTS: ReadonlyArray<readonly [number, number]> = [
  [150, 80],
  [220, 230],
  [80, 380],
  [220, 530],
  [150, 680],
];

function pathThrough(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([x, y], i) => {
      const prev = points[i - 1];
      if (!prev) return `M ${x} ${y}`;
      const my = (prev[1] + y) / 2;
      return `C ${prev[0]} ${my}, ${x} ${my}, ${x} ${y}`;
    })
    .join(' ');
}

function statusLabel(m: MapModule): string {
  if (m.status === 'LOCKED') return 'cerrado';
  if (m.status === 'COMPLETED') return 'completado';
  return m.comingSoon ? 'abierto, próximamente' : 'abierto';
}

function Island({
  module: m,
  at,
  onTap,
}: {
  module: MapModule;
  at: readonly [number, number];
  onTap: (m: MapModule) => void;
}) {
  const locked = m.status === 'LOCKED';
  const color = locked ? LOCKED_COLOR : m.color;
  const ink = textOn(color);
  return (
    <button
      type="button"
      onClick={() => onTap(m)}
      aria-disabled={locked}
      aria-label={`Módulo ${m.order}: ${m.title}, ${statusLabel(m)}, ${m.percent} por ciento`}
      className="absolute flex w-[34%] -translate-x-1/2 -translate-y-[40%] flex-col items-center gap-1 text-center"
      style={{ left: `${(at[0] / VB.w) * 100}%`, top: `${(at[1] / VB.h) * 100}%` }}
    >
      {/* Rombo: un cuadrado redondeado girado 45° y el contenido enderezado. */}
      <span
        className="relative grid aspect-square w-[62%] place-items-center rounded-[22%] rotate-45 transition-[scale] duration-150 active:scale-95"
        style={{
          background: color,
          boxShadow: `0 6px 0 ${shadeOf(color)}`,
          color: ink,
          opacity: locked ? 0.9 : 1,
        }}
      >
        <span className="-rotate-45 font-display text-3xl font-extrabold">
          {locked ? <LockIcon width={30} height={30} /> : m.order}
        </span>
        {m.status === 'COMPLETED' && (
          <span className="absolute -top-2 -right-2 grid size-7 -rotate-45 place-items-center rounded-full bg-green text-white shadow-[0_2px_0_var(--color-green-shadow)]">
            <CheckIcon width={16} height={16} />
          </span>
        )}
      </span>
      <span className="mt-3 flex flex-col items-center leading-tight">
        <span className="font-display text-sm font-extrabold text-ink">{m.title}</span>
        {m.comingSoon && !locked ? (
          <span className="mt-0.5 rounded-full bg-card px-2 py-0.5 text-xs text-muted">
            Próximamente
          </span>
        ) : (
          !locked && m.percent > 0 && <span className="text-xs text-muted">{m.percent}% listo</span>
        )}
      </span>
    </button>
  );
}

/** /mapa — camino vertical con las 5 islas. Tocar una abierta la "acerca" (zoom) a sus submódulos. */
export function MapPage() {
  const map = useMap();
  const navigate = useNavigate();
  const [hint, setHint] = useState('');

  if (map.isPending) return <p className="py-10 text-center text-muted">Cargando tu mapa…</p>;
  if (map.isError) return <QueryError onRetry={() => void map.refetch()} />;

  const modules = map.data.modules;
  if (modules.length === 0) {
    return <Waddles>¡Todavía no hay islas en tu mapa! Pídele ayuda a tu profe.</Waddles>;
  }

  const tap = (m: MapModule) => {
    if (m.status === 'LOCKED') {
      setHint(`¡Casi! Primero termina la isla anterior para abrir "${m.title}".`);
      return;
    }
    setHint('');
    void navigate(`/mapa/${m.code.toLowerCase()}`);
  };

  return (
    <>
      <h1 className="text-center text-2xl">Tu mapa de aventura</h1>
      {hint && <Waddles mood="oops">{hint}</Waddles>}
      <div
        className="relative mx-auto w-full max-w-sm"
        style={{ aspectRatio: `${VB.w} / ${VB.h}` }}
      >
        <svg
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={pathThrough(POINTS.slice(0, modules.length))}
            fill="none"
            stroke="white"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="1 16"
            opacity="0.95"
          />
        </svg>
        {modules.map((m, i) => {
          const at = POINTS[i];
          return at ? <Island key={m.id} module={m} at={at} onTap={tap} /> : null;
        })}
      </div>
    </>
  );
}
