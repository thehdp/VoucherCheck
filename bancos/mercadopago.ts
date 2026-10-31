import type { Parser } from "@/lib/tipos";
import { cbuDeOcr, limpiarEspacios, limpiarNombre, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Mercado Pago (captura de pantalla). nro_operacion = "N.º de operación de Mercado Pago".
 * Estructura: bajo "Origen y destino" van dos bloques de 4 líneas: nombre, proveedor, CBU/CVU, CUIT.
 * El primero es el origen y el segundo el destino.
 */
export const mercadopago: Parser = {
  nombre: "Mercado Pago",
  parsear(texto) {
    const lineas = texto.split("\n").map((l) => l.trim());
    const cuentas = lineas.flatMap((l, idx) => (/^(?:CBU|CVU)\s*:/i.test(l) ? [idx] : []));
    const cuentaEn = (idx: number | undefined) => (idx === undefined ? null : cbuDeOcr(lineas[idx].split(":")[1]));
    const cuitEn = (idx: number | undefined) =>
      idx === undefined ? null : normalizarCuit(lineas.slice(idx, idx + 3).join(" ").match(/CUIT\/CUIL:\s*([\d-]+)/)?.[1]);
    const nombreEn = (idx: number | undefined) => (idx === undefined || idx < 2 ? null : limpiarNombre(lineas[idx - 2]));
    const avisos: string[] = [];
    if (cuentas[0] !== undefined && !cuentaEn(cuentas[0])) avisos.push("CBU/CVU origen ilegible (posible error de OCR)");
    if (cuentas[1] !== undefined && !cuentaEn(cuentas[1])) avisos.push("CBU/CVU destino ilegible (posible error de OCR)");
    return {
      advertencias: avisos,
      monto: normalizarMonto(texto.match(/^\s*\$\s*([\d.,]+)\s*$/m)?.[1]),
      fecha: normalizarFecha(texto.match(/\d{1,2}\/[a-záéíóú]+\/\d{4}/i)?.[0]),
      hora: normalizarHora(texto.match(/a las\s+(\d{1,2}:\d{2})/i)?.[1]),
      nro_operacion: limpiarEspacios(texto.match(/operaci[oó]n de Mercado Pago\s*\n\s*(\d{6,})/i)?.[1]),
      ordenante: nombreEn(cuentas[0]),
      cuit_ordenante: cuitEn(cuentas[0]),
      cbu_origen: cuentaEn(cuentas[0]),
      cbu_destino: cuentaEn(cuentas[1]),
      destinatario: nombreEn(cuentas[1]),
      concepto: limpiarEspacios(texto.match(/Motivo:\s*(.+)/i)?.[1]),
    };
  },
};
