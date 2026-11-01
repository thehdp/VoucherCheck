# Casos no leídos (Neon)

Se ven y se resuelven desde el panel de Neon (SQL Editor). No hay página web.

## Ver los pendientes
```sql
SELECT n.id, n.creado, l.app, l.origen, l.estado, l.banco_emisor, l.monto, l.fecha, l.nro_operacion,
       l.advertencias, n.texto_extraido
FROM no_leidos n JOIN lecturas l ON l.id = n.lectura_id
WHERE n.resuelto_en IS NULL
ORDER BY n.creado DESC;
```

## Marcar como resuelto (borra el texto extraído, que tiene datos personales)
```sql
UPDATE no_leidos SET resuelto_en = now(), texto_extraido = NULL WHERE id = 123;
```

## Últimas lecturas
```sql
SELECT id, creado, app, estado, banco_emisor, monto, fecha, nro_operacion FROM lecturas ORDER BY id DESC LIMIT 50;
```
