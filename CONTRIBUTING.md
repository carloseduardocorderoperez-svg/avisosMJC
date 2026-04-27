# 🤝 Contributing to MJC Avisos IA

¡Gracias por tu interés en contribuir a MJC Avisos IA! Este documento describe cómo puedes ayudar al proyecto.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Flujo de Desarrollo](#flujo-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Reportar Issues](#reportar-issues)

---

## 📜 Código de Conducta

Este proyecto sigue un código de conducta para asegurar un ambiente colaborativo y respetuoso:

- **Sé respetuoso** con todos los contribuidores
- **Mantén la calidad** del código y la documentación
- **Sé constructivo** en revisiones y discusiones
- **Ayuda a otros** contribuidores cuando puedas

---

## 🚀 Cómo Contribuir

### Tipos de Contribuciones

- 🐛 **Bug Fixes**: Corrección de errores reportados
- ✨ **Features**: Nuevas funcionalidades
- 📚 **Documentation**: Mejoras en la documentación
- 🧪 **Tests**: Agregar o mejorar tests
- 🎨 **UI/UX**: Mejoras en la interfaz
- ⚡ **Performance**: Optimizaciones de rendimiento
- 🔧 **Maintenance**: Mantenimiento del código

### Primeros Pasos

1. **Fork** el repositorio
2. **Clona** tu fork localmente
3. **Crea** una rama para tu contribución
4. **Desarrolla** siguiendo las guías
5. **Testea** tus cambios
6. **Crea** un Pull Request

---

## 🛠️ Configuración del Entorno

### Prerrequisitos

```bash
# Node.js v18+
node --version

# npm v8+
npm --version

# Git
git --version
```

### Instalación

```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/mjc-avisos-ia.git
cd mjc-avisos-ia

# Instala dependencias
npm install
npm run dev:client -- npm install
npm run dev:server -- npm install
```

### Variables de Entorno

Copia los archivos de ejemplo y configura tus variables:

```bash
# Backend
cp server/.env.example server/.env
# Edita server/.env con tus claves

# Frontend
cp client/.env.example client/.env
# Edita client/.env con tu configuración
```

---

## 🔄 Flujo de Desarrollo

### 1. Elige una Tarea

- Revisa los [Issues](https://github.com/tu-usuario/mjc-avisos-ia/issues) abiertos
- Elige una tarea etiquetada como `good first issue` si eres nuevo
- Comenta en el issue para asignártelo

### 2. Crea una Rama

```bash
# Para features
git checkout -b feature/nombre-descriptivo

# Para bug fixes
git checkout -b fix/descripcion-del-problema

# Para documentación
git checkout -b docs/mejora-en-documentacion
```

### 3. Desarrolla

```bash
# Ejecuta en modo desarrollo
npm run dev

# Verifica que todo funciona
npm run validate
```

### 4. Commits

Usa [Conventional Commits](https://conventionalcommits.org/):

```bash
# Ejemplos
git commit -m "feat: add PDF upload functionality"
git commit -m "fix: correct OAuth redirect URL"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify block rendering logic"
```

### 5. Push y Pull Request

```bash
# Push a tu rama
git push origin feature/nueva-funcionalidad

# Crea Pull Request en GitHub
# Describe claramente los cambios
# Referencia issues relacionados
```

---

## 📏 Estándares de Código

### JavaScript/React

- Usa **ES6+** features
- **Funciones flecha** preferidas
- **Template literals** en lugar de concatenación
- **Destructuring** cuando aplique
- **Async/await** sobre Promises

### Estilo de Código

```javascript
// ✅ Bien
const handleSubmit = async (data) => {
  try {
    const result = await api.saveData(data);
    setState(result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// ❌ Mal
function handleSubmit(data) {
  api.saveData(data).then(function(result) {
    setState(result);
  }).catch(function(error) {
    console.error('Error:', error);
  });
}
```

### Componentes React

```jsx
// ✅ Componente funcional moderno
const UserCard = ({ user, onEdit }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>
        Editar
      </button>
    </div>
  );
};
```

### Nombres de Archivos

- **Componentes**: `PascalCase` (UserCard.jsx)
- **Utilidades**: `camelCase` (apiUtils.js)
- **Constantes**: `UPPER_SNAKE_CASE` (constants.js)

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests del cliente
npm run test:client

# Tests del servidor
npm run test:server
```

### Escribir Tests

```javascript
// Component test
import { render, screen } from '@testing-library/react';
import UserCard from './UserCard';

test('renders user name', () => {
  render(<UserCard user={{ name: 'Juan' }} />);
  expect(screen.getByText('Juan')).toBeInTheDocument();
});

// API test
import { getUsers } from './api';

test('fetches users successfully', async () => {
  const users = await getUsers();
  expect(users).toBeDefined();
  expect(Array.isArray(users)).toBe(true);
});
```

### Cobertura

Apunta a mantener >80% de cobertura en:
- Statements
- Branches
- Functions
- Lines

---

## 🔍 Pull Requests

### Checklist de PR

Antes de crear un PR, verifica:

- [ ] **Tests pasan**: `npm test`
- [ ] **Linting pasa**: `npm run lint`
- [ ] **Build funciona**: `npm run build`
- [ ] **Commits siguen conventional commits**
- [ ] **Documentación actualizada** si es necesario
- [ ] **Variables de entorno** documentadas
- [ ] **Breaking changes** claramente marcados

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de Cambio
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] Linting pasa
- [ ] Build funciona

## Issues Relacionados
Closes #123
```

### Proceso de Review

1. **Auto-review**: Revisa tu propio código
2. **CI Checks**: Asegúrate de que pasan todos los checks
3. **Peer Review**: Espera feedback de maintainers
4. **Iteración**: Haz cambios solicitados
5. **Merge**: Una vez aprobado, se mergea

---

## 🐛 Reportar Issues

### Bug Reports

```markdown
**Título**: [BUG] Descripción breve

**Descripción**:
Pasos detallados para reproducir

**Comportamiento esperado**:
Qué debería pasar

**Comportamiento actual**:
Qué pasa en realidad

**Entorno**:
- OS: Windows 11
- Browser: Chrome 120
- Node: v18.17.0

**Screenshots**:
Si aplica

**Logs**:
Errores de consola
```

### Feature Requests

```markdown
**Título**: [FEATURE] Nueva funcionalidad

**Descripción**:
Explicación detallada de la feature

**Motivación**:
Por qué sería útil

**Solución propuesta**:
Cómo implementarla

**Alternativas**:
Otras formas de resolverlo
```

---

## 📞 Comunicación

- **Issues**: Para bugs y features
- **Discussions**: Para preguntas generales
- **Email**: omaha.zona@gmail.com para asuntos privados

### Canales

- 🐛 **Bugs**: GitHub Issues con label `bug`
- 💡 **Features**: GitHub Issues con label `enhancement`
- ❓ **Preguntas**: GitHub Discussions
- 📖 **Documentación**: Pull Requests a `docs/`

---

## 🎯 Áreas de Alto Impacto

Si quieres contribuir significativamente, considera:

1. **Testing**: Agregar tests faltantes
2. **Performance**: Optimizar componentes lentos
3. **Accessibility**: Mejorar a11y
4. **Documentation**: Traducir o mejorar docs
5. **UI/UX**: Rediseñar flujos complejos

---

¡Gracias por contribuir a MJC Avisos IA! 🚀