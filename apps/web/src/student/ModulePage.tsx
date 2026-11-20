import { Link, useParams } from 'react-router';
import type { MapSubmodule, ProgressStatus, SubmoduleType } from '@contikids/shared';
import { ApiError } from '../lib/api';
import { BackLink, Waddles } from '../components/ui';
import { useModuleDetail } from '../lib/queries';
import { LOCKED_COLOR, shadeOf, textOn } from './colors';
import { BookIcon, CheckIcon, LockIcon, QuizIcon, StarIcon, TrophyIcon } from './icons';
import { QueryError } from './QueryState';

const INFO: Record<SubmoduleType, { title: string; blurb: string; icon: typeof BookIcon }> = {
  LESSON: { title: 'Lección', blurb: 'Aprende paso a paso', icon: BookIcon },
  QUIZ: { title: 'Quiz', blurb: 'Practica con Waddles', icon: QuizIcon },
  EXAM: { title: 'Prueba', blurb: 'Demuestra lo aprendido', icon: TrophyIcon },
};

const STATUS_TEXT: Record<ProgressStatus, string> = {
  LOCKED: 'Cerrado',
  IN_PROGRESS: 'Abierto',
  COMPLETED: 'Completado',
};

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${n} de 3 estrellas`}>
      {[1, 2, 3].map((i) => (
        <StarIcon key={i} filled={i <= n} />
      ))}
    </span>
  );
}

function SubmoduleCard({ sub, color }: { sub: MapSubmodule; color: string }) {
  const { title, blurb, icon: Icon } = INFO[sub.type];
  const locked = sub.status === 'LOCKED';
  const soon = sub.refId === null; // el contenido todavía no existe en la BD
  const tone = locked ? LOCKED_COLOR : color;
  return (
    <li
      className="card-game flex items-center gap-3"
      aria-label={`${title}: ${soon ? 'próximamente' : STATUS_TEXT[sub.status].toLowerCase()}`}
      style={locked ? { opacity: 0.8 } : undefined}
    >
      <span
        className="grid size-14 shrink-0 place-items-center rounded-2xl"
        style={{ background: tone, color: textOn(tone), boxShadow: `0 4px 0 ${shadeOf(tone)}` }}
      >
        {locked ? <LockIcon /> : <Icon />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-lg font-extrabold">{title}</span>
        <span className="text-sm text-muted">{blurb}</span>
        {sub.status === 'COMPLETED' && sub.bestStars !== null && (
          <span className="mt-1 flex items-center gap-2 text-sm">
            <Stars n={sub.bestStars} />
            {sub.bestScore !== null && <span className="text-muted">{sub.bestScore}%</span>}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right text-xs font-extrabold">
        {soon ? (
          <span className="rounded-full bg-sky-b px-3 py-1 text-muted">Próximamente</span>
        ) : sub.status === 'COMPLETED' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1 text-white">
            <CheckIcon width={14} height={14} /> Listo
          </span>
        ) : locked ? (
          <span className="rounded-full bg-sky-b px-3 py-1 text-muted">Cerrado</span>
        ) : (
          // La pantalla de cada submódulo llega en la 2.2 (lección), 2.3 (quiz) y 2.4 (prueba).
          <span className="rounded-full bg-yellow px-3 py-1 text-ink">Abierto</span>
        )}
      </span>
    </li>
  );
}

/** /mapa/:code — "zoom" a una isla: sus 3 submódulos. */
export function ModulePage() {
  const { code } = useParams();
  const detail = useModuleDetail(code);

  if (detail.isPending) return <p className="py-10 text-center text-muted">Acercándonos…</p>;
  if (detail.isError) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    if (status === 403 || status === 404) {
      return (
        <>
          <BackLink to="/mapa">Mapa</BackLink>
          <Waddles mood="oops">
            {status === 403
              ? '¡Esta isla todavía está cerrada! Termina la anterior para abrirla.'
              : 'No encontré esa isla en tu mapa.'}
          </Waddles>
          <Link to="/mapa" className="btn-game self-center">
            Volver al mapa
          </Link>
        </>
      );
    }
    return (
      <>
        <BackLink to="/mapa">Mapa</BackLink>
        <QueryError onRetry={() => void detail.refetch()} />
      </>
    );
  }

  const { module: m, submodules } = detail.data;
  return (
    <div className="flex animate-zoom-in flex-col gap-4">
      <BackLink to="/mapa">Mapa</BackLink>
      <div className="flex items-center gap-4">
        <span
          className="grid size-20 shrink-0 place-items-center rounded-3xl font-display text-4xl font-extrabold"
          style={{
            background: m.color,
            color: textOn(m.color),
            boxShadow: `0 6px 0 ${shadeOf(m.color)}`,
          }}
          aria-hidden="true"
        >
          {m.order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Módulo {m.order}</p>
          <h1 className="text-2xl leading-tight">{m.title}</h1>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-card"
            role="progressbar"
            aria-valuenow={m.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance del módulo"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${m.percent}%`, background: m.color }}
            />
          </div>
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {submodules.map((s) => (
          <SubmoduleCard key={s.type} sub={s} color={m.color} />
        ))}
      </ol>
      {m.comingSoon && (
        <Waddles>¡Esta isla está en construcción! Muy pronto tendrá más aventuras.</Waddles>
      )}
    </div>
  );
}
