import { asegurarEsquema, CONFLICTO_LECTURA, ejecutorNeon, hayDb, type Ejecutar } from "@/lib/db";
import type { Lectura } from "@/lib/tipos";

const COLUMNAS = [
  "app", "origen", "estado", "banco_emisor", "monto", "moneda", "fecha", "hora", "nro_operacion", "ordenante",
  "cuit_ordenante", "cbu_origen", "banco_origen", "cbu_destino", "banco_destino", "alias_destino", "destinatario",
  "concepto", "advertencias",
];
// Al repetirse un comprobante se pisan los datos, pero se conservan la app y la fecha de la primera lectura
const PISAR = COLUMNAS.filter((c) => c !== "app").map((c) => `${c} = EXCLUDED.${c}`).join(", ");

const SQL_LECTURA = `INSERT INTO lecturas (${COLUMNAS.join(", ")})
  VALUES (${COLUMNAS.map((_, i) => (COLUMNAS[i] === "advertencias" ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(", ")})
  ON CONFLICT ${CONFLICTO_LECTURA}
  DO UPDATE SET ${PISAR}, veces = lecturas.veces + 1, actualizado = now()
  RETURNING id, veces, creado`;

export interface InfoRepetido {
  repetido: boolean;
  /** Cuántas veces se leyó ANTES de esta lectura. */
  lecturas_previas: number;
  /** ISO de la primera lectura (solo si es repetido). */
  primera_lectura: string | null;
}

export const SIN_REPETIDO: InfoRepetido = { repetido: false, lecturas_previas: 0, primera_lectura: null };

/** Mensaje para el campo `advertencias` cuando el comprobante ya se había leído. */
export function textoRepetido(info: InfoRepetido): string {
  const cuando = info.primera_lectura
    ? new Date(info.primera_lectura).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "";
  const veces = info.lecturas_previas === 1 ? "1 vez" : `${info.lecturas_previas} veces`;
  return `Este comprobante ya fue leído antes (${veces}${cuando ? `; primera lectura ${cuando.replace(",", "")}` : ""})`;
}

/**
 * Guarda la lectura (solo datos). Si el MISMO comprobante ya estaba (mismo banco, nro de operación,
 * monto y fecha), pisa el registro y suma una vez en `veces`: no duplica.
 * Si el caso no quedó "completo" guarda además el texto extraído en no_leidos; si ahora quedó
 * completo, cierra el caso pendiente y borra ese texto. Nunca guarda el archivo.
 * Devuelve si el comprobante ya se había leído antes (para avisarle a la app).
 * Nunca rompe la respuesta: si falla la base, se loguea sin datos personales y se sigue.
 */
export async function registrarLectura(
  app: string,
  origen: "pdf" | "imagen",
  r: Lectura,
  texto: string,
  ejecutar?: Ejecutar,
): Promise<InfoRepetido> {
  if (!ejecutar && !hayDb()) return SIN_REPETIDO;
  try {
    const run = ejecutar ?? ejecutorNeon();
    await asegurarEsquema(run);
    const valores = [
      app, origen, r.estado, r.banco_emisor, r.monto, r.moneda, r.fecha, r.hora, r.nro_operacion, r.ordenante,
      r.cuit_ordenante, r.cbu_origen, r.banco_origen, r.cbu_destino, r.banco_destino, r.alias_destino, r.destinatario,
      r.concepto, JSON.stringify(r.advertencias),
    ];
    const filas = await run(SQL_LECTURA, valores);
    const id = filas[0].id;
    const veces = Number(filas[0].veces);
    if (r.estado !== "completo") {
      await run(
        `INSERT INTO no_leidos (lectura_id, texto_extraido) VALUES ($1, $2)
         ON CONFLICT (lectura_id) DO UPDATE SET texto_extraido = EXCLUDED.texto_extraido, resuelto_en = NULL`,
        [id, texto],
      );
    } else {
      await run(`UPDATE no_leidos SET resuelto_en = now(), texto_extraido = NULL WHERE lectura_id = $1 AND resuelto_en IS NULL`, [id]);
    }
    if (veces > 1) {
      return { repetido: true, lecturas_previas: veces - 1, primera_lectura: new Date(String(filas[0].creado)).toISOString() };
    }
  } catch {
    console.error(JSON.stringify({ evento: "registro_fallido", app }));
  }
  return SIN_REPETIDO;
}
