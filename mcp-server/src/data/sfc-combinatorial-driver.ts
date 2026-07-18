/**
 * SFC combinatorial harness DRIVER -- the run loop that ties the harness together.
 * For each sampled cell (U-CSFH-04) it: maps the cell to an UltimateSpeedFeedInput,
 * runs the SFC engine, applies the per-cell GATES (U-CSFH-05), attaches a cited
 * vendor row (U-CSFH-03), and emits one DrivenCell record. The output is the
 * dataset U-CSFH-07/08 compare + derive baseline params from.
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-06-DRIVER (slot:oscar, 2026-06-11).
 *
 * DI by design: `UltimateSpeedFeedEngine.calculate()` is ~2.5s/call (foxtrot perf
 * bug) so a full 1716-cell run is ~70 min -- impractical in a test. The driver
 * takes an injected `CalculatorProvider` (tests use a fast fake; `withRealEngine()`
 * wires the real `ultimateSpeedFeedEngine`) + an explicit `maxCells` cap so a
 * real-data E2E runs a tiny capped N. It records per-cell errors fail-loud and
 * NEVER fabricates a result -- an engine throw yields a `driven:false` record, not
 * a default. Lives in `src/data/` with the CSFH family (no test-tree dependency,
 * out of the engine orphan-block until U-CSFH-10 dispatcher-wire).
 *
 * No physics constants here (it orchestrates; the engine computes, the gates
 * inspect, the datasource cites).
 */
import type { SampledCell } from "./sfc-combinatorial-sampler.js";
import { CombinatorialCellSamplerEngine, type SamplerOptions } from "./sfc-combinatorial-sampler.js";
import { gateCell, type CellGateVerdict, type GateStatus } from "./sfc-combinatorial-gates.js";
import {
  SpeedFeedCombinatorialDataSourceEngine,
  type CitedDataRow,
  type DataSourceCellQuery,
} from "./sfc-combinatorial-datasource.js";
import type { UltimateSpeedFeedInput, UltimateSpeedFeedResult } from "../engines/UltimateSpeedFeedEngine.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

/** Minimal engine contract -- the real engine satisfies it; tests inject a fast fake. */
export interface CalculatorProvider {
  calculate(input: UltimateSpeedFeedInput): UltimateSpeedFeedResult;
}

/** One fully-driven cell: input + engine summary + gate verdict + citation. */
export interface DrivenCell {
  /** false when the engine threw (recorded in `error`); summary/gate/citation null. */
  driven: boolean;
  sample: SampledCell;
  /** The compact engine outputs the comparison + baseline derivation consume. */
  summary: {
    cutting_speed_mpm: number;
    spindle_rpm: number;
    feed_rate_mmmin: number;
    mrr_cm3min: number;
    resultant_force_N: number;
    required_power_kw: number;
  } | null;
  gate: CellGateVerdict | null;
  citation: CitedDataRow;
  error: string | null;
}

/** Per-cell vendor context for citation (manufacturer/series the cell maps to). */
export type VendorContextFn = (s: SampledCell) => Pick<DataSourceCellQuery, "manufacturer" | "tool_id_or_series">;

export interface DriveOptions extends SamplerOptions {
  /** Hard cap on cells driven (the engine is slow); default = all sampled. */
  maxCells?: number;
  /**
   * Optional per-cell vendor context for citation. Most sampled cells carry no
   * manufacturer/series (the sampler is tool-agnostic) so citation is usually
   * unresolved -- that is the vendor-coverage-gap signal, not an error.
   */
  vendorContext?: VendorContextFn;
  /**
   * Run the engine in FAST bulk mode (U-FT-01: skips the per-call outcome-capture
   * emission). Use for offline full-space sweeps where the per-cell ledger append would
   * dominate wall-clock and pollute the shop-floor learning ledger with synthetic cells.
   */
  fastBulk?: boolean;
}

/** Options for {@link CombinatorialSpeedFeedHarnessDriver.driveCells}. */
export interface DriveCellsOptions {
  vendorContext?: VendorContextFn;
  fastBulk?: boolean;
}

export interface DriveResult {
  records: DrivenCell[];
  drivenCount: number;
  errorCount: number;
  /** gate-overall tallies across driven cells (keyed by GateStatus -- exhaustive). */
  gateTally: Record<GateStatus, number>;
  /** how many driven cells got a tool-specific vendor citation. */
  citedCount: number;
  total: number;
}

export class CombinatorialSpeedFeedHarnessDriver {
  constructor(
    private readonly calculator: CalculatorProvider,
    private readonly dataSource: SpeedFeedCombinatorialDataSourceEngine,
  ) {}

