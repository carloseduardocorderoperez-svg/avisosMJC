# Migración a Firebase Hosting (estático)

Fecha: 2026-05-19

## Resumen rápido
- Objetivo: mover la publicación pública de Render dinámico → Firebase Hosting (HTML estático), manteniendo el dashboard/admin en Render y sin romper funcionalidad.
- Stack: Node.js (Express) backend + React + Vite frontend. Firestore ya es la fuente de datos.
- Requisito clave: generar por cada set/aviso un HTML estático en `dist-public/{slug}/index.html` y mantener `dist-public/index.html` con listado.

## Contexto del repo (relevante)
- Backend: `server/` (Express). Rutas y generación HTML centralizadas en `server/htmlGenerator.js` y `server/index.js`.
- Plantilla HTML: `template/avisos_template.html`.
- Estilos de bloques: `client/src/styles/blocks.css` (leído por `htmlGenerator`).
- Output actual: `server/generateHTML()` escribe `output/avisos_generados.html`.
- Rutas públicas actuales expuestas por cliente: `/avisos-semanales` (debe respetarse).

## Archivos inspeccionados y hallazgos rápidos
- `server/htmlGenerator.js`:
  - Contiene lógica de render de bloques (`renderBloque`, `renderAviso`) y `generateHTML(options)`.
  - `generateHTML` usa `template/avisos_template.html`, embebe estilos desde `client/src/styles/blocks.css` y escribe `output/avisos_generados.html`.
  - Buena noticia: podemos reutilizar `renderBloque`/`renderAviso`/`generateHTML` como base para generación estática.
- `server/index.js`:
  - Rutas de administración (`/sets`, `/sets/:id/publish`, `/sets/:id/generar-html`, etc.).
  - Lógica de publicación actual actualiza `sets` en almacenamiento y devuelve `publicUrl` con base en `CLIENT_URL` y ruta `/avisos-semanales/{slug}`.
  - `POST /sets/:id/publish` ya valida slug y marca `published`/`publicSlug`.

## Plan de migración (pasos) — estado
1. Analizar arquitectura actual — hecho (inspeccionado `htmlGenerator.js` y `index.js`).
2. Identificar generación HTML actual — hecho parcial (función `generateHTML` entendida).
3. Crear utilidades `generateStaticAviso(set)` y `publishAviso(set)` — pendiente (implementación mínima en `server/` usando `fs/promises`).
4. Integrar publicación estática en backend (extender `POST /sets/:id/publish`) — pendiente.
5. Generar `dist-public/{slug}/index.html` y actualizar `dist-public/index.html` (listado) — pendiente.
6. Asegurar slugs únicos y sobrescritura (mantener lógica actual de `index.js`) — pendiente.
7. Añadir scripts `npm` para build y deploy (ej. `npm run build:static`, `npm run deploy:hosting`) — pendiente.
8. Documentar cambios y pasos de deploy (Firebase CLI y `firebase.json`) — pendiente.
9. Pruebas locales y validación (local `firebase serve` o `firebase emulators:start`) — pendiente.
10. Desplegar a Firebase Hosting (instrucciones) — pendiente.

## Último paso realizado (estado actual)
- Creada la lista de tareas (TODO) y marcado el primer paso como en progreso.
- Inspeccionados y entendidos `server/htmlGenerator.js` y `server/index.js` (puedo reutilizar la lógica de render para generar HTML estático).
- Confirmado: la ruta pública existente `/avisos-semanales/{slug}` debe seguir funcionando; la generación estática debe escribir `dist-public/{slug}/index.html` para que Firebase Hosting sirva la misma URL.

## Próximos pasos (inmediatos)
1. Implementar en `server/` una nueva utilidad `server/staticPublisher.js` que exporte `generateStaticAviso(set)` y `publishAviso(set)` usando `fs/promises`. `generateStaticAviso` reutilizará `renderAviso` / `generateHTML` (o extraerá la porción que genera HTML por set).
2. Modificar `POST /sets/:id/publish` en `server/index.js` para llamar a `publishAviso(updatedSet)` cuando `published === true` y, en caso de éxito, devolver `publicUrl` apuntando a `/avisos-semanales/{slug}`.
3. Escribir/actualizar `dist-public/index.html` con listado de sets publicados (cada publicación/actualización re-genera este índice).
4. Añadir scripts en `package.json` y documentación para `firebase deploy --only hosting`.

## Notas importantes y decisiones propuestas
- Mantener `generateHTML` para generar la versión completa (ya existente). Para archivos por set, crearemos una variante que inyecte solo los `avisos` del set y escriba en `dist-public/{slug}/index.html`.
- Mantendremos compatibilidad con edición posterior: publicar de nuevo simplemente sobrescribe `dist-public/{slug}/index.html`.
- `dist-public` será la carpeta que luego se suba a Firebase Hosting; su estructura:
  - `dist-public/index.html` (listado de sets publicados)
  - `dist-public/{slug}/index.html` (HTML del set)
- Preservar rutas existentes: Firebase Hosting deberá tener rewrites si hay rutas internas del cliente, pero como la URL `/avisos-semanales/{slug}` corresponde a archivos estáticos y al cliente React para dashboard en Render, no debe interferir.

---

Archivo creado por el agente para seguimiento.

## Cambios implementados (resumen)

- **server/htmlGenerator.js**: extraída la función `buildHTMLString(options)` que devuelve el HTML generado (sin escribir a disco). `generateHTML` sigue existiendo y ahora reutiliza `buildHTMLString` para compatibilidad.
- **server/staticPublisher.js**: nuevo utilitario con `generateStaticAviso(set)`, `publishAviso(set)` y `generateIndex()`; usa `fs/promises` y escribe en `dist-public/{slug}/index.html` y actualiza `dist-public/index.html`.
- **server/index.js**: la ruta `POST /sets/:id/publish` ahora intenta llamar a `publishAviso(updated)` tras marcar el set como `published`. La respuesta incluye un campo `staticPublish` con el resultado (para no romper la API existente en caso de error).
- **package.json**: añadidos los scripts `build:static`, `deploy:hosting` y `build-and-deploy`.

### Comandos rápidos

```bash
# Generar todos los avisos publicados en dist-public
npm run build:static

# Publicar un set concreto (por id|slug|code) desde CLI
node server/staticPublisher.js publish <id|slug|code>

# Generar y desplegar (requiere firebase cli + proyecto configurado)
npm run build-and-deploy
```

Si quieres, puedo añadir una sección con pasos de CI/CD y control de versiones para despliegue automático.

excelente, ahora mira, estoy revisando unos avisos de mi firebase app pero falta algo (la sidebar y algunos elementos como la fecha de aviso en la parte inferior que se despliega cuando haces hover en el icono de las tres lineas paralelas): todo esto lo puedes checar en PublicAvisosView.jsx tomando en consideracion los estilos que tiene, por favor generame algo igual para que se agregue automaticamente a los htmls generados