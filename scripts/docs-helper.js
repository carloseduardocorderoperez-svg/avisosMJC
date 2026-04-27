#!/usr/bin/env node

/**
 * MJC Avisos IA - Documentation Helper Script
 *
 * Ayuda a mantener la documentación del proyecto actualizada
 * Uso: node scripts/docs-helper.js [comando] [opciones]
 */

const fs = require('fs');
const path = require('path');

const COMMANDS = {
  changelog: 'Actualizar CHANGELOG.md con un nuevo cambio',
  template: 'Crear un nuevo template de cambio detallado',
  release: 'Preparar una nueva versión (mover Unreleased a nueva versión)',
  help: 'Mostrar esta ayuda'
};

class DocsHelper {
  constructor() {
    this.changelogPath = path.join(__dirname, '..', 'docs', 'CHANGELOG.md');
    this.templatePath = path.join(__dirname, '..', 'docs', 'CHANGE_TEMPLATE.md');
    this.changesDir = path.join(__dirname, '..', 'docs', 'changes');
  }

  run() {
    const [,, command, ...args] = process.argv;

    switch (command) {
      case 'changelog':
        this.addToChangelog(args);
        break;
      case 'template':
        this.createChangeTemplate(args);
        break;
      case 'release':
        this.prepareRelease(args);
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }

  addToChangelog([type, description]) {
    if (!type || !description) {
      console.error('Uso: npm run docs:add-changelog <tipo> "<descripción>"');
      console.log('Tipos: added, changed, fixed, removed, docs, security');
      process.exit(1);
    }

    const typeMap = {
      added: '✨ Added',
      changed: '🔧 Changed',
      fixed: '🐛 Fixed',
      removed: '🗑️ Removed',
      docs: '📚 Documentation',
      security: '🔒 Security'
    };

    const sectionName = typeMap[type.toLowerCase()];
    if (!sectionName) {
      console.error(`Tipo desconocido: ${type}`);
      console.log('Tipos válidos:', Object.keys(typeMap).join(', '));
      process.exit(1);
    }

    try {
      let content = fs.readFileSync(this.changelogPath, 'utf8');

      // Encontrar la sección [Unreleased]
      const unreleasedMatch = content.match(/## \[Unreleased\]\s*\n/);
      if (!unreleasedMatch) {
        console.error('No se encontró la sección [Unreleased] en CHANGELOG.md');
        process.exit(1);
      }

      const unreleasedIndex = unreleasedMatch.index + unreleasedMatch[0].length;

      // Buscar o crear la subsección
      const sectionPattern = new RegExp(`### ${sectionName}\\s*\\n(.*?)(?=\\n### |\\n---)`, 's');
      const existingSection = content.match(sectionPattern);

      if (existingSection) {
        // Agregar a sección existente
        const sectionContent = existingSection[1];
        const newContent = sectionContent.replace(
          /(<!-- .*? -->)/,
          `- ${description}\n$1`
        );
        content = content.replace(existingSection[0], `### ${sectionName}\n${newContent}`);
      } else {
        // Crear nueva sección
        const insertPoint = content.indexOf('---', unreleasedIndex);
        const before = content.substring(0, insertPoint);
        const after = content.substring(insertPoint);

        content = before + `\n### ${sectionName}\n- ${description}\n<!-- Nuevas entradas aquí -->\n\n` + after;
      }

      fs.writeFileSync(this.changelogPath, content);
      console.log(`✅ Agregado a CHANGELOG.md: ${sectionName} - ${description}`);

    } catch (error) {
      console.error('Error actualizando CHANGELOG:', error.message);
      process.exit(1);
    }
  }

  createChangeTemplate([name]) {
    if (!name) {
      console.error('Uso: npm run docs:create-template <nombre-del-cambio>');
      console.log('Ejemplo: npm run docs:create-template "user-profile-feature"');
      process.exit(1);
    }

    const templateName = `${name}.md`;
    const templateFile = path.join(this.changesDir, templateName);

    if (fs.existsSync(templateFile)) {
      console.error(`El archivo ${templateName} ya existe`);
      process.exit(1);
    }

    try {
      const template = fs.readFileSync(this.templatePath, 'utf8');
      const customized = template.replace('[YYYY-MM-DD]', new Date().toISOString().split('T')[0])
                                .replace('[Tu nombre]', 'Carlos')
                                .replace('[Feature | Bug Fix | Enhancement | Documentation | Maintenance]', 'Feature');

      fs.writeFileSync(templateFile, customized);
      console.log(`✅ Template creado: docs/changes/${templateName}`);
      console.log('📝 Completa la información en el archivo creado');

    } catch (error) {
      console.error('Error creando template:', error.message);
      process.exit(1);
    }
  }

  prepareRelease([version]) {
    if (!version) {
      console.error('Uso: npm run docs:prepare-release <version>');
      console.log('Ejemplo: npm run docs:prepare-release 1.1.0');
      process.exit(1);
    }

    try {
      let content = fs.readFileSync(this.changelogPath, 'utf8');

      // Verificar que hay cambios en Unreleased
      const unreleasedSection = content.match(/## \[Unreleased\]\s*\n(.*?)(?=\n## \[)/s);
      if (!unreleasedSection || unreleasedSection[1].trim() === '') {
        console.error('No hay cambios en la sección [Unreleased]');
        process.exit(1);
      }

      // Reemplazar [Unreleased] con la nueva versión
      const today = new Date().toISOString().split('T')[0];
      const newVersion = `## [${version}] - ${today}`;
      content = content.replace('## [Unreleased]', newVersion);

      // Agregar nueva sección [Unreleased] al inicio
      const unreleasedTemplate = `## [Unreleased]

### ✨ Added
<!-- Nuevas funcionalidades agregadas -->

### 🔧 Changed
<!-- Cambios en funcionalidades existentes -->

### 🐛 Fixed
<!-- Corrección de bugs -->

### 🗑️ Removed
<!-- Funcionalidades removidas -->

### 📚 Documentation
<!-- Cambios en documentación -->

### 🔒 Security
<!-- Cambios relacionados con seguridad -->

---
`;
      content = unreleasedTemplate + content;

      fs.writeFileSync(this.changelogPath, content);
      console.log(`✅ Release ${version} preparado en CHANGELOG.md`);
      console.log('📝 Revisa y ajusta las entradas antes de hacer commit');

    } catch (error) {
      console.error('Error preparando release:', error.message);
      process.exit(1);
    }
  }

  showHelp() {
    console.log('🚀 MJC Avisos IA - Documentation Helper\n');
    console.log('Uso: npm run docs:<comando> [opciones]\n');
    console.log('Comandos disponibles:');

    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(10)} - ${desc}`);
    });

    console.log('\nEjemplos:');
    console.log('  npm run docs:add-changelog added "Nueva funcionalidad de usuario"');
    console.log('  npm run docs:create-template "user-authentication"');
    console.log('  npm run docs:prepare-release 1.1.0');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  new DocsHelper().run();
}

module.exports = DocsHelper;