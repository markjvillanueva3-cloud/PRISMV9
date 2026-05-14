/**
 * WiringPotentialEngine — real-value contract tests
 * =================================================
 *
 * Covers CLEANUP-MS0 / U-CLEANUP-C1. Tests the analyze + analyzeBatch
 * surfaces with hand-derived reference scores and explicit dispatcher
 * assertions (no presence-only checks).
 *
 * Reference scoring (W_SEMANTIC=0.45, W_CAPACITY=0.40, W_DOCS_DEPTH=0.15):
 *   - "KienzleCuttingForceEngine", base 0.85, capacity 0.50 (ok), docs 0
 *     score = 0.45*0.85 + 0.40*0.50 + 0.15*0 = 0.5825
 *   - "ChatterStabilityEngine", base 0.80, capacity 0.00, docs 5/10
 *     score = 0.45*0.80 + 0.40*1.00 + 0.15*0.5 = 0.835
 *   - Capacity ratio >= 1.00 excludes the candidate outright.
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-C1
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  WiringPotentialEngine,
  wiringPotentialEngine,
  CAPACITY_OK_MAX,
  CAPACITY_WARN_MAX,
  W_SEMANTIC,
  W_CAPACITY,
  W_DOCS_DEPTH,
  DEFAULT_TOP_K,
  MAX_TOP_K,
  MIN_HEURISTIC_CONFIDENCE,
  DOCS_DEPTH_SATURATION,
  normalizeF7DispatcherName,
} from "../engines/WiringPotentialEngine.js";
import type {
  MasterIndexResult,
  MasterIndexHit,
} from "../engines/MasterIndexEngine.js";

/**
 * Emit a temp F7 capacity file. The test API takes `dispatcher` in the
 * `prism_<x>` form (matching what the engine's heuristic emits), then
 * the helper rewrites it to F7's authoritative row schema:
 *   {name: "<x>Dispatcher", actions, ratio, status}
 *
 * Format must match `scripts/build-dispatcher-capacity.mjs` output —
 * the engine's `normalizeF7DispatcherName` converts `name` back to
 * `prism_<x>` for the join. Tests that bypass this helper and emit
 * raw `{name: "calcDispatcher", ...}` rows directly are below.
 */
function makeTempCapacity(rows: Array<{ dispatcher: string; ratio: number }>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wp-"));
  const f = path.join(dir, "DISPATCHER_CAPACITY.json");
  const fullRows = rows.map((r) => ({
    // F7 emits `name: "<x>Dispatcher"`. Convert "prism_calc" → "calcDispatcher".
    name: r.dispatcher.replace(/^prism_/, "") + "Dispatcher",
    actions: Math.round(r.ratio * 200),
    ratio: r.ratio,
    status:
      r.ratio >= CAPACITY_WARN_MAX
        ? ("critical" as const)
        : r.ratio >= CAPACITY_OK_MAX
        ? ("warn" as const)
        : ("ok" as const),
  }));
  fs.writeFileSync(
    f,
    JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), ceiling: 200, rows: fullRows }),
    "utf8",
  );
  return f;
}

function emptyMI(): { query: () => Promise<MasterIndexResult> } {
  return {
    query: async () =>
      ({
        query: "",
        totalHits: 0,
        hits: [],
        bySource: {},
        byBuildClass: {},
        topUtilized: [],
        underUtilized: [],
        generatedAt: new Date().toISOString(),
        cacheHit: false,
        graphMtime: null,
        warnings: [],
      }) as MasterIndexResult,
  };
}

function miWithHits(hits: MasterIndexHit[]): { query: () => Promise<MasterIndexResult> } {
  return {
    query: async () =>
      ({
        query: "",
        totalHits: hits.length,
        hits,
        bySource: {},
        byBuildClass: {},
        topUtilized: [],
        underUtilized: [],
        generatedAt: new Date().toISOString(),
        cacheHit: false,
        graphMtime: null,
        warnings: [],
      }) as MasterIndexResult,
  };
}

function makeHit(partial: Partial<MasterIndexHit> & { id: string; label: string }): MasterIndexHit {
  return {
    source: "engine",
    id: partial.id,
    label: partial.label,
    confidence: 0.5,
    utilization: 0.5,
    buildClass: "unwired",
    ...partial,
  };
}

