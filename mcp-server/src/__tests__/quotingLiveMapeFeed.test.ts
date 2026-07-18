/**
 * quotingLiveMapeFeed.test.ts -- U-QP-LIVE-MAPE-FEED (slot:charlie, Lever 2).
 *
 * U-QP-CI-CALIBRATION-AWARE (Lever 3) made the InstantQuote CI95 band floor at an
 * observed quote-vs-actual MAPE -- but `observed_mape_pct` was an input that NO live
 * caller ever populated, so the calibration-aware band ran theory-only on every real
 * quote. This unit connects the closed loop's measured error to the live band via a
 * freshness + provenance GATE so the band tightens/widens with real (predicted, actual)
 * history and never on stale/synthetic/dry-run data.
 *
 * R9 + the "never assume data-file contents" rule: every fixture below mirrors the REAL
 * producer contract -- the shape written by buildTrainingStatusSnapshot in
 * scripts/quoting-train-cycle.mjs and present in the live latest-training-status.json:
 *   - baseline_fallback     : null (no fallback) | OBJECT (fallback used) -- NEVER boolean
 *   - data_source_coverage  : OBJECT { coverage_pct: 0-100, ... }
 *   - safe_to_activate      : boolean ; skip_reason : string | null
 * An earlier draft fabricated the wrong shape (number coverage, boolean fallback); the
 * 3-of-3 scrutiny gate caught that the production wire was structurally dead while the
 * fabricated-shape tests were green. These fixtures are the corrected, real shape.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gateObservedMape,
  quotingActiveFactorLoaderEngine,
} from "../engines/QuotingActiveFactorLoaderEngine.js";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";

// A snapshot in the REAL producer shape that passes EVERY gate: fresh, real (no
// baseline fallback), activation-eligible, non-dry-run, well-covered, with a MAPE.
function goodSnapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    ts_iso: new Date().toISOString(),
    mape_pct: 32.5,
    safe_to_activate: true,
    skip_reason: null,
    baseline_fallback: null, // null == real distribution, not bootstrap
    data_source_coverage: { consumed_count: 3, available_count: 5, coverage_pct: 60, unconsumed_available: [] },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// gateObservedMape -- the pure freshness + provenance gate (real-shape fixtures)
// ---------------------------------------------------------------------------

describe("gateObservedMape -- admits ONLY fresh + real + activatable + covered MAPE", () => {
  it("admits a fresh, real, activatable, well-covered MAPE verbatim", () => {
    const r = gateObservedMape(goodSnapshot(), 10 /* min, fresh */);
    expect(r.mape_pct).toBe(32.5);
    expect(r.reason).toMatch(/admitted/i);
  });

  it("age exactly at the 24h boundary is still admitted; one minute past is refused", () => {
    expect(gateObservedMape(goodSnapshot(), 1440).mape_pct).toBe(32.5); // boundary inclusive
    expect(gateObservedMape(goodSnapshot(), 1441).mape_pct).toBeNull(); // one min past -> stale
  });

  it("coverage_pct exactly at the 40% floor is admitted; 39% is refused", () => {
    expect(
      gateObservedMape(goodSnapshot({ data_source_coverage: { coverage_pct: 40 } }), 10).mape_pct,
    ).toBe(32.5);
    const r = gateObservedMape(goodSnapshot({ data_source_coverage: { coverage_pct: 39 } }), 10);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/coverage_pct/i);
  });

  // ---- refusal paths: every one must return null with a traceable reason ----
  it("undefined age (unparseable ts_iso) is REFUSED (freshness cannot be confirmed)", () => {
    const r = gateObservedMape(goodSnapshot(), undefined);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/freshness-unknown/i);
  });

  it("stale snapshot is REFUSED (loop may be dead)", () => {
    const r = gateObservedMape(goodSnapshot(), 60 * 48 /* 48h */);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/stale/i);
  });

  it("safe_to_activate=false is REFUSED (the cycle itself said do-not-activate)", () => {
    const r = gateObservedMape(goodSnapshot({ safe_to_activate: false }), 10);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/safe_to_activate/i);
  });

  it("a dry-run skip_reason is REFUSED (the live snapshot's exact failure mode)", () => {
    const r = gateObservedMape(
      goodSnapshot({ skip_reason: "writeIfSafe=false (dry-run mode)" }),
      10,
    );
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/skip_reason/i);
  });

  it("a non-null baseline_fallback OBJECT is REFUSED (bootstrap distribution, not real pairs)", () => {
    const r = gateObservedMape(
      goodSnapshot({ baseline_fallback: { configured: "x", used: "y", configured_refused: true } }),
      10,
    );
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/baseline_fallback/i);
  });

  it("an ABSENT baseline_fallback is REFUSED (cannot confirm real provenance)", () => {
    const snap = goodSnapshot();
    delete snap.baseline_fallback;
    const r = gateObservedMape(snap, 10);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/baseline_fallback/i);
  });

  it("coverage as a number (the OLD wrong shape) is REFUSED -- not an object with coverage_pct", () => {
    // Guards against a regression to the fabricated-shape bug the scrutiny gate caught.
    const r = gateObservedMape(goodSnapshot({ data_source_coverage: 0.8 }), 10);
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/coverage_pct/i);
  });

  it("missing / non-positive mape_pct is REFUSED", () => {
    expect(gateObservedMape(goodSnapshot({ mape_pct: null }), 10).mape_pct).toBeNull();
    expect(gateObservedMape(goodSnapshot({ mape_pct: 0 }), 10).mape_pct).toBeNull();
    expect(gateObservedMape(goodSnapshot({ mape_pct: -5 }), 10).mape_pct).toBeNull();
  });

  // ---- adversarial inputs ----
  it("undefined / non-object / array snapshot -> null (no crash)", () => {
    expect(gateObservedMape(undefined, 10).mape_pct).toBeNull();
    // @ts-expect-error -- adversarial: array is not a Record
    expect(gateObservedMape([], 10).mape_pct).toBeNull();
  });

  it("NaN / Infinity in mape or coverage_pct -> null (never poisons the band)", () => {
    expect(gateObservedMape(goodSnapshot({ mape_pct: NaN }), 10).mape_pct).toBeNull();
    expect(gateObservedMape(goodSnapshot({ mape_pct: Infinity }), 10).mape_pct).toBeNull();
    expect(
      gateObservedMape(goodSnapshot({ data_source_coverage: { coverage_pct: NaN } }), 10).mape_pct,
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getLiveObservedMapePct -- the sync disk accessor (fail-closed, real shape)
// ---------------------------------------------------------------------------

describe("getLiveObservedMapePct -- sync disk read is fail-closed", () => {
  let dir: string;
  let goodPath: string;
  let badPath: string;
  let dryRunPath: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "prism-live-mape-"));
    goodPath = join(dir, "good.json");
    badPath = join(dir, "bad.json");
    dryRunPath = join(dir, "dryrun.json");
    writeFileSync(goodPath, JSON.stringify(goodSnapshot({ mape_pct: 28.0 })));
    writeFileSync(badPath, "{ this is not valid json ");
    // The real live-file failure mode: fresh + covered but a dry-run with degenerate MAPE.
    writeFileSync(
      dryRunPath,
      JSON.stringify(
        goodSnapshot({ mape_pct: 755.7, skip_reason: "writeIfSafe=false (dry-run mode)" }),
      ),
    );
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads + admits a good live snapshot in the real shape", () => {
    const r = quotingActiveFactorLoaderEngine.getLiveObservedMapePct({ path: goodPath });
    expect(r.mape_pct).toBe(28.0);
  });

  it("file-missing -> null (never invents a MAPE)", () => {
    const r = quotingActiveFactorLoaderEngine.getLiveObservedMapePct({
      path: join(dir, "does-not-exist.json"),
    });
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/file-missing/i);
  });

  it("malformed JSON -> null (fail-closed, no partial use)", () => {
    const r = quotingActiveFactorLoaderEngine.getLiveObservedMapePct({ path: badPath });
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/json-parse-failed/i);
  });

  it("a fresh, well-covered DRY-RUN snapshot (the real live-file shape) is refused through the disk path", () => {
    const r = quotingActiveFactorLoaderEngine.getLiveObservedMapePct({ path: dryRunPath });
    expect(r.mape_pct).toBeNull();
    expect(r.reason).toMatch(/skip_reason/i);
  });
});

