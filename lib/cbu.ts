import tabla from "@/datos/bancos-cbu.json";

interface EntradaTabla {
  codigo: string;
  tipo: "banco" | "cvu";
  nombre: string;
  fuente: string;
  pendiente: boolean;
}

const ENTRADAS = (tabla as { entidades: EntradaTabla[] }).entidades;

function digitoVerificador(digitos: string, ponderadores: number[]): number {
  const suma = ponderadores.reduce((acc, p, i) => acc + p * Number(digitos[i]), 0);
  return (10 - (suma % 10)) % 10;
}

/** Valida los dos dígitos verificadores de un CBU/CVU de 22 dígitos. */
export function validarCbu(cbu: string): boolean {
  if (!/^\d{22}$/.test(cbu)) return false;
  const b1 = cbu.slice(0, 8);
  const b2 = cbu.slice(8);
  return (
    digitoVerificador(b1, [7, 1, 3, 9, 7, 1, 3]) === Number(b1[7]) &&
    digitoVerificador(b2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(b2[13])
  );
}

export function esCvu(cbu: string): boolean {
  return /^000/.test(cbu);
}

export interface Entidad {
  nombre: string;
  tipo: "banco" | "cvu";
  pendiente: boolean;
}

/**
 * Busca el banco (CBU) o proveedor (CVU) en la tabla.
 * Para CVU el proveedor se identifica por los dígitos siguientes al 000
 * (posiciones 4-7 del bloque de sucursal); solo se resuelve si está cargado.
 */
export function buscarEntidad(cbu: string): Entidad | null {
  if (!/^\d{22}$/.test(cbu)) return null;
  const codigo = esCvu(cbu) ? cbu.slice(0, 8) : cbu.slice(0, 3);
  const tipo = esCvu(cbu) ? "cvu" : "banco";
  const e = ENTRADAS.find((x) => x.tipo === tipo && x.codigo === codigo);
  return e ? { nombre: e.nombre, tipo: e.tipo, pendiente: e.pendiente } : null;
}
