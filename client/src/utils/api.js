const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export const API = API_BASE_URL;

// Estado de autenticación
let authStatus = null;
let authCheckPromise = null;
// In-memory token (mutable) used as a fallback when cookies are blocked
let existingToken = null;

// Token storage key for JWT fallback (used when cookies are blocked)
const AUTH_TOKEN_KEY = 'mjc_auth_token';

// Extract token from URL fragment if present (e.g. #auth_token=... or #/dashboard?auth_token=...)
function extractTokenFromHash() {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash || '';
    if (!hash) return null;

    // Remove leading '#'
    const hashStr = hash.replace(/^#/, '');

    // If using hash routing like '/#/dashboard?auth_token=..', find the '?' part
    const qIndex = hashStr.indexOf('?');
    const queryStr = qIndex >= 0 ? hashStr.slice(qIndex + 1) : hashStr;

    const params = new URLSearchParams(queryStr);
    const token = params.get('auth_token') || params.get('token');
    if (!token) return null;

    // Save token to localStorage for Authorization header fallback
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log('[auth] token extraído del fragmento de URL y guardado en localStorage');
    } catch (e) {}

    // Clean URL (remove token from fragment)
    try {
      const base = window.location.href.split('#')[0];
      let newHash = '';
      if (qIndex >= 0) {
        const pathPart = hashStr.slice(0, qIndex);
        params.delete('auth_token');
        params.delete('token');
        const rest = params.toString();
        newHash = pathPart + (rest ? ('?' + rest) : '');
      }
      const newUrl = base + (newHash ? ('#' + newHash) : '');
      window.history.replaceState(null, '', newUrl);
      try { console.log('[auth] limpiado fragmento de URL que contenía token'); } catch(e){}
    } catch (e) {
      // ignore
    }

    return token;
  } catch (e) {
    return null;
  }
}

// Initialize token from storage or URL hash
try {
  existingToken = (typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) || extractTokenFromHash();
} catch (e) {
  existingToken = extractTokenFromHash();
}

const STORAGE_KEY = 'mjc_auth_status';

// Guardar estado en localStorage
function saveAuthToStorage(status) {
  if (status.authorized) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Leer estado de localStorage
function getAuthFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

// Función para hacer requests con autenticación
export async function apiRequest(url, options = {}) {
  const fullUrl = apiUrl(url);

  // Asegurar que tenemos credenciales
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If we have a stored JWT (fallback), send it in Authorization header
  try {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) || existingToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    // ignore
  }

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // still send cookies when available
    headers,
  });

  // Si es 401, intentar refrescar el estado de auth
  if (response.status === 401) {
    authStatus = null; // Reset auth status
    try { console.warn('[auth] 401 recibido desde', fullUrl); } catch(e){}
    throw new Error('No autorizado');
  }

  return response;
}

// Verificar estado de autenticación
export async function checkAuthStatus() {
  if (authStatus !== null) {
    return authStatus;
  }

  if (authCheckPromise) {
    return authCheckPromise;
  }

  // Ensure we extract token from URL fragment if present (extra guard)
  try {
    const found = extractTokenFromHash();
    if (found) {
      existingToken = found;
      try { console.log('[auth] token encontrado al inicio de checkAuthStatus'); } catch(e){}
    } else {
      try { console.log('[auth] no se encontró token en fragmento al iniciar checkAuthStatus; localStorage token present=', !!localStorage.getItem(AUTH_TOKEN_KEY)); } catch(e){}
    }
  } catch (e) {}

  authCheckPromise = apiRequest('/auth/status')
    .then(response => response.json())
    .then(data => {
      authStatus = data;
      try { console.log('[auth] checkAuthStatus:', data && data.authorized ? 'authorized' : 'not authorized', data && data.user ? data.user.email : ''); } catch(e) {}
      if (data.authorized) {
        saveAuthToStorage(data);

        // Si acabamos de iniciar sesión, redirigir automáticamente
        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          try { console.log('[auth] redirectAfterLogin encontrado:', redirectPath, 'currentPath=', window.location.pathname); } catch(e){}
          if (window.location.pathname === '/login') {
            sessionStorage.removeItem('redirectAfterLogin');
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 100);
          }
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return data;
    })
    .catch(() => {
      authStatus = { authorized: false };
      localStorage.removeItem(STORAGE_KEY);
      return authStatus;
    })
    .finally(() => {
      authCheckPromise = null;
    });

  return authCheckPromise;
}

// Login con Google OAuth
export function loginWithGoogle() {
  // Guardar la URL actual para redirigir después del login.
  // Si estamos en la página de login (o en rutas de auth), usar el dashboard
  // como destino para evitar bucles de redirección que vuelven a /login.
  const currentPath = window.location.pathname || '/';
  let target = currentPath;
  if (
    currentPath === '/login' ||
    currentPath === '/' ||
    currentPath.startsWith('/auth')
  ) {
    target = '/dashboard';
  }
  sessionStorage.setItem('redirectAfterLogin', target);
  try {
    console.log('[auth] iniciando login con Google; volveré a:', target);
  } catch (e) {}

  // Redirigir a Google OAuth
  window.location.href = apiUrl('/auth/login');
}

// Logout
export async function logout() {
  try {
    authStatus = null;
    authCheckPromise = null;
    localStorage.removeItem(STORAGE_KEY);
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch (e) {}
    try { existingToken = null; } catch (e) {}
    await apiRequest('/auth/logout', { method: 'POST' });
    return true;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return false;
  }
}

// Wrapper para requests que requieren autenticación
export async function authenticatedRequest(url, options = {}) {
  const auth = await checkAuthStatus();
  if (!auth.authorized) {
    throw new Error('Usuario no autenticado');
  }

  return apiRequest(url, options);
}

export default apiUrl;
