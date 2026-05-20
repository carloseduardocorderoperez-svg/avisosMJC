require("dotenv").config();
const express = require("express");
// const session = require("express-session");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { convertPdfToImages } = require("./pdfProcessor");
const { analyzeAllSlides, extractFromHtml } = require("./aiExtractor");
const { groupSlides } = require("./groupSlides");
const { generateHTML } = require("./htmlGenerator");
const {
  uploadImageToDrive,
  listImagesFromDrive,
  deleteImageFromDrive,
  getImageStream,
  getAuthUrl: getDriveAuthUrl,
  exchangeCodeForTokens,
} = require("./driveUploader");
const {
  loadAllSets,
  findSetById,
  createSet,
  updateSet,
  deleteSet,
  duplicateSet,
} = require("./dataStore");
const {
  getOAuthClient,
  generateToken,
  verifyToken,
  requireAuth,
  getAuthUrl,
  getUserInfo,
} = require("./auth");

const app = express();
const PORT = 3000;

function clearFolder(folderPath) {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    fs.unlinkSync(filePath);
  }
}

// ===============================
// Middlewares
// ===============================

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// app.use(session({
//   secret: process.env.JWT_SECRET || 'mjc-avisos-session-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: false, // En desarrollo, false. En producción, true con HTTPS
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000, // 24 horas
//   },
// }));
app.use("/output", express.static(path.join(__dirname, "../output")));

// ===============================
// Carpetas necesarias
// ===============================

const uploadsDir = path.join(__dirname, "../uploads");
const imagesDir = path.join(__dirname, "../images");
const dataDir = path.join(__dirname, "../data");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// ===============================
// Configuración de subida de PDF
// ===============================

// Multer para PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const id = uuidv4();
    const fileName = `pdf_${id}.pdf`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
});

