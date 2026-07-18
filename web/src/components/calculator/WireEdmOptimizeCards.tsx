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
