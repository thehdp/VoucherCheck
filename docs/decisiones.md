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

## Sin duplicados en el registro
- Un comprobante es "el mismo" si coinciden banco emisor, nro de operación, monto y fecha (los cuatro cargados). Al repetirse se pisa el registro (`INSERT … ON CONFLICT DO UPDATE`), se conserva la `app` y el `creado` de la primera lectura y se suma `veces`.
- Si no están los cuatro datos no se puede comparar y se guarda cada lectura.
- El SQL se prueba contra un Postgres real: `TEST_DATABASE_URL=postgres://… npm test` (sin esa variable esas pruebas se saltean).

## Cierre de mes (`/cierre`)
- **Manual**, no automático: el Excel no se guarda en ningún lado (decisión de no guardar archivos), así que la base nunca se borra sola. Se elige el mes, se descarga el Excel y recién después se habilita borrar (hay que escribir BORRAR).
- Solo se borra el mes exportado, y solo las lecturas con `id <= maxId` del archivo descargado. Los no leídos se borran en cascada. El mes en curso se puede exportar pero se avisa.
- Mes = mes de la primera lectura (`creado`), en hora de Buenos Aires.
- Al borrar un mes se pierde el control de duplicados contra ese mes: si se vuelve a leer un comprobante viejo, se registra como nuevo.
- Probado con Postgres real (`TEST_DATABASE_URL`) y con un navegador simulado.

## Aviso de comprobante repetido en la API
- Si el comprobante ya estaba registrado (mismo banco, nro de operación, monto y fecha), la respuesta trae igual todos los datos y suma: `repetido: true`, `lecturas_previas` (N, sin contar la lectura actual), `primera_lectura` (ISO) y un texto en `advertencias`. Si no es repetido (o la base no está disponible): `repetido: false`, `lecturas_previas: 0`, `primera_lectura: null`.
- No se informa qué app lo leyó primero. El estado no cambia por ser repetido.
- Funciona sobre lo que hay en la base: al cerrar un mes se borra, y un comprobante de ese mes se vuelve a ver como nuevo.
- Sin número de operación no se puede comparar. Alberto: no va a ser un problema porque la imagen va a ser la misma.

## Reglas confirmadas el 2026-11-01
- **Galicia Office Banking:** `nro_operacion` = "Identificador de la operación".
- **Mercado Pago:** `nro_operacion` = "Código de identificación" (no el "N.º de operación de Mercado Pago").
- Los parsers se van corrigiendo a medida que Alberto pasa casos raros (OCR, ICBC en PDF, formatos nuevos). La tabla de bancos se va alimentando con lo que confirme.

## Personal Pay
- `nro_operacion` = "N° de operación" (nunca el Coelsa ID / "Id Bancario"). `ordenante` = "Envía". `banco_origen` = "Banco/Billetera de origen" del comprobante ("Personal Pay"). "Entidad no Registrada" como banco destino se ignora y se completa con la tabla CBU.
- El OCR en modo por defecto salteaba el importe ("$ 76.100"); el modo 3 (automático) sí lo lee, pero cambia el orden del texto de las demás imágenes y no se usa como default. Por eso es una segunda pasada solo cuando la primera no sale completa (`lib/procesar.ts`, `elegirMejor` en `lib/leer.ts`).

## Banco Patagonia
- Firma por formato (`cuit / cuil / dni`) porque el logo no se lee por OCR. `nro_operacion` = "Nº de transacción" (confirmado por Alberto el 2026-11-05; el "Nº de control" tiene formato tipo Coelsa y no se usa). `ordenante` tal como viene (`APELLIDO, NOMBRE`).

## Botón "Copiar Monto"
- Copia solo el número, sin símbolos ni puntos de miles. Si los centavos son cero se copia sin decimales (`33000`); si no, con coma (`15000,50`). Pedido de Alberto el 2026-11-05.

## Lecciones del OCR (V1.6)
- **Escala:** Tesseract lee mejor texto de ~25-40 px de alto. Agrandar una captura que ya es ancha (≥ 1000 px) la rompe; se lleva a 1200 px. Las imágenes chicas se agrandan al doble (mínimo 2000 px).
- **Nunca `completo` con datos dudosos:** si un campo con formato fijo (UUID, hexadecimal, CBU) no cumple el formato, se avisa y el estado queda `parcial`. No se corrige a ciegas.
- **Segunda pasada** (modo de segmentación automático): solo cuando faltan campos obligatorios. Cambia el orden del texto, así que si la primera pasada tiene todo lo obligatorio se respeta, para no perder los nombres.
- Se probó releer solo la palabra del Id. Op. con un alfabeto restringido (0-9, a-f, guion): pierde caracteres y en otros comprobantes empeora. Descartado.
- Caso de regresión guardado: `tests/casos/uala/3` es la lectura mala original (monto `$4`, CVU de 23 caracteres, Id. Op. basura): debe salir `parcial` con advertencias, nunca `completo` limpio.

## Pendientes abiertos (cierre de la conversación del 2026-11-01)
- **Fase 4:** `/docs/conexion.md` y la primera app conectada. Falta que Alberto arme la app (nombre y tecnología).
- **OCR:** puede confundir caracteres en fotos (ej. un `%` por un `8`, o `8629` por `86a9`); los errores que cambian el formato se avisan, los que no, no se pueden detectar.
- **ICBC:** solo probado como imagen; si llega como PDF puede requerir ajuste.
- **Tabla CBU:** las compañías financieras de 5 dígitos están pendientes; solo hay 4 proveedores de CVU cargados (Mercado Pago, Pago Virtual del Sur, New Finance y Ualá Bank como banco).
- **Clave `tienda`:** es la de prueba. Al conectar la app real, crear su propia clave en `API_KEYS` y sacar la de prueba.
