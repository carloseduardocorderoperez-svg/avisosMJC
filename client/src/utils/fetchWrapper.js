// Global fetch wrapper: detecta 401 y redirige a /login (guardando la ruta para volver)
export default function installFetchWrapper() {
  if (typeof window === 'undefined') return;
  const original = window.fetch && window.fetch.bind(window);
  if (!original) return;

  window.fetch = async function (...args) {
    const res = await original(...args);

    if (res && res.status === 401) {
      // Intenta leer el body para casos especiales (ej: drive_token_revoked)
      let body = null;
      try {
        const cloned = res.clone();
        body = await cloned.json().catch(() => null);
      } catch (e) {
        body = null;
      }

      // Si el backend indica que el token de Drive fue revocado, no forzar redirect
      if (body && body.error === 'drive_token_revoked') {
        return res;
      }

      try {
        const current = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterLogin', current);
      } catch (e) {}

      // redirect to login page
      window.location.href = '/login';
    }

    return res;
  };
}
