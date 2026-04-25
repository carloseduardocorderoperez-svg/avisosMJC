const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export const API = API_BASE_URL;

// Estado de autenticación
let authStatus = null;
let authCheckPromise = null;

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
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // Importante para enviar cookies de sesión
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Si es 401, intentar refrescar el estado de auth
  if (response.status === 401) {
    authStatus = null; // Reset auth status
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

  authCheckPromise = apiRequest('/auth/status')
    .then(response => response.json())
    .then(data => {
      authStatus = data;
      if (data.authorized) {
        saveAuthToStorage(data);
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
  // Abrir ventana popup para el login
  const loginUrl = apiUrl('/auth/login');
  const popup = window.open(loginUrl, 'Google Login', 'width=500,height=600');
  
  // Detectar cuando se cierra la ventana y verificar autenticación
  const checkInterval = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkInterval);
      
      // Esperar un momento y luego verificar estado
      setTimeout(async () => {
        authStatus = null;
        authCheckPromise = null;
        const status = await checkAuthStatus();
        
        if (status.authorized) {
          // Redirigir al dashboard
          window.location.href = '/dashboard';
        }
      }, 500);
    }
  }, 500);
}

// Logout
export async function logout() {
  try {
    authStatus = null;
    authCheckPromise = null;
    localStorage.removeItem(STORAGE_KEY);
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
