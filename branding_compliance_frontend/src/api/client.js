// PUBLIC_INTERFACE
// Brand Compliance API Client
// Provides methods to interact with the FastAPI backend v1 endpoints.
// Base URL is configurable via REACT_APP_API_BASE, defaulting to http://localhost:3001/api/v1
// In preview environments, prefers same-host port 3001 or relative /api/v1 when proxied.

/**
 * Trim trailing slashes for consistent URL building.
 */
function trimSlash(s) {
  return (s || '').replace(/\/+$/, '');
}

// Resolve API base:
// 1) REACT_APP_API_BASE if provided (no trailing slash)
// 2) If on :3000, assume backend on same host :3001
// 3) If running behind a proxy that exposes /api/v1, use relative path
// 4) Fallback to localhost:3001/api/v1
const envBase = trimSlash(process.env.REACT_APP_API_BASE);
let resolvedBase = envBase;

if (!resolvedBase) {
  try {
    const loc = window.location;
    if (loc && loc.hostname && loc.port === '3000') {
      resolvedBase = `${loc.protocol}//${loc.hostname}:3001/api/v1`;
    } else if (loc && loc.hostname) {
      // Some preview setups map /api/v1 through the same origin
      resolvedBase = '/api/v1';
    }
  } catch {
    // window not available in tests/SSR; ignore
  }
}
if (!resolvedBase) {
  resolvedBase = 'http://localhost:3001/api/v1';
}
const BASE = trimSlash(resolvedBase);

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Returns the configured API base URL */
  return BASE;
}

// Helper to handle JSON responses
async function handleJson(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Helper to handle blob downloads
async function handleBlob(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.blob();
}

// PUBLIC_INTERFACE
export async function health() {
  /**
   * Check backend health at /api/v1/health (preferred), falling back to root /
   * Returns {} or health payload.
   */
  const candidates = [`${BASE}/health`];

  // If using a relative base (/api/v1), also try root /
  if (BASE === '/api/v1') {
    candidates.push('/');
  } else {
    // Try one level up when BASE is absolute path ending with /api/v1
    candidates.push(`${BASE}/../`);
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        return handleJson(res);
      }
    } catch {
      // continue to next
    }
  }
  throw new Error('Backend not reachable');
}

// PUBLIC_INTERFACE
export async function createJob(payload = {}) {
  /** Create a new job. Returns { job_id } */
  const res = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function deleteJob(jobId) {
  /** Delete a job by id */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  return handleJson(res);
}

// Shared upload helper
async function uploadFile(jobId, path, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}${path}`, {
    method: 'POST',
    body: form,
  });
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function uploadAssetsZip(jobId, file) {
  /** Upload assets zip for job */
  return uploadFile(jobId, '/upload/assets', file);
}

// PUBLIC_INTERFACE
export async function uploadOldBrand(jobId, file) {
  /** Upload old brand image */
  return uploadFile(jobId, '/upload/old-brand', file);
}

// PUBLIC_INTERFACE
export async function uploadNewBrand(jobId, file) {
  /** Upload new brand image */
  return uploadFile(jobId, '/upload/new-brand', file);
}

// PUBLIC_INTERFACE
export async function analyze(jobId) {
  /** Trigger analysis */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/analyze`, { method: 'POST' });
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function status(jobId) {
  /** Get job status */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/status`);
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function results(jobId) {
  /** Get results list for job (assets and issues) */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/results`);
  return handleJson(res);
}

// PUBLIC_INTERFACE
export function assetPreviewUrl(jobId, assetId, view = 'original') {
  /** Build a URL for asset preview that can be used as <img src> */
  const v = encodeURIComponent(view);
  return `${BASE}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(
    assetId
  )}/preview?view=${v}`;
}

// PUBLIC_INTERFACE
export async function fixAsset(jobId, assetId, payload = {}) {
  /** Request automatic fix for a single asset */
  const res = await fetch(
    `${BASE}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(assetId)}/fix`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function batchFix(jobId, payload = {}) {
  /** Run batch fixes for all assets */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/fix/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function download(jobId, type = 'zip') {
  /** Download artifacts; type: zip|report|both. Returns Blob */
  const url = `${BASE}/jobs/${encodeURIComponent(jobId)}/download?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { method: 'GET' });
  return handleBlob(res);
}
