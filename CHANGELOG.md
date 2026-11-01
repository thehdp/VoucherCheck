# Historial de versiones

Cada cambio que llega a producción sube la versión (`lib/version.ts`) y suma una entrada acá, arriba de todo.
Formato del título: `## V<versión> · <AAAA-MM-DD>`.

## V1.2 · 2026-11-01
- Registro sin duplicados: si se vuelve a leer el mismo comprobante (mismo banco, número de operación, monto y fecha) se pisa el registro anterior en vez de crear otro. Se conserva la app y la fecha de la primera lectura, y `veces` cuenta cuántas veces se leyó.
- Un caso no leído se guarda una sola vez, y se cierra solo (borrando el texto) cuando el mismo comprobante pasa a leerse completo.
- Limpieza única al desplegar: se borran los duplicados que ya estaban, dejando el más nuevo.
- Los comprobantes sin número de operación (o sin monto/fecha) no se pueden comparar: esos se siguen guardando cada vez.

## V1.1 · 2026-11-01
- Naranja X: ahora lee el monto. El OCR confundía el `$` chico con un dígito ("$ 5.000" salía "55.000"); se corrige por el tamaño del símbolo y solo en importes con puntos de miles que están solos en su línea.
- Tabla CBU: código 453 = Naranja X (confirmado por Alberto).
- Naranja X: número de operación = "Código de transacción" (confirmado).

## V1.0 · 2026-11-01
Primera versión.
- API `POST /api/leer` (PDF, JPG, PNG, WEBP) con clave por app, y `GET /api/salud`.
- Sin IA: extracción de texto (`unpdf`, `sharp` + `tesseract.js`) y reglas por banco.
- Bancos: Supervielle, Galicia (Office Banking y depósitos), Mercado Pago, Ualá, Lemon, ICBC, New Finance, Naranja X.
- Validación de CBU/CVU y tabla de entidades del BCRA.
- Registro en Neon (solo datos, sin archivos).
- Web de carga `/cargar` (con clave): arrastrar y soltar, botones para copiar monto, nombre, CUIT y OP, adaptada a celular.
