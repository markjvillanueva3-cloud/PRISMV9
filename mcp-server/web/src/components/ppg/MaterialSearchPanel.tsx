import { useCallback, useState } from 'react';
import { ppgMaterialSearch } from '../../api/client';
import {
  Field,
  Input,
  StatusPill,
} from '../workspace/WorkspacePrimitives';

export interface MaterialSelection {
  id: string;
  name: string;
  iso_group: string;
  kc1_1: number;
  mc: number;
  hardness_HB?: number;
  rec_vc?: number;
}

export interface MaterialSearchPanelProps {
  selected: MaterialSelection | null;
  onSelect: (mat: MaterialSelection) => void;
}

const ISO_GROUPS = [
  { id: '', label: 'All', tone: 'slate' as const },
  { id: 'P', label: 'P — Steel', tone: 'sky' as const },
  { id: 'M', label: 'M — Stainless', tone: 'amber' as const },
  { id: 'K', label: 'K — Cast iron', tone: 'slate' as const },
  { id: 'N', label: 'N — Non-ferrous', tone: 'emerald' as const },
  { id: 'S', label: 'S — Superalloy', tone: 'rose' as const },
  { id: 'H', label: 'H — Hardened', tone: 'violet' as const },
];

function unwrapResults(response: unknown): MaterialSelection[] {
  if (!response || typeof response !== 'object') return [];
  const r = response as Record<string, unknown>;
  const data = r.result ?? r.data ?? r;
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const items = d.results ?? d.materials ?? d.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? item.label ?? ''),
      iso_group: String(item.iso_group ?? item.group ?? ''),
      kc1_1: Number(item.kc1_1 ?? item.kc ?? 0),
      mc: Number(item.mc ?? 0),
      hardness_HB: item.hardness_HB != null ? Number(item.hardness_HB) : item.hardness != null ? Number(item.hardness) : undefined,
      rec_vc: item.rec_vc != null ? Number(item.rec_vc) : undefined,
    }))
    .filter((m) => m.id && m.name);
}

export function MaterialSearchPanel({ selected, onSelect }: MaterialSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [results, setResults] = useState<MaterialSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(
    async (q: string) => {
      const fullQuery = groupFilter ? `${groupFilter} ${q}`.trim() : q;
      if (fullQuery.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const res = await ppgMaterialSearch(fullQuery);
        setResults(unwrapResults(res));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [groupFilter],
  );

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);
      // Debounce: clear any pending, fire after 300ms
      const id = setTimeout(() => doSearch(value), 300);
      return () => clearTimeout(id);
    },
    [doSearch],
  );

  return (
    <div className="space-y-4">
      {/* ISO group filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {ISO_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGroupFilter(g.id);
              if (query.length >= 2) doSearch(query);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              groupFilter === g.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'text-slate-400 border border-white/6 bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <Field label="Search materials">
        <Input
          aria-label="Material search"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="e.g. 4140, 6061, 304 stainless, titanium..."
        />
      </Field>

      {/* Selected material card */}
      {selected && (
        <div className="rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-emerald-300">{selected.name}</span>
            <StatusPill label={`ISO ${selected.iso_group}`} tone="emerald" />
            {selected.hardness_HB ? (
              <StatusPill label={`${selected.hardness_HB} HB`} tone="slate" />
            ) : null}
          </div>
          <div className="mt-1 text-xs text-emerald-400/70">
            kc1.1 = {selected.kc1_1} N/mm{'\u00B2'} | mc = {selected.mc}
            {selected.rec_vc ? ` | Vc = ${selected.rec_vc} m/min` : ''}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-sm text-slate-400">Searching...</div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2">
          {results.map((mat) => (
            <button
              key={mat.id}
              className={`w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${
                selected?.id === mat.id
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]'
              }`}
              onClick={() => onSelect(mat)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{mat.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  ISO {mat.iso_group}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                kc1.1={mat.kc1_1} | mc={mat.mc}
                {mat.hardness_HB ? ` | ${mat.hardness_HB} HB` : ''}
                {mat.rec_vc ? ` | Vc=${mat.rec_vc} m/min` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && results.length === 0 && query.length >= 2 && (
        <div className="text-sm text-slate-500">
          No materials found for "{query}"{groupFilter ? ` in ISO ${groupFilter}` : ''}.
        </div>
      )}
    </div>
  );
}
