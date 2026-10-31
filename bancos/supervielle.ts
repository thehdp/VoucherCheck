import type { Parser } from "@/lib/tipos";
import { limpiarEspacios, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

/**
 * Supervielle pierde la coma decimal en el PDF: "$ 1.500.00000" es $ 1.500.000,00
 * (confirmado por Alberto). Los dos últimos dígitos son los centavos.
 */
function montoSupervielle(crudo: string | undefined): number | null {
  if (!crudo) return null;
  const m = crudo.match(/^(\d{1,3}(?:\.\d{3})*\.\d{3})(\d{2})$/);
  return normalizarMonto(m ? `${m[1]},${m[2]}` : crudo);
}

/** Bloque de texto entre dos etiquetas. */
function bloque(texto: string, desde: string, hasta: string): string {
  const i = texto.indexOf(desde);
  if (i < 0) return "";
  const resto = texto.slice(i + desde.length);
  const j = resto.indexOf(hasta);
  return j < 0 ? resto : resto.slice(0, j);
}

export const supervielle: Parser = {
  nombre: "Banco Supervielle",
  parsear(texto) {
    const origen = bloque(texto, "Cuenta origen", "Información de la operación");
    const [origenSolo, destinoBloque = ""] = origen.split("Cuenta destino");
    const primeraLinea = (b: string) => limpiarEspacios(b.split("\n").map((l) => l.trim()).filter(Boolean)[0]);
    const cuit = (b: string) => normalizarCuit(b.match(/CUIT \/ CUIL\s*\n\s*([\d-]+)/)?.[1]);
    const cbu = (b: string) => b.match(/\b(\d{22})\b/)?.[1] ?? null;

    return {
      monto: montoSupervielle(texto.match(/\$\s*([\d.]+)/)?.[1]),
      fecha: normalizarFecha(texto),
      hora: normalizarHora(texto.match(/\d{2}\/\d{2}\/\d{2,4}\s*[•·\-]\s*(\d{1,2}:\d{2})/)?.[1]),
      nro_operacion: limpiarEspacios(texto.match(/N[úu]mero de control\s*\n\s*([A-Za-z0-9]+)/)?.[1]),
      ordenante: primeraLinea(origenSolo),
      cuit_ordenante: cuit(origenSolo),
      cbu_origen: cbu(origenSolo),
      cbu_destino: cbu(destinoBloque),
      destinatario: primeraLinea(destinoBloque),
    };
  },
};
