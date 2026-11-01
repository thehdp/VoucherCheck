import { textoDeImagen } from "@/lib/extraer/ocr";
import { textoDePdf } from "@/lib/extraer/pdf";
import { leerTexto } from "@/lib/leer";
import { registrarLectura } from "@/lib/registro";
import type { Lectura } from "@/lib/tipos";

export const MAX_BYTES = 4 * 1024 * 1024;

export type Resultado =
  | { ok: true; lectura: Lectura }
  | { ok: false; status: number; error: string; mensaje: string };

function fallo(status: number, error: string, mensaje: string): Resultado {
  return { ok: false, status, error, mensaje };
}

/** Archivo → lectura (PDF con unpdf, imagen con sharp + tesseract) + registro en Neon. Lo usan la API y la web. */
export async function procesarArchivo(archivo: unknown, app: string): Promise<Resultado> {
  if (!(archivo instanceof File)) return fallo(400, "archivo_faltante", "Falta el campo 'archivo'");
  if (archivo.size > MAX_BYTES) return fallo(413, "archivo_muy_grande", "El archivo supera los 4 MB");

  const buf = new Uint8Array(await archivo.arrayBuffer());
  const esPdf = archivo.type === "application/pdf" || (buf[0] === 0x25 && buf[1] === 0x50); // %P
  const esImagen =
    (buf[0] === 0xff && buf[1] === 0xd8) || // JPG
    (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) || // PNG
    (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57); // WEBP
  if (!esPdf && !esImagen) return fallo(415, "formato_no_soportado", "Solo se leen PDF, JPG, PNG o WEBP");

  const texto = esPdf ? await textoDePdf(buf) : await textoDeImagen(buf);
  const lectura = leerTexto(texto);
  // Sin datos personales en logs: solo la app y el estado.
  console.log(JSON.stringify({ app, estado: lectura.estado, banco: lectura.banco_emisor }));
  await registrarLectura(app, esPdf ? "pdf" : "imagen", lectura, texto);
  return { ok: true, lectura };
}
