# 📋 Template de Documentación de Cambios

Usa este template para documentar cambios en el proyecto MJC Avisos IA.

---

## 📝 Información del Cambio

**Fecha:** [YYYY-MM-DD]  
**Autor:** [Tu nombre]  
**Tipo de Cambio:** [Feature | Bug Fix | Enhancement | Documentation | Maintenance]  
**Área Afectada:** [Frontend | Backend | Database | Infrastructure | Documentation]  

---

## 🎯 Descripción del Cambio

### ¿Qué se cambió?
[Descripción clara y concisa del cambio realizado]

### ¿Por qué se cambió?
[Motivación o problema que se resolvió]

### ¿Cómo se implementó?
[Breve explicación técnica de la implementación]

---

## 📋 Checklist de Documentación

- [ ] **CHANGELOG.md** actualizado en sección `[Unreleased]`
- [ ] **README.md** actualizado si afecta funcionalidad principal
- [ ] **API.md** actualizado si hay cambios en endpoints
- [ ] **FRONTEND.md** actualizado si hay cambios en componentes
- [ ] **DEPLOYMENT.md** actualizado si hay cambios en configuración
- [ ] **DEVELOPMENT.md** actualizado si hay cambios en procesos
- [ ] Variables de entorno documentadas si se agregaron nuevas
- [ ] Tests agregados o actualizados
- [ ] Comentarios en código si es necesario

---

## 🔍 Detalles Técnicos

### Archivos Modificados
```
📁 [carpeta]/
├── 📄 [archivo1] - [descripción del cambio]
├── 📄 [archivo2] - [descripción del cambio]
└── 📄 [archivo3] - [descripción del cambio]
```

### Nuevas Dependencias
- **[nombre]** v[versión] - [propósito]

### Variables de Entorno Nuevas
```bash
# NOMBRE_VARIABLE=valor_por_defecto
# Descripción: qué hace esta variable
```

### Endpoints Nuevos/Modificados
```javascript
// GET/POST/PUT/DELETE /api/ejemplo
// Descripción: qué hace este endpoint
```

---

## 🧪 Testing

### Casos de Prueba Agregados
- [ ] Test unitario para [funcionalidad]
- [ ] Test de integración para [flujo]
- [ ] Test end-to-end para [escenario]

### Comandos para Probar
```bash
# Comando para probar la funcionalidad
npm run test:feature

# Verificación manual
# 1. Ir a [URL]
# 2. Hacer click en [elemento]
# 3. Verificar que [resultado esperado]
```

---

## 🚀 Despliegue

### ¿Requiere migración?
- [ ] Sí - [descripción de la migración]
- [ ] No

### Variables de entorno requeridas
- [ ] Nuevas variables agregadas
- [ ] Variables existentes modificadas

### Pasos de despliegue especiales
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

---

## 📚 Documentación Adicional

### Enlaces relacionados
- Issue: #[número]
- PR: #[número]
- Documentación externa: [enlace]

### Notas para revisores
[Cualquier información adicional que los revisores deban saber]

---

## ✅ Validación Final

- [ ] Código revisado
- [ ] Tests pasan
- [ ] Linting pasa
- [ ] Build funciona
- [ ] Documentación completa
- [ ] Listo para merge

---

*Template version: 1.0.0 | Fecha: 2026-04-26*