// lib/config.ts

// Read at build time. Only VITE_* are exposed to the client.
const VITE_API_URL = import.meta.env.VITE_REACT_API_URL || '';
const VITE_FILES_BASE_URL = import.meta.env.VITE_FILES_BASE_URL || '';

function resolveBaseApi(): string {
  // Explicit env takes precedence
  if (VITE_API_URL) return VITE_API_URL;

  // Client-side fallback to current origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Assuming your API is served under /api/v1 on same origin
    return `${window.location.origin}/api/v1`;
  }

  // Tooling/server fallback
  return 'http://localhost:3000/api/v1';
}

function resolveFilesBase(): string {
  if (VITE_FILES_BASE_URL) return VITE_FILES_BASE_URL;

  // Derive from baseApiUrl if not explicitly provided
  const baseApi = resolveBaseApi();
  // If baseApi ends with /api/v1, strip it to get host
  const host = baseApi.replace(/\/api\/v1\/?$/, '');
  return `${host}/api/v1/files`;
}

const config = {
  baseApiUrl: resolveBaseApi(),
  filesBaseUrl: resolveFilesBase(),
};

export default config;