// Multer para imágenes (subida a Drive)
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `img_${id}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen"));
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function clearFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return;

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    fs.unlinkSync(filePath);
  }
}

function cleanBeforeUpload(req, res, next) {
  clearFolder(uploadsDir);
  clearFolder(imagesDir);
  // No limpiar dataDir: contiene avisos.json con todos los sets guardados.
  const outputDir = path.join(__dirname, "../output");
  clearFolder(outputDir);

  next();
}

// ===============================
// Rutas
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "Servidor de Avisos MJC funcionando",
  });
});

// ===============================
// Subir PDF
// ===============================

app.post(
  "/upload-pdf",
  requireAuth,
  cleanBeforeUpload,
  upload.single("pdf"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No se subió ningún archivo",
        });
      }
      const filePath = req.file.path;

      console.log("PDF recibido:", filePath);
      await convertPdfToImages(filePath);

      res.json({
        message: "PDF subido correctamente",
        file: req.file.filename,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Error al subir PDF",
      });
    }
  },
);

// ===============================
// Sets de avisos (multi-set) - PROTEGIDAS
// ===============================

// Listar sets (solo metadatos básicos)
app.get("/sets", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(200, parseInt(req.query.pageSize || "18", 10) || 18));

  const { sets } = await loadAllSets();

  const mapped = sets.map((s) => {
    const avisosList = Array.isArray(s.avisos) ? s.avisos : [];
    const previewAvisos = avisosList.slice(0, 3).map((aviso) => ({
      id: aviso.id,
      titulo: aviso.titulo || aviso.texto || aviso.categoria || "Aviso",
      categoria: aviso.categoria || "",
      texto: aviso.texto || "",
    }));

    return {
      id: s.id,
      code: s.code,
      // publication metadata exposed to admin UI
      published: !!s.published,
      publicSlug: s.publicSlug || null,
      publishedAt: s.publishedAt || s.updatedAt,
      date: s.date,
      title: s.title,
      avisosCount: avisosList.length,
      previewAvisos,
      overflowCount: Math.max(0, avisosList.length - previewAvisos.length),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  // ordenar por date descendente (más reciente primero)
  // filtro por query 'q' si provista (search server-side)
  const q = String(req.query.q || "").trim().toLowerCase();
  const filtered = q
    ? mapped.filter((s) => {
        if ((s.title || "").toLowerCase().includes(q)) return true;
        if ((s.code || "").toLowerCase().includes(q)) return true;
        if ((s.date || "").toLowerCase().includes(q)) return true;
        if (Array.isArray(s.previewAvisos) && s.previewAvisos.some((p) => (p.titulo || "").toLowerCase().includes(q))) return true;
        return false;
      })
    : mapped;

  const ordered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = ordered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = ordered.slice(start, end);
  const hasMore = end < total;

  res.json({ sets: pageItems, total, page, pageSize, hasMore });
});

// Crear un nuevo set vacío (o con avisos iniciales opcionales)
app.post("/sets", requireAuth, async (req, res) => {
  try {
    const { code, date, title, avisos } = req.body || {};

    const nuevo = await createSet({ code, date, title, avisos, source: "SET" });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error("Error creando set:", error);

    if (error.code === "DUPLICATE_CODE") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error creando set" });
  }
});

// Actualizar metadatos o avisos de un set
app.put("/sets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, date, title, bannerMessage, avisos } = req.body || {};

    const updated = await updateSet(id, {
      ...(code != null ? { code } : {}),
      ...(date != null ? { date } : {}),
      ...(title != null ? { title } : {}),
      ...(bannerMessage != null ? { bannerMessage } : {}),
      ...(Array.isArray(avisos) ? { avisos } : {}),
    });

    res.json(updated);
  } catch (error) {
    console.error("Error actualizando set:", error);

    if (error.code === "DUPLICATE_CODE") {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Error actualizando set" });
  }
});

// Eliminar un set completo
app.delete("/sets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteSet(id);
    res.json(result);
  } catch (error) {
    console.error("Error eliminando set:", error);
    res.status(500).json({ error: "Error eliminando set" });
  }
});

// Duplicar un set (clona avisos y asigna nuevo código único)
app.post("/sets/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const cloned = await duplicateSet(id);
    res.status(201).json(cloned);
  } catch (error) {
    console.error("Error duplicando set:", error);

    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Error duplicando set" });
  }
});

// Generar HTML sólo para un set concreto
app.post("/sets/:id/generar-html", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { set } = await findSetById(id);

    if (!set) {
      return res.status(404).json({ error: "Set no encontrado" });
    }

    // Actualizar la fecha del set a la fecha actual (local YYYY-MM-DD)
    const nowLocal = new Date();
    const localDateStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
    set.date = localDateStr;
    await updateSet(id, set);

    const title = set.title || "AVISOS ZONALES";

    const htmlFile = generateHTML({
      avisos: Array.isArray(set.avisos) ? set.avisos : [],
      date: set.date,
      title,
      bannerMessage: set.bannerMessage,
    });
    // Si la función devuelve un nombre de archivo, leer su contenido para devolver HTML
    try {
      const outputDir = path.join(__dirname, "../output");
      const possiblePath = path.join(outputDir, String(htmlFile || ""));
      if (fs.existsSync(possiblePath)) {
        const contenido = fs.readFileSync(possiblePath, "utf8");
        res.json({ ok: true, archivo: htmlFile, archivoContenido: contenido, setId: set.id });
        return;
      }
    } catch (e) {
      console.warn('No se pudo leer archivo generado:', e && e.message ? e.message : e);
    }

    res.json({ ok: true, archivo: htmlFile, setId: set.id });
  } catch (error) {
    console.error("Error generando HTML para set:", error);
    res.status(500).json({ error: "Error generando HTML" });
  }
});

// Copiar avisos a un set destino
app.post("/sets/:targetSetId/copy-avisos", requireAuth, async (req, res) => {
  try {
    const { targetSetId } = req.params;
    const { avisos } = req.body || {};

    if (!Array.isArray(avisos) || avisos.length === 0) {
      return res.status(400).json({ error: "Se requiere un array 'avisos' no vacío" });
    }

    const { set: targetSet } = await findSetById(targetSetId);

    if (!targetSet) {
      return res.status(404).json({ error: "Set destino no encontrado" });
    }

    const existingAvisos = Array.isArray(targetSet.avisos) ? targetSet.avisos : [];
    const nextOrden = existingAvisos.reduce((max, a) => Math.max(max, a.orden || 0), 0);

    const newAvisos = avisos.map((aviso, index) => ({
      ...aviso,
      id: uuidv4(),
      orden: nextOrden + index + 1,
    }));

    const updated = await updateSet(targetSetId, {
      avisos: [...existingAvisos, ...newAvisos],
    });

    res.json({ ok: true, set: updated, copied: newAvisos.length });
  } catch (error) {
    console.error("Error copiando avisos:", error);
    res.status(500).json({ error: "Error copiando avisos al set destino" });
  }
});

// ===============================
// Endpoints públicos para sets (lista y detalle por slug)
// ===============================

// Lista sets publicados (sin auth)
app.get("/public/sets", async (req, res) => {
  try {
    const { sets } = await loadAllSets();
    const published = (sets || [])
      .filter((s) => s && (s.published === true))
      .map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        date: s.date,
        publicSlug: s.publicSlug || (s.code || "").toLowerCase(),
        publishedAt: s.publishedAt || s.updatedAt,
        avisosCount: Array.isArray(s.avisos) ? s.avisos.length : 0,
      }));

    // ordenar por publishedAt desc
    published.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json({ sets: published });
  } catch (err) {
    console.error('Error obteniendo sets públicos:', err);
    res.status(500).json({ error: 'Error obteniendo sets públicos' });
  }
});

// Detalle público de un set por slug (sin auth)
app.get('/public/sets/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { sets } = await loadAllSets();

    const lower = String(slug || '').trim().toLowerCase();

    const found = (sets || []).find((s) => {
      if (!s) return false;
      if (s.publicSlug && String(s.publicSlug).toLowerCase() === lower) return true;
      if (String(s.code || '').toLowerCase() === lower) return true;
      if (String(s.id || '') === slug) return true;
      return false;
    });

    if (!found || !found.published) {
      return res.status(404).json({ error: 'Set público no encontrado' });
    }

    // Si el cliente solicita HTML pre-renderizado, generarlo y devolverlo
    if (String(req.query.format || '').toLowerCase() === 'html') {
      try {
        const title = found.title || `AVISOS - ${found.date || ''}`;
        const htmlOrFile = generateHTML({
          avisos: Array.isArray(found.avisos) ? found.avisos : [],
          date: found.date,
          title,
          bannerMessage: found.bannerMessage,
        });

        // Si la función devolvió un nombre de archivo, leer el HTML guardado en /output
        try {
          const outputDir = path.join(__dirname, "../output");
          const possiblePath = path.join(outputDir, String(htmlOrFile || ""));
          if (fs.existsSync(possiblePath)) {
            const contenido = fs.readFileSync(possiblePath, "utf8");
            res.type('text/html').send(contenido);
            return;
          }
        } catch (e) {
          console.warn('No se pudo leer archivo generado público:', e && e.message ? e.message : e);
        }

        // Fallback: si lo que devolvió no es un archivo, enviarlo directamente
        res.type('text/html').send(String(htmlOrFile || ''));
        return;
      } catch (e) {
        console.error('Error generando HTML público:', e);
        // fallback a JSON
      }
    }

    // devolver el set completo (metadatos + avisos)
    res.json({ set: found, avisos: Array.isArray(found.avisos) ? found.avisos : [] });
  } catch (err) {
    console.error('Error obteniendo set público:', err);
    res.status(500).json({ error: 'Error obteniendo set público' });
  }
});

// Publicar / despublicar un set (admin)
app.post('/sets/:id/publish', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { published, publicSlug } = req.body || {};

    const { sets } = await loadAllSets();
    const target = sets.find((s) => String(s.id) === String(id));
    if (!target) return res.status(404).json({ error: 'Set no encontrado' });

    // Si se pide publicar y se proporciona slug, validar unicidad
    if (published === true && publicSlug) {
      const slugLower = String(publicSlug).trim().toLowerCase();
      const clash = (sets || []).some((s) => s && String(s.id) !== String(id) && String(s.publicSlug || '').toLowerCase() === slugLower);
      if (clash) return res.status(400).json({ error: 'publicSlug ya está en uso' });
    }

    // Determinar publicSlug por defecto (si no se pasó uno)
    let desiredSlug = publicSlug && String(publicSlug).trim();
    if (!desiredSlug) {
      const datePart = target.date ? (() => {
        const d = new Date(target.date);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      })() : null;
      const base = (target.code || 'set').toLowerCase();
      desiredSlug = datePart ? `${base}-${datePart}` : base;
    }

    // Normalizar desiredSlug
    desiredSlug = String(desiredSlug || '').trim().toLowerCase().replace(/[^a-z0-9\-_.]+/g, '-').replace(/^-+|-+$/g, '');

    // Evitar colisiones simples: si existe otro con mismo slug, añadir timestamp corto
    const clash = (sets || []).some((s) => s && String(s.id) !== String(id) && String(s.publicSlug || '').toLowerCase() === desiredSlug);
    if (clash) {
      desiredSlug = `${desiredSlug}-${Date.now().toString().slice(-4)}`;
    }

    const updated = await updateSet(id, {
      published: !!published,
      publicSlug: desiredSlug,
      publishedAt: published === true ? new Date().toISOString() : null,
    });

    // Construir publicUrl si aplica
    const clientBase = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const url = updated.published ? `${clientBase}/avisos-semanales/${updated.publicSlug || updated.code}` : null;

    res.json({ ok: true, set: updated, publicUrl: url });
  } catch (err) {
    console.error('Error publicando set:', err);
    res.status(500).json({ error: 'Error publicando set' });
  }
});

// Actualizar la fecha de creación del set
app.patch('/sets/:id/update-date', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body || {};

    if (!date) {
      return res.status(400).json({ error: 'Se requiere una fecha válida' });
    }

    // Normalize incoming date to local YYYY-MM-DD string to avoid timezone shifts
    let normalizedDate = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      normalizedDate = String(date);
    } else {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      normalizedDate = `${y}-${m}-${d}`;
    }

    const { sets } = await loadAllSets();
    const target = sets.find((s) => String(s.id) === String(id));
    if (!target) return res.status(404).json({ error: 'Set no encontrado' });

    const updated = await updateSet(id, {
      date: normalizedDate,
    });

    res.json({ ok: true, set: updated });
  } catch (err) {
    console.error('Error actualizando fecha del set:', err);
    res.status(500).json({ error: 'Error actualizando fecha' });
  }
});

// ===============================
// Obtener avisos guardados (compat y por set)
// ===============================

app.get("/avisos", requireAuth, async (req, res) => {
  const { setId } = req.query;

  const { sets } = await loadAllSets();

  if (!sets.length) {
    return res.json({ avisos: [], set: null });
  }

  if (setId) {
    const set = sets.find((s) => String(s.id) === String(setId));
    if (!set) {
      return res.status(404).json({ error: "Set no encontrado" });
    }
    return res.json({ avisos: set.avisos || [], set });
  }

  const first = sets[0];
  res.json({ avisos: first.avisos || [], set: first });
});

// ===============================
// Guardar avisos (actualizar/crear set)
// ===============================

app.post("/avisos", requireAuth, async (req, res) => {
  try {
    const { setId, avisos, code, date, title, bannerMessage } = req.body || {};

    if (!Array.isArray(avisos)) {
      return res.status(400).json({ error: "Faltan avisos a guardar" });
    }

    const { sets } = await loadAllSets();

    let targetSet;

    if (setId) {
      // Actualizar set concreto (con fallback si el setId es inválido / sesión vieja)
      const setExists = sets.some((s) => String(s.id) === String(setId));
      if (setExists) {
        targetSet = await updateSet(setId, {
          avisos,
          ...(code != null ? { code } : {}),
          ...(date != null ? { date } : {}),
          ...(title != null ? { title } : {}),
          ...(bannerMessage != null ? { bannerMessage } : {}),
        });
      } else {
        // El set ya no existe — crear uno nuevo para no perder los avisos del cliente
        targetSet = await createSet({
          code,
          date,
          title,
          bannerMessage,
          avisos,
          source: "SET",
        });
      }
    } else if (sets.length) {
      // Compat: actualizar el primer set existente
      const first = sets[0];
      targetSet = await updateSet(first.id, {
        avisos,
        ...(code != null ? { code } : {}),
        ...(date != null ? { date } : {}),
        ...(title != null ? { title } : {}),
        ...(bannerMessage != null ? { bannerMessage } : {}),
      });
    } else {
      // No había sets: crear uno nuevo
      targetSet = await createSet({
        code,
        date,
        title,
        bannerMessage,
        avisos,
        source: "SET",
      });
    }

    const htmlTitle = targetSet.date
      ? `AVISOS ZONALES - ${targetSet.date}`
      : targetSet.title || "AVISOS ZONALES";

    const htmlFile = generateHTML({
      avisos: Array.isArray(targetSet.avisos) ? targetSet.avisos : [],
      date: targetSet.date,
      title: htmlTitle,
      bannerMessage: targetSet.bannerMessage,
    });

    res.json({
      message: "Avisos guardados",
      html: htmlFile,
      set: targetSet,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "DUPLICATE_CODE") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: "Error guardando avisos",
    });
  }
});

// ===============================
// Importar avisos desde HTML viejo
// ===============================
app.post("/import-html", requireAuth, async (req, res) => {
  try {
    const { html, code, date } = req.body || {};

    if (!html || typeof html !== "string" || html.trim().length < 50) {
      return res.status(400).json({ error: "Se requiere un HTML válido en el campo 'html'" });
    }

    const aiResult = await extractFromHtml(html);

    const avisos = aiResult.avisos || [];
    const nowLocal = new Date();
    const localDateStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
    const autoDate = date || aiResult.date || localDateStr;
    const autoTitle = aiResult.title || "AVISOS ZONALES";

    const nuevoSet = createSet({
      code,
      date: autoDate,
      title: autoTitle,
      avisos,
      source: "HTML",
    });

    console.log(`HTML importado: ${avisos.length} avisos → set ${nuevoSet.id}`);

    res.json({ avisos: nuevoSet.avisos, set: nuevoSet });
  } catch (error) {
    console.error("Error importando HTML:", error);
    res.status(500).json({ error: "Error procesando el HTML con IA" });
  }
});

// ===============================
// Analizar slides (crea un nuevo set con los avisos)
// ===============================
app.post("/analyze-slides", requireAuth, async (req, res) => {
  try {
    const aiResult = await analyzeAllSlides();
    const avisos = Array.isArray(aiResult.avisos) ? aiResult.avisos : [];
    const persist = String(req.query.persist || "true").toLowerCase() !== "false";

    console.log("AVISOS GENERADOS:", avisos.length, "persist=", persist);

    if (persist) {
      const nowLocal = new Date();
      const localDateStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
      const nuevoSet = await createSet({
        date: localDateStr,
        avisos,
        source: "AI",
      });
      return res.json({ avisos: nuevoSet.avisos, set: nuevoSet });
    }

    return res.json({ avisos });
  } catch (error) {
    console.error("Error analizando slides:", error);
    res.status(500).json({
      error: "Error analizando slides",
    });
  }
});

// ===============================
// generar HTML con avisos
// ===============================

app.post("/generar-html", requireAuth, async (req, res) => {
  try {
    const { sets } = await loadAllSets();
    const set = sets[0];

    if (!set) {
      return res.status(404).json({ error: "No hay sets disponibles para generar HTML" });
    }

    const htmlFile = generateHTML({
      avisos: Array.isArray(set.avisos) ? set.avisos : [],
      date: set.date,
      title: set.title || "AVISOS ZONALES",
      bannerMessage: set.bannerMessage,
    });

    res.json({
      ok: true,
      archivo: htmlFile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error generando HTML",
    });
  }
});

// ===============================
// Auth Google OAuth2 (con verificación de email)
// ===============================

app.get("/auth/status", (req, res) => {
  // Verificar si hay token JWT en headers o cookies
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies?.['auth_token'];

  if (!token) {
    return res.json({ authorized: false });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.json({ authorized: false });
  }

  const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL;
  if (allowedEmail && user.email !== allowedEmail) {
    return res.json({ authorized: false, error: 'Email no autorizado' });
  }

  res.json({
    authorized: true,
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
});

app.get("/auth/login", (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: `Error al iniciar login: ${err.message}` });
  }
});

// Iniciar autorización para Google Drive (ventana popup desde cliente)
app.get('/auth/start', (req, res) => {
  try {
    const url = getDriveAuthUrl();
    return res.redirect(url);
  } catch (err) {
    console.error('Error iniciando Drive auth:', err);
    return res.status(500).send(`Error iniciando autorización: ${err.message}`);
  }
});

app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Falta el código de autorización.");
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await getUserInfo(tokens.access_token);
    const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL;

    if (allowedEmail && userInfo.email !== allowedEmail) {
      return res.status(403).send(`
        <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
          <h2>❌ Acceso denegado</h2>
          <p>El email <strong>${userInfo.email}</strong> no está autorizado para acceder a esta aplicación.</p>
          <p>Solo se permite acceso con: <strong>${allowedEmail}</strong></p>
        </body></html>
      `);
    }

    // Generar JWT y guardarlo en cookie
    const jwtToken = generateToken(userInfo);
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    });

    // Redirigir de vuelta a la aplicación (al dashboard)
    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const redirectUrl = process.env.CLIENT_USE_HASH === 'true'
      ? `${clientBase}/#/dashboard`
      : `${clientBase}/dashboard`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error en callback:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Callback específico para la autorización de Google Drive
