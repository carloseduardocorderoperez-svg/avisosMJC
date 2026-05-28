(async () => {
  try {
    const ds = require('../server/dataStore');
    let sets = [];

    try {
      const loaded = await ds.loadAllSets();
      sets = Array.isArray(loaded.sets) ? loaded.sets : [];
    } catch (e) {
      // Fallback: leer data/avisos.json directamente
      try {
        const fs = require('fs');
        const path = require('path');
        const raw = fs.readFileSync(path.join(__dirname, '../data/avisos.json'), 'utf8');
        const parsed = JSON.parse(raw || '{}');
        sets = Array.isArray(parsed.sets) ? parsed.sets : [];
        console.warn('Usando fallback local data/avisos.json (Firestore inaccesible):', e && e.message ? e.message : e);
      } catch (e2) {
        console.error('No se pudo leer data/avisos.json:', e2 && e2.message ? e2.message : e2);
        process.exit(3);
      }
    }

    console.log('Sets encontrados:', sets.length);
    sets.forEach((s) => {
      console.log('----------------------------------------');
      console.log('id:', s.id);
      console.log('code:', s.code);
      console.log('title:', s.title);
      console.log('date:', s.date);
      console.log('publicSlug:', s.publicSlug);
      console.log('published:', s.published);
      console.log('publishedAt:', s.publishedAt);
    });
  } catch (e) {
    console.error('Error al listar sets:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
