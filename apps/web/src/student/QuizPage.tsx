import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  GAME_RULES,
  type QuizDetail,
  type QuizFeedback,
  type QuizQuestion,
  type QuizResult,
} from '@contikids/shared';
import { ErrorText, Waddles } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { mapKey, useModuleDetail } from '../lib/queries';
import { Diagram } from './Diagram';
import { CoinIcon, StarIcon, XpIcon } from './icons';
import { QueryError } from './QueryState';
import { shuffleOptions } from './quiz-options';

function ReturnLink() {
  return (
    <Link className="btn-game btn-game--blue self-center" to="/mapa/m1">
      Volver a M1
    </Link>
  );
}

function Result({ result }: { result: QuizResult }) {
  return (
    <>
      <h1 className="text-center text-2xl">¡Quiz completado!</h1>
      <div className="card-game flex flex-col items-center gap-3 text-center">
        <p className="font-display font-extrabold">Estrellas de esfuerzo</p>
        <span
          className="flex gap-2"
          role="img"
          aria-label={`${result.stars} de ${GAME_RULES.stars.max} estrellas`}
        >
          {Array.from({ length: GAME_RULES.stars.max }, (_, i) => (
            <StarIcon key={i} filled={i < result.stars} width={42} height={42} />
          ))}
        </span>
        <p>Puntaje: {result.score} %</p>
        <div className="flex flex-wrap justify-center gap-4">
          <span className="inline-flex items-center gap-1">
            <CoinIcon /> +{result.coinsAwarded} {result.coinsAwarded === 1 ? 'moneda' : 'monedas'}
          </span>
          <span className="inline-flex items-center gap-1">
            <XpIcon /> +{result.xpAwarded} XP
          </span>
        </div>
      </div>
      <Waddles>¡Buen trabajo! Ya puedes ver la Prueba abierta en M1.</Waddles>
      <ReturnLink />
    </>
  );
}

type Submission = { optionId: number; expectedTry: number; timeSeconds: number };

