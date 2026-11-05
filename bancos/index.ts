import type { Parser } from "@/lib/tipos";
import { galicia } from "./galicia";
import { icbc } from "./icbc";
import { lemon } from "./lemon";
import { mercadopago } from "./mercadopago";
import { naranjax } from "./naranjax";
import { patagonia } from "./patagonia";
import { personalpay } from "./personalpay";
import { newfinance } from "./newfinance";
import { supervielle } from "./supervielle";
import { uala } from "./uala";

/** Un parser por banco. La clave es la misma que usa /bancos/firmas.json. */
export const PARSERS: Record<string, Parser> = { galicia, icbc, lemon, mercadopago, naranjax, newfinance, patagonia, personalpay, supervielle, uala };
