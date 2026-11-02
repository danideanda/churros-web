# Wiki general de ChurrOS — diseño de producto y contenido

## Intención

Convertir la acción **Wiki** del sitio oficial en el manual general, estable y confiable de ChurrOS. La wiki debe ayudar tanto a alguien que todavía no ha instalado el sistema como a quien necesita resolver un problema concreto, sin obligarlo a conocer la terminología de Arch Linux.

La documentación se escribirá en español y en Markdown dentro de la GitHub Wiki oficial de `ChurrOS-GNU-Linux/ChurrOS`. La misma información se publicará con una presentación más cuidada, búsqueda y navegación por capítulos en `churroslinux.org/wiki.html`.

## Público y momentos de uso

- Personas que quieren saber si ChurrOS es adecuado para su equipo.
- Personas que descargan, verifican, prueban o instalan ChurrOS 1.4.
- Usuarios de las ediciones estables Niri y XFCE que buscan aprender el escritorio.
- Usuarios que quieren instalar aplicaciones, actualizar o recuperar el sistema.
- Personas que necesitan diagnosticar un fallo y llegar rápido a una solución segura.
- Colaboradores que quieren corregir o ampliar una página desde GitHub.

## Objetivos

1. Ofrecer un recorrido completo desde la elección de edición hasta el mantenimiento y la recuperación.
2. Permitir encontrar una respuesta por búsqueda, capítulos, tarjetas de tareas, relaciones entre artículos y tabla de contenido.
3. Mantener una única fuente editorial en GitHub Wiki y reflejar sus cambios automáticamente en la web.
4. Usar el logo, los colores cálidos y las imágenes existentes de ChurrOS sin convertir la documentación en una landing page publicitaria.
5. Ser útil en móvil, teclado, lectores de pantalla, modo oscuro y conexiones lentas.
6. Publicar el contenido inicial completo en la GitHub Wiki oficial, no solo preparar la plataforma.
7. Probar estructura, enlaces, búsqueda, seguridad del HTML, sincronización y estados de error.

## No objetivos

- No documentar versiones beta, pre-beta ni ediciones experimentales como parte del producto estable.
- No presentar las variantes i686, Raspberry Pi o ARM sin ISO publicada como opciones recomendadas.
- No convertir la wiki pública en documentación interna completa del sistema de construcción.
- No mantener dos copias editables del mismo artículo.
- No depender de MediaWiki, una base de datos o autenticación propia para leer la documentación.

## Antiobjetivos

- Una portada con muchas tarjetas sin jerarquía ni recorrido claro.
- Artículos generados por volumen que repitan texto o hagan afirmaciones no verificadas.
- Búsqueda que solo encuentre títulos y no el cuerpo de los artículos.
- Cambios en GitHub Wiki que requieran editar manualmente la web.
- Cargar contenido remoto sin sanitizarlo.
- Romper el frontend existente, sus temas o la página de descargas.

## Fuente de verdad y sincronización

La fuente de verdad será `https://github.com/ChurrOS-GNU-Linux/ChurrOS/wiki`, cuyo repositorio Git es `https://github.com/ChurrOS-GNU-Linux/ChurrOS.wiki.git`.

Las páginas se escribirán en GitHub Flavored Markdown. `_Sidebar.md` definirá capítulos y orden; `_Footer.md` enlazará la web, el repositorio y la comunidad. Las imágenes reutilizarán URLs estables del repositorio oficial o recursos propios del sitio con texto alternativo. Un comentario HTML inicial, invisible al renderizarse, guardará metadatos opcionales con una convención documentada: capítulo, dificultad, tiempo, prerrequisitos y siguientes pasos. No se usará front matter visible.

El sitio web incluirá un generador determinista que:

1. Lee el clon de la GitHub Wiki.
2. Interpreta `_Sidebar.md` para obtener capítulos y orden.
3. Convierte Markdown a HTML seguro y extrae título, resumen, encabezados, texto de búsqueda y relaciones.
4. Rechaza enlaces internos rotos, páginas vacías, títulos duplicados y referencias beta/pre-beta en la navegación estable.
5. Produce `wiki-data/wiki.json`, consumido por el frontend estático.

Una GitHub Action del repositorio web clonará la wiki y regenerará el índice en ejecución manual, en cada cambio de la configuración web y de forma programada. Si el repositorio oficial habilita un `repository_dispatch` desde el evento `gollum`, la actualización será inmediata; sin ese secreto cruzado, la tarea programada garantiza convergencia automática. La Action confirmará que el nuevo índice es válido y lo guardará directamente en `main`, siguiendo el precedente del workflow de DistroWatch; si la rama protegida impide el commit, conservará el último JSON válido y dejará el fallo visible. La web mostrará la fecha y el commit de la última sincronización y enlazará cada artículo a “Editar en GitHub”.

