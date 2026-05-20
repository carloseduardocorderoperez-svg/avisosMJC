const fs = require("fs");
const path = require("path");

// ===============================
// Helpers de estilos por bloque
// ===============================

function extraClassAttr(baseClasses, b) {
  const classes = [];

  if (baseClasses && typeof baseClasses === "string") {
    classes.push(
      ...baseClasses
        .split(" ")
        .map((c) => c.trim())
        .filter(Boolean),
    );
  }

  if (b && b.classes) {
    if (Array.isArray(b.classes)) {
      classes.push(
        ...b.classes
          .map((c) => String(c).trim())
          .filter((c) => c.length > 0),
      );
    } else if (typeof b.classes === "string") {
      classes.push(
        ...b.classes
          .split(" ")
          .map((c) => c.trim())
          .filter(Boolean),
      );
    }
  }

  if (!classes.length) return "";

  return ` class="${classes.join(" ")}"`;
}

function normalizeDriveUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const u = new URL(rawUrl);

    if (!u.hostname.includes("drive.google.com")) {
      return rawUrl;
    }

    const matchFile = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (matchFile && matchFile[1]) {
      return `https://drive.google.com/thumbnail?id=${matchFile[1]}&sz=w2000`;
    }

    const id = u.searchParams.get("id");
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
    }

    return rawUrl;
  } catch (e) {
    return rawUrl;
  }
}

function extractDriveFileId(rawUrl) {
  if (!rawUrl) return "";

  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes("drive.google.com")) return "";

    const matchFile = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (matchFile && matchFile[1]) {
      return matchFile[1];
    }

    return u.searchParams.get("id") || "";
  } catch (e) {
    return "";
  }
}

// ===============================
// Render de bloques
// ===============================

function renderBloque(b) {
  if (!b) return "";

  // ===============================
  // TEXTO
  // ===============================

  if (b.tipo === "texto" || (!b.tipo && b.texto)) {
    const contenido = b.contenido || b.texto || "";
    return `<p${extraClassAttr("canvas-block-text", b)} style="margin-top:10px">${contenido}</p>`;
  }

  // ===============================
  // LISTA
  // ===============================

  if (b.tipo === "lista" || b.lista) {
    const items = b.contenido || b.lista || [];

    if (!Array.isArray(items)) {
      return `<p>${items}</p>`;
    }

    return `
  <ul${extraClassAttr("canvas-list", b)} style="margin-top:10px">
${items.map((i) => `<li>${i}</li>`).join("")}
</ul>
`;
  }

  // ===============================
  // LINK
  // ===============================

  if (b.tipo === "link" || b.link) {
    const texto = b.texto || b.contenido || b.link || "ABRIR";
    const url = String(b.url || "#").trim();
    const targetAttrs = url && url !== "#" ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";

    return `
<a href="${url}"${targetAttrs}${extraClassAttr("canvas-link", b)}>
  <span class="canvas-link-edge"></span>
  <span class="canvas-link-front">${texto}</span>
</a>
`;
  }

  // ===============================
  // IMAGEN
  // ===============================

  if (b.tipo === "imagen") {
    const originalUrl = b.normalizedUrl || b.url || "";
    const src = normalizeDriveUrl(originalUrl);
    const driveId = extractDriveFileId(b.url || originalUrl);
    const drivePreviewUrl = driveId
      ? `https://drive.google.com/file/d/${driveId}/preview`
      : "";

    if (!src) return "";

    return `
<div${extraClassAttr("canvas-imagen", b)} style="margin-top:12px;text-align:center">
  <img src="${src}" alt="" style="max-width:100%;border-radius:6px" onerror="if(this.nextElementSibling){this.style.display='none';this.nextElementSibling.style.display='block';}" />
  ${drivePreviewUrl ? `<iframe src="${drivePreviewUrl}" style="display:none;"></iframe>` : ""}
</div>
`;
  }

  // ===============================
  // TABLA
  // ===============================

  if (b.tipo === "tabla") {
    const filas = b.filas || b.contenido || [];

    if (!Array.isArray(filas)) {
      return `<p>${filas}</p>`;
    }

    const tableStyle =
      "width:100%;border-collapse:collapse;color:#fff;font-size:12px;margin-top:12px";

    const cellStyle = "padding:6px 8px";

    return `
  <table${extraClassAttr("canvas-table", b)} style="${tableStyle}">

${filas
  .map((f) => {
    if (!Array.isArray(f) && typeof f === "object") {
      return `
<tr>
${Object.values(f)
  .map((c) => `<td style="${cellStyle}">${c}</td>`)
  .join("")}
</tr>
`;
    }

    if (Array.isArray(f)) {
      return `
<tr>
${f.map((c) => `<td style="${cellStyle}">${c}</td>`).join("")}
</tr>
`;
    }

    return `
<tr>
<td style="${cellStyle}">${f}</td>
</tr>
`;
  })
  .join("")}

</table>
`;
  }

  // ===============================
  // INFO (fecha/lugar/horario)
  // ===============================

  if (b.tipo === "info") {
    const partes = [];

    if (b.fecha) partes.push(`📅 ${b.fecha}`);
    if (b.lugar) partes.push(`📍 ${b.lugar}`);
    if (b.horario) partes.push(`🕒 ${b.horario}`);

    if (partes.length === 0) return "";

    return `
<div class="canvas-info">
${partes.join(" | ")}
</div>
`;
  }

  // ===============================
  // CHIPS (personas)
  // ===============================

  if (b.tipo === "chips") {
    const items = b.items || [];

    if (!Array.isArray(items) || items.length === 0) return "";

    return `
<div>
  <div class="canvas-meta">Más información:</div>
  <div class="canvas-chips">
${items
  .map((p) => `    <span class="canvas-chip">${p}</span>`)
  .join("\n")}
  </div>
</div>
`;
  }

  // ===============================
  // BANCO (transferencia)
  // ===============================

  if (b.tipo === "banco") {
    return `
<div class="canvas-banco">

<div class="canvas-banco-header">💳 TRANSFERENCIA</div>

${
  b.banco
    ? `
<div class="canvas-banco-row">
<span class="canvas-banco-label">Banco:</span>
<span class="canvas-banco-value">${b.banco}</span>
</div>`
    : ""
}

${
  b.tipoCuenta
    ? `
<div class="canvas-banco-row">
<span class="canvas-banco-label">Tipo:</span>
<span class="canvas-banco-value">${b.tipoCuenta}</span>
</div>`
    : ""
}

${
  b.cuenta
    ? `
<div class="canvas-banco-row">
<span class="canvas-banco-label">Cuenta:</span>
<span class="canvas-banco-value">${b.cuenta}</span>
</div>`
    : ""
}

${
  b.titular
    ? `
<div class="canvas-banco-row">
<span class="canvas-banco-label">Titular:</span>
<span class="canvas-banco-value">${b.titular}</span>
</div>`
    : ""
}

${
  b.referencia
    ? `
<div class="canvas-banco-row">
<span class="canvas-banco-label">Referencia:</span>
<span class="canvas-banco-value">${b.referencia}</span>
</div>`
    : ""
}

</div>
`;
  }

  return "";
}

