import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import pg from "pg";
import { armarExcel, borrarMes, filasDelMes, listarMeses, mesValido } from "@/lib/cierre";
import { asegurarEsquema, type Ejecutar } from "@/lib/db";

const url = process.env.TEST_DATABASE_URL;

describe("mesValido", () => {
  it.each(["2026-10", "2026-01", "2026-12"])("%s", (m) => expect(mesValido(m)).toBe(true));
  it.each(["2026-13", "2026-00", "26-10", "2026-1", "'; DROP TABLE lecturas;--", 5, null])("rechaza %s", (m) => expect(mesValido(m)).toBe(false));
});

describe.skipIf(!url)("cierre de mes en Postgres", () => {
  let cliente: pg.Client;
  let run: Ejecutar;

  const insertar = (creado: string, op: string, extra = "") =>
    run(`INSERT INTO lecturas (creado, app, origen, estado, banco_emisor, monto, fecha, nro_operacion, cbu_destino, advertencias ${extra ? "," + extra.split("=")[0] : ""})
         VALUES ($1, 'web', 'imagen', 'completo', 'Lemon', 107000.5, '2026-10-15', $2, '0000046800000159185229', '["aviso uno","aviso dos"]'::jsonb ${extra ? "," + extra.split("=")[1] : ""}) RETURNING id`, [creado, op]);

  beforeAll(async () => {
    cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    run = async (t, p) => (await cliente.query(t, p as unknown[])).rows;
    await run("DROP TABLE IF EXISTS no_leidos; DROP TABLE IF EXISTS lecturas;");
    await asegurarEsquema(run, true);
    await insertar("2026-10-05T12:00:00Z", "A1");
    await insertar("2026-10-31T23:30:00-03:00", "A2"); // 31/10 23:30 en Buenos Aires = ya es 01/11 en UTC
    const nov = await insertar("2026-11-01T01:00:00-03:00", "B1");
    await run(`INSERT INTO no_leidos (lectura_id, texto_extraido) VALUES ($1, 'texto del caso')`, [nov[0].id]);
  });
  afterAll(async () => cliente.end());

  it("agrupa por mes con hora de Buenos Aires", async () => {
    const meses = await listarMeses(run);
    expect(meses.map((m) => [m.mes, m.lecturas, m.no_leidos_pendientes])).toEqual([["2026-11", 1, 1], ["2026-10", 2, 0]]);
  });

  it("el Excel trae las columnas, el monto numérico y el CBU como texto", async () => {
    const filas = await filasDelMes(run, "2026-10");
    expect(filas).toHaveLength(2);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await armarExcel(filas)) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet("Lecturas")!;
    expect(hoja.rowCount).toBe(3); // encabezado + 2
    expect(hoja.getRow(1).getCell(8).value).toBe("Banco emisor");
    const fila = hoja.getRow(2);
    expect(fila.getCell(9).value).toBe(107000.5);
    expect(fila.getCell(18).value).toBe("0000046800000159185229");
    expect(fila.getCell(11).value).toBe("2026-10-15");
    expect(fila.getCell(23).value).toBe("aviso uno | aviso dos");
  });

  it("la hoja No leídos trae el texto de los pendientes", async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await armarExcel(await filasDelMes(run, "2026-11"))) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet("No leídos")!;
    expect(hoja.rowCount).toBe(2);
    expect(hoja.getRow(2).getCell(2).value).toBe("texto del caso");
  });

  it("borra solo el mes pedido y solo hasta el maxId exportado", async () => {
    const octubre = await filasDelMes(run, "2026-10");
    const maxId = Math.max(...octubre.map((f) => Number(f.id)));
    const tarde = await insertar("2026-10-20T12:00:00Z", "LLEGO-DESPUES"); // entró después de exportar
    expect(Number(tarde[0].id)).toBeGreaterThan(maxId);
    expect(await borrarMes(run, "2026-10", maxId)).toBe(2);
    const quedan = await run("SELECT nro_operacion FROM lecturas ORDER BY id");
    expect(quedan.map((r) => r.nro_operacion)).toEqual(["B1", "LLEGO-DESPUES"]);
    expect(await run("SELECT id FROM no_leidos")).toHaveLength(1); // noviembre intacto
  });

  it("borrar un mes borra en cascada sus no leídos", async () => {
    const nov = await filasDelMes(run, "2026-11");
    await borrarMes(run, "2026-11", Math.max(...nov.map((f) => Number(f.id))));
    expect(await run("SELECT id FROM no_leidos")).toHaveLength(0);
  });
});
