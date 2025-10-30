import React, { useState, useEffect } from 'react';
import './App.css';
import UploadForm from './components/UploadForm';
import JobStatus from './components/JobStatus';
import PagePreview from './components/PagePreview';
import DownloadPanel from './components/DownloadPanel';
import { startLogoReplaceJob } from './api/pdfApi';

// PUBLIC_INTERFACE
function App() {
  /** Top-level app with theme toggle and PDF replacement workflow. */
  const [theme, setTheme] = useState('light');
  const [jobId, setJobId] = useState('');
  const [statusObj, setStatusObj] = useState(null);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleStart = async (payload) => {
    const res = await startLogoReplaceJob(payload);
    if (res?.job_id) setJobId(res.job_id);
  };

  const totalPages = statusObj?.findings?.total_pages || 0;

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <div style={{ maxWidth: 980, width: '100%', padding: 16 }}>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Brand Compliance - PDF Logo Replacement</h1>
          <p style={{ opacity: 0.8, marginTop: 0 }}>
            Elegantly upload your PDF and logo assets to detect and replace outdated branding.
          </p>

          {!jobId && <UploadForm onStart={handleStart} />}

          {jobId && (
            <>
              <JobStatus jobId={jobId} polling={true} onStatus={setStatusObj} />
              {totalPages > 0 && <PagePreview jobId={jobId} totalPages={totalPages} />}
              <DownloadPanel jobId={jobId} jobStatus={statusObj} />
            </>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
