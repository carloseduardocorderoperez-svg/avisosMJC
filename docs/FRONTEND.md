# 🎨 Frontend Documentation - MJC Avisos IA

## 📋 Visión General

El frontend es una aplicación React SPA (Single Page Application) construida con Vite, que proporciona una interfaz intuitiva para gestionar anuncios parroquiales generados con IA.

**Tecnologías**: React 19 + Vite + Zustand + Tailwind CSS
**URL**: `https://tu-frontend.onrender.com`

---

## 🏗️ Arquitectura del Frontend

### 📁 Estructura de Carpetas

```
client/src/
├── components/           # Componentes reutilizables
│   ├── layout/          # Layout y navegación
│   ├── avisos/          # Componentes específicos de avisos
│   └── blocks/          # Bloques de contenido editables
├── pages/               # Páginas principales (rutas)
├── store/               # Estado global (Zustand)
├── utils/               # Utilidades y cliente API
└── styles/              # CSS y configuración Tailwind
```

### 🧩 Componentes Principales

#### Layout Components
- **Navbar**: Navegación principal con estado de autenticación
- **ProtectedRoute**: Wrapper para rutas protegidas

#### Page Components
- **Dashboard**: Vista general de sets de anuncios
- **Editor**: Editor visual de anuncios
- **Avisos**: Gestión de lista de anuncios
- **Preview**: Vista previa del HTML generado
- **LoginPage**: Página de autenticación

#### Block Components
- **TextoBlock**: Editor de texto enriquecido
- **ImagenBlock**: Gestión de imágenes
- **ListaBlock**: Listas editables
- **TablaBlock**: Tablas dinámicas
- **EnlaceBlock**: Links con validación
- **BancoBlock**: Información bancaria
- **InfoBlock**: Metadatos del anuncio

---

## 🎯 Estado Global (Zustand)

### Store Principal: `useAvisosStore`

```javascript
const useAvisosStore = create((set, get) => ({
  // Estado del set actual
  currentSet: null,           // { id, code, title, date, ... }
  avisos: [],                 // Array de anuncios
  selectedAvisoId: null,      // ID del anuncio seleccionado
  dirty: false,              // Cambios sin guardar
  isSaving: false,           // Estado de guardado

  // Acciones principales
  initializeFromServer: (payload) => { ... },
  setAvisos: (avisos) => { ... },
  selectAviso: (id) => { ... },
  updateAviso: (id, updates) => { ... },
  addAviso: (aviso) => { ... },
  deleteAviso: (id) => { ... },
  saveChanges: async () => { ... }
}));
```

### Patrón de Estado

1. **Inicialización**: `initializeFromServer(payload)` carga datos del backend
2. **Modificación**: Acciones locales marcan `dirty: true`
3. **Persistencia**: `saveChanges()` envía cambios al backend
4. **Sincronización**: UI se actualiza automáticamente con Zustand

---

## 🚀 Rutas y Navegación

### Configuración de Rutas (App.jsx)

```jsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protegidas */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/avisos" element={<ProtectedRoute><Avisos /></ProtectedRoute>} />
        <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
        <Route path="/extra" element={<ProtectedRoute><Extra /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

### ProtectedRoute Component

```jsx
function ProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState({ authorized: false, checking: true });

  useEffect(() => {
    checkAuthStatus().then(status => {
      setAuthStatus({ ...status, checking: false });
    });
  }, []);

  if (authStatus.checking) return <LoadingSpinner />;
  if (!authStatus.authorized) return <Navigate to="/login" />;

  return children;
}
```

---

## 🔧 Cliente API (`utils/api.js`)

### Configuración Base

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
```

### Autenticación

```javascript
// Estado de autenticación global
let authStatus = null;
let authCheckPromise = null;

// Verificar estado de autenticación
export async function checkAuthStatus() {
  if (authStatus?.authorized) return authStatus;

  authCheckPromise = fetch(apiUrl('/auth/status'), {
    credentials: 'include'  // Envía cookies automáticamente
  })
  .then(res => res.json())
  .then(data => {
    authStatus = data;
    return data;
  });

  return authCheckPromise;
}

// Login con Google OAuth
export function loginWithGoogle() {
  // Guarda URL actual para redirigir después
  sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
  window.location.href = apiUrl('/auth/login');
}
```

### Requests Autenticados

