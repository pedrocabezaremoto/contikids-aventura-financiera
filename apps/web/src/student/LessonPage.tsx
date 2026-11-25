import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { LessonCompletion, LessonDetail } from '@contikids/shared';
import confetti from 'canvas-confetti';
import { ErrorText, Waddles } from '../components/ui';
import { api } from '../lib/api';
import { mapKey, useModuleDetail } from '../lib/queries';
import { Diagram } from './Diagram';
import { lessonSteps } from './lesson-steps';
import { QueryError } from './QueryState';

function ReturnLink() {
  return (
    <Link to="/mapa/m1" className="btn-game btn-game--blue min-h-[56px] self-center">
      Volver a M1
    </Link>
  );
}

function Celebration({ xpAwarded }: LessonCompletion) {
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void confetti({ particleCount: 60, spread: 75, disableForReducedMotion: true });
    }
    return () => {
      confetti.reset();
    };
  }, []);
  return (
    <>
      <h1 className="text-center text-2xl">
        {xpAwarded ? '¡Lección completada!' : '¡Repaso completado!'}
      </h1>
      <Waddles>
        {xpAwarded
          ? `¡Ganaste +${xpAwarded} XP! Ya puedes ver el Quiz abierto en M1.`
          : 'Ya tenías los XP de esta lección. Este repaso suma 0 XP.'}
      </Waddles>
      <ReturnLink />
    </>
  );
}

function LessonReader({ lesson }: { lesson: LessonDetail }) {
  const [index, setIndex] = useState(0);
  const [started] = useState(Date.now);
  const cache = useQueryClient();
  const completion = useMutation({
    mutationFn: () =>
      api<LessonCompletion>(`/lessons/${lesson.id}/complete`, {
        method: 'POST',
        body: { timeSecs: Math.max(0, Math.floor((Date.now() - started) / 1000)) },
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: mapKey });
      void cache.invalidateQueries({ queryKey: ['modules'] });
    },
  });
  const steps = lessonSteps(lesson.blocks);
  const step = steps[index];
  if (completion.data) return <Celebration {...completion.data} />;
  if (!step)
    return (
      <>
        <Waddles>Esta lección todavía no tiene pasos.</Waddles>
        <ReturnLink />
      </>
    );
  const { visual, paragraphs } = step;
  const last = index === steps.length - 1;
  return (
    <>
      <h1 className="text-2xl leading-tight">{lesson.title}</h1>
      <div className="flex flex-col gap-1">
        <span aria-live="polite" className="font-display text-sm font-extrabold">
          Paso {index + 1} de {steps.length}
        </span>
        <progress
          aria-label="Pasos de la lección"
          className="h-3 w-full accent-teal-shadow"
          value={index + 1}
          max={steps.length}
        />
      </div>
      {visual?.kind === 'diagram' && <Diagram text={visual.text!} />}
      {visual?.kind === 'image' && (
        <img
          className="card-game mx-auto max-h-48 max-w-full object-contain"
          src={visual.assetPath!}
          alt={visual.text ?? 'Ilustración de la lección'}
        />
      )}
      <Waddles>
        {step.tip && <strong className="mb-1 block">Consejo de Waddles</strong>}
        {paragraphs.length
          ? paragraphs.map((p, i) => (
              <span key={i} className="block [overflow-wrap:anywhere]">
                {p}
              </span>
            ))
          : 'Observa la ilustración antes de continuar.'}
      </Waddles>
      {completion.isError && (
        <ErrorText>No pude guardar tu lección. Toca «Completar» para reintentar.</ErrorText>
      )}
      <div className="grid grid-cols-2 gap-3">
        {index === 0 ? (
          <Link to="/mapa/m1" className="btn-game btn-game--blue h-[56px] min-h-[56px] px-2">
            Atrás
          </Link>
        ) : (
          <button
            disabled={completion.isPending}
            className="btn-game btn-game--blue h-[56px] min-h-[56px] px-2"
            onClick={() => setIndex(index - 1)}
          >
            Atrás
          </button>
        )}
        <button
          className="btn-game h-[56px] min-h-[56px] px-2 disabled:opacity-70"
          disabled={completion.isPending}
          onClick={() => (last ? completion.mutate() : setIndex(index + 1))}
        >
          {completion.isPending ? 'Guardando…' : last ? 'Completar' : 'Siguiente'}
        </button>
      </div>
    </>
  );
}

export function LessonPage() {
  const module = useModuleDetail('m1');
  const id = module.data?.submodules.find((s) => s.type === 'LESSON')?.refId;
  const lesson = useQuery({
    queryKey: ['lessons', id],
    enabled: id != null,
    queryFn: () => api<LessonDetail>(`/lessons/${id}`),
  });
  if (module.isError || lesson.isError)
    return (
      <>
        <QueryError onRetry={() => void (module.isError ? module.refetch() : lesson.refetch())} />
        <ReturnLink />
      </>
    );
  if (module.isSuccess && id == null)
    return (
      <>
        <Waddles>La lección de M1 está en preparación.</Waddles>
        <ReturnLink />
      </>
    );
  if (!lesson.data)
    return (
      <p role="status" className="py-8 text-center">
        Cargando la lección…
      </p>
    );
  return <LessonReader key={lesson.data.id} lesson={lesson.data} />;
}
