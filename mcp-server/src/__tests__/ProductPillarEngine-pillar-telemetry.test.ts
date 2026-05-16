/**
 * ProductPillarEngine — PILLAR-TELEMETRY-FIX regression suite
 *
 * Context: the CLAUDE-BRIEF #1 hidden gap was "Pillar telemetry rot" —
 * prism_dev:pillar_summary reported all 8 pillars status:stub / 0% while
 * 3,046+ engines exist, because the dispatcher fed the pure
 * getSummary(Set,Set) an EMPTY wired-engine set on the no-param self-report
 * path. The fix adds live resolvers (dependency-injected for unit purity) +
 * getSummaryLive() + a dispatcher seam that resolves the real tree when no
 * params are passed.
 *
 * This suite COMPLEMENTS the pre-existing pure-core coverage in
 * MXU-MS4-6.test.ts (listPillars/getPillar/scorePillar/getSummary/checkGate
 * etc.) — it does NOT replace it. This file adds the live-telemetry
 * regression oracle the older suite has no notion of. Do not delete
 * MXU-MS4-6 thinking this superseded it.
 *
 * Each test encodes the INTENT (why the behavior matters); the suite must
 * fail if the rot is reintroduced:
 *   - the pure path stays unchanged (zero regression for explicit callers)
 *   - the live path measures the real tree (avg_pct > 0, >=1 non-stub)
 *   - "couldn't measure" is reported as unavailable, never a fake 0%
 *   - the dispatcher no-param path is non-zero (round-trip through dispatcher)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ProductPillarEngine,
  productPillarEngine,
  resolveWiredEngines,
  resolveLivePillarInputs,
  defaultDispatcherSourceReader,
  defaultSkillLister,
  type DispatcherSourceReader,
} from "../engines/ProductPillarEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// ── helpers ────────────────────────────────────────────────────────────────

function readerWith(body: string): DispatcherSourceReader {
  return () => new Map([["synthetic.ts", body]]);
}

const ALL_CALC_ENGINES = [
  "SpeedFeedOrchestratorEngine", "KienzleForceModelEngine", "ChatterStabilityLobeEngine",
  "CuttingTemperatureEngine", "SurfaceFinishPredictorEngine", "DeflectionAnalysisEngine",
  "ThermalWearCouplingEngine", "SpeedFeedAutopilotEngine", "UltimateSpeedFeedEngine",
];

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}
async function callDispatcher(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown>; rawText: string }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown>, rawText: JSON.stringify(raw) };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  return { ok: true, data: JSON.parse(text) as Record<string, unknown>, rawText: text };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. PURE-CORE REGRESSION — explicit getSummary(Set,Set) must be UNCHANGED
// ════════════════════════════════════════════════════════════════════════════

describe("ProductPillarEngine — pure-core contract (zero regression)", () => {
  const engine = new ProductPillarEngine();

  it("getSummary(empty,empty) scores all 8 pillars stub at 0% and emits NO live-only fields", () => {
    const s = engine.getSummary(new Set(), new Set());
    expect(s.total_pillars).toBe(8);
    expect(s.stub).toBe(8);
    expect(s.ready).toBe(0);
    expect(s.partial).toBe(0);
    expect(s.avg_completeness_pct).toBe(0);
    expect(s.pillars).toHaveLength(8);
    // Legacy consumers must see ZERO shape change on the explicit path — the
    // live-only keys must be absent from the serialized payload entirely.
    const serialized = JSON.stringify(s);
    expect(serialized.includes("telemetry_source")).toBe(false);
    expect(serialized.includes("resolved_wired_total")).toBe(false);
  });

  it("scorePillar('calculator', empty, empty) → 9 engines, 0 wired, 9 missing, stub", () => {
    const c = engine.scorePillar("calculator", new Set(), new Set());
    expect(c.total_engines).toBe(9);
    expect(c.wired_engines).toBe(0);
    expect(c.completeness_pct).toBe(0);
    expect(c.status).toBe("stub");
    expect(c.missing).toHaveLength(9);
    expect(c.missing).toContain("KienzleForceModelEngine");
  });

  it("scorePillar with full calculator set + a real entry skill → ready", () => {
    const c = engine.scorePillar("calculator", new Set(ALL_CALC_ENGINES), new Set(["calc"]));
    expect(c.wired_engines).toBe(9);
    expect(c.completeness_pct).toBe(100);
    expect(c.entry_points_active).toBe(1);
    expect(c.status).toBe("ready");
    expect(c.missing).toHaveLength(0);
  });

  it("scorePillar at the 33.3% boundary → partial (>=30 leaves stub, <80 not ready)", () => {
    const c = engine.scorePillar("calculator", new Set(ALL_CALC_ENGINES.slice(0, 3)), new Set());
    expect(c.completeness_pct).toBeCloseTo(33.3, 1);
    expect(c.status).toBe("partial");
    expect(c.wired_engines).toBe(3);
  });

  it("scorePillar at 80% but ZERO active skills stays partial (ready needs entry skill)", () => {
    // 8/9 = 88.9% ≥ 80, but no entry skill ⇒ status must remain partial,
    // because a pillar with no working entry point is not user-ready.
    const c = engine.scorePillar("calculator", new Set(ALL_CALC_ENGINES.slice(0, 8)), new Set());
    expect(c.completeness_pct).toBeCloseTo(88.9, 1);
    expect(c.entry_points_active).toBe(0);
    expect(c.status).toBe("partial");
  });

  it("scorePillar(unknown pillar) returns a safe stub record, never throws", () => {
    const c = engine.scorePillar("does-not-exist" as never, new Set(), new Set());
    expect(c.status).toBe("stub");
    expect(c.total_engines).toBe(0);
    expect(c.pillar_name).toBe("Unknown");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. resolveWiredEngines — injected reader, word-boundary, failure modes
// ════════════════════════════════════════════════════════════════════════════

describe("resolveWiredEngines — live wiring detection", () => {
  it("marks an engine wired when a dispatcher file imports it by name", () => {
    const r = resolveWiredEngines(readerWith(`await import("../engines/KienzleForceModelEngine.js")`));
    expect(r.source).toBe("live");
    expect(r.wired.has("KienzleForceModelEngine")).toBe(true);
    expect(r.wired.has("SpeedFeedOrchestratorEngine")).toBe(false);
  });

  it("resolves distinct engines across files and dedupes repeats", () => {
    const reader: DispatcherSourceReader = () => new Map([
      ["a.ts", "SpeedFeedOrchestratorEngine SpeedFeedOrchestratorEngine"],
      ["b.ts", "KienzleForceModelEngine"],
    ]);
    const r = resolveWiredEngines(reader);
    expect(r.wired.has("SpeedFeedOrchestratorEngine")).toBe(true);
    expect(r.wired.has("KienzleForceModelEngine")).toBe(true);
    expect([...r.wired].filter((x) => x === "SpeedFeedOrchestratorEngine")).toHaveLength(1);
  });

  it("ADVERSARIAL: substring noise does NOT count (word boundary stops false-positives)", () => {
    const r = resolveWiredEngines(readerWith("class SPCEngineWrapperFoo {} const x = SPCEngineHelperBar;"));
    expect(r.wired.has("SPCEngine")).toBe(false);
  });

  it("token-bounded match fires on a real reference with punctuation around it", () => {
    const r = resolveWiredEngines(readerWith(`import {SPCEngine} from "x"; new SPCEngine();`));
    expect(r.wired.has("SPCEngine")).toBe(true);
  });

  it("FAILURE: reader that throws → unavailable, empty set, no exception escapes", () => {
    const r = resolveWiredEngines(() => { throw new Error("EACCES"); });
    expect(r.source).toBe("unavailable");
    expect(r.wired.size).toBe(0);
  });

  it("FAILURE: empty map → unavailable (cannot-measure is NOT the same as 0% wired)", () => {
    const r = resolveWiredEngines(() => new Map());
    expect(r.source).toBe("unavailable");
    expect(r.wired.size).toBe(0);
  });

  it("empty file bodies → source live but nothing matched (a genuine measured zero)", () => {
    const r = resolveWiredEngines(() => new Map([["a.ts", ""], ["b.ts", ""]]));
    expect(r.source).toBe("live");
    expect(r.wired.size).toBe(0);
  });

  it("ADVERSARIAL: a non-string body value is skipped, sibling file still resolves", () => {
    const r = resolveWiredEngines(
      () => new Map([["a.ts", null as unknown as string], ["b.ts", "KienzleForceModelEngine"]]),
    );
    expect(r.source).toBe("live");
    expect(r.wired.has("KienzleForceModelEngine")).toBe(true);
    expect(r.wired.size).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. resolveLivePillarInputs — compose wiring + skills, fail-soft
// ════════════════════════════════════════════════════════════════════════════

describe("resolveLivePillarInputs — composed live inputs", () => {
  it("wires engines + collects skills from injected readers", () => {
    const r = resolveLivePillarInputs(
      readerWith(ALL_CALC_ENGINES.join(" ")),
      () => ["calc", "auto-speed-feed"],
    );
    expect(r.source).toBe("live");
    expect(r.wired.size).toBe(ALL_CALC_ENGINES.length);
    expect(r.skills.has("calc")).toBe(true);
    expect(r.skills.has("auto-speed-feed")).toBe(true);
  });

  it("skill lister throwing leaves the wired resolution intact (fail-soft)", () => {
    const r = resolveLivePillarInputs(
      readerWith("KienzleForceModelEngine"),
      () => { throw new Error("readdir failed"); },
    );
    expect(r.wired.has("KienzleForceModelEngine")).toBe(true);
    expect(r.skills.size).toBe(0);
    expect(r.source).toBe("live");
  });

  it("reader unavailable propagates 'unavailable' even when skills resolve fine", () => {
    const r = resolveLivePillarInputs(() => new Map(), () => ["calc"]);
    expect(r.source).toBe("unavailable");
    expect(r.skills.has("calc")).toBe(true);
    expect(r.wired.size).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. getSummaryLive — status transitions + telemetry_source stamping
// ════════════════════════════════════════════════════════════════════════════

describe("ProductPillarEngine.getSummaryLive — stamped, honest, transitions", () => {
  const engine = new ProductPillarEngine();

  it("full calculator wiring + entry skill → calculator ready, source live, totals stamped", () => {
    const s = engine.getSummaryLive({
      wiredReader: readerWith(ALL_CALC_ENGINES.join("\n")),
      skillLister: () => ["calc", "auto-speed-feed", "sfc-quick-start"],
    });
    expect(s.telemetry_source).toBe("live");
    expect(s.resolved_wired_total).toBe(ALL_CALC_ENGINES.length);
    expect(s.resolved_skill_total).toBe(3);
    const calc = s.pillars.find((p) => p.pillar_id === "calculator")!;
    expect(calc.status).toBe("ready");
    expect(calc.completeness_pct).toBe(100);
    expect(s.avg_completeness_pct).toBeGreaterThan(0);
  });

  it("partial wiring, no skills → calculator partial at 55.6%, not ready", () => {
    const s = engine.getSummaryLive({
      wiredReader: readerWith(ALL_CALC_ENGINES.slice(0, 5).join(" ")),
      skillLister: () => [],
    });
    const calc = s.pillars.find((p) => p.pillar_id === "calculator")!;
    expect(calc.completeness_pct).toBeCloseTo(55.6, 1);
    expect(calc.status).toBe("partial");
    expect(s.resolved_skill_total).toBe(0);
  });

  it("reader unavailable → telemetry_source 'unavailable' so 0% is NOT read as 'nothing wired'", () => {
    const s = engine.getSummaryLive({ wiredReader: () => new Map(), skillLister: () => [] });
    expect(s.telemetry_source).toBe("unavailable");
    expect(s.avg_completeness_pct).toBe(0);
    expect(s.resolved_wired_total).toBe(0);
    expect(s.stub).toBe(8);
  });

  it("a measured zero (live, nothing matched) is DISTINCT from unavailable", () => {
    const s = engine.getSummaryLive({
      wiredReader: () => new Map([["x.ts", "no engine names here at all"]]),
      skillLister: () => [],
    });
    expect(s.telemetry_source).toBe("live");
    expect(s.avg_completeness_pct).toBe(0);
    expect(s.resolved_wired_total).toBe(0);
  });

  it("default getSummaryLive (no opts) returns 8 pillars and a concrete source verdict", () => {
    const s = engine.getSummaryLive();
    expect(s.total_pillars).toBe(8);
    expect(s.pillars).toHaveLength(8);
    expect(["live", "unavailable"]).toContain(s.telemetry_source);
    // In the dev tree the dispatcher source exists, so resolution must be live
    // and must surface real wiring — a non-negative measured count.
    expect(s.resolved_wired_total).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. REAL-DATA E2E — the regression oracle (RGS-MS1 lesson: pure-core +
//    injected-reader MUST ship one real-data test or wiring is unproven)
// ════════════════════════════════════════════════════════════════════════════

describe("REAL-DATA E2E — getSummaryLive against the actual tree", () => {
  it("default readers measure real wiring: live, ≥5 engines, avg>0, ≥1 non-stub pillar", () => {
    const s = productPillarEngine.getSummaryLive();
    expect(s.telemetry_source).toBe("live");
    // The old self-report path returned 0% for ALL 8 pillars. The live path
    // must surface real wiring: the calculator pillar alone has 9 engines and
    // sampling showed ≥7 are referenced in dispatchers.
    expect(s.resolved_wired_total!).toBeGreaterThanOrEqual(5);
    expect(s.avg_completeness_pct).toBeGreaterThan(0);
    expect(s.pillars.filter((p) => p.status !== "stub").length).toBeGreaterThanOrEqual(1);
  });

  it("the default dispatcher reader finds the real dispatcher source set (≥20 entries or the bundle)", () => {
    const files = defaultDispatcherSourceReader();
    // Dev tree has ~98 dispatcher .ts files; prod resolves the single bundle.
    const isBundle = files.has("dist/index.js");
    expect(isBundle || files.size >= 20).toBe(true);
    // Whatever was found must carry real content, not empty placeholders.
    const totalChars = [...files.values()].reduce((n, c) => n + c.length, 0);
    expect(totalChars).toBeGreaterThan(10000);
  });

  it("the default skill lister finds the real command set (≥20 skills) incl. a stable one", () => {
    const skills = defaultSkillLister();
    expect(skills.length).toBeGreaterThanOrEqual(20);
    // Canary: at least one high-stability skill must resolve, else the lister
    // is pointed at the wrong dir (silent skill-telemetry rot). OR-combined
    // across several long-lived commands so a single rename can't red the
    // suite — only ALL of them vanishing (a real lister failure) trips it.
    const stable = ["checkin", "handoff", "precompact", "scrutinize", "dedup"];
    expect(stable.some((s) => skills.includes(s))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. DISPATCHER ROUND-TRIP — invoke through devDispatcher, not the singleton
// ════════════════════════════════════════════════════════════════════════════

describe("devDispatcher × pillar_summary/pillar_score (PILLAR-TELEMETRY-FIX seam)", () => {
  let server: MockMCPServer;
  beforeEach(() => {
    server = new MockMCPServer();
    registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  });

  it("pillar_summary with NO params resolves live → avg_pct>0 (rot fixed at the seam)", async () => {
    const r = await callDispatcher(server, "pillar_summary", {});
    expect(r.ok).toBe(true);
    expect(r.data.telemetry_source).toBe("live");
    expect(r.data.avg_completeness_pct as number).toBeGreaterThan(0);
    expect(r.data.resolved_wired_total as number).toBeGreaterThanOrEqual(5);
  });

  it("pillar_summary WITH explicit empty sets keeps the pure path (back-compat, no stamp)", async () => {
    const r = await callDispatcher(server, "pillar_summary", { wired_engines: [], active_skills: [] });
    expect(r.ok).toBe(true);
    expect(r.data.avg_completeness_pct).toBe(0);
    // Legacy shape: the explicit path must not leak the live-only field.
    expect(r.rawText.includes("telemetry_source")).toBe(false);
  });

  it("pillar_summary WITH explicit full calculator set scores that pillar ready", async () => {
    const r = await callDispatcher(server, "pillar_summary", {
      wired_engines: ALL_CALC_ENGINES,
      active_skills: ["calc"],
    });
    expect(r.ok).toBe(true);
    const pillars = r.data.pillars as Array<{ pillar_id: string; status: string }>;
    expect(pillars.find((p) => p.pillar_id === "calculator")!.status).toBe("ready");
  });

  it("pillar_score with NO params resolves live for the named pillar (was always 0)", async () => {
    const r = await callDispatcher(server, "pillar_score", { pillar_id: "calculator" });
    expect(r.ok).toBe(true);
    expect(r.data.wired_engines as number).toBeGreaterThan(0);
    expect(r.data.total_engines).toBe(9);
  });

  it("pillar_score WITH explicit sets keeps the legacy path → ready", async () => {
    const r = await callDispatcher(server, "pillar_score", {
      pillar_id: "calculator",
      wired_engines: ALL_CALC_ENGINES,
      active_skills: ["calc"],
    });
    expect(r.ok).toBe(true);
    expect(r.data.status).toBe("ready");
    expect(r.data.wired_engines).toBe(9);
  });
});
