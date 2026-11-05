import { describe, expect, it } from "vitest";
import { leerTexto } from "@/lib/leer";
import { validarClave } from "@/lib/auth";

describe("leerTexto", () => {
  it("sin banco ni datos → no_leido, sin inventar nada", () => {
    const r = leerTexto("texto cualquiera");
    expect(r.estado).toBe("no_leido");
    expect(r.monto).toBeNull();
    expect(r.advertencias.length).toBeGreaterThan(0);
  });
});

describe("validarClave", () => {
  const env = '{"tienda":"abc123","pedidos":"xyz789"}';
  it("devuelve la app", () => expect(validarClave("xyz789", env)).toBe("pedidos"));
  it("rechaza inválida o ausente", () => {
    expect(validarClave("nope", env)).toBeNull();
    expect(validarClave(null, env)).toBeNull();
    expect(validarClave("abc123", undefined)).toBeNull();
  });
});

import { elegirMejor, puntaje } from "@/lib/leer";
import { lecturaVacia } from "@/lib/tipos";

describe("segunda pasada de OCR: elegirMejor", () => {
  const completa = { ...lecturaVacia(), banco_emisor: "X", monto: 1, fecha: "2026-01-01", nro_operacion: "1" };
  const sinMonto = { ...completa, monto: null };
  it("puntúa por campos obligatorios", () => expect(puntaje(completa)).toBeGreaterThan(puntaje(sinMonto)));
  it("se queda con la que tiene más campos", () => {
    expect(elegirMejor({ lectura: sinMonto, id: 1 }, { lectura: completa, id: 2 }).id).toBe(2);
  });
  it("si empatan, se queda con la primera", () => {
    expect(elegirMejor({ lectura: completa, id: 1 }, { lectura: { ...completa }, id: 2 }).id).toBe(1);
  });
  it("no cambia a una peor", () => {
    expect(elegirMejor({ lectura: completa, id: 1 }, { lectura: sinMonto, id: 2 }).id).toBe(1);
  });
  it("a igual cantidad de campos, prefiere la de menos advertencias", () => {
    expect(elegirMejor({ lectura: { ...completa, advertencias: ["a", "b"] }, id: 1 }, { lectura: completa, id: 2 }).id).toBe(2);
  });
});
