require("dotenv").config();
const fs = require("fs");
const path = require("path");
const adminModule = require("firebase-admin");

function getServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    return require(path.resolve(serviceAccountPath));
  }

  throw new Error(
    "No se encontró credencial de Firebase. Define FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

function normalizeData(raw) {
  if (raw && Array.isArray(raw.sets)) {
    return raw.sets;
  }

  if (raw && Array.isArray(raw.avisos)) {
    return [
      {
        id: raw.id || raw.code || `set-${Date.now()}`,
        code: raw.code || "DEFAULT",
        date: raw.date || new Date().toISOString(),
        title: raw.title || "AVISOS ZONALES",
        bannerMessage: raw.bannerMessage,
        avisos: raw.avisos,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      },
    ];
  }

  return [];
}

function encodeForFirestore(value) {
  if (Array.isArray(value)) {
    const containsNestedArray = value.some((item) => Array.isArray(item));
    if (containsNestedArray) {
      return { _firestore_json_: JSON.stringify(value) };
    }
    return value.map(encodeForFirestore);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, encodeForFirestore(val)]),
    );
  }

  return value;
}

async function main() {
  const serviceAccount = getServiceAccount();
  adminModule.initializeApp({
    credential: adminModule.credential.cert(serviceAccount),
  });

  const db = adminModule.firestore();
  const jsonPath = path.join(__dirname, "../data/avisos.json");

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No existe el archivo ${jsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const sets = normalizeData(raw);

  if (!sets.length) {
    console.log("No se encontraron sets en data/avisos.json.");
    return;
  }

  const batch = db.batch();
  const collection = db.collection("sets");

  sets.forEach((set) => {
    const id = String(set.id || set.code || `set-${Date.now()}`);
    const docRef = collection.doc(id);
    batch.set(docRef, encodeForFirestore({
      ...set,
      codeLower: String(set.code || "").trim().toLowerCase(),
    }));
  });

  await batch.commit();
  console.log(`Migrados ${sets.length} sets a Firestore en la colección 'sets'.`);
}

main().catch((error) => {
  console.error("Error migrando avisos a Firestore:", error);
  process.exit(1);
});
