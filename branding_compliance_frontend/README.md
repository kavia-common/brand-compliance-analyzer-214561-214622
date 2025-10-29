# Brand Compliance Frontend

Elegant Royal Purple themed React UI for uploading assets, running analysis, previewing issues/fixes, and downloading outputs.

## Quick Start

- Copy `.env.example` to `.env` and adjust:
  - Local dev: `REACT_APP_API_BASE=http://localhost:3001/api/v1` (no trailing slash)
  - Cloud preview (this project): `REACT_APP_API_BASE=https://vscode-internal-37364-beta.beta01.cloud.kavia.ai:3001/api/v1` (no trailing slash)
- Start backend at port 3001.
- Run frontend:
  - `npm install`
  - `npm start`

## API Base and Paths

- REACT_APP_API_BASE MUST include `/api/v1` and MUST NOT end with a trailing slash.
  - Example: `https://domain:3001/api/v1`
  - In preview, ensure it points to the backend host on port 3001 and uses https.
- Health check is performed via `GET {REACT_APP_API_BASE}/health` on app load.
- All API calls are made relative to this base (always include `/api/v1`):
  - Create Job: `POST {REACT_APP_API_BASE}/jobs`
  - Delete Job: `DELETE {REACT_APP_API_BASE}/jobs/{job_id}`
  - Uploads: `POST {REACT_APP_API_BASE}/jobs/{job_id}/upload/assets|old-brand|new-brand`
  - Analyze: `POST {REACT_APP_API_BASE}/jobs/{job_id}/analyze`
  - Status: `GET {REACT_APP_API_BASE}/jobs/{job_id}/status`
  - Results: `GET {REACT_APP_API_BASE}/jobs/{job_id}/results`
  - Preview: `GET {REACT_APP_API_BASE}/jobs/{job_id}/assets/{asset_id}/preview?view=original|overlay|fixed`
  - Fix: `POST {REACT_APP_API_BASE}/jobs/{job_id}/assets/{asset_id}/fix`
  - Batch Fix: `POST {REACT_APP_API_BASE}/jobs/{job_id}/fix/batch`
  - Download: `GET {REACT_APP_API_BASE}/jobs/{job_id}/download?type=zip|report|both`

Compatibility:
- The backend exposes legacy aliases for non-prefixed paths (e.g., `/jobs/{job_id}/analyze`) to avoid breaking old links.
- The frontend must still use the v1-prefixed base to ensure consistency and future-proofing.

Notes:
- Avoid hardcoded absolute URLs in source; always use the configured base.
- In preview environments, HTTPS is required to avoid mixed content. Do not point to `http://` when the frontend runs on `https://`.
- If a reverse proxy maps `/api/v1` to backend, a relative `/api/v1` may work, but for this project we prefer the explicit HTTPS backend URL above.

## Usage

1. Create a job.
2. Upload:
   - Assets `.zip`
   - Old brand image
   - New brand image
3. Start Analysis and monitor Status.
4. Browse Assets, open an item to see original/overlay/fixed previews.
5. Apply fixes (optional), then download zip/report.

Accessibility: components include ARIA labels, focus rings, and keyboard access for uploads and modal controls.
