import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/** Ualá (captura). nro_operacion = "Id. Op." (confirmado por Alberto). */
export const uala: Parser = {
  nombre: "Ualá",
  parsear(texto) {
    const campo = (etiqueta: RegExp) => limpiarEspacios(texto.match(new RegExp(`^\\s*${etiqueta.source}\\s+(.+)$`, "im"))?.[1]);
    return {
      monto: normalizarMonto(texto.match(/^\s*\$\s*([\d.,]+)\s*$/m)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}:\d{2})/)?.[1]),
      nro_operacion: campo(/Id\.\s*Op\./),
      ordenante: campo(/Emisor/),
      cuit_ordenante: normalizarCuit(campo(/CUIT\/CUIL emisor/)),
      cbu_origen: cbuDeOcr(campo(/CBU emisor/)),
      cbu_destino: cbuDeOcr(campo(/CVU destino/)),
      destinatario: campo(/Destinatario/),
      concepto: campo(/Motivo/),
    };
  },
};
