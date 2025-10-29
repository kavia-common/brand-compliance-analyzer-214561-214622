 // PUBLIC_INTERFACE
 // Brand Compliance API Client
 // Provides methods to interact with the FastAPI backend v1 endpoints.
 // Base URL is configurable via REACT_APP_API_BASE (no trailing slash) and MUST include '/api/v1'.
 // Health endpoint is served at the API base root (GET {REACT_APP_API_BASE}) and is expected to respond.
 // All other endpoints are appended to this base, e.g. POST {REACT_APP_API_BASE}/jobs.
 // Example (no trailing slash):
 //   REACT_APP_API_BASE=https://vscode-internal-24190-beta.beta01.cloud.kavia.ai:3001/api/v1
 //
 // Do not hardcode absolute URLs; always use the configured base.
 // Note: Legacy paths without /api/v1 (e.g., /jobs/{id}/analyze) are handled by backend compat routes,
 // but the frontend should always call the v1-prefixed endpoints via the configured base to avoid mismatches.
 
 /* eslint-disable no-console */
 /**
  * Trim trailing slashes for consistent URL building.
  */
 function trimSlash(s) {
   return (s || '').replace(/\/*$/, '');
 }

/**
 * Attempt to parse a JSON string safely.
 */
function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Resolve API base with HTTPS preference to avoid mixed content in preview domains.
 * Resolution order:
 * 1) REACT_APP_API_BASE if provided (must include /api/v1, no trailing slash).
 * 2) If running on :3000 (preview), use same hostname with https:// and port 3001.
 * 3) Fallback to relative /api/v1 (only works if a dev proxy is configured).
 */
const envBaseRaw = trimSlash(process.env.REACT_APP_API_BASE);
let resolvedBase = envBaseRaw || '';

let FRONTEND_ORIGIN = '';
try {
  const loc = typeof window !== 'undefined' ? window.location : null;
  FRONTEND_ORIGIN = loc ? `${loc.protocol}//${loc.host}` : '';

  if (!resolvedBase && loc && loc.hostname) {
    const host = loc.hostname;
    // Always target backend on port 3001 with https on the same hostname
    resolvedBase = `https://${host}:3001/api/v1`;
  }

  // Normalize protocol for preview; prefer https if host is *.kavia.ai
  if (resolvedBase?.startsWith('http://')) {
    try {
      const u = new URL(resolvedBase);
      if ((u.hostname || '').endsWith('.kavia.ai')) {
        u.protocol = 'https:';
        resolvedBase = trimSlash(u.toString());
      }
    } catch {
      // ignore if cannot parse
    }
  }
} catch {
  // window not available (tests/SSR)
}

if (!resolvedBase) {
  // Final conservative fallback
  resolvedBase = '/api/v1';
}
const BASE = resolvedBase;

// Startup diagnostics to help debug Failed to fetch (network/CORS) at runtime
// Only log once on module load to avoid noisy console.
try {
  // eslint-disable-next-line no-console
  console.info(
    "[API] Configured API base:", BASE,
    "| Frontend origin:", FRONTEND_ORIGIN || "(unknown)"
  );
} catch {
  // ignore
}

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Returns the configured API base URL */
  return BASE;
}

// PUBLIC_INTERFACE
export function getFrontendOrigin() {
  /** Returns the detected frontend origin for CORS diagnostics */
  return FRONTEND_ORIGIN;
}

/**
 * Build standard fetch options ensuring CORS mode and credentials as needed.
 * Backend currently does not require credentials; include mode:'cors' explicitly.
 */
function buildOpts(extra = {}) {
  return {
    mode: 'cors',
    // change to 'include' if backend sets cookies and requires them
    credentials: 'omit',
    ...extra,
  };
}

/**
 * Extract a richer error from a failed fetch response.
 */
