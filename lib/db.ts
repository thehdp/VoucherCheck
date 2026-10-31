import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres. Solo se guardan DATOS (nunca archivos). Si no hay DATABASE_URL (por ejemplo
 * en desarrollo o antes de conectar Neon) el registro se saltea y el lector sigue funcionando.
 */
export function hayDb(): boolean {
  return !!process.env.DATABASE_URL;
}

export function sql() {
  return neon(process.env.DATABASE_URL!);
}

let esquemaListo: Promise<void> | null = null;

/** Crea las tablas si no existen (una vez por instancia). */
export function asegurarEsquema(): Promise<void> {
  if (!esquemaListo) {
    esquemaListo = (async () => {
      const db = sql();
      await db`CREATE TABLE IF NOT EXISTS lecturas (
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
      )`;
      await db`CREATE TABLE IF NOT EXISTS no_leidos (
        id BIGSERIAL PRIMARY KEY,
        lectura_id BIGINT NOT NULL REFERENCES lecturas(id) ON DELETE CASCADE,
        creado TIMESTAMPTZ NOT NULL DEFAULT now(),
        texto_extraido TEXT,
        resuelto_en TIMESTAMPTZ
      )`;
    })().catch((e) => {
      esquemaListo = null;
      throw e;
    });
  }
  return esquemaListo;
}
