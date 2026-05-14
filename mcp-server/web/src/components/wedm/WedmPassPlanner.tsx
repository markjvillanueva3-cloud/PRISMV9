/**
 * WedmPassPlanner — P2P-FULLSTACK-MS0/U-P2PFS46
 *
 * Visual lane diagram of the rough + skim pass sequence for a WEDM job.
 * Each pass renders as a horizontal lane whose width is proportional to
 * pass.time_min, color-coded by pass type:
 *
 *   rough → orange (high energy, heavy material removal)
 *   semi  → yellow (balanced)
 *   skim  → emerald (finish passes)
 *   trim  → sky    (final cleanup)
 *   other → slate  (fallback)
 *
 * Inside each lane: type label + offset, predicted Ra, recast depth, and
 * time. Above the lanes: total-time + pass-count summary. Below: optional
 * surface-finish spec gauge comparing predicted Ra (worst case across
 * passes) against a supplied target.
 *
 * Consumes `WireEdmPassDetail[]` — the same shape produced by the main
 * calculator solve path.
 */

import type { WireEdmPassDetail } from '../../api/wireEdm';

// ============================================================================
// METADATA
// ============================================================================

type PassTone = 'rough' | 'semi' | 'skim' | 'trim' | 'other';

interface PassStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const PASS_STYLES: Record<PassTone, PassStyle> = {
  rough: {
    bg: 'bg-orange-600/40',
    border: 'border-orange-500/50',
    text: 'text-orange-200',
    label: 'Rough',
  },
  semi: {
    bg: 'bg-yellow-600/40',
    border: 'border-yellow-500/50',
    text: 'text-yellow-200',
    label: 'Semi',
  },
  skim: {
    bg: 'bg-emerald-600/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-200',
    label: 'Skim',
  },
  trim: {
    bg: 'bg-sky-600/40',
    border: 'border-sky-500/50',
    text: 'text-sky-200',
    label: 'Trim',
  },
  other: {
    bg: 'bg-slate-700/40',
    border: 'border-slate-600/50',
    text: 'text-slate-200',
    label: 'Pass',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmPassPlannerProps {
  passes: WireEdmPassDetail[] | null | undefined;
  /** Optional target Ra (µm) — renders spec gauge when supplied. */
  target_ra_um?: number;
  /** Optional target recast (µm) — renders spec gauge when supplied. */
  target_recast_um?: number;
  /** Compact mode — hides per-pass inner details, shows only lane widths. */
  compact?: boolean;
}

export function WedmPassPlanner({
  passes,
  target_ra_um,
  target_recast_um,
  compact = false,
}: WedmPassPlannerProps) {
  if (!Array.isArray(passes) || passes.length === 0) {
    return (
      <div
        className="rounded-2xl border border-slate-700/40 bg-slate-900/30 px-4 py-3 text-[11px] text-slate-500"
        role="region"
        aria-label="WEDM pass planner — no passes defined"
        data-testid="wedm-pass-planner-empty"
      >
        No passes defined yet.
      </div>
    );
  }

  // Normalize & aggregate metrics.
  const totalTime = passes.reduce(
    (sum, p) => sum + (Number.isFinite(p.time_min) ? p.time_min : 0),
    0,
  );
  const worstRa = passes.reduce(
    (worst, p) =>
      Number.isFinite(p.predicted_Ra_um) && p.predicted_Ra_um > worst
        ? p.predicted_Ra_um
        : worst,
    0,
  );
  const worstRecast = passes.reduce(
    (worst, p) =>
      Number.isFinite(p.predicted_recast_um) && p.predicted_recast_um > worst
        ? p.predicted_recast_um
        : worst,
    0,
  );

  // Final pass Ra drives spec comparison (skim is usually last & finest).
  const finalPass = passes[passes.length - 1];
  const finalRa = Number.isFinite(finalPass.predicted_Ra_um)
    ? finalPass.predicted_Ra_um
    : worstRa;

  const raMeetsSpec =
    target_ra_um == null || !Number.isFinite(target_ra_um) ? null : finalRa <= target_ra_um;
  const recastMeetsSpec =
    target_recast_um == null || !Number.isFinite(target_recast_um)
      ? null
      : worstRecast <= target_recast_um;

  const overallPass =
    (raMeetsSpec ?? true) && (recastMeetsSpec ?? true);
  const specGateActive = raMeetsSpec !== null || recastMeetsSpec !== null;
  const needsAttention = specGateActive && !overallPass;

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${
        specGateActive
          ? overallPass
            ? 'border-emerald-500/40 bg-emerald-950/20'
            : 'border-rose-500/50 bg-rose-950/30'
          : 'border-slate-700/40 bg-[#0c1522]'
      } px-4 py-3`}
      role="region"
      aria-label={`WEDM pass planner: ${passes.length} passes, total ${totalTime.toFixed(1)} min, final Ra ${finalRa.toFixed(2)} µm`}
      data-testid="wedm-pass-planner"
      data-pass-count={passes.length}
      data-overall-pass={specGateActive ? (overallPass ? 'pass' : 'fail') : 'na'}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Pass plan
          <span className="ml-2 text-[10px] normal-case text-slate-500">
            &middot; {passes.length} passes
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
          <span data-testid="pass-total-time">{totalTime.toFixed(1)} min</span>
          <span className="text-slate-600">|</span>
          <span data-testid="pass-final-ra">Ra {finalRa.toFixed(2)} µm</span>
        </div>
      </div>

      {/* Lane diagram */}
      <div
        className="flex overflow-hidden rounded-lg border border-slate-700/40 bg-slate-950/50"
        style={{ minHeight: compact ? 24 : 52 }}
        data-testid="pass-lane-row"
      >
        {passes.map((p, i) => {
          const tone = passTone(p.type);
          const style = PASS_STYLES[tone];
          const flex = Math.max(0.01, Number.isFinite(p.time_min) ? p.time_min : 0);
          return (
            <div
              key={`${p.type}-${i}`}
              className={`${style.bg} ${style.border} border-r last:border-r-0 px-2 py-1 text-[10px] ${style.text}`}
              style={{ flex, minWidth: compact ? 28 : 70 }}
              title={`${style.label} #${i + 1}: Ra ${formatNum(p.predicted_Ra_um, 2)} µm, ${formatNum(p.time_min, 1)} min`}
              data-testid="pass-lane"
              data-pass-type={tone}
              data-pass-index={i}
            >
              <div className="flex items-center justify-between font-bold uppercase tracking-wider">
                <span>{style.label}</span>
                <span className="font-mono text-[9px] opacity-80">#{i + 1}</span>
              </div>
              {!compact && (
                <>
                  <div className="mt-0.5 text-[9px] opacity-80">
                    ofs {formatNum(p.offset_mm, 3)} mm
                  </div>
                  <div className="text-[9px] opacity-80">
                    Ra {formatNum(p.predicted_Ra_um, 2)} µm
                  </div>
                  <div className="text-[9px] opacity-80">
                    rc {formatNum(p.predicted_recast_um, 1)} µm
                  </div>
                  <div className="text-[9px] font-mono opacity-90">
                    {formatNum(p.time_min, 1)} min
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Spec gauges */}
      {specGateActive && (
        <div
          className="mt-2 grid gap-2 md:grid-cols-2 text-[11px]"
          data-testid="pass-spec-grid"
        >
          {raMeetsSpec !== null && (
            <SpecChip
              label="Ra"
              predicted={finalRa}
              target={target_ra_um!}
              unit="µm"
              pass={raMeetsSpec}
              testId="pass-ra-spec"
            />
          )}
          {recastMeetsSpec !== null && (
            <SpecChip
              label="Recast"
              predicted={worstRecast}
              target={target_recast_um!}
              unit="µm"
              pass={recastMeetsSpec}
              testId="pass-recast-spec"
            />
          )}
        </div>
      )}

      {/* Aggregate metrics */}
      <div className="mt-2 grid gap-2 md:grid-cols-3 text-[10px] uppercase tracking-widest text-slate-500">
        <div>
          Total passes: <span className="font-mono text-slate-300">{passes.length}</span>
        </div>
        <div>
          Worst Ra: <span className="font-mono text-slate-300">{worstRa.toFixed(2)} µm</span>
        </div>
        <div>
          Worst recast: <span className="font-mono text-slate-300">{worstRecast.toFixed(1)} µm</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SpecChip({
  label,
  predicted,
  target,
  unit,
  pass,
  testId,
}: {
  label: string;
  predicted: number;
  target: number;
  unit: string;
  pass: boolean;
  testId: string;
}) {
  const tone = pass
    ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300'
    : 'border-rose-500/50 bg-rose-950/30 text-rose-300';
  return (
    <div
      className={`flex items-center justify-between rounded-lg border ${tone} px-3 py-1.5 font-mono`}
      data-testid={testId}
      data-spec-pass={pass ? 'true' : 'false'}
    >
      <span className="text-[10px] uppercase tracking-widest">
        {label} <span className="opacity-60">vs spec</span>
      </span>
      <span>
        {predicted.toFixed(2)} / {target.toFixed(2)} {unit}{' '}
        <span className={`ml-1 text-[9px] font-bold uppercase ${pass ? 'text-emerald-300' : 'text-rose-300'}`}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
      </span>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function passTone(type: string | undefined): PassTone {
  const t = (type ?? '').toLowerCase();
  if (t.includes('rough')) return 'rough';
  if (t.includes('semi')) return 'semi';
  if (t.includes('skim')) return 'skim';
  if (t.includes('trim')) return 'trim';
  return 'other';
}

function formatNum(v: number | null | undefined, decimals: number): string {
  if (v == null || !Number.isFinite(v)) return '\u2014';
  return v.toFixed(decimals);
}
