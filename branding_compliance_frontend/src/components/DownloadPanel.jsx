import React from 'react';

// PUBLIC_INTERFACE
export default function DownloadPanel({ hasJob, onDownloadZip, onDownloadReport, onDownloadBoth, downloading }) {
  /** Buttons to download artifacts */
  return (
    <div className="grid">
      <button className="btn" onClick={onDownloadZip} disabled={!hasJob || downloading}>
        {downloading ? 'Preparing…' : 'Download Fixed Zip'}
      </button>
      <button className="btn secondary" onClick={onDownloadReport} disabled={!hasJob || downloading}>
        {downloading ? 'Preparing…' : 'Download Report'}
      </button>
      <button className="btn ghost" onClick={onDownloadBoth} disabled={!hasJob || downloading}>
        {downloading ? 'Preparing…' : 'Download Both'}
      </button>
      {!hasJob && <div className="text-muted small">Create a job and run analysis to enable downloads.</div>}
    </div>
  );
}
