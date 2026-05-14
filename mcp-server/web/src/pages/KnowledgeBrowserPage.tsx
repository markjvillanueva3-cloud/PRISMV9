/**
 * LEARN-MS5 U-LEARN27: Knowledge Browser Page
 *
 * Faceted search with material/operation/machine/source filters.
 * Tip cards with tags, confidence, linked knowledge.
 * Stats dashboard: total tips, coverage by material/operation, gap analysis.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import type { KnowledgeEntry, KnowledgeStats } from '../api/knowledge';
import { getKnowledgeStats, searchKnowledge } from '../api/knowledge';

type ViewTab = 'search' | 'stats';

const MATERIAL_OPTIONS = [
  { value: '', label: 'All Materials' },
  { value: 'P', label: 'P — Steel' },
  { value: 'M', label: 'M — Stainless Steel' },
  { value: 'K', label: 'K — Cast Iron' },
  { value: 'N', label: 'N — Non-Ferrous' },
  { value: 'S', label: 'S — Superalloy' },
  { value: 'H', label: 'H — Hardened Steel' },
];

const OPERATION_OPTIONS = [
  { value: '', label: 'All Operations' },
  { value: 'milling', label: 'Milling' },
  { value: 'turning', label: 'Turning' },
  { value: 'drilling', label: 'Drilling' },
  { value: 'grinding', label: 'Grinding' },
  { value: 'threading', label: 'Threading' },
  { value: 'boring', label: 'Boring' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'tribal', label: 'Tribal Knowledge' },
  { value: 'handbook', label: 'Handbooks' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Documents' },
  { value: 'social', label: 'Social Media' },
];

function TagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function TipCard({ entry }: { entry: KnowledgeEntry }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceTone = entry.confidence >= 0.8 ? 'emerald' : entry.confidence >= 0.5 ? 'amber' : 'rose';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 transition hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm text-slate-200 ${expanded ? '' : 'line-clamp-2'}`}>{entry.content}</p>
        <StatusPill label={`${(entry.confidence * 100).toFixed(0)}%`} tone={confidenceTone} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.tags.materials.map(m => <TagBadge key={m} label={m} color="border-sky-400/30 bg-sky-400/10 text-sky-200" />)}
        {entry.tags.operations.map(o => <TagBadge key={o} label={o} color="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" />)}
        {entry.tags.machines.map(m => <TagBadge key={m} label={m} color="border-violet-400/30 bg-violet-400/10 text-violet-200" />)}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Source: {entry.source}</span>
        <span>Type: {entry.content_type}</span>
        {entry.related_count > 0 && <span>{entry.related_count} related</span>}
        <span>{new Date(entry.created_at).toLocaleDateString()}</span>
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-cyan-400 hover:text-cyan-300">
          {expanded ? 'Less' : 'More'}
        </button>
      </div>
    </div>
  );
}

function FacetBar({ facets, label, onSelect }: { facets: Record<string, number>; label: string; onSelect: (value: string) => void }) {
  const sorted = useMemo(() =>
    Object.entries(facets).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [facets]
  );
  if (sorted.length === 0) return null;
  const max = sorted[0][1];

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {sorted.map(([name, count]) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-white/[0.04]"
        >
          <div className="h-1.5 rounded-full bg-cyan-400/40" style={{ width: `${(count / max) * 100}%`, minWidth: 4 }} />
          <span className="flex-1 truncate text-xs text-slate-300">{name}</span>
          <span className="text-xs text-slate-500">{count}</span>
        </button>
      ))}
    </div>
  );
}

function StatsPanel({ stats }: { stats: KnowledgeStats }) {
  const topMaterials = useMemo(() =>
    Object.entries(stats.by_material).sort((a, b) => b[1] - a[1]).slice(0, 10),
    [stats.by_material]
  );
  const topOps = useMemo(() =>
    Object.entries(stats.by_operation).sort((a, b) => b[1] - a[1]).slice(0, 10),
    [stats.by_operation]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Total Items" value={stats.total_items.toLocaleString()} hint="in knowledge graph" accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
        <SummaryTile label="Sources" value={String(Object.keys(stats.by_source).length)} hint="distinct sources" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
        <SummaryTile label="Coverage Gaps" value={String(stats.coverage_gaps.length)} hint="areas needing data" accent="from-amber-400/22 via-amber-300/10 to-transparent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="By Material" subtitle="Knowledge distribution across ISO groups">
          <div className="space-y-2">
            {topMaterials.map(([name, count]) => {
              const pct = stats.total_items > 0 ? (count / stats.total_items * 100).toFixed(1) : '0';
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm text-slate-300">{name}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sky-400/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </PanelCard>

        <PanelCard title="By Operation" subtitle="Knowledge distribution across operation types">
          <div className="space-y-2">
            {topOps.map(([name, count]) => {
              const pct = stats.total_items > 0 ? (count / stats.total_items * 100).toFixed(1) : '0';
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm text-slate-300">{name}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-emerald-400/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>

      {stats.coverage_gaps.length > 0 && (
        <PanelCard title="Coverage Gaps" subtitle="Areas where more knowledge is needed">
          <div className="flex flex-wrap gap-2">
            {stats.coverage_gaps.map(gap => (
              <StatusPill key={gap} label={gap} tone="amber" />
            ))}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

export function KnowledgeBrowserPage() {
  const [tab, setTab] = useState<ViewTab>('search');
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('');
  const [operation, setOperation] = useState('');
  const [source, setSource] = useState('');
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [results, setResults] = useState<KnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchKnowledge({
        query: query.trim() || '*',
        material: material || undefined,
        operation: operation || undefined,
        source: source || undefined,
        confidence_min: confidenceMin > 0 ? confidenceMin : undefined,
        limit: 50,
      });
      setResults(data.results);
      setTotal(data.total);
      setFacets(data.facets);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, material, operation, source, confidenceMin]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getKnowledgeStats();
      setStats(data);
    } catch {
      // silently handle
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'stats' && !stats) loadStats();
  }, [tab, stats, loadStats]);

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Knowledge Pipeline"
        title="Browse Knowledge"
        description="Search, filter, and explore the manufacturing knowledge graph. Find tips by material, operation, machine, or source."
        metrics={
          <>
            <SummaryTile label="Results" value={total.toLocaleString()} hint="matching entries" accent="from-cyan-400/22 via-cyan-300/10 to-transparent" />
            <SummaryTile label="Facets" value={String(Object.keys(facets).length)} hint="filter dimensions" accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
            <SummaryTile label="View" value={tab === 'search' ? 'Search' : 'Statistics'} hint="active" accent="from-violet-400/22 via-violet-300/10 to-transparent" />
          </>
        }
      />

      <div className="flex gap-2">
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>Search</TabButton>
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>Statistics</TabButton>
      </div>

      {tab === 'search' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <PanelCard title="Search" subtitle="Full-text search with faceted filters">
              <div className="space-y-4">
                <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={query}
                      onChange={e => setQuery((e.target as HTMLInputElement).value)}
                      placeholder="Search tips, techniques, materials..."
                    />
                  </div>
                  <ActionButton onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </ActionButton>
                </form>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Material">
                    <Select value={material} onChange={e => setMaterial((e.target as HTMLSelectElement).value)}>
                      {MATERIAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Operation">
                    <Select value={operation} onChange={e => setOperation((e.target as HTMLSelectElement).value)}>
                      {OPERATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Source">
                    <Select value={source} onChange={e => setSource((e.target as HTMLSelectElement).value)}>
                      {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label={`Min Confidence: ${confidenceMin}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={confidenceMin}
                    onChange={e => setConfidenceMin(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </Field>
              </div>
            </PanelCard>

            <div className="space-y-3">
              {results.length === 0 && !loading && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
                  {query ? 'No results found. Try broadening your search.' : 'Enter a search query or use filters to browse knowledge.'}
                </div>
              )}
              {results.map(entry => <TipCard key={entry.id} entry={entry} />)}
            </div>
          </div>

          <div className="space-y-4">
            {facets.materials && (
              <PanelCard title="Materials" subtitle="Filter by material">
                <FacetBar facets={facets.materials} label="Materials" onSelect={v => { setMaterial(v); handleSearch(); }} />
              </PanelCard>
            )}
            {facets.operations && (
              <PanelCard title="Operations" subtitle="Filter by operation">
                <FacetBar facets={facets.operations} label="Operations" onSelect={v => { setOperation(v); handleSearch(); }} />
              </PanelCard>
            )}
            {facets.sources && (
              <PanelCard title="Sources" subtitle="Filter by source">
                <FacetBar facets={facets.sources} label="Sources" onSelect={v => { setSource(v); handleSearch(); }} />
              </PanelCard>
            )}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        statsLoading
          ? <div className="py-12 text-center text-sm text-slate-500">Loading statistics...</div>
          : stats
            ? <StatsPanel stats={stats} />
            : <div className="py-12 text-center text-sm text-slate-500">No statistics available.</div>
      )}
    </div>
  );
}
