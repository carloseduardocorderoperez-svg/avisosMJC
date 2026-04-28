require('dotenv').config();
const fs = require('fs');
const path = require('path');
const adminModule = require('firebase-admin');

function getServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) return JSON.parse(serviceAccountJson);
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) return require(path.resolve(serviceAccountPath));
  throw new Error('No se encontró credencial de Firebase. Define FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.');
}

function parseFlexibleDate(value) {
  if (!value && value !== 0) return null;

  // Date instance
  if (value instanceof Date) return value;

  // Firestore Timestamp-like object
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toDate === 'function') {
      try { return value.toDate(); } catch (e) {}
    }
    if ('seconds' in value && 'nanoseconds' in value) {
      try { return new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6)); } catch (e) {}
    }
    if ('_seconds' in value && '_nanoseconds' in value) {
      try { return new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6)); } catch (e) {}
    }
  }

  // String cases
  if (typeof value === 'string') {
    const s = value.trim();

    // dd/mm/yyyy or dd/mm/yy
    const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dm) {
      const day = parseInt(dm[1], 10);
      const month = parseInt(dm[2], 10) - 1;
      const year = dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // ISO / Date.parse
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;

    // Spanish textual like "Jueves 16 de abril del 2026"
    const m = s.match(/(?:^[A-Za-záéíóúñÁÉÍÓÚÑ]+\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:del|de)\s+(\d{2,4}))?/i);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthName = m[2].toLowerCase();
      const months = {
        enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
      };
      const monthIndex = months[monthName];
      const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
      if (typeof monthIndex === 'number') {
        const d = new Date(year, monthIndex, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

async function main() {
  const serviceAccount = getServiceAccount();
  adminModule.initializeApp({ credential: adminModule.credential.cert(serviceAccount) });
  const db = adminModule.firestore();
  const dryRun = process.argv.includes('--dry-run');

  console.log('Scanning collection "sets" to normalize date fields...', dryRun ? '(dry-run)' : '');

  const snapshot = await db.collection('sets').get();
  console.log(`Found ${snapshot.size} documents.`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    // createdAt
    if (data.createdAt && typeof data.createdAt.toDate !== 'function') {
      const d = parseFlexibleDate(data.createdAt);
      if (d) updates.createdAt = adminModule.firestore.Timestamp.fromDate(d);
    }

    // updatedAt
    if (data.updatedAt && typeof data.updatedAt.toDate !== 'function') {
      const d = parseFlexibleDate(data.updatedAt);
      if (d) updates.updatedAt = adminModule.firestore.Timestamp.fromDate(d);
    }

    // date (user-visible)
    if (data.date && typeof data.date.toDate !== 'function') {
      const d = parseFlexibleDate(data.date);
      if (d) updates.date = adminModule.firestore.Timestamp.fromDate(d);
    }

    if (Object.keys(updates).length) {
      if (dryRun) {
        console.log(`[dry-run] Would update ${doc.id}:`, Object.keys(updates).join(', '));
      } else {
        await doc.ref.update(updates);
        updated += 1;
        console.log(`Updated ${doc.id}:`, Object.keys(updates).join(', '));
      }
    }
  }

  console.log(`Done. Documents updated: ${updated}/${snapshot.size}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
