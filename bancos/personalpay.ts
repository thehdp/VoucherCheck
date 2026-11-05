import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Personal Pay (captura de la app).
 * - nro_operacion = "N° de operación" (el "Coelsa ID" / "Id Bancario" no se usa nunca).
 * - ordenante = "Envía" (con su CUIT). banco_origen = "Banco/Billetera de origen" tal como dice el comprobante.
 * - El comprobante dice "Entidad no Registrada" como banco destino: se ignora y se completa con la tabla CBU.
 * - No trae CBU/CVU de origen.
 */
export const personalpay: Parser = {
  nombre: "Personal Pay",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    // Valor = primera línea con contenido después de la etiqueta
    const valorDe = (etiqueta: RegExp, desde = 0) => {
      const i = lineas.findIndex((l, k) => k >= desde && etiqueta.test(l));
      return i >= 0 ? { valor: lineas[i + 1], indice: i } : { valor: undefined, indice: -1 };
    };
    const cuitOrdenante = valorDe(/^CUIT\/CUIL$/i);
    return {
      monto: normalizarMonto(texto.match(/^\s*\$\s*([\d.,]+)\s*$/m)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0]),
      hora: normalizarHora(texto.match(/\b(\d{1,2}:\d{2}):\d{2}/)?.[0]),
      nro_operacion: limpiarEspacios(texto.match(/N\S{0,2}\s+de operaci[oó]n\s*\n\s*(\d{6,})/i)?.[1]),
      ordenante: limpiarEspacios(valorDe(/^Env[ií]a$/i).valor),
      cuit_ordenante: normalizarCuit(cuitOrdenante.valor),
      banco_origen: limpiarEspacios(valorDe(/^Banco\/\s*Billetera de origen$/i).valor),
      destinatario: limpiarEspacios(valorDe(/^Destinatario$/i).valor),
      cbu_destino: cbuDeOcr(valorDe(/^CBU\/CVU de destino$/i).valor),
    };
  },
};
