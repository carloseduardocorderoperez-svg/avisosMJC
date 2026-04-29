# Plan de publicación pública de avisos — Zona Omaha

Fecha: 2026-04-28

## Objetivo

Proveer una ruta pública en la web principal (`https://zonaomaha.onrender.com/avisos-semanales`) donde lectores puedan navegar y visualizar los "sets" de avisos que se publiquen desde el dashboard del administrador, sin depender de Google Sites. El sistema debe permitir: listado por fecha, navegación con menú collapsible, vista de cada set (renderizado consistente con la UI actual) y gestión desde el dashboard (publish/unpublish, slug público).

## Alcance

- Incluye: endpoints públicos para listar y servir sets publicados, interfaz pública en el frontend, UI en dashboard para publicar/despublicar sets, control de imágenes (proxy o Drive), caching básico.
- Excluye (opcional, fase 2): indexación avanzada/SEO, exportación masiva a CDN externa, multi-tenant, migración de Drive a S3 (aunque se recomiendan alternativas).

## Requisitos funcionales

- Página pública `/avisos-semanales` con lista de sets publicados, agrupada por fecha (mes/año o por semana). Menú lateral o collapsible para navegar.
- Página pública `/avisos-semanales/:slug` que muestre los avisos de un set (componentes reutilizados del cliente para mantener estilo).
- Dashboard: toggle "Publicar" / "Despublicar" + campo `publicSlug` editable; al publicar se valida slug único y se guarda `published=true`, `publicSlug`, `publishedAt`.
- Endpoints públicos (sin auth) mínimos: `GET /public/sets` y `GET /public/sets/:slug` (JSON). Opcional: `GET /public/sets/:slug/html` para iframe o clientes que requieran HTML listo.
- Badges/etiquetas en dashboard que indiquen el estado `published` y enlace directo a la URL pública.

## Requisitos no funcionales

- Seguridad: el contenido publicado debe estar sanitizado para evitar XSS. El editor debe seguir permitiendo HTML limitado, pero el servidor debe sanitizar.
- Rendimiento: caching por CDN o `Cache-Control` apropiado para endpoints públicos. Capacidad de invalidar cache al publicar o actualizar.
- Escalabilidad: soluciones estáticas opcionales para alto tráfico (pre-generar HTML y subir a Storage/CDN).
- Imágenes: si se mantienen en Google Drive, servir miniaturas a través del proxy backend `/images/thumb/:id` (ya existente). Alternativa: migración a storage si se desea control total.

 - Responsivo: la UI debe ser mobile-first y funcionar correctamente en pantallas móviles, tablets y desktop. Usar breakpoints consistentes, media-queries y componentes responsivos para asegurar buena legibilidad y navegación táctil.

## Diseño de datos (Firestore)

Modificar la colección `sets` añadiendo campos:

- `published` (boolean, default false)
- `publicSlug` (string, único cuando `published=true`)
- `publishedAt` (timestamp)
- `publicUrl` (string, opcional — útil si pre-renderizas y subes a storage)

Nota: no es necesario reescribir documentos existentes; campos nuevos pueden quedar null/undefined hasta que se publique.

## API pública (propuesta)

- `GET /public/sets`
  - Description: devuelve lista de sets publicados (metadatos).
  - Response: `[{ id, code, title, date, publicSlug, publishedAt, previewHtml? }...]`

- `GET /public/sets/:slug`
  - Description: devuelve el set (metadatos + avisos + bloques) en JSON.
  - Response: `{ set: {...}, avisos: [{...bloques...}] }`
  - Query option: `?format=html` o subruta `/html` para devolver HTML pre-renderizado.

- `POST /sets/:id/publish` (auth: admin)
  - Body: `{ published: true/false, publicSlug?: string }`
  - Behavior: valida slug, guarda campos `published`, `publicSlug`, `publishedAt` (cuando publica), opcionalmente pre-renderiza HTML o invalida cache.

- Reusar/proteger: las rutas de creación/edición actuales siguen siendo privadas.

## Implementación backend — notas técnicas

- Reutilizar o extraer lógica de render de bloques desde [server/htmlGenerator.js](server/htmlGenerator.js) para poder producir HTML desde el servidor cuando se requiera.
- Crear un router nuevo `server/routes/publicSets.js` o similar, y montar `app.use('/public', publicSetsRouter)` en `server/index.js` antes de middleware de auth (las rutas públicas deben quedar accesibles sin auth).
- Sanitizar contenido: usar `sanitize-html` o equivalente antes de enviar HTML a clientes o al generador. Evitar inyectar scripts.
- Cache-Control: `res.set('Cache-Control', 'public, max-age=60, s-maxage=3600')` y regenerar/invalidate al publicar.

## Implementación frontend — notas técnicas

