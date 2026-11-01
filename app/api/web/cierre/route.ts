import { armarExcel, borrarMes, filasDelMes, listarMeses, mesValido } from "@/lib/cierre";
import { asegurarEsquema, ejecutorNeon, hayDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const sinBase = () => Response.json({ ok: false, mensaje: "La base de datos no está conectada" }, { status: 503 });

/** Cierre de mes (protegido por middleware). Sin parámetros: lista de meses. Con ?mes=AAAA-MM: descarga el Excel. */
export async function GET(req: Request) {
  if (!hayDb()) return sinBase();
  const run = ejecutorNeon();
  await asegurarEsquema(run);
  const mes = new URL(req.url).searchParams.get("mes");
  if (mes === null) return Response.json({ ok: true, meses: await listarMeses(run) }, { headers: { "Cache-Control": "no-store" } });
  if (!mesValido(mes)) return Response.json({ ok: false, mensaje: "Mes inválido (formato AAAA-MM)" }, { status: 400 });

  const filas = await filasDelMes(run, mes);
  if (filas.length === 0) return Response.json({ ok: false, mensaje: "Ese mes no tiene datos" }, { status: 404 });
  const maxId = Math.max(...filas.map((f) => Number(f.id)));
  const excel = await armarExcel(filas);
  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="comprobantes-${mes}.xlsx"`,
      "Cache-Control": "no-store",
      "X-Cierre-MaxId": String(maxId),
      "X-Cierre-Filas": String(filas.length),
      "Access-Control-Expose-Headers": "X-Cierre-MaxId, X-Cierre-Filas",
    },
  });
}

/** Borra el mes ya exportado. Exige confirmación escrita y el maxId del archivo descargado. */
export async function POST(req: Request) {
  if (!hayDb()) return sinBase();
  const cuerpo = await req.json().catch(() => null);
  const mes = cuerpo?.mes;
  const maxId = Number(cuerpo?.maxId);
  if (!mesValido(mes) || !Number.isInteger(maxId) || maxId < 1) {
    return Response.json({ ok: false, mensaje: "Faltan datos del archivo descargado" }, { status: 400 });
  }
  if (cuerpo?.confirmacion !== "BORRAR") {
    return Response.json({ ok: false, mensaje: 'Hay que escribir "BORRAR" para confirmar' }, { status: 400 });
  }
  const borradas = await borrarMes(ejecutorNeon(), mes, maxId);
  console.log(JSON.stringify({ evento: "cierre_de_mes", mes, borradas }));
  return Response.json({ ok: true, borradas });
}
