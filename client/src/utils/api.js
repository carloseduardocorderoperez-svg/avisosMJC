const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export const API = API_BASE_URL;

export default apiUrl;
