import { NextResponse, type NextRequest } from "next/server";

/** Protege /no-leidos con usuario "admin" y la clave de ADMIN_PASSWORD (Basic Auth). */
export function middleware(req: NextRequest) {
  const clave = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("authorization");
  if (clave && auth?.startsWith("Basic ")) {
    const [usuario, ...resto] = atob(auth.slice(6)).split(":");
    if (usuario === "admin" && resto.join(":") === clave) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="VoucherCheck"' },
  });
}

export const config = { matcher: ["/no-leidos/:path*"] };
