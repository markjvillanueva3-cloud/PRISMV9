/**
 * WedmSparkConditionMatrix — P2P-FULLSTACK-MS0/U-P2PFS48
 *
 * Editable matrix of per-material WEDM spark conditions, mirroring
 * WEDMMaterialSparkDatabaseEngine.SIGNATURES (12 canonical materials).
 * Operators can override peak current, pulse-on, gap voltage, and
 * MRR/wire-wear factors on a per-row basis before a job kicks off.
 *
 * Shape (per material, frontend-only mirror of the backend signature):
 *
 *   {
 *     key:                     "D2" | "A2" | "M2" | ...
 *     display_name:            string
 *     peak_current_nominal_A:  number
 *     pulse_on_nominal_us:     number
 *     gap_voltage_nominal_V:   number
 *     mrr_factor:              number   // relative to reference steel 1045 = 1.0
 *     wire_wear_factor:        number   // relative to reference = 1.0
 *     flags?:                  string[] // e.g. HIGH_CRACK_RISK
 *     debris_colour?:          string
 *   }
 *
 * Works in controlled (signatures + onChange) or uncontrolled
 * (defaultSignatures + internal state) mode. Per-row selectable;
 * `selectedKey` + `onSelect` let callers highlight the active job's
 * material. Invalid numeric edits (NaN, negative) mark the row
 * data-invalid='true' and are surfaced with an amber tone.
 */

import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type WedmSparkMaterialKey =
  | 'D2'
  | 'A2'
  | 'M2'
  | 'S7'
  | 'H13'
  | 'WC'
  | 'graphite'
  | 'Cu_C110'
  | 'Al_6061'
  | 'Ti6Al4V'
  | 'SS_304'
  | 'Inconel_718';

export interface WedmSparkSignatureRow {
  key: WedmSparkMaterialKey;
  display_name: string;
  peak_current_nominal_A: number;
  pulse_on_nominal_us: number;
  gap_voltage_nominal_V: number;
  mrr_factor: number;
  wire_wear_factor: number;
  flags?: string[];
  debris_colour?: string;
}

export type WedmSparkEditableField =
  | 'peak_current_nominal_A'
  | 'pulse_on_nominal_us'
  | 'gap_voltage_nominal_V'
  | 'mrr_factor'
  | 'wire_wear_factor';

// ============================================================================
// CANONICAL SEED (mirrors backend defaults — keep in sync)
// ============================================================================

