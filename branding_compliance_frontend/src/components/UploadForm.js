/* Upload form component for starting a PDF logo replacement job */
import React, { useState } from 'react';
import './theme.css';

// PUBLIC_INTERFACE
export default function UploadForm({ onStart }) {
  /** This component lets users choose:
   *  - PDF file
   *  - Multiple old logo images
   *  - New logo image
   *  - Optional DPI, Max Pages, Match Threshold
   * Calls onStart with selected files and options.
   */
  const [pdfFile, setPdfFile] = useState(null);
  const [oldLogoFiles, setOldLogoFiles] = useState([]);
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [dpi, setDpi] = useState(250);
  const [maxPages, setMaxPages] = useState('');
  const [threshold, setThreshold] = useState(0.8);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pdfFile) return setError('Please select a PDF.');
    if (!newLogoFile) return setError('Please select the new logo image.');
    if (!oldLogoFiles || oldLogoFiles.length === 0) return setError('Please add at least one old logo image.');

    setSubmitting(true);
    try {
      await onStart({
        pdfFile,
        oldLogoFiles: Array.from(oldLogoFiles),
        newLogoFile,
        dpi: Number(dpi),
        maxPages: maxPages === '' ? null : Number(maxPages),
        matchThreshold: Number(threshold),
      });
    } catch (err) {
      setError(err?.message || 'Failed to start the job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card surface">
      <h2 className="title">Upload PDF & Logos</h2>
      <p className="subtitle">Provide your document and logo assets to begin automated replacement.</p>

      <form onSubmit={handleSubmit} className="form">
        <label className="label">PDF Document</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="input"
        />

        <label className="label">Old Logo Images (one or more)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setOldLogoFiles(e.target.files || [])}
          className="input"
        />

        <label className="label">New Logo Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)}
          className="input"
        />

        <div className="grid grid-3">
          <div>
            <label className="label">DPI</label>
            <input
              type="number"
              min="150"
              max="600"
              step="10"
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Max Pages (optional)</label>
            <input
              type="number"
              min="1"
              placeholder="All"
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Match Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'Starting…' : 'Start Replacement'}
        </button>
      </form>
    </div>
  );
}