// ---------------------------------------------------------------------------
// Integration: the engine self-populates observed_mape_pct from a real-shape feed
// ---------------------------------------------------------------------------

const BASE: InstantQuoteInput = {
  part_name: "LIVE-MAPE-TEST",
  material: "AL6061",
  quantity: 10,
  stock_dimensions_mm: { length: 50, width: 50, height: 25 },
};

describe("InstantQuoteEngine.quote -- live-MAPE self-population", () => {
  it("an explicit observed_mape_pct still WINS over any live feed (override)", () => {
    // 70% explicit MAPE is far above the static CVs -> band must widen + surface the factor,
    // proving the explicit input was used (not silently replaced by a live value).
    const q = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 70 });
    const widened = q.confidence_factors.some(
      (f) => /observed quote-vs-actual error/i.test(f) && /70/.test(f),
    );
    expect(widened).toBe(true);
  });

  it("with no explicit MAPE the quote is still finite + positive (live feed is best-effort)", () => {
    // Whether or not a production status file exists in this env, the quote must price
    // cleanly; a missing/refused live MAPE simply leaves the band theory-only (never throws).
    const q = instantQuoteEngine.quote(BASE);
    expect(Number.isFinite(q.unit_price)).toBe(true);
    expect(q.unit_price).toBeGreaterThan(0);
  });
});
