import { useCallback, useEffect, useState } from 'react';
import { ppgHolderCatalog } from '../../api/client';
import {
  Field,
  Input,
  StatusPill,
} from '../workspace/WorkspacePrimitives';

export interface HolderSelection {
  id: string;
  name: string;
  brand: string;
  type: string;
  interface_type: string;
  tir_um: number;
  stiffness: string;
  max_rpm: number;
  balanced_grade?: string;
}

export interface HolderSelectorPanelProps {
  selected: HolderSelection | null;
  onSelect: (holder: HolderSelection) => void;
}

const HOLDER_BRANDS = [
  { id: '', label: 'All brands' },
  { id: 'haimer', label: 'HAIMER' },
  { id: 'schunk', label: 'SCHUNK' },
  { id: 'big_kaiser', label: 'BIG KAISER' },
  { id: 'kennametal', label: 'Kennametal' },
  { id: 'sandvik', label: 'Sandvik Coromant' },
  { id: 'rego_fix', label: 'REGO-FIX' },
  { id: 'seco', label: 'Seco' },
  { id: 'iscar', label: 'ISCAR' },
];

function tirTone(tir: number): 'emerald' | 'amber' | 'rose' {
  if (tir <= 3) return 'emerald';
  if (tir <= 8) return 'amber';
  return 'rose';
}

function stiffnessLabel(s: string): string {
  const map: Record<string, string> = {
    very_high: 'Very high',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return map[s] || s;
}

function unwrapHolderResults(response: unknown): HolderSelection[] {
  if (!response || typeof response !== 'object') return [];
  const r = response as Record<string, unknown>;
  const data = r.result ?? r.data ?? r;
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const items = d.holders ?? d.results ?? d.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? item.holder_id ?? ''),
      name: String(item.name ?? item.description ?? item.label ?? ''),
      brand: String(item.brand ?? item.manufacturer ?? ''),
      type: String(item.type ?? item.holder_type ?? ''),
      interface_type: String(item.interface_type ?? item.taper ?? item.interface ?? 'CAT40'),
      tir_um: Number(item.tir_um ?? item.tir ?? item.runout_um ?? 5),
      stiffness: String(item.stiffness ?? item.rigidity ?? 'medium'),
      max_rpm: Number(item.max_rpm ?? item.rpm_max ?? 20000),
      balanced_grade: item.balanced_grade != null ? String(item.balanced_grade) : undefined,
    }))
    .filter((h) => h.id || h.name);
}

export function HolderSelectorPanel({ selected, onSelect }: HolderSelectorPanelProps) {
  const [brandFilter, setBrandFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<HolderSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadHolders = useCallback(async (brand?: string) => {
    setLoading(true);
    try {
      const res = await ppgHolderCatalog({ brand: brand || undefined });
      setResults(unwrapHolderResults(res));
      setLoaded(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolders(brandFilter);
  }, [brandFilter, loadHolders]);

  const filtered = searchQuery.length >= 2
    ? results.filter((h) => {
        const q = searchQuery.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          h.brand.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q)
        );
      })
    : results;

  return (
    <div className="space-y-4">
      {/* Brand filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {HOLDER_BRANDS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBrandFilter(b.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              brandFilter === b.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                : 'text-slate-400 border border-white/6 bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Search within results */}
      <Field label="Filter holders">
        <Input
          aria-label="Holder search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g. shrink fit, hydraulic, ER32..."
        />
      </Field>

      {/* Selected holder card */}
      {selected && (
        <div className="rounded-[16px] border border-violet-400/15 bg-violet-400/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-violet-300">{selected.name}</span>
            <StatusPill label={selected.brand} tone="violet" />
            <StatusPill label={`TIR ${selected.tir_um}\u00B5m`} tone={tirTone(selected.tir_um)} />
          </div>
          <div className="mt-1 text-xs text-violet-400/70">
            {selected.interface_type} | {stiffnessLabel(selected.stiffness)} stiffness | {selected.max_rpm.toLocaleString()} RPM max
            {selected.balanced_grade ? ` | G${selected.balanced_grade}` : ''}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="text-sm text-slate-400">Loading holders...</div>}

      {/* Results list */}
      {filtered.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2">
          {filtered.map((holder, idx) => (
            <button
              key={holder.id || `holder-${idx}`}
              className={`w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${
                selected?.id === holder.id
                  ? 'border-violet-400/30 bg-violet-500/10 text-violet-200'
                  : 'border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]'
              }`}
              onClick={() => onSelect(holder)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{holder.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {holder.brand}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>TIR {holder.tir_um}{'\u00B5'}m</span>
                <span>{stiffnessLabel(holder.stiffness)}</span>
                <span>{holder.interface_type}</span>
                <span>{holder.max_rpm.toLocaleString()} RPM</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {loaded && !loading && filtered.length === 0 && (
        <div className="text-sm text-slate-500">
          No holders found{searchQuery ? ` for "${searchQuery}"` : ''}{brandFilter ? ` from ${HOLDER_BRANDS.find(b => b.id === brandFilter)?.label}` : ''}.
        </div>
      )}
    </div>
  );
}