```javascript
export async function apiRequest(url, options = {}) {
  const response = await fetch(apiUrl(url), {
    ...options,
    credentials: 'include',  // Importante para cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    authStatus = { authorized: false };
    throw new Error('No autorizado');
  }

  return response;
}

export async function authenticatedRequest(url, options = {}) {
  const auth = await checkAuthStatus();
  if (!auth.authorized) {
    throw new Error('Usuario no autenticado');
  }
  return apiRequest(url, options);
}
```

---

## 🎨 Sistema de Estilos

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        dark: '#0f172a',
        'dark-light': '#1e293b',
      }
    },
  },
  plugins: [],
}
```

### CSS Personalizado (`app.css`)

```css
/* Tema oscuro */
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
}

/* Componentes específicos */
.auth-section { ... }
.login-page { ... }
.block-editor { ... }
.drag-handle { ... }
```

### Clases Utilitarias

```css
/* Animaciones */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

/* Estados de drag and drop */
.dragging {
  opacity: 0.5;
  transform: rotate(5deg);
}
```

---

## 🧱 Sistema de Bloques

### Arquitectura de Bloques

Cada bloque es un componente React que maneja:
- **Renderizado**: Cómo se ve en el editor
- **Edición**: Controles para modificar contenido
- **Serialización**: Cómo se guarda en JSON

### Tipos de Bloques

#### TextoBlock
```jsx
function TextoBlock({ block, onUpdate }) {
  return (
    <div className="block-container">
      <TipTapEditor
        content={block.content}
        onChange={(content) => onUpdate({ content })}
      />
    </div>
  );
}
```

#### ImagenBlock
```jsx
function ImagenBlock({ block, onUpdate }) {
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await authenticatedRequest('/images/upload', {
      method: 'POST',
      body: formData
    });

    onUpdate({ content: response.url });
  };

  return (
    <div className="image-upload">
      <input type="file" accept="image/*" onChange={handleUpload} />
      {block.content && <img src={block.content} alt="Block" />}
    </div>
  );
}
```

#### ListaBlock
```jsx
function ListaBlock({ block, onUpdate }) {
  const [items, setItems] = useState(block.content || []);

  return (
    <div className="list-block">
      {items.map((item, index) => (
        <div key={index} className="list-item">
          <input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
          />
        </div>
      ))}
      <button onClick={() => addItem()}>+ Agregar ítem</button>
    </div>
  );
}
```

### BlockRenderer Component

```jsx
function BlockRenderer({ block, onUpdate }) {
  const blockComponents = {
    texto: TextoBlock,
    imagen: ImagenBlock,
    lista: ListaBlock,
    tabla: TablaBlock,
    enlace: EnlaceBlock,
    banco: BancoBlock,
    info: InfoBlock,
  };

  const BlockComponent = blockComponents[block.type];

  if (!BlockComponent) {
    return <div>Block type not supported: {block.type}</div>;
  }

  return <BlockComponent block={block} onUpdate={onUpdate} />;
}
```

---

## 📝 Editor de Texto (TipTap)

### Configuración de TipTap

```javascript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';

const extensions = [
  StarterKit,
  Color,
  TextStyle,
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
];

function TipTapEditor({ content, onChange }) {
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="editor-container">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

### Toolbar Personalizada

```jsx
function EditorToolbar({ editor }) {
  return (
    <div className="toolbar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'active' : ''}
      >
        <Bold size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'active' : ''}
      >
        <Italic size={16} />
      </button>

      {/* Más botones de formato... */}
    </div>
  );
}
```

---

## 🖼️ Gestión de Imágenes

### Upload a Google Drive

```javascript
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await authenticatedRequest('/images/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

### Galería de Imágenes

```jsx
function ImageLibraryModal({ onSelect }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    authenticatedRequest('/images')
      .then(res => res.json())
      .then(setImages);
  }, []);

  return (
    <Modal>
      <div className="image-grid">
        {images.map(image => (
          <img
            key={image.id}
            src={image.thumbnail}
            onClick={() => onSelect(image.url)}
          />
        ))}
      </div>
    </Modal>
  );
}
```

---

## 🎯 Drag and Drop (DND Kit)

### Configuración Básica

```jsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

function Editor() {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableList items={avisos} />
    </DndContext>
  );
}
```

### Lista Ordenable

```jsx
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