// ===============================
// Render aviso
// ===============================

function renderAviso(aviso) {
  const bloquesHTML = (aviso.bloques || []).map(renderBloque).join("");

  return `
<div class="card ${aviso.categoria || ""}">
<div class="title">${aviso.titulo || ""}</div>
${bloquesHTML}
</div>
`;
}

// ===============================
// Normalizar categoría
// ===============================

function normalizarCategoria(cat) {
  if (!cat) return "extras";

  const c = cat.toLowerCase();

  if (c.includes("admin")) return "admin";
  if (c.includes("evento")) return "eventos";
  if (c.includes("pastoral")) return "pastoral";
  if (c.includes("formacion") || c.includes("curso")) return "formacion";

  return "extras";
}

// ===============================
// Fecha larga
// ===============================

function fechaLarga(dateStr) {
  const diasSemana = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
  ];
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  // Parsear tomando SOLO la porción fecha (año-mes-día) para evitar shifts por zona horaria
  let fecha;
  if (dateStr) {
    if (dateStr instanceof Date) {
      fecha = dateStr;
    } else if (typeof dateStr === 'string') {
      const s = dateStr.trim();

      // dd/mm/yyyy
      const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dm) {
        const day = parseInt(dm[1], 10);
        const month = parseInt(dm[2], 10) - 1;
        const year = dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10);
        fecha = new Date(year, month, day);
      } else {
        // ISO-like (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS...)
        const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          const parts = isoMatch[1].split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          fecha = new Date(year, month, day);
        } else {
          // Fallback: dejar que Date intente parsear (último recurso)
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) fecha = parsed;
        }
      }
    }
  }

  if (!fecha || isNaN(fecha)) fecha = new Date();

  const diaSemana = diasSemana[fecha.getDay()];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();

  return `${diaSemana} ${dia} de ${mes} del ${año}`;
}

// ===============================
// Generar HTML final
// ===============================

