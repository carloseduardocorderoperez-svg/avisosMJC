# 🚀 Deployment & Configuration Guide - MJC Avisos IA

## 📋 Visión General

Esta guía cubre el proceso completo de despliegue de MJC Avisos IA en OnRender, incluyendo configuración de variables de entorno, bases de datos y servicios externos.

---

## 🏗️ Arquitectura de Despliegue

### Servicios en OnRender

```
Internet
    │
    ├── Frontend (Static Site)
    │   ├── React SPA
    │   ├── Vite build
    │   └── Servido desde CDN
    │
    └── Backend (Web Service)
        ├── Node.js + Express
        ├── API REST
        └── Base de datos Firebase
```

### Servicios Externos

- **Firebase Firestore**: Base de datos NoSQL
- **Google Drive API**: Almacenamiento de imágenes
- **Google OAuth**: Autenticación de usuarios
- **OpenAI API**: Procesamiento de IA

---

## 🔧 Configuración Inicial

### 1. Repositorio en GitHub

```bash
# Clonar o crear repositorio
git init
git add .
git commit -m "Initial commit: MJC Avisos IA"
git remote add origin https://github.com/tu-usuario/mjc-avisos-ia.git
git push -u origin main
```

### 2. Crear Servicios en OnRender

#### Backend Service
1. Ir a [OnRender Dashboard](https://dashboard.onrender.com)
2. **New → Web Service**
3. Conectar repositorio de GitHub
4. Configurar:
   - **Name**: `mjc-avisos-ia-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `server`

#### Frontend Static Site
1. **New → Static Site**
2. Conectar mismo repositorio
3. Configurar:
   - **Name**: `mjc-avisos-ia-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Root Directory**: (vacío)

---

## 🔐 Variables de Entorno

### Backend (Web Service)

Ir a **OnRender Dashboard → mjc-avisos-ia-backend → Environment**

```bash
# URLs de producción
CLIENT_URL=https://mjc-avisos-ia-frontend.onrender.com
SERVER_URL=https://mjc-avisos-ia-backend.onrender.com

# Autenticación
NODE_ENV=production
ALLOWED_GOOGLE_EMAIL=omaha.zona@gmail.com
JWT_SECRET=tu-jwt-secret-muy-seguro-aqui-2024

# APIs externas
OPENAI_API_KEY=sk-proj-tu-api-key-completa

# Google OAuth
GOOGLE_CLIENT_ID=924531592296-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret-completo

# Google Drive
DRIVE_IMAGES_FOLDER_ID=1xxxxxxxxxxxxxxx

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"tu-project-id",...}
```

### Frontend (Static Site)

Ir a **OnRender Dashboard → mjc-avisos-ia-frontend → Environment**

```bash
VITE_API_BASE_URL=https://mjc-avisos-ia-backend.onrender.com
```

---

## 🔑 Configuración de APIs Externas

### 1. Google Cloud Console

#### Crear Proyecto
1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. **New Project** → "MJC Avisos IA"
3. Habilitar APIs:
   - Google Drive API
   - Google OAuth 2.0

#### Configurar OAuth
1. **APIs & Services → Credentials**
2. **Create Credentials → OAuth 2.0 Client ID**
3. **Application type**: Web application
4. **Authorized redirect URIs**:
   ```
   https://mjc-avisos-ia-backend.onrender.com/auth/callback
   ```
5. Copiar **Client ID** y **Client Secret** a OnRender

#### Configurar Google Drive
1. Crear carpeta en Google Drive: "MJC Avisos Imágenes"
2. Compartir carpeta como pública
3. Copiar **Folder ID** de la URL:
   ```
   https://drive.google.com/drive/folders/1xxxxxxxxxxxxxxx
   ```

### 2. OpenAI API

1. Ir a [OpenAI Platform](https://platform.openai.com)
2. **API Keys → Create new secret key**
3. Copiar API key a OnRender

### 3. Firebase

#### Crear Proyecto
1. Ir a [Firebase Console](https://console.firebase.google.com)
2. **Add project** → "MJC Avisos IA"
3. Habilitar **Firestore Database**

#### Service Account
1. **Project Settings → Service accounts**
2. **Generate new private key**
3. Descargar JSON y copiar contenido completo a OnRender

---

## 🗄️ Configuración de Base de Datos

### Firebase Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Estructura Inicial

```javascript
// Sets collection
{
  id: "set-uuid",
  code: "ENE-2024",
  title: "Anuncios Enero 2024",
  date: "2024-01-15",
  createdAt: "2024-01-10T10:00:00Z",
  updatedAt: "2024-01-15T15:30:00Z"
}

// Avisos subcollection
sets/{setId}/avisos/{avisoId} {
  id: "aviso-uuid",
  title: "Misa de Gallo",
  category: "espiritual",
  priority: "alta",
  blocks: [...]
}
```

---

## 🚀 Proceso de Despliegue

### 1. Push a GitHub

```bash
git add .
git commit -m "feat: production deployment configuration"
git push origin main
```

### 2. Despliegue Automático

OnRender detectará el push y comenzará el build automáticamente:

1. **Backend**: Instala dependencias → Build → Start server
2. **Frontend**: Instala dependencias → Build → Deploy static files

### 3. Verificación

#### Backend Health Check
```bash
curl https://mjc-avisos-ia-backend.onrender.com/health
```

#### Frontend Access
```
https://mjc-avisos-ia-frontend.onrender.com
```

---

## 🔍 Troubleshooting

### Problemas Comunes

#### Build Fails
```
Error: Cannot find module 'express'
```
**Solución**: Verificar que `package.json` tenga las dependencias correctas

#### OAuth Redirect Error
```
Error: redirect_uri_mismatch
```
**Solución**: Verificar que la redirect URI en Google Cloud Console sea correcta

#### API Connection Error
```
Failed to fetch https://api.openai.com/...
```
**Solución**: Verificar que `OPENAI_API_KEY` esté configurada correctamente

#### Database Connection Error
```
Firebase: No project ID provided
```
**Solución**: Verificar que `FIREBASE_SERVICE_ACCOUNT_JSON` sea válido

### Logs de Debug

#### OnRender Logs
1. Ir a **Service Dashboard → Logs**
2. Ver logs en tiempo real durante el build/deploy

#### Client-side Debug
```javascript
// En browser console
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Auth status:', authStatus);
```

---

## ⚡ Optimizaciones de Producción

### Frontend

#### Build Optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', '@dnd-kit/core'],
        },
      },
    },
  },
}
```

#### CDN y Caching
- OnRender sirve assets desde CDN automáticamente
- Cache headers optimizados para static assets

### Backend

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));
```

