const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const dataPath = path.join(__dirname, "../data/avisos.json");
const SIMPLE_CODE_RE = /^([A-Z0-9]+)-(\d{3,})$/;
const LEGACY_AUTO_CODE_RE = /^(HTML|AI)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-copy(?:\d+)?)*$/i;

let admin;
let db;
let firestoreInitError = null;

function getServiceAccountPath() {
  return (
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "../mjc-avisos-ia-2fe93603f300.json")
  );
}

function initializeFirestore() {
  if (db || firestoreInitError) return;

  try {
    const adminModule = require("firebase-admin");
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccountPath = getServiceAccountPath();

    let credential;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      credential = adminModule.credential.cert(serviceAccount);
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      credential = adminModule.credential.cert(serviceAccount);
    } else {
      credential = adminModule.credential.applicationDefault();
    }

    admin = adminModule;
    admin.initializeApp({ credential });
    db = admin.firestore();
  } catch (error) {
    firestoreInitError = error;
    console.warn("Firebase Admin no inicializado. Se usará almacenamiento local:", error.message);
  }
}

function isFirestoreAvailable() {
  if (db) return true;
  if (firestoreInitError) return false;
  initializeFirestore();
  return !!db;
}

function normalizeCodeValue(code) {
  return String(code || "").trim();
}

function sanitizeCodePrefix(prefix) {
  const clean = String(prefix || "SET")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "SET";
}

function isLegacyAutoCode(code) {
  const value = normalizeCodeValue(code);

  if (!value) return true;

  return value.toUpperCase() === "DEFAULT" || LEGACY_AUTO_CODE_RE.test(value);
}

function buildReservedCodes(sets, ignoreId) {
  const reserved = new Set();

  (sets || []).forEach((set) => {
    if (ignoreId != null && String(set.id) === String(ignoreId)) return;

    const code = normalizeCodeValue(set.code);
    if (code) {
      reserved.add(code.toLowerCase());
    }
  });

  return reserved;
}

function createSequentialCode(reservedCodes, prefix) {
  const safePrefix = sanitizeCodePrefix(prefix);
  let counter = 1;

  while (true) {
    const candidate = `${safePrefix}-${String(counter).padStart(3, "0")}`;
    const key = candidate.toLowerCase();

    if (!reservedCodes.has(key)) {
      reservedCodes.add(key);
      return candidate;
    }

    counter += 1;
  }
}

function inferCodePrefix(code, fallback = "SET") {
  const value = normalizeCodeValue(code).toUpperCase();
  const simpleMatch = value.match(SIMPLE_CODE_RE);

  if (simpleMatch) {
    return simpleMatch[1];
  }

  if (value.startsWith("HTML-")) return "HTML";
  if (value.startsWith("AI-")) return "AI";
  if (value === "DEFAULT") return "SET";

  return sanitizeCodePrefix(fallback);
}

function shouldGenerateAutomaticCode(code) {
  const value = normalizeCodeValue(code);
  return !value || isLegacyAutoCode(value);
}

function resolveSetCode(sets, code, source = "SET", ignoreId) {
  const normalizedCode = normalizeCodeValue(code);

  if (!shouldGenerateAutomaticCode(normalizedCode)) {
    return normalizedCode;
  }

  const reservedCodes = buildReservedCodes(sets, ignoreId);
  const prefix = inferCodePrefix(normalizedCode, source);

  return createSequentialCode(reservedCodes, prefix);
}

function migrateLegacySetCodes(sets) {
  const reservedCodes = new Set(
    (sets || [])
      .map((set) => normalizeCodeValue(set.code))
      .filter((code) => code && !shouldGenerateAutomaticCode(code))
      .map((code) => code.toLowerCase()),
  );

  let changed = false;

  const normalizedSets = (sets || []).map((set) => {
    const currentCode = normalizeCodeValue(set.code);

    if (!shouldGenerateAutomaticCode(currentCode)) {
      return set;
    }

    const nextCode = createSequentialCode(
      reservedCodes,
      inferCodePrefix(currentCode, "SET"),
    );

    if (nextCode !== currentCode) {
      changed = true;
      return {
        ...set,
        code: nextCode,
      };
    }

    return set;
  });

  return { sets: normalizedSets, changed };
}

