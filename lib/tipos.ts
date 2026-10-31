export type Estado = "completo" | "parcial" | "no_leido";

export interface Lectura {
  ok: boolean;
  estado: Estado;
  banco_emisor: string | null;
  monto: number | null;
  moneda: string | null;
  fecha: string | null;
  hora: string | null;
  nro_operacion: string | null;
  ordenante: string | null;
  cuit_ordenante: string | null;
  cbu_origen: string | null;
  banco_origen: string | null;
  cbu_destino: string | null;
  banco_destino: string | null;
  alias_destino: string | null;
  destinatario: string | null;
  concepto: string | null;
  advertencias: string[];
}

/** Lo que devuelve cada parser de banco (antes de normalizar CBU y estado). */
export type DatosParseados = Partial<Omit<Lectura, "ok" | "estado" | "advertencias">>;

export interface Parser {
  /** Nombre del banco emisor tal como sale en la respuesta. */
  nombre: string;
  parsear(texto: string): DatosParseados;
}

export const CAMPOS_OBLIGATORIOS = ["banco_emisor", "monto", "fecha", "nro_operacion"] as const;

export function lecturaVacia(): Lectura {
  return {
    ok: true,
    estado: "no_leido",
    banco_emisor: null,
    monto: null,
    moneda: null,
    fecha: null,
    hora: null,
    nro_operacion: null,
    ordenante: null,
    cuit_ordenante: null,
    cbu_origen: null,
    banco_origen: null,
    cbu_destino: null,
    banco_destino: null,
    alias_destino: null,
    destinatario: null,
    concepto: null,
    advertencias: [],
  };
}
