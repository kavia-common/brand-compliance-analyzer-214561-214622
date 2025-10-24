import React from 'react';

// PUBLIC_INTERFACE
export default function StatusPanel({ status, onRefresh, lastUpdated }) {
  /** Displays live status including progress and issue counts */
  const progress = Math.max(0, Math.min(100, status?.progress_percent ?? 0));
  const total = status?.total_assets ?? 0;
  const analyzed = status?.analyzed_assets ?? 0;
  const failed = status?.failed_assets ?? 0;
  const issues = status?.issues_total ?? 0;
  const issuesHigh = status?.issues_high_or_above ?? 0;
  const st = status?.status ?? 'idle';

  return (
    <div className="grid" aria-live="polite">
      <div className="status-row">
        <span className="badge">Status: {st}</span>
        <button className="btn ghost small" onClick={onRefresh} aria-label="Refresh status">Refresh</button>
      </div>
      <div className="progress" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="row">
        <span className="badge">Assets: {analyzed}/{total}</span>
        <span className="badge error">Failed: {failed}</span>
        <span className="badge">Issues: {issues}</span>
        <span className="badge error">High+: {issuesHigh}</span>
      </div>
      <div className="text-muted small">Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</div>
    </div>
  );
}
