import type { Parser } from "@/lib/tipos";
import { limpiarEspacios, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Parser genérico: busca etiquetas comunes ("Importe", "Fecha", "Nº de operación").
 * Es un último recurso; no completa banco_emisor porque no sabe quién lo emitió.
 */
export const generico: Parser = {
  nombre: "",
  parsear(texto) {
    const linea = (re: RegExp) => limpiarEspacios(texto.match(re)?.[1]);
    return {
      monto: normalizarMonto(linea(/(?:importe|monto)[^\S\n]*[:\-]?[^\S\n]*\$?[^\S\n]*([\d.,]+)/i)),
      fecha: normalizarFecha(texto),
      hora: normalizarHora(texto),
      nro_operacion: linea(/(?:n[°ºo.]*\s*(?:de\s+)?(?:operaci[oó]n|comprobante|transacci[oó]n)|c[oó]digo de operaci[oó]n)[^\S\n]*[:\-]?[^\S\n]*([A-Za-z0-9\-]{6,})/i),
      cbu_destino: linea(/\b(\d{22})\b/),
    };
  },
};
