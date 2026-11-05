import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Brubank (captura en modo oscuro: lib/extraer/ocr.ts la procesa aparte).
 * - La captura NO trae número de operación: nro_operacion queda null y el caso sale no_leido.
 * - ordenante = "Titular" (con su CUIT). El "$" del importe suele leerse como "S".
 * - Sin CBU de origen. "Origen: Caja de ahorro en Pesos" es el tipo de cuenta, no un concepto.
 */
export const brubank: Parser = {
  nombre: "Brubank",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const despuesDe = (etiqueta: RegExp) => {
      const i = lineas.findIndex((l) => etiqueta.test(l));
      return i >= 0 ? lineas[i + 1] : undefined;
    };
    const valor = (etiqueta: RegExp) => lineas.find((l) => etiqueta.test(l))?.replace(etiqueta, "").trim();
    const iTitular = lineas.findIndex((l) => /^Titular\b/i.test(l));
    const cuitOrigen = iTitular >= 0 ? lineas.slice(iTitular + 1, iTitular + 4).find((l) => /^CUIT/i.test(l)) : undefined;
    const cbuCrudo = valor(/^CBU\s*\/\s*CVU\s*/i);
    const cbu = cbuDeOcr(cbuCrudo);
    return {
      advertencias: cbuCrudo && !cbu ? ["CBU/CVU destino ilegible (posible error de OCR)"] : [],
      monto: normalizarMonto(lineas.find((l) => /^(?:[S$]\s*)?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(l))?.replace(/^[S$]\s*/, "")),
      fecha: normalizarFecha(texto.match(/\d{1,2} de [a-záéíóú]+ de \d{4}/i)?.[0]),
      hora: normalizarHora(texto.match(/\d{4}\s*-\s*(\d{1,2}:\d{2})/)?.[1]),
      destinatario: limpiarEspacios(despuesDe(/^Env[ií]o de dinero a$/i)),
      cbu_destino: cbu,
      ordenante: limpiarEspacios(valor(/^Titular\s+/i)),
      cuit_ordenante: normalizarCuit(cuitOrigen?.replace(/^CUIT\s*\/\s*CUIL\s*/i, "")),
    };
  },
};
