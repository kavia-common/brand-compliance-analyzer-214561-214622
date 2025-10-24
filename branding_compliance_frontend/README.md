# Brand Compliance Frontend

Elegant Royal Purple themed React UI for uploading assets, running analysis, previewing issues/fixes, and downloading outputs.

## Quick Start

- Copy `.env.example` to `.env` and adjust:
  - `REACT_APP_API_BASE=http://localhost:3001/api/v1`
- Start backend at port 3001.
- Run frontend:
  - `npm install`
  - `npm start`

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
