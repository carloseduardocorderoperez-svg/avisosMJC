(async () => {
  try {
    const ds = require('../server/dataStore');
    let sets = [];

    try {
      const loaded = await ds.loadAllSets();
      sets = Array.isArray(loaded.sets) ? loaded.sets : [];
    } catch (e) {
      console.error('Error cargando sets desde Firestore. El fallback local fue eliminado.');
      console.error('Detalle:', e && e.message ? e.message : e);
      console.error('Si necesitas un fallback temporal, restaura `data/avisos.json` o configura correctamente las credenciales de Firestore.');
      process.exit(3);
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