export const CANONICAL_SPARK_SIGNATURES: WedmSparkSignatureRow[] = [
  {
    key: 'D2',
    display_name: 'D2 Cold-Work Tool Steel',
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 60,
    mrr_factor: 0.95,
    wire_wear_factor: 1.1,
    flags: ['HIGH_CRACK_RISK'],
    debris_colour: 'bluish-white',
  },
  {
    key: 'A2',
    display_name: 'A2 Air-Hardening Tool Steel',
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 54,
    mrr_factor: 0.97,
    wire_wear_factor: 1.05,
    debris_colour: 'white-yellow',
  },
  {
    key: 'M2',
    display_name: 'M2 High-Speed Steel',
    peak_current_nominal_A: 7,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 66,
    mrr_factor: 0.9,
    wire_wear_factor: 1.15,
    debris_colour: 'yellow-orange',
  },
  {
    key: 'S7',
    display_name: 'S7 Shock-Resistant Tool Steel',
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 58,
    mrr_factor: 0.98,
    wire_wear_factor: 1.05,
    debris_colour: 'white',
  },
  {
    key: 'H13',
    display_name: 'H13 Hot-Work Tool Steel',
    peak_current_nominal_A: 7,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 62,
    mrr_factor: 0.92,
    wire_wear_factor: 1.1,
    debris_colour: 'yellow',
  },
  {
    key: 'WC',
    display_name: 'Tungsten Carbide (WC-Co)',
    peak_current_nominal_A: 5,
    pulse_on_nominal_us: 6,
    gap_voltage_nominal_V: 80,
    mrr_factor: 0.45,
    wire_wear_factor: 2.0,
    flags: ['SLOW_CUT', 'COBALT_LEACH_RISK'],
    debris_colour: 'dark-grey',
  },
  {
    key: 'graphite',
    display_name: 'Graphite (EDM electrode)',
    peak_current_nominal_A: 10,
    pulse_on_nominal_us: 25,
    gap_voltage_nominal_V: 45,
    mrr_factor: 1.4,
    wire_wear_factor: 0.6,
    flags: ['DUST_HAZARD'],
    debris_colour: 'black',
  },
  {
    key: 'Cu_C110',
    display_name: 'Copper C110 (ETP)',
    peak_current_nominal_A: 6,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 40,
    mrr_factor: 1.25,
    wire_wear_factor: 0.8,
    debris_colour: 'orange-red',
  },
  {
    key: 'Al_6061',
    display_name: 'Aluminum 6061-T6',
    peak_current_nominal_A: 9,
    pulse_on_nominal_us: 12,
    gap_voltage_nominal_V: 42,
    mrr_factor: 1.6,
    wire_wear_factor: 0.7,
    debris_colour: 'silver-grey',
  },
  {
    key: 'Ti6Al4V',
    display_name: 'Titanium Ti-6Al-4V',
    peak_current_nominal_A: 6,
    pulse_on_nominal_us: 8,
    gap_voltage_nominal_V: 70,
    mrr_factor: 0.7,
    wire_wear_factor: 1.3,
    flags: ['FIRE_RISK_MQL'],
    debris_colour: 'blue-grey',
  },
  {
    key: 'SS_304',
    display_name: 'Stainless Steel 304',
    peak_current_nominal_A: 7,
    pulse_on_nominal_us: 10,
    gap_voltage_nominal_V: 56,
    mrr_factor: 0.88,
    wire_wear_factor: 1.1,
    debris_colour: 'white-grey',
  },
  {
    key: 'Inconel_718',
    display_name: 'Inconel 718',
    peak_current_nominal_A: 5,
    pulse_on_nominal_us: 8,
    gap_voltage_nominal_V: 72,
    mrr_factor: 0.55,
    wire_wear_factor: 1.5,
    flags: ['WORK_HARDENING'],
    debris_colour: 'dark-green',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmSparkConditionMatrixProps {
  /** Controlled mode: caller owns rows. */
  signatures?: WedmSparkSignatureRow[];
  onChange?: (next: WedmSparkSignatureRow[]) => void;
  /** Uncontrolled mode: seed rows for internal state. */
  defaultSignatures?: WedmSparkSignatureRow[];
  /** Optional highlight for a particular material. */
  selectedKey?: WedmSparkMaterialKey;
  onSelect?: (key: WedmSparkMaterialKey) => void;
  /** Show compact 3-column view (no flags/debris). */
  compact?: boolean;
}

export function WedmSparkConditionMatrix({
  signatures,
  onChange,
  defaultSignatures,
  selectedKey,
  onSelect,
  compact = false,
}: WedmSparkConditionMatrixProps) {
  const [internal, setInternal] = useState<WedmSparkSignatureRow[]>(
    defaultSignatures ?? CANONICAL_SPARK_SIGNATURES,
  );
  const isControlled = signatures !== undefined;
  const rows = isControlled ? (signatures as WedmSparkSignatureRow[]) : internal;

  function update(
    key: WedmSparkMaterialKey,
    field: WedmSparkEditableField,
    raw: string,
  ): void {
    const parsed = Number(raw);
    const next = rows.map((r) =>
      r.key === key ? { ...r, [field]: parsed } : r,
    );
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function reset(key: WedmSparkMaterialKey): void {
    const canonical = CANONICAL_SPARK_SIGNATURES.find((r) => r.key === key);
    if (!canonical) return;
    const next = rows.map((r) => (r.key === key ? { ...canonical } : r));
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  const invalidCount = rows.filter(isInvalidRow).length;

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-4 py-3"
      role="region"
      aria-label={`WEDM spark condition matrix: ${rows.length} materials, ${invalidCount} invalid`}
      data-testid="wedm-spark-condition-matrix"
      data-row-count={rows.length}
      data-invalid-count={invalidCount}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Spark conditions
          <span className="ml-2 text-[10px] normal-case text-slate-500">
            &middot; {rows.length} materials
          </span>
        </div>
        {invalidCount > 0 && (
          <div
            className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
            data-testid="spark-invalid-chip"
          >
            {invalidCount} invalid
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700/40">
        <table className="w-full border-collapse text-[11px]" data-testid="spark-table">
          <thead className="bg-slate-900/60 text-[9px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Material</th>
              <th className="px-2 py-1 text-right">I_p (A)</th>
              <th className="px-2 py-1 text-right">t_on (µs)</th>
              <th className="px-2 py-1 text-right">V_gap (V)</th>
              <th className="px-2 py-1 text-right">MRR&times;</th>
              <th className="px-2 py-1 text-right">Wear&times;</th>
              {!compact && <th className="px-2 py-1 text-left">Notes</th>}
              <th className="px-2 py-1 text-right">Reset</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const invalid = isInvalidRow(r);
              const selected = selectedKey === r.key;
              return (
                <tr
                  key={r.key}
                  className={`border-t border-slate-700/30 ${
                    selected ? 'bg-cyan-950/30' : invalid ? 'bg-amber-950/15' : 'hover:bg-slate-800/30'
                  }`}
                  data-testid="spark-row"
                  data-material-key={r.key}
                  data-invalid={invalid ? 'true' : 'false'}
                  data-selected={selected ? 'true' : 'false'}
                >
                  <td className="px-2 py-1 text-slate-200">
                    <button
                      type="button"
                      onClick={() => onSelect?.(r.key)}
                      className="text-left hover:text-cyan-300 disabled:cursor-default disabled:hover:text-slate-200"
                      disabled={!onSelect}
                      data-testid={`spark-select-${r.key}`}
                    >
                      {r.display_name}
                    </button>
                  </td>
                  <Cell
                    value={r.peak_current_nominal_A}
                    onChange={(v) => update(r.key, 'peak_current_nominal_A', v)}
                    testId={`spark-input-${r.key}-ip`}
                  />
                  <Cell
                    value={r.pulse_on_nominal_us}
                    onChange={(v) => update(r.key, 'pulse_on_nominal_us', v)}
                    testId={`spark-input-${r.key}-ton`}
                  />
                  <Cell
                    value={r.gap_voltage_nominal_V}
                    onChange={(v) => update(r.key, 'gap_voltage_nominal_V', v)}
                    testId={`spark-input-${r.key}-vgap`}
                  />
                  <Cell
                    value={r.mrr_factor}
                    onChange={(v) => update(r.key, 'mrr_factor', v)}
                    step={0.05}
                    testId={`spark-input-${r.key}-mrr`}
                  />
                  <Cell
                    value={r.wire_wear_factor}
                    onChange={(v) => update(r.key, 'wire_wear_factor', v)}
                    step={0.05}
                    testId={`spark-input-${r.key}-wear`}
                  />
                  {!compact && (
                    <td className="px-2 py-1 text-[10px] text-slate-400">
                      {(r.flags ?? []).map((f) => (
                        <span
                          key={f}
                          className="mr-1 rounded bg-rose-900/40 px-1 py-0.5 text-[9px] font-bold uppercase text-rose-300"
                          data-testid={`spark-flag-${r.key}`}
                        >
                          {f}
                        </span>
                      ))}
                      {r.debris_colour && (
                        <span className="text-slate-500">{r.debris_colour}</span>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => reset(r.key)}
                      className="text-[9px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
                      data-testid={`spark-reset-${r.key}`}
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-500">
        Source: Klocke 2013 &middot; DiBitonto 1989 &middot; WEDMMaterialSparkDatabaseEngine
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Cell({
  value,
  onChange,
  step,
  testId,
}: {
  value: number;
  onChange: (raw: string) => void;
  step?: number;
  testId: string;
}) {
  const invalid = !Number.isFinite(value) || value < 0;
  return (
    <td className="px-1 py-0.5 text-right">
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        step={step ?? 1}
        className={`w-full rounded border bg-slate-900/50 px-1.5 py-0.5 text-right font-mono text-[11px] focus:outline-none ${
          invalid
            ? 'border-amber-500/60 text-amber-300'
            : 'border-slate-700/40 text-slate-200 focus:border-cyan-500/60'
        }`}
        data-testid={testId}
        data-invalid={invalid ? 'true' : 'false'}
      />
    </td>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function isInvalidRow(r: WedmSparkSignatureRow): boolean {
  return (
    !Number.isFinite(r.peak_current_nominal_A) ||
    r.peak_current_nominal_A < 0 ||
    !Number.isFinite(r.pulse_on_nominal_us) ||
    r.pulse_on_nominal_us < 0 ||
    !Number.isFinite(r.gap_voltage_nominal_V) ||
    r.gap_voltage_nominal_V < 0 ||
    !Number.isFinite(r.mrr_factor) ||
    r.mrr_factor < 0 ||
    !Number.isFinite(r.wire_wear_factor) ||
    r.wire_wear_factor < 0
  );
}
