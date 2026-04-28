const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const IMAGE_MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".bmp": "image/bmp",
};

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const baseUrl = process.env.SERVER_URL || (process.env.NODE_ENV === 'production'
  ? (process.env.RENDER_EXTERNAL_URL || process.env.ONRENDER_URL || `https://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`)
  : 'http://localhost:3000');
const REDIRECT_URI = `${baseUrl}/auth/callback`;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar en .env");
  }
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "GOOGLE_REFRESH_TOKEN no está configurado. Visita http://localhost:3000/auth/start para autorizar.",
    );
  }
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

/** Genera la URL de autorización para el flujo OAuth */
function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

/** Intercambia el código de autorización por tokens y guarda el refresh_token en .env */
async function exchangeCodeForTokens(code, envPath) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No se recibió refresh_token. Intenta revocar el acceso en myaccount.google.com/permissions y vuelve a autorizar.",
    );
  }
  // Guardar en .env
  let envContent = fs.readFileSync(envPath, "utf8");
  if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
    envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/,`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } else {
    envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
  }
  fs.writeFileSync(envPath, envContent, "utf8");
  // Activar en memoria sin reiniciar
  process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  return tokens;
}

/**
 * Sube una imagen a Google Drive, la hace pública y devuelve URLs.
 * @param {string} filePath - Ruta local del archivo a subir
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folderId - ID de la carpeta de Drive destino
 */
async function uploadImageToDrive(filePath, originalName, folderId) {
  const drive = getDriveClient();

  const ext = path.extname(originalName).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[ext] || "image/jpeg";

  const createRes = await drive.files.create({
    requestBody: {
      name: originalName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: "id,name",
  });

  const fileId = createRes.data.id;

  // Hacer el archivo públicamente legible
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    id: fileId,
    name: originalName,
    thumbnailUrl: `http://localhost:3000/images/thumb/${fileId}`,
    url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
  };
}

/**
 * Lista todas las imágenes en una carpeta de Drive.
 * @param {string} folderId
 */
async function listImagesFromDrive(folderId) {
  const drive = getDriveClient();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id,name,createdTime)",
    orderBy: "createdTime desc",
    pageSize: 200,
  });

  return (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    thumbnailUrl: `http://localhost:3000/images/thumb/${f.id}`,
    url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
    createdAt: f.createdTime,
  }));
}

/**
 * Elimina una imagen de Drive por su file ID.
 * @param {string} fileId
 */
async function deleteImageFromDrive(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Devuelve un stream del contenido de un archivo de Drive (para proxy de thumbnails).
 * @param {string} fileId
 */
async function getImageStream(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );
  return { stream: res.data, mimeType: res.headers["content-type"] || "image/jpeg" };
}

module.exports = {
  uploadImageToDrive,
  listImagesFromDrive,
  deleteImageFromDrive,
  getImageStream,
  getAuthUrl,
  exchangeCodeForTokens,
};
