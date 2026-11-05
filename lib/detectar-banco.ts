import firmas from "@/bancos/firmas.json";

interface Firma {
  banco: string; // clave del parser en /bancos
  /** Alcanza con que aparezca UNA de estas frases. */
  frases?: string[];
  /** O bien tienen que aparecer TODAS estas (para firmas genéricas que solas confundirían a otros bancos). */
  todas?: string[];
}

const FIRMAS = (firmas as { bancos: Firma[] }).bancos;

export function sinTildes(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Devuelve la clave del banco emisor, o null si ninguna firma coincide. */
export function detectarBanco(texto: string, lista: Firma[] = FIRMAS): string | null {
  const t = sinTildes(texto);
  for (const f of lista) {
    const hay = (fr: string) => t.includes(sinTildes(fr));
    if (f.frases?.some(hay) || (f.todas?.length && f.todas.every(hay))) return f.banco;
  }
  return null;
}
