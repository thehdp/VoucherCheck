# Historial de versiones

Cada cambio que llega a producción sube la versión (`lib/version.ts`) y suma una entrada acá, arriba de todo.
Formato del título: `## V<versión> · <AAAA-MM-DD>`.

## V1.4 · 2026-11-01
- La API avisa cuando un comprobante ya fue leído antes, sin dejar de entregar los datos. La respuesta suma tres campos: `repetido` (true/false), `lecturas_previas` (cuántas veces se leyó antes de esta) y `primera_lectura` (fecha ISO, o `null`), y agrega un texto en `advertencias`: "Este comprobante ya fue leído antes (N veces; primera lectura 30/10/2026 22:53)". El estado no cambia por ser repetido.
- La web `/cargar` muestra un cartel naranja cuando el comprobante ya se leyó.
- Mercado Pago: `nro_operacion` ahora es el "Código de identificación" (antes el "N.º de operación"). Confirmado por Alberto.
- Galicia Office Banking: `nro_operacion` = "Identificador de la operación" (confirmado).

## V1.3 · 2026-11-01
- Cierre de mes (`/cierre`, con clave): lista los meses con datos, descarga un Excel del mes (hoja "Lecturas" con todos los campos y hoja "No leídos" con el texto de los pendientes) y permite borrar de la base solo ese mes.
- Protecciones: el botón de borrar aparece recién después de descargar, hay que escribir BORRAR, y solo se borra lo que entró en el archivo (lo que se cargó después de descargar se conserva). Los no leídos del mes se borran con él.
- El mes se cuenta por la primera lectura, en hora de Buenos Aires.
- Enlace al cierre de mes al pie de `/cargar`.

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
