import ExcelJS from "exceljs";
import type { Ejecutar } from "@/lib/db";

const TZ = "America/Argentina/Buenos_Aires";
const MES = "to_char(l.creado AT TIME ZONE $1, 'YYYY-MM')";

export const mesValido = (m: unknown): m is string => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export interface MesResumen { mes: string; lecturas: number; no_leidos_pendientes: number }

/** Meses con datos (por fecha de la primera lectura, hora de Buenos Aires). */
export async function listarMeses(run: Ejecutar): Promise<MesResumen[]> {
  const filas = await run(
    `SELECT ${MES} AS mes, count(DISTINCT l.id)::int AS lecturas,
            count(DISTINCT l.id) FILTER (WHERE n.id IS NOT NULL AND n.resuelto_en IS NULL)::int AS no_leidos_pendientes
     FROM lecturas l LEFT JOIN no_leidos n ON n.lectura_id = l.id
     GROUP BY 1 ORDER BY 1 DESC`,
    [TZ],
  );
  return filas as unknown as MesResumen[];
}

export interface FilaCierre extends Record<string, unknown> {
  id: string | number;
}

/** Todo lo del mes: lecturas + el texto de los no leídos pendientes. */
export async function filasDelMes(run: Ejecutar, mes: string): Promise<FilaCierre[]> {
  return (await run(
    `SELECT l.*, n.texto_extraido, n.resuelto_en
     FROM lecturas l LEFT JOIN no_leidos n ON n.lectura_id = l.id
     WHERE ${MES} = $2 ORDER BY l.id`,
    [TZ, mes],
  )) as FilaCierre[];
}

/** Borra las lecturas del mes con id <= maxId (lo que entró en el archivo). Los no leídos se borran en cascada. */
export async function borrarMes(run: Ejecutar, mes: string, maxId: number): Promise<number> {
  const borradas = await run(
    `DELETE FROM lecturas l WHERE ${MES} = $2 AND l.id <= $3 RETURNING l.id`,
    [TZ, mes, maxId],
  );
  return borradas.length;
}

const fechaHoraAr = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("es-AR", { timeZone: TZ, dateStyle: "short", timeStyle: "medium" }) : "";
const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const fechaIso = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : texto(v).slice(0, 10));

/** Excel del mes: hoja "Lecturas" y hoja "No leídos" (texto extraído de los pendientes). */
export async function armarExcel(filas: FilaCierre[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Lecturas");
  hoja.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Primera lectura", key: "creado", width: 20 },
    { header: "Última actualización", key: "actualizado", width: 20 },
    { header: "Veces leído", key: "veces", width: 11 },
    { header: "App", key: "app", width: 12 },
    { header: "Origen", key: "origen", width: 9 },
    { header: "Estado", key: "estado", width: 11 },
    { header: "Banco emisor", key: "banco_emisor", width: 20 },
    { header: "Monto", key: "monto", width: 16, style: { numFmt: "#,##0.00" } },
    { header: "Moneda", key: "moneda", width: 8 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Hora", key: "hora", width: 8 },
    { header: "Nro. de operación", key: "nro_operacion", width: 36 },
    { header: "Ordenante", key: "ordenante", width: 28 },
    { header: "CUIT ordenante", key: "cuit_ordenante", width: 14 },
    { header: "CBU/CVU origen", key: "cbu_origen", width: 26 },
    { header: "Banco origen", key: "banco_origen", width: 24 },
    { header: "CBU/CVU destino", key: "cbu_destino", width: 26 },
    { header: "Banco destino", key: "banco_destino", width: 24 },
    { header: "Alias destino", key: "alias_destino", width: 18 },
    { header: "Destinatario", key: "destinatario", width: 28 },
    { header: "Concepto", key: "concepto", width: 18 },
    { header: "Advertencias", key: "advertencias", width: 50 },
  ];
  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  for (const f of filas) {
    const adv = Array.isArray(f.advertencias) ? (f.advertencias as string[]).join(" | ") : texto(f.advertencias);
    hoja.addRow({
      id: Number(f.id),
      creado: fechaHoraAr(f.creado),
      actualizado: fechaHoraAr(f.actualizado),
      veces: Number(f.veces ?? 1),
      app: texto(f.app), origen: texto(f.origen), estado: texto(f.estado),
      banco_emisor: texto(f.banco_emisor),
      monto: f.monto === null || f.monto === undefined ? null : Number(f.monto),
      moneda: texto(f.moneda), fecha: fechaIso(f.fecha), hora: texto(f.hora),
      nro_operacion: texto(f.nro_operacion), ordenante: texto(f.ordenante), cuit_ordenante: texto(f.cuit_ordenante),
      cbu_origen: texto(f.cbu_origen), banco_origen: texto(f.banco_origen),
      cbu_destino: texto(f.cbu_destino), banco_destino: texto(f.banco_destino),
      alias_destino: texto(f.alias_destino), destinatario: texto(f.destinatario), concepto: texto(f.concepto),
      advertencias: adv,
    });
  }
  // Números largos (CBU, CUIT, nro. de operación) siempre como texto, para que Excel no los pase a notación científica
  for (const col of ["nro_operacion", "cuit_ordenante", "cbu_origen", "cbu_destino"]) hoja.getColumn(col).numFmt = "@";

  const pendientes = filas.filter((f) => f.texto_extraido && !f.resuelto_en);
  const hoja2 = libro.addWorksheet("No leídos");
  hoja2.columns = [
    { header: "ID lectura", key: "id", width: 11 },
    { header: "Texto extraído", key: "texto", width: 120 },
  ];
  hoja2.getRow(1).font = { bold: true };
  for (const f of pendientes) hoja2.addRow({ id: Number(f.id), texto: texto(f.texto_extraido) });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
