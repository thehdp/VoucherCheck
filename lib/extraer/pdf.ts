import { extractText, getDocumentProxy } from "unpdf";

/** Texto directo del PDF (sin OCR). Un PDF escaneado devuelve texto vacío. */
export async function textoDePdf(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
