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