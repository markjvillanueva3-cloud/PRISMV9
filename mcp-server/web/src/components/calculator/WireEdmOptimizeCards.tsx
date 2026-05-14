/**
 * WireEdmOptimizeCards — Extracted sub-components from WireEdmResultCards.
 *
 * Each component renders a focused section of the wire EDM results display:
 * - WireBreakRiskCard: wire break probability, factors, mitigations
 * - WireEdmSurfaceIntegrityCard: recast, HAZ, residual stress, spec compliance
 * - WireEdmCostCard: machine/wire/consumables cost breakdown
 * - WireEdmPassTable: per-pass parameter table with export/upload actions
 * - WireEdmControllerNotes: controller-specific parameter recommendations
 *
 * All accept typed props from the WireEdmCalcResult interface.
 * Defensive coding: every .toFixed() is guarded, every array is defaulted.
 */
import type {
  WireEdmWireBreakRisk,
  WireEdmSurfaceIntegrity,
  WireEdmCostBreakdown,
  WireEdmPassDetail,
  WireEdmCornerCompensation,
  WireEdmTaperResult,
  WireEdmKerfWidthResult,
  WireEdmRecastDepthResult,
  WireEdmCostPerUnitLengthResult,
  WireEdmSlugTabRetentionResult,
  WireEdmWireBreakGaugeResult,
  WireEdmDielectricFlushAdjustResult,
  WireEdmWireSpoolConsumptionResult,
  WireEdmTaperErrorBudgetResult,
} from '../../api/wireEdm';

// ── Helpers ────────────────────────────────────────────────────────────

/** Safe toFixed: guards null/undefined/NaN with fallback */
function safeFixed(value: number | null | undefined, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return '\u2014';
  return value.toFixed(decimals);
}

/** Controller-specific label maps (mirrors CalculatorPage.tsx) */
const WEDM_CONTROLLER_LABELS: Record<string, Record<string, string>> = {
  sodick: {
    t_on: 'ON time', t_off: 'OFF time', peak_current: 'IP', servo_voltage: 'SV',
    wire_speed: 'WS', power_pct: 'Power', wire_tension: 'WT', flushing: 'FL', offset: 'Offset',
  },
  fanuc: {
    t_on: 'ON time', t_off: 'OFF time', peak_current: 'IP', servo_voltage: 'SV',
    wire_speed: 'WS', power_pct: 'Power %', wire_tension: 'WT', flushing: 'WJ', offset: 'D offset',
  },
  makino: {
    t_on: 'ON', t_off: 'OFF', peak_current: 'IP', servo_voltage: 'SV',
    wire_speed: 'WF', power_pct: 'Power', wire_tension: 'WT', flushing: 'FL', offset: 'H offset',
  },
  mitsubishi: {
    t_on: 'ON', t_off: 'OFF', peak_current: 'IP', servo_voltage: 'SV',
    wire_speed: 'WS', power_pct: 'HP', wire_tension: 'WT', flushing: 'FL', offset: 'D',
  },
  agiecharmilles: {
    t_on: 'A (pulse)', t_off: 'B (pause)', peak_current: 'I', servo_voltage: 'S',
    wire_speed: 'Wf', power_pct: 'P', wire_tension: 'WT', flushing: 'INJ', offset: 'Offset',
  },
};

export function wedmLabel(controller: string, param: string): string {
  return WEDM_CONTROLLER_LABELS[controller]?.[param] ?? WEDM_CONTROLLER_LABELS.fanuc[param] ?? param;
}

// ── WireBreakRiskCard ──────────────────────────────────────────────────

export interface WireBreakRiskCardProps {
  risk: WireEdmWireBreakRisk;
}

