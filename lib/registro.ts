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
  RETURNING id, veces`;

/**
 * Guarda la lectura (solo datos). Si el MISMO comprobante ya estaba (mismo banco, nro de operación,
 * monto y fecha), pisa el registro y suma una vez en `veces`: no duplica.
 * Si el caso no quedó "completo" guarda además el texto extraído en no_leidos; si ahora quedó
 * completo, cierra el caso pendiente y borra ese texto. Nunca guarda el archivo.
 * Nunca rompe la respuesta: si falla la base, se loguea sin datos personales y se sigue.
 */
export async function registrarLectura(
  app: string,
  origen: "pdf" | "imagen",
  r: Lectura,
  texto: string,
  ejecutar?: Ejecutar,
): Promise<void> {
  if (!ejecutar && !hayDb()) return;
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
    if (r.estado !== "completo") {
      await run(
        `INSERT INTO no_leidos (lectura_id, texto_extraido) VALUES ($1, $2)
         ON CONFLICT (lectura_id) DO UPDATE SET texto_extraido = EXCLUDED.texto_extraido, resuelto_en = NULL`,
        [id, texto],
      );
    } else {
      await run(`UPDATE no_leidos SET resuelto_en = now(), texto_extraido = NULL WHERE lectura_id = $1 AND resuelto_en IS NULL`, [id]);
    }
  } catch {
    console.error(JSON.stringify({ evento: "registro_fallido", app }));
  }
}