  /** Production wiring: the real SFC engine + the real romeo vendor provider. */
  static withRealEngine(): CombinatorialSpeedFeedHarnessDriver {
    return new CombinatorialSpeedFeedHarnessDriver(
      ultimateSpeedFeedEngine,
      SpeedFeedCombinatorialDataSourceEngine.withRealProviders(),
    );
  }

  /** Map a sampled cell to the engine's input contract (1:1, no fabricated fields). */
  static toInput(s: SampledCell): UltimateSpeedFeedInput {
    return {
      material: s.representative_material,
      iso_group: s.iso_group,
      hardness_hb: s.hardness_hb,
      tool_diameter_mm: s.diameter_mm,
      flutes: s.flutes,
      tool_material: s.tool_material,
      operation: s.operation,
      cut_type: s.cut_type,
      strategy: s.strategy,
      machine_power_kw: s.machine_power_kw,
      coolant: s.coolant,
    };
  }

  /** Project the full engine result down to the fields the gates + compare consume. */
  private static toSummary(r: UltimateSpeedFeedResult): NonNullable<DrivenCell["summary"]> {
    return {
      cutting_speed_mpm: r.cutting_speed.value,
      spindle_rpm: r.spindle_rpm.value,
      feed_rate_mmmin: r.feed_rate.value,
      mrr_cm3min: r.mrr.value,
      resultant_force_N: r.forces.resultant_force_N.value,
      required_power_kw: r.power.required_power_kw.value,
    };
  }

  /**
   * Run the harness over the sampled cell space.
   * @param opts seed/floor (forwarded to the sampler) + maxCells cap + vendorContext.
   * @returns the driven records + tallies. The full `UltimateSpeedFeedResult` is the
   *   gate input (structurally assignable to GateableResult); only the summary is kept.
   */
  drive(opts: DriveOptions = {}): DriveResult {
    const { samples } = CombinatorialCellSamplerEngine.sample(opts);
    const cells = opts.maxCells !== undefined ? samples.slice(0, Math.max(0, opts.maxCells)) : samples;
    return this.driveCells(cells, { vendorContext: opts.vendorContext, fastBulk: opts.fastBulk });
  }

  /**
   * Drive an EXPLICIT cell list -- the full-space batch sweep (U-FT-04) enumerates its
   * slice via `enumerateRange()` and drives it here, rather than letting the sampler draw
   * a stratified subset. Identical per-cell pipeline to {@link drive} (engine -> gates ->
   * citation -> DrivenCell), so the produced DrivenCell[] is reducer-identical (U-FT-06
   * `compareRecords` consumes it the same way). `opts.fastBulk` threads U-FT-01's FAST
   * flag into the engine call. Fail-loud per cell: an engine throw yields a `driven:false`
   * record (the error preserved), never a fabricated default.
   */
  driveCells(cells: readonly SampledCell[], opts: DriveCellsOptions = {}): DriveResult {
    const records: DrivenCell[] = [];
    // Record<GateStatus,...> so a future GateStatus literal forces this initializer
    // to be updated at compile time (a bare object would silently NaN the new key).
    const gateTally: Record<GateStatus, number> = { pass: 0, honest_limited: 0, fail: 0 };
    let drivenCount = 0;
    let errorCount = 0;
    let citedCount = 0;

    for (const sample of cells) {
      const vc = opts.vendorContext?.(sample) ?? {};
      const citation = this.dataSource.resolveCell({
        iso_group: sample.iso_group,
        diameter_mm: sample.diameter_mm,
        manufacturer: vc.manufacturer,
        tool_id_or_series: vc.tool_id_or_series,
      });
      if (citation.resolved) citedCount++;

      try {
        const input = CombinatorialSpeedFeedHarnessDriver.toInput(sample);
        // UltimateSpeedFeedResult is structurally assignable to GateableResult (every
        // field the gate reads -- cutting_speed/spindle_rpm/feed_rate/mrr/forces/power/
        // stability/inferred_parameters/warnings -- is present with a compatible wider
        // type), so it passes directly with no cast.
        const result = this.calculator.calculate(opts.fastBulk ? { ...input, fast_bulk: true } : input);
        const gate = gateCell(result);
        gateTally[gate.overall]++;
        drivenCount++;
        records.push({
          driven: true,
          sample,
          summary: CombinatorialSpeedFeedHarnessDriver.toSummary(result),
          gate,
          citation,
          error: null,
        });
      } catch (e) {
        errorCount++;
        records.push({
          driven: false,
          sample,
          summary: null,
          gate: null,
          citation,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return {
      records,
      drivenCount,
      errorCount,
      gateTally,
      citedCount,
      total: cells.length,
    };
  }
}
