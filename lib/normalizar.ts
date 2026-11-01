const MESES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, set: 9, sept: 9, septiembre: 9, setiembre: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

/**
 * Convierte un monto argentino a número.
 * "$ 15.000,50" → 15000.5 · "15,000.50" → 15000.5 · "15000.50" → 15000.5
 * Devuelve null si no se puede interpretar (no adivina).
 */
export function normalizarMonto(crudo: string | null | undefined): number | null {
  if (!crudo) return null;
  let s = crudo.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const negativo = s.startsWith("-");
  s = s.replace(/-/g, "");
  const ultPunto = s.lastIndexOf(".");
  const ultComa = s.lastIndexOf(",");
  let decimal: "." | "," | null = null;
  if (ultPunto >= 0 && ultComa >= 0) {
    decimal = ultPunto > ultComa ? "." : ",";
  } else if (ultComa >= 0) {
    // "1,5" / "15000,50" es decimal; "1,500" con exactamente 3 dígitos y una sola coma es miles
    const despues = s.length - ultComa - 1;
    decimal = despues === 3 || s.indexOf(",") !== ultComa ? null : ",";
  } else if (ultPunto >= 0) {
    const despues = s.length - ultPunto - 1;
    // "15.000" es miles; "15000.50" o "15.5" es decimal
    decimal = despues === 3 || s.indexOf(".") !== ultPunto ? null : ".";
  }
  let entero = s;
  let frac = "";
  if (decimal) {
    const i = s.lastIndexOf(decimal);
    entero = s.slice(0, i);
    frac = s.slice(i + 1);
  }
  entero = entero.replace(/[.,]/g, "");
  const n = Number(frac ? `${entero}.${frac}` : entero);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** "30/10/2026", "30-10-26", "30 oct 2026", "30 de octubre de 2026" → "2026-10-30". */
export function normalizarFecha(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  // "30/octubre/2026" → "30 octubre 2026"
  // "30/octubre/2026" → "30 octubre 2026"; el OCR lee a veces "0CT" por "OCT" (0→o dentro del mes)
  const t = crudo
    .toLowerCase()
    .trim()
    .replace(/(\d)[/-]([a-záéíóú0]{3,})[/-](\d)/, (_m, a, mes: string, b) => `${a} ${mes.replace(/0/g, "o")} ${b}`);
  let d: number, m: number, a: number;
  let r = t.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/);
  if (r) {
    d = +r[1]; m = +r[2]; a = +r[3];
  } else {
    r = t.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\.?\s+(?:de\s+)?(\d{4}|\d{2})\b/);
    if (!r) return null;
    const mes = MESES[r[2].normalize("NFD").replace(/[̀-ͯ]/g, "")];
    if (!mes) return null;
    d = +r[1]; m = mes; a = +r[3];
  }
  if (a < 100) a += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCMonth() !== m - 1) return null; // ej: 31/02
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "14:32", "14:32:10", "2:32 PM" → "14:32". */
export function normalizarHora(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  const r = crudo.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?/i);
  if (!r) return null;
  let h = +r[1];
  const min = +r[2];
  if (r[3]) {
    const pm = r[3].toLowerCase() === "p";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Deja solo los 11 dígitos del CUIT/CUIL; null si no da 11. */
export function normalizarCuit(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  const d = corregirNumerico(crudo).replace(/\D/g, "");
  return d.length === 11 ? d : null;
}

/**
 * Corrige confusiones típicas de OCR (O→0, l/I→1, S→5, B→8).
 * Usar SOLO en campos que deben ser numéricos.
 */
export function corregirNumerico(s: string): string {
  return s.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").replace(/S/g, "5").replace(/B/g, "8");
}

export function limpiarEspacios(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t || null;
}

/**
 * Saca un CBU/CVU de 22 dígitos de un texto de OCR: acepta O/l/I/S/B donde va un dígito
 * (solo dentro de un bloque de 22 caracteres) y los corrige. Devuelve null si no hay.
 */
export function cbuDeOcr(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const m = texto.match(/(?<![0-9A-Za-z])[0-9OoIlSB]{22}(?![0-9A-Za-z])/);
  return m ? corregirNumerico(m[0]) : null;
}

/** Quita basura de OCR al inicio de un nombre (íconos leídos como "<S", "»=", etc.). */
export function limpiarNombre(s: string | null | undefined): string | null {
  const t = limpiarEspacios(s);
  if (!t) return null;
  const tokens = t.split(" ");
  while (tokens.length > 1 && (!/\p{L}/u.test(tokens[0]) || (tokens[0].length <= 2 && /[^\p{L}]/u.test(tokens[0])))) {
    tokens.shift();
  }
  return tokens.join(" ");
}
