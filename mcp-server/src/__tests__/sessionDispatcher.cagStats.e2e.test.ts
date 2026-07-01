import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * Dispatcher round-trip E2E for prism_session:cag_stats (U-CAG-STATS-DISPATCH, slot:bravo).
 * Surfaces the CAG hit-rate telemetry written by recordCagStat() in scripts/lib/galaxy-cag-cache.mjs
 * (called from galaxy-reasoning-bridge.reasonForGalaxy) through the REAL switch/case + schema + ok()
 * normalizer -- the round-trip COMPREHENSIVE-BUILD requires (not the .mjs helper in isolation).
 * Hermetic: cag_stats_file overrides the default path to a temp fixture (mirrors loop_state_dir).
 */
type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  if (!result || !Array.isArray((result as { content?: unknown[] }).content)) {
    return result as unknown as Record<string, unknown>;
  }
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

/** Write a cag-cache-stats.json fixture (same shape recordCagStat persists). */
function writeStats(file: string, stats: Record<string, unknown>): void {
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, updatedAt: "2026-06-14T00:00:00.000Z", ...stats }));
}

describe("prism_session:cag_stats -- dispatcher round-trip", () => {
  let tmpDir: string;
  let statsFile: string;
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstats-e2e-"));
    statsFile = path.join(tmpDir, "cag-cache-stats.json");
    const c = captureHandler();
    handler = c.handler;
    schemaActions = c.schemaActions;
  });
  afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } });

  it("wiring: cag_stats appears in the ACTIONS enum", () => {
    expect(schemaActions).toContain("cag_stats");
  });

  it("summarizes overall hits/misses/total/hitRate via the dispatcher", async () => {
    writeStats(statsFile, { hits: 3, misses: 1, byGalaxy: { mill: { hits: 3, misses: 1 } } });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.success).toBe(true);
    expect(data.hits).toBe(3);
    expect(data.misses).toBe(1);
    expect(data.total).toBe(4);
    expect(data.hitRate).toBe(0.75);
    expect(data.galaxies).toBe(1);
  });

  it("returns per-galaxy array sorted by total desc, with correct per-galaxy hitRate", async () => {
    writeStats(statsFile, {
      hits: 6,
      misses: 4,
      byGalaxy: {
        mill: { hits: 1, misses: 1 },         // total 2
        lathe: { hits: 4, misses: 2 },        // total 6 (largest)
        wedm: { hits: 1, misses: 1 },         // total 2
      },
    });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    const bg = data.byGalaxy as Array<Record<string, unknown>>;
    expect(bg).toHaveLength(3);
    expect(bg[0].galaxy).toBe("lathe");        // largest total first
    expect(bg[0].total).toBe(6);
    expect(bg[0].hitRate).toBeCloseTo(4 / 6, 10);
  });

  it("guards divide-by-zero: a galaxy with 0 hits + 0 misses -> hitRate 0, not NaN (R9)", async () => {
    // On revert (naive h/t without the t>0 guard) this is 0/0 = NaN -> assertion FAILS.
    writeStats(statsFile, { hits: 0, misses: 0, byGalaxy: { dormant: { hits: 0, misses: 0 } } });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    const bg = data.byGalaxy as Array<Record<string, unknown>>;
    expect(bg[0].galaxy).toBe("dormant");
    expect(bg[0].hitRate).toBe(0);
    expect(Number.isNaN(bg[0].hitRate as number)).toBe(false);
  });

  it("guards overall divide-by-zero: empty stats -> hitRate 0 (not NaN)", async () => {
    writeStats(statsFile, { hits: 0, misses: 0, byGalaxy: {} });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.total).toBe(0);
    expect(data.hitRate).toBe(0);
    expect(Number.isNaN(data.hitRate as number)).toBe(false);
  });

  it("fail-soft: missing file -> zeros (never throws)", async () => {
    const data = await invoke(handler, "cag_stats", { cag_stats_file: path.join(tmpDir, "nope.json") });
    expect(data.success).toBe(true);
    expect(data.hits).toBe(0);
    expect(data.total).toBe(0);
    // ok() slims empty arrays -> byGalaxy may be undefined; normalize (galaxies count is load-bearing)
    expect((data.byGalaxy as unknown[]) ?? []).toEqual([]);
    expect(data.galaxies).toBe(0);
  });

  it("fail-soft: corrupt file -> zeros (never throws)", async () => {
    fs.writeFileSync(statsFile, "{not json");
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
    expect(data.galaxies).toBe(0);
  });

  it("adversarial: non-numeric / non-object fields coerce to 0, never leak NaN (R9 guard pin)", async () => {
    // recordCagStat() writes monotonic numbers, but a hand-corrupted-yet-parseable sink must not
    // produce NaN. Pins the Number(x)||0 + typeof-object guards (NOT a clamp -- negatives would
    // faithfully mirror summarizeCagStats, so we deliberately do not assert clamping here).
    writeStats(statsFile, {
      hits: "oops",                              // non-numeric overall
      misses: null,
      byGalaxy: { mill: { hits: "x", misses: 2 }, bad: "notanobject" },
    });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.success).toBe(true);
    expect(data.hits).toBe(0);                   // Number("oops")||0
    expect(Number.isNaN(data.hitRate as number)).toBe(false);
    const bg = (data.byGalaxy as Array<Record<string, unknown>>) ?? [];
    const mill = bg.find((g) => g.galaxy === "mill");
    expect(mill?.hits).toBe(0);                  // Number("x")||0
    expect(mill?.misses).toBe(2);
    expect(Number.isNaN(mill?.hitRate as number)).toBe(false); // 0/2 = 0, guarded
  });

  // ── U-CAG-HITRATE-HONESTY (slot:alpha 2026-06-15): miss-reason segmentation + warm hit-rate ──
  // The dispatcher MIRRORS warmRateFields()/normalizeMissReasons() from galaxy-cag-cache.mjs (the
  // lib is outside the TS build). These pin the dispatcher's new branches AND parity with the lib.
  // NOTE: ok()->slimResponse strips null/undefined, so a null warmHitRate arrives as an ABSENT key
  // (assert with `?? null`); numeric rates and 0-valued counts survive slimming.

  it("surfaces warm hit-rate + miss-reason segmentation (cold-start dominated, cache healthy)", async () => {
    // The real PRISM case once tagged: raw ~10% but every miss is a NOVEL first-ask -> warm 100%.
    writeStats(statsFile, {
      hits: 4, misses: 38, missReasons: { novel: 38 },
      byGalaxy: { mill: { hits: 1, misses: 2, missReasons: { novel: 2 } } },
    });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.hitRate).toBeCloseTo(4 / 42, 10);          // raw contract preserved
    expect(data.warmHitRate).toBe(1);                       // 4 / (4 + 0 invalidated)
    expect(data.addressableMisses).toBe(0);
    expect(data.coldMisses).toBe(38);
    expect(data.unclassifiedMisses).toBe(0);
    expect(data.missReasons).toEqual({ novel: 38, invalidated: 0, error: 0 });
    const mill = (data.byGalaxy as Array<Record<string, unknown>>).find((g) => g.galaxy === "mill");
    expect(mill?.warmHitRate).toBe(1);
    expect(mill?.coldMisses).toBe(2);
  });

  it("warmHitRate is null (slimmed -> absent) for untagged legacy data, raw rate intact", async () => {
    writeStats(statsFile, { hits: 4, misses: 38, byGalaxy: { mill: { hits: 1, misses: 2 } } }); // no missReasons
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.hitRate).toBeCloseTo(4 / 42, 10);          // existing contract byte-for-byte
    expect(data.warmHitRate ?? null).toBe(null);            // null stripped by slimResponse -> absent
    expect(data.unclassifiedMisses).toBe(38);
  });

  it("invalidation churn surfaces through the dispatcher (warm-rate exposes the fixable miss)", async () => {
    writeStats(statsFile, { hits: 2, misses: 8, missReasons: { novel: 2, invalidated: 6 }, byGalaxy: {} });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.warmHitRate).toBe(0.25);                    // 2 / (2 + 6)
    expect(data.addressableMisses).toBe(6);
    expect(data.coldMisses).toBe(2);
  });

  it("KEEP-IN-SYNC: dispatcher warm math matches the lib's canonical values for a 3-bucket fixture", async () => {
    // The dispatcher duplicates warmRateFields()/normalizeMissReasons() because galaxy-cag-cache.mjs
    // is outside the TS build. Rather than a cross-build import, this asserts the SAME canonical
    // values that the lib's own warmRateFields test pins for the IDENTICAL input -- a divergence in
    // EITHER implementation fails its own test, pinning the keep-in-sync contract from both sides
    // (closes the 3-of-3 scrutiny drift hazard). The mirror in galaxy-cag-cache-stats.test.mjs uses
    // warmRateFields(5, 11, {novel:7,invalidated:3,error:1}) -> 0.625 and (3,5,{3,2,0}) -> 0.6.
    writeStats(statsFile, {
      hits: 5, misses: 11, missReasons: { novel: 7, invalidated: 3, error: 1 },
      byGalaxy: { mill: { hits: 3, misses: 5, missReasons: { novel: 3, invalidated: 2 } } },
    });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.warmHitRate).toBe(0.625);                   // 5 / (5 + 3 invalidated); error excluded
    expect(data.addressableMisses).toBe(3);
    expect(data.coldMisses).toBe(7);
    expect(data.unclassifiedMisses).toBe(0);                // classified 7+3+1 == 11 misses
    expect(data.missReasons).toEqual({ novel: 7, invalidated: 3, error: 1 });
    const mill = (data.byGalaxy as Array<Record<string, unknown>>).find((g) => g.galaxy === "mill");
    expect(mill?.warmHitRate).toBe(0.6);                    // 3 / (3 + 2)
    expect(mill?.addressableMisses).toBe(2);
  });

  it("legacy-quarantine: a frozen legacyUntaggedBaseline lets warm-rate COMPUTE through the dispatcher (was null)", async () => {
    // The real live shape post-U-CAG-WARM-RATE-LEGACY-QUARANTINE: 38 pre-instrumentation untagged
    // misses quarantined, so the post-instrumentation window (35 novel + 7 hits) computes instead of n/a.
    writeStats(statsFile, {
      hits: 7, misses: 73, missReasons: { novel: 35 }, legacyUntaggedBaseline: 38,
      byGalaxy: {
        mill: { hits: 3, misses: 5, missReasons: { novel: 2 }, legacyUntaggedBaseline: 3 },
        // a galaxy with a NEW untagged miss BEYOND its baseline still nulls -> un-instrumented caller not masked
        leaky: { hits: 1, misses: 4, missReasons: { novel: 1 }, legacyUntaggedBaseline: 2 },
      },
    });
    const data = await invoke(handler, "cag_stats", { cag_stats_file: statsFile });
    expect(data.warmHitRate).toBe(1);                       // 73 - 35 - 38(legacy) = 0 unclassified -> 7/(7+0)
    expect(data.unclassifiedMisses).toBe(0);
    expect(data.legacyUntaggedBaseline).toBe(38);
    const galaxies = data.byGalaxy as Array<Record<string, unknown>>;
    expect(galaxies.find((g) => g.galaxy === "mill")?.warmHitRate).toBe(1);  // 5 - 2 - 3 = 0 -> 3/3
    const leaky = galaxies.find((g) => g.galaxy === "leaky");
    expect(leaky?.warmHitRate ?? null).toBe(null);          // 4 - 1 - 2 = 1 untagged > 0 -> null (honest)
    expect(leaky?.unclassifiedMisses).toBe(1);
  });
});
