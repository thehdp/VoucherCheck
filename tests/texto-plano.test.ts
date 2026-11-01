import { describe, expect, it } from "vitest";
import { aTextoPlano } from "@/lib/texto-plano";
import { lecturaVacia } from "@/lib/tipos";

describe("aTextoPlano", () => {
  it("formatea y omite lo que no está", () => {
    const r = { ...lecturaVacia(), estado: "parcial" as const, banco_emisor: "Banco Supervielle", monto: 1500000, moneda: "ARS", fecha: "2026-10-30", hora: "22:53", nro_operacion: "PDX4", advertencias: ["algo raro"] };
    const t = aTextoPlano(r);
    expect(t).toContain("Fecha: 30/10/2026");
    expect(t).toContain("Hora: 22:53");
    expect(t).toMatch(/Monto: 1\.500\.000,00 ARS/);
    expect(t).not.toContain("Ordenante");
    expect(t).toContain("⚠ algo raro");
  });
});
