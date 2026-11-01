# Decisiones de diseño

## Solo se guardan datos, nunca archivos (corrección de Alberto)

- El lector **no guarda imágenes ni PDF**: ni en Vercel Blob ni en ningún otro lado. El archivo se procesa en memoria y se descarta.
- **Fase 3 cambia:** se elimina Vercel Blob. Neon Postgres guarda solo datos de texto:
  - Cada lectura: app que la hizo, fecha/hora, estado y los campos del JSON de respuesta.
  - Cada caso `no_leido`: el resultado parcial, las advertencias y el **texto extraído** (para poder corregir el parser y armar el test en `/tests/casos/`). Sin archivo original.
- Al resolverse un caso `no_leido`, se borra su texto extraído.
- Sigue valiendo: nada de datos personales en los logs de Vercel.

## Reglas de campos confirmadas por Alberto

Estas reglas se aplican al escribir cada parser (algunas llegan recién en la fase 2, con las imágenes).

| Banco / app | Regla |
|---|---|
| Supervielle (PDF) | `nro_operacion` = "Número de control". El monto pierde la coma: `$ 1.500.00000` = 1.500.000,00 (últimos 2 dígitos = centavos). |
| Galicia Office Banking (PDF) | Firma: "office banking". `nro_operacion` = "Identificador de la operación". `hora` null (la del PDF es de impresión). |
| Galicia, depósito en efectivo (ticket de cajero, imagen) | `nro_operacion` = los 21 dígitos de "Nro Operacion", **sin** el dígito de "Estado" que baja a la línea siguiente. `ordenante` = `"DEPOSITO"` (los depósitos no traen ordenante). El titular de la cuenta va como `destinatario`. Sin CBU. |
| Lemon (imagen) | `nro_operacion` = "ID de la transacción" (no el "COELSA ID"). |
| Ualá (imagen) | `nro_operacion` = "Id. Op.". |

### Regla general: el ID Coelsa no se usa nunca

- El "ID Coelsa" / "COELSA ID" no se usa como `nro_operacion` en ningún banco ni app.
- Comprobante tipo "Finalizada" (banco sin identificar): `nro_operacion` = "Nro. de operación".

### Depósitos: confirmado
`ordenante` = `"DEPOSITO"` (confirmado por Alberto, reemplaza a "DEPOSITANTE").

## Reglas confirmadas en la fase 2
- **ICBC:** el importe viene negativo (`$ -794.000,00`) pero es positivo: se guarda el valor absoluto. `nro_operacion` = "Nro de movimiento". `banco_emisor` = "ICBC" (código 015 en la lista del BCRA). El comprobante se probó solo como imagen (OCR); si llega como PDF puede cambiar el orden del texto y hay que ajustar con un caso real.
- **Depósitos de Galicia:** si el OCR no lee la fecha del ticket, se toma del número de operación (dígitos 9 a 14 = AAMMDD) y se agrega una advertencia. Si ambas fechas existen y no coinciden, se avisa.
- **Proveedores CVU:** Mercado Pago, Pago Virtual del Sur y New Finance quedan confirmados por Alberto; si alguno estuviera mal, se corrige en `datos/bancos-cbu.json`.

## Fase 3 (registro)
- Neon guarda `lecturas` (todas) y `no_leidos` (las que no quedan `completo`, con el texto extraído). Sin Blob ni archivos.
- **No hay ninguna web pública.** El único acceso desde internet es la API (`/api/leer` con clave y `/api/salud`); la raíz da 404 y todo lleva `noindex`. Los casos no leídos se ven y se resuelven desde el panel de Neon con las consultas de `docs/no-leidos.md`.
- Si no hay `DATABASE_URL` o falla la base, el lector sigue respondiendo y no registra.

## Web de carga (`/cargar`)
- Página para subir un comprobante y copiar los datos en texto plano. Detrás de usuario `admin` y la clave de `ADMIN_PASSWORD` (Basic Auth, middleware), con `noindex`, sin enlaces desde ningún lado y raíz en 404.
- Usa `/api/web/leer` (también protegido) y la misma lógica que la API. Registra con app `web`. No guarda el archivo.
- La URL existe en internet pero está bloqueada con clave. Alternativa más cerrada: protección de despliegues de Vercel (obligaría a las otras apps a mandar un header de bypass).

## Versiones
- El lector tiene versión y fecha (`lib/version.ts`), empezando en **V1.0 · 01/11/2026**. Se ve en `/cargar` (junto al título), en `GET /api/salud` (`version`, `fecha`) y en el header `X-Lector-Version` de las respuestas.
- Cada cambio que llega a producción: subir `VERSION` y `FECHA_VERSION`, el header en `next.config.mjs` y una entrada nueva arriba en `CHANGELOG.md`. Un test falla si no coinciden.

## Naranja X
- `nro_operacion` = "Código de transacción". Monto: el OCR confunde el `$` con un dígito ("$ 5.000" → "55.000"), por eso no se lee y queda `no_leido` con advertencia. Se probaron otros preprocesados y el modelo `spa` de mayor calidad (incompatible con el motor del servidor): sin solución confiable por ahora.
