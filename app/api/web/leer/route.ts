import { procesarArchivo } from "@/lib/procesar";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Lectura desde la web de carga (/cargar). Protegida por middleware (usuario y clave). */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const r = await procesarArchivo(form?.get("archivo"), "web");
    if (r.ok) return Response.json(r.lectura);
    return Response.json({ ok: false, error: r.error, mensaje: r.mensaje }, { status: r.status });
  } catch {
    return Response.json({ ok: false, error: "error_interno", mensaje: "Error interno al leer el comprobante" }, { status: 500 });
  }
}
