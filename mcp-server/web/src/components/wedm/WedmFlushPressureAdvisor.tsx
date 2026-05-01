/**
 * WedmFlushPressureAdvisor — P2P-FULLSTACK-MS0/U-P2PFS51
 *
 * Advisory widget: given material group, part thickness, and taper
 * angle, recommend upper & lower flush-nozzle pressures (bar) and
 * surface a high-taper warning when taper geometry compromises the
 * bottom-nozzle seal.
 *
 * Model (zeroth-order, drawn from Mitsubishi MV-series application
 * notes + JM Die operator fit):
 *
 *   P_base(t) = P0 + k_t * t_mm                [linear in thickness]
 *   P_upper   = P_base * k_mat_upper           [material multiplier]
 *   P_lower   = P_base * k_mat_lower
 *   P_upper *= (1 + α·|θ|_deg / 10)            [taper bias toward upper]
 *   P_lower *= max(0.4, 1 − β·|θ|_deg / 10)    [bottom nozzle de-rated]
 *   Clamped to [P_min, P_max] per jet regulator.
 *
 * Taper flag asserts when:
 *   |θ| > 5°  AND  t > 20 mm    (bottom seal at risk)
 *
 * Pure advisory — consumed by the WEDM studio alongside the main
 * solver. No backend round-trip. Invalid inputs produce em-dash
 * readouts and an amber "Invalid input" chip.
 */

import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type WedmFlushMaterialGroup =
  | 'tool_steel'
  | 'hss'
  | 'tungsten_carbide'
  | 'graphite'
  | 'copper'
  | 'aluminum'
  | 'titanium'
  | 'stainless'
  | 'superalloy';

export interface WedmFlushAdvisorInputs {
  material_group: WedmFlushMaterialGroup;
  thickness_mm: number;
  taper_deg: number;
}

export interface WedmFlushAdvisorResult {
  upper_bar: number;
  lower_bar: number;
  /** Base pressure before material/taper adjustment. */
  base_bar: number;
  /** True if taper geometry risks breaking the bottom seal. */
  high_taper_flag: boolean;
  /** True if all inputs were finite positives (taper may be zero). */
  valid: boolean;
  /** Material multipliers used (for transparency + explainability). */
  k_mat_upper: number;
  k_mat_lower: number;
}

// ============================================================================
// MATERIAL MULTIPLIERS (upper, lower) relative to steel baseline
// ============================================================================

interface MaterialCoeff {
  upper: number;
  lower: number;
  label: string;
}

const MATERIAL_COEFFS: Record<WedmFlushMaterialGroup, MaterialCoeff> = {
  tool_steel:       { upper: 1.00, lower: 1.00, label: 'Tool steel (D2/A2/S7/H13)' },
  hss:              { upper: 1.05, lower: 1.00, label: 'High-speed steel (M2)' },
  tungsten_carbide: { upper: 1.25, lower: 1.20, label: 'Tungsten carbide (WC-Co)' },
  graphite:         { upper: 0.70, lower: 0.70, label: 'Graphite' },
  copper:           { upper: 0.85, lower: 0.85, label: 'Copper (C110)' },
  aluminum:         { upper: 0.80, lower: 0.80, label: 'Aluminum (6061)' },
  titanium:         { upper: 1.15, lower: 1.10, label: 'Titanium (Ti-6Al-4V)' },
  stainless:        { upper: 1.00, lower: 1.00, label: 'Stainless steel (304)' },
  superalloy:       { upper: 1.30, lower: 1.25, label: 'Superalloy (Inconel 718)' },
};

// Regulator limits / physics coefficients.
const P0_BAR = 5.0;              // baseline pressure at t=0
const K_THICKNESS = 0.4;         // bar / mm thickness
const ALPHA_TAPER_UPPER = 0.15;  // upper gain per 10° taper
const BETA_TAPER_LOWER = 0.20;   // lower de-rate per 10° taper
const P_MIN_BAR = 2.0;
const P_MAX_BAR = 14.0;
const HIGH_TAPER_THRESHOLD_DEG = 5;
const HIGH_TAPER_THICKNESS_MM = 20;

// ============================================================================
// PHYSICS
// ============================================================================

