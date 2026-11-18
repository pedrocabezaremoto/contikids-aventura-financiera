import { useEffect } from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;
export const PIN_LENGTH = 4;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (pin: string) => void;
  disabled?: boolean;
}

/** Teclado numérico grande propio (no abre el teclado del sistema). Teclas ≥ 64 px. */
export function PinPad({ value, onChange, onSubmit, disabled = false }: Props) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'del') return onChange(value.slice(0, -1));
    if (key === 'ok') return value.length === PIN_LENGTH && onSubmit(value);
    if (value.length < PIN_LENGTH) {
      const next = value + key;
      onChange(next);
      if (next.length === PIN_LENGTH) onSubmit(next);
    }
  };

  // También funciona con el teclado físico (PC).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('ok');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid gap-5">
      <div
        className="flex justify-center gap-4"
        aria-label={`${value.length} de ${PIN_LENGTH} números`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`size-6 rounded-full border-4 border-ink transition-colors ${i < value.length ? 'bg-ink' : 'bg-card'}`}
          />
        ))}
      </div>
      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled || (k === 'ok' && value.length < PIN_LENGTH)}
            onClick={() => press(k)}
            aria-label={k === 'del' ? 'Borrar' : k === 'ok' ? 'Entrar' : k}
            className={`h-16 rounded-2xl font-display text-2xl font-extrabold transition-[translate,box-shadow] active:translate-y-[3px] disabled:opacity-40 ${
              k === 'ok'
                ? 'bg-teal text-white shadow-[0_4px_0_var(--color-teal-shadow)]'
                : 'bg-[#cfe0fb] text-ink shadow-[0_4px_0_#9db8e6]'
            }`}
          >
            {k === 'del' ? '⌫' : k === 'ok' ? '✓' : k}
          </button>
        ))}
      </div>
    </div>
  );
}
