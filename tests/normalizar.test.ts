import { describe, expect, it } from "vitest";
import { corregirNumerico, normalizarCuit, normalizarFecha, normalizarHora, normalizarMonto } from "@/lib/normalizar";

describe("normalizarMonto", () => {
  it.each([
    ["$ 15.000,50", 15000.5],
    ["$15.000", 15000],
    ["15000.50", 15000.5],
    ["15,000.50", 15000.5],
    ["1.234.567,89", 1234567.89],
    ["$ 0,99", 0.99],
  ])("%s", (e, n) => expect(normalizarMonto(e)).toBe(n));
  it("devuelve null si no hay número", () => expect(normalizarMonto("abc")).toBeNull());
});

describe("normalizarFecha", () => {
  it.each(["30/10/2026", "30-10-26", "30 oct 2026", "30 de octubre de 2026", "30.10.2026"])("%s", (f) =>
    expect(normalizarFecha(f)).toBe("2026-10-30"));
  it("rechaza fechas imposibles", () => expect(normalizarFecha("31/02/2026")).toBeNull());
});

describe("otros", () => {
  it("hora", () => {
    expect(normalizarHora("14:32:10")).toBe("14:32");
    expect(normalizarHora("2:32 PM")).toBe("14:32");
  });
  it("cuit", () => {
    expect(normalizarCuit("20-12345678-9")).toBe("20123456789");
    expect(normalizarCuit("123")).toBeNull();
  });
  it("ocr numérico", () => expect(corregirNumerico("2O1l3S")).toBe("201135"));
});
