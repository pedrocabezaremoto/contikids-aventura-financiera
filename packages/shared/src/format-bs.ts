/**
 * Formatea un monto en bolívares con el formato venezolano:
 * punto para los miles y coma para los decimales (siempre 2 decimales).
 *
 *   formatBs(1250)  → "Bs. 1.250,00"
 *   formatBs(80)    → "Bs. 80,00"
 *   formatBs(-20)   → "-Bs. 20,00"
 *
 * No usa Intl a propósito: los locales "es" no agrupan números de 4 cifras
 * ("1250,00") y queremos "1.250,00" siempre.
 */
export function formatBs(monto: number | string): string {
  const valor = typeof monto === 'string' ? Number(monto) : monto;
  if (!Number.isFinite(valor)) {
    throw new RangeError(`formatBs: monto inválido (${String(monto)})`);
  }

  // Redondeo a céntimos; EPSILON evita errores como 1.005 → 1.00
  const centimos = Math.round((Math.abs(valor) + Number.EPSILON) * 100);
  const entero = Math.floor(centimos / 100).toString();
  const decimales = (centimos % 100).toString().padStart(2, '0');
  const enteroConPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const signo = valor < 0 && centimos > 0 ? '-' : '';
  return `${signo}Bs. ${enteroConPuntos},${decimales}`;
}