La copia JSON versionada será el fallback de producción: la wiki seguirá legible aunque GitHub esté temporalmente inaccesible.

## Arquitectura editorial

La primera publicación tendrá una portada y los 56 artículos sustanciales enumerados en los ocho capítulos siguientes. El sistema será ampliable sin cambiar el frontend.

### Portada

- Home
- Empieza aquí: ruta de cinco pasos
- Búsquedas frecuentes
- Elegir Niri o XFCE
- Estado de la documentación y versión estable cubierta
- Artículos destacados y actualizados recientemente

### Capítulo 1 — Conocer ChurrOS

1. Qué es ChurrOS
2. Filosofía y principios
3. ChurrOS 1.4: alcance estable
4. Elegir entre Niri y XFCE
5. Requisitos del sistema
6. Compatibilidad de hardware

### Capítulo 2 — Descargar y probar

1. Descargar ChurrOS
2. Verificar la ISO con SHA-256
3. Crear un USB desde Linux
4. Crear un USB desde Windows
5. Crear un USB desde macOS
6. Probar la sesión Live
7. UEFI, BIOS y Secure Boot

### Capítulo 3 — Instalar

1. Preparar el equipo y las copias de seguridad
2. Instalar ChurrOS paso a paso
3. Particionado automático
4. Particionado manual y arranque dual
5. Cifrado y Btrfs
6. Después de instalar

### Capítulo 4 — Primeros pasos

1. Recorrido inicial
2. Conectarse a Internet y Bluetooth
3. Actualizar el sistema
4. Instalar y eliminar aplicaciones
5. Flatpak, repositorios oficiales y AUR
6. Usuarios, idioma, fecha y energía
7. Copias de seguridad y snapshots

### Capítulo 5 — Escritorios

1. Guía de Niri
2. Atajos de Niri
3. Noctalia, lanzador y controles rápidos
4. Personalizar Niri
5. Guía de XFCE
6. Personalizar XFCE
7. Aplicaciones propias de ChurrOS

### Capítulo 6 — Administración

1. Pacman y mantenimiento seguro
2. Servicios y registros del sistema
3. Discos, espacio y archivos
4. Impresoras y periféricos
5. Seguridad básica
6. Rollback con Btrfs

### Capítulo 7 — Resolver problemas

1. Diagnóstico rápido
2. El USB o el instalador no arranca
3. El sistema instalado no arranca
4. Pantalla, NVIDIA y gráficos
5. Wi-Fi, Ethernet y DNS
6. Audio y Bluetooth
7. Actualizaciones y paquetes rotos
8. Recuperación desde la ISO Live
9. Cómo pedir ayuda con buenos datos

### Capítulo 8 — Comunidad y referencia

1. Preguntas frecuentes
2. Glosario
3. Comandos útiles
4. Comunidad y soporte
5. Reportar errores
6. Contribuir a ChurrOS
7. Editar esta wiki
8. Licencias y créditos

Las páginas de historial solo incluirán versiones estables 1.0 o posteriores cuando aporten contexto útil. La portada y las rutas principales describirán 1.4.

## Modelo de artículo

Cada artículo tendrá:

- Un título único y una introducción que responda en dos o tres frases qué resolverá.
- Una etiqueta visual de capítulo, nivel y tiempo aproximado cuando corresponda.
- Un índice local generado desde los encabezados.
- Requisitos o advertencias antes de comandos potencialmente destructivos.
- Pasos numerados y bloques de código copiables.
- Estados “Qué debe ocurrir” y “Si algo sale mal” en guías críticas.
- Enlaces a prerequisitos y siguientes pasos.
- Enlace para editar la página en GitHub y fecha de última actualización.
- Referencias a la documentación oficial de Arch solo cuando amplían, no sustituyen, la explicación de ChurrOS.

## Experiencia web

### Dirección visual

La experiencia será editorial y técnica, no una cuadrícula genérica de producto. Usará una superficie marfil cálida, tinta casi negra, naranja ChurrOS como acento, bordes tostados, sombras suaves y modo oscuro café profundo. El logo oficial aparecerá en la cabecera; una imagen hero de ChurrOS se usará de forma contenida en la portada. La tipografía y los componentes existentes del sitio se conservarán para que la wiki se sienta nativa.

### Estructura de pantalla

