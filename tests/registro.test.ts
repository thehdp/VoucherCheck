import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { asegurarEsquema, MIGRACION, type Ejecutar } from "@/lib/db";
import { registrarLectura } from "@/lib/registro";
import { lecturaVacia, type Lectura } from "@/lib/tipos";

// Prueba contra un Postgres real: TEST_DATABASE_URL=postgres://... npm test
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("registro en Postgres (sin duplicados)", () => {
  let cliente: pg.Client;
  let run: Ejecutar;

  const lectura = (cambios: Partial<Lectura> = {}): Lectura => ({
    ...lecturaVacia(), estado: "completo", banco_emisor: "Lemon", monto: 107000, moneda: "ARS",
    fecha: "2026-10-15", nro_operacion: "OP-1", ...cambios,
  });

  beforeAll(async () => {
    cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    run = async (t, p) => (await cliente.query(t, p as unknown[])).rows;
    await run("DROP TABLE IF EXISTS no_leidos; DROP TABLE IF EXISTS lecturas;");
  });
  afterAll(async () => cliente.end());

  it("migra datos ya duplicados dejando el más nuevo", async () => {
    // esquema viejo (sin veces/actualizado) con 3 copias del mismo comprobante
    await run(`CREATE TABLE lecturas (id BIGSERIAL PRIMARY KEY, creado TIMESTAMPTZ NOT NULL DEFAULT now(), app TEXT NOT NULL,
      origen TEXT NOT NULL, estado TEXT NOT NULL, banco_emisor TEXT, monto NUMERIC(18,2), moneda TEXT, fecha DATE, hora TEXT,
      nro_operacion TEXT, ordenante TEXT, cuit_ordenante TEXT, cbu_origen TEXT, banco_origen TEXT, cbu_destino TEXT,
      banco_destino TEXT, alias_destino TEXT, destinatario TEXT, concepto TEXT, advertencias JSONB NOT NULL DEFAULT '[]')`);
    for (let i = 0; i < 3; i++) {
      await run(`INSERT INTO lecturas (app, origen, estado, banco_emisor, monto, fecha, nro_operacion)
                 VALUES ('tienda','imagen','completo','Naranja X',5000,'2026-10-31','COD-1')`);
    }
    await run(`INSERT INTO lecturas (app, origen, estado) VALUES ('web','imagen','no_leido'), ('web','imagen','no_leido')`);
    await asegurarEsquema(run, true);
    expect(await run(`SELECT id FROM lecturas WHERE nro_operacion = 'COD-1'`)).toHaveLength(1);
    expect(await run(`SELECT id FROM lecturas WHERE nro_operacion IS NULL`)).toHaveLength(2); // sin número no se tocan
  });

  it("el mismo comprobante no se duplica: se pisa y cuenta las veces", async () => {
    await registrarLectura("tienda", "imagen", lectura(), "texto 1", run);
    await registrarLectura("web", "imagen", lectura({ hora: "12:45" }), "texto 2", run);
    const filas = await run(`SELECT app, veces, hora FROM lecturas WHERE nro_operacion = 'OP-1'`);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ app: "tienda", veces: 2, hora: "12:45" }); // conserva la app original, pisa los datos
  });

  it("distinto monto o fecha = comprobante distinto", async () => {
    await registrarLectura("web", "imagen", lectura({ monto: 5 }), "t", run);
    await registrarLectura("web", "imagen", lectura({ fecha: "2026-10-16" }), "t", run);
    expect(await run(`SELECT id FROM lecturas WHERE nro_operacion = 'OP-1'`)).toHaveLength(3);
  });

  it("no leído guarda el texto una sola vez y se cierra solo cuando pasa a completo", async () => {
    const parcial = lectura({ nro_operacion: "OP-2", estado: "parcial", advertencias: ["x"] });
    await registrarLectura("web", "imagen", parcial, "primer texto", run);
    await registrarLectura("web", "imagen", parcial, "segundo texto", run);
    let n = await run(`SELECT texto_extraido, resuelto_en FROM no_leidos n JOIN lecturas l ON l.id = n.lectura_id WHERE l.nro_operacion = 'OP-2'`);
    expect(n).toHaveLength(1);
    expect(n[0].texto_extraido).toBe("segundo texto");
    await registrarLectura("web", "imagen", lectura({ nro_operacion: "OP-2" }), "ok", run); // el parser mejoró
    n = await run(`SELECT texto_extraido, resuelto_en FROM no_leidos n JOIN lecturas l ON l.id = n.lectura_id WHERE l.nro_operacion = 'OP-2'`);
    expect(n[0].texto_extraido).toBeNull();
    expect(n[0].resuelto_en).not.toBeNull();
  });

  it("la migración se puede correr varias veces", async () => {
    await asegurarEsquema(run, true);
    await asegurarEsquema(run, true);
    expect(MIGRACION.length).toBeGreaterThan(0);
  });
});
