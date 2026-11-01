"use client";
import { useRef, useState } from "react";
import type { LecturaApi } from "@/lib/procesar";
import { aTextoPlano, montoParaCopiar } from "@/lib/texto-plano";
import { etiquetaVersion } from "@/lib/version";

export default function Cargador() {
  const [lectura, setLectura] = useState<LecturaApi | null>(null);
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(archivo: File) {
    setLeyendo(true);
    setError("");
    setLectura(null);
    setCopiado("");
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const res = await fetch("/api/web/leer", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) setError(json.mensaje ?? "No se pudo leer el comprobante");
      else setLectura(json);
    } catch {
      setError("No se pudo conectar con el lector");
    } finally {
      setLeyendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function copiar(clave: string, valor: string | null) {
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(clave);
      setTimeout(() => setCopiado((c) => (c === clave ? "" : c)), 1800);
    } catch {
      setError("No se pudo copiar: seleccioná el texto y copialo a mano");
    }
  }

  const botones: { clave: string; etiqueta: string; valor: string | null }[] = lectura
    ? [
        { clave: "monto", etiqueta: "Monto", valor: montoParaCopiar(lectura.monto) },
        { clave: "nombre", etiqueta: "Nombre y apellido", valor: lectura.ordenante },
        { clave: "cuit", etiqueta: "CUIT", valor: lectura.cuit_ordenante },
        { clave: "op", etiqueta: "OP", valor: lectura.nro_operacion },
      ]
    : [];
  const texto = lectura ? aTextoPlano(lectura) : "";

  return (
    <>
      <style>{`
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .wrap { max-width: 640px; margin: 0 auto; padding: 16px; }
        h1 { font-size: 1.4rem; margin: 8px 0 4px; }
        .ver { font-size: .8rem; font-weight: 400; opacity: .6; white-space: nowrap; }
        .zona { border: 2px dashed #888; border-radius: 14px; padding: 36px 16px; text-align: center; cursor: pointer; margin: 16px 0; }
        .zona.activa { border-color: #2563eb; background: rgba(37,99,235,.1); }
        .zona strong { display: block; font-size: 1.1rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
        .grid button { padding: 14px 8px; font-size: 1rem; border-radius: 10px; border: 1px solid #888; background: transparent; color: inherit; cursor: pointer; text-align: center; min-height: 64px; }
        .grid button small { display: block; opacity: .7; font-size: .8rem; word-break: break-all; }
        .grid button:disabled { opacity: .4; cursor: not-allowed; }
        .grid button.ok { background: #16a34a; color: #fff; border-color: #16a34a; }
        textarea { width: 100%; font-family: ui-monospace, monospace; font-size: .95rem; padding: 10px; border-radius: 10px; }
        .todo { width: 100%; padding: 12px; font-size: 1rem; margin-top: 8px; border-radius: 10px; border: 1px solid #888; background: transparent; color: inherit; cursor: pointer; }
        .error { color: #dc2626; }
        .repetido { background: #f59e0b; color: #000; padding: 10px 12px; border-radius: 10px; font-weight: 600; }
        @media (max-width: 420px) { .grid { grid-template-columns: 1fr; } .zona { padding: 28px 12px; } }
      `}</style>
      <main className="wrap">
        <h1>Leer comprobante <span className="ver">{etiquetaVersion()}</span></h1>
        <p>PDF o imagen (JPG, PNG, WEBP), hasta 4 MB. El archivo no se guarda.</p>

        <div
          className={`zona${arrastrando ? " activa" : ""}`}
          onClick={() => !leyendo && entrada.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !leyendo) enviar(f);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && entrada.current?.click()}
        >
          <strong>{leyendo ? "Leyendo… (las imágenes tardan unos segundos)" : "Arrastrá el comprobante acá"}</strong>
          {!leyendo && <span>o tocá para elegirlo o sacar una foto</span>}
          <input
            ref={entrada}
            type="file"
            hidden
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
          />
        </div>

        {error && <p className="error">{error}</p>}

        {lectura?.repetido && (
          <p className="repetido">
            ⚠ Este comprobante ya fue leído antes ({lectura.lecturas_previas === 1 ? "1 vez" : `${lectura.lecturas_previas} veces`}). Los datos se muestran igual.
          </p>
        )}

        {lectura && (
          <>
            <div className="grid">
              {botones.map((b) => (
                <button key={b.clave} disabled={!b.valor} className={copiado === b.clave ? "ok" : ""} onClick={() => copiar(b.clave, b.valor)}>
                  {copiado === b.clave ? "¡Copiado!" : `Copiar ${b.etiqueta}`}
                  <small>{b.valor ?? "no está en el comprobante"}</small>
                </button>
              ))}
            </div>
            <textarea readOnly value={texto} rows={Math.min(24, texto.split("\n").length + 3)} />
            <button className="todo" onClick={() => copiar("todo", texto)}>
              {copiado === "todo" ? "¡Copiado!" : "Copiar todo"}
            </button>
          </>
        )}
        <p style={{ marginTop: 32, opacity: 0.7 }}>
          <a href="/cierre" style={{ color: "inherit" }}>Cierre de mes (descargar Excel y limpiar la base)</a>
        </p>
      </main>
    </>
  );
}
