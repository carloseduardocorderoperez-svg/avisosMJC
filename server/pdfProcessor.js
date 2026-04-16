const fs = require("fs");
const path = require("path");
const { pdf } = require("pdf-to-img");

async function convertPdfToImages(pdfPath) {

  const imagesDir = path.join(__dirname, "../images");

  const document = await pdf(pdfPath);

  let pageNumber = 1;

  for await (const image of document) {

    const imagePath = path.join(imagesDir, `slide_${pageNumber}.png`);

    fs.writeFileSync(imagePath, image);

    console.log("Slide guardada:", imagePath);

    pageNumber++;

  }

  console.log("Conversión completa");

  return true;

}

module.exports = {
  convertPdfToImages
};