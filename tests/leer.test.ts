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
