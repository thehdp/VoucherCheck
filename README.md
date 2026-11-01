# VoucherCheck — Lector de comprobantes bancarios

Servidor Next.js (Vercel, Node) que lee comprobantes de transferencias argentinas y devuelve JSON. Sin IA en tiempo de ejecución.

- `POST /api/leer` (header `x-api-key`, `multipart/form-data` campo `archivo`: PDF, JPG, PNG o WEBP, hasta 4 MB)
- `GET /api/salud` (devuelve la versión)
- `/cargar` y `/cierre`: web con usuario y clave (`ADMIN_PASSWORD`) para leer un comprobante y para el cierre de mes
- Tests: `npm test` (con `TEST_DATABASE_URL=postgres://…` corre también las pruebas contra Postgres) · Variables: ver `.env.example`

Versión actual y historial: `CHANGELOG.md`. Decisiones y reglas por banco: `docs/decisiones.md`. Casos no leídos: `docs/no-leidos.md`.

Estado: fases 1 a 3 hechas. **Fase 4 pendiente** (`/docs/conexion.md` y la primera app conectada): falta definir la app.