async function buildHttpError(res) {
  const ct = res.headers.get('content-type') || '';
  let detail = '';
  if (ct.includes('application/json')) {
    const data = await res.json().catch(async () => {
      const t = await res.text().catch(() => '');
      return safeParseJSON(t) || t || null;
    });
    if (data && typeof data === 'object') {
      detail = data.detail || data.message || JSON.stringify(data);
    } else if (typeof data === 'string') {
      detail = data;
    }
  } else {
    detail = await res.text().catch(() => '');
  }
  const msg = detail ? `HTTP ${res.status} ${res.statusText} - ${detail}` : `HTTP ${res.status} ${res.statusText}`;
  const err = new Error(msg);
  err.status = res.status;
  err.statusText = res.statusText;
  return err;
}

// Helper to handle JSON responses with rich error details
async function handleJson(res) {
  if (!res.ok) {
    throw await buildHttpError(res);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  // If non-json but ok, try text
  const txt = await res.text().catch(() => '');
  return safeParseJSON(txt) || {};
}

// Helper to handle blob downloads
async function handleBlob(res) {
  if (!res.ok) {
    throw await buildHttpError(res);
  }
  return res.blob();
}

// PUBLIC_INTERFACE
export async function health() {
  /**
   * Perform health check against the API v1 health endpoint (GET {REACT_APP_API_BASE}/health).
   * Returns health payload or throws a rich error when unreachable.
   */
  const url = `${BASE}/health`;
  try {
    const res = await fetch(url, buildOpts({ method: 'GET', headers: { Accept: 'application/json' } }));
    return await handleJson(res);
  } catch (e) {
    console.error('Health check failed:', e);
    throw e;
  }
}

// PUBLIC_INTERFACE
export async function createJob(payload = {}) {
  /** Create a new job. Returns { job_id } */
  const res = await fetch(`${BASE}/jobs`, buildOpts({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  }));
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function deleteJob(jobId) {
  /** Delete a job by id */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}`, buildOpts({
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  }));
  return handleJson(res);
}

// Shared upload helper
async function uploadFile(jobId, path, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}${path}`, buildOpts({
    method: 'POST',
    body: form,
  }));
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
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/analyze`, buildOpts({
    method: 'POST',
    headers: { Accept: 'application/json' },
  }));
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function status(jobId) {
  /** Get job status */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/status`, buildOpts({
    headers: { Accept: 'application/json' },
  }));
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function results(jobId) {
  /** Get results list for job (assets and issues) */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/results`, buildOpts({
    headers: { Accept: 'application/json' },
  }));
  return handleJson(res);
}

/** Detect whether an asset or filename is a PDF (helper for UI logic) */
// PUBLIC_INTERFACE
export function isPdfAsset(asset) {
  /** Returns true if asset indicates a PDF (by type or filename) */
  const name = (asset?.name || asset?.filename || '').toLowerCase();
  const type = (asset?.type || asset?.mime || '').toLowerCase();
  return name.endsWith('.pdf') || type === 'application/pdf';
}

// PUBLIC_INTERFACE
export function assetPreviewUrl(jobId, assetId, view = 'original', page = null) {
  /** Build a URL for asset preview that can be used as <img src>, supports optional page for PDFs */
  const v = encodeURIComponent(view);
  const base = `${BASE}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(assetId)}/preview?view=${v}`;
  const p = page != null ? `&page=${encodeURIComponent(page)}` : '';
  return `${base}${p}`;
}

// PUBLIC_INTERFACE
export async function downloadFixedPdf(jobId, assetId) {
  /** Download the rebuilt fixed PDF for a single PDF asset; falls back to general zip if not supported */
  // Try the preview endpoint with view=fixed and no page, expecting a PDF blob
  const url = `${BASE}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(assetId)}/preview?view=fixed`;
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    // if backend does not support single fixed PDF, surface error to caller
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

// PUBLIC_INTERFACE
export async function fixAsset(jobId, assetId, payload = {}) {
  /** Request automatic fix for a single asset */
  const res = await fetch(
    `${BASE}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(assetId)}/fix`,
    buildOpts({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
  );
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function batchFix(jobId, payload = {}) {
  /** Run batch fixes for all assets */
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}/fix/batch`, buildOpts({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  }));
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function download(jobId, type = 'zip') {
  /** Download artifacts; type: zip|report|both. Returns Blob */
  const url = `${BASE}/jobs/${encodeURIComponent(jobId)}/download?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, buildOpts({ method: 'GET' }));
  return handleBlob(res);
}
