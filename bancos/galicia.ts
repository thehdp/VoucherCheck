import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, corregirNumerico, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Galicia Office Banking (comprobante de transferencia a proveedores).
 * La hora "Impreso ... - 16:31" es la de impresión, no la de la operación: hora queda en null.
 * La "Cuenta a debitar" (CC$ 817421484) no es un CBU: cbu_origen queda en null.
 */
export const galicia: Parser = {
  nombre: "Banco Galicia",
  parsear(texto) {
    if (/dep[oó]sito en efectivo/i.test(texto)) return parsearDeposito(texto);
    if (/detalle de movimiento/i.test(texto)) return parsearMovimiento(texto);
    if (/^De:\s*$/im.test(texto) && /^Para:\s*$/im.test(texto)) return parsearApp(texto);
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

/**
 * Office Banking, "Detalle de movimiento" (débito de una transferencia a proveedores, captura).
 * - nro_operacion = "Número de comprobante".
 * - Los datos del destino vienen en "Leyendas adicionales", en orden: nombre, CUIT, concepto, banco abreviado (ej. PVS).
 *   El CUIT y la abreviatura no tienen campo propio: no se guardan. Sin CBU.
 * - No trae ordenante (la "Cuenta débito" es la propia, sin nombre), ni hora, ni CBU: quedan null.
 */
function parsearMovimiento(texto: string) {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const iFila = lineas.findIndex((l) => /^Fecha de preparaci[oó]n/i.test(l));
  const fila = iFila >= 0 ? lineas[iFila + 1] ?? "" : ""; // "03/11/2026 Débito $ 97.600,00"
  const iLey = lineas.findIndex((l) => /^Leyendas adicionales/i.test(l));
  const iNro = lineas.findIndex((l) => /^N[uú]mero de comprobante/i.test(l));
  const leyendas = iLey >= 0 ? lineas.slice(iLey + 1, iNro > iLey ? iNro : undefined) : [];
  const iCuit = leyendas.findIndex((l) => /^\d{11}$/.test(l));
  return {
    monto: normalizarMonto(fila.match(/\$\s*([\d.,]+)\s*$/)?.[1]),
    fecha: normalizarFecha(fila.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
    nro_operacion: limpiarEspacios(iNro >= 0 ? lineas[iNro + 1]?.match(/^\d{4,}$/)?.[0] : undefined),
    destinatario: limpiarEspacios(leyendas[0]),
    concepto: iCuit >= 0 ? limpiarEspacios(leyendas[iCuit + 1]) : null,
  };
}

/**
 * App de Galicia, "Transferencia enviada" (captura).
 * - nro_operacion = "N° de operación". El "ID COELSA" no se usa nunca.
 * - ordenante = "De:" (con su CUIT); banco_origen = "Cuenta en …" tal como dice el comprobante.
 *   La cuenta de origen (CA $ N° …) no es un CBU: cbu_origen queda null.
 * - destinatario = "Para:"; CBU/CVU de destino de la línea "CVU …" / "CBU …".
 */
function parsearApp(texto: string) {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const iDe = lineas.findIndex((l) => /^De:$/i.test(l));
  const iPara = lineas.findIndex((l) => /^Para:$/i.test(l));
  const iConcepto = lineas.findIndex((l, k) => k > iPara && /^Concepto$/i.test(l));
  const bloqueDe = lineas.slice(iDe + 1, iPara);
  const bloquePara = lineas.slice(iPara + 1, iConcepto > iPara ? iConcepto : undefined);
  const cuit = bloqueDe.find((l) => /^CUIT\b/i.test(l))?.replace(/^CUIT\s*/i, "");
  const cuentaEn = bloqueDe.find((l) => /^Cuenta en\b/i.test(l))?.replace(/^Cuenta en\s*/i, "");
  const cbuCrudo = bloquePara.find((l) => /^(CBU|CVU)\b/i.test(l))?.replace(/^(CBU|CVU)\s*/i, "");
  const cbu = cbuDeOcr(cbuCrudo);
  return {
    advertencias: cbuCrudo && !cbu ? ["CBU/CVU destino ilegible (posible error de OCR)"] : [],
    monto: normalizarMonto(lineas.find((l) => /^\$\s*[\d.,]+$/.test(l))?.replace(/^\$\s*/, "")),
    fecha: normalizarFecha(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
    hora: normalizarHora(texto.match(/\d{4}\s*[-·•]\s*(\d{1,2}:\d{2})\s*h/i)?.[1]),
    nro_operacion: limpiarEspacios(texto.match(/N\S{0,2}\s+de operaci[oó]n\s*\n\s*(\d{5,})/i)?.[1]),
    ordenante: limpiarEspacios(bloqueDe[0]),
    cuit_ordenante: normalizarCuit(cuit),
    banco_origen: limpiarEspacios(cuentaEn),
    destinatario: limpiarEspacios(bloquePara[0]),
    cbu_destino: cbu,
    concepto: limpiarEspacios(lineas[iConcepto + 1]),
  };
}
