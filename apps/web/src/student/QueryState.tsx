import { Waddles } from '../components/ui';

/** Estado de error de una consulta: mensaje amable + reintentar. */
export function QueryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Waddles mood="oops">
        ¡Ups! No pude traer tus datos. Revisa tu conexión e inténtalo otra vez.
      </Waddles>
      <button type="button" className="btn-game btn-game--blue self-center" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
