import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/** Ualá (captura). nro_operacion = "Id. Op." (confirmado por Alberto). */
export const uala: Parser = {
  nombre: "Ualá",
  parsear(texto) {
    // Si el OCR leyó los textos en columnas (etiquetas juntas y valores juntos), "el valor" sería otra etiqueta: se descarta
    const ES_ETIQUETA = /^(Destinatario|Cuenta destino|CVU destino|CUIT\/CUIL (destino|emisor)|Emisor|CBU emisor|Motivo|Id\.? Op\.?)$/i;
    const campo = (etiqueta: RegExp) => {
      const v = limpiarEspacios(texto.match(new RegExp(`^\\s*${etiqueta.source}\\s+(.+)$`, "im"))?.[1]);
      return v && !ES_ETIQUETA.test(v) ? v : null;
    };
    const avisos: string[] = [];
    const cuenta = (etiqueta: RegExp, nombre: string) => {
      const crudo = campo(etiqueta);
      const cbu = cbuDeOcr(crudo);
      if (crudo && !cbu) avisos.push(`${nombre} ilegible (posible error de OCR)`);
      return cbu;
    };
    return {
      advertencias: avisos,
      monto: normalizarMonto(texto.match(/^\s*\$\s*([\d.,]+)\s*$/m)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]),
      hora: normalizarHora(texto.match(/\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2}:\d{2})/)?.[1]),
      nro_operacion: campo(/Id\.\s*Op\./),
      ordenante: campo(/Emisor/),
      cuit_ordenante: normalizarCuit(campo(/CUIT\/CUIL emisor/)),
      cbu_origen: cuenta(/CBU emisor/, "CBU/CVU origen"),
      cbu_destino: cuenta(/CVU destino/, "CBU/CVU destino"),
      destinatario: campo(/Destinatario/),
      concepto: campo(/Motivo/),
    };
  },
};