function QuestionPanel({
  question,
  number,
  count,
  onAnswer,
  onNext,
  finishing,
  finishError,
}: {
  question: QuizQuestion;
  number: number;
  count: number;
  onAnswer: (body: Submission) => Promise<QuizFeedback>;
  onNext: () => void;
  finishing: boolean;
  finishError: boolean;
}) {
  const [options] = useState(() => shuffleOptions(question.options));
  const [selected, setSelected] = useState<number>();
  const [feedback, setFeedback] = useState<QuizFeedback>();
  const started = useRef(Date.now());
  const answer = useMutation({
    mutationFn: onAnswer,
    onSuccess(data) {
      setFeedback(data);
      if (!data.questionDone) {
        started.current = Date.now();
        setSelected(undefined);
      }
    },
  });
  const done = feedback?.questionDone;
  const correctText = options.find((o) => o.id === feedback?.correctOptionId)?.text;
  function submit() {
    if (answer.isError && answer.variables) return answer.mutate(answer.variables);
    if (selected !== undefined)
      answer.mutate({
        optionId: selected,
        expectedTry: (feedback?.tryNumber ?? 0) + 1,
        timeSeconds: Math.max(0, Math.floor((Date.now() - started.current) / 1000)),
      });
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <p aria-live="polite" className="font-display text-sm font-extrabold">
          Pregunta {number} de {count}
        </p>
        <progress
          aria-label="Preguntas del Quiz"
          className="h-3 w-full accent-teal-shadow"
          value={number}
          max={count}
        />
      </div>
      <h2 className="text-xl leading-tight">{question.prompt}</h2>
      {(feedback?.result ?? question.visual) && (
        <Diagram text={(feedback?.result ?? question.visual)!} label="Diagrama del Quiz" />
      )}
      {question.kind !== 'single_choice' || !options.length ? (
        <>
          <Waddles>Esta pregunta está en preparación.</Waddles>
          <ReturnLink />
        </>
      ) : (
        <>
          <div role="group" aria-label="Opciones" className="grid grid-cols-1 gap-3">
            {options.map((option, i) => {
              const highlighted = done
                ? option.id === feedback.correctOptionId
                : option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected === option.id}
                  disabled={done || answer.isPending || answer.isError}
                  onClick={() => setSelected(option.id)}
                  className={`card-game flex min-h-[56px] items-center gap-3 border-2 px-4 py-2 text-left ${highlighted ? 'border-teal-shadow bg-sky-b' : 'border-transparent'}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-b font-display text-sm">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option.text}
                </button>
              );
            })}
          </div>
          {feedback && (
            <div key={feedback.tryNumber} className={feedback.correct ? 'animate-zoom-in' : ''}>
              <Waddles>
                <strong className="block">
                  {feedback.correct
                    ? '¡Lo lograste!'
                    : done
                      ? 'Aprendamos juntos'
                      : 'Una pista de Waddles'}
                </strong>
                {done && !feedback.correct && correctText && (
                  <span className="block">La respuesta es «{correctText}».</span>
                )}
                {done ? feedback.explanation : feedback.hint}
              </Waddles>
            </div>
          )}
          {(answer.isError || finishError) && (
            <ErrorText>No pude confirmar el envío. Toca «Reintentar» para continuar.</ErrorText>
          )}
          {done ? (
            <button type="button" className="btn-game" onClick={onNext} disabled={finishing}>
              {finishing
                ? 'Guardando…'
                : finishError
                  ? 'Reintentar'
                  : number === count
                    ? 'Ver resultado'
                    : 'Siguiente'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-game disabled:opacity-60"
              onClick={submit}
              disabled={answer.isPending || selected === undefined}
            >
              {answer.isPending
                ? 'Comprobando…'
                : answer.isError
                  ? 'Reintentar'
                  : 'Comprobar respuesta'}
            </button>
          )}
        </>
      )}
    </>
  );
}

function QuizPlayer({ quiz }: { quiz: QuizDetail }) {
  const [index, setIndex] = useState(0);
  const attempt = useRef<number | null>(null);
  const cache = useQueryClient();
  const finish = useMutation({
    mutationFn: () => api<QuizResult>(`/attempts/${attempt.current}/finish`, { method: 'POST' }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: mapKey });
      void cache.invalidateQueries({ queryKey: ['modules'] });
    },
  });
  if (finish.data) return <Result result={finish.data} />;
  const question = quiz.questions[index];
  if (!question)
    return (
      <>
        <Waddles>Este Quiz todavía no tiene preguntas.</Waddles>
        <ReturnLink />
      </>
    );
  async function sendAnswer(body: Submission) {
    if (attempt.current === null) {
      const created = await api<{ id: number }>(`/quizzes/${quiz.id}/attempts`, { method: 'POST' });
      attempt.current = created.id;
    }
    return api<QuizFeedback>(`/attempts/${attempt.current}/answers`, {
      method: 'POST',
      body: { questionId: question!.id, ...body },
    });
  }
  return (
    <>
      <h1 className="text-2xl leading-tight">{quiz.title}</h1>
      <QuestionPanel
        key={question.id}
        question={question}
        number={index + 1}
        count={quiz.questions.length}
        onAnswer={sendAnswer}
        finishing={finish.isPending}
        finishError={finish.isError}
        onNext={() => {
          if (index + 1 === quiz.questions.length) finish.mutate();
          else {
            setIndex(index + 1);
            window.scrollTo(0, 0);
          }
        }}
      />
    </>
  );
}

export function QuizPage() {
  const detail = useModuleDetail('m1');
  const sub = detail.data?.submodules.find((s) => s.type === 'QUIZ');
  const id = sub?.refId;
  const locked = sub?.status === 'LOCKED';
  const quiz = useQuery({
    queryKey: ['quizzes', id],
    enabled: id != null && !locked,
    queryFn: () => api<QuizDetail>(`/quizzes/${id}`),
  });
  if (locked || (quiz.error instanceof ApiError && quiz.error.status === 403))
    return (
      <>
        <Waddles>Completa la lección de M1 para abrir el Quiz.</Waddles>
        <ReturnLink />
      </>
    );
  if (detail.isError || quiz.isError)
    return (
      <>
        <QueryError onRetry={() => void (detail.isError ? detail.refetch() : quiz.refetch())} />
        <ReturnLink />
      </>
    );
  if (detail.isSuccess && id == null)
    return (
      <>
        <Waddles>El Quiz de M1 está en preparación.</Waddles>
        <ReturnLink />
      </>
    );
  if (!quiz.data)
    return (
      <p role="status" className="py-8 text-center">
        Cargando el Quiz…
      </p>
    );
  return <QuizPlayer key={quiz.data.id} quiz={quiz.data} />;
}
