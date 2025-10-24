 // PUBLIC_INTERFACE
 // Brand Compliance API Client
 // Provides methods to interact with the FastAPI backend v1 endpoints.
 // Base URL is configurable via REACT_APP_API_BASE. In cloud preview, must be HTTPS to avoid mixed content.
 // Health endpoint is served at the API base root (GET {REACT_APP_API_BASE}).
 // Other endpoints continue under the /api/v1 path which should be included in REACT_APP_API_BASE.
 // Example for this environment (no trailing slash):
 //   REACT_APP_API_BASE=https://vscode-internal-37364-beta.beta01.cloud.kavia.ai:3001/api/v1
 
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

// Resolve API base with HTTPS preference to avoid mixed content in preview domains.
// Priority:
// 1) REACT_APP_API_BASE if provided (used as-is but upgraded to https if same host and http)
// 2) If running on :3000, use same host with https:// and port 3001
// 3) Otherwise, use the known backend preview base
// 4) Final fallback: relative /api/v1 (works only if proxy is configured)
const envBaseRaw = trimSlash(process.env.REACT_APP_API_BASE);
let resolvedBase = envBaseRaw;

let FRONTEND_ORIGIN = '';
try {
  const loc = typeof window !== 'undefined' ? window.location : null;
  FRONTEND_ORIGIN = loc ? `${loc.protocol}//${loc.host}` : '';

  if (!resolvedBase || resolvedBase === '/api/v1') {
    if (loc && loc.hostname) {
      if (loc.port === '3000') {
        // Force https against backend port 3001 on same hostname
        resolvedBase = `https://${loc.hostname}:3001/api/v1`;
      } else {
        // Known preview environment backend
        resolvedBase =
          'https://vscode-internal-37364-beta.beta01.cloud.kavia.ai:3001/api/v1';
      }
    }
  }

  // If env provided an http:// URL on preview host, upgrade to https to prevent mixed content.
  if (resolvedBase?.startsWith('http://')) {
    try {
      const u = new URL(resolvedBase);
      if (u.hostname === loc?.hostname || (u.hostname || '').endsWith('.kavia.ai')) {
        u.protocol = 'https:';
        resolvedBase = trimSlash(u.toString());
      }
    } catch {
      // leave as-is if not parseable
    }
  }
} catch {
  // window not available in tests; will use fallback below
}

if (!resolvedBase) {
  // Absolute safe default for this environment
  resolvedBase = 'https://vscode-internal-37364-beta.beta01.cloud.kavia.ai:3001/api/v1';
}
const BASE = trimSlash(resolvedBase);

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
   * Perform health check against the API base URL directly (GET {REACT_APP_API_BASE}).
   * Returns health payload or throws a rich error when unreachable.
   */
  const url = `${BASE}`;
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
