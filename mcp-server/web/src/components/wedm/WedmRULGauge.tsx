/**
 * WedmRULGauge — P2P-FULLSTACK-MS0/U-P2PFS45
 *
 * Remaining-Useful-Life gauge for the 5 WEDM components tracked by
 * WEDMRULEngine (U-P4-07):
 *
 *   1. guide_wear
 *   2. wire_erosion
 *   3. filter_capacity
 *   4. filter_clogging
 *   5. wire_fatigue
 *
 * For each component renders:
 *   - Label + current RUL in hours
 *   - Linear capacity bar with 4-tier tone (imminent / soon / planned / healthy)
 *   - Fill = health fraction ((capacity − state) / capacity, clamped to [0,1])
 *   - Band badge
 *
 * The overall card color is the worst band across the 5 components, so it
 * doubles as an at-a-glance "is anything urgent?" signal.
 *
 * Pure presentational — consumes a snapshot matching the RULReport shape.
 */

// ============================================================================
// TYPES (mirror WEDMRULEngine's shape)
// ============================================================================

export type WedmRULBand = 'imminent' | 'soon' | 'planned' | 'healthy';

export type WedmRULComponentId =
  | 'guide_wear'
  | 'wire_erosion'
  | 'filter_capacity'
  | 'filter_clogging'
  | 'wire_fatigue';

export interface WedmRULComponent {
  component: WedmRULComponentId;
  state: number;
  capacity: number;
  rate_per_hr: number;
  rul_hours: number;
  band: WedmRULBand;
  health?: number;
  reason?: string;
}

export interface WedmRULSnapshot {
  components: Partial<Record<WedmRULComponentId, WedmRULComponent>>;
  worstComponent: WedmRULComponentId;
  worstRUL_hours: number;
  worstBand: WedmRULBand;
  /** Optional: latest sample time ISO. */
  sampledAt?: string | null;
}

// ============================================================================
// METADATA
// ============================================================================

const COMPONENT_ORDER: WedmRULComponentId[] = [
  'guide_wear',
  'wire_erosion',
  'filter_capacity',
  'filter_clogging',
  'wire_fatigue',
];

const COMPONENT_LABELS: Record<WedmRULComponentId, string> = {
  guide_wear: 'Guide wear',
  wire_erosion: 'Wire erosion',
  filter_capacity: 'Filter capacity',
  filter_clogging: 'Filter clogging',
  wire_fatigue: 'Wire fatigue',
};

interface BandTone {
  border: string;
  bg: string;
  text: string;
  badge: string;
  barFill: string;
}

const BAND_TONES: Record<WedmRULBand, BandTone> = {
  healthy: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500',
    barFill: 'bg-emerald-500',
  },
  planned: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500',
    barFill: 'bg-cyan-500',
  },
  soon: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/25',
    text: 'text-amber-300',
    badge: 'bg-amber-500',
    barFill: 'bg-amber-500',
  },
  imminent: {
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    badge: 'bg-rose-600',
    barFill: 'bg-rose-600',
  },
};

const BAND_RANK: Record<WedmRULBand, number> = {
  healthy: 0,
  planned: 1,
  soon: 2,
  imminent: 3,
};

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmRULGaugeProps {
  snapshot: WedmRULSnapshot | null | undefined;
  /** Optional click handler — e.g. to open the full RUL detail panel. */
  onOpenDetails?: () => void;
}

