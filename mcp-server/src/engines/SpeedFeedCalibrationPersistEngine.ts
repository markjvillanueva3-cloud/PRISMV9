/**
 * SpeedFeedCalibrationPersistEngine — OSCAR-SFC-9AXIS-MS0 / U-OSC-CALIB-PERSIST
 * ============================================================================
 *
 * The closed-loop TRAINING layer's durable foundation: turns the full-sweep
 * comparison ledger (PRISM vs the 5-vendor baseline + live G-Wizard/HSMAdvisor,
 * emitted by scripts/sfc-full-sweep-compare.mjs) into a SCHEMA-VERSIONED,
 * persisted per-(ISO-group × optimization-mode) calibration model.
 *
 * SAFETY POSTURE (R12 + speed-feed soul refuse-list): this engine DERIVES and
 * PERSISTS observed calibration factors — it NEVER auto-applies them. The
 * full-sweep showed PRISM runs CONSERVATIVE (below the vendor-DB baseline) on
 * P/M/N — the SAFE direction. A factor that pushes PRISM toward the baseline
 * would make it MORE aggressive against an un-safety-validated target, so
 * application stays operator-gated (PRISM_SFC_CALIB_APPLY default-OFF,
 * S(x) >= 0.98 gate — a separate downstream apply-wire unit). This layer only
 * records "here is how far PRISM sits from the consensus, per regime" so the
 * GPU/Blackwell training layer + a human have a durable, inspectable artifact.
 *
 * A calibration factor is multiplicative on Vc: factor 1.0 = no change;
 * factor < 1.0 = PRISM already conservative vs baseline (recorded, not pushed
 * up); factor > 1.0 = PRISM aggressive vs baseline. We CLAMP factors to a
 * conservative band and flag any that would increase Vc, so a downstream
 * apply can refuse the unsafe ones.
 *
 * Pure I/O + arithmetic — no physics re-implemented, no GPU, no network.
 *
 * @module engines/SpeedFeedCalibrationPersistEngine
 */

import fs from "node:fs";
import path from "node:path";

/** One row of the full-sweep comparison ledger (sfc-full-sweep-compare.mjs). */
export interface SweepLedgerRow {
  cell_id: string;
  domain: string;
  iso: string;
  material: string;
  tool_diameter_mm: number;
  mode: string;
  prism_vc_mpm: number | null;
  baseline_vc_mpm: number | null;
  gwizard_vc_mpm: number | null;
  gwizard_aligned: boolean | null;
  hsmadvisor_vc_mpm: number | null;
  hsmadvisor_aligned: boolean | null;
  consensus_vc_mpm: number | null;
}

/** Per-(ISO × mode) derived calibration entry. */
export interface CalibrationEntry {
  iso: string;
  mode: string;
  /** Number of ledger cells backing this entry. */
  sample_count: number;
  /** Median PRISM-vs-baseline delta, percent (negative = PRISM conservative). */
  median_delta_pct: number;
  /**
   * Multiplicative Vc factor that WOULD align PRISM to the baseline median.
   * Recorded for inspection; clamped to [CLAMP_MIN, CLAMP_MAX].
   */
  factor: number;
  /** True if applying this factor would INCREASE PRISM's Vc (aggressive — unsafe-leaning). */
  increases_vc: boolean;
  /** Were the factor pre-clamp value out of the conservative band? */
  clamped: boolean;
}

export interface CalibrationModel {
  schemaVersion: string;
  generated_from: string; // ledger path
  ledger_rows_consumed: number;
  total_cells: number;
  /**
   * Ledger lines that were present but UNUSABLE (blank/torn JSONL, or a row with
   * no finite positive baseline). Surfaced so a silent large-scale corruption —
   * e.g. an encoding flip dropping most rows, or a producer schema rename — is
   * LOUD in the artifact, not hidden behind a quietly-shrunken sample_count.
   */
  ledger_rows_skipped: number;
  entries: CalibrationEntry[];
  /** Advisory: factors are NEVER auto-applied; apply is operator-gated + S(x). */
  apply_policy: "advisory-only";
  notes: string[];
}

const SCHEMA_VERSION = "1.0.0";
// Conservative clamp band — a single noisy regime can't ask for a wild scale.
const CLAMP_MIN = 0.5;
const CLAMP_MAX = 1.5;

