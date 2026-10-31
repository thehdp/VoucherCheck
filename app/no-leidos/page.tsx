import { revalidatePath } from "next/cache";
import { asegurarEsquema, hayDb, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function resolver(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  // Al resolverse se borra el texto extraído (datos personales de terceros)
  await sql()`UPDATE no_leidos SET resuelto_en = now(), texto_extraido = NULL WHERE id = ${id}`;
  revalidatePath("/no-leidos");
}

export default async function Page() {
  if (!hayDb()) return <main style={{ padding: 24 }}>Base de datos sin conectar (falta DATABASE_URL).</main>;
  await asegurarEsquema();
  const filas = await sql()`
    SELECT n.id, n.creado, n.texto_extraido, l.app, l.origen, l.estado, l.banco_emisor, l.monto, l.fecha,
           l.nro_operacion, l.advertencias
    FROM no_leidos n JOIN lecturas l ON l.id = n.lectura_id
    WHERE n.resuelto_en IS NULL ORDER BY n.creado DESC LIMIT 200`;
  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Comprobantes no leídos ({filas.length})</h1>
      {filas.length === 0 && <p>No hay casos pendientes.</p>}
      {filas.map((f) => (
        <section key={String(f.id)} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, margin: "12px 0" }}>
          <p>
            <b>#{String(f.id)}</b> · {new Date(String(f.creado)).toLocaleString("es-AR")} · app <b>{String(f.app)}</b> ·{" "}
            {String(f.origen)} · estado <b>{String(f.estado)}</b>
          </p>
          <p>
            Banco: {String(f.banco_emisor ?? "—")} · Monto: {String(f.monto ?? "—")} · Fecha: {String(f.fecha ?? "—")} · Op:{" "}
            {String(f.nro_operacion ?? "—")}
          </p>
          <ul>{(f.advertencias as string[]).map((a, i) => <li key={i}>{a}</li>)}</ul>
          <details>
            <summary>Texto extraído</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{String(f.texto_extraido ?? "")}</pre>
          </details>
          <form action={resolver}>
            <input type="hidden" name="id" value={String(f.id)} />
            <button type="submit">Marcar como resuelto (borra el texto)</button>
          </form>
        </section>
      ))}
    </main>
  );
}
