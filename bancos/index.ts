import type { Parser } from "@/lib/tipos";
import { galicia } from "./galicia";
import { lemon } from "./lemon";
import { mercadopago } from "./mercadopago";
import { newfinance } from "./newfinance";
import { supervielle } from "./supervielle";
import { uala } from "./uala";

/** Un parser por banco. La clave es la misma que usa /bancos/firmas.json. */
export const PARSERS: Record<string, Parser> = { galicia, lemon, mercadopago, newfinance, supervielle, uala };
