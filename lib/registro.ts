import { asegurarEsquema, hayDb, sql } from "@/lib/db";
import type { Lectura } from "@/lib/tipos";

/**
 * Guarda la lectura (solo datos). Si el caso no quedó "completo" guarda además el texto
 * extraído en no_leidos, para poder corregir el parser. Nunca guarda el archivo.
 * Nunca rompe la respuesta: si falla la base, se loguea sin datos personales y se sigue.
 */
export async function registrarLectura(app: string, origen: "pdf" | "imagen", r: Lectura, texto: string): Promise<void> {
  if (!hayDb()) return;
  try {
    await asegurarEsquema();
    const db = sql();
    const filas = await db`INSERT INTO lecturas
      (app, origen, estado, banco_emisor, monto, moneda, fecha, hora, nro_operacion, ordenante, cuit_ordenante,
       cbu_origen, banco_origen, cbu_destino, banco_destino, alias_destino, destinatario, concepto, advertencias)
      VALUES (${app}, ${origen}, ${r.estado}, ${r.banco_emisor}, ${r.monto}, ${r.moneda}, ${r.fecha}, ${r.hora},
       ${r.nro_operacion}, ${r.ordenante}, ${r.cuit_ordenante}, ${r.cbu_origen}, ${r.banco_origen}, ${r.cbu_destino},
       ${r.banco_destino}, ${r.alias_destino}, ${r.destinatario}, ${r.concepto}, ${JSON.stringify(r.advertencias)}::jsonb)
      RETURNING id`;
    if (r.estado !== "completo") {
      await db`INSERT INTO no_leidos (lectura_id, texto_extraido) VALUES (${filas[0].id}, ${texto})`;
    }
  } catch {
    console.error(JSON.stringify({ evento: "registro_fallido", app }));
  }
}