// options (todos opcionales):
// - avisos: array de avisos a renderizar
// - date: fecha a mostrar en el HTML
// - title: título principal del HTML
function generateHTML(options = {}) {
  const templatePath = path.join(__dirname, "../template/avisos_template.html");
  const dataPath = path.join(__dirname, "../data/avisos.json");

  const outputDir = path.join(__dirname, "../output");
  const outputFile = "avisos_generados.html";
  const outputPath = path.join(outputDir, outputFile);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const template = fs.readFileSync(templatePath, "utf8");

  const DEFAULT_BANNER = "Gracias por revisar todos los avisos! Reacciona con un \uD83D\uDEAC si llegaste hasta aqu\u00ED";

  let avisos = [];
  let metaTitle = options.title || "AVISOS ZONALES";
  let metaDate = options.date ? fechaLarga(options.date) : fechaLarga();
  let metaBanner = options.bannerMessage || DEFAULT_BANNER;

  if (Array.isArray(options.avisos)) {
    avisos = options.avisos;
  } else {
    // Compatibilidad con archivos antiguos y nuevo modelo multi-set
    let raw = {};
    try {
      raw = JSON.parse(fs.readFileSync(dataPath));
    } catch (e) {
      raw = {};
    }

    if (Array.isArray(raw.avisos)) {
      avisos = raw.avisos;
    } else {
      const current = Array.isArray(raw.sets) ? raw.sets[0] : null;
      if (current) {
        avisos = Array.isArray(current.avisos) ? current.avisos : [];
        if (!options.title && current.title) {
          // Quitar la fecha del título si fue guardada como "TÍTULO - DD/MM/YYYY"
          metaTitle = current.title.replace(/ - \d{2}\/\d{2}\/\d{4}$/, "").trim();
        }
        if (!options.date && current.date) {
          metaDate = fechaLarga(current.date);
        }
        if (!options.bannerMessage && current.bannerMessage) {
          metaBanner = current.bannerMessage;
        }
      } else {
        avisos = [];
      }
    }
  }

  const secciones = {
    admin: "",
    eventos: "",
    pastoral: "",
    formacion: "",
    extras: "",
  };

  (avisos || [])
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .forEach((aviso) => {
      const categoria = normalizarCategoria(aviso.categoria);

      if (!(categoria in secciones)) {
        secciones.extras += renderAviso(aviso);
      } else {
        secciones[categoria] += renderAviso(aviso);
      }
    });

  const blocksCssPath = path.join(__dirname, '../client/src/styles/blocks.css');
  const blockStyles = `<style>\n${fs.readFileSync(blocksCssPath, 'utf8')}\n</style>`;

  const SECCIONES_DEF = [
    { key: "admin",     navPlaceholder: "{{NAV_ADMIN}}",     sectionPlaceholder: "{{SECTION_ADMIN}}",     navLabel: "📋 ADMINISTRATIVOS" },
    { key: "eventos",   navPlaceholder: "{{NAV_EVENTOS}}",   sectionPlaceholder: "{{SECTION_EVENTOS}}",   navLabel: "🎉 EVENTOS" },
    { key: "pastoral",  navPlaceholder: "{{NAV_PASTORAL}}",  sectionPlaceholder: "{{SECTION_PASTORAL}}",  navLabel: "🙏 PASTORAL" },
    { key: "formacion", navPlaceholder: "{{NAV_FORMACION}}", sectionPlaceholder: "{{SECTION_FORMACION}}", navLabel: "📚 FORMACIÓN" },
    { key: "extras",    navPlaceholder: "{{NAV_EXTRAS}}",    sectionPlaceholder: "{{SECTION_EXTRAS}}",    navLabel: "📌 AVISOS EXTRA" },
  ];

  // La primera sección con contenido recibe la clase "active"
  const firstNonEmpty = SECCIONES_DEF.find((s) => secciones[s.key]) || SECCIONES_DEF[0];

  let html = template;

  html = html
    .replace(/{{BLOCK_STYLES}}/g, blockStyles)
    .replace(/{{TITLE}}/g, metaTitle)
    .replace(/{{DATE}}/g, metaDate)
    .replace(/{{BANNER_MESSAGE}}/g, metaBanner)
    .replace(/{{YEAR}}/g, new Date().getFullYear());

  for (const sec of SECCIONES_DEF) {
    if (secciones[sec.key]) {
      const isActive = sec.key === firstNonEmpty.key;
      html = html
        .replace(sec.navPlaceholder, `<button class="nav-btn${isActive ? " active" : ""}" data-section="${sec.key}">\n${sec.navLabel}\n</button>`)
        .replace(sec.sectionPlaceholder, `<div id="${sec.key}" class="section${isActive ? " active" : ""}">\n${secciones[sec.key]}\n</div>`);
    } else {
      html = html
        .replace(sec.navPlaceholder, "")
        .replace(sec.sectionPlaceholder, "");
    }
  }

  fs.writeFileSync(outputPath, html);

  return outputFile;
}

module.exports = {
  generateHTML,
};
