import React, { useMemo, useState } from 'react';

// PUBLIC_INTERFACE
export default function AssetDetailModal({ asset, onClose, onFix, getPreviewUrl, fixing, toast }) {
  /** Modal with original/overlay/fixed previews and ability to request a fix */
  const [view, setView] = useState('original');
  const [strategy, setStrategy] = useState('');

  const url = useMemo(() => getPreviewUrl?.(view) ?? '', [getPreviewUrl, view]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Details for ${asset?.name}`}>
      <div className="modal">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="section-title">Asset Detail</div>
            <div className="row">
              <strong>{asset?.name}</strong>
              <span className={`badge ${asset?.issues > 0 ? 'error' : 'success'}`}>{asset?.issues ?? 0} issues</span>
            </div>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="row mt-12">
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
        </div>

        <div className="card mt-12" style={{ textAlign: 'center' }}>
          {url ? (
            <img
              src={url}
              alt={`${view} preview`}
              style={{ maxWidth: '100%', maxHeight: 440, borderRadius: 10 }}
              onError={() => toast?.('Preview not available')}
            />
          ) : (
            <div className="text-muted">No preview available</div>
          )}
        </div>

        <div className="row mt-12" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <input
              className="card"
              placeholder="Fix strategy (optional)"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              aria-label="Fix strategy"
              style={{ padding: 10 }}
            />
            <button
              className="btn success"
              onClick={() => onFix?.(strategy)}
              disabled={fixing}
              aria-busy={fixing ? 'true' : 'false'}
            >
              {fixing ? 'Applying…' : 'Apply Fix'}
            </button>
          </div>
          <div className="text-muted small">
            Tips: Use "auto" or leave blank to let the backend choose.
          </div>
        </div>
      </div>
    </div>
  );
}
