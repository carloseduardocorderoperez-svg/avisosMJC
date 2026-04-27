# 🛠️ Development Guide - MJC Avisos IA

## 📋 Visión General

Esta guía proporciona instrucciones completas para configurar el entorno de desarrollo, entender el flujo de trabajo, y contribuir al proyecto MJC Avisos IA.

---

## 🚀 Configuración del Entorno

### Prerrequisitos

- **Node.js**: v18+ (recomendado v20+)
- **npm**: v8+ o **yarn**: v1.22+
- **Git**: v2.30+
- **Cuenta Google**: Para OAuth y Google Drive
- **Cuenta OpenAI**: Para API de IA
- **Cuenta Firebase**: Para base de datos

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/mjc-avisos-ia.git
cd mjc-avisos-ia

# Instalar dependencias del proyecto raíz
npm install

# Instalar dependencias del cliente
cd client
npm install
cd ..

# Instalar dependencias del servidor
cd server
npm install
cd ..
```

### Variables de Entorno

#### Backend (.env)
```bash
# Desarrollo local
NODE_ENV=development
SERVER_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

# APIs (obtener de servicios externos)
OPENAI_API_KEY=sk-proj-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DRIVE_IMAGES_FOLDER_ID=...

# Autenticación
ALLOWED_GOOGLE_EMAIL=tu-email@gmail.com
JWT_SECRET=dev-jwt-secret-key

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🏃‍♂️ Ejecutar el Proyecto

### Desarrollo Local

```bash
# Opción 1: Ejecutar cliente y servidor por separado
npm run dev:client  # http://localhost:5173
npm run dev:server  # http://localhost:3000

# Opción 2: Ejecutar ambos en paralelo
npm run dev
```

### Modo Producción Local

```bash
# Cliente
cd client
npm run build
npm run preview  # http://localhost:4173

# Servidor
cd server
NODE_ENV=production npm start
```

### Verificación

```bash
# Health check del backend
curl http://localhost:3000/health

# Verificar frontend
open http://localhost:5173
```

---

## 🏗️ Arquitectura del Código

### Patrón de Organización

```
📁 src/
├── 🧩 components/     # Componentes reutilizables
├── 📄 pages/         # Páginas/rutas principales
├── 🗂️ store/         # Estado global (Zustand)
├── 🔧 utils/         # Utilidades y API client
└── 🎨 styles/        # CSS y configuración
```

### Principios de Diseño

#### Componentes
- **Funcionales**: Preferir funciones sobre clases
- **Pequeños**: Un componente, una responsabilidad
- **Reutilizables**: Props bien definidas
- **Memoizados**: Usar `React.memo()` cuando aplique

#### Estado
- **Local primero**: Zustand para estado global
- **Inmutable**: No mutar objetos directamente
- **Serializable**: Estado debe ser JSON-serializable

#### API
- **Centralizado**: Todo pasa por `utils/api.js`
- **Autenticado**: Requests incluyen tokens automáticamente
- **Tipado**: Interfaces claras para responses

---

## 🔄 Flujo de Desarrollo

### 1. Crear una Rama

```bash
# Crear rama para nueva feature
git checkout -b feature/nueva-funcionalidad

# O para bug fix
git checkout -b fix/problema-especifico
```

### 2. Desarrollo

```bash
# Hacer cambios
# Probar localmente
npm run dev

# Commits frecuentes
git add .
git commit -m "feat: descripción de lo que se hizo"
```

### 3. Testing

```bash
# Ejecutar tests (si existen)
npm test

# Verificar linting
npm run lint

# Build de producción
npm run build
```

### 4. Pull Request

```bash
# Push a rama
git push origin feature/nueva-funcionalidad

# Crear PR en GitHub
# Esperar review y aprobación
```

---

## 🧩 Desarrollo de Componentes

### Estructura de un Componente

```jsx
// components/NuevoComponente.jsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';

export default function NuevoComponente({ prop1, prop2, onAction }) {
  const [localState, setLocalState] = useState(initialValue);
  const globalState = useStore(state => state.someValue);

  useEffect(() => {
    // Efectos secundarios
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  const handleAction = () => {
    // Lógica del componente
    onAction(result);
  };

  return (
    <div className="nuevo-componente">
      <h3>{prop1}</h3>
      <button onClick={handleAction}>
        {prop2}
      </button>
    </div>
  );
}

// Tipos (opcional con TypeScript)
NuevoComponente.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.string,
  onAction: PropTypes.func.isRequired,
};
```

### Agregar un Nuevo Bloque

```jsx
// components/blocks/NuevoBlock.jsx
import React from 'react';

export default function NuevoBlock({ block, onUpdate }) {
  const handleChange = (value) => {
    onUpdate({
      ...block,
      content: value
    });
  };

  return (
    <div className="block nuevo-block">
      <input
        type="text"
        value={block.content || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Contenido del bloque"
      />
    </div>
  );
}
```

### Integrar en BlockRenderer

