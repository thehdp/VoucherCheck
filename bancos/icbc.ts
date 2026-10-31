import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * ICBC (comprobante de débito inmediato).
 * - El importe viene negativo ("$ -794.000,00") pero es un valor positivo: se toma el absoluto (confirmado por Alberto).
 * - nro_operacion = "Nro de movimiento" (confirmado por Alberto).
 * - ordenante = "Rubro" (quien paga); destinatario = "Nombre" del detalle de transferencia.
 */
export const icbc: Parser = {
  nombre: "ICBC",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim());
    const despuesDe = (re: RegExp) => {
      const i = lineas.findIndex((l) => re.test(l));
      return i >= 0 ? lineas[i + 1] : undefined;
    };
    const filaRubro = despuesDe(/^Rubro\b/i); // "ENZO RODRIGO ZANEL CC $ 0827/02105356/90 $ -794.000,00"
    const filaConcepto = despuesDe(/^Concepto\b/i); // "DEBITO INMEDIATO2017... 22-Oct-2026 34822"
    const filaCvu = despuesDe(/^CVU\/A[lI1i]+as/i); // "0000003100043103826391 OSCAR ENRIQUE MAGNANEGO"
    const monto = normalizarMonto(filaRubro?.match(/\$\s*(-?[\d.,]+)\s*$/)?.[1]);
    const cvu = filaCvu?.match(/^(\S+)\s+(.+)$/);
    const concepto = filaConcepto?.match(/^(.+?)\s+\d{1,2}-[A-Za-z]{3}-\d{4}/)?.[1];
    return {
      monto: monto === null ? null : Math.abs(monto),
      fecha: normalizarFecha(filaConcepto?.match(/\d{1,2}-[A-Za-z]{3}-\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\d{1,2}-[A-Za-z]{3}-\d{4}\s+(\d{1,2}:\d{2})/)?.[1]),
      nro_operacion: limpiarEspacios(filaConcepto?.match(/\s(\d+)$/)?.[1]),
      ordenante: limpiarEspacios(filaRubro?.split(/\s+C[CA]\s*\$/)[0]),
      cbu_destino: cbuDeOcr(cvu?.[1]),
      destinatario: limpiarEspacios(cvu?.[2]),
      // El OCR pega el CUIT del destino al concepto ("DEBITO INMEDIATO20174137235"): se saca
      concepto: limpiarEspacios(concepto?.replace(/\d{8,}$/, "")),
    };
  },
};
