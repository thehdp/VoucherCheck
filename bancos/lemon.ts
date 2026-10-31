import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Lemon (captura). nro_operacion = "ID de la transacción".
 * El "COELSA ID" no se usa nunca (decisión de Alberto).
 */
export const lemon: Parser = {
  nombre: "Lemon",
  parsear(texto) {
    const campo = (etiqueta: RegExp) => limpiarEspacios(texto.match(new RegExp(`^\\s*${etiqueta.source}\\s+(.+)$`, "im"))?.[1]);
    return {
      monto: normalizarMonto(texto.match(/ARS\s*([\d.,]+)/i)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2}\s+[A-Za-záéíóú]+\s+\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\d{4}\s+(\d{1,2}:\d{2})\s*hs/i)?.[1]),
      nro_operacion: limpiarEspacios(texto.match(/ID de la transacci[oó]n\s*\n\s*(\S+)/i)?.[1]),
      ordenante: limpiarEspacios(texto.match(/Enviado por\s+(.+)/i)?.[1]),
      cbu_destino: cbuDeOcr(campo(/CBU/)),
      destinatario: campo(/Nombre/),
      concepto: campo(/Motivo/),
    };
  },
};
