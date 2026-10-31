import type { Parser } from "@/lib/tipos";
import { corregirNumerico, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Galicia Office Banking (comprobante de transferencia a proveedores).
 * La hora "Impreso ... - 16:31" es la de impresión, no la de la operación: hora queda en null.
 * La "Cuenta a debitar" (CC$ 817421484) no es un CBU: cbu_origen queda en null.
 */
export const galicia: Parser = {
  nombre: "Banco Galicia",
  parsear(texto) {
    if (/dep[oó]sito en efectivo/i.test(texto)) return parsearDeposito(texto);
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

/**
 * Ticket de cajero "DEPOSITO EN EFECTIVO" (foto → OCR).
 * - nro_operacion: los 21 dígitos de "Nro Operacion", SIN el dígito de "Estado" (confirmado por Alberto).
 * - ordenante: "DEPOSITO" (los depósitos no traen ordenante).
 * - destinatario: el titular de la cuenta. Sin CBU.
 * Si el OCR no deja 21 dígitos limpios, nro_operacion queda null con advertencia: no se adivina.
 */
function parsearDeposito(texto: string) {
  const op = texto.match(/Nro\.?\s*Operaci[oó]n\s+(\S+)/i)?.[1];
  const limpio = op ? corregirNumerico(op) : null;
  const nro = limpio && /^\d{21}$/.test(limpio) ? limpio : null;
  const titular = texto.match(/[Tt1l]itular\s+((?:[A-ZÁÉÍÓÚÑ]{2,}(?:[ \t]|$))+)/m)?.[1];
  let fecha = normalizarFecha(texto.match(/\d{2}\/\d{2}\/\d{4}/)?.[0]);
  const avisos: string[] = [];
  // Los dígitos 9 a 14 del número de operación son la fecha (AAMMDD): 007605042610160092008 → 2026-10-16
  const fechaOp = nro ? normalizarFecha(`${nro.slice(12, 14)}/${nro.slice(10, 12)}/${nro.slice(8, 10)}`) : null;
  if (fecha && fechaOp && fecha !== fechaOp) avisos.push("La fecha del ticket no coincide con la del número de operación");
  if (!fecha && fechaOp) {
    fecha = fechaOp;
    avisos.push("Fecha tomada del número de operación (el OCR no pudo leerla del ticket)");
  }
  return {
    advertencias: avisos,
    monto: normalizarMonto(texto.match(/mporte\s*\$?\s*([\d.,]+)/i)?.[1]),
    fecha,
    hora: normalizarHora(texto.match(/\b(\d{2}:\d{2}):?\d{0,2}/)?.[0]),
    nro_operacion: nro,
    ordenante: "DEPOSITO",
    destinatario: limpiarEspacios(titular),
  };
}
