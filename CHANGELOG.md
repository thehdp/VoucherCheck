# Historial de versiones

Cada cambio que llega a producción sube la versión (`lib/version.ts`) y suma una entrada acá, arriba de todo.
Formato del título: `## V<versión> · <AAAA-MM-DD>`.

## V1.0 · 2026-11-01
Primera versión.
- API `POST /api/leer` (PDF, JPG, PNG, WEBP) con clave por app, y `GET /api/salud`.
- Sin IA: extracción de texto (`unpdf`, `sharp` + `tesseract.js`) y reglas por banco.
- Bancos: Supervielle, Galicia (Office Banking y depósitos), Mercado Pago, Ualá, Lemon, ICBC, New Finance, Naranja X.
- Naranja X: el monto no se lee todavía (el OCR confunde el `$` con un dígito); sale `no_leido` con advertencia.
- Validación de CBU/CVU y tabla de entidades del BCRA.
- Registro en Neon (solo datos, sin archivos).
- Web de carga `/cargar` (con clave): arrastrar y soltar, botones para copiar monto, nombre, CUIT y OP, adaptada a celular.
