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

  console.log('staticPublisher: building HTML string for', slug);
  const html = buildHTMLString({
    avisos: Array.isArray(set.avisos) ? set.avisos : [],
    date: set.date,
    title: set.title || `AVISOS - ${set.date || ''}`,
    bannerMessage: set.bannerMessage,
  });

  console.log('staticPublisher: HTML built, writing to file for', slug);

  const targetFile = path.join(targetDir, 'index.html');
  await fs.writeFile(targetFile, html, 'utf8');

  return { ok: true, slug, path: targetFile };
}

async function generateIndex() {
  let sets = [];
  try {
    const loaded = await loadAllSets();
    sets = Array.isArray(loaded.sets) ? loaded.sets : [];
  } catch (e) {
    console.error('Error cargando sets desde Firestore. El fallback local fue eliminado.');
    console.error('Detalle:', e && e.message ? e.message : e);
    throw e;
  }
  const allSets = Array.isArray(sets) ? sets : [];
  let published = allSets.filter((s) => s && (s.published || s.publishedAt));
  published = published.sort((a, b) => new Date(b.publishedAt || b.date || b.createdAt || 0) - new Date(a.publishedAt || a.date || a.createdAt || 0));

  // Minimal data we need on the client side
  const minimal = published.map((s) => ({
    slug: normalizeSlug(s.publicSlug || s.code || s.id || 'set'),
    title: s.title || `${s.code || ''}`,
    date: s.date || '',
    publishedAt: s.publishedAt || ''
  }));

  // Cleanup: remove any stale folders in dist-public that no longer correspond
  // to published slugs. This prevents leftover empty folders from previous
  // runs (e.g. when a set was unpublished but its directory remained).
  try {
    const distDir = path.join(__dirname, '../dist-public');
    const kept = new Set(minimal.map((m) => String(m.slug || '').trim()).filter(Boolean));
    if (fsSync.existsSync(distDir)) {
      const entries = fsSync.readdirSync(distDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const name = e.name;
        if (!kept.has(name) && name !== '.' && name !== '..') {
          const target = path.join(distDir, name);
          try {
            // Only remove if directory is empty to avoid deleting build assets
            const contents = fsSync.readdirSync(target);
            if (!contents || contents.length === 0) {
              if (fsSync.rm) {
                fsSync.rmSync(target, { recursive: true, force: true });
              } else {
                fsSync.rmdirSync(target, { recursive: true });
              }
              console.log('staticPublisher: removed empty stale folder', name);
            }
          } catch (er) {
            // ignore removal errors
            console.warn('staticPublisher: could not remove stale folder', name, er && er.message ? er.message : er);
          }
        }
      }
    }
  } catch (err) {
    // non-fatal
  }

  const safeData = JSON.stringify(minimal).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <link rel="icon" type="image/x-icon" href="/Cruz.ico" />
  <title>Avisos publicados</title>
  <style>
    :root{
      --bg:#000000;
      --card:#0f1113;
      --muted:#9ea6b2;
      --text:#f6f7f8;
      --accent-red:#dd2d4a;
      --accent-blue:#2c6dff;
      --accent-coffee:#8b4513;
      --glass:rgba(255,255,255,0.02);
      --radius:10px;
    }
    html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    .container{max-width:920px;margin:36px auto;padding:20px}
    .site-header{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
    .site-header h1{font-size:18px;margin:0;letter-spacing:0.08em;text-transform:uppercase}
    .lead{color:var(--muted);margin:0;font-size:13px}

    .year-block{background:linear-gradient(180deg,var(--glass),transparent);border:1px solid rgba(255,255,255,0.03);border-radius:var(--radius);margin-bottom:12px;overflow:hidden}
    .year-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;border:0;background:transparent;color:var(--text);cursor:pointer;font-weight:700}
    .year-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;padding:16px 18px;border:0;background:transparent;color:var(--text);cursor:pointer;font-weight:800}
    .year-toggle:focus{outline:2px solid rgba(255,255,255,0.08);outline-offset:2px}
    .year-label{font-size:15px}
    .months{padding:8px 16px 16px;border-top:1px solid rgba(255,255,255,0.02);margin-left:6px;padding-left:18px;border-left:2px solid rgba(255,255,255,0.02);}
    .month-block{margin-bottom:8px}
    .month-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 0;border:0;background:transparent;color:var(--text);cursor:pointer;font-weight:700}
    .month-label{font-size:13px;color:var(--muted);font-weight:700}
    .month-block{background:linear-gradient(180deg, rgba(255,255,255,0.005), transparent);padding:8px;border-radius:8px}
    .items{list-style:none;padding-left:0;margin:8px 0 0}
    .items li{margin:6px 0}
    .items li a{display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--text);background:transparent;transition:background .12s,transform .12s;margin-left:8px}
    .items li a:hover{background:rgba(255,255,255,0.02);transform:translateY(-2px)}
    .meta{color:var(--muted);font-weight:500;font-size:13px;display:flex;gap:10px;align-items:center}
    .count{background:rgba(255,255,255,0.03);padding:4px 8px;border-radius:999px;font-weight:600}
    .chev{width:14px;height:14px;transform:rotate(0deg);transition:transform .16s}
    button[aria-expanded="true"] .chev{transform:rotate(90deg)}
    .footer{color:var(--muted);font-size:13px;margin-top:18px;text-align:center}
    @media (max-width:600px){.container{padding:16px}}
  </style>
