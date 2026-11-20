/** Color de texto legible (tinta o blanco) sobre un fondo hex. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.4 ? '#061859' : '#ffffff';
}

/** Sombra sólida: el mismo color, más oscuro. */
export const shadeOf = (hex: string) => `color-mix(in srgb, ${hex} 68%, black)`;

/** Color de una isla cerrada. */
export const LOCKED_COLOR = '#aab6cf';
