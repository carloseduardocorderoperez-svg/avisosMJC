const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const JWT_SECRET = process.env.JWT_SECRET || 'mjc-avisos-secret-key';
const ALLOWED_EMAIL = process.env.ALLOWED_GOOGLE_EMAIL;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Usar la URL del servidor dinámicamente para desarrollo y producción
  const rawBaseUrl = process.env.SERVER_URL || (process.env.NODE_ENV === 'production'
    ? (process.env.RENDER_EXTERNAL_URL || process.env.ONRENDER_URL || `https://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`)
    : 'http://localhost:3000');
  let baseUrl = rawBaseUrl || '';
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');
  const redirectUri = `${baseUrl}/auth/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function generateToken(user) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  // En desarrollo: bypass de autenticación
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado - token requerido' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
    return res.status(403).json({ error: 'Acceso denegado - email no autorizado' });
  }

  req.user = user;
  next();
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
}

async function getUserInfo(accessToken) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

module.exports = {
  getOAuthClient,
  generateToken,
  verifyToken,
  requireAuth,
  getAuthUrl,
  getUserInfo,
};