function readRawData() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo avisos.json:", e);
    return {};
  }
}

function normalizeToMultiSet(raw) {
  if (raw && Array.isArray(raw.sets)) {
    return { sets: raw.sets };
  }

  const avisos = Array.isArray(raw && raw.avisos) ? raw.avisos : [];

  if (!avisos.length) {
    return { sets: [] };
  }

  const now = new Date().toISOString();

  const defaultSet = {
    id: uuidv4(),
    code: "DEFAULT",
    date: new Date().toISOString(),
    title: "AVISOS ZONALES",
    avisos,
    createdAt: now,
    updatedAt: now,
  };

  return { sets: [defaultSet] };
}

function restoreFirestoreValue(value) {
  if (Array.isArray(value)) {
    return value.map(restoreFirestoreValue);
  }

  if (value && typeof value === "object") {
    if (value._firestore_json_) {
      try {
        return restoreFirestoreValue(JSON.parse(value._firestore_json_));
      } catch (e) {
        return value._firestore_json_;
      }
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, restoreFirestoreValue(val)]),
    );
  }

  return value;
}

function toPlainSet(data, id) {
  const restored = restoreFirestoreValue(data);

  function tsObjectToIso(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Firestore client/server representation: {_seconds, _nanoseconds}
    const s = obj._seconds != null ? obj._seconds : obj.seconds != null ? obj.seconds : null;
    const n = obj._nanoseconds != null ? obj._nanoseconds : obj.nanoseconds != null ? obj.nanoseconds : null;

    if (s != null) {
      const ms = Number(s) * 1000 + (Number(n || 0) / 1e6);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    return null;
  }

  const makeIso = (val) => {
    if (!val && val !== 0) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val.toDate === 'function') {
        try { return val.toDate().toISOString(); } catch (e) { /* ignore */ }
      }
      const iso = tsObjectToIso(val);
      if (iso) return iso;
      // fallback to JSON stringify if nothing else
      try { return JSON.stringify(val); } catch (e) { return String(val); }
    }
    // other types
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toISOString();
    } catch (e) {
      return String(val);
    }
  };

  return {
    id,
    code: restored.code || "",
    codeLower: String(restored.code || "").trim().toLowerCase(),
    date: makeIso(restored.date) || new Date().toISOString(),
    title: restored.title || "AVISOS ZONALES",
    bannerMessage:
      restored.bannerMessage ||
      "Gracias por revisar todos los avisos! Reacciona con un 🚬 si llegaste hasta aquí",
    avisos: Array.isArray(restored.avisos) ? restored.avisos : [],
    // Preserve publication metadata if present
    published: restored.published === true,
    publicSlug: restored.publicSlug || null,
    publishedAt: makeIso(restored.publishedAt) || null,
    createdAt: makeIso(restored.createdAt) || new Date().toISOString(),
    updatedAt: makeIso(restored.updatedAt) || new Date().toISOString(),
  };
}

function encodeFirestoreValue(value) {
  if (Array.isArray(value)) {
    const containsNestedArray = value.some((item) => Array.isArray(item));
    if (containsNestedArray) {
      return { _firestore_json_: JSON.stringify(value) };
    }
    return value.map(encodeFirestoreValue);
  }

  if (value && typeof value === "object") {
    // Preserve Firestore Timestamp and Date objects as-is when possible
    try {
      if (
        typeof admin !== "undefined" &&
        admin &&
        admin.firestore &&
        typeof admin.firestore.Timestamp === "function" &&
        value instanceof admin.firestore.Timestamp
      ) {
        return value;
      }
    } catch (e) {
      // ignore
    }

    if (value instanceof Date) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, encodeFirestoreValue(val)]),
    );
  }

  return value;
}

function sanitizeSetForFirestore(set) {
  return encodeFirestoreValue(set);
}

