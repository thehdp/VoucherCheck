"use client";
import { useState } from "react";
import { aTextoPlano } from "@/lib/texto-plano";

export default function Cargador() {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function enviar(archivo: File) {
    setLeyendo(true);
    setError("");
    setTexto("");
    setCopiado(false);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const res = await fetch("/api/web/leer", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) setError(json.mensaje ?? "No se pudo leer el comprobante");
      else setTexto(aTextoPlano(json));
    } catch {
      setError("No se pudo conectar con el lector");
    } finally {
      setLeyendo(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar: seleccioná el texto y copialo a mano");
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <meta name="robots" content="noindex" />
      <h1>Leer comprobante</h1>
      <p>Subí un PDF o una imagen (JPG, PNG o WEBP, hasta 4 MB). El archivo no se guarda.</p>
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={leyendo}
        onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
      />
      {leyendo && <p>Leyendo… (las imágenes pueden tardar unos segundos)</p>}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {texto && (
        <>
          <textarea readOnly value={texto} rows={Math.min(24, texto.split("\n").length + 1)} style={{ width: "100%", marginTop: 16, fontFamily: "ui-monospace, monospace", fontSize: 15 }} />
          <button onClick={copiar} style={{ marginTop: 8, padding: "8px 16px" }}>
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </>
      )}
    </main>
  );
}
