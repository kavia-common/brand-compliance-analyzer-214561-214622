import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isPdfAsset, assetPreviewUrl, downloadFixedPdf } from '../api/client';

// PUBLIC_INTERFACE
export default function AssetDetailModal({
  asset,
  onClose,
  onFix,
  getPreviewUrl,
  getPagePreviewUrl,
  loadPages,
  pages,
  applyJobFix,
  jobApplyingFix,
  fixing,
  toast,
  jobId,
}) {
  /**
   * Modal with original/overlay/fixed previews, PDF page navigation,
   * overlay rendering, per-page status, job-level apply fix, and fixed PDF download.
   */
  const [view, setView] = useState('original');
  const [strategy, setStrategy] = useState('');
  const [page, setPage] = useState(0); // Local (per asset) 0-based page index
  const [pageCountMeta, setPageCountMeta] = useState(null); // from asset metadata
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  const isPdf = isPdfAsset(asset);

  // Determine page count from either job pages (filtered) or asset metadata
  useEffect(() => {
    setPage(0);
    const pc = asset?.page_count ?? asset?.pages ?? null;
    setPageCountMeta(typeof pc === 'number' && pc > 0 ? pc : null);
  }, [asset]);

  // Load job-level pages when inspecting PDFs
  useEffect(() => {
    if (isPdf && typeof loadPages === 'function') {
      loadPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdf, jobId]);

  // Select job-level page entries that belong to this asset (if available)
  const assetPages = useMemo(() => {
    if (!isPdf || !Array.isArray(pages) || !asset?.id) return [];
    const aid = String(asset.id);
    return pages.filter((p) => (p?.asset_id != null ? String(p.asset_id) === aid : false));
  }, [pages, asset, isPdf]);

  const pageCount = useMemo(() => {
    if (assetPages.length > 0) return assetPages.length;
    return pageCountMeta || null;
  }, [assetPages, pageCountMeta]);

  // Compute global page index (for job-level preview endpoint) given local page
  const globalPageIndex = useMemo(() => {
    if (!isPdf || assetPages.length === 0) return null;
    const entry = assetPages[Math.max(0, Math.min(page, assetPages.length - 1))];
    return entry?.index ?? null;
  }, [assetPages, page, isPdf]);

  // Determine page status for messaging
  const currentPageInfo = useMemo(() => {
    if (!isPdf || assetPages.length === 0) return null;
    return assetPages[Math.max(0, Math.min(page, assetPages.length - 1))];
  }, [assetPages, page, isPdf]);

  // Build preview URL using job-level page endpoint when possible, otherwise asset-level fallback
  const url = useMemo(() => {
    if (!asset) return '';
    // If job-level page preview is available, prefer it
    if (isPdf && typeof getPagePreviewUrl === 'function' && globalPageIndex != null) {
      // For 'overlay' view, we request 'original' and draw overlay boxes ourselves for clarity
      const effectiveView = view === 'overlay' ? 'original' : view;
      const u = getPagePreviewUrl(globalPageIndex, effectiveView);
      if (u) return u;
    }
    // Otherwise fallback to asset-level preview
    if (getPreviewUrl) {
      try {
        const u = getPreviewUrl(view, isPdf ? page : null);
        if (u) return u;
      } catch {
        // ignore, build ourselves
      }
    }
    // final fallback
    const job = jobId ?? asset?.job_id;
    if (!job) return '';
    return assetPreviewUrl(job, asset.id, view, isPdf ? page : null);
  }, [asset, getPreviewUrl, getPagePreviewUrl, view, page, isPdf, jobId, globalPageIndex]);

  // Count detections for current page using asset metadata when available
  const detectionsForPage = useMemo(() => {
    const list = asset?.detections || asset?.issues_list || [];
    if (Array.isArray(list) && isPdf && Array.isArray(list[page])) {
      return list[page];
    }
    if (!isPdf && Array.isArray(list)) return list;
    return [];
  }, [asset, isPdf, page]);

  // Overlay boxes data: show only when overlay view selected
  const detections = useMemo(() => {
    if (!overlayEnabled || view !== 'overlay') return [];
    return detectionsForPage;
  }, [overlayEnabled, view, detectionsForPage]);

  // When image loads, capture natural size for overlay scaling
  const onImgLoad = (e) => {
    const el = e.currentTarget;
    setImgNatural({ w: el.naturalWidth || 0, h: el.naturalHeight || 0 });
  };

  // Compute bounding box styles relative to rendered image size
  const renderBoxes = () => {
    if (!imgRef.current || !imgNatural.w || !imgNatural.h || detections.length === 0) return null;
    const imgEl = imgRef.current;
    const rect = imgEl.getBoundingClientRect();
    const rw = rect.width;
    const rh = rect.height;

    return detections.map((d, idx) => {
      // Support both absolute pixel and relative [0..1] coords
      const isRelative = d.x <= 1 && d.y <= 1 && d.w <= 1 && d.h <= 1;
      const x = isRelative ? d.x * rw : (d.x * rw) / imgNatural.w;
      const y = isRelative ? d.y * rh : (d.y * rh) / imgNatural.h;
      const w = isRelative ? d.w * rw : (d.w * rw) / imgNatural.w;
      const h = isRelative ? d.h * rh : (d.h * rh) / imgNatural.h;
      const label = d.label || 'match';
      const score = d.score != null ? ` ${(d.score * 100).toFixed(0)}%` : '';
      return (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: w,
            height: h,
            border: '2px solid rgba(239,68,68,0.9)',
            borderRadius: 6,
            boxShadow: '0 0 0 1px rgba(239,68,68,0.6) inset',
            pointerEvents: 'none',
          }}
          aria-label={`Detection ${label}${score}`}
          title={`${label}${score}`}
        />
      );
    });
  };

  const canPrev = isPdf && page > 0;
  const canNext = isPdf && (pageCount == null || page < pageCount - 1);

  const handleDownloadFixedPdf = async () => {
    try {
      const job = jobId ?? asset?.job_id;
      if (!job) throw new Error('Missing job id');
      const blob = await downloadFixedPdf(job, asset.id);
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      const base = (asset?.name || 'document').replace(/\.pdf$/i, '');
      a.download = `${base}-fixed.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObj);
    } catch (e) {
      toast?.(`Fixed PDF not available: ${e.message}`);
    }
  };

  // Build status message for current page
  const statusMessage = useMemo(() => {
    if (!isPdf) return '';
    const detCount = Array.isArray(detectionsForPage) ? detectionsForPage.length : 0;
    if (!currentPageInfo) {
      // Fallback using detections only
      return detCount > 0 ? `Detections on this page: ${detCount}` : 'No detections on this page (skipped).';
    }
    if (currentPageInfo.fixed) return 'Fixed ✔';
    if (currentPageInfo.has_detection === false) return 'No detections on this page (skipped).';
    if (typeof detCount === 'number') return detCount > 0 ? `Detections on this page: ${detCount}` : 'No detections on this page (skipped).';
    return currentPageInfo.status ? String(currentPageInfo.status) : '';
  }, [isPdf, currentPageInfo, detectionsForPage]);

  const onApplyFixClick = async () => {
    if (isPdf && typeof applyJobFix === 'function') {
      await applyJobFix();
    } else {
      onFix?.(strategy);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Details for ${asset?.name}`}>
      <div className="modal">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="section-title">Asset Detail</div>
            <div className="row">
              <strong>{asset?.name}</strong>
              <span className={`badge ${asset?.issues > 0 ? 'error' : 'success'}`}>{asset?.issues ?? 0} issues</span>
              {isPdf && <span className="badge" aria-label="PDF type">PDF</span>}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="row mt-12" style={{ justifyContent: 'space-between' }}>
          <div className="row" role="tablist" aria-label="Preview view">
            {['original', 'overlay', 'fixed'].map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className={`btn ${view === v ? '' : 'ghost'}`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="row">
            {isPdf && (
              <>
                <button
                  className="btn ghost"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!canPrev}
                  aria-label="Previous page"
                >
                  ◀
                </button>
                <span className="badge" aria-live="polite">
                  Page {page + 1}{pageCount ? ` / ${pageCount}` : ''}
                </span>
                <button
                  className="btn ghost"
                  onClick={() => setPage((p) => (canNext ? p + 1 : p))}
                  disabled={!canNext}
                  aria-label="Next page"
                >
                  ▶
                </button>
              </>
            )}
            {isPdf && view === 'fixed' && (
              <button className="btn" onClick={handleDownloadFixedPdf} aria-label="Download fixed PDF">
                Download fixed PDF
              </button>
            )}
            {view === 'overlay' && (
              <label className="row card small" style={{ padding: '6px 10px' }}>
                <input
                  type="checkbox"
                  checked={overlayEnabled}
                  onChange={(e) => setOverlayEnabled(e.target.checked)}
                  style={{ marginRight: 6 }}
                  aria-label="Toggle detections overlay"
                />
                Show detections
              </label>
            )}
          </div>
        </div>

        <div className="card mt-12" style={{ textAlign: 'center', position: 'relative' }}>
          {url ? (
            <div style={{ display: 'inline-block', position: 'relative', maxWidth: '100%' }}>
              <img
                ref={imgRef}
                src={url}
                alt={`${view} preview${isPdf ? ` (page ${page + 1})` : ''}`}
                style={{ maxWidth: '100%', maxHeight: 440, borderRadius: 10, display: 'block' }}
                onLoad={onImgLoad}
                onError={() => toast?.('Preview not available')}
              />
              {overlayEnabled && view === 'overlay' && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    borderRadius: 10,
                  }}
                >
                  {renderBoxes()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted">No preview available</div>
          )}
          {isPdf && (
            <div className="mt-8 small" aria-live="polite">
              {statusMessage}
            </div>
          )}
        </div>

        <div className="row mt-12" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            {!isPdf && (
              <input
                className="card"
                placeholder="Fix strategy (optional)"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                aria-label="Fix strategy"
                style={{ padding: 10 }}
              />
            )}
            <button
              className="btn success"
              onClick={onApplyFixClick}
              disabled={fixing || jobApplyingFix}
              aria-busy={fixing || jobApplyingFix ? 'true' : 'false'}
            >
              {fixing || jobApplyingFix ? 'Applying…' : 'Apply Fix'}
            </button>
          </div>
          <div className="text-muted small">
            {isPdf
              ? 'Applies fixes across detected pages for this job; skipped pages remain original.'
              : 'Tips: Use "auto" or leave blank to let the backend choose.'}
          </div>
        </div>
      </div>
    </div>
  );
}
