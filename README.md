# churros-web

## Historial de versiones

La página de descargas lee el historial desde `data/releases-niri.json` y `data/releases-xfce.json`. Al publicar una versión, actualiza también el archivo JSON de la edición correspondiente. Los feeds del servidor de descargas no permiten solicitudes entre dominios (CORS), por lo que el sitio usa estos archivos del mismo origen.