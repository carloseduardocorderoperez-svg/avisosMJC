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
// Normalize base URL for redirect URIs (ensure scheme and no trailing slash)
const rawBaseUrl = process.env.SERVER_URL || (process.env.NODE_ENV === 'production'
  ? (process.env.RENDER_EXTERNAL_URL || process.env.ONRENDER_URL || `https://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`)
  : 'http://localhost:3000');
let baseUrl = rawBaseUrl || '';
if (baseUrl && !baseUrl.startsWith('http')) {
  baseUrl = `https://${baseUrl}`;
}
baseUrl = baseUrl.replace(/\/$/, '');
const REDIRECT_URI = `${baseUrl}/auth/drive/callback`;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar en .env");
  }
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

// Error type used to signal the app needs re-authorization for Drive
class DriveAuthError extends Error {
  constructor(message, reauthUrl) {
    super(message);
    this.name = 'DriveAuthError';
    this.reauthUrl = reauthUrl;
  }
}

function isDriveAuthError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const resp = err.response && err.response.data;
  if (msg.includes('invalid_grant') || msg.includes('invalid credentials')) return true;
  if (resp && (resp.error === 'invalid_grant' || resp.error === 'invalid_credentials')) return true;
  if (Array.isArray(err.errors) && err.errors.some(e => e.reason === 'authError' || (e.message || '').toLowerCase().includes('invalid'))) return true;
  return false;
}

function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new DriveAuthError(
      `GOOGLE_REFRESH_TOKEN no está configurado. Visita ${baseUrl}/auth/start para autorizar.`,
      `${baseUrl}/auth/start`,
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
  // Refresh token saved to environment; do not print secrets to logs.
  try {
    console.log('Google Drive refresh token stored to environment (secret not printed)');
  } catch (e) {}
  return tokens;
}

/**
 * Sube una imagen a Google Drive, la hace pública y devuelve URLs.
 * @param {string} filePath - Ruta local del archivo a subir
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folderId - ID de la carpeta de Drive destino
 */
async function uploadImageToDrive(filePath, originalName, folderId) {
  let drive;
  try {
    drive = getDriveClient();
  } catch (err) {
    if (err && err.name === 'DriveAuthError') throw err;
    throw err;
  }

  const ext = path.extname(originalName).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[ext] || "image/jpeg";

  try {
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

    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      if (isDriveAuthError(permErr)) throw new DriveAuthError('Drive auth error', `${baseUrl}/auth/start`);
      throw permErr;
    }

    return {
      id: fileId,
      name: originalName,
      thumbnailUrl: `${baseUrl}/images/thumb/${fileId}`,
      url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
    };
  } catch (err) {
    if (isDriveAuthError(err)) throw new DriveAuthError('Drive auth error', `${baseUrl}/auth/start`);
    throw err;
  }
}

/**
 * Lista todas las imágenes en una carpeta de Drive.
 * @param {string} folderId
 */
async function listImagesFromDrive(folderId) {
  let drive;
  try {
    drive = getDriveClient();
  } catch (err) {
    if (err && err.name === 'DriveAuthError') throw err;
    throw err;
  }

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id,name,createdTime)",
      orderBy: "createdTime desc",
      pageSize: 200,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      thumbnailUrl: `${baseUrl}/images/thumb/${f.id}`,
      url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
      createdAt: f.createdTime,
    }));
  } catch (err) {
    if (isDriveAuthError(err)) throw new DriveAuthError('Drive auth error', `${baseUrl}/auth/start`);
    throw err;
  }
}

/**
 * Elimina una imagen de Drive por su file ID.
 * @param {string} fileId
 */
async function deleteImageFromDrive(fileId) {
  let drive;
  try {
    drive = getDriveClient();
  } catch (err) {
    if (err && err.name === 'DriveAuthError') throw err;
    throw err;
  }

  try {
    await drive.files.delete({ fileId });
  } catch (err) {
    if (isDriveAuthError(err)) throw new DriveAuthError('Drive auth error', `${baseUrl}/auth/start`);
    throw err;
  }
}

/**
 * Devuelve un stream del contenido de un archivo de Drive (para proxy de thumbnails).
 * @param {string} fileId
 */
async function getImageStream(fileId) {
  let drive;
  try {
    drive = getDriveClient();
  } catch (err) {
    if (err && err.name === 'DriveAuthError') throw err;
    throw err;
  }

  try {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );
    return { stream: res.data, mimeType: res.headers["content-type"] || "image/jpeg" };
  } catch (err) {
    if (isDriveAuthError(err)) throw new DriveAuthError('Drive auth error', `${baseUrl}/auth/start`);
    throw err;
  }
}

module.exports = {
  uploadImageToDrive,
  listImagesFromDrive,
  deleteImageFromDrive,
  getImageStream,
  getAuthUrl,
  exchangeCodeForTokens,
};
