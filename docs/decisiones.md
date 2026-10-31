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
| Galicia, depósito en efectivo (ticket de cajero, imagen) | `nro_operacion` = los 21 dígitos de "Nro Operacion", **sin** el dígito de "Estado" que baja a la línea siguiente. `ordenante` = `"DEPOSITANTE"` (los depósitos no traen ordenante). El titular de la cuenta va como `destinatario`. Sin CBU. |
| Lemon (imagen) | `nro_operacion` = "ID de la transacción" (no el "COELSA ID"). |
| Ualá (imagen) | `nro_operacion` = "Id. Op.". |