```jsx
// components/blocks/BlockRenderer.jsx
import NuevoBlock from './NuevoBlock';

const blockComponents = {
  texto: TextoBlock,
  imagen: ImagenBlock,
  lista: ListaBlock,
  nuevo: NuevoBlock,  // ← Agregar aquí
};

export default function BlockRenderer({ block, onUpdate }) {
  const BlockComponent = blockComponents[block.type];

  if (!BlockComponent) {
    return <div>Tipo de bloque no soportado: {block.type}</div>;
  }

  return <BlockComponent block={block} onUpdate={onUpdate} />;
}
```

---

## 🔧 Desarrollo de API

### Estructura de un Endpoint

```javascript
// server/routes/endpoint.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth');

// Middleware de validación
const validateRequest = (req, res, next) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({
      error: 'Datos requeridos',
      details: 'El campo data es obligatorio'
    });
  }

  next();
};

// Endpoint protegido
router.post('/endpoint', requireAuth, validateRequest, async (req, res) => {
  try {
    const { data } = req.body;
    const user = req.user; // Disponible gracias a requireAuth

    // Lógica del endpoint
    const result = await processData(data, user);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error en endpoint:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

module.exports = router;
```

### Integrar en el Servidor Principal

```javascript
// server/index.js
const endpointRoutes = require('./routes/endpoint');

// Registrar rutas
app.use('/api', endpointRoutes);
```

### Cliente API

```javascript
// client/src/utils/api.js
export async function callNewEndpoint(data) {
  return authenticatedRequest('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify({ data })
  }).then(res => res.json());
}
```

---

## 🎨 Estilos y UI

### Sistema de Diseño

#### Colores
```css
:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;

  --bg-dark: #0f172a;
  --bg-light: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
}
```

#### Componentes Base
```css
.btn {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}
```

### Responsive Design

```jsx
function ResponsiveComponent() {
  return (
    <>
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileLayout />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopLayout />
      </div>
    </>
  );
}
```

---

## 🧪 Testing

### Configuración de Tests

```javascript
// client/vitest.config.js
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
}
```

### Test de Componente

```javascript
// components/NuevoComponente.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import NuevoComponente from './NuevoComponente';

test('renders component', () => {
  render(
    <NuevoComponente
      prop1="Test"
      prop2="Button"
      onAction={jest.fn()}
    />
  );

  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('Button')).toBeInTheDocument();
});

test('calls onAction when clicked', () => {
  const mockAction = jest.fn();
  render(
    <NuevoComponente
      prop1="Test"
      onAction={mockAction}
    />
  );

  fireEvent.click(screen.getByRole('button'));
  expect(mockAction).toHaveBeenCalled();
});
```

### Test de API

```javascript
// utils/api.test.js
import { checkAuthStatus } from './api';

global.fetch = jest.fn();

test('check auth status success', async () => {
  fetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ authorized: true })
  });

  const result = await checkAuthStatus();
  expect(result.authorized).toBe(true);
});
```

### Ejecutar Tests

```bash
# Cliente
cd client
npm test

# Servidor
cd server
npm test
```

---

## 🔍 Debugging

### Herramientas de Desarrollo

#### React DevTools
- Inspeccionar component tree
- Ver props y state
- Performance profiling

#### Redux DevTools (Zustand)
```javascript
// store/store.js
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools(
    (set) => ({
      // store definition
    }),
    { name: 'MJC Avisos Store' }
  )
);
```

#### Console Logging

```javascript
// Development only
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Error Boundaries

```jsx
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Algo salió mal.</h1>;
    }

    return this.props.children;
  }
}
```

---

## 📋 Conventional Commits

### Formato de Commits

```
type(scope): description

[optional body]

[optional footer]
```

### Tipos de Commit

- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **docs**: Cambios en documentación
- **style**: Cambios de estilo (formateo, etc.)
- **refactor**: Refactorización de código
- **test**: Agregar o corregir tests
- **chore**: Cambios de mantenimiento

### Ejemplos

```bash
feat: add PDF upload functionality
fix: correct OAuth redirect URL
docs: update API documentation
refactor: simplify block rendering logic
test: add unit tests for auth middleware
```

---

## � Documentación de Cambios

### ¿Cuándo Documentar?

**SIEMPRE documenta cuando:**

- ✅ Agregas nueva funcionalidad
- ✅ Modificas API endpoints
- ✅ Cambias la interfaz de usuario
- ✅ Agregas nuevas dependencias
- ✅ Modificas configuración de despliegue
- ✅ Corriges bugs importantes
- ✅ Cambias estructura de base de datos

**NO es necesario documentar:**

- ❌ Cambios menores de estilo
- ❌ Refactorización interna sin impacto externo
- ❌ Cambios en comentarios o formato
- ❌ Actualizaciones de dependencias menores

### Cómo Documentar

#### 1. Actualizar CHANGELOG.md

Cada cambio debe documentarse en la sección `[Unreleased]` del CHANGELOG:

```markdown
## [Unreleased]

### ✨ Added
- Nueva funcionalidad agregada

### 🔧 Changed
- Cambio en funcionalidad existente

### 🐛 Fixed
- Corrección de bug

