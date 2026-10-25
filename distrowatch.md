# Integracion dinamica de estadisticas de DistroWatch

La seccion `#distrowatch` ya no depende de valores escritos a mano. En produccion consulta la ficha de DistroWatch en el servidor y muestra el ranking y las visitas diarias actuales. Si la consulta falla, usa `data/distrowatch.json` como respaldo.

Ficha consultada: <https://distrowatch.com/table.php?distribution=churros>

## Como funciona

1. `lib/distrowatch.js` descarga la ficha y extrae:
   - `Popularity: N (M hits per day)`.
   - `Last Update: AAAA-MM-DD HH:MM UTC`.
   - Las metricas por periodo (12 meses, 6 meses, 3 meses, 4 semanas, 1 semana).
   - La valoracion media de los visitantes.
   Si la descarga directa falla, reintenta con el lector publico `r.jina.ai` y parsea el mismo contenido en texto plano.
2. `api/distrowatch.js` expone esos datos como JSON en `GET /api/distrowatch`. La respuesta se cachea 15 minutos en el CDN de Vercel y la funcion tiene un limite de 20 segundos.
3. `js/app.js` carga el historial local y luego consulta `/api/distrowatch`. Si la respuesta es valida, actualiza las metricas, agrega la captura del dia al grafico y muestra el estado `Datos en vivo`.
4. Si `/api/distrowatch` no esta disponible (por ejemplo con Live Server en local), la seccion sigue mostrando el historial de `data/distrowatch.json`.

No se necesita ninguna dependencia adicional de Node: el parser usa expresiones regulares sobre el HTML de DistroWatch y el Markdown del lector de respaldo. DistroWatch puede bloquear la petición HTML directa (por ejemplo, con HTTP 403); el respaldo es parte normal del flujo, no un caso excepcional.

## Historial automatico

`.github/workflows/distrowatch.yml` ejecuta `scripts/update-distrowatch.js` todos los dias a las 06:17 UTC (o manualmente desde la pestana Actions). El script:

- Consulta DistroWatch.
- Inserta o reemplaza la captura del dia en `data/distrowatch.json`.
- Hace commit solo si cambio el ranking, las visitas o la fecha de la ficha.

Ese commit dispara el despliegue de Vercel y mantiene el grafico con historial persistente. Tambien puedes ejecutarlo en local:

```bash
node scripts/update-distrowatch.js
```

## Contrato de `data/distrowatch.json`

```json
{
  "sourceUrl": "https://distrowatch.com/table.php?distribution=churros",
  "history": [
    {
      "date": "AAAA-MM-DD",
      "listingUpdatedAt": "AAAA-MM-DD",
      "popularityRank": 410,
      "pageHitsPerDay": 31
    }
  ]
}
```

- `date`: fecha UTC de la captura.
- `listingUpdatedAt`: fecha de ultima actualizacion indicada en la ficha de DistroWatch.
- `popularityRank`: ranking de popularidad; no representa descargas ni instalaciones.
- `pageHitsPerDay`: visitas diarias reportadas; no representa descargas ni usuarios unicos.

`history` debe estar ordenado cronologicamente. El navegador valida fechas e enteros antes de graficar. Si no hay datos locales ni respuesta del API, las metricas quedan en `--` y la seccion muestra `Datos no disponibles`.

## Prueba local

Ejecuta `npm test` para verificar el parser HTML, el formato Markdown actual de DistroWatch, la extracción de ranking/visitas/períodos/valoración y el fallback tras un HTTP 403.

El endpoint `/api` solo existe cuando el sitio corre en Vercel o con `vercel dev`. Con Live Server u otro servidor estatico, la web cae automaticamente al JSON local. Para probar el parser sin desplegar:

```bash
node -e "require('./lib/distrowatch').fetchDistroWatch().then(console.log)"
```
