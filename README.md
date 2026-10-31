# VoucherCheck — Lector de comprobantes bancarios

Servidor Next.js (Vercel, Node) que lee comprobantes de transferencias argentinas y devuelve JSON. Sin IA en tiempo de ejecución.

- `POST /api/leer` (header `x-api-key`, `multipart/form-data` campo `archivo`)
- `GET /api/salud`
- Tests: `npm test` · Variables: ver `.env.example`

Solo se guardan datos, nunca archivos (ver `docs/decisiones.md`).

Estado: **Fase 2** (OCR de imágenes con sharp + tesseract.js). Bancos: Supervielle, Galicia (PDF y depósito), Mercado Pago, Ualá, Lemon, New Finance. Pendiente: ICBC.
