import { validarClave } from "@/lib/auth";
import { procesarArchivo } from "@/lib/procesar";

export const runtime = "nodejs";
export const maxDuration = 60;

function error(status: number, codigo: string, mensaje: string) {
  return Response.json({ ok: false, error: codigo, mensaje }, { status });
}

export async function POST(req: Request) {
  const app = validarClave(req.headers.get("x-api-key"));
  if (!app) return error(401, "clave_invalida", "La API key no es válida");
  try {
    const form = await req.formData().catch(() => null);
    const r = await procesarArchivo(form?.get("archivo"), app);
    return r.ok ? Response.json(r.lectura) : error(r.status, r.error, r.mensaje);
  } catch {
    return error(500, "error_interno", "Error interno al leer el comprobante");
  }
}
