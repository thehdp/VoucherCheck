import { describe, expect, it } from "vitest";
import { corregirSignoPesos } from "@/lib/extraer/ocr";

const s = (text: string, alto: number) => ({ text, bbox: { y0: 0, y1: alto } });

describe("corregirSignoPesos", () => {
  // Medidas reales del importe de Naranja X: el "$" mide 70 y los dígitos 108-110
  const importe = { text: "55.000", symbols: [s("5", 70), s("5", 108), s(".", 26), s("0", 110), s("0", 110), s("0", 110)] };
  it("el primer dígito mucho más bajo es un $", () => expect(corregirSignoPesos(importe)).toBe("$5.000"));
  it("no toca si el primer dígito tiene el mismo alto", () => {
    expect(corregirSignoPesos({ ...importe, symbols: [s("5", 108), ...importe.symbols.slice(1)] })).toBeNull();
  });
  it("no toca números sin puntos de miles (ej: 084)", () => {
    expect(corregirSignoPesos({ text: "084", symbols: [s("0", 40), s("8", 70), s("4", 70)] })).toBeNull();
  });
  it("no toca si hay más palabras en la línea", () => expect(corregirSignoPesos(importe, 3)).toBeNull());
});
