import path from "node:path";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

/**
 * Prepara la imagen para el OCR: escala de grises, agrandado (mínimo ~2000 px de ancho),
 * normalización de contraste y nitidez. Devuelve un PNG.
 */
export async function prepararImagen(buffer: Uint8Array): Promise<Buffer> {
  const img = sharp(buffer).rotate(); // respeta la orientación EXIF del celular
  const { width = 0 } = await img.metadata();
  const ancho = Math.min(Math.max(width * 2, 2000), 3200);
  return img
    .resize({ width: ancho, withoutEnlargement: false })
    .grayscale()
    .normalise()
    .sharpen()
    .png()
    .toBuffer();
}

interface Simbolo { text: string; bbox: { y0: number; y1: number } }
interface Palabra { text: string; symbols?: Simbolo[] }

/**
 * Corrige el "$" chico de los importes grandes que el OCR lee como un dígito ("$ 5.000" → "55.000").
 * Regla: en una palabra numérica con puntos de miles, si el primer carácter es un dígito claramente más bajo (menos del 75 %)
 * que la mediana de los demás dígitos, no es un dígito: es el símbolo "$". Devuelve la palabra corregida o null.
 */
export function corregirSignoPesos(p: Palabra, palabrasEnLinea = 1): string | null {
  const simbolos = p.symbols;
  // Solo importes con puntos de miles ("55.000") que están solos en su línea: así no toca números sueltos de fotos con perspectiva
  if (palabrasEnLinea !== 1 || !simbolos || simbolos.length < 5 || !/^\d{2,3}(\.\d{3})+$/.test(p.text)) return null;
  const altos = simbolos.slice(1).filter((x) => /\d/.test(x.text)).map((x) => x.bbox.y1 - x.bbox.y0).sort((a, b) => a - b);
  if (altos.length < 2) return null;
  const mediana = altos[Math.floor(altos.length / 2)];
  const primero = simbolos[0];
  if (!/\d/.test(primero.text) || primero.bbox.y1 - primero.bbox.y0 >= mediana * 0.75) return null;
  return "$" + p.text.slice(1);
}

/** OCR en el servidor con el idioma español incluido en el repo (/ocr), sin descargas externas. */
export async function textoDeImagen(buffer: Uint8Array, opciones: { segmentacionAutomatica?: boolean } = {}): Promise<string> {
  const png = await prepararImagen(buffer);
  const worker = await createWorker("spa", 1, {
    langPath: path.join(process.cwd(), "ocr"),
    gzip: false,
    cacheMethod: "none",
  });
  try {
    // Modo 3 = el motor detecta solo los bloques. Es la segunda pasada: a veces recupera textos grandes
    // (ej. el importe) que el modo por defecto saltea, pero cambia el orden del texto, así que no es el default.
    if (opciones.segmentacionAutomatica) await worker.setParameters({ tessedit_pageseg_mode: "3" as never });
    const { data } = await worker.recognize(png, {}, { blocks: true });
    let texto = data.text;
    const lineas = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((pa) => pa.lines));
    for (const l of lineas) {
      for (const w of l.words as Palabra[]) {
        const arreglada = corregirSignoPesos(w, l.words.length);
        if (arreglada) texto = texto.replace(l.text.trim(), l.text.trim().replace(w.text, arreglada));
      }
    }
    return texto;
  } finally {
    await worker.terminate();
  }
}
