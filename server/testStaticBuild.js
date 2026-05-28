const fs = require('fs');
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

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

(async () => {
  try {
    const { sets } = await loadAllSets();
    if (!Array.isArray(sets) || !sets.length) {
      console.error('No sets found in Firestore.');
      process.exit(2);
    }

    // Use first set for test
    const set = sets[0];
  const slug = normalizeSlug(set.publicSlug || set.code || set.id || 'set');
  const distDir = path.join(__dirname, '../dist-public', slug);
  ensureDirSync(distDir);

  const html = buildHTMLString({
    avisos: Array.isArray(set.avisos) ? set.avisos : [],
    date: set.date,
    title: set.title || `AVISOS - ${set.date || ''}`,
    bannerMessage: set.bannerMessage,
  });

  const outFile = path.join(distDir, 'index.html');
(async () => {
    fs.writeFileSync(outFile, html, 'utf8');

    // also generate main index
    const listHtml = `<!doctype html><html><body><ul><li><a href="./${slug}/">${set.title || slug}</a></li></ul></body></html>`;
    ensureDirSync(path.join(__dirname, '../dist-public'));
    fs.writeFileSync(path.join(__dirname, '../dist-public/index.html'), listHtml, 'utf8');

    console.log('Test build created:', outFile);
    process.exit(0);
  } catch (err) {
    console.error('Test build error:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
