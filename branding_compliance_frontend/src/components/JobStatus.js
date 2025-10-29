/* Job status polling component */
import React, { useEffect, useState } from 'react';
import { getJobStatus } from '../api/pdfApi';
import './theme.css';

// PUBLIC_INTERFACE
export default function JobStatus({ jobId, polling = true, onStatus }) {
  /** Displays status information and progress, polling periodically.
   * @param {string} jobId
   * @param {boolean} polling - Whether to poll the backend.
   * @param {(statusObj:Object)=>void} onStatus - Callback when status updates.
   */
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let timer;
    async function fetchStatus() {
      try {
        const s = await getJobStatus(jobId);
        setStatus(s);
        setError('');
        onStatus && onStatus(s);
        // stop polling if completed or failed
        if (s.status === 'completed' || s.status === 'failed') {
          if (timer) clearInterval(timer);
        }
      } catch (err) {
        setError(err?.message || 'Failed to fetch status');
      }
    }
    if (jobId) {
      fetchStatus();
      if (polling) {
        timer = setInterval(() => setTick((v) => v + 1), 2000);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [jobId, polling]);

  useEffect(() => {
    async function refetch() {
      if (jobId && polling) {
        try {
          const s = await getJobStatus(jobId);
          setStatus(s);
          setError('');
          onStatus && onStatus(s);
        } catch (err) {
          setError(err?.message || 'Failed to fetch status');
        }
      }
    }
    if (tick > 0) refetch();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!jobId) return null;

  const progressPct = Math.round((status?.progress || 0) * 100);

  return (
    <div className="card surface">
      <h3 className="title-small">Job Status</h3>
      <div className="row">
        <div className={`badge ${status?.status}`}>{status?.status || '...'}</div>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="progress-text">{progressPct}%</div>
      </div>
      {status?.message && <p className="muted">Message: {status.message}</p>}
      {error && <div className="alert error">{error}</div>}

      {status?.findings && (
        <div className="findings">
          <h4 className="subtitle">Findings</h4>
          <p className="muted">Total pages: {status.findings.total_pages}</p>
          {Array.isArray(status.findings.pages) && status.findings.pages.length > 0 && (
            <ul className="list">
              {status.findings.pages.map((p) => (
                <li key={p.page_index}>
                  Page {p.page_index + 1}: {p.detections?.length || 0} detections
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
