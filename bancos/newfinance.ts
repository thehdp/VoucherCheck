import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Comprobante tipo "Finalizada" (origen: CVU 00002907 = NEW FINANCE, según Alberto).
 * nro_operacion = "Nro. de operación" (nunca el "ID Coelsa"). Es un hexadecimal de 32 caracteres.
 */
export const newfinance: Parser = {
  nombre: "New Finance",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim());
    // Fila de datos: "<TITULAR> <CUIT 11 dígitos> <cuenta 22>"
    const fila = (desde: RegExp) => {
      const i = lineas.findIndex((l) => desde.test(l));
      const l = i >= 0 ? lineas.slice(i + 1, i + 4).find((x) => /\d{11}\s+\S{22}/.test(x)) : undefined;
      const m = l?.match(/^(.+?)\s+(\d{11})\s+(\S{22})/);
      return m ? { nombre: limpiarEspacios(m[1]), cuit: normalizarCuit(m[2]), cuenta: cbuDeOcr(m[3]) } : null;
    };
    const origen = fila(/^Origen/i);
    const destino = fila(/^Destino/i);
    const iRef = lineas.findIndex((l) => /Nro\. de operaci[oó]n/i.test(l));
    const filaRef = iRef >= 0 ? lineas[iRef + 1] : undefined;
    // El hexadecimal usa solo 0-9 a-f: O→0 y l/I→1 en ese campo
    const idCrudo = filaRef?.split(/\s+/)[0];
    const nro = idCrudo ? idCrudo.replace(/[Oo]/g, "0").replace(/[lI]/g, "1").toLowerCase() : null;
    return {
      monto: normalizarMonto(texto.match(/([\d.]+,\d{2})\s*ars/i)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2} de [a-záéíóú]+ de \d{4}/i)?.[0]),
      hora: normalizarHora(texto.match(/\d{4},\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m)/i)?.[1]),
      nro_operacion: nro,
      ordenante: origen?.nombre ?? null,
      cuit_ordenante: origen?.cuit ?? null,
      cbu_origen: origen?.cuenta ?? null,
      cbu_destino: destino?.cuenta ?? null,
      destinatario: destino?.nombre ?? null,
      concepto: limpiarEspacios(filaRef?.split(/\s+/).slice(2).join(" ")),
    };
  },
};
