import React, { useEffect, useMemo, useRef, useState } from 'react';

// Helper: supported preview image types
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const isImageFile = (file) => IMAGE_TYPES.includes(file.type) || /\.(png|jpg|jpeg|webp)$/i.test(file.name);

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
  /** Upload panel with drag-and-drop areas for assets zip and brand images, with client-side previews */
  const assetsInputRef = useRef(null);
  const oldBrandRef = useRef(null);
  const newBrandRef = useRef(null);

  const [dragOver, setDragOver] = useState({ assets: false, old: false, neu: false });

  // Local selections and object URLs for previews
  const [selectedZip, setSelectedZip] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]); // when using multi-file images[] in future
  const [oldLogo, setOldLogo] = useState(null);
  const [newLogo, setNewLogo] = useState(null);
  const [errors, setErrors] = useState([]);

  // Refs to keep track of created object URLs for cleanup
  const createdUrlsRef = useRef([]);

  const addError = (msg) => setErrors((prev) => [...prev, msg]);
  const clearError = (idx) =>
    setErrors((prev) => (idx != null ? prev.filter((_, i) => i !== idx) : []));

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const revokeAllUrls = () => {
    createdUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    createdUrlsRef.current = [];
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => revokeAllUrls();
  }, []);

  // Build a preview object for any file (image: object URL, doc: filename/size)
  const buildPreview = (file) => {
    if (!file) return null;
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      createdUrlsRef.current.push(url);
      return { type: 'image', url, name: file.name, size: file.size };
    }
    return { type: 'doc', name: file.name, size: file.size };
  };

  const oldLogoPreview = useMemo(() => buildPreview(oldLogo), [oldLogo]);
  const newLogoPreview = useMemo(() => buildPreview(newLogo), [newLogo]);
  const zipInfo = useMemo(
    () => (selectedZip ? { name: selectedZip.name, size: selectedZip.size } : null),
    [selectedZip]
  );

  const handleZip = (file) => {
    if (!file) return;
    const isZip = /\.zip$/i.test(file.name);
    if (!isZip) {
      const msg = 'Only .zip files are supported for assets.';
      addError(msg);
      showToast?.(msg);
      return;
    }
    setSelectedZip(file);
    // Keep existing API call behavior
    onUploadAssets?.(file);
  };

  const handleLogo = (file, kind) => {
    if (!file) return;
    // Basic type check: allow images only
    if (!isImageFile(file)) {
      const msg = `Unsupported ${kind === 'old' ? 'old' : 'new'} logo file type. Please select a PNG/JPG/WEBP image.`;
      addError(msg);
      showToast?.(msg);
      return;
    }
    // Clear previous object URLs to avoid leaks when replacing
    revokeAllUrls();

    if (kind === 'old') {
      setOldLogo(file);
      onUploadOldBrand?.(file);
    } else {
      setNewLogo(file);
      onUploadNewBrand?.(file);
    }
  };

  const clearSelection = (kind) => {
    if (kind === 'zip') {
      setSelectedZip(null);
      if (assetsInputRef.current) assetsInputRef.current.value = '';
    } else if (kind === 'old') {
      setOldLogo(null);
      if (oldBrandRef.current) oldBrandRef.current.value = '';
    } else if (kind === 'new') {
      setNewLogo(null);
      if (newBrandRef.current) newBrandRef.current.value = '';
    }
  };

  const handleDrop = async (e, kind) => {
    prevent(e);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (kind === 'assets') {
      handleZip(file);
    } else if (kind === 'old') {
      handleLogo(file, 'old');
    } else {
      handleLogo(file, 'new');
    }
    setDragOver((s) => ({ ...s, [kind]: false }));
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
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

      {/* Errors */}
      {errors.length > 0 && (
        <div className="card" role="alert" aria-live="assertive" style={{ borderColor: 'var(--error)' }}>
          <div className="section-title">Selection Errors</div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((e, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--error)' }}>{e}</span>
                <button className="btn ghost small" onClick={() => clearError(idx)} aria-label="Dismiss error">
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
          {errors.length > 1 && (
            <div className="row mt-8">
              <button className="btn ghost small" onClick={() => clearError()} aria-label="Clear all errors">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assets ZIP */}
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
        <div className="text-muted small mt-8">
          Drag and drop or click to select a .zip of images/documents
        </div>
        <input
          ref={assetsInputRef}
          type="file"
          accept=".zip"
          onChange={(e) => e.target.files?.[0] && handleZip(e.target.files[0])}
        />
        {zipInfo ? (
          <div className="row mt-12" aria-live="polite">
            <span className="badge">Selected: 1</span>
            <span className="small">{zipInfo.name} • {formatSize(zipInfo.size)}</span>
            <button className="btn ghost small" onClick={() => clearSelection('zip')} aria-label="Clear selected zip">
              Clear
            </button>
          </div>
        ) : (
          <div className="small text-muted mt-8">Selected: 0</div>
        )}
      </div>

      {/* Logos */}
      <div className="row">
        {/* Old Logo */}
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
            onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0], 'old')}
          />
          <div className="row mt-12" aria-live="polite">
            <span className="badge">Selected: {oldLogo ? 1 : 0}</span>
            {oldLogoPreview && (
              <>
                {oldLogoPreview.type === 'image' ? (
                  <img
                    src={oldLogoPreview.url}
                    alt="Old brand preview"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'contain',
                      background: 'transparent',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <span className="small">
                  {oldLogoPreview.name} • {formatSize(oldLogoPreview.size)}
                </span>
                <button
                  className="btn ghost small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection('old');
                  }}
                  aria-label="Clear old brand selection"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* New Logo */}
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
            onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0], 'new')}
          />
          <div className="row mt-12" aria-live="polite">
            <span className="badge">Selected: {newLogo ? 1 : 0}</span>
            {newLogoPreview && (
              <>
                {newLogoPreview.type === 'image' ? (
                  <img
                    src={newLogoPreview.url}
                    alt="New brand preview"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'contain',
                      background: 'transparent',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <span className="small">
                  {newLogoPreview.name} • {formatSize(newLogoPreview.size)}
                </span>
                <button
                  className="btn ghost small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection('new');
                  }}
                  aria-label="Clear new brand selection"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Note: For future multipart images[] selection support (gallery thumbnails). Current backend flow uses .zip + logos. */}
      {selectedImages?.length > 0 && (
        <div className="card">
          <div className="section-title">Selected Images</div>
          <div className="row small">
            <span className="badge">Count: {selectedImages.length}</span>
          </div>
          <div className="asset-grid mt-12">
            {selectedImages.map((f, idx) => {
              const p = buildPreview(f);
              return (
                <div key={idx} className="asset-item" style={{ cursor: 'default' }}>
                  {p?.type === 'image' ? (
                    <img className="asset-thumb" src={p.url} alt={p.name} />
                  ) : (
                    <div className="asset-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="small">{p?.name}</span>
                    </div>
                  )}
                  <div className="asset-meta">
                    <span className="small" style={{ textAlign: 'left' }}>{p?.name}</span>
                    <button
                      className="btn ghost small"
                      onClick={() =>
                        setSelectedImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
