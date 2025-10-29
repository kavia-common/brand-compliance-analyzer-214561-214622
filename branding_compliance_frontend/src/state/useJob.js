import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../api/client';

// Helpers to normalize page listing payloads from backend
function normalizePagesPayload(raw) {
  // The response shape is implementation-defined; accept {pages: []} or [ ... ]
  const arr = Array.isArray(raw) ? raw : raw?.pages || raw?.items || [];
  const norm = (arr || []).map((p, i) => {
    const idx =
      p?.index ?? p?.global_index ?? p?.page_global ?? p?.page_index ?? p?.page ?? i;
    const assetId =
      p?.asset_id ?? p?.assetId ?? p?.document_id ?? p?.pdf_id ?? p?.doc_id ?? null;
    const hasDet =
      p?.has_detection ??
      p?.detected ??
      (Array.isArray(p?.detections) ? p.detections.length > 0 : undefined);
    const fixed =
      p?.fixed ??
      (typeof p?.status === 'string' && p.status.toLowerCase().includes('fixed')) ??
      false;
    const status =
      p?.status ??
      p?.state ??
      (fixed ? 'fixed' : hasDet === false ? 'skipped' : 'detected');
    const pageInDoc = p?.page_in_doc ?? p?.doc_page ?? p?.page_index ?? null;
    return {
      index: Number(idx),
      asset_id: assetId != null ? String(assetId) : null,
      has_detection: hasDet,
      fixed: Boolean(fixed),
      status,
      page_in_doc: pageInDoc != null ? Number(pageInDoc) : null,
      raw: p,
    };
  });
  // sort by index asc if indices appear numeric
  return norm.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

// PUBLIC_INTERFACE
export function useJob() {
  /**
   * State manager for job lifecycle:
   * - create job
   * - uploads (assets zip, old/new brand)
   * - trigger analyze
   * - poll status
   * - fetch results
   * - fix assets / batch fix
   * - job-level apply-fix (per-page PDF)
   * - download artifacts (zip/report/both/pdf)
   * Includes toast-based error handling and basic filters.
   */
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [assets, setAssets] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);
  const [filters, setFilters] = useState({ showOnlyIssues: false, query: '' });
  const [toastState, setToastState] = useState({ visible: false, message: '' });
  const toastTimer = useRef(null);
  const [fixingIds, setFixingIds] = useState(new Set());
  const [applyingFix, setApplyingFix] = useState(false);

  // Per-page PDF workflow state
  const [pages, setPages] = useState([]); // normalized list from listPages

  // PUBLIC_INTERFACE
  const toast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToastState({ visible: false, message: '' }), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // PUBLIC_INTERFACE
  const createJob = useCallback(async () => {
    setCreating(true);
    try {
      const res = await api.createJob({});
      setJobId(res.job_id);
      toast('Job created');
      return res.job_id;
    } catch (e) {
      toast(`Create job failed: ${e.message}`);
      throw e;
    } finally {
      setCreating(false);
    }
  }, [toast]);

  // PUBLIC_INTERFACE
  const uploadAssetsZip = useCallback(
    async (file) => {
      if (!jobId) return toast('Please create a job first.');
      if (!file) return toast('Please select a file.');
      try {
        await api.uploadAssetsZip(jobId, file);
        toast('Assets uploaded');
      } catch (e) {
        toast(`Upload failed: ${e.message}`);
      }
    },
    [jobId, toast]
  );

  // PUBLIC_INTERFACE
  const uploadOldBrand = useCallback(
    async (file) => {
      if (!jobId) return toast('Please create a job first.');
      if (!file) return toast('Please select a file.');
      try {
        await api.uploadOldBrand(jobId, file);
        toast('Old brand uploaded');
      } catch (e) {
        toast(`Upload failed: ${e.message}`);
      }
    },
    [jobId, toast]
  );

  // PUBLIC_INTERFACE
  const uploadNewBrand = useCallback(
    async (file) => {
      if (!jobId) return toast('Please create a job first.');
      if (!file) return toast('Please select a file.');
      try {
        await api.uploadNewBrand(jobId, file);
        toast('New brand uploaded');
      } catch (e) {
        toast(`Upload failed: ${e.message}`);
      }
    },
    [jobId, toast]
  );

  // PUBLIC_INTERFACE
  const triggerAnalyze = useCallback(async () => {
    if (!jobId) return toast('Please create a job first.');
    setIsAnalyzing(true);
    try {
      await api.analyze(jobId);
      toast('Analysis started');
      // Start polling
      pollStatus();
    } catch (e) {
      toast(`Analyze failed: ${e.message}`);
    } finally {
      // keep flag true until we detect complete via status
    }
  }, [jobId, toast]);

  // POLLING
  const pollingRef = useRef(null);
  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const refreshStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const st = await api.status(jobId);
      setStatus(st);
      setLastUpdated(new Date().toISOString());
      if (st?.status?.toLowerCase() === 'complete' || st?.progress_percent >= 100) {
        setIsAnalyzing(false);
        clearPolling();
        // load results and pages on complete
        await loadResults();
        await loadPages();
      }
    } catch (e) {
      toast(`Status error: ${e.message}`);
    }
  }, [jobId]); // toast intentionally omitted to avoid recreating too often

  const pollStatus = useCallback(() => {
    clearPolling();
    refreshStatus(); // immediate
    pollingRef.current = setInterval(refreshStatus, 2000);
  }, [refreshStatus]);

  useEffect(() => {
    return () => clearPolling();
  }, []);

  // PUBLIC_INTERFACE
  const loadResults = useCallback(async () => {
    if (!jobId) return;
    setLoadingResults(true);
    try {
      const r = await api.results(jobId);
      // Normalizing: include optional type/mime, page_count, detections (page-indexed for PDFs)
      const normalized = (r.assets || r || []).map((a, idx) => ({
        id: a.id ?? a.asset_id ?? String(idx),
        name: a.name ?? a.filename ?? `Asset ${idx + 1}`,
        issues: a.issues ?? a.issues_count ?? 0,
        issues_list: a.issues_list ?? [],
        thumbnail_url: a.thumbnail_url ?? null,
        type: a.type ?? a.mime ?? null,
        page_count: a.page_count ?? a.pages ?? null,
        detections: a.detections ?? a.page_detections ?? a.issues_boxes ?? a.issues_list ?? [],
        job_id: jobId,
      }));
      setAssets(normalized);
    } catch (e) {
      toast(`Results error: ${e.message}`);
    } finally {
      setLoadingResults(false);
    }
  }, [jobId, toast]);

  // PUBLIC_INTERFACE
  const loadPages = useCallback(async () => {
    if (!jobId) return;
    try {
      const raw = await api.listPages(jobId);
      const norm = normalizePagesPayload(raw);
      setPages(norm);
    } catch (e) {
      // Do not spam toast if pages endpoint not implemented
      console.warn('Pages listing failed:', e?.message || e);
    }
  }, [jobId]);

  // PUBLIC_INTERFACE
  const getPreviewUrl = useCallback(
    (assetId, view = 'original', page = null) => {
      if (!jobId) return '';
      return api.assetPreviewUrl(jobId, assetId, view, page);
    },
    [jobId]
  );

  // PUBLIC_INTERFACE
  const getPagePreviewUrl = useCallback(
    (pageIndex, view = 'original') => {
      if (!jobId && jobId !== 0) return '';
      return api.pagePreviewUrl(jobId, pageIndex, view);
    },
    [jobId]
  );

  // PUBLIC_INTERFACE
  const fixAsset = useCallback(
    async (assetId, strategy) => {
      if (!jobId) return toast('No job');
      setFixingIds((prev) => new Set([...Array.from(prev), assetId]));
      try {
        await api.fixAsset(jobId, assetId, { strategy });
        toast('Fix requested');
        await loadResults();
      } catch (e) {
        toast(`Fix failed: ${e.message}`);
      } finally {
        setFixingIds((prev) => {
          const next = new Set(Array.from(prev));
          next.delete(assetId);
          return next;
        });
      }
    },
    [jobId, loadResults, toast]
  );

  // PUBLIC_INTERFACE
  const applyJobFix = useCallback(async () => {
    if (!jobId) return toast('No job');
    setApplyingFix(true);
    try {
      await api.applyFix(jobId);
      toast('Applying fixes…');
      // After applying, refresh both results and pages to update previews/states
      await loadResults();
      await loadPages();
      toast('Fixes applied');
    } catch (e) {
      toast(`Apply fix failed: ${e.message}`);
    } finally {
      setApplyingFix(false);
    }
  }, [jobId, loadResults, loadPages, toast]);

  // PUBLIC_INTERFACE
  const download = useCallback(
    async (type) => {
      if (!jobId) return toast('No job');
      setDownloading(true);
      try {
        const blob = await api.download(jobId, type);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name =
          type === 'report' ? `report-${jobId}.pdf` : type === 'both' ? `artifacts-${jobId}.zip` : `fixed-${jobId}.zip`;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        toast(`Download failed: ${e.message}`);
      } finally {
        setDownloading(false);
      }
    },
    [jobId, toast]
  );

  // PUBLIC_INTERFACE
  const downloadPdf = useCallback(async () => {
    if (!jobId) return toast('No job');
    setDownloading(true);
    try {
      const blob = await api.downloadPdf(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fixed-${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast(`Download PDF failed: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }, [jobId, toast]);

  const filteredAssets = useMemo(() => {
    let list = assets;
    if (filters.showOnlyIssues) {
      list = list.filter((a) => (a.issues || 0) > 0);
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [assets, filters]);

  return {
    jobId,
    status,
    lastUpdated,
    assets: filteredAssets,
    isAnalyzing,
    creating,
    loadingResults,
    downloading,
    activeAsset,
    setActiveAsset,
    filters,
    setFilters,
    createJob,
    uploadAssetsZip,
    uploadOldBrand,
    uploadNewBrand,
    triggerAnalyze,
    refreshStatus,
    loadResults,
    loadPages,
    pages,
    fixAsset,
    applyJobFix,
    getPreviewUrl,
    getPagePreviewUrl,
    download,
    downloadPdf,
    toast,
    toastState,
    fixingIds,
    applyingFix,
  };
}
