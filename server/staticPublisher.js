const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { buildHTMLString } = require('./htmlGenerator');
const { loadAllSets } = require('./dataStore');

function normalizeSlug(input) {
  if (!input) return '';
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateStaticAviso(set) {
  if (!set) throw new Error('Se requiere el objeto set');

  const slug = normalizeSlug(set.publicSlug || set.code || set.id || 'set');
  const targetDir = path.join(__dirname, '../dist-public', slug);

  await ensureDir(targetDir);

  // Build the full HTML from generator (contains full document)
  const fullHtml = buildHTMLString({
    avisos: Array.isArray(set.avisos) ? set.avisos : [],
    date: set.date,
    title: set.title || `AVISOS - ${set.date || ''}`,
    bannerMessage: set.bannerMessage,
  });

  // Prefer using the client build index (copied into dist-public) as base so styles/assets match exactly
  let baseIndexPath = path.join(__dirname, '../dist-public/index.html');
  if (!fsSync.existsSync(baseIndexPath)) {
    // fallback to original client/dist if not copied
    baseIndexPath = path.join(__dirname, '../client/dist/index.html');
  }

  let baseIndex = '';
  try {
    baseIndex = fsSync.readFileSync(baseIndexPath, 'utf8');
  } catch (err) {
    // last resort: use a minimal HTML shell
    baseIndex = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`;
  }

  // Extract <style> tags from the generated fullHtml head to inject into the baseIndex head
  const headMatch = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const styles = [];
  if (headMatch && headMatch[1]) {
    const headInner = headMatch[1];
    const styleRegex = /<style[\s\S]*?<\/style>/gi;
    let m;
    while ((m = styleRegex.exec(headInner))) {
      styles.push(m[0]);
    }
  }

  // Extract container content (the main app DOM) from generated HTML
  let containerContent = '';
  const containerStart = fullHtml.indexOf('<div class="container">');
  if (containerStart !== -1) {
    // find the next <script tag after the container start to mark end of content
    const scriptIndex = fullHtml.indexOf('<script', containerStart);
    if (scriptIndex !== -1) {
      containerContent = fullHtml.slice(containerStart, scriptIndex);
    } else {
      // fallback to extracting until closing body
      const bodyClose = fullHtml.indexOf('</body>', containerStart);
      containerContent = bodyClose !== -1 ? fullHtml.slice(containerStart, bodyClose) : fullHtml.slice(containerStart);
    }
  } else {
    // if not available, fallback to whole body inner
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    containerContent = bodyMatch && bodyMatch[1] ? bodyMatch[1] : fullHtml;
  }

  // Inject styles into baseIndex head (before </head>) and replace root with container content
  let outHtml = baseIndex;
  // insert styles before closing head
  outHtml = outHtml.replace(/<\/head>/i, (m) => `${styles.join('\n')}\n${m}`);

  // replace root placeholder
  if (outHtml.includes('<div id="root"></div>')) {
    outHtml = outHtml.replace('<div id="root"></div>', `<div id="root">${containerContent}</div>`);
  } else if (outHtml.includes('<div id="root">')) {
    // already has content — attempt simple replace
    outHtml = outHtml.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${containerContent}</div>`);
  } else {
    // place container at end of body
    outHtml = outHtml.replace(/<\/body>/i, `${containerContent}\n</body>`);
  }

  const targetFile = path.join(targetDir, 'index.html');
  await fs.writeFile(targetFile, outHtml, 'utf8');

  return { ok: true, slug, path: targetFile };
}

async function generateIndex() {
  let sets = [];
  try {
    const loaded = await loadAllSets();
    sets = Array.isArray(loaded.sets) ? loaded.sets : [];
  } catch (e) {
    // Fallback: leer data/avisos.json directamente sin inicializar Firestore
    try {
      const raw = fsSync.readFileSync(path.join(__dirname, '../data/avisos.json'), 'utf8');
      const parsed = JSON.parse(raw || '{}');
      sets = Array.isArray(parsed.sets) ? parsed.sets : [];
    } catch (e2) {
      sets = [];
    }
  }

  const published = (sets || []).filter((s) => s && s.published).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const items = published.map((s) => {
    const slug = normalizeSlug(s.publicSlug || s.code || s.id || 'set');
    const title = s.title || `${s.code || ''}`;
    const date = s.date || '';
    return `    <li><a href="./${slug}/">${title} ${date ? `- ${date}` : ''}</a></li>`;
  }).join('\n');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Avisos publicados</title>
  <style>body{font-family:sans-serif;padding:24px;background:#111;color:#fff} a{color:#9ad1ff}</style>
</head>
<body>
  <h1>Avisos publicados</h1>
  <ul>
${items}
  </ul>
</body>
</html>`;

  const distDir = path.join(__dirname, '../dist-public');
  await ensureDir(distDir);
  const indexFile = path.join(distDir, 'index.html');
  await fs.writeFile(indexFile, html, 'utf8');

  return { ok: true, path: indexFile };
}

async function publishAviso(set) {
  const result = await generateStaticAviso(set);
  await generateIndex();
  return result;
}

async function removeStaticAviso(setOrSlug) {
  let slug = '';
  if (!setOrSlug) throw new Error('Se requiere set o slug');
  if (typeof setOrSlug === 'string') slug = setOrSlug;
  else slug = String(setOrSlug.publicSlug || setOrSlug.code || setOrSlug.id || '').trim();

  if (!slug) throw new Error('No se pudo determinar slug para eliminación');

  const targetDir = path.join(__dirname, '../dist-public', slug);

  // Use fs.rm if available
  try {
    if (fsSync.existsSync(targetDir)) {
      if (fs.rm) {
        await fs.rm(targetDir, { recursive: true, force: true });
      } else {
        // fallback to synchronous remove
        fsSync.rmSync(targetDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    throw new Error('Error eliminando carpeta estática: ' + (err && err.message ? err.message : err));
  }

  // Regenerar índice
  await generateIndex();

  return { ok: true, slug, removed: true };
}

module.exports = {
  generateStaticAviso,
  publishAviso,
  generateIndex,
};

module.exports.removeStaticAviso = removeStaticAviso;

// Small CLI to build all published sets or publish a single id/slug
if (require.main === module) {
  (async () => {
    const cmd = process.argv[2];
    try {
      if (cmd === 'build-all') {
        const { sets } = await loadAllSets();
        const published = (sets || []).filter((s) => s && s.published);
        for (const s of published) {
          console.log('Publishing', s.id, s.publicSlug || s.code);
          await generateStaticAviso(s);
        }
        await generateIndex();
        console.log('Done: dist-public generated');
        process.exit(0);
      }

      if (cmd === 'publish' && process.argv[3]) {
        const key = process.argv[3];
        const { sets } = await loadAllSets();
        const found = (sets || []).find((s) => String(s.id) === String(key) || (s.publicSlug && s.publicSlug === key) || (s.code && s.code === key));
        if (!found) {
          console.error('Set not found for', key);
          process.exit(2);
        }
        await publishAviso(found);
        console.log('Published', found.id);
        process.exit(0);
      }

      console.log('Usage: node server/staticPublisher.js build-all | publish <id|slug|code>');
      process.exit(1);
    } catch (err) {
      console.error('Error in staticPublisher CLI:', err && err.message ? err.message : err);
      process.exit(3);
    }
  })();
}
