import { generico } from "@/bancos/generico";
import { PARSERS } from "@/bancos";
import { buscarEntidad, validarCbu } from "@/lib/cbu";
import { detectarBanco } from "@/lib/detectar-banco";
import { CAMPOS_OBLIGATORIOS, lecturaVacia, type Lectura } from "@/lib/tipos";

/** Del texto extraído al JSON final. Sin IA: solo reglas. */
export function leerTexto(texto: string): Lectura {
  const out = lecturaVacia();
  const clave = detectarBanco(texto);
  const parser = clave ? PARSERS[clave] : undefined;
  if (clave && !parser) out.advertencias.push(`Banco detectado (${clave}) sin parser; se usó el genérico`);
  if (!clave) out.advertencias.push("No se pudo identificar el banco emisor");

  const datos = (parser ?? generico).parsear(texto);
  const { advertencias: avisosParser = [], ...campos } = datos;
  Object.assign(out, campos);
  out.advertencias.push(...avisosParser);
  if (parser) out.banco_emisor = datos.banco_emisor ?? parser.nombre;
  if (out.monto !== null && !out.moneda) out.moneda = "ARS";

  for (const lado of ["origen", "destino"] as const) {
    const cbu = out[`cbu_${lado}`];
    if (!cbu) continue;
    if (!validarCbu(cbu)) {
      out.advertencias.push(`CBU ${lado} no valida dígito verificador`);
      continue;
    }
    const e = buscarEntidad(cbu);
    if (!e) out.advertencias.push(`CBU ${lado}: entidad no encontrada en la tabla`);
    else if (e.pendiente) out.advertencias.push(`CBU ${lado}: entidad ${e.nombre} pendiente de confirmar, no se completa el banco`);
    else out[`banco_${lado}`] = e.nombre;
  }

  // Un número de operación con largo raro casi seguro es un error de OCR: se avisa, no se corrige.
  if (out.banco_emisor === "New Finance" && out.nro_operacion && !/^[0-9a-f]{32}$/.test(out.nro_operacion)) {
    out.advertencias.push("nro_operacion con largo inesperado (posible error de OCR)");
  }
  if (out.banco_emisor === "Banco Galicia" && out.ordenante === "DEPOSITO" && out.nro_operacion === null) {
    out.advertencias.push("nro_operacion del depósito ilegible (posible error de OCR)");
  }

  const faltan = CAMPOS_OBLIGATORIOS.filter((c) => out[c] === null);
  if (faltan.length) {
    out.estado = "no_leido";
    out.advertencias.push(`Faltan campos obligatorios: ${faltan.join(", ")}`);
  } else if (out.advertencias.some((a) => a.includes("no valida") || a.includes("posible error de OCR"))) {
    out.estado = "parcial";
  } else {
    out.estado = "completo";
  }
  return out;
}
