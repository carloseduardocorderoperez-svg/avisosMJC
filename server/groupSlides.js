function cleanJSON(text) {
  if (!text) return null;

  text = text.replace(/```json/g, "");
  text = text.replace(/```/g, "");
  text = text.trim();

  return text;
}

function groupSlides(slideAnalyses) {
  const avisos = [];

  let currentAviso = null;
  let orden = 1;

  for (const slide of slideAnalyses) {
    let parsed;

    try {
      const cleaned = cleanJSON(slide.analysis);

      parsed = JSON.parse(cleaned);
      // ignorar portada del PDF
      if (parsed.titulo && parsed.titulo.toUpperCase().trim() === "AVISOS") {
        continue;
      }
    } catch (e) {
      console.log("No se pudo parsear slide:", slide.slide);

      continue;
    }

    if (parsed.titulo === "AVISOS") {
      continue;
    }

    let titulo = parsed.titulo || "";

    // Si no hay título usar el anterior
    if (titulo === "" && currentAviso) {
      titulo = currentAviso.titulo;
    }

    // Primer aviso
    if (!currentAviso) {
      currentAviso = {
        titulo: titulo || "SIN TITULO",
        categoria: parsed.categoria,
        orden: orden++,
        slides: [slide.slide],
        bloques: parsed.bloques || [],
      };

      avisos.push(currentAviso);
      continue;
    }

    // MISMO AVISO
    if (titulo === currentAviso.titulo) {
      currentAviso.slides.push(slide.slide);

      if (Array.isArray(parsed.bloques)) {
        currentAviso.bloques.push(...parsed.bloques);
      }
    }

    // NUEVO AVISO
    else {
      currentAviso = {
        titulo: titulo || "SIN TITULO",
        categoria: parsed.categoria,
        orden: orden++,
        slides: [slide.slide],
        bloques: parsed.bloques || [],
      };

      avisos.push(currentAviso);
    }
  }

  return avisos;
}

module.exports = {
  groupSlides,
};
