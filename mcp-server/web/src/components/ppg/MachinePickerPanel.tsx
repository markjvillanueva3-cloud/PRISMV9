import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ppgMachineFingerprint,
  ppgMachineManufacturers,
} from '../../api/client';
import {
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
} from '../workspace/WorkspacePrimitives';

// ─── Types ──────────────────────────────────────────────────────────

export interface MatchedProfile {
  brand: string;
  model: string;
  type: string;
  controller: string;
  max_rpm: number;
  taper: string;
  tool_capacity: number;
  axis_count: number;
}

export interface RecommendedFeatures {
  probing: boolean;
  tsc: boolean;
  hsm: boolean;
  tcp: boolean;
  ssv: boolean;
  subprograms: boolean;
  chip_conveyor: boolean;
}

export interface FingerprintResult {
  controller_family: string;
  resolution_method: string;
  confidence: number;
  matched_profile?: MatchedProfile;
  axis_config: string;
  machine_type: string;
  recommended_features: RecommendedFeatures;
  warnings: string[];
}

export interface MachinePickerPanelProps {
  onFingerprintChange: (result: FingerprintResult | null) => void;
  onManufacturerChange?: (manufacturer: string) => void;
  onModelChange?: (model: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function unwrapData(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  const inner = r.result ?? r.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner))
    return inner as Record<string, unknown>;
  return r;
}

