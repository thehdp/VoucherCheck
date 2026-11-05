import { describe, expect, it } from "vitest";
import { detectarBanco } from "@/lib/detectar-banco";

const lista = [
  { banco: "a", frases: ["frase suelta"] },
  { banco: "b", todas: ["uno", "dos"] },
];

describe("detectarBanco", () => {
  it("frases: alcanza con una", () => expect(detectarBanco("hola Frase Suelta chau", lista)).toBe("a"));
  it("todas: tienen que estar todas", () => {
    expect(detectarBanco("uno y dos", lista)).toBe("b");
    expect(detectarBanco("solo uno", lista)).toBeNull();
  });
  it("ignora tildes y mayúsculas", () => expect(detectarBanco("UNO, dós", [{ banco: "b", todas: ["uno", "dos"] }])).toBe("b"));
  it("ninguna → null", () => expect(detectarBanco("nada", lista)).toBeNull());
});
