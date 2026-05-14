/**
 * LEARN-MS5 U-LEARN26: Knowledge Ingestion Page
 *
 * 4 input modes: Text (paste), Video (file drop), Document (upload), URL (paste).
 * Real-time feedback with auto-tags, source attribution, bulk mode.
 */
import { useCallback, useState } from 'react';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { IngestionResult } from '../api/knowledge';
import { autoTag, ingestDocument, ingestText, ingestUrl } from '../api/knowledge';

type InputMode = 'text' | 'video' | 'document' | 'url';

const MODE_CONFIG: Record<InputMode, { label: string; detail: string }> = {
  text: { label: 'Paste Text', detail: 'Paste a CNC tip, machining note, or shop floor insight.' },
  video: { label: 'Video', detail: 'Drop a video file to extract machining knowledge from transcripts.' },
  document: { label: 'Document', detail: 'Upload a PDF, manual, or catalog for automatic extraction.' },
  url: { label: 'URL', detail: 'Paste a URL from YouTube, forums, or social media.' },
};

function TagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function ResultCard({ result }: { result: IngestionResult }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">{result.content_type} ingested</span>
        <StatusPill label={`${result.items_created} item${result.items_created !== 1 ? 's' : ''}`} tone="emerald" />
      </div>
      <p className="text-sm text-slate-300">{result.message}</p>
      <div className="flex flex-wrap gap-1.5">
        {result.tags.materials.map(m => <TagBadge key={m} label={m} color="border-sky-400/30 bg-sky-400/10 text-sky-200" />)}
        {result.tags.operations.map(o => <TagBadge key={o} label={o} color="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" />)}
        {result.tags.machines.map(m => <TagBadge key={m} label={m} color="border-violet-400/30 bg-violet-400/10 text-violet-200" />)}
        {result.tags.tools.map(t => <TagBadge key={t} label={t} color="border-amber-400/30 bg-amber-400/10 text-amber-200" />)}
      </div>
      <div className="text-xs text-slate-500">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
    </div>
  );
}

function LiveTagPreview({ text }: { text: string }) {
  const [tags, setTags] = useState<Awaited<ReturnType<typeof autoTag>> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!text.trim() || text.trim().length < 10) return;
    setLoading(true);
    try {
      const result = await autoTag({ text: text.trim() });
      setTags(result);
    } catch {
      // silently ignore preview errors
    } finally {
      setLoading(false);
    }
  }, [text]);

  if (!text.trim() || text.trim().length < 10) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Auto-Tag Preview</span>
        <button
          type="button"
          onClick={fetchTags}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Preview Tags'}
        </button>
      </div>
      {tags && (
        <div className="flex flex-wrap gap-1.5">
          {tags.materials.map(m => <TagBadge key={m.name} label={`${m.name} (${m.iso_group})`} color="border-sky-400/30 bg-sky-400/10 text-sky-200" />)}
          {tags.operations.map(o => <TagBadge key={o.name} label={o.name} color="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" />)}
          {tags.machines.map(m => <TagBadge key={m.name} label={m.name} color="border-violet-400/30 bg-violet-400/10 text-violet-200" />)}
          {tags.tools.map(t => <TagBadge key={t.name} label={t.name} color="border-amber-400/30 bg-amber-400/10 text-amber-200" />)}
          {tags.materials.length + tags.operations.length + tags.machines.length + tags.tools.length === 0 && (
            <span className="text-xs text-slate-500">No tags detected</span>
          )}
        </div>
      )}
    </div>
  );
}