### 🗑️ Removed
- Funcionalidad removida

### 📚 Documentation
- Cambios en documentación

### 🔒 Security
- Cambios relacionados con seguridad
```

#### 2. Usar Template de Cambios

Para cambios complejos, usa el template [`CHANGE_TEMPLATE.md`](../CHANGE_TEMPLATE.md):

```bash
# Copia el template
cp docs/CHANGE_TEMPLATE.md docs/changes/cambio-descriptivo.md

# Completa toda la información requerida
# Incluye archivos modificados, testing, despliegue, etc.
```

#### 3. Actualizar Documentación Técnica

- **API.md**: Cambios en endpoints, autenticación, errores
- **FRONTEND.md**: Nuevos componentes, cambios en UI
- **DEPLOYMENT.md**: Nuevas variables, configuración
- **README.md**: Cambios en funcionalidad principal

#### 4. Commits Relacionados

```bash
# Para cambios que requieren documentación
git commit -m "feat: add user profile page

- Add profile component with avatar upload
- Update user API endpoint
- Add profile route in router

Closes #123"

# Para documentación
git commit -m "docs: update CHANGELOG and API docs for user profile feature"
```

### Checklist de Documentación

Antes de hacer commit, verifica:

- [ ] **CHANGELOG.md** actualizado
- [ ] **Documentos técnicos** actualizados si aplica
- [ ] **Template de cambios** usado para features complejas
- [ ] **Variables de entorno** documentadas
- [ ] **Tests documentados** si agregados
- [ ] **Breaking changes** claramente marcados

### Ejemplos de Documentación

#### Para una nueva funcionalidad:
```markdown
### ✨ Added
- **User Profile Page**: Nueva página de perfil con upload de avatar
  - Componente `Profile.jsx` con formulario de edición
  - Endpoint `GET/PUT /api/user/profile` para datos
  - Validación de imagen y límites de tamaño
  - Integración con Google Drive para storage
```

#### Para corrección de bug:
```markdown
### 🐛 Fixed
- **OAuth Redirect Error**: Corregido error de redirección en producción
  - URL dinámica usando `SERVER_URL` environment variable
  - Fallback para desarrollo local
  - Validación de URLs permitidas
```

#### Para cambio técnico:
```markdown
### 🔧 Changed
- **Database Schema**: Optimización de consultas en Firestore
  - Índices compuestos para búsquedas por fecha
  - Cache de 24 horas para datos estáticos
  - Reducción de 40% en tiempo de respuesta
```

---

## �🚀 Despliegue Local

### Build de Producción

```bash
# Cliente
cd client
npm run build
npm run preview

# Servidor
cd server
NODE_ENV=production npm start
```

### Docker (Opcional)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build y run
docker build -t mjc-avisos .
docker run -p 3000:3000 mjc-avisos
```

---

## 📊 Performance

### Optimizaciones

#### Code Splitting
```javascript
// Lazy loading de rutas
const Editor = lazy(() => import('./pages/Editor'));

// En App.jsx
<Suspense fallback={<Spinner />}>
  <Editor />
</Suspense>
```

#### Memoización
```javascript
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* expensive render */}</div>;
});
```

#### Debounced API Calls
```javascript
import { debounce } from 'lodash';

const debouncedSearch = useCallback(
  debounce((query) => {
    searchAPI(query);
  }, 300),
  []
);
```

### Métricas

#### Web Vitals
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
// etc.
```

#### Bundle Analysis
```bash
cd client
npm run build
npx vite-bundle-analyzer dist
```

---

## 🤝 Contribución

### Código de Conducta

- Sé respetuoso con otros contribuidores
- Mantén la calidad del código
- Documenta cambios significativos
- Revisa tu propio código antes de hacer PR

### Proceso de Review

1. **Auto-review**: Verifica tu código
2. **Tests**: Asegúrate de que pasan
3. **Linting**: Código bien formateado
4. **Documentation**: Actualiza docs si es necesario
5. **PR**: Crea pull request descriptivo

### Áreas de Contribución

- 🐛 **Bug Fixes**: Corrige issues reportados
- ✨ **Features**: Implementa nuevas funcionalidades
- 📚 **Documentation**: Mejora la documentación
- 🧪 **Tests**: Agrega cobertura de tests
- 🎨 **UI/UX**: Mejora la interfaz de usuario
- ⚡ **Performance**: Optimiza el rendimiento

---

## 📞 Soporte

**Issues**: [GitHub Issues](https://github.com/tu-usuario/mjc-avisos-ia/issues)
**Discussions**: [GitHub Discussions](https://github.com/tu-usuario/mjc-avisos-ia/discussions)
**Email**: omaha.zona@gmail.com

### Reportar Bugs

```markdown
**Descripción**: Qué pasó
**Pasos para reproducir**:
1. Ir a...
2. Hacer click en...
3. Ver error...

**Comportamiento esperado**: Qué debería pasar
**Comportamiento actual**: Qué pasa en realidad
**Entorno**: Browser, OS, versión
```

---

*Development Version: 1.0.0 | Last Updated: Abril 2026*