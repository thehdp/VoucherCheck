import type { Parser } from "@/lib/tipos";
import { limpiarEspacios, normalizarCuit, normalizarFecha, normalizarMonto } from "@/lib/normalizar";

/**
 * Galicia Office Banking (comprobante de transferencia a proveedores).
 * La hora "Impreso ... - 16:31" es la de impresión, no la de la operación: hora queda en null.
 * La "Cuenta a debitar" (CC$ 817421484) no es un CBU: cbu_origen queda en null.
 */
export const galicia: Parser = {
  nombre: "Banco Galicia",
  parsear(texto) {
    const pagador = texto.match(/Datos del pagador[\s\S]*?\n(\d{11})\s+([^\n]+)/);
    const dest = texto.match(/Datos del destinatario[\s\S]*?\n(\d{11})\s+([^\n]+)/);
    const concepto = texto.match(/Concepto Descripci[oó]n\s*\n\s*(\S[^\n]*?)\s+-?\s*\n/)?.[1];
    return {
      monto: normalizarMonto(texto.match(/Monto\s*\n[^\n]*?\$\s*([\d.,]+)/)?.[1]),
      fecha: normalizarFecha(texto.match(/Fecha de env[ií]o[\s\S]*?\n(\d{2}\/\d{2}\/\d{4})/)?.[1]),
      nro_operacion: limpiarEspacios(texto.match(/Identificador de la operaci[oó]n:\s*([A-Za-z0-9]+)/)?.[1]),
      ordenante: limpiarEspacios(pagador?.[2]),
      cuit_ordenante: normalizarCuit(pagador?.[1]),
      destinatario: limpiarEspacios(dest?.[2]),
      cbu_destino: texto.match(/\b(\d{22})\b/)?.[1] ?? null,
      concepto: limpiarEspacios(concepto),
    };
  },
};