function convertDatesToFirestoreValues(obj) {
  if (!isFirestoreAvailable()) return obj;

  const copy = { ...obj };

  try {
    // createdAt
    if (copy.createdAt) {
      if (typeof copy.createdAt === 'string') {
        const d = new Date(copy.createdAt);
        copy.createdAt = isNaN(d.getTime()) ? admin.firestore.Timestamp.now() : admin.firestore.Timestamp.fromDate(d);
      } else if (copy.createdAt instanceof Date) {
        copy.createdAt = admin.firestore.Timestamp.fromDate(copy.createdAt);
      }
    } else {
      copy.createdAt = admin.firestore.Timestamp.now();
    }

    // updatedAt
    if (copy.updatedAt) {
      if (typeof copy.updatedAt === 'string') {
        const d = new Date(copy.updatedAt);
        copy.updatedAt = isNaN(d.getTime()) ? admin.firestore.Timestamp.now() : admin.firestore.Timestamp.fromDate(d);
      } else if (copy.updatedAt instanceof Date) {
        copy.updatedAt = admin.firestore.Timestamp.fromDate(copy.updatedAt);
      }
    } else {
      copy.updatedAt = admin.firestore.Timestamp.now();
    }

    // date (user-visible date)
    if (copy.date) {
      if (typeof copy.date === 'string') {
        let parsed = null;
        // dd/mm[/yyyy]
        const parts = copy.date.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) parsed = d;
        }

        if (!parsed) {
          const iso = new Date(copy.date);
          if (!isNaN(iso.getTime())) parsed = iso;
        }

        if (!parsed) {
          const m = copy.date.match(/(?:^[A-Za-záéíóúñÁÉÍÓÚÑ]+\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:del|de)\s+(\d{2,4}))?/i);
          if (m) {
            const day = parseInt(m[1], 10);
            const monthName = m[2].toLowerCase();
            const monthNames = {
              enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
              julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
            };
            const monthIndex = monthNames[monthName];
            const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
            if (typeof monthIndex === 'number') {
              const d = new Date(year, monthIndex, day);
              if (!isNaN(d.getTime())) parsed = d;
            }
          }
        }

        if (parsed) {
          copy.date = admin.firestore.Timestamp.fromDate(parsed);
        }
        // otherwise keep as string
      } else if (copy.date instanceof Date) {
        copy.date = admin.firestore.Timestamp.fromDate(copy.date);
      }
    }
  } catch (e) {
    console.warn('Error converting date fields for Firestore:', e && e.message ? e.message : e);
  }

  return copy;
}

async function saveAllSetsToFirestore(data) {
  if (!isFirestoreAvailable()) {
    return saveAllSets(data);
  }

  const setsCollection = db.collection("sets");
  const existing = await setsCollection.get();
  const existingIds = new Set(existing.docs.map((doc) => doc.id));
  const batch = db.batch();

  const incomingIds = new Set();

  (data.sets || []).forEach((set) => {
    incomingIds.add(String(set.id));
    const ref = setsCollection.doc(String(set.id));
    const payload = sanitizeSetForFirestore(convertDatesToFirestoreValues({
      ...set,
      codeLower: String(set.code || "").trim().toLowerCase(),
    }));

    batch.set(ref, payload);
  });

  existingIds.forEach((id) => {
    if (!incomingIds.has(id)) {
      batch.delete(setsCollection.doc(id));
    }
  });

  await batch.commit();
}

async function loadAllSetsFromFirestore() {
  if (!isFirestoreAvailable()) {
    return loadAllSets();
  }

  const setsCollection = db.collection("sets");
  const snapshot = await setsCollection.orderBy("createdAt", "asc").get();
  const sets = snapshot.docs.map((doc) => toPlainSet(doc.data(), doc.id));
  const migrated = migrateLegacySetCodes(sets);

  if (migrated.changed) {
    await saveAllSetsToFirestore({ sets: migrated.sets });
  }

  return { sets: migrated.sets };
}

function saveAllSets(data) {
  const payload = {
    sets: Array.isArray(data.sets) ? data.sets : [],
  };

  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));
}

async function loadAllSets() {
  if (isFirestoreAvailable()) {
    return loadAllSetsFromFirestore();
  }

  return loadAllSetsFromFile();
}

function loadAllSetsFromFile() {
  const raw = readRawData();
  const normalized = normalizeToMultiSet(raw);
  const migrated = migrateLegacySetCodes(normalized.sets);

  if (migrated.changed) {
    saveAllSets({ sets: migrated.sets });
  }

  return { sets: migrated.sets };
}

