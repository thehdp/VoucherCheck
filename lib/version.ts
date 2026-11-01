/**
 * Versión del lector. Se actualiza en cada cambio que llega a producción,
 * junto con una entrada nueva ARRIBA en CHANGELOG.md (un test lo verifica).
 */
export const VERSION = "1.1";
export const FECHA_VERSION = "2026-11-01"; // AAAA-MM-DD

export function fechaVersionAr(): string {
  const [a, m, d] = FECHA_VERSION.split("-");
  return `${d}/${m}/${a}`;
}

export function etiquetaVersion(): string {
  return `V${VERSION} · ${fechaVersionAr()}`;
}