- Nueva página `client/src/pages/PublicAvisos.jsx` (ruta `/avisos-semanales`) que consume `GET /public/sets`.
- Nueva página `client/src/pages/PublicAvisoView.jsx` (ruta `/avisos-semanales/:slug`) que consume `GET /public/sets/:slug` y renderiza avisos usando los componentes ya existentes (por ejemplo [client/src/components/blocks/BlockRenderer.jsx](client/src/components/blocks/BlockRenderer.jsx) y otras piezas). Esto evita duplicar lógica de render.
- Responsivo: diseñar las vistas con enfoque mobile-first; reutilizar clases y variables de estilo existentes, usar media-queries y comprobar comportamientos de menú collapsible y la legibilidad de bloques en pantallas pequeñas.
- UI: menú collapsible a la izquierda (o acorde con diseño actual) para agrupar por periodo; en la lista mostrar badge `Publicado` y botón/copiar `iframe` si se quiere dar esa opción.

## UX / Flujo de publicación

1. Admin crea/edita un set en el dashboard (flujo actual).
2. En el set hay control "Publicar" + `publicSlug` (autogenerar a partir de `code` si no se añade manualmente).
3. Al publicar, backend guarda `published=true` y `publishedAt` y devuelve `publicUrl`.
4. El frontend muestra el enlace público y badge.
5. Lectores visitan `/avisos-semanales` o enlace directo y ven el contenido.

## Imágenes

- Mantener Drive + permisos públicos es viable (como hoy). Recomendación mínima: usar el proxy `/images/thumb/:id` para servir thumbnails desde el backend y evitar exponer enlaces con permisos directos.
- Si se desea migrar, opción fase 2: copiar a Storage (Firebase Storage / S3) y servir vía CDN.

## Cache e invalidación

- Estrategia inicial: cache corto en edge (s-maxage 3600) y purga/invalidate al publicar. Si pre-renderizas HTML y subes a Storage, reemplazar objeto y dejar CDN servir.

## Seguridad

- Sanitizar textos que se inyecten como HTML.
- No exponer endpoints de edición.
- Para casos sensibles, permitir `visibility` = `unlisted` (slug difícil de adivinar) en vez de `public`.

## Criterios de aceptación

- [ ] `GET /public/sets` devuelve únicamente sets con `published=true`.
- [ ] `GET /public/sets/:slug` devuelve JSON completo y se puede renderizar en el frontend usando componentes existentes.
- [ ] Dashboard permite publicar/despublicar y muestra enlace público y badge en la lista.
- [ ] Imágenes en la vista pública se cargan correctamente (vía Drive público o proxy).
- [ ] Contenido publicado está sanitizado y no permite XSS.
- [ ] La página pública es responsiva y funciona correctamente en dispositivos móviles y tablets.

## Entregables y cronograma estimado (PoC)

Fase PoC (2-4 días):
- Día 1: Cambios backend — endpoints `GET /public/sets` y `GET /public/sets/:slug`, y `POST /sets/:id/publish` (placeholder que marca `published`).
- Día 2: Frontend — páginas `/avisos-semanales` y `/avisos-semanales/:slug` usando componentes existentes; agregar badge publicado en dashboard.
- Día 3: QA rápida, tests manuales, ajustar cache y sanitizado.

Fase 2 (opcional, 2-5 días): pre-render HTML estático, CDN, mejoras SEO, slug management avanzado.

## Riesgos y mitigaciones

- XSS por HTML libre: mitigar con sanitizado server-side.
- Slugs duplicados: validar unicidad al publicar.
- Imágenes rotas: comprobar permiso de Drive y/o usar proxy.
- Caching stale: invalidar cache al publicar y exponer `publishedAt` para debugging.

## Decisiones requeridas (por tu parte)

- ¿Prefieres la opción A (JSON → frontend render, recomendado) o la opción B (server HTML → iframe rápido)?
  - A: mejor integración visual y accesibilidad; requiere reutilizar componentes en frontend.
  - B: desarrollo más rápido; menos integrado.
- ¿Slug público editable o generado automáticamente? ¿Deseas modo `unlisted` por defecto?

## Próximos pasos propuestos (si confirmas opción A)

1. Implemento PoC backend: `GET /public/sets` y `GET /public/sets/:slug` (JSON) y endpoint `POST /sets/:id/publish` para togglear `published`.
2. Implemento PoC frontend: páginas `/avisos-semanales` y `/avisos-semanales/:slug` que reutilicen `BlockRenderer`.
3. Agrego badge/enlace en dashboard y botón para copiar iframe (opcional).
4. Tests manuales y despliegue en staging en Render.

---

Archivo(s) de referencia en el repo:
- [server/htmlGenerator.js](server/htmlGenerator.js)
- [server/driveUploader.js](server/driveUploader.js)
- [client/src/components/blocks/BlockRenderer.jsx](client/src/components/blocks/BlockRenderer.jsx)
- [client/src/pages/Avisos.jsx](client/src/pages/Avisos.jsx)

---

