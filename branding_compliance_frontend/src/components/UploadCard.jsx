import React, { useRef, useState } from 'react';

// PUBLIC_INTERFACE
export default function UploadCard({
  creating,
  hasJob,
  onCreateJob,
  onUploadAssets,
  onUploadOldBrand,
  onUploadNewBrand,
  onAnalyze,
  disabled,
  isAnalyzing,
  showToast,
}) {
  /** Upload panel with drag-and-drop areas for assets zip and brand images */
  const assetsInputRef = useRef(null);
  const oldBrandRef = useRef(null);
  const newBrandRef = useRef(null);

  const [dragOver, setDragOver] = useState({ assets: false, old: false, neu: false });

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e, kind) => {
    prevent(e);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (kind === 'assets') {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        showToast?.('Please drop a .zip file');
        return;
      }
      onUploadAssets?.(file);
    } else if (kind === 'old') {
      onUploadOldBrand?.(file);
    } else {
      onUploadNewBrand?.(file);
    }
    setDragOver((s) => ({ ...s, [kind]: false }));
  };

  return (
    <div className="grid">
      <div className="row">
        <button
          className="btn"
          onClick={onCreateJob}
          disabled={creating || hasJob}
          aria-busy={creating ? 'true' : 'false'}
          aria-live="polite"
        >
          {creating ? 'Creating…' : hasJob ? 'Job Ready' : 'Create Job'}
        </button>
        <button className="btn success" onClick={onAnalyze} disabled={disabled}>
          {isAnalyzing ? 'Analyzing…' : 'Start Analysis'}
        </button>
      </div>

      <div
        className={`upload-zone ${dragOver.assets ? 'dragover' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload assets zip"
        onDragEnter={(e) => {
          prevent(e);
          setDragOver((s) => ({ ...s, assets: true }));
        }}
        onDragOver={prevent}
        onDragLeave={(e) => {
          prevent(e);
          setDragOver((s) => ({ ...s, assets: false }));
        }}
        onDrop={(e) => handleDrop(e, 'assets')}
        onClick={() => assetsInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && assetsInputRef.current?.click()}
      >
        <strong>Assets (.zip)</strong>
        <div className="text-muted small mt-8">Drag and drop or click to select a .zip of images/documents</div>
        <input
          ref={assetsInputRef}
          type="file"
          accept=".zip"
          onChange={(e) => e.target.files?.[0] && onUploadAssets?.(e.target.files[0])}
        />
      </div>

      <div className="row">
        <div
          className={`upload-zone ${dragOver.old ? 'dragover' : ''}`}
          style={{ flex: 1 }}
          role="button"
          tabIndex={0}
          aria-label="Upload old brand image"
          onDragEnter={(e) => {
            prevent(e);
            setDragOver((s) => ({ ...s, old: true }));
          }}
          onDragOver={prevent}
          onDragLeave={(e) => {
            prevent(e);
            setDragOver((s) => ({ ...s, old: false }));
          }}
          onDrop={(e) => handleDrop(e, 'old')}
          onClick={() => oldBrandRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && oldBrandRef.current?.click()}
        >
          <strong>Old Brand</strong>
          <div className="text-muted small mt-8">Drop or click to upload a reference image</div>
          <input
            ref={oldBrandRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onUploadOldBrand?.(e.target.files[0])}
          />
        </div>

        <div
          className={`upload-zone ${dragOver.neu ? 'dragover' : ''}`}
          style={{ flex: 1 }}
          role="button"
          tabIndex={0}
          aria-label="Upload new brand image"
          onDragEnter={(e) => {
            prevent(e);
            setDragOver((s) => ({ ...s, neu: true }));
          }}
          onDragOver={prevent}
          onDragLeave={(e) => {
            prevent(e);
            setDragOver((s) => ({ ...s, neu: false }));
          }}
          onDrop={(e) => handleDrop(e, 'neu')}
          onClick={() => newBrandRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && newBrandRef.current?.click()}
        >
          <strong>New Brand</strong>
          <div className="text-muted small mt-8">Drop or click to upload the new brand/logo</div>
          <input
            ref={newBrandRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onUploadNewBrand?.(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
}
