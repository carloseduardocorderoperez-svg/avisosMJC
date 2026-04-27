# 📋 MJC Avisos IA - Documentación del Proyecto

## 🎯 Visión General

**MJC Avisos IA** es una aplicación web que automatiza la creación de anuncios parroquiales a partir de presentaciones en PDF. Utiliza inteligencia artificial para analizar diapositivas y convertirlas en anuncios web estructurados, facilitando el trabajo de las comunidades religiosas.

### 🎯 Objetivo Principal

Transformar el proceso manual de crear anuncios parroquiales desde presentaciones de PowerPoint/PDF hasta páginas web publicables, reduciendo tiempo y errores humanos mientras mantiene la calidad y estructura profesional.

### 💡 Problema que Resuelve

- **Antes**: Sacerdotes y administradores debían transcribir manualmente anuncios de presentaciones
- **Después**: Subida automática de PDF → Análisis IA → Página web generada automáticamente

---

## 🚀 Funcionalidades Principales

### 1. 🔐 Autenticación Google OAuth
- Login restringido únicamente al email autorizado (`omaha.zona@gmail.com`)
- Sesiones seguras con JWT tokens
- Protección de rutas del frontend

### 2. 📊 Dashboard de Gestión
- Vista general de todos los sets de anuncios creados
- Creación, duplicación y eliminación de sets
- Navegación intuitiva entre diferentes secciones

### 3. 📤 Carga y Procesamiento de PDFs
- Upload de archivos PDF con presentaciones de anuncios
- Conversión automática de páginas PDF a imágenes
- Procesamiento por lotes de múltiples diapositivas

### 4. 🤖 Análisis con Inteligencia Artificial
- Integración con OpenAI GPT para análisis de imágenes
- Extracción estructurada de información de anuncios
- Clasificación automática por categorías y prioridades

### 5. ✏️ Editor Visual de Anuncios
- Interfaz drag-and-drop para reorganizar anuncios
- Editor de texto enriquecido con TipTap
- Componentes modulares: texto, imágenes, listas, tablas, enlaces
- Vista previa en tiempo real

### 6. 🎨 Generación de Páginas Web
- Templates HTML responsivos y profesionales
- Agrupación automática por categorías
- Exportación a HTML estático para publicación

### 7. ☁️ Almacenamiento en la Nube
- Base de datos Firebase Firestore
- Almacenamiento de imágenes en Google Drive
- Sincronización automática entre dispositivos

---

## 🏗️ Arquitectura del Sistema

### 📁 Estructura del Proyecto

```
mjc-avisos-ia/
├── client/                 # Frontend React + Vite
│   ├── public/            # Assets estáticos
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── store/         # Estado global (Zustand)
│   │   ├── utils/         # Utilidades y API client
│   │   └── styles/        # CSS y estilos
├── server/                 # Backend Node.js + Express
│   ├── auth.js            # Autenticación JWT/Google OAuth
│   ├── dataStore.js       # Firebase Firestore integration
│   ├── pdfProcessor.js    # Procesamiento de PDFs
│   ├── aiExtractor.js     # Integración con OpenAI
│   └── index.js           # Servidor principal y rutas API
├── data/                   # Datos estructurados (JSON)
├── images/                 # Imágenes generadas de PDFs
├── output/                 # HTML generado final
├── template/               # Templates base
└── docs/                   # Documentación del proyecto
```

### 🛠️ Tecnologías Utilizadas

#### Frontend
- **React 19** - Framework principal
- **Vite** - Build tool y dev server
- **React Router** - Navegación SPA
- **Zustand** - State management
- **TipTap** - Editor de texto enriquecido
- **@dnd-kit** - Drag and drop functionality
- **Tailwind CSS** - Styling framework
- **Lucide React** - Iconos

#### Backend
- **Node.js + Express** - Servidor web
- **JWT** - Autenticación de tokens
- **Google APIs** - OAuth2 y Google Drive
- **Firebase Admin** - Base de datos Firestore
- **OpenAI API** - Procesamiento de IA
- **Multer** - File uploads
- **Sharp/Canvas** - Procesamiento de imágenes
- **PDF.js/pdf2pic** - Conversión PDF a imágenes

#### Infraestructura
- **OnRender** - Despliegue (backend web service + frontend static site)
- **Firebase** - Base de datos y hosting
- **Google Drive** - Almacenamiento de imágenes
- **Google Cloud Console** - APIs de Google

---

## 🔄 Flujo de Trabajo

