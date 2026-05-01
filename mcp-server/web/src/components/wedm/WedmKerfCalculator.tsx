/**
 * WedmKerfCalculator — P2P-FULLSTACK-MS0/U-P2PFS47
 *
 * Inline, self-contained WEDM kerf / overcut / offset preview.
 *
 * Physics (zeroth-order client-side model; matches WEDMKerfWidthEngine):
 *
 *     overcut_mm = k × √(I_p × t_on)
 *     kerf_mm    = wire_dia + 2 × overcut
 *     offset_mm  = wire_dia/2 + overcut         (per-side tool-path offset)
 *
 * Constant `k` is the dielectric-normalized gap coefficient, with default
 * 0.015 mm / √(A·µs) for brass wire in DI water (Kunieda 2005 Table 3,
 * narrowed per JM Die MV2400S calibration). A `k_override` prop lets
 * callers swap in a machine-specific calibration without touching the
 * component.
 *
 * Widget supports two modes:
 *   - Controlled: caller passes `inputs` and `onChange`; widget is a dumb
 *     view + form emitter.
 *   - Uncontrolled: caller passes only `defaultInputs`; widget manages
 *     its own state via useState.
 *
 * Inputs are validated on-render; invalid values render em-dash results
 * and a warning chip. No backend roundtrip.
 */

import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface WedmKerfCalculatorInputs {
  wire_diameter_mm: number;
  peak_current_A: number;
  pulse_on_us: number;
}

export interface WedmKerfCalculatorResult {
  kerf_mm: number;
  overcut_mm: number;
  offset_mm: number;
  /** True if all inputs were finite positives; false triggers em-dash display. */
  valid: boolean;
  /** Dielectric-normalized gap coefficient actually used. */
  k: number;
}

// ============================================================================
// PHYSICS
// ============================================================================

/** Default brass-in-DI-water calibration (Kunieda 2005; JM Die fit). */
export const DEFAULT_KERF_K = 0.015;

export function computeKerf(
  inputs: WedmKerfCalculatorInputs,
  k: number = DEFAULT_KERF_K,
): WedmKerfCalculatorResult {
  const { wire_diameter_mm, peak_current_A, pulse_on_us } = inputs;
  const valid =
    Number.isFinite(wire_diameter_mm) &&
    wire_diameter_mm > 0 &&
    Number.isFinite(peak_current_A) &&
    peak_current_A > 0 &&
    Number.isFinite(pulse_on_us) &&
    pulse_on_us > 0 &&
    Number.isFinite(k) &&
    k > 0;

  if (!valid) {
    return { kerf_mm: NaN, overcut_mm: NaN, offset_mm: NaN, valid: false, k };
  }

  const overcut_mm = k * Math.sqrt(peak_current_A * pulse_on_us);
  const kerf_mm = wire_diameter_mm + 2 * overcut_mm;
  const offset_mm = wire_diameter_mm / 2 + overcut_mm;

  return {
    kerf_mm: round3(kerf_mm),
    overcut_mm: round3(overcut_mm),
    offset_mm: round3(offset_mm),
    valid: true,
    k,
  };
}

function round3(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x;
}

function safeFixed(v: number | null | undefined, decimals: number): string {
  if (v == null || !Number.isFinite(v)) return '\u2014';
  return v.toFixed(decimals);
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmKerfCalculatorProps {
  /** Controlled mode: caller owns the input state. */
  inputs?: WedmKerfCalculatorInputs;
  onChange?: (inputs: WedmKerfCalculatorInputs) => void;
  /** Uncontrolled mode: initial input values. */
  defaultInputs?: Partial<WedmKerfCalculatorInputs>;
  /** Optional override for the gap coefficient k. */
  k_override?: number;
}

const DEFAULT_INPUTS: WedmKerfCalculatorInputs = {
  wire_diameter_mm: 0.25,
  peak_current_A: 10,
  pulse_on_us: 20,
};

export function WedmKerfCalculator({
  inputs,
  onChange,
  defaultInputs,
  k_override,
}: WedmKerfCalculatorProps) {
  const [internal, setInternal] = useState<WedmKerfCalculatorInputs>({
    ...DEFAULT_INPUTS,
    ...defaultInputs,
  });
  const isControlled = inputs !== undefined;
  const current = isControlled ? (inputs as WedmKerfCalculatorInputs) : internal;

  const k = k_override != null && Number.isFinite(k_override) && k_override > 0
    ? k_override
    : DEFAULT_KERF_K;
  const result = computeKerf(current, k);

  function update<K extends keyof WedmKerfCalculatorInputs>(
    key: K,
    raw: string,
  ): void {
    const parsed = Number(raw);
    const next: WedmKerfCalculatorInputs = { ...current, [key]: parsed };
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <div
      className={`rounded-2xl border ${
        result.valid ? 'border-slate-700/40' : 'border-amber-500/40'
      } bg-[#0c1522] px-4 py-3`}
      role="region"
      aria-label={`WEDM kerf calculator: kerf ${safeFixed(result.kerf_mm, 3)} mm`}
      data-testid="wedm-kerf-calculator"
      data-valid={result.valid ? 'true' : 'false'}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Kerf &middot; overcut &middot; offset
        </div>
        {!result.valid && (
          <div
            className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
            data-testid="kerf-invalid-badge"
          >
            Invalid input
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid gap-2 md:grid-cols-3">
        <Field
          label="Wire Ø"
          unit="mm"
          value={current.wire_diameter_mm}
          onChange={(v) => update('wire_diameter_mm', v)}
          step={0.01}
          min={0}
          testId="kerf-input-wire-dia"
        />
        <Field
          label="Peak current"
          unit="A"
          value={current.peak_current_A}
          onChange={(v) => update('peak_current_A', v)}
          step={0.5}
          min={0}
          testId="kerf-input-peak-current"
        />
        <Field
          label="Pulse-on"
          unit="µs"
          value={current.pulse_on_us}
          onChange={(v) => update('pulse_on_us', v)}
          step={1}
          min={0}
          testId="kerf-input-pulse-on"
        />
      </div>

      {/* Results */}
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Readout label="Kerf width" value={result.kerf_mm} unit="mm" testId="kerf-result-kerf" />
        <Readout label="Overcut / side" value={result.overcut_mm} unit="mm" testId="kerf-result-overcut" />
        <Readout label="Wire offset" value={result.offset_mm} unit="mm" testId="kerf-result-offset" />
      </div>

      <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-500">
        Formula: overcut = k &middot; &radic;(I<sub>p</sub>&middot;t<sub>on</sub>); kerf = Ø + 2·overcut &mdash; Kunieda 2005 &middot; k={k.toFixed(4)}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Field({
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
  onChange: (raw: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        step={step}
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
        {safeFixed(value, 3)} <span className="text-[10px] font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