export class SpeedFeedCalibrationPersistEngine {
  /**
   * Parse a JSONL sweep ledger into rows. Skips blank/torn lines (never throws
   * on a single bad row — fail-soft per the append-only-log contract).
   *
   * @param text raw JSONL contents
   * @returns the successfully-parsed rows
   */
  parseLedger(text: string): SweepLedgerRow[] {
    const rows: SweepLedgerRow[] = [];
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const r = JSON.parse(t) as SweepLedgerRow;
        if (typeof r.iso === "string" && typeof r.mode === "string") rows.push(r);
      } catch {
        /* torn/partial trailing line — skip */
      }
    }
    return rows;
  }

  /**
   * Derive a per-(ISO × mode) calibration model from sweep ledger rows.
   * Only cells with a finite PRISM Vc AND a finite positive baseline Vc count
   * (a missing baseline — e.g. titanium/hardened with no vendor DB match —
   * cannot anchor a factor and is excluded, not fabricated).
   *
   * @param rows parsed sweep ledger rows
   * @param ledgerPath provenance string for the model
   * @returns the derived, schema-versioned calibration model
   */
  derive(rows: SweepLedgerRow[], ledgerPath: string): CalibrationModel {
    const groups = new Map<string, number[]>(); // "iso|mode" -> deltaPct[]
    let usable = 0;
    for (const r of rows) {
      if (
        typeof r.prism_vc_mpm === "number" &&
        Number.isFinite(r.prism_vc_mpm) &&
        typeof r.baseline_vc_mpm === "number" &&
        Number.isFinite(r.baseline_vc_mpm) &&
        r.baseline_vc_mpm > 0
      ) {
        const deltaPct = ((r.prism_vc_mpm - r.baseline_vc_mpm) / r.baseline_vc_mpm) * 100;
        const key = `${r.iso}|${r.mode}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(deltaPct);
        usable++;
      }
    }
    // Rows that survived parseLedger but carry no usable baseline (no-vendor-match,
    // zero/negative baseline, schema drift). Surfaced for observability — see notes.
    const skipped = rows.length - usable;

    const entries: CalibrationEntry[] = [];
    for (const [key, deltas] of [...groups.entries()].sort()) {
      const [iso, mode] = key.split("|");
      const medianDelta = this.median(deltas);
      // Factor that would move PRISM to the baseline: baseline = prism / (1 + d/100)
      // ⇒ to hit baseline, multiply prism by (1 / (1 + d/100)).
      const rawFactor = 1 / (1 + medianDelta / 100);
      // clamped = the conservative band actually bit. Test rawFactor against the
      // band directly — NOT factor !== round(rawFactor), which falsely flagged an
      // UNclamped non-terminating factor (e.g. -25% → 1.3333…) as clamped.
      const clamped = rawFactor < CLAMP_MIN || rawFactor > CLAMP_MAX;
      const factor = Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, rawFactor));
      entries.push({
        iso: iso!,
        mode: mode!,
        sample_count: deltas.length,
        median_delta_pct: Number(medianDelta.toFixed(2)),
        factor: Number(factor.toFixed(4)),
        increases_vc: factor > 1.0,
        clamped,
      });
    }

    const aggressiveCount = entries.filter((e) => e.increases_vc).length;
    const notes: string[] = [
      "Factors are ADVISORY — never auto-applied. Apply is operator-gated " +
        "(PRISM_SFC_CALIB_APPLY default-OFF) + S(x) >= 0.98 safety gate.",
      `${aggressiveCount} of ${entries.length} regimes have factor > 1.0 ` +
        "(would INCREASE Vc / make PRISM more aggressive vs an un-safety-validated " +
        "vendor baseline) — a downstream apply MUST refuse these without explicit review.",
      "Regimes with no vendor baseline (e.g. titanium/hardened) are excluded, not fabricated.",
      `${skipped} of ${rows.length} ledger rows were UNUSABLE (no finite positive baseline).`,
    ];
    // Fail LOUD on total wipe-out: cells present but ZERO usable. The likely cause
    // is a producer schema rename (e.g. baseline_vc_mpm dropped) — without this note
    // the model would look valid-but-empty and a silent corruption would pass unseen.
    if (rows.length > 0 && usable === 0) {
      notes.unshift(
        "WARNING: 0 usable rows out of " +
          rows.length +
          " — every ledger row lacked a finite positive baseline. Likely a producer " +
          "schema drift (sfc-full-sweep-compare.mjs row shape changed) or an empty-baseline " +
          "corpus. The model below is EMPTY; do NOT treat it as a calibration result.",
      );
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      generated_from: ledgerPath,
      ledger_rows_consumed: usable,
      ledger_rows_skipped: skipped,
      total_cells: rows.length,
      entries,
      apply_policy: "advisory-only",
      notes,
    };
  }

  /**
   * Persist a calibration model to a schema-versioned JSON file (atomic write).
   *
   * @param model the derived calibration model
   * @param outPath destination JSON path
   */
  persist(model: CalibrationModel, outPath: string): void {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${outPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(model, null, 2), "utf8");
    try {
      fs.renameSync(tmp, outPath);
    } catch (e) {
      // rename failed (cross-device, dir removed mid-op) — never leave a tmp orphan.
      try {
        fs.rmSync(tmp, { force: true });
      } catch {
        /* best-effort cleanup */
      }
      throw e;
    }
  }

  /**
   * End-to-end: read a sweep ledger, derive the model, persist it.
   *
   * @param ledgerPath path to the JSONL sweep ledger
   * @param outPath destination for the calibration model JSON
   * @returns the derived model (also written to outPath)
   */
  buildFromLedgerFile(ledgerPath: string, outPath: string): CalibrationModel {
    if (!fs.existsSync(ledgerPath)) {
      throw new Error(`SpeedFeedCalibrationPersist: ledger not found at ${ledgerPath}`);
    }
    const rows = this.parseLedger(fs.readFileSync(ledgerPath, "utf8"));
    const model = this.derive(rows, ledgerPath);
    this.persist(model, outPath);
    return model;
  }

  private median(xs: number[]): number {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
  }

  static getSelfAwareness() {
    return {
      name: "SpeedFeedCalibrationPersistEngine",
      milestone: "OSCAR-SFC-9AXIS-MS0/U-OSC-CALIB-PERSIST",
      capabilities: ["parseLedger", "derive", "persist", "buildFromLedgerFile"],
      apply_policy: "advisory-only (operator-gated apply, never auto)",
    };
  }
}

export const speedFeedCalibrationPersistEngine = new SpeedFeedCalibrationPersistEngine();
