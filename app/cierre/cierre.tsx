"use client";
import { useCallback, useEffect, useState } from "react";
import { etiquetaVersion } from "@/lib/version";

interface Mes { mes: string; lecturas: number; no_leidos_pendientes: number }
interface Descarga { maxId: number; filas: number }

const NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMes = (m: string) => `${NOMBRES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const mesActual = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 7);

export default function Cierre() {
  const [meses, setMeses] = useState<Mes[] | null>(null);
  const [descargas, setDescargas] = useState<Record<string, Descarga>>({});
  const [confirmaciones, setConfirmaciones] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/web/cierre", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) setAviso({ tipo: "error", texto: json.mensaje ?? "No se pudo cargar" });
    else setMeses(json.meses);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function descargar(mes: string) {
    setOcupado(mes);
    setAviso(null);
    try {
      const res = await fetch(`/api/web/cierre?mes=${mes}`);
      if (!res.ok) throw new Error((await res.json()).mensaje ?? "Error");
      const maxId = Number(res.headers.get("X-Cierre-MaxId"));
      const filas = Number(res.headers.get("X-Cierre-Filas"));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `comprobantes-${mes}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setDescargas((d) => ({ ...d, [mes]: { maxId, filas } }));
      setAviso({ tipo: "ok", texto: `Archivo de ${nombreMes(mes)} descargado (${filas} registros). Revisalo y, si está bien, ya podés borrar ese mes.` });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo descargar" });
    } finally {
      setOcupado("");
    }
  }

  async function borrar(mes: string) {
    const d = descargas[mes];
    if (!d) return;
    setOcupado(mes);
    setAviso(null);
    try {
      const res = await fetch("/api/web/cierre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, maxId: d.maxId, confirmacion: confirmaciones[mes] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.mensaje ?? "No se pudo borrar");
      setAviso({ tipo: "ok", texto: `Se borraron ${json.borradas} registros de ${nombreMes(mes)}.` });
      setDescargas((x) => { const c = { ...x }; delete c[mes]; return c; });
      setConfirmaciones((x) => { const c = { ...x }; delete c[mes]; return c; });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo borrar" });
    } finally {
      setOcupado("");
    }
  }

  return (
    <>
      <style>{`
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .wrap { max-width: 640px; margin: 0 auto; padding: 16px; }
        h1 { font-size: 1.4rem; margin: 8px 0 4px; }
        .ver { font-size: .8rem; font-weight: 400; opacity: .6; white-space: nowrap; }
        .mes { border: 1px solid #888; border-radius: 12px; padding: 14px; margin: 12px 0; }
        .mes h2 { margin: 0 0 4px; font-size: 1.1rem; text-transform: capitalize; }
        .mes p { margin: 2px 0 10px; opacity: .8; }
        button { padding: 12px; font-size: 1rem; border-radius: 10px; border: 1px solid #888; background: transparent; color: inherit; cursor: pointer; width: 100%; }
        button:disabled { opacity: .4; cursor: not-allowed; }
        button.peligro { background: #dc2626; color: #fff; border-color: #dc2626; margin-top: 8px; }
        input { width: 100%; padding: 10px; font-size: 1rem; border-radius: 8px; border: 1px solid #888; margin-top: 8px; background: transparent; color: inherit; }
        .ok { color: #16a34a; } .error { color: #dc2626; }
        a { color: inherit; }
      `}</style>
      <main className="wrap">
        <h1>Cierre de mes <span className="ver">{etiquetaVersion()}</span></h1>
        <p>1) Descargá el Excel del mes. 2) Revisalo. 3) Borrá ese mes de la base. Lo que descargues no se guarda en ningún otro lado: si borrás sin guardar el archivo, esos datos se pierden.</p>
        <p><a href="/cargar">← Volver a leer comprobantes</a></p>
        {aviso && <p className={aviso.tipo}>{aviso.texto}</p>}
        {meses === null && !aviso && <p>Cargando…</p>}
        {meses?.length === 0 && <p>No hay datos guardados.</p>}
        {meses?.map((m) => {
          const d = descargas[m.mes];
          const enCurso = m.mes === mesActual();
          return (
            <section className="mes" key={m.mes}>
              <h2>{nombreMes(m.mes)}{enCurso && <span style={{ textTransform: "none", fontWeight: 400, opacity: 0.7 }}> (mes en curso)</span>}</h2>
              <p>{m.lecturas} comprobantes · {m.no_leidos_pendientes} no leídos pendientes</p>
              <button disabled={ocupado !== ""} onClick={() => descargar(m.mes)}>
                {ocupado === m.mes && !d ? "Armando el archivo…" : d ? "Descargar de nuevo" : "Descargar Excel"}
              </button>
              {d && (
                <>
                  <p style={{ marginTop: 12 }}>
                    Se descargaron {d.filas} registros. {enCurso && <b>Ojo: es el mes en curso, se seguirán cargando datos nuevos. </b>}
                    Para borrarlos, escribí <b>BORRAR</b>:
                  </p>
                  <input
                    value={confirmaciones[m.mes] ?? ""}
                    onChange={(e) => setConfirmaciones((c) => ({ ...c, [m.mes]: e.target.value }))}
                    placeholder="BORRAR"
                    autoCapitalize="characters"
                  />
                  <button className="peligro" disabled={ocupado !== "" || confirmaciones[m.mes] !== "BORRAR"} onClick={() => borrar(m.mes)}>
                    Borrar {nombreMes(m.mes)} de la base
                  </button>
                </>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
