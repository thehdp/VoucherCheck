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

/** OCR en el servidor con el idioma español incluido en el repo (/ocr), sin descargas externas. */
export async function textoDeImagen(buffer: Uint8Array): Promise<string> {
  const png = await prepararImagen(buffer);
  const worker = await createWorker("spa", 1, {
    langPath: path.join(process.cwd(), "ocr"),
    gzip: false,
    cacheMethod: "none",
  });
  try {
    const { data } = await worker.recognize(png);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
