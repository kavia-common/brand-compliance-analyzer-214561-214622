/* Page previews of detected vs replaced images */
import React, { useState } from 'react';
import { getPreviewUrl } from '../api/pdfApi';
import './theme.css';

// PUBLIC_INTERFACE
export default function PagePreview({ jobId, totalPages = 0 }) {
  /** Shows previews per page with toggle between "detected" and "replaced".
   * @param {string} jobId
   * @param {number} totalPages - Number of pages to preview.
   */
  const [viewType, setViewType] = useState('detected'); // 'detected' | 'replaced'
  const [current, setCurrent] = useState(0);

  if (!jobId || totalPages === 0) return null;

  const imgUrl = getPreviewUrl(jobId, current, viewType);

  const prevDisabled = current <= 0;
  const nextDisabled = current >= totalPages - 1;

  return (
    <div className="card surface">
      <div className="row space-between">
        <h3 className="title-small">Page Preview</h3>
        <div className="segmented">
          <button
            className={`segmented-item ${viewType === 'detected' ? 'active' : ''}`}
            onClick={() => setViewType('detected')}
          >
            Detected
          </button>
          <button
            className={`segmented-item ${viewType === 'replaced' ? 'active' : ''}`}
            onClick={() => setViewType('replaced')}
          >
            Replaced
          </button>
        </div>
      </div>

      <div className="preview-container">
        <img src={imgUrl} alt={`Page ${current + 1} - ${viewType}`} className="preview-image" />
      </div>

      <div className="row center">
        <button className="btn secondary" onClick={() => setCurrent((i) => Math.max(0, i - 1))} disabled={prevDisabled}>
          ◀ Prev
        </button>
        <span className="muted" style={{ margin: '0 12px' }}>
          Page {current + 1} / {totalPages}
        </span>
        <button
          className="btn secondary"
          onClick={() => setCurrent((i) => Math.min(totalPages - 1, i + 1))}
          disabled={nextDisabled}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}
