import { FECHA_VERSION, VERSION } from "@/lib/version";

export function GET() {
  return Response.json({ ok: true, version: VERSION, fecha: FECHA_VERSION });
}
