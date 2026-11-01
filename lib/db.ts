import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres. Solo se guardan DATOS (nunca archivos). Si no hay DATABASE_URL (por ejemplo
 * en desarrollo o antes de conectar Neon) el registro se saltea y el lector sigue funcionando.
 */
export function hayDb(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Ejecuta una consulta con parámetros ($1, $2…). En producción es Neon; en los tests, un Postgres local. */
export type Ejecutar = (texto: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export function ejecutorNeon(): Ejecutar {
  const db = neon(process.env.DATABASE_URL!);
  return (texto, params = []) => db.query(texto, params) as Promise<Record<string, unknown>[]>;
}

/**
 * Un comprobante es "el mismo" si coinciden banco emisor, nro de operación, monto y fecha
 * (los cuatro cargados). Si se vuelve a leer, se PISA el registro en vez de duplicarlo.
 */
const CLAVE_UNICA = "banco_emisor, nro_operacion, monto, fecha";
const DONDE_UNICA = "banco_emisor IS NOT NULL AND nro_operacion IS NOT NULL AND monto IS NOT NULL AND fecha IS NOT NULL";
export const CONFLICTO_LECTURA = `(${CLAVE_UNICA}) WHERE ${DONDE_UNICA}`;

/** Esquema + migración, todo idempotente: se puede correr en cada arranque. */
export const MIGRACION: string[] = [
  `CREATE TABLE IF NOT EXISTS lecturas (
    id BIGSERIAL PRIMARY KEY,
    creado TIMESTAMPTZ NOT NULL DEFAULT now(),
    app TEXT NOT NULL,
    origen TEXT NOT NULL,
    estado TEXT NOT NULL,
    banco_emisor TEXT,
    monto NUMERIC(18,2),
    moneda TEXT,
    fecha DATE,
    hora TEXT,
    nro_operacion TEXT,
    ordenante TEXT,
    cuit_ordenante TEXT,
    cbu_origen TEXT,
    banco_origen TEXT,
    cbu_destino TEXT,
    banco_destino TEXT,
    alias_destino TEXT,
    destinatario TEXT,
    concepto TEXT,
    advertencias JSONB NOT NULL DEFAULT '[]'
  )`,
  `ALTER TABLE lecturas ADD COLUMN IF NOT EXISTS veces INT NOT NULL DEFAULT 1`,
  `ALTER TABLE lecturas ADD COLUMN IF NOT EXISTS actualizado TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE TABLE IF NOT EXISTS no_leidos (
    id BIGSERIAL PRIMARY KEY,
    lectura_id BIGINT NOT NULL REFERENCES lecturas(id) ON DELETE CASCADE,
    creado TIMESTAMPTZ NOT NULL DEFAULT now(),
    texto_extraido TEXT,
    resuelto_en TIMESTAMPTZ
  )`,
  // Limpieza única de lo ya duplicado: queda el registro más nuevo de cada comprobante
  `DELETE FROM lecturas a USING lecturas b
   WHERE a.id < b.id AND a.banco_emisor = b.banco_emisor AND a.nro_operacion = b.nro_operacion
     AND a.monto = b.monto AND a.fecha = b.fecha`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lecturas_unica ON lecturas ${CONFLICTO_LECTURA}`,
  `CREATE UNIQUE INDEX IF NOT EXISTS no_leidos_por_lectura ON no_leidos (lectura_id)`,
];

let esquemaListo: Promise<void> | null = null;

export function asegurarEsquema(ejecutar: Ejecutar, forzar = false): Promise<void> {
  if (!esquemaListo || forzar) {
    esquemaListo = (async () => {
      for (const sentencia of MIGRACION) await ejecutar(sentencia);
    })().catch((e) => {
      esquemaListo = null;
      throw e;
    });
  }
  return esquemaListo;
}