function extractManufacturers(payload: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const list = payload.manufacturers ?? payload.items ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

function resolutionLabel(method: string): string {
  const map: Record<string, string> = {
    exact_catalog: 'Exact catalog match',
    fuzzy_catalog: 'Fuzzy catalog match',
    year_based: 'Year-based resolution',
    manufacturer_default: 'Manufacturer default',
    controller_override: 'Manual override',
    fallback: 'Generic fallback',
  };
  return map[method] ?? method;
}

function confidenceTone(confidence: number) {
  if (confidence >= 0.85) return 'emerald' as const;
  if (confidence >= 0.6) return 'amber' as const;
  return 'rose' as const;
}

// ─── Component ──────────────────────────────────────────────────────

export function MachinePickerPanel({
  onFingerprintChange,
  onManufacturerChange,
  onModelChange,
}: MachinePickerPanelProps) {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load manufacturers on mount
  useEffect(() => {
    let active = true;
    async function load() {
      setCatalogLoading(true);
      try {
        const res = await ppgMachineManufacturers();
        if (!active) return;
        const list = extractManufacturers(unwrapData(res));
        setManufacturers(list);
        if (list.length > 0 && !manufacturer) setManufacturer(list[0]);
      } catch {
        if (!active) return;
        setManufacturers([
          'Haas', 'DMG MORI', 'Mazak', 'Okuma', 'Makino', 'Fanuc',
          'Siemens', 'Heidenhain', 'Brother', 'Doosan', 'Hurco',
          'Citizen', 'Star', 'Hermle', 'Matsuura',
        ]);
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  // Fingerprint when manufacturer + model are set
  const runFingerprint = useCallback(async () => {
    if (!manufacturer || !model) {
      setFingerprint(null);
      onFingerprintChange(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { manufacturer, model };
      if (year && !isNaN(Number(year))) params.year = Number(year);
      const res = await ppgMachineFingerprint(params);
      const data = unwrapData(res);
      if (data && data.controller_family) {
        const result = data as unknown as FingerprintResult;
        setFingerprint(result);
        onFingerprintChange(result);
      } else {
        setError('Fingerprint returned no result — check machine name.');
        setFingerprint(null);
        onFingerprintChange(null);
      }
    } catch (e: any) {
      setError(e.message ?? 'Fingerprint request failed');
      setFingerprint(null);
      onFingerprintChange(null);
    } finally {
      setLoading(false);
    }
  }, [manufacturer, model, year, onFingerprintChange]);

  // Filtered manufacturers for search
  const [search, setSearch] = useState('');
  const filteredManufacturers = useMemo(() => {
    if (!search) return manufacturers;
    const q = search.toLowerCase();
    return manufacturers.filter((m) => m.toLowerCase().includes(q));
  }, [manufacturers, search]);

  const profile = fingerprint?.matched_profile;

  return (
    <PanelCard
      title="Machine selection"
      subtitle="Pick your machine — Kienzle auto-resolves controller, axis config, and recommended features."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Manufacturer">
          <div className="space-y-1">
            <Input
              placeholder="Search manufacturers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search manufacturers"
            />
            <Select
              aria-label="Manufacturer"
              value={manufacturer}
              onChange={(e) => {
                setManufacturer(e.target.value);
                setModel('');
                setFingerprint(null);
                onFingerprintChange(null);
                onManufacturerChange?.(e.target.value);
              }}
              disabled={catalogLoading}
            >
              {catalogLoading && <option value="">Loading...</option>}
              {filteredManufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
        </Field>

        <Field label="Model">
          <Input
            aria-label="Machine model"
            placeholder="e.g. VF-2SS, Integrex i-200"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              onModelChange?.(e.target.value);
            }}
          />
        </Field>

        <Field label="Year (optional)">
          <div className="flex gap-2">
            <Input
              aria-label="Machine year"
              type="number"
              placeholder="e.g. 2022"
              min={1980}
              max={2030}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => void runFingerprint()}
              disabled={loading || !manufacturer || !model}
              className="inline-flex items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:opacity-40"
            >
              {loading ? 'Resolving...' : 'Resolve'}
            </button>
          </div>
        </Field>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-amber-300/14 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {fingerprint && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Controller"
              value={fingerprint.controller_family}
              hint={resolutionLabel(fingerprint.resolution_method)}
              accent="from-cyan-400/22 via-cyan-300/10 to-transparent"
            />
            <SummaryTile
              label="Confidence"
              value={`${Math.round(fingerprint.confidence * 100)}%`}
              hint={fingerprint.resolution_method}
              accent="from-emerald-400/20 via-emerald-300/10 to-transparent"
            />
            <SummaryTile
              label="Axis config"
              value={fingerprint.axis_config}
              hint={fingerprint.machine_type}
              accent="from-violet-400/22 via-violet-300/10 to-transparent"
            />
            <SummaryTile
              label="Machine type"
              value={fingerprint.machine_type}
              hint={profile ? `${profile.max_rpm} RPM · ${profile.taper} · ${profile.tool_capacity} tools` : 'No profile data'}
              accent="from-amber-400/22 via-amber-300/10 to-transparent"
            />
          </div>

          {profile && (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Matched machine profile
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                <div><span className="text-slate-400">Brand:</span> {profile.brand}</div>
                <div><span className="text-slate-400">Model:</span> {profile.model}</div>
                <div><span className="text-slate-400">Type:</span> {profile.type}</div>
                <div><span className="text-slate-400">Controller:</span> {profile.controller}</div>
                <div><span className="text-slate-400">Max RPM:</span> {profile.max_rpm.toLocaleString()}</div>
                <div><span className="text-slate-400">Taper:</span> {profile.taper}</div>
                <div><span className="text-slate-400">Tool capacity:</span> {profile.tool_capacity}</div>
                <div><span className="text-slate-400">Axes:</span> {profile.axis_count}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <StatusPill label={fingerprint.controller_family} tone="cyan" />
            <StatusPill label={fingerprint.axis_config} tone="violet" />
            <StatusPill
              label={`${Math.round(fingerprint.confidence * 100)}% confidence`}
              tone={confidenceTone(fingerprint.confidence)}
            />
            {fingerprint.recommended_features.probing && <StatusPill label="Probing" tone="emerald" />}
            {fingerprint.recommended_features.hsm && <StatusPill label="HSM" tone="emerald" />}
            {fingerprint.recommended_features.tcp && <StatusPill label="TCP/TCPM" tone="emerald" />}
            {fingerprint.recommended_features.tsc && <StatusPill label="TSC" tone="emerald" />}
          </div>

          {fingerprint.warnings.length > 0 && (
            <div className="rounded-[22px] border border-amber-300/12 bg-amber-300/[0.06] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/90">
                Warnings
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {fingerprint.warnings.map((w) => <li key={w}>• {w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}
