import { formatBs } from '@contikids/shared';
import { useCallback, useEffect, useState } from 'react';

/** Página de prueba de la Fase 0: tokens, botón de juego y estado de la API. */

const PALETTE = [
  { name: 'ink', hex: '#061859', className: 'bg-ink' },
  { name: 'teal', hex: '#2e9ca3', className: 'bg-teal' },
  { name: 'blue', hex: '#3e6aa8', className: 'bg-blue' },
  { name: 'red', hex: '#ff5757', className: 'bg-red' },
  { name: 'green', hex: '#7ed957', className: 'bg-green' },
  { name: 'yellow', hex: '#ecc911', className: 'bg-yellow' },
  { name: 'purple', hex: '#812ea3', className: 'bg-purple' },
  { name: 'gold', hex: '#d58a24', className: 'bg-gold' },
] as const;

const WORDMARK = [
  { letter: 'K', color: 'text-[#ec1125]' },
  { letter: 'I', color: 'text-yellow' },
  { letter: 'D', color: 'text-teal' },
  { letter: 'S', color: 'text-purple' },
];

interface Health {
  status: string;
  db: string;
  timestamp: string;
}

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: Health }
  | { kind: 'error'; message: string; data?: Health };

function useHealth() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/v1/health', { signal });
      const body = (await res.json().catch(() => null)) as Health | null;
      if (res.ok && body) setState({ kind: 'ok', data: body });
      else setState({ kind: 'error', message: `HTTP ${res.status}`, data: body ?? undefined });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setState({ kind: 'error', message: 'No se pudo conectar con la API' });
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { state, reload: () => void load() };
}

export function Status() {
  const { state, reload } = useHealth();

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6">
      <header className="card-game text-center">
        <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-ink">CONTI</span>
          {WORDMARK.map(({ letter, color }) => (
            <span key={letter} className={color}>
              {letter}
            </span>
          ))}
        </p>
        <p className="font-display font-extrabold text-gold">Aventura financiera</p>
        <p className="mt-2 text-sm text-muted">Estado del sistema · página técnica</p>
      </header>

      <section className="card-game" aria-labelledby="paleta">
        <h2 id="paleta" className="mb-3 text-lg">
          Paleta (§5)
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PALETTE.map((c) => (
            <li key={c.name} className="flex items-center gap-2 min-w-0">
              <span className={`size-10 shrink-0 rounded-xl ${c.className}`} aria-hidden="true" />
              <span className="min-w-0 text-sm leading-tight">
                <b className="block font-display">{c.name}</b>
                <code className="text-muted">{c.hex}</code>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-game" aria-labelledby="botones">
        <h2 id="botones" className="mb-3 text-lg">
          Botones de juego
        </h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-game" onClick={reload}>
            Revisar API
          </button>
          <button type="button" className="btn-game btn-game--blue">
            Acción
          </button>
          <button type="button" className="btn-game btn-game--red">
            Salir
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Montos con <code>formatBs</code>: {formatBs(80)} · {formatBs(1250)} · {formatBs(500)}
        </p>
      </section>

      <section className="card-game" aria-labelledby="salud" aria-live="polite">
        <h2 id="salud" className="mb-3 text-lg">
          Estado de la API · <code className="text-base">/api/v1/health</code>
        </h2>
        {state.kind === 'loading' && <p className="text-muted">Consultando…</p>}
        {state.kind === 'ok' && (
          <p>
            <span className="rounded-full bg-green px-3 py-1 font-display text-sm text-ink">
              API {state.data.status}
            </span>{' '}
            <span className="rounded-full bg-teal px-3 py-1 font-display text-sm text-white">
              BD {state.data.db}
            </span>
            <span className="mt-2 block text-sm text-muted">{state.data.timestamp}</span>
          </p>
        )}
        {state.kind === 'error' && (
          <p>
            <span className="rounded-full bg-red px-3 py-1 font-display text-sm text-white">
              {state.message}
            </span>
            {state.data && (
              <span className="mt-2 block text-sm text-muted">BD: {state.data.db}</span>
            )}
          </p>
        )}
      </section>
    </main>
  );
}
