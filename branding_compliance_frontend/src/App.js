import React, { useEffect, useState } from 'react';
import './App.css';
import UploadCard from './components/UploadCard';
import StatusPanel from './components/StatusPanel';
import AssetList from './components/AssetList';
import AssetDetailModal from './components/AssetDetailModal';
import DownloadPanel from './components/DownloadPanel';
import { useJob } from './state/useJob';

// PUBLIC_INTERFACE
function App() {
  /** Root app: hosts the layout, theme toggle, and wires components to state hook */
  const [theme, setTheme] = useState('light');

  // Job state manager hook
  const job = useJob();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className="App">
      <nav className="navbar" aria-label="Application header">
        <div className="brand">
          <span className="brand-badge" aria-hidden="true" />
          <span>Brand Compliance Analyzer</span>
        </div>
        <div className="row">
          <span className="badge">{job.jobId ? `Job: ${job.jobId}` : 'No job yet'}</span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </nav>

      <main className="container">
        <section className="card" aria-labelledby="uploads-title">
          <div className="section-title" id="uploads-title">Uploads</div>
          <UploadCard
            creating={job.creating}
            hasJob={!!job.jobId}
            onCreateJob={job.createJob}
            onUploadAssets={job.uploadAssetsZip}
            onUploadOldBrand={job.uploadOldBrand}
            onUploadNewBrand={job.uploadNewBrand}
            onAnalyze={job.triggerAnalyze}
            disabled={!job.jobId || job.isAnalyzing}
            isAnalyzing={job.isAnalyzing}
            showToast={job.toast}
          />
        </section>

        <section className="card" aria-labelledby="assets-title">
          <div className="section-title" id="assets-title">Assets</div>
          <AssetList
            assets={job.assets}
            filters={job.filters}
            setFilters={job.setFilters}
            onOpen={(a) => job.setActiveAsset(a)}
            loading={job.loadingResults}
          />
        </section>

        <aside className="grid">
          <div className="card" aria-labelledby="status-title">
            <div className="section-title" id="status-title">Status</div>
            <StatusPanel status={job.status} onRefresh={job.refreshStatus} lastUpdated={job.lastUpdated} />
          </div>
          <div className="card" aria-labelledby="download-title">
            <div className="section-title" id="download-title">Downloads</div>
            <DownloadPanel
              hasJob={!!job.jobId}
              onDownloadZip={() => job.download('zip')}
              onDownloadReport={() => job.download('report')}
              onDownloadBoth={() => job.download('both')}
              downloading={job.downloading}
            />
          </div>
        </aside>
      </main>

      {job.activeAsset && (
        <AssetDetailModal
          asset={job.activeAsset}
          jobId={job.jobId}
          onClose={() => job.setActiveAsset(null)}
          onFix={(strategy) => job.fixAsset(job.activeAsset.id, strategy)}
          getPreviewUrl={(view, page) => job.getPreviewUrl(job.activeAsset.id, view, page)}
          fixing={job.fixingIds.has(job.activeAsset.id)}
          toast={job.toast}
        />
      )}

      {job.toastState.visible && (
        <div className="toast" role="alert" aria-live="assertive">
          {job.toastState.message}
        </div>
      )}
    </div>
  );
}

export default App;