export function computeFlushPressure(inputs: WedmFlushAdvisorInputs): WedmFlushAdvisorResult {
  const { material_group, thickness_mm, taper_deg } = inputs;
  const coeff = MATERIAL_COEFFS[material_group];
  const valid =
    !!coeff &&
    Number.isFinite(thickness_mm) &&
    thickness_mm > 0 &&
    Number.isFinite(taper_deg);
  if (!valid) {
    return {
      upper_bar: NaN,
      lower_bar: NaN,
      base_bar: NaN,
      high_taper_flag: false,
      valid: false,
      k_mat_upper: coeff?.upper ?? 1,
      k_mat_lower: coeff?.lower ?? 1,
    };
  }
  const absTaper = Math.abs(taper_deg);
  const base = P0_BAR + K_THICKNESS * thickness_mm;
  const upperRaw = base * coeff.upper * (1 + ALPHA_TAPER_UPPER * absTaper / 10);
  const lowerRaw =
    base * coeff.lower * Math.max(0.4, 1 - BETA_TAPER_LOWER * absTaper / 10);
  const upper = clamp(upperRaw, P_MIN_BAR, P_MAX_BAR);
  const lower = clamp(lowerRaw, P_MIN_BAR, P_MAX_BAR);
  const highTaper =
    absTaper > HIGH_TAPER_THRESHOLD_DEG && thickness_mm > HIGH_TAPER_THICKNESS_MM;
  return {
    upper_bar: round2(upper),
    lower_bar: round2(lower),
    base_bar: round2(base),
    high_taper_flag: highTaper,
    valid: true,
    k_mat_upper: coeff.upper,
    k_mat_lower: coeff.lower,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v: number): number {
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : v;
}

function safeFixed(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return '\u2014';
  return v.toFixed(decimals);
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmFlushPressureAdvisorProps {
  /** Controlled mode — caller manages inputs. */
  inputs?: WedmFlushAdvisorInputs;
  onChange?: (next: WedmFlushAdvisorInputs) => void;
  /** Uncontrolled initial values. */
  defaultInputs?: Partial<WedmFlushAdvisorInputs>;
}

const DEFAULT_INPUTS: WedmFlushAdvisorInputs = {
  material_group: 'tool_steel',
  thickness_mm: 25,
  taper_deg: 0,
};

export function WedmFlushPressureAdvisor({
  inputs,
  onChange,
  defaultInputs,
}: WedmFlushPressureAdvisorProps) {
  const [internal, setInternal] = useState<WedmFlushAdvisorInputs>({
    ...DEFAULT_INPUTS,
    ...defaultInputs,
  });
  const isControlled = inputs !== undefined;
  const current = isControlled ? (inputs as WedmFlushAdvisorInputs) : internal;
  const result = computeFlushPressure(current);

  function update<K extends keyof WedmFlushAdvisorInputs>(
    key: K,
    value: WedmFlushAdvisorInputs[K],
  ): void {
    const next: WedmFlushAdvisorInputs = { ...current, [key]: value } as WedmFlushAdvisorInputs;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  const needsAttention = result.high_taper_flag;
  const borderTone = !result.valid
    ? 'border-amber-500/40'
    : needsAttention
    ? 'border-rose-500/60'
    : 'border-slate-700/40';
  const bgTone = !result.valid
    ? 'bg-[#0c1522]'
    : needsAttention
    ? 'bg-rose-950/25'
    : 'bg-[#0c1522]';

  return (
    <div
      className={`rounded-2xl border ${borderTone} ${bgTone} px-4 py-3`}
      role="region"
      aria-label={`WEDM flush pressure advisor: upper ${safeFixed(result.upper_bar, 1)} bar, lower ${safeFixed(result.lower_bar, 1)} bar${result.high_taper_flag ? ', high-taper warning' : ''}`}
      data-testid="wedm-flush-pressure-advisor"
      data-valid={result.valid ? 'true' : 'false'}
      data-high-taper={result.high_taper_flag ? 'true' : 'false'}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Flush pressure advisor
        </div>
        {result.high_taper_flag && (
          <div
            className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
            data-testid="flush-high-taper-badge"
            title="Bottom nozzle seal at risk: taper > 5° on thick stock"
          >
            High-taper warning
          </div>
        )}
        {!result.valid && (
          <div
            className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
            data-testid="flush-invalid-badge"
          >
            Invalid input
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-slate-500">
          <span>
            Material <span className="text-slate-600 normal-case">(group)</span>
          </span>
          <select
            value={current.material_group}
            onChange={(e) =>
              update('material_group', e.target.value as WedmFlushMaterialGroup)
            }
            className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-[12px] text-slate-200 focus:border-cyan-500/60 focus:outline-none"
            data-testid="flush-input-material"
          >
            {Object.entries(MATERIAL_COEFFS).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <NumField
          label="Thickness"
          unit="mm"
          value={current.thickness_mm}
          onChange={(v) => update('thickness_mm', v)}
          step={1}
          min={0}
          testId="flush-input-thickness"
        />
        <NumField
          label="Taper"
          unit="deg"
          value={current.taper_deg}
          onChange={(v) => update('taper_deg', v)}
          step={0.5}
          testId="flush-input-taper"
        />
      </div>

      {/* Results */}
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Readout label="Upper nozzle" value={result.upper_bar} unit="bar" testId="flush-result-upper" />
        <Readout label="Lower nozzle" value={result.lower_bar} unit="bar" testId="flush-result-lower" />
        <Readout label="Base" value={result.base_bar} unit="bar" testId="flush-result-base" />
      </div>

      <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-500">
        k<sub>mat</sub>: upper ×{result.k_mat_upper.toFixed(2)}, lower ×
        {result.k_mat_lower.toFixed(2)} &middot; clamp [{P_MIN_BAR}-{P_MAX_BAR}] bar &middot;
        high-taper threshold: {HIGH_TAPER_THRESHOLD_DEG}° &amp; {HIGH_TAPER_THICKNESS_MM} mm
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function NumField({
  label,
  unit,
  value,
  onChange,
  step,
  min,
  testId,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  testId: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-slate-500">
      <span>
        {label} <span className="text-slate-600 normal-case">({unit})</span>
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step ?? 1}
        min={min}
        className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-sm text-slate-200 focus:border-cyan-500/60 focus:outline-none"
        data-testid={testId}
      />
    </label>
  );
}

function Readout({
  label,
  value,
  unit,
  testId,
}: {
  label: string;
  value: number;
  unit: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2"
      data-testid={testId}
    >
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold text-cyan-300">
        {safeFixed(value, 1)}{' '}
        <span className="text-[10px] font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