### 1. Autenticación
```
Usuario → Login Google → Verificación Email → JWT Token → Acceso Dashboard
```

### 2. Creación de Anuncios
```
PDF Upload → Conversión a Imágenes → Análisis IA → JSON Estructurado → Editor Visual → HTML Final
```

### 3. Gestión de Datos
```
Frontend → API REST → Firebase Firestore ↔ Google Drive (imágenes)
```

---

## 🎨 Interfaz de Usuario

### Diseño General
- **Tema**: Oscuro profesional con acentos azules
- **Tipografía**: Sans-serif moderna y legible
- **Layout**: Responsive, mobile-first
- **Navegación**: Sidebar/Navbar con indicadores visuales

### Páginas Principales

#### 🏠 Dashboard
- Grid de tarjetas con sets de anuncios
- Botones de acción: Crear, Duplicar, Eliminar
- Información: fecha, título, número de anuncios
- Búsqueda y filtros

#### 📝 Editor
- Panel lateral: lista de anuncios ordenable
- Área central: editor visual del anuncio seleccionado
- Componentes drag-and-drop: Texto, Imagen, Lista, Tabla, Enlace
- Vista previa integrada

#### 👁️ Vista Previa
- Renderizado final del HTML
- Modo responsive testing
- Exportación a HTML

#### 📋 Gestión de Avisos
- Lista completa de anuncios
- Filtros por categoría/prioridad
- Acciones masivas

### Componentes Reutilizables

#### 🧱 Bloques de Contenido
- **TextoBlock**: Editor enriquecido con formato
- **ImagenBlock**: Upload y gestión de imágenes
- **ListaBlock**: Listas numeradas/punteadas
- **TablaBlock**: Tablas editables
- **EnlaceBlock**: Links con validación
- **BancoBlock**: Información bancaria formateada
- **InfoBlock**: Metadatos del anuncio

#### 🎛️ Controles de UI
- **PdfUploader**: Drag-and-drop file upload
- **AvisoCards**: Tarjetas informativas
- **BlockPanel**: Panel de componentes disponibles
- **Navbar**: Navegación principal con auth status

---

## 🔧 Configuración y Despliegue

### Variables de Entorno

#### Backend (OnRender)
```bash
# APIs externas
OPENAI_API_KEY=sk-proj-...
DRIVE_IMAGES_FOLDER_ID=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Configuración
ALLOWED_GOOGLE_EMAIL=omaha.zona@gmail.com
JWT_SECRET=tu-jwt-secret-seguro

# URLs de producción
CLIENT_URL=https://tu-frontend.onrender.com
SERVER_URL=https://tu-backend.onrender.com
NODE_ENV=production

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

#### Frontend (OnRender Static Site)
```bash
VITE_API_BASE_URL=https://tu-backend.onrender.com
```

### Despliegue Automático

#### OnRender Configuration (render.yaml)
```yaml
services:
  - type: web_service
    name: mjc-avisos-ia-backend
    env: node
    rootDir: server
    buildCommand: npm install
    startCommand: npm start

  - type: static_site
    name: mjc-avisos-ia-frontend
    env: static
    rootDir: client
    buildCommand: npm install && npm run build
    publishPath: dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://tu-backend.onrender.com
```

---

## 🔒 Seguridad

### Autenticación
- **OAuth 2.0** con Google
- **Email whitelisting**: Solo `omaha.zona@gmail.com`
- **JWT tokens** con expiración
- **Cookies HttpOnly** para tokens

### Autorización
- **Middleware de rutas** protegidas
- **Validación de tokens** en cada request
- **CORS configurado** para frontend específico

### Datos Sensibles
- **Variables de entorno** para secrets
- **No logs** de información sensible
- **HTTPS obligatorio** en producción

---

## 📊 Base de Datos

### Firebase Firestore Structure

```
sets/
├── {setId}/
│   ├── metadata: { code, date, title, createdAt, updatedAt }
│   └── avisos: [{ id, title, category, priority, blocks: [...] }]
```

### Campos de Anuncios

```javascript
{
  id: "unique-id",
  title: "Título del anuncio",
  category: "espiritual|comunitario|caritativo|... ",
  priority: "alta|media|baja",
  blocks: [
    {
      type: "texto|imagen|lista|tabla|enlace|banco|info",
      content: "...",
      metadata: {...}
    }
  ]
}
```

---

## 🤖 Integración con IA

### OpenAI GPT-4 Vision
- **Prompt engineering** para extracción estructurada
- **Análisis de imágenes** de diapositivas
- **Clasificación automática** por categorías
- **Extracción de entidades**: fechas, lugares, personas

### Procesamiento de PDFs
- **Conversión**: PDF → Imágenes (una por página)
- **OCR implícito**: GPT-4 Vision lee texto de imágenes
- **Estructuración**: JSON canónico de anuncios

---

## 🚀 Desarrollo y Contribución

### Configuración Local

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo (cliente + servidor)
npm run dev

# O por separado
npm run dev:client  # http://localhost:5173
npm run dev:server  # http://localhost:3000
```

