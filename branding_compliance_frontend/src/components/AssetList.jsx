import React from 'react';

// PUBLIC_INTERFACE
export default function AssetList({ assets, filters, setFilters, onOpen, loading }) {
  /** Grid of assets with search and "issues only" filter */
  return (
    <div className="grid">
      <div className="row">
        <input
          aria-label="Search assets"
          placeholder="Search assets…"
          className="card"
          style={{ padding: 10, flex: 1 }}
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        />
        <label className="row card" style={{ padding: '6px 10px' }}>
          <input
            type="checkbox"
            checked={filters.showOnlyIssues}
            onChange={(e) => setFilters({ ...filters, showOnlyIssues: e.target.checked })}
            aria-label="Show only assets with issues"
            style={{ marginRight: 8 }}
          />
          Issues only
        </label>
      </div>

      {loading ? (
        <div className="text-muted">Loading results…</div>
      ) : assets?.length ? (
        <div className="asset-grid">
          {assets.map((a) => (
            <button
              key={a.id}
              className="asset-item"
              onClick={() => onOpen?.(a)}
              aria-label={`Open ${a.name}`}
            >
              <img
                className="asset-thumb"
                alt={a.name}
                src={a.thumbnail_url || ''}
                onError={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.src=''; }}
              />
              <div className="asset-meta">
                <span className="small" style={{ textAlign: 'left' }}>{a.name}</span>
                <span className={`badge ${a.issues > 0 ? 'error' : 'success'}`}>
                  {a.issues ?? 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-muted">No assets to display.</div>
      )}
    </div>
  );
}