export function KnowledgeIngestionPage() {
  const [mode, setMode] = useState<InputMode>('text');
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [source, setSource] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [results, setResults] = useState<IngestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);

  const totalIngested = results.reduce((sum, r) => sum + r.items_created, 0);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'text') {
        if (bulkMode) {
          const lines = textContent.split('\n').filter(l => l.trim().length > 0);
          const batchResults: IngestionResult[] = [];
          for (const line of lines) {
            const r = await ingestText({ content: line.trim(), source: source || undefined });
            batchResults.push(r);
          }
          setResults(prev => [...batchResults, ...prev]);
        } else {
          const r = await ingestText({ content: textContent.trim(), source: source || undefined });
          setResults(prev => [r, ...prev]);
        }
        setTextContent('');
      } else if (mode === 'url') {
        const r = await ingestUrl({ url: urlContent.trim(), source: source || undefined });
        setResults(prev => [r, ...prev]);
        setUrlContent('');
      } else if (mode === 'document' && fileData && fileName) {
        const r = await ingestDocument({ file_name: fileName, content_base64: fileData, source: source || undefined });
        setResults(prev => [r, ...prev]);
        setFileName(null);
        setFileData(null);
      } else if (mode === 'video' && fileData && fileName) {
        const r = await ingestDocument({ file_name: fileName, content_base64: fileData, source: source || undefined });
        setResults(prev => [r, ...prev]);
        setFileName(null);
        setFileData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  }, [mode, textContent, urlContent, source, bulkMode, fileData, fileName]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setFileData(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setFileData(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const isSubmitDisabled = loading
    || (mode === 'text' && !textContent.trim())
    || (mode === 'url' && !urlContent.trim())
    || ((mode === 'document' || mode === 'video') && !fileData);

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Knowledge Pipeline"
        title="Ingest Knowledge"
        description="Paste a CNC tip, drop a video, upload a document, or paste a URL. PRISM auto-tags, deduplicates, and stores it in the knowledge graph."
        metrics={
          <>
            <SummaryTile label="Items Ingested" value={String(totalIngested)} hint="this session" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="Submissions" value={String(results.length)} hint="processed" accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
            <SummaryTile label="Input Mode" value={MODE_CONFIG[mode].label} hint="active" accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
      />

      <div className="flex gap-2">
        {(Object.keys(MODE_CONFIG) as InputMode[]).map(m => (
          <TabButton key={m} active={mode === m} onClick={() => setMode(m)}>
            {MODE_CONFIG[m].label}
          </TabButton>
        ))}
      </div>

      <PanelCard title={MODE_CONFIG[mode].label} subtitle={MODE_CONFIG[mode].detail}>
        <div className="space-y-4">
          {mode === 'text' && (
            <>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={bulkMode}
                    onChange={e => setBulkMode(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900"
                  />
                  Bulk mode (one tip per line)
                </label>
              </div>
              <textarea
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder={bulkMode
                  ? "When machining 316L, reduce feed by 20% in corners\nAlways use climb milling for aluminum\nCheck tool runout before finishing passes"
                  : "When machining 316L, reduce feed by 20% in corners due to work hardening..."
                }
                rows={bulkMode ? 8 : 4}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/32"
              />
              <LiveTagPreview text={textContent} />
            </>
          )}

          {mode === 'url' && (
            <Field label="URL">
              <Input
                value={urlContent}
                onChange={e => setUrlContent((e.target as HTMLInputElement).value)}
                placeholder="https://youtube.com/watch?v=... or forum post URL"
              />
            </Field>
          )}

          {(mode === 'document' || mode === 'video') && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] py-12 transition hover:border-cyan-300/20"
            >
              {fileName ? (
                <>
                  <StatusPill label={fileName} tone="emerald" />
                  <span className="text-xs text-slate-500">Ready to ingest</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-400">
                    Drop a {mode === 'video' ? 'video' : 'PDF/document'} here
                  </span>
                  <label className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.06]">
                    Browse Files
                    <input
                      type="file"
                      className="hidden"
                      accept={mode === 'video' ? 'video/*' : '.pdf,.doc,.docx,.txt'}
                      onChange={handleFileSelect}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          <Field label="Source Attribution (optional)">
            <Input
              value={source}
              onChange={e => setSource((e.target as HTMLInputElement).value)}
              placeholder="e.g., Machinery's Handbook, shop foreman, YouTube channel"
            />
          </Field>

          {error && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <ActionButton onClick={handleSubmit} disabled={isSubmitDisabled}>
            {loading ? 'Ingesting...' : `Ingest ${mode === 'text' && bulkMode ? 'Bulk Tips' : MODE_CONFIG[mode].label}`}
          </ActionButton>
        </div>
      </PanelCard>

      {results.length > 0 && (
        <PanelCard title="Ingestion Results" subtitle={`${totalIngested} items extracted from ${results.length} submissions`}>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {results.map((r, i) => <ResultCard key={`${r.id}-${i}`} result={r} />)}
          </div>
        </PanelCard>
      )}
    </div>
  );
}
