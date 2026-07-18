/**
 * U-FT-01 (SFC-FULLTUNE) — FAST bulk-sweep flag anti-regression + emission-skip tests.
 *
 * The load-bearing invariant (R9): turning FAST on must NOT perturb the returned result.
 * `calculate()`'s only FAST-gated change is suppressing the fire-and-forget `captureSFC`
 * telemetry emission (whose return value the engine discards), so a FAST result is
 * byte-identical to a default result for the SAME input — proven here across diverse
 * cells, not a single canonical one. The FAST path also emits NOTHING to the outcome
 * ledger (so a 20.3M-cell offline sweep neither pays the per-call append cost nor
 * pollutes the shop-floor learning loop with synthetic, non-actual rows).
 *
 * Isolation (2026-07-01 trunk-absorption rewrite): the wire module is vi.mock-ed to a
 * counting stub, so NO test emission can reach the live shop-floor ledger, and the
 * suppression invariant is asserted on captureSFC CALL COUNT rather than ledger lines.
 * The original slot test set PRISM_OUTCOMES_DIR expecting the bus to honor it -- no code
 * anywhere ever read that env var (the tmp-dir isolation silently never worked, and the
 * default path was appending to the LIVE ledger), and the emission is now DEFERRED via
 * setImmediate (June-24 hot-path fix), so a synchronous line-count could never see it.
 * Both defects made the original ledger test red-from-birth; this rewrite preserves the
 * intent (default emits exactly its own telemetry, FAST emits none) honestly.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { UltimateSpeedFeedInput } from "../engines/UltimateSpeedFeedEngine.js";

vi.mock("../middleware/sfcOutcomeWire.js", () => ({
  captureSFC: vi.fn(() => ({ ok: true, lineage_id: "", event_id: "", summary: {} })),
  captureSFCAndThread: vi.fn(() => ""),
}));

let calc: (i: UltimateSpeedFeedInput) => unknown;
let toInput: (c: unknown) => UltimateSpeedFeedInput;
let cellAtIndex: (i: number) => unknown;
let SIZE: number;
let ambientFastBulk: string | undefined;

// Neutralize an ambient PRISM_SFC_FAST_BULK (sweep shells export it): with it set, the
// default-path emission assertions below would fail falsely (scrutiny arm-A P2).
beforeAll(async () => {
  ambientFastBulk = process.env.PRISM_SFC_FAST_BULK;
  delete process.env.PRISM_SFC_FAST_BULK;
  const eng = await import("../engines/UltimateSpeedFeedEngine.js");
  const drv = await import("../data/sfc-combinatorial-driver.js");
  const enm = await import("../data/sfc-combinatorial-enumerator.js");
  calc = (i) => eng.ultimateSpeedFeedEngine.calculate(i);
  toInput = (c) => drv.CombinatorialSpeedFeedHarnessDriver.toInput(c as never);
  cellAtIndex = enm.cellAtIndex;
  SIZE = enm.SFC_FULL_SPACE_SIZE;
});

afterAll(() => {
  if (ambientFastBulk === undefined) delete process.env.PRISM_SFC_FAST_BULK;
  else process.env.PRISM_SFC_FAST_BULK = ambientFastBulk;
});

/** Diverse cells spread across the whole valid space via a prime stride. */
function diverseCells(n: number): UltimateSpeedFeedInput[] {
  const stride = 1_299_709;
  return Array.from({ length: n }, (_, i) => toInput(cellAtIndex((i * stride) % SIZE)));
}

describe("UltimateSpeedFeedEngine — FAST bulk-sweep flag (U-FT-01)", () => {
  it("returns a result byte-identical to the default path across 12 diverse cells", () => {
    for (const c of diverseCells(12)) {
      const slow = calc(c);
      const fast = calc({ ...c, fast_bulk: true });
      expect(JSON.stringify(fast)).toBe(JSON.stringify(slow));
    }
  });

  it("default path fires its telemetry capture; FAST path fires none", async () => {
    const wire = await import("../middleware/sfcOutcomeWire.js");
    const spy = wire.captureSFC as unknown as ReturnType<typeof vi.fn>;
    const flush = () => new Promise((r) => setImmediate(r)); // drain the deferTelemetry tick
    const cell = diverseCells(1)[0]!;

    spy.mockClear();
    calc(cell); // default -> deferred emit lands next tick
    await flush();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);

    spy.mockClear();
    calc({ ...cell, fast_bulk: true }); // FAST -> suppressed entirely
    await flush();
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("honors the PRISM_SFC_FAST_BULK env var (and per-call override wins over it)", async () => {
    const eng = await import("../engines/UltimateSpeedFeedEngine.js");
    const prev = process.env.PRISM_SFC_FAST_BULK;
    try {
      process.env.PRISM_SFC_FAST_BULK = "1";
      expect(eng.sfcFastBulkEnabled()).toBe(true);
      // explicit per-call false overrides the env "on"
      expect(eng.sfcFastBulkEnabled({ fast_bulk: false })).toBe(false);
      process.env.PRISM_SFC_FAST_BULK = "0";
      expect(eng.sfcFastBulkEnabled()).toBe(false);
      // explicit per-call true overrides the env "off"
      expect(eng.sfcFastBulkEnabled({ fast_bulk: true })).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PRISM_SFC_FAST_BULK;
      else process.env.PRISM_SFC_FAST_BULK = prev;
    }
  });

  it("FAST result is deterministic (repeated calls identical) and physics fields finite", () => {
    const cell = diverseCells(1)[0]!;
    const a = calc({ ...cell, fast_bulk: true }) as { cutting_speed: { value: number }; spindle_rpm: { value: number }; mrr: { value: number } };
    const b = calc({ ...cell, fast_bulk: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(Number.isFinite(a.cutting_speed.value)).toBe(true);
    expect(a.cutting_speed.value).toBeGreaterThan(0);
    expect(Number.isFinite(a.spindle_rpm.value)).toBe(true);
    expect(Number.isFinite(a.mrr.value)).toBe(true);
  });
});
