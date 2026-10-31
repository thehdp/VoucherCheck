import { validarClave } from "@/lib/auth";
import { textoDeImagen } from "@/lib/extraer/ocr";
import { textoDePdf } from "@/lib/extraer/pdf";
import { leerTexto } from "@/lib/leer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

function error(status: number, codigo: string, mensaje: string) {
  return Response.json({ ok: false, error: codigo, mensaje }, { status });
}

export async function POST(req: Request) {
  const app = validarClave(req.headers.get("x-api-key"));
  if (!app) return error(401, "clave_invalida", "La API key no es válida");

  try {
    const form = await req.formData().catch(() => null);
    if (!form) return error(400, "archivo_faltante", "Falta el campo 'archivo'");
    const archivo = form.get("archivo");
    if (!(archivo instanceof File)) return error(400, "archivo_faltante", "Falta el campo 'archivo'");
    if (archivo.size > MAX_BYTES) return error(413, "archivo_muy_grande", "El archivo supera los 4 MB");

    const buf = new Uint8Array(await archivo.arrayBuffer());
    const esPdf = archivo.type === "application/pdf" || (buf[0] === 0x25 && buf[1] === 0x50); // %P
    const esImagen =
      (buf[0] === 0xff && buf[1] === 0xd8) || // JPG
      (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) || // PNG
      (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57); // WEBP (RIFF....WEBP)
    if (!esPdf && !esImagen) {
      return error(415, "formato_no_soportado", "Solo se leen PDF, JPG, PNG o WEBP");
    }
    const texto = esPdf ? await textoDePdf(buf) : await textoDeImagen(buf);
    // Sin datos personales en logs: solo la app y el estado.
    const resultado = leerTexto(texto);
    console.log(JSON.stringify({ app, estado: resultado.estado, banco: resultado.banco_emisor }));
    return Response.json(resultado);
  } catch {
    return error(500, "error_interno", "Error interno al leer el comprobante");
  }
}
