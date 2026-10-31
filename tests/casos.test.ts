import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { leerTexto } from "@/lib/leer";

// Cada caso: /tests/casos/<banco>/<n>.txt (texto extraído) + <n>.json (resultado esperado).
const raiz = path.join(__dirname, "casos");
const casos = fs.readdirSync(raiz).flatMap((banco) =>
  fs.readdirSync(path.join(raiz, banco)).filter((f) => f.endsWith(".txt")).map((f) => [banco, f.replace(".txt", "")] as const),
);

describe("casos reales por banco", () => {
  it.each(casos)("%s/%s", (banco, n) => {
    const texto = fs.readFileSync(path.join(raiz, banco, `${n}.txt`), "utf8");
    const esperado = JSON.parse(fs.readFileSync(path.join(raiz, banco, `${n}.json`), "utf8"));
    expect(leerTexto(texto)).toEqual(esperado);
  });
});