app.get('/auth/drive/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Falta el código de autorización.');
  }

  try {
    const envPath = path.join(__dirname, '..', '.env');
    // Asegurar que exista .env para poder escribir (si no existe, crear vacío)
    if (!fs.existsSync(envPath)) {
      try { fs.writeFileSync(envPath, '', 'utf8'); } catch (_) {}
    }

    await exchangeCodeForTokens(code, envPath);

    // Responder con una página que cierre la ventana popup y notifique al opener
    return res.send(`
      <html>
        <body style="font-family:sans-serif;padding:24px;">
          <h2>Autorización completada</h2>
          <p>Puedes cerrar esta ventana.</p>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'drive-auth-success' }, '*');
              }
            } catch(e){}
            setTimeout(()=>window.close(), 1200);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error en Drive callback:', err);
    return res.status(500).send(`Error autorizando Drive: ${err.message}`);
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// ===============================
// Galería de imágenes (Google Drive)
// ===============================

app.get("/images", requireAuth, async (req, res) => {
  try {
    const folderId = process.env.DRIVE_IMAGES_FOLDER_ID;
    if (!folderId) {
      return res.status(500).json({ error: "DRIVE_IMAGES_FOLDER_ID no configurado en .env" });
    }
    const images = await listImagesFromDrive(folderId);
    res.json({ images });
  } catch (err) {
    console.error("Error listando imágenes de Drive:", err && err.message ? err.message : err);
    if (err && (err.name === 'DriveAuthError' || err.reauthUrl)) {
      return res.status(401).json({ error: 'drive_token_revoked', reauthUrl: err.reauthUrl || '/auth/start', message: err.message });
    }
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/images/upload", requireAuth, imageUpload.single("image"), async (req, res) => {
  try {
    const folderId = process.env.DRIVE_IMAGES_FOLDER_ID;
    if (!folderId) {
      return res.status(500).json({ error: "DRIVE_IMAGES_FOLDER_ID no configurado en .env" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    const result = await uploadImageToDrive(
      req.file.path,
      req.file.originalname,
      folderId,
    );

    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}

    res.json(result);
  } catch (err) {
    console.error("Error subiendo imagen a Drive:", err && err.message ? err.message : err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    if (err && (err.name === 'DriveAuthError' || err.reauthUrl)) {
      return res.status(401).json({ error: 'drive_token_revoked', reauthUrl: err.reauthUrl || '/auth/start', message: err.message });
    }
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.delete("/images/:id", requireAuth, async (req, res) => {
  try {
    await deleteImageFromDrive(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando imagen de Drive:", err && err.message ? err.message : err);
    if (err && (err.name === 'DriveAuthError' || err.reauthUrl)) {
      return res.status(401).json({ error: 'drive_token_revoked', reauthUrl: err.reauthUrl || '/auth/start', message: err.message });
    }
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Proxy de thumbnails: sirve la imagen desde Drive sin necesitar login en el browser
app.get("/images/thumb/:id", async (req, res) => {
  try {
    const { stream, mimeType } = await getImageStream(req.params.id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    stream.pipe(res);
  } catch (err) {
    console.error("Error sirviendo thumbnail:", err && err.message ? err.message : err);
    if (err && (err.name === 'DriveAuthError' || err.reauthUrl)) {
      // Respond with 401 and json so clients know they must reauthorize.
      return res.status(401).json({ error: 'drive_token_revoked', reauthUrl: err.reauthUrl || '/auth/start' });
    }
    res.status(500).end();
  }
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ===============================
// Iniciar servidor
// ===============================

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
