# 🔌 API Documentation - MJC Avisos IA

## 📋 Visión General

La API REST del backend proporciona endpoints para gestionar sets de anuncios, procesar PDFs con IA, y manejar autenticación. Utiliza Express.js con middleware de autenticación JWT.

**Base URL**: `https://tu-backend.onrender.com`
**Autenticación**: JWT Bearer Token (excepto `/auth/*`)

---

## 🔐 Endpoints de Autenticación

### POST `/auth/login`
Inicia el flujo de OAuth 2.0 con Google.

**Respuesta**: Redirección a Google OAuth consent screen.

### GET `/auth/callback`
Callback de Google OAuth. Procesa el código de autorización y crea sesión.

**Parámetros URL**:
- `code`: Código de autorización de Google
- `error`: Parámetro de error (opcional)

**Respuesta**: Redirección automática al dashboard del frontend.

### GET `/auth/status`
Verifica el estado de autenticación actual.

**Headers**:
```
Authorization: Bearer <jwt_token>
```
O cookie `auth_token`.

**Respuesta**:
```json
{
  "authorized": true,
  "user": {
    "email": "omaha.zona@gmail.com",
    "name": "Usuario",
    "picture": "https://..."
  }
}
```

### POST `/auth/logout`
Cierra la sesión actual.

**Respuesta**:
```json
{
  "success": true
}
```

---

## 📊 Endpoints de Sets

### GET `/sets`
Obtiene todos los sets de anuncios.

**Respuesta**:
```json
[
  {
    "id": "set-123",
    "code": "ENE-2024",
    "title": "Anuncios Enero 2024",
    "date": "2024-01-15",
    "createdAt": "2024-01-10T10:00:00Z",
    "updatedAt": "2024-01-15T15:30:00Z",
    "avisosCount": 12
  }
]
```

### POST `/sets`
Crea un nuevo set de anuncios.

**Body**:
```json
{
  "code": "ENE-2024",
  "title": "Anuncios Enero 2024",
  "date": "2024-01-15"
}
```

**Respuesta**: El set creado con ID generado.

### GET `/sets/:id`
Obtiene un set específico con todos sus anuncios.

**Respuesta**:
```json
{
  "set": {
    "id": "set-123",
    "code": "ENE-2024",
    "title": "Anuncios Enero 2024",
    "date": "2024-01-15"
  },
  "avisos": [
    {
      "id": "aviso-1",
      "title": "Misa de Gallo",
      "category": "espiritual",
      "priority": "alta",
      "blocks": [...]
    }
  ]
}
```

### PUT `/sets/:id`
Actualiza los metadatos de un set.

**Body**:
```json
{
  "title": "Anuncios Actualizados",
  "date": "2024-01-20"
}
```

### DELETE `/sets/:id`
Elimina un set completo.

### POST `/sets/:id/duplicate`
Duplica un set existente.

**Respuesta**: El nuevo set duplicado.

### POST `/sets/:id/copy-html`
Genera y descarga el HTML final del set.

**Respuesta**: Archivo HTML para descarga.

---

## 📤 Endpoints de Procesamiento

### POST `/analyze-slides`
Procesa un PDF y extrae anuncios usando IA.

**Content-Type**: `multipart/form-data`

**Body**:
```
pdf: <archivo PDF>
setId: "set-123" (opcional)
```

**Proceso**:
1. Convierte PDF a imágenes
2. Envía cada imagen a OpenAI GPT-4 Vision
3. Extrae información estructurada
4. Guarda en Firebase Firestore

**Respuesta**:
```json
{
  "success": true,
  "setId": "set-123",
  "avisosCreated": 8,
  "processingTime": 45000
}
```

### POST `/upload-pdf`
Sube un PDF al servidor (sin procesar).

**Content-Type**: `multipart/form-data`

**Body**:
```
pdf: <archivo PDF>
```

**Respuesta**:
```json
{
  "filename": "uploaded-file.pdf",
  "path": "/uploads/uploaded-file.pdf",
  "size": 2457600
}
```

---

## 🖼️ Endpoints de Imágenes

### GET `/images`
Lista imágenes disponibles en Google Drive.

