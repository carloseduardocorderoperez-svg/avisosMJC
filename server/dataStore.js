const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const dataPath = path.join(__dirname, "../data/avisos.json");
const SIMPLE_CODE_RE = /^([A-Z0-9]+)-(\d{3,})$/;
const LEGACY_AUTO_CODE_RE = /^(HTML|AI)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-copy(?:\d+)?)*$/i;

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
    date: new Date().toLocaleDateString("es-MX"),
    title: "AVISOS ZONALES",
    avisos,
    createdAt: now,
    updatedAt: now,
  };

  return { sets: [defaultSet] };
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

function loadAllSets() {
  const raw = readRawData();
  const normalized = normalizeToMultiSet(raw);
  const migrated = migrateLegacySetCodes(normalized.sets);

  if (migrated.changed) {
    saveAllSets({ sets: migrated.sets });
  }

  return { sets: migrated.sets };
}

function saveAllSets(data) {
  const payload = {
    sets: Array.isArray(data.sets) ? data.sets : [],
  };

  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));
}

function findSetById(id) {
  const { sets } = loadAllSets();
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

function createSet({ code, date, title, bannerMessage, avisos, source = "SET" }) {
  const { sets } = loadAllSets();

  const now = new Date().toISOString();

  const newSet = {
    id: uuidv4(),
    code: resolveSetCode(sets, code, source),
    date: date || new Date().toLocaleDateString("es-MX"),
    title: title || "AVISOS ZONALES",
    bannerMessage: bannerMessage || "Gracias por revisar todos los avisos! Reacciona con un 🚬 si llegaste hasta aquí",
    avisos: Array.isArray(avisos) ? avisos : [],
    createdAt: now,
    updatedAt: now,
  };

  ensureUniqueCode(sets, newSet.code);

  const updated = { sets: [...sets, newSet] };
  saveAllSets(updated);

  return newSet;
}

function updateSet(id, partial) {
  const { sets } = loadAllSets();
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

  saveAllSets({ sets: nextSets });

  return merged;
}

function deleteSet(id) {
  const { sets } = loadAllSets();
  const nextSets = sets.filter((s) => String(s.id) !== String(id));
  saveAllSets({ sets: nextSets });
  return { removed: sets.length - nextSets.length };
}

function duplicateSet(id) {
  const { sets } = loadAllSets();
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

  const nextSets = [...sets, cloned];
  saveAllSets({ sets: nextSets });

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
