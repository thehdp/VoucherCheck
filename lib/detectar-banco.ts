import firmas from "@/bancos/firmas.json";

interface Firma {
  banco: string; // clave del parser en /bancos
  frases: string[];
}

const FIRMAS = (firmas as { bancos: Firma[] }).bancos;

export function sinTildes(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Devuelve la clave del banco emisor, o null si ninguna firma coincide. */
export function detectarBanco(texto: string, lista: Firma[] = FIRMAS): string | null {
  const t = sinTildes(texto);
  for (const f of lista) {
    if (f.frases.some((fr) => t.includes(sinTildes(fr)))) return f.banco;
  }
  return null;
}