- Cabecera global existente con **Wiki** marcada como acción actual.
- Masthead compacto con identidad ChurrOS, versión documentada y búsqueda prominente.
- Navegación lateral por capítulos en escritorio y panel desplegable en móvil.
- Área de lectura de 70–76 caracteres por línea.
- Índice contextual pegajoso, artículos relacionados y progreso del capítulo.
- Portada orientada a tareas: instalar, empezar, personalizar, mantener y reparar.
- Paleta de búsqueda con `Ctrl/Cmd + K`, coincidencias en título y contenido, y resaltado seguro.
- Migas de pan, URL compartible por artículo, botón copiar enlace y edición en GitHub.
- Estados de carga, vacío, sin conexión, sincronización antigua y error recuperable.

### Accesibilidad y rendimiento

- HTML semántico, foco visible, navegación completa por teclado y objetivo táctil mínimo de 44 px.
- Contraste WCAG AA, texto alternativo y avisos que no dependan solo del color.
- Respeto por `prefers-reduced-motion` y ausencia de animaciones decorativas continuas.
- JavaScript progresivo: un fallo de una interacción no elimina el artículo ya cargado; si JavaScript está deshabilitado, un bloque `noscript` dirige a la copia completa de GitHub Wiki. Las URLs existentes `wiki.html?article=…` siguen siendo compatibles y compartibles.
- Recursos locales, imágenes con dimensiones, carga diferida y sin nuevas fuentes bloqueantes.

## Verificación

### Contenido

- Todos los enlaces internos resuelven.
- No hay títulos duplicados ni artículos vacíos.
- La portada, el sidebar y el índice contienen todos los capítulos obligatorios.
- Las páginas estables no recomiendan beta, pre-beta ni variantes experimentales.
- La versión estable visible es 1.4 y coincide con el repositorio oficial.

### Generador y seguridad

- La misma entrada produce el mismo JSON.
- Markdown, Unicode, nombres con espacios y acentos se convierten correctamente.
- HTML peligroso, URLs `javascript:` y manejadores `on*` no llegan al DOM.
- Una wiki remota inaccesible no elimina el fallback publicado.
- El commit y la fecha de la fuente quedan registrados.

### Interfaz

- Búsqueda por título, cuerpo, acentos y sin resultados.
- Navegación por capítulo, artículo, ancla, atrás/adelante y enlace directo.
- Vista responsiva en móvil, tableta y escritorio.
- Modo claro, oscuro, teclado y movimiento reducido.
- Auditoría de consola, enlaces, accesibilidad básica y capturas visuales.

## Despliegue

El cambio se publicará en el repositorio web sin mezclar modificaciones ajenas de la página de descargas. Se ejecutarán pruebas unitarias, de contenido, seguridad y navegador; después se comprobará el sitio desplegado y la respuesta de `wiki.html` y `wiki-data/wiki.json`.

La integración MediaWiki/OAuth existente no se eliminará en esta entrega. Quedará intacta como compatibilidad operativa, pero la experiencia pública leerá el export de GitHub Wiki. No se migrará el historial antiguo de MediaWiki; las rutas y parámetros actuales de `wiki.html` continuarán resolviendo a sus artículos equivalentes.

La edición de GitHub Wiki dependerá de la política del repositorio oficial: colaboradores con permiso podrán editar directamente y el resto verá la guía para proponer una corrección. Esta entrega tiene autorización para sembrar o reemplazar las dos páginas actuales de la wiki oficial con la estructura nueva solicitada.

Las afirmaciones de producto se validarán contra `VERSION`, `README.md`, `docs/`, configuraciones y scripts del repositorio oficial en `main` para ChurrOS 1.4. Las operaciones de Arch Linux, particionado, cifrado, arranque y recuperación se contrastarán además con documentación primaria de Arch. Las guías potencialmente destructivas incluirán verificación previa del dispositivo, copia de seguridad, resultado esperado y ruta de recuperación; no se presentarán como comprobadas en hardware que no se haya probado.

La sincronización programada se considerará parte del despliegue. La actualización inmediata mediante `repository_dispatch` quedará activa solo si existe un token con permiso mínimo para el repositorio web; la implementación no incrustará secretos ni bloqueará el modo programado.

## Decisiones tomadas por el implementador

- GitHub Wiki oficial de `ChurrOS-GNU-Linux/ChurrOS` como única fuente editable.
- Markdown como formato editorial y JSON estático como formato de entrega.
- ChurrOS 1.4, Niri y XFCE como alcance estable visible.
- Sin base de datos ni sesión propia para la lectura o edición.
- Sin reemplazar el frontend existente ni introducir un framework.
- Conservar MediaWiki/OAuth sin usarlo como fuente pública en esta entrega.
- Publicar el JSON válido directamente desde la Action para disparar el despliegue existente.
- Sin incluir el trabajo no relacionado ya presente en `download.html`.