export function WedmRULGauge({ snapshot, onOpenDetails }: WedmRULGaugeProps) {
  if (!snapshot) return null;

  const components = snapshot.components ?? {};
  // Rank-aware overall band (prefer snapshot.worstBand if sensible, else compute).
  const computedWorst = worstBand(
    COMPONENT_ORDER.map((id) => components[id]?.band).filter(Boolean) as WedmRULBand[],
  );
  const overall = snapshot.worstBand ?? computedWorst;
  const tone = BAND_TONES[overall] ?? BAND_TONES.healthy;

  const bandCounts: Record<WedmRULBand, number> = {
    healthy: 0,
    planned: 0,
    soon: 0,
    imminent: 0,
  };
  for (const id of COMPONENT_ORDER) {
    const c = components[id];
    if (c?.band) bandCounts[c.band] = (bandCounts[c.band] ?? 0) + 1;
  }

  const needsAttention = overall === 'soon' || overall === 'imminent';

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3`}
      role="region"
      aria-label={`WEDM RUL: worst band ${overall}, worst ${formatHours(snapshot.worstRUL_hours)}, imminent ${bandCounts.imminent}, soon ${bandCounts.soon}`}
      data-testid="wedm-rul-gauge"
      data-worst-band={overall}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Remaining useful life
        </div>
        <div
          className={`min-h-[24px] flex items-center rounded-full ${tone.badge} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white`}
          data-testid="rul-worst-band-pill"
        >
          {overall.toUpperCase()} &middot; {formatHours(snapshot.worstRUL_hours)}
        </div>
      </div>

      {/* Band counter chips */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        {(['imminent', 'soon', 'planned', 'healthy'] as WedmRULBand[]).map((band) =>
          bandCounts[band] > 0 ? (
            <span
              key={band}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${BAND_TONES[band].badge} text-white`}
              data-testid={`rul-count-${band}`}
            >
              {bandCounts[band]} {band}
            </span>
          ) : null,
        )}
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="ml-auto text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
            data-testid="rul-open-details"
          >
            Details &rarr;
          </button>
        )}
      </div>

      {/* 5 component rows */}
      <div className="space-y-1.5" data-testid="rul-component-list">
        {COMPONENT_ORDER.map((id) => {
          const c = components[id];
          if (!c) {
            return (
              <div
                key={id}
                className="rounded-lg border border-slate-800/60 bg-slate-900/20 px-2.5 py-1.5 text-[11px] text-slate-500"
                data-testid="rul-component-row"
                data-component-id={id}
                data-missing="true"
              >
                {COMPONENT_LABELS[id]} — not sampled
              </div>
            );
          }
          const t = BAND_TONES[c.band] ?? BAND_TONES.healthy;
          const fillPct = healthPct(c);
          return (
            <div
              key={id}
              className="rounded-lg border border-slate-700/40 bg-slate-900/20 px-2.5 py-1.5"
              data-testid="rul-component-row"
              data-component-id={id}
              data-band={c.band}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-[11px] text-slate-300">
                  {COMPONENT_LABELS[id]}
                </div>
                <div className="text-right font-mono text-[11px] text-slate-200">
                  {formatHours(c.rul_hours)}
                </div>
                <div
                  className={`min-w-[64px] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white ${t.badge}`}
                >
                  {c.band}
                </div>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/70"
                role="img"
                aria-label={`${COMPONENT_LABELS[id]} remaining ${formatHours(c.rul_hours)} (${fillPct}% health)`}
              >
                <div
                  className={`h-full ${t.barFill} transition-all`}
                  style={{ width: `${fillPct}%` }}
                  data-testid="rul-bar-fill"
                  data-fill-pct={fillPct}
                />
              </div>
            </div>
          );
        })}
      </div>

      {snapshot.sampledAt && (
        <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
          Sampled {snapshot.sampledAt}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function worstBand(bands: WedmRULBand[]): WedmRULBand {
  let worst: WedmRULBand = 'healthy';
  for (const b of bands) {
    if ((BAND_RANK[b] ?? 0) > BAND_RANK[worst]) worst = b;
  }
  return worst;
}

function healthPct(c: WedmRULComponent): number {
  const cap = c.capacity;
  const state = c.state;
  if (!Number.isFinite(cap) || !Number.isFinite(state) || cap <= 0) return 0;
  // Fraction of capacity still available (not consumed).
  const remaining = Math.max(0, cap - state);
  const pct = Math.min(100, Math.max(0, (remaining / cap) * 100));
  // 1 decimal for small values so tiny deltas still visible in tests/bars.
  return Math.round(pct * 10) / 10;
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '\u2014';
  if (!Number.isFinite(h)) return '∞ hr';
  if (h <= 0) return '0 hr';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 100) return `${h.toFixed(1)} hr`;
  return `${h.toFixed(0)} hr`;
}
