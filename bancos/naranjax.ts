import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, limpiarNombre, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/** Quita el texto del ícono que el OCR pega al nombre ("NX Alberto…", "LA Castell…"). */
function nombreSinIcono(s: string | undefined): string | null {
  const n = limpiarNombre(s);
  return n ? limpiarEspacios(n.replace(/^[A-ZÁÉÍÓÚÑ]{1,2}\s+(?=\p{L}{3,})/u, "")) : null;
}

/**
 * Naranja X (captura). nro_operacion = "Código de transacción" (el "COELSA ID" no se usa nunca).
 *
 * MONTO: el importe grande lleva un "$" chico que el OCR confundía con un dígito ("$ 5.000" → "55.000").
 * lib/extraer/ocr.ts lo corrige por tamaño y deja "$5.000" en el texto. Los centavos salen aparte ("00").
 * Si el texto no trae el "$" del importe, NO se adivina: monto null y advertencia.
 */
export const naranjax: Parser = {
  nombre: "Naranja X",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const idx = (re: RegExp) => lineas.findIndex((l) => re.test(l));
    const iOrigen = idx(/^Cuenta origen/i);
    const iDestino = idx(/^Cuenta destino/i);
    const iInfo = idx(/^Informaci[oó]n de la operaci[oó]n/i);
    const cuenta = (desde: number, hasta: number) => {
      if (desde < 0) return null;
      const b = lineas.slice(desde + 1, hasta < 0 ? undefined : hasta);
      const cuit = normalizarCuit(b[b.findIndex((l) => /^CUI[LT]$/i.test(l)) + 1]);
      return { nombre: nombreSinIcono(b[0]), cbu: cbuDeOcr(b[b.findIndex((l) => /^CBU$/i.test(l)) + 1]), cuit };
    };
    const origen = cuenta(iOrigen, iDestino);
    const destino = cuenta(iDestino, iInfo);
    const iCodigo = idx(/^C[oó]digo de transacci[oó]n/i);

    const iEnviaste = idx(/^Enviaste/i);
    const entero = lineas.find((l) => /^\$\s*\d{1,3}(\.\d{3})*$/.test(l))?.replace(/^\$\s*/, "");
    const centavos = lineas.slice(Math.max(0, iEnviaste), Math.max(0, iEnviaste) + 5).find((l) => /^\d{2}$/.test(l)) ?? "00";
    const sospechoso = lineas.find((l) => /^\d{2,3}(\.\d{3})+$/.test(l));
    return {
      monto: entero ? normalizarMonto(`${entero},${centavos}`) : null,
      advertencias: entero
        ? []
        : [`Monto no leído: no se encontró el importe con "$"${sospechoso ? ` (el OCR leyó "${sospechoso}", que puede incluir el $ como dígito)` : ""}. Verificalo en el comprobante`],
      fecha: normalizarFecha(texto.match(/\d{1,2}\/[A-Za-z0]{3}\/\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\d{4}\s*-\s*(\d{1,2}:\d{2})\s*h/i)?.[1]),
      nro_operacion: iCodigo >= 0 ? limpiarEspacios(lineas[iCodigo + 1]) : null,
      ordenante: origen?.nombre ?? null,
      cuit_ordenante: origen?.cuit ?? null,
      cbu_origen: origen?.cbu ?? null,
      cbu_destino: destino?.cbu ?? null,
      destinatario: destino?.nombre ?? null,
    };
  },
};
