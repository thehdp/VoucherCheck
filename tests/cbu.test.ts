import { describe, expect, it } from "vitest";
import { esCvu, validarCbu } from "@/lib/cbu";

/** CBU/CVU REALES sacados de comprobantes de Alberto (verificados con el algoritmo). */
describe("validarCbu con CBU/CVU reales", () => {
  it.each([
    "0270065620057590300025", // CBU Supervielle
    "0000046800000159185229", // CBU Prestigio Pagos (Pago Virtual del Sur)
    "0000003100043103826391", // CVU Mercado Pago
    "0000003100038727339550", // CVU Mercado Pago
    "0000290700000000020972", // cuenta origen del comprobante tipo \"Finalizada\" (banco sin identificar)
  ])("%s", (c) => expect(validarCbu(c)).toBe(true));
});

/**
 * CBU SINTÉTICOS: armados a mano aplicando los ponderadores del enunciado para
 * probar el algoritmo. Falta sumar CBU/CVU reales de comprobantes (pendiente de Alberto).
 */
function armar(b1sin: string, b2sin: string): string {
  const dv = (d: string, p: number[]) => (10 - (p.reduce((a, x, i) => a + x * +d[i], 0) % 10)) % 10;
  return b1sin + dv(b1sin, [7, 1, 3, 9, 7, 1, 3]) + b2sin + dv(b2sin, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]);
}

describe("validarCbu", () => {
  const ok = armar("0070001", "0000123456789");
  it("acepta uno válido", () => expect(validarCbu(ok)).toBe(true));
  it("rechaza dígito verificador roto", () => {
    const roto = ok.slice(0, 7) + ((+ok[7] + 1) % 10) + ok.slice(8);
    expect(validarCbu(roto)).toBe(false);
  });
  it("rechaza segundo bloque roto", () => {
    const roto = ok.slice(0, 21) + ((+ok[21] + 1) % 10);
    expect(validarCbu(roto)).toBe(false);
  });
  it("rechaza largo incorrecto", () => expect(validarCbu("123")).toBe(false));
  it("detecta CVU", () => {
    expect(esCvu(armar("0000001", "0000123456789"))).toBe(true);
    expect(esCvu(ok)).toBe(false);
  });
});

import { buscarEntidad } from "@/lib/cbu";
describe("buscarEntidad (tabla BCRA)", () => {
  it("banco por los 3 primeros dígitos", () => {
    expect(buscarEntidad("0270065620057590300025")?.nombre).toBe("BANCO SUPERVIELLE S.A.");
    expect(buscarEntidad("3840200500000033928869")?.nombre).toBe("UALA BANK S.A.U.");
  });
  it("CVU de Mercado Pago (confirmado por Alberto)", () => {
    const e = buscarEntidad("0000003100043103826391");
    expect(e?.nombre).toBe("Mercado Pago");
    expect(e?.pendiente).toBe(false);
  });
  it("CVU de New Finance (confirmado por Alberto en su app)", () => {
    const e = buscarEntidad("0000290700000000020972");
    expect(e?.nombre).toBe("NEW FINANCE");
    expect(e?.pendiente).toBe(false);
  });
  it("CVU desconocido → null", () => expect(buscarEntidad("0000999900000000000000")).toBeNull());
});
