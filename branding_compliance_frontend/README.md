# Brand Compliance Frontend

Elegant Royal Purple themed React UI for uploading assets, running analysis, previewing issues/fixes, and downloading outputs.

## Quick Start

- Copy `.env.example` to `.env` and adjust:
  - `REACT_APP_API_BASE=http://localhost:3001/api/v1` (no trailing slash)
- Start backend at port 3001.
- Run frontend:
  - `npm install`
  - `npm start`

Notes:
- The app performs an optional readiness check at `/api/v1/health`. Ensure the backend exposes it and that CORS allows the frontend origin (http://localhost:3000 by default).
- In preview environments without a proxy, set `REACT_APP_API_BASE` to the backend preview URL (e.g., `https://<backend-host>/api/v1`). If a reverse proxy maps `/api/v1` to backend, the client will use a relative `/api/v1` automatically.

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
