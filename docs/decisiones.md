# Decisiones de diseño

## Solo se guardan datos, nunca archivos (corrección de Alberto)

- El lector **no guarda imágenes ni PDF**: ni en Vercel Blob ni en ningún otro lado. El archivo se procesa en memoria y se descarta.
- **Fase 3 cambia:** se elimina Vercel Blob. Neon Postgres guarda solo datos de texto:
  - Cada lectura: app que la hizo, fecha/hora, estado y los campos del JSON de respuesta.
  - Cada caso `no_leido`: el resultado parcial, las advertencias y el **texto extraído** (para poder corregir el parser y armar el test en `/tests/casos/`). Sin archivo original.
- Al resolverse un caso `no_leido`, se borra su texto extraído.
- Sigue valiendo: nada de datos personales en los logs de Vercel.
