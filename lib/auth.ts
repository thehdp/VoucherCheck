import { timingSafeEqual } from "node:crypto";

/** Devuelve el nombre de la app dueña de la clave, o null si no es válida. */
export function validarClave(clave: string | null, env = process.env.API_KEYS): string | null {
  if (!clave || !env) return null;
  let claves: Record<string, string>;
  try {
    claves = JSON.parse(env);
  } catch {
    return null;
  }
  const a = Buffer.from(clave);
  for (const [app, valor] of Object.entries(claves)) {
    const b = Buffer.from(String(valor));
    if (a.length === b.length && timingSafeEqual(a, b)) return app;
  }
  return null;
}