### Scripts Disponibles

```bash
# Cliente
npm run build      # Build de producción
npm run preview    # Vista previa del build
npm run lint       # Linting

# Servidor
npm start          # Producción
npm run dev        # Desarrollo con nodemon
```

### Convenciones de Código

- **ESLint** configurado para React
- **Prettier** para formato consistente
- **Componentes**: PascalCase, archivos .jsx
- **Utilidades**: camelCase, archivos .js
- **Commits**: Conventional commits en español

---

## 🔍 Solución de Problemas

### Issues Comunes

#### Login no funciona en producción
- Verificar `SERVER_URL` y `CLIENT_URL` en variables de entorno
- Confirmar redirect URIs en Google Cloud Console
- Revisar logs de OnRender

#### PDFs no se procesan
- Verificar configuración de OpenAI API
- Comprobar límites de tokens/rate limits
- Revisar logs del servidor

#### Imágenes no se cargan
- Verificar permisos de Google Drive
- Confirmar `DRIVE_IMAGES_FOLDER_ID`
- Revisar configuración de Firebase

### Debugging

```bash
# Logs del cliente
# Abrir DevTools → Console

# Logs del servidor
# OnRender Dashboard → Logs del servicio
```

---

## 📈 Métricas y Monitoreo

### KPIs del Sistema
- **Tiempo de procesamiento**: PDF → Anuncios web
- **Tasa de éxito**: Análisis IA exitoso
- **Uptime**: Disponibilidad del servicio
- **Uso de API**: Costos de OpenAI

### Monitoreo
- **OnRender**: Logs y métricas de servicios
- **Firebase**: Uso de base de datos
- **Google Cloud**: Consumo de APIs

---

## 🎯 Roadmap Futuro

### Funcionalidades Pendientes
- [ ] Exportación a PDF desde HTML generado
- [ ] Templates personalizables por parroquia
- [ ] Integración con redes sociales
- [ ] Notificaciones push para nuevos anuncios
- [ ] Versionado de sets de anuncios
- [ ] API pública para integraciones

### Mejoras Técnicas
- [ ] Tests automatizados (unitarios + e2e)
- [ ] CI/CD pipeline completo
- [ ] Optimización de performance
- [ ] PWA capabilities
- [ ] Multi-tenancy para múltiples parroquias

---

## � Sistema de Documentación Continua

### 🎯 Importancia de la Documentación

Mantener la documentación actualizada es **crucial** para:
- **Facilitar onboarding** de nuevos desarrolladores
- **Preservar conocimiento** del proyecto
- **Rastrear evolución** del sistema
- **Mantener consistencia** en procesos

### 🚀 Cómo Documentar Cambios

#### Cambios Simples
```bash
# Agregar entrada rápida al changelog
npm run docs:add-changelog added "Nueva funcionalidad de búsqueda"
```

#### Cambios Complejos
```bash
# Crear template detallado
npm run docs:create-template "user-profile-feature"
# Completar docs/changes/user-profile-feature.md
```

#### Nuevas Versiones
```bash
# Preparar release
npm run docs:prepare-release 1.1.0
```

### 📋 Checklist de Documentación

Antes de commit:
- [ ] CHANGELOG.md actualizado
- [ ] Documentos técnicos actualizados si aplica
- [ ] Variables de entorno documentadas
- [ ] Tests documentados

### 📚 Recursos de Documentación

- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de versiones
- **[API.md](./API.md)** - Documentación técnica de API
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guía para desarrolladores
- **[CHANGE_TEMPLATE.md](./CHANGE_TEMPLATE.md)** - Template para cambios detallados
- **[changes/](./changes/)** - Templates de cambios específicos

---

## �📞 Soporte y Contacto

**Desarrollador Principal**: Carlos (omaha.zona@gmail.com)
**Proyecto**: MJC Avisos IA
**Versión**: 1.0.0
**Última actualización**: Abril 2026

---

*Esta documentación se mantiene actualizada con cada cambio significativo del proyecto.*