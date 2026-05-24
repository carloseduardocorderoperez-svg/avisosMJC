// Global fetch wrapper: detecta 401 y redirige a /login (guardando la ruta para volver)
export default function installFetchWrapper() {
  if (typeof window === 'undefined') return;
  const original = window.fetch && window.fetch.bind(window);
  if (!original) return;

  window.fetch = async function (...args) {
    const res = await original(...args);
    if (res && res.status === 401) {
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
