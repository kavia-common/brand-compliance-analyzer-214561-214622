/* Panel for confirming and downloading the corrected PDF */
import React, { useState } from 'react';
import { confirmJob, downloadPdf } from '../api/pdfApi';
import './theme.css';

// PUBLIC_INTERFACE
export default function DownloadPanel({ jobId, jobStatus }) {
  /** Shows actions to confirm and download the final PDF once available.
   * @param {string} jobId
   * @param {Object} jobStatus - StatusResponse to determine readiness.
   */
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canDownload = jobStatus?.status === 'completed';

  const onConfirm = async () => {
    setError('');
    try {
      await confirmJob(jobId);
      setMessage('Results confirmed.');
    } catch (e) {
      setError(e?.message || 'Failed to confirm job');
    }
  };

  const onDownload = async () => {
    setError('');
    setMessage('');
    setDownloading(true);
    try {
      const blob = await downloadPdf(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `replaced_${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Download started.');
    } catch (e) {
      setError(e?.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (!jobId) return null;

  return (
    <div className="card surface">
      <h3 className="title-small">Finalize</h3>
      <p className="muted">Confirm results and download the corrected PDF.</p>

      <div className="row">
        <button className="btn outline" onClick={onConfirm} disabled={!canDownload}>
          Confirm
        </button>
        <button className="btn success" onClick={onDownload} disabled={!canDownload || downloading}>
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      {!canDownload && (
        <p className="muted" style={{ marginTop: 8 }}>
          The file will be available once processing completes.
        </p>
      )}
    </div>
  );
}
