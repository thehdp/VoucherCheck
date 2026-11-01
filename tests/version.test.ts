import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FECHA_VERSION, VERSION, etiquetaVersion } from "@/lib/version";

describe("versión", () => {
  it("la primera entrada de CHANGELOG.md coincide con lib/version.ts", () => {
    const md = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
    const primera = md.match(/^## V(\S+) · (\d{4}-\d{2}-\d{2})/m);
    expect(primera?.[1]).toBe(VERSION);
    expect(primera?.[2]).toBe(FECHA_VERSION);
  });
  it("etiqueta con fecha al lado", () => expect(etiquetaVersion()).toMatch(/^V\d+\.\d+ · \d{2}\/\d{2}\/\d{4}$/));
  it("el header de next.config.mjs tiene la misma versión", () => {
    const cfg = fs.readFileSync(path.join(__dirname, "..", "next.config.mjs"), "utf8");
    expect(cfg).toContain(`"X-Lector-Version", value: "${VERSION}"`);
  });
});
