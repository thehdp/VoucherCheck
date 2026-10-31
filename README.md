# VoucherCheck — Lector de comprobantes bancarios

Servidor Next.js (Vercel, Node) que lee comprobantes de transferencias argentinas y devuelve JSON. Sin IA en tiempo de ejecución.

- `POST /api/leer` (header `x-api-key`, `multipart/form-data` campo `archivo`)
- `GET /api/salud`
- Tests: `npm test` · Variables: ver `.env.example`

Solo se guardan datos, nunca archivos (ver `docs/decisiones.md`).

Estado: **Fase 1** (PDF + validación de CBU + tabla CBU + Supervielle y Galicia). Pendiente de la tabla CBU: cargar el listado oficial del BCRA.
