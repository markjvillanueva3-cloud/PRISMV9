/**
 * Document Learning Page — Upload documents, extract knowledge, and browse results.
 * Wraps the documentLearningDispatcher (doc_upload, doc_extract, doc_list, doc_get, doc_delete).
 */
import { useState, useEffect, useCallback } from 'react';
import { docUpload, docExtract, docList, docGet, docDelete, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';

interface DocRecord {
  id: string;
  file_path: string;
  title: string | null;
  format: string;
  status: 'pending' | 'extracting' | 'complete' | 'failed';
  created_at: string;
  error: string | null;
}

interface DocKnowledge {
  id: string;
  title: string;
  entries: Array<{ type: string; content: string; confidence: number; tags?: string[] }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  extracting: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function DocumentLearningPage() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [selected, setSelected] = useState<DocKnowledge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPath, setUploadPath] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');

  const refreshList = useCallback(async () => {
    try {
      const r = await docList();
      const list = (r.result as any)?.documents ?? (r.result as any) ?? [];
      setDocs(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load documents');
    }
  }, []);

  useEffect(() => { refreshList(); }, [refreshList]);

  async function handleUpload() {
    if (!uploadPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await docUpload({ file_path: uploadPath.trim(), title: uploadTitle.trim() || undefined });
      setUploadPath('');
      setUploadTitle('');
      await refreshList();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract(docId: string) {
    setLoading(true);
    setError(null);
    try {
      await docExtract({ doc_id: docId });
      await refreshList();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleView(docId: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await docGet({ doc_id: docId });
      setSelected(r.result as unknown as DocKnowledge);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm(`Delete document ${docId}?`)) return;
    setLoading(true);
    setError(null);
    try {
      await docDelete({ doc_id: docId });
      if (selected?.id === docId) setSelected(null);
      await refreshList();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Learning</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload documents (PDFs, manuals, catalogs) and extract manufacturing knowledge.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">File Path</label>
            <input
              type="text"
              value={uploadPath}
              onChange={(e) => setUploadPath(e.target.value)}
              placeholder="C:/PRISM/CATALOGS/my-catalog.pdf"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Tungaloy 2024 Catalog"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            />
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={loading || !uploadPath.trim()}
          className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50"
        >
          Register Document
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Documents ({docs.length})</h2>
            <button
              onClick={refreshList}
              className="text-sm text-prism-600 hover:text-prism-800"
            >
              Refresh
            </button>
          </div>
          {loading && docs.length === 0 && <LoadingState />}
          {docs.length === 0 && !loading ? (
            <p className="text-sm text-gray-400">No documents registered yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title || doc.file_path.split(/[/\\]/).pop()}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{doc.file_path}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {doc.status}
                        </span>
                        <span className="text-xs text-gray-400">{doc.format}</span>
                      </div>
                      {doc.error && (
                        <p className="text-xs text-red-500 mt-1">{doc.error}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => handleExtract(doc.id)}
                          disabled={loading}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Extract
                        </button>
                      )}
                      {doc.status === 'complete' && (
                        <button
                          onClick={() => handleView(doc.id)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={loading}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge Viewer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Extracted Knowledge</h2>
          {!selected ? (
            <p className="text-sm text-gray-400">
              Select a completed document to view extracted knowledge entries.
            </p>
          ) : (
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">{selected.title}</h3>
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {(selected.entries ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">No entries extracted.</p>
                ) : (
                  selected.entries.map((entry, i) => (
                    <div key={i} className="border border-gray-100 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 bg-prism-100 text-prism-700 rounded">
                          {entry.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {(entry.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
