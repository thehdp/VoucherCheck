import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Banco Patagonia (comprobante "TRANSFERENCIA").
 * - El logo "BANCOPATAGONIA" es una imagen: el OCR no lo lee. Se reconoce por el formato
 *   ("CUIT / CUIL / DNI:") en /bancos/firmas.json.
 * - nro_operacion = "Nº de transacción" (confirmado por Alberto). El "Nº de control" (22 caracteres
 *   alfanuméricos, formato tipo Coelsa) NO se usa.
 * - "Origen" trae el nombre y la cuenta del banco (CA $ 070-…-000), que no es un CBU: cbu_origen queda null.
 * - Sin CUIT del ordenante: el único CUIT del comprobante es el del destino.
 */
export const patagonia: Parser = {
  nombre: "Banco Patagonia",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const despuesDe = (etiqueta: RegExp) => {
      const i = lineas.findIndex((l) => etiqueta.test(l));
      return i >= 0 ? lineas[i + 1] : undefined;
    };
    const cbuCrudo = texto.match(/CBU\s*\/\s*CVU:\s*(\S+)/i)?.[1];
    const cbu = cbuDeOcr(cbuCrudo);
    return {
      advertencias: cbuCrudo && !cbu ? ["CBU/CVU destino ilegible (posible error de OCR)"] : [],
      monto: normalizarMonto(despuesDe(/^Importe$/i)),
      fecha: normalizarFecha(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\b\d{1,2}:\d{2}:\d{2}\b/)?.[0]),
      nro_operacion: limpiarEspacios(texto.match(/N\S{0,2}\s+de transacci[oó]n\s*\n\s*(\d{6,})/i)?.[1]),
      ordenante: limpiarEspacios(despuesDe(/^Origen$/i)),
      destinatario: limpiarEspacios(despuesDe(/^Destino$/i)),
      cbu_destino: cbu,
      concepto: limpiarEspacios(despuesDe(/^Concepto$/i)),
    };
  },
};