**Respuesta**:
```json
[
  {
    "id": "drive-file-id",
    "name": "slide-001.jpg",
    "url": "https://drive.google.com/uc?id=...",
    "thumbnail": "https://drive.google.com/uc?id=...&sz=s400"
  }
]
```

### POST `/images/upload`
Sube una imagen a Google Drive.

**Content-Type**: `multipart/form-data`

**Body**:
```
image: <archivo de imagen>
folderId: "drive-folder-id" (opcional)
```

---

## 📝 Estructura de Datos

### Set (Conjunto de Anuncios)
```javascript
{
  id: "string",           // UUID generado
  code: "string",         // Código identificador (ENE-2024)
  title: "string",        // Título descriptivo
  date: "string",         // Fecha en formato YYYY-MM-DD
  createdAt: "ISO string",
  updatedAt: "ISO string"
}
```

### Aviso (Anuncio Individual)
```javascript
{
  id: "string",           // UUID generado
  title: "string",        // Título del anuncio
  category: "string",     // espiritual|comunitario|caritativo|otros
  priority: "string",     // alta|media|baja
  blocks: [Block]         // Array de bloques de contenido
}
```

### Block (Bloque de Contenido)
```javascript
{
  id: "string",           // UUID generado
  type: "string",         // texto|imagen|lista|tabla|enlace|banco|info
  content: "mixed",       // Contenido variable según tipo
  metadata: {}           // Metadatos específicos del tipo
}
```

---

## ⚠️ Códigos de Error

### 400 Bad Request
```json
{
  "error": "Parámetros inválidos",
  "details": "El campo 'code' es requerido"
}
```

### 401 Unauthorized
```json
{
  "error": "No autorizado - token requerido"
}
```

### 403 Forbidden
```json
{
  "error": "Acceso denegado - email no autorizado"
}
```

### 404 Not Found
```json
{
  "error": "Set no encontrado"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error interno del servidor",
  "details": "Error procesando PDF: formato no soportado"
}
```

---

## 🔒 Autenticación y Autorización

### JWT Token
- **Formato**: `Bearer <token>`
- **Expiración**: 24 horas
- **Almacenamiento**: Cookie `auth_token` (HttpOnly)

### Middleware de Autenticación
```javascript
// Todas las rutas excepto /auth/* requieren autenticación
app.use('/auth', authRoutes);  // Público
app.use(requireAuth);          // Protegido
```

### Validación de Email
- Solo permite acceso a: `omaha.zona@gmail.com`
- Configurable via `ALLOWED_GOOGLE_EMAIL`

---

## 📊 Límites y Cuotas

### OpenAI API
- **Rate Limit**: 10,000 tokens/minuto
- **Timeout**: 60 segundos por imagen
- **Costo**: ~$0.01-0.02 por página procesada

### File Upload
- **Tamaño máximo**: 50MB por PDF
- **Formatos**: PDF únicamente
- **Almacenamiento**: Temporal (procesado y eliminado)

### Firebase Firestore
- **Límite diario**: 50,000 operaciones de escritura
- **Límite documento**: 1MB por documento
- **Backup**: Automático de Firebase

---

## 🧪 Testing

### Endpoints de Health Check
```bash
GET /health  # Verifica conectividad básica
GET /auth/status  # Verifica autenticación
```

### Variables de Test
```bash
NODE_ENV=development  # Bypass de autenticación
ALLOWED_GOOGLE_EMAIL=test@example.com  # Email de prueba
```

---

## 🚀 Despliegue

### Variables de Entorno Requeridas
```bash
# URLs
CLIENT_URL=https://tu-frontend.onrender.com
SERVER_URL=https://tu-backend.onrender.com

# APIs
OPENAI_API_KEY=sk-proj-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Config
ALLOWED_GOOGLE_EMAIL=omaha.zona@gmail.com
JWT_SECRET=tu-jwt-secret-seguro
NODE_ENV=production
```

### Configuración de CORS
```javascript
const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true
};
```

---

## 📞 Soporte

**Email**: omaha.zona@gmail.com
**Documentación**: `/docs` folder
**Logs**: OnRender dashboard → Service logs

---

*API Version: 1.0.0 | Last Updated: Abril 2026*