</head>
<body>
  <main class="container">
    <header class="site-header">
      <h1>Avisos publicados</h1>
      <p class="lead">Navega los avisos por año y mes. Haz clic para desplegar.</p>
    </header>

    <div id="root" aria-live="polite"></div>

    <footer class="footer">&copy; ${new Date().getFullYear()}</footer>
  </main>

  <script>
    window.AVISOS_SETS = ${safeData};
    (function(){
      const sets = Array.isArray(window.AVISOS_SETS) ? window.AVISOS_SETS : [];
      const root = document.getElementById('root');
      if(!root) return;
      if(sets.length === 0){
        root.innerHTML = '<p class="lead">No hay avisos publicados.</p>';
        return;
      }

      function parseDate(s){
        if(!s) return new Date();
        const str = String(s).trim();
        const iso = str.match(/^(\\d{4}-\\d{2}-\\d{2})/);
        if(iso){const p = iso[1].split('-');return new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10));}
        const dm = str.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})$/);
        if(dm){const day = parseInt(dm[1],10);const month = parseInt(dm[2],10)-1;const year = dm[3].length===2?2000+parseInt(dm[3],10):parseInt(dm[3],10);return new Date(year,month,day);} 
        const d = new Date(str); if(!isNaN(d.getTime())) return d; return new Date();
      }

      function formatLong(d){
        const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return d.getDate() + ' de ' + months[d.getMonth()] + ' del ' + d.getFullYear();
      }

      // Group by year -> month
      const grouped = {};
      let newest = null;
      sets.forEach(function(s){
        const date = parseDate(s.date || s.publishedAt || '');
        if(!newest || date > newest) newest = date;
        const y = date.getFullYear();
        const m = date.getMonth();
        grouped[y] = grouped[y] || {};
        grouped[y][m] = grouped[y][m] || [];
        grouped[y][m].push({slug: s.slug, title: s.title, date: date});
      });

      const years = Object.keys(grouped).map(function(v){return parseInt(v,10)}).sort(function(a,b){return b-a});
      const expandYear = newest ? newest.getFullYear() : (new Date()).getFullYear();
      const expandMonth = newest ? newest.getMonth() : (new Date()).getMonth();

      const container = document.createElement('div'); container.className = 'years';

      years.forEach(function(year){
        const monthsObj = grouped[year] || {};
        const monthKeys = Object.keys(monthsObj).map(function(v){return parseInt(v,10)}).sort(function(a,b){return b-a});
        const yearCount = monthKeys.reduce(function(acc,m){return acc + (monthsObj[m] ? monthsObj[m].length : 0);}, 0);

        const yearBlock = document.createElement('section'); yearBlock.className = 'year-block';

        const yearToggle = document.createElement('button');
        yearToggle.className = 'year-toggle';
        yearToggle.setAttribute('aria-expanded', String(year === expandYear));
        yearToggle.setAttribute('data-year', String(year));
        yearToggle.innerHTML = '<span class="year-label">'+year+'</span><span class="meta"><span class="count">'+yearCount+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></span>';

        const monthsContainer = document.createElement('div'); monthsContainer.className = 'months';
        if(year !== expandYear) monthsContainer.setAttribute('hidden','');

        monthKeys.forEach(function(monthIdx){
          const items = (monthsObj[monthIdx] || []).slice().sort(function(a,b){return b.date - a.date;});
          const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const monthName = monthNames[monthIdx] || String(monthIdx+1);

          const monthBlock = document.createElement('div'); monthBlock.className = 'month-block';
          const monthToggle = document.createElement('button');
          monthToggle.className = 'month-toggle';
          monthToggle.setAttribute('aria-expanded', String(year === expandYear && monthIdx === expandMonth));
          monthToggle.innerHTML = '<span class="month-label">'+monthName+'</span><span class="meta"><span class="count">'+items.length+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></span>';

          const itemsList = document.createElement('ul'); itemsList.className = 'items';
          if(!(year === expandYear && monthIdx === expandMonth)) itemsList.setAttribute('hidden','');

          items.forEach(function(it){
            const li = document.createElement('li');
            const a = document.createElement('a');
            // Use root-relative paths to avoid stacking segments when clicked from nested pages
            a.href = '/' + it.slug + '/';
            a.textContent = formatLong(it.date);
            li.appendChild(a);
            itemsList.appendChild(li);
          });

          monthToggle.addEventListener('click', function(){
            const expanded = monthToggle.getAttribute('aria-expanded') === 'true';
            monthToggle.setAttribute('aria-expanded', String(!expanded));
            if(expanded) itemsList.setAttribute('hidden',''); else itemsList.removeAttribute('hidden');
          });

          monthBlock.appendChild(monthToggle);
          monthBlock.appendChild(itemsList);
          monthsContainer.appendChild(monthBlock);
        });

        yearToggle.addEventListener('click', function(){
          const expanded = yearToggle.getAttribute('aria-expanded') === 'true';
          yearToggle.setAttribute('aria-expanded', String(!expanded));
          if(expanded) monthsContainer.setAttribute('hidden',''); else monthsContainer.removeAttribute('hidden');
        });

        yearBlock.appendChild(yearToggle);
        yearBlock.appendChild(monthsContainer);
        container.appendChild(yearBlock);
      });

      root.appendChild(container);
    })();
  </script>
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