function SortableAvisosList({ avisos, onReorder }) {
  return (
    <SortableContext
      items={avisos.map(a => a.id)}
      strategy={verticalListSortingStrategy}
    >
      {avisos.map(aviso => (
        <SortableAvisoItem
          key={aviso.id}
          aviso={aviso}
          onReorder={onReorder}
        />
      ))}
    </SortableContext>
  );
}
```

### Item Ordenable

```jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableAvisoItem({ aviso, onReorder }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: aviso.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`aviso-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="drag-handle">⋮⋮</div>
      <h3>{aviso.title}</h3>
    </div>
  );
}
```

---

## 🔄 Ciclo de Vida de Componentes

### Dashboard Page

```jsx
function Dashboard() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const response = await authenticatedRequest('/sets');
      const data = await response.json();
      setSets(data);
    } catch (error) {
      console.error('Error loading sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSet = async () => {
    const newSet = { code: 'NEW', title: 'Nuevo Set', date: new Date().toISOString().split('T')[0] };
    const response = await authenticatedRequest('/sets', {
      method: 'POST',
      body: JSON.stringify(newSet),
    });
    const created = await response.json();
    setSets([...sets, created]);
  };

  // ... más handlers
}
```

### Editor Page

```jsx
function Editor() {
  const { currentSet, avisos, selectedAvisoId, initializeFromServer, saveChanges } = useAvisosStore();

  useEffect(() => {
    if (!currentSet) {
      // Cargar set por defecto o redirigir
      navigate('/dashboard');
    }
  }, [currentSet]);

  const handleSave = async () => {
    try {
      await saveChanges();
      // Mostrar notificación de éxito
    } catch (error) {
      // Mostrar error
    }
  };

  const selectedAviso = avisos.find(a => a.id === selectedAvisoId);

  return (
    <div className="editor-layout">
      <AvisosSidebar avisos={avisos} selectedId={selectedAvisoId} />
      <BlockEditor aviso={selectedAviso} onUpdate={updateAviso} />
      <SaveButton onClick={handleSave} disabled={!dirty} />
    </div>
  );
}
```

---

## 🚀 Optimizaciones de Performance

### Lazy Loading

```jsx
const Editor = lazy(() => import('./pages/Editor'));
const Preview = lazy(() => import('./pages/Preview'));

// En App.jsx
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/editor" element={<Editor />} />
    <Route path="/preview" element={<Preview />} />
  </Routes>
</Suspense>
```

### Memoización

```jsx
const AvisoCard = memo(({ aviso, onSelect }) => {
  return (
    <div className="aviso-card" onClick={() => onSelect(aviso.id)}>
      <h3>{aviso.title}</h3>
      <span className="category">{aviso.category}</span>
    </div>
  );
});
```

### Debounced Saves

```javascript
import { debounce } from 'lodash';

const debouncedSave = useCallback(
  debounce(async (changes) => {
    await saveToBackend(changes);
  }, 1000),
  []
);
```

---

## 🧪 Testing

### Configuración de Tests

```javascript
// vitest.config.js
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
}
```

### Test de Componentes

```javascript
// TextoBlock.test.jsx
import { render, screen } from '@testing-library/react';
import { TextoBlock } from './TextoBlock';

test('renders text block', () => {
  const block = { id: '1', type: 'texto', content: '<p>Hello</p>' };
  render(<TextoBlock block={block} onUpdate={jest.fn()} />);

  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Test de API

```javascript
// api.test.js
import { checkAuthStatus } from './utils/api';

test('check auth status', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ authorized: true }),
    })
  );

  const status = await checkAuthStatus();
  expect(status.authorized).toBe(true);
});
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First */
.container { width: 100%; }

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 768px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}
```

### Layout Adaptativo

```jsx
function ResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`layout ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile ? <MobileNav /> : <DesktopSidebar />}
      <MainContent />
    </div>
  );
}
```

---

## 🔍 Debugging

### React DevTools
- Component hierarchy
- Props and state inspection
- Performance profiling

### Console Logging

```javascript
// Development only logging
if (import.meta.env.DEV) {
  console.log('Auth status:', authStatus);
  console.log('Current set:', currentSet);
}
```

### Error Boundaries

```jsx
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

---

## 📊 Métricas y Analytics

### Performance Monitoring

```javascript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### User Analytics

```javascript
// Track page views
useEffect(() => {
  if (window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: location.pathname,
    });
  }
}, [location]);
```

---

*Frontend Version: 1.0.0 | Last Updated: Abril 2026*