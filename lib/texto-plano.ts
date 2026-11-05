import type { Lectura } from "@/lib/tipos";

function fechaAr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function montoAr(n: number, moneda: string | null): string {
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${moneda ? " " + moneda : ""}`;
}

/** Texto plano "Campo: valor" para copiar y pegar. Los campos que no están en el comprobante se omiten. */
export function aTextoPlano(r: Lectura): string {
  const filas: [string, string | null][] = [
    ["Banco emisor", r.banco_emisor],
    ["Monto", r.monto === null ? null : montoAr(r.monto, r.moneda)],
    ["Fecha", r.fecha ? fechaAr(r.fecha) : null],
    ["Hora", r.hora],
    ["Nro. de operación", r.nro_operacion],
    ["Ordenante", r.ordenante],
    ["CUIT ordenante", r.cuit_ordenante],
    ["CBU/CVU origen", r.cbu_origen],
    ["Banco origen", r.banco_origen],
    ["Destinatario", r.destinatario],
    ["CBU/CVU destino", r.cbu_destino],
    ["Banco destino", r.banco_destino],
    ["Alias destino", r.alias_destino],
    ["Concepto", r.concepto],
  ];
  const lineas = filas.filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}: ${v}`);
  const estado = `Estado: ${r.estado}`;
  const avisos = r.advertencias.map((a) => `⚠ ${a}`);
  return [estado, ...lineas, ...(avisos.length ? ["", ...avisos] : [])].join("\n");
}

/**
 * Monto para pegar en otro sistema: sin símbolos ni puntos de miles. Si los centavos son cero se copia
 * solo el entero (33000); si hay centavos, con coma decimal (15000,50).
 */
export function montoParaCopiar(monto: number | null): string | null {
  if (monto === null) return null;
  const [entero, centavos] = monto.toFixed(2).split(".");
  return centavos === "00" ? entero : `${entero},${centavos}`;
}
