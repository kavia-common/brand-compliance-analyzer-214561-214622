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

Notes:
- The app performs a health check by requesting the base URL directly (GET `{REACT_APP_API_BASE}`) on load. Ensure the backend serves health at `/` relative to the API base and that CORS allows the frontend origin (http://localhost:3000 in local dev, or https://vscode-internal-37364-beta.beta01.cloud.kavia.ai:3000 in preview).
- In preview environments, HTTPS is required to avoid mixed content. Do not point to `http://` when the frontend runs on `https://`.
- If a reverse proxy maps `/api/v1` to backend, you may use a relative `/api/v1`, but in this project we prefer the explicit HTTPS backend URL above.

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
