import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const GIS_BASE =
  import.meta.env.VITE_GIS_BASE_URL || "http://localhost:5001/api";

export const AGENTIC_BASE =
  import.meta.env.VITE_AGENTIC_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const gisApi = axios.create({
  baseURL: GIS_BASE,
  timeout: 30000,
});

export const agenticApi = axios.create({
  baseURL: AGENTIC_BASE,
  timeout: 60000,
});

// ------------------------------------------------------------------
// Thin GET/PATCH helpers around the main `api` instance.
// These return the raw response body (e.g. `{ success, data }`) so
// callers can read `.data` themselves, matching the backend's
// `{ success, data }` envelope shape.
// ------------------------------------------------------------------

export async function apiGet(path, config) {
  const response = await api.get(path, config);
  return response.data;
}

export async function apiPost(path, body, config) {
  const response = await api.post(path, body, config);
  return response.data;
}

export async function apiPatch(path, body, config) {
  const response = await api.patch(path, body, config);
  return response.data;
}

export async function apiDelete(path, config) {
  const response = await api.delete(path, config);
  return response.data;
}