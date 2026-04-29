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