// Sentinel non-existent path — ensures tests NEVER accidentally load the
// live H:/prism/state/shared/DISPATCHER_CAPACITY.json (which has 6+
// critical-class dispatchers and would silently exclude our heuristic
// candidates). When a test wants no capacity signal, omit capFile and
// the engine reads from this guaranteed-missing sentinel instead of cwd.
const SENTINEL_NO_CAP = path.join(
  os.tmpdir(),
  `prism-wp-NEVER-EXISTS-${process.pid}-${Date.now()}.json`,
);

function makeEngine(capFile?: string, mi?: { query: () => Promise<MasterIndexResult> }) {
  return new WiringPotentialEngine({
    capacityFile: capFile ?? SENTINEL_NO_CAP,
    masterIndex: (mi ?? emptyMI()) as any,
  });
}

describe("WiringPotentialEngine", () => {
  let engine: WiringPotentialEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  it("exports a singleton that is an instance of WiringPotentialEngine", () => {
    expect(wiringPotentialEngine).toBeInstanceOf(WiringPotentialEngine);
  });

  it("exports semantic constants with documented values", () => {
    expect(CAPACITY_OK_MAX).toBe(0.80);
    expect(CAPACITY_WARN_MAX).toBe(1.00);
    expect(W_SEMANTIC + W_CAPACITY + W_DOCS_DEPTH).toBeCloseTo(1.0, 5);
    expect(DEFAULT_TOP_K).toBe(3);
    expect(MAX_TOP_K).toBe(10);
    expect(MIN_HEURISTIC_CONFIDENCE).toBeCloseTo(0.30, 2);
    expect(DOCS_DEPTH_SATURATION).toBe(10);
  });

  it("throws on empty engineName", async () => {
    await expect(engine.analyze("")).rejects.toThrow();
  });

  it("accepts whitespace-only engineName but returns zero candidates", async () => {
    const r = await engine.analyze(" ");
    expect(r.candidates).toEqual([]);
    expect(r.topCandidate).toBeNull();
  });

  it("throws on engineName > 200 chars", async () => {
    await expect(engine.analyze("x".repeat(201))).rejects.toThrow();
  });

  it("throws on non-string engineName", async () => {
    // @ts-expect-error — intentional bad input
    await expect(engine.analyze(42)).rejects.toThrow();
  });

  it("analyzeBatch throws on non-array input", async () => {
    // @ts-expect-error — intentional bad input
    await expect(engine.analyzeBatch("not an array")).rejects.toThrow();
  });

  it("matches 'KienzleCuttingForceEngine' to prism_calc with semanticConfidence=0.85", async () => {
    const r = await engine.analyze("KienzleCuttingForceEngine");
    expect(r.candidates.length).toBe(1);
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
    expect(r.topCandidate?.semanticConfidence).toBeCloseTo(0.85, 2);
  });

  it("matches 'TaylorToolLifeEngine' to prism_calc with tool-life rationale token", async () => {
    const r = await engine.analyze("TaylorToolLifeEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
    const hit = r.topCandidate!.rationale.find((s) => s.includes("tool-life"));
    expect(hit?.startsWith("name pattern")).toBe(true);
  });

  it("matches 'SafetyEnvelopeChecker' to prism_safety with semanticConfidence=0.90", async () => {
    const r = await engine.analyze("SafetyEnvelopeChecker");
    expect(r.topCandidate?.dispatcher).toBe("prism_safety");
    expect(r.topCandidate?.semanticConfidence).toBeCloseTo(0.90, 2);
  });

  it("multi-match: 'OkumaTurningPostEngine' returns BOTH prism_turning AND prism_cam", async () => {
    const r = await engine.analyze("OkumaTurningPostEngine", { topK: 5 });
    const disps = r.candidates.map((c) => c.dispatcher).sort();
    expect(disps).toEqual(["prism_cam", "prism_turning"]);
  });

  it("rule-order regression: 'Mill5AxisFooEngine' top-pick is prism_5axis not prism_cam", async () => {
    const r = await engine.analyze("Mill5AxisFooEngine", { topK: 5 });
    expect(r.topCandidate?.dispatcher).toBe("prism_5axis");
  });

  it("returns zero candidates for engine name matching no heuristic", async () => {
    const r = await engine.analyze("ZebraQuoxoticFruitbatEngine");
    expect(r.candidates).toEqual([]);
    expect(r.topCandidate).toBeNull();
    const w = r.warnings.find((x) => x.includes("no candidate"));
    expect(w?.includes("heuristic=0")).toBe(true);
  });

  it("excludes candidates with capacity ratio >= 1.00 (critical)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 1.20 }]);
    const e = makeEngine(cap);
    const r = await e.analyze("KienzleCuttingForceEngine");
    expect(r.candidates.map((c) => c.dispatcher)).not.toContain("prism_calc");
    const exclWarn = r.warnings.find((w) => w.includes("excluded prism_calc"));
    expect(exclWarn?.includes("120%")).toBe(true);
  });

  it("flags 80-99% capacity as 'warn' but keeps the candidate", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.90 }]);
    const e = makeEngine(cap);
    const r = await e.analyze("KienzleCuttingForceEngine");
    const c = r.candidates.find((x) => x.dispatcher === "prism_calc");
    expect(c?.capacityClass).toBe("warn");
    expect(c?.headroomRatio).toBeCloseTo(0.90, 3);
  });

  it("scores 'ok' (<80%) capacity higher than 'warn' (80-99%)", async () => {
    const capLow = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.20 }]);
    const capHigh = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.90 }]);
    const rLow = await makeEngine(capLow).analyze("KienzleCuttingForceEngine");
    const rHigh = await makeEngine(capHigh).analyze("KienzleCuttingForceEngine");
    // Hand-derived: 0.45*0.85 + 0.40*0.80 + 0 = 0.7025 vs 0.45*0.85 + 0.40*0.10 + 0 = 0.4225
    expect(rLow.topCandidate?.score).toBeCloseTo(0.7025, 3);
    expect(rHigh.topCandidate?.score).toBeCloseTo(0.4225, 3);
    expect(rLow.topCandidate!.score - rHigh.topCandidate!.score).toBeGreaterThan(0.27);
  });

  it("uses neutral 0.5 capacity score when no F7 report present", async () => {
    const r = await engine.analyze("KienzleCuttingForceEngine");
    const w = r.warnings.find((x) => x.includes("DISPATCHER_CAPACITY.json unavailable"));
    expect(w?.includes("neutral")).toBe(true);
    expect(r.topCandidate?.headroomRatio).toBe(-1);
    // 0.45*0.85 + 0.40*0.5 + 0 = 0.5825
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("classifies missing dispatcher row as neutral (not critical)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_other", ratio: 0.50 }]);
    const e = makeEngine(cap);
    const r = await e.analyze("KienzleCuttingForceEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
    expect(r.topCandidate?.headroomRatio).toBe(-1);
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("reference score: Kienzle @ ratio=0.50, 0 docs = 0.5825", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const r = await makeEngine(cap).analyze("KienzleCuttingForceEngine");
    // 0.45*0.85 + 0.40*0.50 + 0.15*0 = 0.5825
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("reference score: 0% capacity ratio = max capacity component (0.7825 total)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.00 }]);
    const r = await makeEngine(cap).analyze("KienzleCuttingForceEngine");
    // 0.45*0.85 + 0.40*1.00 + 0.15*0 = 0.7825
    expect(r.topCandidate?.score).toBeCloseTo(0.7825, 3);
  });

  it("docsDepth=5 → docsScore=0.5 → ChatterStability score=0.835", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.00 }]);
    const mi = miWithHits([
      makeHit({
        id: "ChatterStabilityEngine",
        label: "ChatterStabilityEngine",
        wikiEntries: ["a", "b", "c", "d", "e"],
        memoryEntries: [],
      }),
    ]);
    const r = await makeEngine(cap, mi).analyze("ChatterStabilityEngine");
    // 0.45*0.80 + 0.40*1.0 + 0.15*0.5 = 0.835
    expect(r.topCandidate?.score).toBeCloseTo(0.835, 3);
    expect(r.topCandidate?.docsDepth).toBe(5);
  });

  it("docsScore saturates at DOCS_DEPTH_SATURATION (50 entries → score 0.9325)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.00 }]);
    const massive = Array.from({ length: 50 }, (_, i) => `entry${i}`);
    const mi = miWithHits([
      makeHit({
        id: "KienzleCuttingForceEngine",
        label: "KienzleCuttingForceEngine",
        wikiEntries: massive,
      }),
    ]);
    const r = await makeEngine(cap, mi).analyze("KienzleCuttingForceEngine");
    // docsScore capped at 1.0 → 0.45*0.85 + 0.40*1.0 + 0.15*1.0 = 0.9325
    expect(r.topCandidate?.score).toBeCloseTo(0.9325, 3);
    expect(r.topCandidate?.docsDepth).toBe(50);
  });

  it("zero docs → docsDepth=0, score remains finite & positive", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const r = await makeEngine(cap).analyze("KienzleCuttingForceEngine");
    expect(r.topCandidate?.docsDepth).toBe(0);
    expect(Number.isFinite(r.topCandidate!.score)).toBe(true);
    expect(r.topCandidate!.score).toBeGreaterThan(0);
  });

  it("MasterIndex related-action on same dispatcher boosts semanticConfidence by 0.10", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const mi = miWithHits([
      makeHit({
        id: "prism_calc:kienzle_force",
        label: "kienzle_force",
        source: "action",
        fullAction: "prism_calc:kienzle_force",
      }),
    ]);
    const r = await makeEngine(cap, mi).analyze("KienzleCuttingForceEngine");
    expect(r.topCandidate?.semanticConfidence).toBeCloseTo(0.95, 2);
    const rat = r.topCandidate?.rationale.find((s) => s.includes("related MasterIndex actions"));
    expect(rat?.includes("prism_calc")).toBe(true);
  });

  it("MasterIndex action on different dispatcher does NOT boost the heuristic candidate", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const mi = miWithHits([
      makeHit({
        id: "prism_ai:something",
        label: "something",
        source: "action",
        fullAction: "prism_ai:something",
      }),
    ]);
    const r = await makeEngine(cap, mi).analyze("KienzleCuttingForceEngine");
    const calc = r.candidates.find((c) => c.dispatcher === "prism_calc");
    expect(calc?.semanticConfidence).toBeCloseTo(0.85, 2);
  });

  it("creates index-only candidate (semanticConfidence=0.40) when heuristic misses dispatcher", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_ai", ratio: 0.30 }]);
    const mi = miWithHits([
      makeHit({
        id: "prism_ai:something",
        label: "something",
        source: "action",
        fullAction: "prism_ai:something",
      }),
    ]);
    const r = await makeEngine(cap, mi).analyze("ZebraQuoxoticFruitbatEngine");
    const aiCand = r.candidates.find((c) => c.dispatcher === "prism_ai");
    expect(aiCand?.dispatcher).toBe("prism_ai");
    expect(aiCand?.semanticConfidence).toBeCloseTo(0.40, 2);
    const rat = aiCand?.rationale.find((s) => s.includes("no name heuristic match"));
    expect(rat?.includes("prism_ai")).toBe(true);
  });

  it("ranks candidates by score descending (monotonic across all returned candidates)", async () => {
    const r = await engine.analyze("OkumaTurningPostEngine", { topK: 5 });
    expect(r.candidates.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i + 1 < r.candidates.length; i++) {
      expect(r.candidates[i].score).toBeGreaterThanOrEqual(r.candidates[i + 1].score);
    }
  });

  it("turning beats cam on multi-match name (turning base 0.85 > cam base 0.70)", async () => {
    const cap = makeTempCapacity([
      { dispatcher: "prism_turning", ratio: 0.10 },
      { dispatcher: "prism_cam", ratio: 0.50 },
    ]);
    const r = await makeEngine(cap).analyze("OkumaTurningPostEngine", { topK: 5 });
    expect(r.topCandidate?.dispatcher).toBe("prism_turning");
    expect(r.candidates[1].dispatcher).toBe("prism_cam");
  });

  it("respects topK=1 option (only 1 candidate even when 2 match)", async () => {
    const r = await engine.analyze("OkumaTurningPostEngine", { topK: 1 });
    expect(r.candidates.length).toBe(1);
  });

  it("clamps topK to MAX_TOP_K=10", async () => {
    const r = await engine.analyze("OkumaTurningPostEngine", { topK: 9999 });
    expect(r.candidates.length).toBeLessThanOrEqual(MAX_TOP_K);
  });

  it("clamps negative topK to 1", async () => {
    const r = await engine.analyze("KienzleCuttingForceEngine", { topK: -5 });
    expect(r.candidates.length).toBe(1);
  });

  it("minConfidence=0.99 drops all heuristic candidates (base max 0.90)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const r = await makeEngine(cap).analyze("KienzleCuttingForceEngine", { minConfidence: 0.99 });
    expect(r.candidates).toEqual([]);
  });

  it("analyzeBatch returns one report per input in order", async () => {
    const r = await engine.analyzeBatch([
      "KienzleCuttingForceEngine",
      "TaylorToolLifeEngine",
      "OkumaTurningPostEngine",
    ]);
    expect(r.length).toBe(3);
    expect(r[0].engineName).toBe("KienzleCuttingForceEngine");
    expect(r[1].engineName).toBe("TaylorToolLifeEngine");
    expect(r[2].engineName).toBe("OkumaTurningPostEngine");
    expect(r[0].topCandidate?.dispatcher).toBe("prism_calc");
    expect(r[1].topCandidate?.dispatcher).toBe("prism_calc");
    expect(r[2].topCandidate?.dispatcher).toBe("prism_turning");
  });

  it("analyzeBatch returns empty array for empty input", async () => {
    const r = await engine.analyzeBatch([]);
    expect(r).toEqual([]);
  });

  it("analyzeBatch rejects when any individual input fails Zod", async () => {
    await expect(engine.analyzeBatch(["GoodEngine", ""])).rejects.toThrow();
  });

  it("never throws on missing F7 capacity file — warns instead", async () => {
    const r = await makeEngine("/path/that/does/not/exist.json").analyze("KienzleCuttingForceEngine");
    const w = r.warnings.find((x) => x.includes("DISPATCHER_CAPACITY.json unavailable"));
    expect(w?.includes("neutral")).toBe(true);
  });

  it("never throws on malformed F7 capacity file (truncated JSON)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wp-bad-"));
    const f = path.join(dir, "bad.json");
    fs.writeFileSync(f, "{not json", "utf8");
    const r = await makeEngine(f).analyze("KienzleCuttingForceEngine");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
  });

  it("rejects F7 capacity file with wrong schemaVersion (v2 → treated as missing)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wp-v2-"));
    const f = path.join(dir, "v2.json");
    fs.writeFileSync(f, JSON.stringify({ schemaVersion: 2, rows: [] }), "utf8");
    const r = await makeEngine(f).analyze("KienzleCuttingForceEngine");
    const w = r.warnings.find((x) => x.includes("DISPATCHER_CAPACITY.json unavailable"));
    expect(w?.includes("neutral")).toBe(true);
  });

  it("survives MasterIndex.query throwing — falls back to heuristic-only result", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const brokenMI = {
      query: async () => {
        throw new Error("graph corrupted");
      },
    };
    const r = await makeEngine(cap, brokenMI as any).analyze("KienzleCuttingForceEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
    const w = r.warnings.find((x) => x.includes("masterIndex.query failed"));
    expect(w?.includes("graph corrupted")).toBe(true);
  });

  it("returns null topCandidate when all signals degrade simultaneously", async () => {
    const r = await makeEngine("/missing.json", {
      query: async () => {
        throw new Error("nope");
      },
    } as any).analyze("ZebraFruitbat");
    expect(r.topCandidate).toBeNull();
    expect(r.candidates).toEqual([]);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts opts.capacityReport for inline injection (no disk read)", async () => {
    // Uses F7's real row schema: `name: "calcDispatcher"` (not dispatcher: ...).
    // The engine normalizes "calcDispatcher" → "prism_calc" for the join.
    const e = new WiringPotentialEngine({ masterIndex: emptyMI() as any });
    const r = await e.analyze("KienzleCuttingForceEngine", {
      capacityReport: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ceiling: 200,
        rows: [{ name: "calcDispatcher", actions: 100, ratio: 0.50, status: "ok" }],
      },
    });
    expect(r.topCandidate?.headroomRatio).toBe(0.50);
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("opts.capacityReport=null disables capacity signal (warning emitted)", async () => {
    const e = new WiringPotentialEngine({ masterIndex: emptyMI() as any });
    const r = await e.analyze("KienzleCuttingForceEngine", { capacityReport: null });
    const w = r.warnings.find((x) => x.includes("DISPATCHER_CAPACITY.json unavailable"));
    expect(w?.includes("neutral")).toBe(true);
  });

  it("report fields have correct values + parseable timestamp within 5s of now", async () => {
    const r = await engine.analyze("KienzleCuttingForceEngine");
    expect(r.engineName).toBe("KienzleCuttingForceEngine");
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0].dispatcher).toBe(r.topCandidate?.dispatcher);
    const ts = new Date(r.generatedAt).getTime();
    expect(Math.abs(Date.now() - ts)).toBeLessThan(5000);
  });

  it("each candidate has score in [0,1] and rationale of 1-3 lines", async () => {
    const r = await engine.analyze("KienzleCuttingForceEngine");
    const c = r.topCandidate!;
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(1);
    expect(["ok", "warn", "critical"]).toContain(c.capacityClass);
    expect(c.rationale.length).toBeGreaterThanOrEqual(1);
    expect(c.rationale.length).toBeLessThanOrEqual(5);
  });

  it("rationale strings are short (<200 chars) and human-readable (no '{' braces)", async () => {
    const cap = makeTempCapacity([{ dispatcher: "prism_calc", ratio: 0.50 }]);
    const r = await makeEngine(cap).analyze("KienzleCuttingForceEngine");
    for (const line of r.topCandidate!.rationale) {
      expect(line.length).toBeLessThan(200);
      expect(line.includes("{")).toBe(false);
      expect(line.includes("undefined")).toBe(false);
    }
  });

  it("safe against regex metacharacters in engine name — 'Foo(Mill)Engine' still hits prism_cam", async () => {
    const r = await engine.analyze("Foo(Mill)Engine");
    const camCand = r.candidates.find((c) => c.dispatcher === "prism_cam");
    expect(camCand?.dispatcher).toBe("prism_cam");
  });

  it("handles engineName with embedded newlines — kienzle token still fires", async () => {
    const r = await engine.analyze("Kienzle\nForce\nEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
  });

  it("handles unicode engineName — returns serializable empty result without throwing", async () => {
    const r = await engine.analyze("日本語Engine");
    expect(r.candidates).toEqual([]);
    const ser = JSON.parse(JSON.stringify(r));
    expect(ser.engineName).toBe("日本語Engine");
  });

  it("singleton instance returns structured report for known engine name", async () => {
    const r = await wiringPotentialEngine.analyze("KienzleCuttingForceEngine", {
      masterIndex: emptyMI() as any,
    });
    expect(r.engineName).toBe("KienzleCuttingForceEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
  });

  // ─── F7 SCHEMA REGRESSION GUARD (U-CLEANUP-C1 scrutiny fixup) ────────────
  // Reviewer C (3-of-3 scrutiny gate) caught a class-A silent-breakage bug:
  // F7 emits rows with `name: "calcDispatcher"` but the engine originally
  // read `row.dispatcher`. Tests passed because the helper used the same
  // wrong field. These tests use F7's REAL schema (raw object literals,
  // bypassing makeTempCapacity) and the live DISPATCHER_CAPACITY.json's
  // actual row names so the next field-name drift can never pass silently.

  it("normalizes F7 row name 'calcDispatcher' → 'prism_calc'", () => {
    expect(normalizeF7DispatcherName("calcDispatcher")).toBe("prism_calc");
  });

  it("normalizes F7 row name 'camDispatcher' → 'prism_cam'", () => {
    expect(normalizeF7DispatcherName("camDispatcher")).toBe("prism_cam");
  });

  it("normalizes multi-word F7 row name 'aiReasoningDispatcher' → 'prism_ai_reasoning'", () => {
    expect(normalizeF7DispatcherName("aiReasoningDispatcher")).toBe("prism_ai_reasoning");
  });

  it("normalizes bare 'calc' (no Dispatcher suffix) → 'prism_calc'", () => {
    expect(normalizeF7DispatcherName("calc")).toBe("prism_calc");
  });

  it("normalizer is idempotent — 'prism_calc' passes through unchanged", () => {
    expect(normalizeF7DispatcherName("prism_calc")).toBe("prism_calc");
  });

  it("normalizer returns empty string on empty/whitespace input", () => {
    expect(normalizeF7DispatcherName("")).toBe("");
    expect(normalizeF7DispatcherName("   ")).toBe("");
  });

  it("normalizer handles non-string input safely (returns empty)", () => {
    // @ts-expect-error — intentional bad input
    expect(normalizeF7DispatcherName(null)).toBe("");
    // @ts-expect-error — intentional bad input
    expect(normalizeF7DispatcherName(undefined)).toBe("");
  });

  it("F7 raw-schema integration: literal {name: 'calcDispatcher'} ratio 1.20 excludes prism_calc", async () => {
    // Bypass helper — use F7's authoritative row shape directly.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wp-f7-"));
    const f = path.join(dir, "DISPATCHER_CAPACITY.json");
    fs.writeFileSync(
      f,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ceiling: 200,
        rows: [
          { name: "calcDispatcher", actions: 1113, ratio: 1.20, status: "critical" },
        ],
      }),
      "utf8",
    );
    const e = makeEngine(f);
    const r = await e.analyze("KienzleCuttingForceEngine");
    // Engine must read the F7 row, normalize "calcDispatcher" → "prism_calc",
    // and exclude the heuristic candidate as critical.
    expect(r.candidates.map((c) => c.dispatcher)).not.toContain("prism_calc");
    const exclWarn = r.warnings.find((w) => w.includes("excluded prism_calc"));
    expect(exclWarn?.includes("120%")).toBe(true);
  });

  it("F7 raw-schema integration: literal {name: 'calcDispatcher'} ratio 0.50 yields score 0.5825 for Kienzle", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wp-f7-"));
    const f = path.join(dir, "DISPATCHER_CAPACITY.json");
    fs.writeFileSync(
      f,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ceiling: 200,
        rows: [
          { name: "calcDispatcher", actions: 100, ratio: 0.50, status: "ok" },
        ],
      }),
      "utf8",
    );
    const e = makeEngine(f);
    const r = await e.analyze("KienzleCuttingForceEngine");
    expect(r.topCandidate?.dispatcher).toBe("prism_calc");
    expect(r.topCandidate?.headroomRatio).toBeCloseTo(0.50, 3);
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("F7 raw-schema integration: opts.capacityReport accepts F7-real shape", async () => {
    const e = new WiringPotentialEngine({ masterIndex: emptyMI() as any });
    const r = await e.analyze("KienzleCuttingForceEngine", {
      capacityReport: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ceiling: 200,
        rows: [{ name: "calcDispatcher", actions: 100, ratio: 0.50, status: "ok" }],
      },
    });
    expect(r.topCandidate?.headroomRatio).toBeCloseTo(0.50, 3);
    expect(r.topCandidate?.score).toBeCloseTo(0.5825, 3);
  });

  it("F7 raw-schema integration: live DISPATCHER_CAPACITY.json shape (calcDispatcher critical 556%) excludes prism_calc", async () => {
    // Snapshot of the LIVE file's first row at 2026-05-14. If F7's schema
    // ever changes, this test breaks and reviewer C's bug regression-guards.
    const e = new WiringPotentialEngine({ masterIndex: emptyMI() as any });
    const r = await e.analyze("KienzleCuttingForceEngine", {
      capacityReport: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ceiling: 200,
        rows: [{ name: "calcDispatcher", actions: 1113, ratio: 5.565, status: "critical" }],
      },
    });
    expect(r.candidates.map((c) => c.dispatcher)).not.toContain("prism_calc");
  });
});