async function findSetById(id) {
  if (!id) {
    return { set: null, sets: [] };
  }

  const { sets } = await loadAllSets();
  const set = sets.find((s) => String(s.id) === String(id));
  return { set, sets };
}

function ensureUniqueCode(sets, code, ignoreId) {
  if (!code) return;
  const target = String(code).trim();

  const clash = sets.find(
    (s) =>
      String(s.code).trim().toLowerCase() === target.toLowerCase() &&
      String(s.id) !== String(ignoreId),
  );

  if (clash) {
    const err = new Error("Ya existe un set con ese código");
    err.code = "DUPLICATE_CODE";
    throw err;
  }
}

async function createSet({ code, date, title, bannerMessage, avisos, source = "SET" }) {
  const { sets } = await loadAllSets();

  const now = new Date().toISOString();

  const newSet = {
    id: uuidv4(),
    code: resolveSetCode(sets, code, source),
    date: date || new Date().toISOString(),
    title: title || "AVISOS ZONALES",
    bannerMessage: bannerMessage || "Gracias por revisar todos los avisos! Reacciona con un 🚬 si llegaste hasta aquí",
    avisos: Array.isArray(avisos) ? avisos : [],
    createdAt: now,
    updatedAt: now,
  };

  ensureUniqueCode(sets, newSet.code);

  const updated = { sets: [...sets, newSet] };

  if (isFirestoreAvailable()) {
    await db.collection("sets").doc(newSet.id).set(sanitizeSetForFirestore(convertDatesToFirestoreValues({
      ...newSet,
      codeLower: String(newSet.code || "").trim().toLowerCase(),
    })));
  } else {
    saveAllSets(updated);
  }

  return newSet;
}

async function updateSet(id, partial) {
  const { sets } = await loadAllSets();
  const idx = sets.findIndex((s) => String(s.id) === String(id));

  if (idx === -1) {
    const err = new Error("Set no encontrado");
    err.code = "NOT_FOUND";
    throw err;
  }

  const existing = sets[idx];
  const merged = {
    ...existing,
    ...partial,
    code:
      partial.code !== undefined
        ? resolveSetCode(sets, partial.code, inferCodePrefix(existing.code, "SET"), id)
        : existing.code,
    updatedAt: new Date().toISOString(),
  };

  ensureUniqueCode(sets, merged.code, merged.id);

  const nextSets = [...sets];
  nextSets[idx] = merged;

  if (isFirestoreAvailable()) {
    await db.collection("sets").doc(merged.id).set(sanitizeSetForFirestore(convertDatesToFirestoreValues({
      ...merged,
      codeLower: String(merged.code || "").trim().toLowerCase(),
    })));
  } else {
    saveAllSets({ sets: nextSets });
  }

  return merged;
}

async function deleteSet(id) {
  if (isFirestoreAvailable()) {
    await db.collection("sets").doc(String(id)).delete();
    return { removed: 1 };
  }

  const { sets } = loadAllSetsFromFile();
  const nextSets = sets.filter((s) => String(s.id) !== String(id));
  saveAllSets({ sets: nextSets });
  return { removed: sets.length - nextSets.length };
}

async function duplicateSet(id) {
  const { sets } = await loadAllSets();
  const original = sets.find((s) => String(s.id) === String(id));

  if (!original) {
    const err = new Error("Set no encontrado");
    err.code = "NOT_FOUND";
    throw err;
  }

  const now = new Date().toISOString();
  const candidate = resolveSetCode(
    sets,
    "",
    inferCodePrefix(original.code, "SET"),
  );

  const cloned = {
    ...original,
    id: uuidv4(),
    code: candidate,
    createdAt: now,
    updatedAt: now,
  };

  if (isFirestoreAvailable()) {
    await db.collection("sets").doc(cloned.id).set(sanitizeSetForFirestore(convertDatesToFirestoreValues({
      ...cloned,
      codeLower: String(cloned.code || "").trim().toLowerCase(),
    })));
  } else {
    const nextSets = [...sets, cloned];
    saveAllSets({ sets: nextSets });
  }

  return cloned;
}

module.exports = {
  loadAllSets,
  saveAllSets,
  findSetById,
  createSet,
  updateSet,
  deleteSet,
  duplicateSet,
};