#### Compression
```javascript
const compression = require('compression');
app.use(compression());
```

#### Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## 📊 Monitoreo y Analytics

### OnRender Metrics
- **Response Times**: Dashboard → Metrics
- **Error Rates**: Logs → Error patterns
- **Resource Usage**: CPU/Memory graphs

### Application Monitoring

#### Error Tracking
```javascript
// Sentry integration (opcional)
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

#### Performance Monitoring
```javascript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🔄 Actualizaciones y Mantenimiento

### Deploy Automático
Cada push a `main` activa un redeploy automático.

### Rollback
Si hay problemas:
1. Ir a **Service Dashboard → Deploys**
2. Seleccionar deploy anterior
3. **Rollback to this deploy**

### Environment Updates
Para cambiar variables de entorno:
1. **Service Dashboard → Environment**
2. Modificar variables
3. **Save Changes** (trigger redeploy automático)

---

## 💰 Costos y Escalabilidad

### OnRender Pricing (Free Tier)
- **Backend**: 750 horas/mes gratis
- **Frontend**: Ilimitado (static site)
- **Bandwidth**: 100GB/mes gratis

### APIs Externas
- **OpenAI**: ~$0.01-0.02 por PDF procesado
- **Firebase**: Generous free tier
- **Google APIs**: Free tier suficiente

### Escalabilidad
- **Horizontal**: OnRender auto-scale
- **Database**: Firestore escala automáticamente
- **CDN**: Assets servidos desde edge locations

---

## 🔒 Seguridad en Producción

### HTTPS
- OnRender proporciona SSL automáticamente
- Todas las conexiones encriptadas

### Secrets Management
- Nunca commitear secrets en código
- Usar variables de entorno de OnRender
- Rotar API keys regularmente

### CORS Configuration
```javascript
const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### Input Validation
```javascript
const Joi = require('joi');

const setSchema = Joi.object({
  code: Joi.string().required(),
  title: Joi.string().required(),
  date: Joi.date().required()
});
```

---

## 📞 Soporte y Contacto

**Deploy Issues**: OnRender Support
**API Issues**: Verificar logs del servicio
**Application Issues**: omaha.zona@gmail.com

### Checklist de Deploy

- [ ] Repositorio en GitHub
- [ ] Servicios creados en OnRender
- [ ] Variables de entorno configuradas
- [ ] APIs externas configuradas
- [ ] Firebase inicializado
- [ ] Primer deploy exitoso
- [ ] Login funcionando
- [ ] PDF processing funcionando

---

*Deployment Version: 1.0.0 | Last Updated: Abril 2026*