const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizarBloques(bloques) {
  return (bloques || []).map(b => {
    // Ensure imagen blocks always have a url field
    if (b.tipo === "imagen") {
      return { ...b, url: b.url || "" };
    }
    // Convert qr blocks to link blocks (no renderer exists)
    if (b.tipo === "qr") {
      return { tipo: "link", texto: "VER QR", url: b.url || "" };
    }
    return b;
  });
}

function fusionarAvisos(avisos) {

  const mapa = {};

  avisos.forEach(aviso => {

    const key = `${aviso.titulo.trim().toLowerCase()}_${aviso.categoria}`;

    if (!mapa[key]) {
      mapa[key] = {
        ...aviso,
        bloques: [...(aviso.bloques || [])]
      };
    } else {
      mapa[key].bloques.push(...(aviso.bloques || []));
    }

  });

  return Object.values(mapa);
}

async function analyzeAllSlides() {

  const imagesDir = path.join(__dirname, "../images");

  const files = fs
    .readdirSync(imagesDir)
    .filter((file) => file.endsWith(".png"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  const images = files.map((file) => {

    const imagePath = path.join(imagesDir, file);

    const base64Image = fs.readFileSync(imagePath, {
      encoding: "base64",
    });

    return {
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${base64Image}`,
      },
    };

  });

  const response = await client.chat.completions.create({

    model: "gpt-4o",

    response_format: { type: "json_object" },

    messages: [
      {
        role: "system",
        content: `
Eres un analizador experto de avisos del Movimiento de Juventudes Cristianas (MJC).

Recibirás múltiples imágenes que corresponden a slides de un documento de avisos.

Las slides pertenecen al MISMO documento semanal.

Tu tarea es reconstruir los avisos completos y devolverlos en formato JSON estructurado para un sistema web de avisos zonales.

IMPORTANTE
Un aviso puede ocupar varias slides consecutivas.
Debes agruparlas correctamente.

Ignora slides que sean:
- portada
- separadores
- decorativas
- slides sin contenido de aviso


--------------------------------
FORMATO DE RESPUESTA
--------------------------------

Devuelve SIEMPRE JSON válido con esta estructura EXACTA:

{
 "avisos":[]
}

Cada aviso debe tener:

{
 "id": debe ser un número único, puedes usar el orden de aparición de los avisos para asignar el ID,
 "orden": debe ser un número que indique el orden en el que aparecen los avisos
 "titulo":"",
 "categoria":"",
 "bloques":[]
}

NO agregues otros campos.


--------------------------------
CATEGORÍAS
--------------------------------

Debes elegir SOLO UNA:

admin
eventos
pastoral
formacion
extras

Definiciones:

admin
avisos administrativos o de organización
ejemplos:
- cuotas
- censos
- listados
- pagos
- registros
- informes

eventos
actividades del movimiento
ejemplos:
- asambleas
- torneos
- encuentros
- convivencias
- actividades de zona

pastoral
vida espiritual
ejemplos:
- oración
- misas
- acompañamiento espiritual
- reflexiones
- campañas espirituales

formacion
aprendizaje o capacitación
ejemplos:
- cursos
- talleres
- escuelas
- materiales formativos

extras
avisos informativos generales
ejemplos:
- campañas de salud
- recordatorios
- avisos que no encajan claramente en otra categoría

Si hay duda usa "extras".


--------------------------------
TIPOS DE BLOQUE PERMITIDOS
--------------------------------

Los avisos deben dividirse en bloques.

Puedes usar SOLO estos tipos:

texto
tabla
link
imagen
info
chips
banco

NOTA: El tipo "lista" ya NO existe. Las listas ahora van DENTRO del bloque "texto" con formato HTML.

Si detectas un QR, usa un bloque "link" en su lugar.


--------------------------------
BLOQUE TEXTO
--------------------------------

Para párrafos normales, texto formateado y listas.

IMPORTANTE: Este bloque acepta HTML rico (formatos, colores, estilos).

El contenido debe ser HTML válido. Ejemplos:

- Párrafos: <p>Contenido del párrafo</p>
- Listas viñetas: <ul><li>item 1</li><li>item 2</li></ul>
- Listas numeradas: <ol><li>item 1</li><li>item 2</li></ol>
- Texto con formato: <p>Texto <strong>en negrita</strong> o <em>en cursiva</em></p>
- Texto con color: <p style="color: #FF0000;">Texto rojo</p>

Estructura:

{
 "tipo":"texto",
 "contenido":"<p>Contenido HTML...</p>"
}

--------------------------------
BLOQUE TABLA
--------------------------------

Cuando detectes tablas de datos.

Ejemplo: listas de precios, deudas, grupos, fases, etc.

{
 "tipo":"tabla",
 "contenido":[
   ["col1","col2"],
   ["dato1","dato2"]
 ]
}


--------------------------------
BLOQUE LINK (BOTONES)
--------------------------------

Usa este bloque para:

- formularios
- botones
- enlaces importantes

Ejemplos:
LLENAR FORMULARIO
REGISTRAR COMPROBANTE
INSCRIBIRSE
VER DOCUMENTO

Formato:

{
 "tipo":"link",
 "texto":"",
 "url":""
}


--------------------------------
BLOQUE INFO
--------------------------------

Para información estructurada de eventos.

Ejemplo:

fecha
lugar
horario

Formato:

{
 "tipo":"info",
 "fecha":"",
 "lugar":"",
 "horario":""
}


--------------------------------
BLOQUE CHIPS
--------------------------------

Para encargados o responsables.

Ejemplo en slides:

Encargados: Carlos, Sofy, Roger

Formato:

{
 "tipo":"chips",
 "items":[
  "Carlos",
  "Sofy",
  "Roger"
 ]
}


--------------------------------
BLOQUE BANCO
--------------------------------

Para datos de transferencia.

Formato:

{
 "tipo":"banco",
 "banco":"",
 "tipoCuenta":"",
 "cuenta":"",
 "titular":"",
 "referencia":""
}


--------------------------------
BLOQUE IMAGEN
--------------------------------

Si el aviso contiene un flyer, cartel o imagen importante.

{
 "tipo":"imagen",
 "url":"",
 "descripcion":""
}

Deja 'url' siempre como cadena vacía. Coloca en 'descripcion' una descripción breve de la imagen.


--------------------------------
BLOQUE QR
--------------------------------

Si detectas un QR, úsalo como un bloque link con el texto descriptivo y url vacía.

{
 "tipo":"link",
 "texto":"VER QR",
 "url":""
}


--------------------------------
REGLAS DE EXTRACCIÓN
--------------------------------

1. No inventes información.
2. Respeta el texto original.
3. Agrupa slides que pertenezcan al mismo aviso.
4. Detecta tablas correctamente.
5. Detecta botones y links.
6. Detecta encargados y conviértelos en chips.
7. Detecta datos bancarios.
8. Detecta fechas importantes.
9. Detecta listas (úsalas dentro del bloque "texto" como HTML).
10. Un aviso debe quedar listo para renderizar como una CARD en una página web.

ORDEN DE BLOQUES (IMPORTANTE):
- Los bloques de tipo "info" (con fecha/horario/lugar) SIEMPRE van al INICIO del aviso.
- Los bloques de tipo "chips" (encargados/responsables) SIEMPRE van al FINAL del aviso.
- Los demás bloques van en el medio en el orden lógico del documento.


--------------------------------
IMPORTANTE
--------------------------------

El objetivo es producir avisos que luego puedan convertirse automáticamente en un layout HTML como:

- cards
- botones
- tablas
- chips
- tarjetas bancarias

Por lo tanto debes identificar correctamente la estructura del aviso.

Devuelve SOLO JSON válido.
`,
      },

      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extrae los avisos de estas slides",
          },
          ...images,
        ],
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);

  result.avisos = fusionarAvisos(result.avisos); // en caso de que haya avisos duplicados por error de agrupación

  // Normalize block shapes to match frontend expectations
  result.avisos = result.avisos.map(aviso => ({
    ...aviso,
    bloques: normalizarBloques(aviso.bloques),
  }));

  return result;

}

async function extractFromHtml(htmlString) {

  const response = await client.chat.completions.create({

    model: "gpt-4o",

    response_format: { type: "json_object" },

    messages: [
      {
        role: "system",
        content: `
Eres un analizador experto de avisos del Movimiento de Juventudes Cristianas (MJC).

Recibirás el código HTML de una página de avisos zonales ya generada.

Tu tarea es reconstruir los avisos originales a partir del HTML y devolverlos en formato JSON estructurado.

--------------------------------
FORMATO DE RESPUESTA
--------------------------------

Devuelve SIEMPRE JSON válido con esta estructura EXACTA:

{
  "date": "fecha detectada o cadena vacía",
  "title": "título detectado o AVISOS ZONALES",
  "avisos": []
}

Cada aviso debe tener:

{
  "id": número único según orden de aparición,
  "orden": número de orden,
  "titulo": "",
  "categoria": "",
  "bloques": []
}

NO agregues otros campos.

--------------------------------
CATEGORÍAS
--------------------------------

Debes elegir SOLO UNA:

admin
eventos
pastoral
formacion
extras

--------------------------------
TIPOS DE BLOQUE PERMITIDOS
--------------------------------

texto, lista, tabla, link, imagen, info, chips, banco

--------------------------------
BLOQUE TEXTO
--------------------------------
{ "tipo":"texto", "contenido":"" }

--------------------------------
BLOQUE LISTA
--------------------------------
{ "tipo":"lista", "contenido":["item1","item2"] }

--------------------------------
BLOQUE TABLA
--------------------------------
{ "tipo":"tabla", "contenido":[["col1","col2"],["dato1","dato2"]] }

--------------------------------
BLOQUE LINK
--------------------------------
{ "tipo":"link", "texto":"", "url":"" }

--------------------------------
BLOQUE INFO
--------------------------------
{ "tipo":"info", "fecha":"", "lugar":"", "horario":"" }

--------------------------------
BLOQUE CHIPS
--------------------------------
{ "tipo":"chips", "items":["persona1","persona2"] }

--------------------------------
BLOQUE BANCO
--------------------------------
{ "tipo":"banco", "banco":"", "tipoCuenta":"", "cuenta":"", "titular":"", "referencia":"" }

--------------------------------
BLOQUE IMAGEN
--------------------------------
{ "tipo":"imagen", "url":"", "descripcion":"" }

--------------------------------
REGLAS
--------------------------------

1. No inventes información. Extrae solo lo que está en el HTML.
2. Ignora elementos de navegación, encabezados de la página y estilos CSS.
3. Cada aviso/card del HTML debe producir un aviso.
4. Detecta tablas, listas, chips de encargados, datos bancarios y botones.
5. Devuelve SOLO JSON válido.
`,
      },
      {
        role: "user",
        content: `Extrae los avisos de este HTML:\n\n${htmlString}`,
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);

  result.avisos = fusionarAvisos(result.avisos || []);

  result.avisos = result.avisos.map(aviso => ({
    ...aviso,
    bloques: normalizarBloques(aviso.bloques),
  }));

  return result;

}

module.exports = {
  analyzeAllSlides,
  extractFromHtml,
};