export function WireBreakRiskCard({ risk }: WireBreakRiskCardProps) {
  // Guard: probability could be undefined on partial results
  const probability = risk?.probability ?? 0;
  const pct = probability * 100;
  const severity = risk?.severity ?? 'low';
  const factors = risk?.factors ?? [];
  const mitigations = risk?.mitigations ?? [];
  const needsAttention = severity === 'high' || severity === 'medium';
  const tone =
    severity === 'high' ? { border: 'border-rose-500/40', bg: 'bg-rose-950/30', text: 'text-rose-300', badge: 'bg-rose-500', label: 'HIGH RISK' }
    : severity === 'medium' ? { border: 'border-amber-500/40', bg: 'bg-amber-950/30', text: 'text-amber-300', badge: 'bg-amber-500', label: 'CAUTION' }
    : { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-300', badge: 'bg-emerald-500', label: 'LOW RISK' };

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}
      role="region"
      aria-label={`Wire break risk: ${tone.label}, probability ${safeFixed(pct, 1)} percent`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Wire break risk</div>
        <div className={`min-h-[44px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}>
          {tone.label}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`text-3xl font-black ${tone.text}`}>{safeFixed(pct, 1)}%</div>
        <div className="flex-1">
          <div className="h-3 overflow-hidden rounded-full bg-slate-800/60" role="img" aria-label={`Risk bar at ${safeFixed(pct, 1)} percent`}>
            <div
              className={`h-full rounded-full ${tone.badge} transition-all`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
        {risk?.confidence_interval && (
          <div className="text-[11px] text-slate-500">
            CI: {safeFixed((risk.confidence_interval[0] ?? 0) * 100, 1)}&ndash;{safeFixed((risk.confidence_interval[1] ?? 0) * 100, 1)}%
          </div>
        )}
      </div>
      {factors.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Contributing factors</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {factors.map((f) => (
              <span key={f} className={`${needsAttention ? 'calculator-warning-attention-inline ' : ''}rounded-lg border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 text-[11px] text-slate-300`}>{f}</span>
            ))}
          </div>
        </div>
      )}
      {mitigations.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Mitigations</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {mitigations.map((m) => (
              <span key={m} className="rounded-lg border border-emerald-700/30 bg-emerald-950/20 px-2.5 py-1 text-[11px] text-emerald-300">{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WireEdmSurfaceIntegrityCard ────────────────────────────────────────

export interface WireEdmSurfaceIntegrityCardProps {
  integrity: WireEdmSurfaceIntegrity;
}

export function WireEdmSurfaceIntegrityCard({ integrity }: WireEdmSurfaceIntegrityCardProps) {
  const specCompliance = integrity?.spec_compliance ?? [];
  const hasSpecFailure = specCompliance.some((s) => !s.pass);
  const borderClass = hasSpecFailure
    ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
    : 'border-amber-500/30';
  const bgClass = hasSpecFailure ? 'bg-rose-950/30' : 'bg-[#0c1522]';

  return (
    <div
      className={`${hasSpecFailure ? 'calculator-warning-attention ' : ''}rounded-2xl border-2 ${borderClass} ${bgClass} px-5 py-4`}
      data-safety-card="surface-integrity"
      role="region"
      aria-label={`Surface integrity: recast ${safeFixed(integrity?.recast_um, 1)} microns, HAZ ${safeFixed(integrity?.haz_um, 1)} microns${hasSpecFailure ? ', spec compliance failure detected' : ''}`}
    >
      {hasSpecFailure && (
        <div className="calculator-warning-attention-inline mb-3 rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-center text-sm font-bold uppercase tracking-widest text-rose-300">
          SAFETY CRITICAL HOLD &mdash; Spec compliance failure detected
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Surface integrity</div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Always visible &mdash; cannot be dismissed</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Recast layer</div>
          <div className="mt-1 text-2xl font-black text-amber-300">{safeFixed(integrity?.recast_um, 1)} &micro;m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">HAZ depth</div>
          <div className="mt-1 text-2xl font-black text-orange-300">{safeFixed(integrity?.haz_um, 1)} &micro;m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Residual stress</div>
          <div className={`mt-1 text-2xl font-black ${(integrity?.residual_stress_MPa ?? 0) >= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
            {(integrity?.residual_stress_MPa ?? 0) >= 0 ? '+' : ''}{safeFixed(integrity?.residual_stress_MPa, 0)} MPa
            <span className="ml-1 text-sm font-normal text-slate-500">
              {(integrity?.residual_stress_MPa ?? 0) >= 0 ? '(tensile)' : '(compressive)'}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Fatigue life reduction</div>
          <div className={`mt-1 text-2xl font-black ${(integrity?.fatigue_reduction_pct ?? 0) > 20 ? 'text-rose-300' : (integrity?.fatigue_reduction_pct ?? 0) > 10 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {safeFixed(integrity?.fatigue_reduction_pct, 0)}%
          </div>
        </div>
      </div>

      {specCompliance.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Spec compliance</div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {specCompliance.map((spec) => (
              <div
                key={spec.standard}
                className={`rounded-xl border px-4 py-3 ${
                  spec.pass
                    ? 'border-emerald-500/30 bg-emerald-950/20'
                    : 'border-rose-500/40 bg-rose-950/30'
                }`}
              >
                <div className="flex min-h-[44px] items-center justify-between">
                  <span className="text-sm font-bold text-white">{spec.standard}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    spec.pass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {spec.pass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                {(spec.violations ?? []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(spec.violations ?? []).map((v) => (
                      <div key={v} className="text-[11px] text-rose-300/80">{v}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WireEdmCostCard ────────────────────────────────────────────────────

export interface WireEdmCostCardProps {
  cost: WireEdmCostBreakdown;
}

export function WireEdmCostCard({ cost }: WireEdmCostCardProps) {
  if (!cost) return null;

  const breakdown = cost?.breakdown ?? [];

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-4"
      role="region"
      aria-label={`Cost estimate: total ${safeFixed(cost?.total_usd, 2)} US dollars`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cost estimate</div>
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Machine time</div>
          <div className="mt-1 text-lg font-bold text-emerald-300">${safeFixed(cost?.machine_usd, 2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Wire</div>
          <div className="mt-1 text-lg font-bold text-amber-300">${safeFixed(cost?.wire_usd, 2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Consumables</div>
          <div className="mt-1 text-lg font-bold text-cyan-300">${safeFixed(cost?.consumables_usd, 2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-black text-white">${safeFixed(cost?.total_usd, 2)}</div>
        </div>
      </div>

      {/* Detailed breakdown rows */}
      {breakdown.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Breakdown</div>
          <table className="w-full text-[11px] text-slate-400">
            <thead>
              <tr className="border-b border-slate-700/30 text-[10px] uppercase tracking-widest text-slate-500">
                <th scope="col" className="py-1 text-left">Category</th>
                <th scope="col" className="py-1 text-right">Amount</th>
                <th scope="col" className="py-1 text-right">% of total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item) => (
                <tr key={item.category} className="border-b border-slate-800/30">
                  <td className="py-1">{item.category}</td>
                  <td className="py-1 text-right font-mono">${safeFixed(item?.amount, 2)}</td>
                  <td className="py-1 text-right font-mono">{safeFixed(item?.pct_of_total, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quantity breaks */}
      {(cost?.qty_breaks ?? []).length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Quantity price breaks</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {(cost.qty_breaks ?? []).map((qb) => (
              <div key={qb.quantity} className="rounded-lg border border-slate-700/40 bg-[#0f1f36] px-3 py-1.5 text-[11px]">
                <span className="text-slate-500">{qb.quantity}x:</span>{' '}
                <span className="font-mono font-bold text-emerald-300">${safeFixed(qb?.unit_cost, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WireEdmPassTable ───────────────────────────────────────────────────

export interface WireEdmPassTableProps {
  passes: WireEdmPassDetail[];
  controller: string;
}

export function WireEdmPassTable({ passes, controller }: WireEdmPassTableProps) {
  const safePasses = passes ?? [];

  if (safePasses.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-6 text-center text-sm text-slate-500">
        No pass data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-[12px] text-slate-300">
        <thead>
          <tr className="border-b border-slate-700/50 text-[10px] uppercase tracking-widest text-slate-500">
            <th scope="col" className="px-3 py-2">Pass</th>
            <th scope="col" className="px-3 py-2">Type</th>
            <th scope="col" className="px-3 py-2">{wedmLabel(controller, 'offset')}</th>
            <th scope="col" className="px-3 py-2">Speed</th>
            <th scope="col" className="px-3 py-2">Energy</th>
            <th scope="col" className="px-3 py-2">Ra</th>
            <th scope="col" className="px-3 py-2">Recast</th>
            <th scope="col" className="px-3 py-2">{wedmLabel(controller, 'power_pct')}</th>
            <th scope="col" className="px-3 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {safePasses.map((pass, idx) => {
            const passColor =
              pass.type === 'rough' ? 'text-orange-300'
              : pass.type === 'semi' ? 'text-yellow-300'
              : pass.type === 'skim' ? 'text-emerald-300'
              : 'text-sky-300';
            return (
              <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-3 py-2 font-mono font-bold text-white">{idx + 1}</td>
                <td className={`px-3 py-2 font-semibold capitalize ${passColor}`}>{pass.type}</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.offset_mm, 3)} mm</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.speed_mm_min, 1)} mm/min</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.energy_pct, 0)}%</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.predicted_Ra_um, 2)} &micro;m</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.predicted_recast_um, 1)} &micro;m</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.power_pct, 0)}%</td>
                <td className="px-3 py-2 font-mono">{safeFixed(pass?.time_min, 1)} min</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <span className="sr-only">
        Pass breakdown table with {safePasses.length} passes showing type, offset, speed, energy, surface finish Ra, recast layer depth, power percentage, and machining time per pass.
      </span>
    </div>
  );
}

// ── WireEdmCornerCard ──────────────────────────────────────────────────

export interface WireEdmCornerCardProps {
  corners: WireEdmCornerCompensation[];
}

export function WireEdmCornerCard({ corners }: WireEdmCornerCardProps) {
  const safeCorners = corners ?? [];
  if (safeCorners.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-4"
      role="region"
      aria-label={`Corner compensation for ${safeCorners.length} corners`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Corner compensation
      </div>
      <div className="mb-2 text-[11px] text-slate-500">
        Formula: {'\u03B4'} = F{'\u00B7'}L / (4T) &mdash; overtravel to maintain kerf at inside corners
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {safeCorners.map((cc, idx) => (
          <div key={idx} className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-3">
            <div className="flex min-h-[44px] items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                {cc.angle_deg != null ? `${cc.angle_deg}\u00B0 corner` : `Corner ${idx + 1}`}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-slate-500">Overtravel</div>
                <div className="text-lg font-bold text-amber-300">{safeFixed(cc?.overtravel_mm, 3)} mm</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Dwell</div>
                <div className="text-lg font-bold text-cyan-300">{safeFixed(cc?.dwell_s, 2)} s</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WireEdmTaperCard ───────────────────────────────────────────────────

export interface WireEdmTaperCardProps {
  taper: WireEdmTaperResult;
}

export function WireEdmTaperCard({ taper }: WireEdmTaperCardProps) {
  if (!taper) return null;

  return (
    <div
      className="rounded-2xl border border-indigo-500/20 bg-[#0c1522] px-5 py-4"
      role="region"
      aria-label={`Taper solving: UV offset ${safeFixed(taper?.uv_offset_mm, 3)} mm, error ${safeFixed(taper?.error_um, 1)} microns`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Taper solving
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">UV offset</div>
          <div className="mt-1 text-lg font-bold text-indigo-300">{safeFixed(taper?.uv_offset_mm, 3)} mm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Error</div>
          <div className="mt-1 text-lg font-bold text-amber-300">{safeFixed(taper?.error_um, 1)} &micro;m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Max capable</div>
          <div className="mt-1 text-lg font-bold text-emerald-300">{safeFixed(taper?.max_capable_deg, 1)}{'\u00B0'}</div>
        </div>
      </div>
    </div>
  );
}

// ── WireEdmControllerNotes ─────────────────────────────────────────────

export interface WireEdmControllerNotesProps {
  recommendations: string[];
}

export function WireEdmControllerNotes({ recommendations }: WireEdmControllerNotesProps) {
  const safeRecs = recommendations ?? [];
  if (safeRecs.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-4"
      role="region"
      aria-label={`${safeRecs.length} recommendations from the wire EDM solver`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recommendations</div>
      <div className="grid gap-2 md:grid-cols-2">
        {safeRecs.map((rec) => (
          <div key={rec} className="min-h-[44px] flex items-center rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-2.5 text-[12px] leading-5 text-slate-300">
            {rec}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WireEdmKerfWidthCard ───────────────────────────────────────────────

export interface WireEdmKerfWidthCardProps {
  kerf: WireEdmKerfWidthResult;
}

export function WireEdmKerfWidthCard({ kerf }: WireEdmKerfWidthCardProps) {
  if (!kerf) return null;

  const hasWarning = Boolean(kerf?.warning);
  const toleranceGrade = kerf?.tolerance_class ?? 'IT12';
  const gradeNum = parseInt(toleranceGrade.slice(2), 10);
  const toleranceTone =
    gradeNum <= 7 ? { text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', label: 'PRECISION' }
    : gradeNum <= 9 ? { text: 'text-cyan-300', border: 'border-cyan-500/40', bg: 'bg-cyan-950/20', label: 'STANDARD' }
    : { text: 'text-amber-300', border: 'border-amber-500/40', bg: 'bg-amber-950/20', label: 'COARSE' };

  return (
    <div
      className={`${hasWarning ? 'calculator-warning-attention ' : ''}rounded-2xl border ${hasWarning ? 'border-amber-500/40' : 'border-cyan-500/30'} bg-[#0c1522] px-5 py-4`}
      data-safety-card="kerf-width"
      role="region"
      aria-label={`Kerf width: ${safeFixed(kerf?.kerf_width_mm, 4)} millimeters, wire offset ${safeFixed(kerf?.wire_offset_mm, 4)} millimeters, tolerance class ${toleranceGrade}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Kerf width &amp; offset</div>
        <div className={`min-h-[44px] flex items-center rounded-full border ${toleranceTone.border} ${toleranceTone.bg} px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${toleranceTone.text}`}>
          {toleranceGrade} &middot; {toleranceTone.label}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Kerf width</div>
          <div className="mt-1 text-2xl font-black text-cyan-300">{safeFixed(kerf?.kerf_width_mm, 4)} mm</div>
          <div className="mt-0.5 text-[10px] text-slate-500">&plusmn;{safeFixed(kerf?.uncertainty_mm, 4)} mm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Overcut (per side)</div>
          <div className="mt-1 text-2xl font-black text-sky-300">{safeFixed(kerf?.overcut_mm, 4)} mm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Wire offset</div>
          <div className="mt-1 text-2xl font-black text-indigo-300">{safeFixed(kerf?.wire_offset_mm, 4)} mm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Est. Ra / Recast</div>
          <div className="mt-1 text-lg font-bold text-amber-300">{safeFixed(kerf?.estimated_Ra_um, 2)} &micro;m</div>
          <div className="mt-0.5 text-[11px] text-slate-400">recast {safeFixed(kerf?.recast_layer_um, 1)} &micro;m</div>
        </div>
      </div>

      {hasWarning && (
        <div className="calculator-warning-attention-inline mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-[12px] text-amber-300">
          {kerf.warning}
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: Kerf = wire_dia + 2{'\u00B7'}overcut &mdash; overcut = k{'\u00B7'}I<sub>p</sub><sup>a</sup>{'\u00B7'}t<sub>on</sub><sup>b</sup> (Klocke 2017)
      </div>
    </div>
  );
}

// ── WireEdmRecastDepthCard ─────────────────────────────────────────────

export interface WireEdmRecastDepthCardProps {
  recast: WireEdmRecastDepthResult;
}

export function WireEdmRecastDepthCard({ recast }: WireEdmRecastDepthCardProps) {
  if (!recast) return null;

  const risk = recast?.risk_level ?? 'none';
  const factors = recast?.contributing_factors ?? [];
  const recs = recast?.recommendations ?? [];
  const unsafe = recast?.safe_for_fatigue_critical === false;

  const tone =
    risk === 'critical' ? { border: 'border-rose-500/60', bg: 'bg-rose-950/40', text: 'text-rose-300', badge: 'bg-rose-500', label: 'CRITICAL' }
    : risk === 'high' ? { border: 'border-rose-500/40', bg: 'bg-rose-950/25', text: 'text-rose-300', badge: 'bg-rose-500', label: 'HIGH' }
    : risk === 'moderate' ? { border: 'border-amber-500/40', bg: 'bg-amber-950/25', text: 'text-amber-300', badge: 'bg-amber-500', label: 'MODERATE' }
    : risk === 'low' ? { border: 'border-cyan-500/30', bg: 'bg-cyan-950/20', text: 'text-cyan-300', badge: 'bg-cyan-500', label: 'LOW' }
    : { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-300', badge: 'bg-emerald-500', label: 'NONE' };

  const needsAttention = risk === 'critical' || risk === 'high' || unsafe;

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border-2 ${tone.border} ${tone.bg} px-5 py-4`}
      data-safety-card="recast-depth"
      role="region"
      aria-label={`HAZ and recast depth: ${tone.label} risk, recast ${safeFixed(recast?.estimated_depth_um, 1)} microns, HAZ ${safeFixed(recast?.heat_affected_zone_um, 1)} microns`}
    >
      {unsafe && (
        <div className="calculator-warning-attention-inline mb-3 rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-center text-sm font-bold uppercase tracking-widest text-rose-300">
          NOT SAFE FOR FATIGUE-CRITICAL PARTS
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">HAZ &amp; recast depth</div>
        <div className={`min-h-[44px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}>
          {tone.label} RISK
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Recast depth</div>
          <div className={`mt-1 text-2xl font-black ${tone.text}`}>{safeFixed(recast?.estimated_depth_um, 1)} &micro;m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">HAZ depth</div>
          <div className="mt-1 text-2xl font-black text-orange-300">{safeFixed(recast?.heat_affected_zone_um, 1)} &micro;m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Microcrack prob.</div>
          <div className={`mt-1 text-2xl font-black ${(recast?.microcrack_probability_pct ?? 0) > 40 ? 'text-rose-300' : (recast?.microcrack_probability_pct ?? 0) > 20 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {safeFixed(recast?.microcrack_probability_pct, 1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Fatigue life reduction</div>
          <div className={`mt-1 text-2xl font-black ${(recast?.fatigue_life_reduction_pct ?? 0) > 20 ? 'text-rose-300' : (recast?.fatigue_life_reduction_pct ?? 0) > 10 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {safeFixed(recast?.fatigue_life_reduction_pct, 0)}%
          </div>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Contributing factors</div>
          <div className="grid gap-2 md:grid-cols-2">
            {factors.map((f) => (
              <div key={f.factor} className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">{f.factor.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[11px] text-amber-300">{safeFixed(f?.contribution_pct, 0)}%</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{f.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Recommendations</div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div key={r} className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300">
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WireEdmCostPerUnitLengthCard ───────────────────────────────────────

export interface WireEdmCostPerUnitLengthCardProps {
  cost: WireEdmCostPerUnitLengthResult;
}

export function WireEdmCostPerUnitLengthCard({ cost }: WireEdmCostPerUnitLengthCardProps) {
  if (!cost) return null;

  const qtyBreaks = cost?.quantity_breaks ?? [];

  return (
    <div
      className="rounded-2xl border border-emerald-500/30 bg-[#0c1522] px-5 py-4"
      data-card="cost-per-unit-length"
      role="region"
      aria-label={`Unit-normalized cost: ${safeFixed(cost?.cost_per_mm_usd, 4)} dollars per millimeter, ${safeFixed(cost?.cost_per_in_usd, 3)} dollars per inch`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cost per unit length</div>
        <div className="min-h-[44px] flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
          UNIT-NORMALIZED
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Cost / mm</div>
          <div className="mt-1 text-2xl font-black text-emerald-300">${safeFixed(cost?.cost_per_mm_usd, 4)}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{safeFixed(cost?.time_per_mm_min, 3)} min/mm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Cost / in</div>
          <div className="mt-1 text-2xl font-black text-cyan-300">${safeFixed(cost?.cost_per_in_usd, 3)}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{safeFixed(cost?.time_per_in_min, 2)} min/in</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Cut length</div>
          <div className="mt-1 text-lg font-bold text-slate-200">{safeFixed(cost?.cut_length_mm, 1)} mm</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{safeFixed((cost?.cut_length_mm ?? 0) / 25.4, 2)} in</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Qty breaks</div>
          <div className="mt-1 text-lg font-bold text-indigo-300">{qtyBreaks.length}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">price tiers</div>
        </div>
      </div>

      {qtyBreaks.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Quantity pricing</div>
          <table className="w-full text-[11px] text-slate-400">
            <thead>
              <tr className="border-b border-slate-700/30 text-[10px] uppercase tracking-widest text-slate-500">
                <th scope="col" className="py-1 text-left">Qty</th>
                <th scope="col" className="py-1 text-right">Unit</th>
                <th scope="col" className="py-1 text-right">$ / mm</th>
                <th scope="col" className="py-1 text-right">$ / in</th>
              </tr>
            </thead>
            <tbody>
              {qtyBreaks.map((qb) => (
                <tr key={qb.quantity} className="border-b border-slate-800/30">
                  <td className="py-1 font-mono">{qb.quantity}x</td>
                  <td className="py-1 text-right font-mono text-emerald-300">${safeFixed(qb?.unit_cost_usd, 2)}</td>
                  <td className="py-1 text-right font-mono">${safeFixed(qb?.unit_cost_per_mm_usd, 4)}</td>
                  <td className="py-1 text-right font-mono">${safeFixed(qb?.unit_cost_per_in_usd, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: $/mm = total_cost / cut_length &mdash; $/in = $/mm &times; 25.4
      </div>
    </div>
  );
}

// ── WireEdmSlugTabRetentionCard ────────────────────────────────────────

export interface WireEdmSlugTabRetentionCardProps {
  retention: WireEdmSlugTabRetentionResult;
}

export function WireEdmSlugTabRetentionCard({ retention }: WireEdmSlugTabRetentionCardProps) {
  if (!retention) return null;

  const risk = retention?.risk_level ?? 'safe';
  const sf = retention?.safety_factor ?? 0;
  const recs = retention?.recommendations ?? [];
  const unsafe = retention?.safe_for_uncontrolled_drop === false;

  const tone =
    risk === 'unsafe' ? { border: 'border-rose-500/60', bg: 'bg-rose-950/40', text: 'text-rose-300', badge: 'bg-rose-500', label: 'UNSAFE' }
    : risk === 'at_risk' ? { border: 'border-rose-500/40', bg: 'bg-rose-950/25', text: 'text-rose-300', badge: 'bg-rose-500', label: 'AT RISK' }
    : risk === 'marginal' ? { border: 'border-amber-500/40', bg: 'bg-amber-950/25', text: 'text-amber-300', badge: 'bg-amber-500', label: 'MARGINAL' }
    : { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-300', badge: 'bg-emerald-500', label: 'SAFE' };

  const needsAttention = risk === 'unsafe' || risk === 'at_risk';

  // Gauge fill: clamp SF to [0, 4] for visualization, where 2.0 is the safety threshold.
  const gaugePct = Math.min(100, Math.max(0, (sf / 4) * 100));

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border-2 ${tone.border} ${tone.bg} px-5 py-4`}
      data-safety-card="slug-tab-retention"
      role="region"
      aria-label={`Slug tab retention: ${tone.label}, safety factor ${safeFixed(sf, 2)}, slug mass ${safeFixed(retention?.slug_weight_kg, 3)} kilograms`}
    >
      {unsafe && risk === 'unsafe' && (
        <div className="calculator-warning-attention-inline mb-3 rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-center text-sm font-bold uppercase tracking-widest text-rose-300">
          TAB PLAN WILL FAIL &mdash; REDESIGN REQUIRED
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Slug tab retention</div>
        <div className={`min-h-[44px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}>
          {tone.label}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-3xl font-black ${tone.text}`}>SF {safeFixed(sf, 2)}</div>
        <div className="flex-1">
          <div className="h-3 overflow-hidden rounded-full bg-slate-800/60" role="img" aria-label={`Safety factor gauge at ${safeFixed(gaugePct, 0)} percent of safe range`}>
            <div
              className={`h-full rounded-full ${tone.badge} transition-all`}
              style={{ width: `${gaugePct}%` }}
            />
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            0 &mdash;&mdash; 0.8 at_risk &mdash;&mdash; 1.0 marginal &mdash;&mdash; 2.0 safe &mdash;&mdash; 4+
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Slug mass</div>
          <div className="mt-1 text-lg font-bold text-slate-200">{safeFixed(retention?.slug_weight_kg, 3)} kg</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{safeFixed(retention?.slug_weight_force_N, 2)} N weight</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Retention force</div>
          <div className="mt-1 text-lg font-bold text-emerald-300">{safeFixed(retention?.retention_force_N, 0)} N</div>
          <div className="mt-0.5 text-[10px] text-slate-500">tabs {safeFixed(retention?.tab_cross_section_mm2, 1)} mm&sup2;</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Demand force</div>
          <div className={`mt-1 text-lg font-bold ${tone.text}`}>{safeFixed(retention?.demand_force_N, 0)} N</div>
          <div className="mt-0.5 text-[10px] text-slate-500">k&nbsp;=&nbsp;{safeFixed(retention?.dynamic_factor, 1)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Shear strength</div>
          <div className="mt-1 text-lg font-bold text-cyan-300">{safeFixed(retention?.shear_strength_MPa, 0)} MPa</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Von Mises &tau;&nbsp;=&nbsp;&sigma;<sub>y</sub>/&radic;3</div>
        </div>
      </div>

      {retention?.summary && (
        <div className="mt-3 rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300">
          {retention.summary}
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Recommendations</div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div key={r} className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300">
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: SF = (&tau; &middot; n &middot; w &middot; t) / (&rho; &middot; A &middot; g &middot; k) &mdash; Shigley 10e &sect;5.4
      </div>
    </div>
  );
}

// ── WireEdmWireBreakGaugeCard ─────────────────────────────────────────
//
// Radial arc gauge showing Poisson per-job wire break probability, backed by
// WEDMWireBreakRiskCostEngine.calculateGauge(). Replaces the coarse text
// factor chip list with quantitative contribution bars and surfaces the cost
// impact + historical comparison that the engine already computes.
// U-P2PFS39 (P2P-FULLSTACK-MS0).

/** Risk tier → gauge tone. 4-tier mapping matches engine risk_category. */
const WIRE_BREAK_TONES: Record<
  WireEdmWireBreakGaugeResult['risk_category'],
  { arc: string; badge: string; text: string; border: string; bg: string; label: string }
> = {
  LOW: {
    arc: '#10b981',
    badge: 'bg-emerald-500',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    label: 'LOW',
  },
  MEDIUM: {
    arc: '#f59e0b',
    badge: 'bg-amber-500',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    label: 'MEDIUM',
  },
  HIGH: {
    arc: '#fb7185',
    badge: 'bg-rose-500',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/30',
    label: 'HIGH',
  },
  CRITICAL: {
    arc: '#e11d48',
    badge: 'bg-rose-600',
    text: 'text-rose-200',
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/50',
    label: 'CRITICAL',
  },
};

export interface WireEdmWireBreakGaugeCardProps {
  gauge: WireEdmWireBreakGaugeResult | null | undefined;
}

export function WireEdmWireBreakGaugeCard({ gauge }: WireEdmWireBreakGaugeCardProps) {
  if (!gauge) return null;

  const riskCategory = gauge.risk_category ?? 'LOW';
  const tone = WIRE_BREAK_TONES[riskCategory] ?? WIRE_BREAK_TONES.LOW;

  // Probability clamped to [0,1] for gauge geometry; UI never shows >100%.
  const pRaw = gauge.probability_per_job;
  const p = Number.isFinite(pRaw) ? Math.min(1, Math.max(0, pRaw)) : 0;
  const pPct = p * 100;

  const factors = Array.isArray(gauge.factor_contributions) ? gauge.factor_contributions : [];
  const activeFactors = factors.filter(
    (f) => Number.isFinite(f?.multiplier) && f.multiplier > 1.0001,
  );
  const recs = Array.isArray(gauge.recommendations) ? gauge.recommendations : [];
  const needsAttention = riskCategory === 'HIGH' || riskCategory === 'CRITICAL';

  // Arc geometry: 270° sweep (from 7-o'clock to 5-o'clock), stroke-dasharray trick.
  // Radius r=60 → circumference C = 2πr ≈ 376.99. Visible arc = 0.75·C ≈ 282.74.
  const R = 60;
  const C = 2 * Math.PI * R;
  const visibleArcLen = C * 0.75;
  const fillLen = visibleArcLen * p;
  const emptyLen = C - fillLen;

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}
      role="region"
      aria-label={`Wire break gauge: ${tone.label} risk, probability ${safeFixed(pPct, 1)} percent per job`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Wire break gauge
        </div>
        <div
          className={`min-h-[28px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}
        >
          {tone.label}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Radial gauge */}
        <div className="flex flex-shrink-0 items-center justify-center">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            role="img"
            aria-label={`Gauge: ${safeFixed(pPct, 1)} percent`}
            data-testid="wire-break-gauge-svg"
          >
            {/* Backdrop track — 270° arc, rotated so gap is at bottom */}
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
              strokeDasharray={`${visibleArcLen} ${C}`}
              strokeDashoffset="0"
              transform="rotate(135 80 80)"
              strokeLinecap="round"
            />
            {/* Filled arc — same geometry, scaled by p */}
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={tone.arc}
              strokeWidth="10"
              strokeDasharray={`${fillLen} ${emptyLen}`}
              strokeDashoffset="0"
              transform="rotate(135 80 80)"
              strokeLinecap="round"
              data-testid="wire-break-gauge-fill"
            />
            {/* Center readout */}
            <text
              x="80"
              y="78"
              textAnchor="middle"
              className="fill-white"
              style={{ fontSize: '28px', fontWeight: 900 }}
            >
              {safeFixed(pPct, 1)}%
            </text>
            <text
              x="80"
              y="100"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: '10px', letterSpacing: '0.12em' }}
            >
              P(BREAK) / JOB
            </text>
          </svg>
        </div>

        {/* Factor contributions */}
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Factor contributions
          </div>
          {activeFactors.length === 0 ? (
            <div className="mt-2 rounded-lg border border-emerald-700/30 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-300">
              All drivers within nominal range &mdash; no excess risk factors active.
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {activeFactors.map((f) => {
                const barPct = Number.isFinite(f.contribution_pct)
                  ? Math.min(100, Math.max(0, f.contribution_pct))
                  : 0;
                return (
                  <div
                    key={f.name}
                    className="flex items-center gap-3"
                    data-testid="wire-break-factor-row"
                  >
                    <div className="w-32 flex-shrink-0 text-[11px] text-slate-300">{f.name}</div>
                    <div className="flex-1">
                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-800/60"
                        role="img"
                        aria-label={`${f.name}: ${safeFixed(barPct, 0)} percent contribution`}
                      >
                        <div
                          className={`h-full rounded-full ${tone.badge} transition-all`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 flex-shrink-0 text-right font-mono text-[11px] text-slate-400">
                      {safeFixed(barPct, 0)}% &times;{safeFixed(f.multiplier, 2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cost impact + rethread time */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Expected breaks/job</div>
          <div className={`mt-1 text-lg font-bold ${tone.text}`}>
            {safeFixed(gauge.expected_breaks_per_job, 3)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Cost per break</div>
          <div className="mt-1 text-lg font-bold text-amber-300">
            ${safeFixed(gauge.cost_per_break_usd, 2)}
            <span className="ml-1 text-[10px] font-normal text-slate-500">
              ({safeFixed(gauge.re_thread_time_min, 1)} min rethread)
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total risk cost</div>
          <div className={`mt-1 text-lg font-bold ${tone.text}`}>
            ${safeFixed(gauge.total_break_risk_cost_usd, 2)}
          </div>
        </div>
      </div>

      {/* Historical comparison */}
      {gauge.historical_comparison && (
        <div className="mt-3 rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300">
          <span className="font-semibold text-slate-400">Historical: </span>
          material avg {safeFixed(gauge.historical_comparison.material_avg_breaks_per_km, 3)} breaks/km
          {gauge.historical_comparison.this_job_vs_avg
            ? ` — ${gauge.historical_comparison.this_job_vs_avg}`
            : ''}
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">
            Recommendations
          </div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: P(break)/job = 1 &minus; e<sup>&minus;&lambda;</sup>, &lambda; = expected breaks &mdash; Rajurkar &amp; Wang 1993
      </div>
    </div>
  );
}

// ── WireEdmDielectricFlushAdjustCard ──────────────────────────────────
//
// Dielectric conductivity (µS/cm) → adjusted flush pressure recommendation.
// Backed by WEDMDielectricFlushAdjustEngine. Shows baseline → adjusted
// pressure with factor breakdown, 4-tier conductivity status, and
// resin-exchange urgency banner.
// U-P2PFS40 (P2P-FULLSTACK-MS0).

const DIELECTRIC_STATUS_TONES: Record<
  WireEdmDielectricFlushAdjustResult['conductivity_status'],
  { border: string; bg: string; text: string; badge: string; label: string }
> = {
  optimal: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500',
    label: 'OPTIMAL',
  },
  acceptable: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500',
    label: 'ACCEPTABLE',
  },
  degraded: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    badge: 'bg-amber-500',
    label: 'DEGRADED',
  },
  out_of_spec: {
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/50',
    text: 'text-rose-300',
    badge: 'bg-rose-600',
    label: 'OUT OF SPEC',
  },
};

export interface WireEdmDielectricFlushAdjustCardProps {
  adjust: WireEdmDielectricFlushAdjustResult | null | undefined;
  /** Optional — if provided, renders the caller's measured conductivity */
  conductivity_uS_cm?: number;
}

export function WireEdmDielectricFlushAdjustCard({
  adjust,
  conductivity_uS_cm,
}: WireEdmDielectricFlushAdjustCardProps) {
  if (!adjust) return null;

  const status = adjust.conductivity_status ?? 'optimal';
  const tone = DIELECTRIC_STATUS_TONES[status] ?? DIELECTRIC_STATUS_TONES.optimal;
  const urgency = adjust.resin_exchange_urgency ?? 'none';
  const needsAttention = status === 'degraded' || status === 'out_of_spec';

  const baseP = adjust.baseline_flush_pressure_bar;
  const adjP = adjust.adjusted_flush_pressure_bar;
  const deltaPct =
    Number.isFinite(baseP) && Number.isFinite(adjP) && baseP > 0
      ? ((adjP - baseP) / baseP) * 100
      : null;

  const warnings = Array.isArray(adjust.warnings) ? adjust.warnings : [];
  const recs = Array.isArray(adjust.recommendations) ? adjust.recommendations : [];

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}
      role="region"
      aria-label={`Dielectric flush adjustment: ${tone.label}, baseline ${safeFixed(baseP, 2)} bar, adjusted ${safeFixed(adjP, 2)} bar`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Dielectric flush adjust
        </div>
        <div
          className={`min-h-[28px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}
        >
          {tone.label}
        </div>
      </div>

      {/* Resin exchange urgency banner */}
      {urgency === 'required' && (
        <div
          className="calculator-warning-attention-inline mb-3 rounded-lg border border-rose-500/60 bg-rose-950/50 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-rose-300"
          data-testid="resin-exchange-banner"
          data-urgency="required"
        >
          Resin Exchange Required &mdash; STOP before precision work
        </div>
      )}
      {urgency === 'recommended' && (
        <div
          className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-amber-300"
          data-testid="resin-exchange-banner"
          data-urgency="recommended"
        >
          Resin Exchange Recommended &mdash; schedule within next maintenance window
        </div>
      )}

      {/* Baseline → adjusted pressure */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Baseline</div>
          <div className="mt-1 text-lg font-bold text-slate-300">
            {safeFixed(baseP, 2)} <span className="text-[11px] font-normal text-slate-500">bar</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Adjusted</div>
          <div className={`mt-1 text-2xl font-black ${tone.text}`}>
            {safeFixed(adjP, 2)} <span className="text-[11px] font-normal text-slate-500">bar</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">&Delta; vs baseline</div>
          <div className={`mt-1 text-lg font-bold ${tone.text}`}>
            {deltaPct == null
              ? '\u2014'
              : `${deltaPct >= 0 ? '+' : ''}${safeFixed(deltaPct, 1)}%`}
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Factor breakdown</div>
        <div className="mt-1 grid gap-2 md:grid-cols-4 text-[11px] font-mono">
          <div className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Conductivity</div>
            <div className="text-slate-300">&times;{safeFixed(adjust.conductivity_factor, 3)}</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Temperature</div>
            <div className="text-slate-300">&times;{safeFixed(adjust.temperature_factor, 3)}</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Thick section</div>
            <div className="text-slate-300">&times;{safeFixed(adjust.thick_section_factor, 3)}</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Total</div>
            <div className={`font-bold ${tone.text}`}>&times;{safeFixed(adjust.total_factor, 3)}</div>
          </div>
        </div>
      </div>

      {/* Conductivity meter (0–35+ µS/cm band) */}
      {Number.isFinite(conductivity_uS_cm) && conductivity_uS_cm != null && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Conductivity</span>
            <span className="font-mono">{safeFixed(conductivity_uS_cm, 1)} &micro;S/cm</span>
          </div>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-slate-800/60"
            role="img"
            aria-label={`Conductivity at ${safeFixed(conductivity_uS_cm, 1)} micro-siemens per centimeter`}
            data-testid="conductivity-meter"
          >
            {/* Zone bands: optimal (≤8) green, acceptable (8-15) cyan, degraded (15-25) amber, out (>25) rose */}
            <div className="absolute inset-0 flex">
              <div className="h-full bg-emerald-500/30" style={{ width: '22.9%' }} />
              <div className="h-full bg-cyan-500/30" style={{ width: '20%' }} />
              <div className="h-full bg-amber-500/30" style={{ width: '28.6%' }} />
              <div className="h-full bg-rose-500/30" style={{ width: '28.6%' }} />
            </div>
            {/* Pointer */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white"
              style={{
                left: `${Math.min(100, Math.max(0, (conductivity_uS_cm / 35) * 100))}%`,
              }}
              data-testid="conductivity-pointer"
            />
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-rose-400">Warnings</div>
          <div className="space-y-1">
            {warnings.map((w) => (
              <div
                key={w}
                className="rounded-lg border border-rose-700/40 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-300"
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
            Recommendations
          </div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: P<sub>adj</sub> = P<sub>base</sub> &middot; k<sub>&sigma;</sub> &middot; k<sub>T</sub> &middot; k<sub>thick</sub> &mdash; Mitsubishi MV1200S manual &sect;4.2
      </div>
    </div>
  );
}

// ── WireEdmWireSpoolConsumptionCard ───────────────────────────────────
//
// Wire spool consumption projection: total_wire_m + spool capacity →
// spool count, mid-job change points, threading downtime. Surfaces a 4-tier
// risk tier and flags when operator attention is required.
// U-P2PFS41 (P2P-FULLSTACK-MS0).

const SPOOL_RISK_TONES: Record<
  WireEdmWireSpoolConsumptionResult['mid_job_change_risk'],
  { border: string; bg: string; text: string; badge: string; label: string }
> = {
  none: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500',
    label: 'NO CHANGE',
  },
  single_change: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500',
    label: '1 CHANGE',
  },
  multiple_changes: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    badge: 'bg-amber-500',
    label: 'MULTIPLE',
  },
  high_exposure: {
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    badge: 'bg-rose-500',
    label: 'HIGH EXPOSURE',
  },
};

export interface WireEdmWireSpoolConsumptionCardProps {
  spool: WireEdmWireSpoolConsumptionResult | null | undefined;
}

export function WireEdmWireSpoolConsumptionCard({
  spool,
}: WireEdmWireSpoolConsumptionCardProps) {
  if (!spool) return null;

  const risk = spool.mid_job_change_risk ?? 'none';
  const tone = SPOOL_RISK_TONES[risk] ?? SPOOL_RISK_TONES.none;
  const needsAttention = risk === 'multiple_changes' || risk === 'high_exposure';

  const cap = spool.spool_capacity_m;
  const total = spool.total_wire_m;
  const remaining = spool.wire_remaining_m;
  const changes = spool.spool_changes_required ?? 0;
  const changePoints = Array.isArray(spool.change_points_m) ? spool.change_points_m : [];
  const warnings = Array.isArray(spool.warnings) ? spool.warnings : [];
  const recs = Array.isArray(spool.recommendations) ? spool.recommendations : [];

  // Timeline: position each change point as % along total consumption.
  const timelinePts = changePoints.map((pt) => {
    const pct =
      Number.isFinite(pt) && Number.isFinite(total) && total > 0
        ? Math.min(100, Math.max(0, (pt / total) * 100))
        : 0;
    return { wire_m: pt, pct };
  });

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}
      role="region"
      aria-label={`Wire spool consumption: ${tone.label}, ${changes} mid-job changes, total wire ${safeFixed(total, 0)} meters`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Wire spool consumption
        </div>
        <div
          className={`min-h-[28px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}
        >
          {tone.label}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total wire</div>
          <div className="mt-1 text-lg font-bold text-slate-200">
            {safeFixed(total, 0)} <span className="text-[11px] font-normal text-slate-500">m</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Spool capacity</div>
          <div className="mt-1 text-lg font-bold text-slate-300">
            {safeFixed(cap, 0)} <span className="text-[11px] font-normal text-slate-500">m</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Mid-job changes</div>
          <div className={`mt-1 text-2xl font-black ${tone.text}`}>{changes}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Spools used</div>
          <div className="mt-1 text-lg font-bold text-slate-200">
            {Number.isFinite(spool.spools_required) ? spool.spools_required : '\u2014'}
          </div>
        </div>
      </div>

      {/* Consumption timeline with change markers */}
      {total > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
            Consumption timeline
          </div>
          <div
            className="relative h-4 overflow-hidden rounded-full bg-slate-800/60"
            role="img"
            aria-label={`Consumption timeline with ${changes} spool change markers over ${safeFixed(total, 0)} meters`}
            data-testid="spool-consumption-timeline"
          >
            <div className={`absolute inset-y-0 left-0 ${tone.badge} opacity-60`} style={{ width: '100%' }} />
            {timelinePts.map((pt, i) => (
              <div
                key={`pt-${i}`}
                className="absolute top-0 h-full w-1 bg-white"
                style={{ left: `${pt.pct}%` }}
                data-testid="spool-change-marker"
                data-wire-m={pt.wire_m}
                title={`Change at ${pt.wire_m.toFixed(0)} m (${pt.pct.toFixed(0)}%)`}
              />
            ))}
          </div>
          {changePoints.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
              {changePoints.map((pt, i) => (
                <div
                  key={`chip-${i}`}
                  className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-2 py-0.5"
                >
                  #{i + 1} &rarr; {safeFixed(pt, 0)} m
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Downtime row */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Current remaining</div>
          <div className="mt-1 text-sm font-mono text-slate-300">
            {safeFixed(remaining, 0)} m
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Total change time
          </div>
          <div className={`mt-1 text-sm font-mono ${tone.text}`}>
            {safeFixed(spool.total_change_time_min, 1)} min
            <span className="ml-1 text-[10px] font-normal text-slate-500">
              (&times;{changes} @ {safeFixed(spool.per_change_time_min, 1)} min)
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Change downtime cost
          </div>
          <div className={`mt-1 text-sm font-mono ${tone.text}`}>
            ${safeFixed(spool.total_change_cost_usd, 2)}
          </div>
        </div>
      </div>

      {/* Remaining after job */}
      <div className="mt-3 text-[11px] text-slate-400">
        After job: {safeFixed(spool.wire_remaining_after_job_m, 0)} m remaining on final spool
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-rose-400">Warnings</div>
          <div className="space-y-1">
            {warnings.map((w) => (
              <div
                key={w}
                className="rounded-lg border border-rose-700/40 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-300"
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
            Recommendations
          </div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: N<sub>spools</sub> = 1 + &lceil;(total &minus; remaining) / capacity&rceil;
      </div>
    </div>
  );
}

// ── WireEdmTaperErrorBudgetCard ───────────────────────────────────────
//
// Taper programming error budget: taper angle + part height + guide span
// → UV travel, wall straightness at mid-plane (RSS of 4 contributors),
// achievable ISO 286 IT tolerance class, guide-limit exceedance flag.
// U-P2PFS42 (P2P-FULLSTACK-MS0).

const IT_CLASS_TONES: Record<
  WireEdmTaperErrorBudgetResult['achievable_tolerance_class'],
  { border: string; bg: string; text: string; badge: string; label: string }
> = {
  IT6: { border: 'border-emerald-500/40', bg: 'bg-emerald-950/25', text: 'text-emerald-300', badge: 'bg-emerald-500', label: 'IT6' },
  IT7: { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-300', badge: 'bg-emerald-500', label: 'IT7' },
  IT8: { border: 'border-cyan-500/30',    bg: 'bg-cyan-950/20',    text: 'text-cyan-300',    badge: 'bg-cyan-500',    label: 'IT8' },
  IT9: { border: 'border-cyan-500/30',    bg: 'bg-cyan-950/20',    text: 'text-cyan-300',    badge: 'bg-cyan-500',    label: 'IT9' },
  IT10: { border: 'border-amber-500/40',  bg: 'bg-amber-950/25',   text: 'text-amber-300',   badge: 'bg-amber-500',   label: 'IT10' },
  IT11: { border: 'border-amber-500/40',  bg: 'bg-amber-950/30',   text: 'text-amber-300',   badge: 'bg-amber-500',   label: 'IT11' },
  IT12: { border: 'border-rose-500/40',   bg: 'bg-rose-950/30',    text: 'text-rose-300',    badge: 'bg-rose-500',    label: 'IT12' },
  out_of_spec: {
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/50',
    text: 'text-rose-200',
    badge: 'bg-rose-600',
    label: 'OUT OF SPEC',
  },
};

export interface WireEdmTaperErrorBudgetCardProps {
  taper: WireEdmTaperErrorBudgetResult | null | undefined;
  /** Optional — programmed taper angle to cite in the header (deg). */
  taper_angle_deg?: number;
}

export function WireEdmTaperErrorBudgetCard({
  taper,
  taper_angle_deg,
}: WireEdmTaperErrorBudgetCardProps) {
  if (!taper) return null;

  const cls = taper.achievable_tolerance_class ?? 'out_of_spec';
  const tone = IT_CLASS_TONES[cls] ?? IT_CLASS_TONES.out_of_spec;
  const exceedsLimit = Boolean(taper.exceeds_guide_limit);
  const needsAttention =
    cls === 'IT11' || cls === 'IT12' || cls === 'out_of_spec' || exceedsLimit;

  const sources = Array.isArray(taper.error_sources) ? taper.error_sources : [];
  const warnings = Array.isArray(taper.warnings) ? taper.warnings : [];
  const recs = Array.isArray(taper.recommendations) ? taper.recommendations : [];

  // Max-contribution normalization for bar widths.
  const maxContribution = sources.reduce(
    (m, s) => (Number.isFinite(s.contribution_um) && s.contribution_um > m ? s.contribution_um : m),
    0,
  );

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}
      role="region"
      aria-label={`Taper error budget: ${tone.label}, total error ${safeFixed(taper.total_error_um, 1)} microns, UV travel ${safeFixed(taper.uv_travel_mm, 2)} mm`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Taper error budget
          {Number.isFinite(taper_angle_deg) && (
            <span className="ml-2 text-[10px] text-slate-500">
              {' '}&middot; {safeFixed(taper_angle_deg, 1)}&deg;
            </span>
          )}
        </div>
        <div
          className={`min-h-[28px] flex items-center rounded-full ${tone.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}
        >
          {tone.label}
        </div>
      </div>

      {/* Guide-limit banner */}
      {exceedsLimit && (
        <div
          className="calculator-warning-attention-inline mb-3 rounded-lg border border-rose-500/60 bg-rose-950/50 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-rose-300"
          data-testid="taper-guide-limit-banner"
        >
          Taper exceeds guide geometry limit ({taper.max_practical_taper_deg}&deg;)
        </div>
      )}

      {/* Summary row */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">UV travel</div>
          <div className={`mt-1 text-2xl font-black ${tone.text}`}>
            {safeFixed(taper.uv_travel_mm, 2)}
            <span className="ml-1 text-[11px] font-normal text-slate-500">mm</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total error</div>
          <div className={`mt-1 text-2xl font-black ${tone.text}`}>
            {safeFixed(taper.total_error_um, 1)}
            <span className="ml-1 text-[11px] font-normal text-slate-500">&micro;m</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Max practical taper</div>
          <div className="mt-1 text-lg font-bold text-slate-200">
            {taper.max_practical_taper_deg}&deg;
          </div>
        </div>
      </div>

      {/* Error source breakdown */}
      {sources.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Error source contributions (RSS)
          </div>
          <div className="mt-2 space-y-1.5">
            {sources.map((s) => {
              const pct =
                maxContribution > 0 && Number.isFinite(s.contribution_um)
                  ? Math.min(100, Math.max(0, (s.contribution_um / maxContribution) * 100))
                  : 0;
              return (
                <div
                  key={s.name}
                  className="flex items-center gap-3"
                  data-testid="taper-error-source-row"
                >
                  <div className="w-36 flex-shrink-0 text-[11px] text-slate-300">{s.name}</div>
                  <div className="flex-1">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-slate-800/60"
                      role="img"
                      aria-label={`${s.name}: ${safeFixed(s.contribution_um, 1)} microns`}
                    >
                      <div
                        className={`h-full rounded-full ${tone.badge} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 flex-shrink-0 text-right font-mono text-[11px] text-slate-400">
                    {safeFixed(s.contribution_um, 1)} &micro;m
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-rose-400">Warnings</div>
          <div className="space-y-1">
            {warnings.map((w) => (
              <div
                key={w}
                className="rounded-lg border border-rose-700/40 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-300"
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
            Recommendations
          </div>
          <div className="space-y-1">
            {recs.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-slate-700/50 bg-[#0f1f36] px-3 py-2 text-[11px] text-slate-300"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Formula: UV = h &middot; tan(&theta;); &epsilon;<sub>total</sub> = &radic;(&epsilon;<sub>guide</sub>&sup2; + &epsilon;<sub>uv</sub>&sup2; + &epsilon;<sub>bow</sub>&sup2; + &epsilon;<sub>cal</sub>&sup2;) &mdash; ISO 286-1
      </div>
    </div>
  );
}
