//
// Simple API client for PDF logo replacement workflow
//

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'https://vscode-internal-27372-beta.beta01.cloud.kavia.ai:3001';

// PUBLIC_INTERFACE
export async function startLogoReplaceJob({ pdfFile, oldLogoFiles, newLogoFile, dpi = 250, maxPages = null, matchThreshold = 0.8 }) {
  /** Start a PDF logo replacement job by uploading files and parameters.
   * @param {Object} params
   * @param {File} params.pdfFile - The input PDF File.
   * @param {File[]} params.oldLogoFiles - One or more old logo images.
   * @param {File} params.newLogoFile - The new logo image.
   * @param {number} [params.dpi=250] - Rasterization DPI.
   * @param {number|null} [params.maxPages=null] - Optional page cap.
   * @param {number} [params.matchThreshold=0.8] - Template match threshold (0-1).
   * @returns {Promise<{job_id:string}>} - Returns backend response with job_id.
   */
  const form = new FormData();
  form.append('pdf', pdfFile);
  oldLogoFiles.forEach((f) => form.append('old_logos', f));
  form.append('new_logo', newLogoFile);
  form.append('dpi', String(dpi));
  if (maxPages !== null && maxPages !== undefined && maxPages !== '') {
    form.append('max_pages', String(maxPages));
  }
  form.append('match_threshold', String(matchThreshold));

  const res = await fetch(`${API_BASE}/pdf/logo-replace/start`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to start job: ${res.status} ${txt}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function getJobStatus(jobId) {
  /** Get job status, progress, and findings summary.
   * @param {string} jobId - Job ID returned from start.
   * @returns {Promise<Object>} - StatusResponse per OpenAPI.
   */
  const res = await fetch(`${API_BASE}/pdf/logo-replace/status/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to get status: ${res.status} ${txt}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export function getPreviewUrl(jobId, pageIndex, type = 'detected') {
  /** Get a URL for a page preview (detected or replaced).
   * @param {string} jobId
   * @param {number} pageIndex
   * @param {'detected'|'replaced'} [type='detected']
   * @returns {string} - Direct image URL suitable for <img src>.
   */
  const url = `${API_BASE}/pdf/logo-replace/preview/${encodeURIComponent(jobId)}/${pageIndex}?type=${encodeURIComponent(type)}`;
  return url;
}

// PUBLIC_INTERFACE
export async function confirmJob(jobId) {
  /** Confirm the results (optional stub in backend).
   * @param {string} jobId
   * @returns {Promise<Object>} - backend response
   */
  const res = await fetch(`${API_BASE}/pdf/logo-replace/confirm/${encodeURIComponent(jobId)}`, { method: 'POST' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to confirm job: ${res.status} ${txt}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function downloadPdf(jobId) {
  /** Download the corrected PDF as a Blob.
   * @param {string} jobId
   * @returns {Promise<Blob>} - PDF blob
   */
  const res = await fetch(`${API_BASE}/pdf/logo-replace/download/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to download PDF: ${res.status} ${txt}`);
  }
  return res.blob();
}
