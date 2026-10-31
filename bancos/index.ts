import type { Parser } from "@/lib/tipos";
import { galicia } from "./galicia";
import { supervielle } from "./supervielle";

/** Un parser por banco. La clave es la misma que usa /bancos/firmas.json. */
export const PARSERS: Record<string, Parser> = { galicia, supervielle };
