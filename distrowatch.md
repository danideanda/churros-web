# Integracion de estadisticas de DistroWatch

La seccion `#distrowatch` carga datos desde `data/distrowatch.json`. DistroWatch no proporciono una API publica estable en la ficha consultada, por lo que la integracion usa capturas manuales verificables en vez de scraping automatico del HTML.

Ficha consultada: <https://distrowatch.com/table.php?distribution=churros>

## Captura registrada

Consulta realizada el 2026-09-29. La ficha de ChurrOS mostro Popularidad 520 (6 visitas diarias) y una ultima actualizacion de la ficha el 2026-09-25.

- `popularityRank`: numero de popularidad mostrado por DistroWatch; no representa descargas ni instalaciones.
- `pageHitsPerDay`: visitas diarias reportadas por DistroWatch; no representa descargas ni usuarios unicos.
- `date`: fecha en que se consultaron y registraron los valores.
- `listingUpdatedAt`: fecha de ultima actualizacion indicada dentro de la ficha de DistroWatch.

## Actualizar el registro

1. Abre la ficha de ChurrOS y localiza el valor `Popularidad: N (M Visitas diarias)` y `Ultima actualizacion: AAAA-MM-DD`.
2. Agrega un objeto al final de `history` en `data/distrowatch.json`.
3. Pon en `date` la fecha de consulta, no la fecha de ultima actualizacion de la ficha. Copia esa ultima fecha en `listingUpdatedAt`.
4. Registra los valores numericos tal como aparecen y conserva las capturas anteriores para que el grafico tenga historial.
5. Verifica la pagina por HTTP/HTTPS despues de publicar. El navegador solicita el JSON del mismo origen; al abrir `index.html` directamente como `file://`, el navegador puede bloquear `fetch`.

Ejemplo de una nueva entrada (reemplaza los valores con los que muestra la ficha en esa consulta):

```json
{
  "date": "AAAA-MM-DD",
  "listingUpdatedAt": "AAAA-MM-DD",
  "popularityRank": 520,
  "pageHitsPerDay": 6
}
```

## Contrato del archivo

`data/distrowatch.json` contiene `sourceUrl` y `history`, una lista de capturas ordenadas cronologicamente. Cada entrada requiere los cuatro campos del ejemplo. No agregues estimaciones ni interpolaciones: si solo existe una captura en el periodo elegido, el grafico dibuja una sola barra y lo indica como tal.

El JavaScript valida el formato y los enteros antes de mostrar los valores. Si el archivo falta o no es valido, las metricas permanecen como `--` y la seccion informa que no pudo cargarlo. La serie se filtra por los periodos de 30, 90 y 365 dias.