Si estás de acuerdo, procedo con el PoC (opción A: JSON → frontend). Indica si quieres cambios en el cronograma o si prefieres la opción B (HTML → iframe) en vez de la opción A.

## Registro de progreso

- 2026-04-28: Documento creado con plan y estimación de PoC.
- 2026-04-28: Añadidos requisitos de responsividad y criterios de aceptación.
- 2026-04-28: Implementación inicial PoC - backend:
  - Agregados endpoints públicos en `server/index.js`:
    - `GET /public/sets` — lista sets publicados (JSON)
    - `GET /public/sets/:slug` — devuelve JSON del set; soporta `?format=html` para HTML pre-renderizado
    - `POST /sets/:id/publish` — endpoint admin para publicar/despublicar sets
- 2026-04-28: Implementación inicial PoC - frontend:
  - Añadidas páginas públicas en `client/src/pages`:
    - `PublicAvisos.jsx` (ruta `/avisos-semanales`) — lista sets publicados
    - `PublicAvisoView.jsx` (ruta `/avisos-semanales/:slug`) — carga HTML pre-renderizado
  - Rutas registradas en `client/src/App.jsx`.

Siguientes pasos: implementar toggle UI en dashboard para publicar, validación de `publicSlug` en UI, tests manuales y ajustes de sanitizado/cache.

## Sincronización y manejo de edge-cases

Recomendación general: la publicación debe sincronizarse automáticamente con los cambios. No obligar al admin a "despublicar → editar → publicar" salvo en casos especiales. A continuación se describen patrones de implementación y comportamientos esperados.

- Flujo preferido (sincronización automática):
  - El frontend sigue trabajando contra los documentos `sets` (privados). Al guardar cambios en un set publicado, el servidor actualiza el documento y automáticamente regenera el HTML público o invalida el cache del endpoint público para que la vista pública muestre la versión más reciente.
  - Implementación práctica: cuando se ejecuta `PUT /sets/:id` y el set tiene `published=true`, el backend realiza uno de estos pasos:
    1) Regenerar HTML pre-renderizado y reemplazar el archivo público (o actualizar objeto en Storage/CDN), o
    2) Invalidate cache y dejar que el endpoint público lea directamente del documento actualizado (live-render desde DB). 
  - Elegir (1) si quieres mejor latencia y servir HTML estático por CDN; elegir (2) para simplicidad y coherencia inmediata.

- Comportamiento para publicar/despublicar:
  - `POST /sets/:id/publish` marcará `published=true` y guardará `publishedAt` y `publicSlug`. Si ya había `published=true`, publicar de nuevo solo actualizará `publishedAt` y regenerará/invalidadará (no es necesario despublicar primero).
  - Si el admin cambia contenido en un set ya publicado y guarda, el backend sincroniza automáticamente (regeneración o live-render). No es necesario despublicar manualmente.

- Manejo de eliminación y edge-cases críticos:
  - Eliminar un set que esté publicado: mostrar advertencia en dashboard y requerir confirmación explícita (modal) o forzar `unpublish` antes de permitir eliminar. Alternativa segura: soft-delete (marcar `deleted=true`) y mantener una opción para purgar.
  - Intento de publicar con `publicSlug` duplicado: el backend valida unicidad y devuelve error; la UI mostrará validación inline y sugerirá slugs alternativos (ej: agregar sufijo `-1`).
  - Concurrent edits: usar `updatedAt` y control optimista (si el cliente envía una versión antigua, rechazar y pedir recarga) o última escritura gana según tolerancia.
  - Fallos al generar HTML o al subir a Storage: dejar el documento marcado como `published=true` pero registrar `publicStatus: 'failed'` + `publicError` para auditoría y mostrar indicador en dashboard (badge de error). Reintentos automáticos en background o permitir reintento manual.
  - Imágenes eliminadas/rotas: al publicar, comprobar que todas las URLs de imágenes referenciadas responden; si no, marcar aviso en dashboard y permitir fallback (imagen placeholder) en la vista pública.

- Cache y CDN: siempre invalidar o regenerar al publicar/editar. Para live-render, usar `Cache-Control` corto y considerar ETag para validación.

- Auditoría y reversión: guardar `publishedHistory` (versiones mínimas o snapshot) para poder revertir a la versión anterior si un cambio rompe la vista pública.

UI/UX recomendaciones rápidas:
- Mostrar badge `Publicado` + enlace público y un pequeño estado `sync` (ok | syncing | error).
- Al editar un set publicado, mostrar aviso no intrusivo: "Este set está publicado — los cambios se sincronizarán automáticamente." y ofrecer botón "Guardar y publicar ahora" si se desea forzar regeneración inmediata.
- Antes de eliminar un set publicado, mostrar un modal que explique consecuencias y ofrezca opciones: "Despublicar y eliminar" o "Soft-delete".

Estos detalles están registrados aquí para que el equipo los implemente y pruebe durante el PoC.
