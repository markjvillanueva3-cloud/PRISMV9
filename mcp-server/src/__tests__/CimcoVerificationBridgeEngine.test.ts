/**
 * CimcoVerificationBridgeEngine.test.ts — real-behavior tests for SPINE-1.
 *
 * Two layers:
 *   1. evaluateSimulationReport CONTRACT/PARITY tests — cwd-independent, ALWAYS run.
 *      These lock the faithful TS port against the canonical
 *      scripts/cimco-control-map.mjs#parseSimulationReport rule. If the canonical
 *      rule changes, BOTH must change — these tests catch the drift.
 *   2. Inventory INTEGRATION tests — assert against the real generated index JSON
 *      (state/shared/cimco/*.json). Graceful-skip if the corpus is absent (mirrors
 *      the .mjs indexer test pattern), so the suite is portable.
 *
 * Run: npx vitest run src/__tests__/CimcoVerificationBridgeEngine.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  CimcoVerificationBridgeEngine,
  cimcoVerificationBridgeEngine,
  CIMCO_CONTROL_CHANNELS,
} from "../engines/post-processor/CimcoVerificationBridgeEngine.js";
import { dispatchCimco } from "../tools/dispatchers/cimcoDispatcher.js";
// The canonical .mjs rule — imported so the parity test is a PROGRAMMATIC cross-check (not hand-mirrored).
import { parseSimulationReport } from "../../../scripts/cimco-control-map.mjs";

const engine = new CimcoVerificationBridgeEngine();

// ────────────────────────────────────────────────────────────────────────────
// 1. evaluateSimulationReport — CONTRACT / PARITY (always runs, pure logic)
// ────────────────────────────────────────────────────────────────────────────
describe("evaluateSimulationReport — pass/fail gate (faithful port of parseSimulationReport)", () => {
  it("empty report UNCONFIRMED = conformance-pass but NOT cleared for live run (fail-OPEN guard, U-CIMCO-SIM-VERDICT-HARDEN)", () => {
    // An empty report is AMBIGUOUS: clean sim OR the collision-check pass never ran. `pass` stays
    // structural; `clearedForLiveRun` (the safety verdict) is FALSE. Parity with parseSimulationReport.
    const v = engine.evaluateSimulationReport(null);
    expect(v.pass).toBe(true); // structural: nothing parsed
    expect(v.controllerVerified).toBe(false);
    expect(v.counts).toEqual({ error: 0, warning: 0, collision: 0, limit: 0 });
    expect(v.collisionCheckConfirmed).toBe(false);
    expect(v.clearedForLiveRun).toBe(false);
    expect(v.summary).toMatch(/UNCONFIRMED/);
    expect(v.summary).toMatch(/NOT cleared for live run/);
  });

  it("empty report WITH collisionCheckRan:true = CLEAN + cleared for live run", () => {
    const v = engine.evaluateSimulationReport({ collisionCheckRan: true } as Record<string, unknown>);
    expect(v.pass).toBe(true);
    expect(v.collisionCheckConfirmed).toBe(true);
    expect(v.clearedForLiveRun).toBe(true);
    expect(v.summary).toMatch(/CLEAN/);
    expect(v.summary).toMatch(/NOT controller-verified/);
  });

  it("gouge fails as a collision; a tool-change row is advisory (no false-fail) — parity with .mjs", () => {
    const gouge = engine.evaluateSimulationReport([{ type: "Gouge", line: 12, description: "tool into floor" }]);
    expect(gouge.counts.collision).toBe(1);
    expect(gouge.pass).toBe(false);
    const tc = engine.evaluateSimulationReport([{ type: "Tool Change", line: 5, description: "T03" }]);
    expect(tc.counts.warning).toBe(1);
    expect(tc.counts.error).toBe(0); // a normal stop event must NOT classify as a failing error
    expect(tc.pass).toBe(true);
    expect(tc.collisionCheckConfirmed).toBe(true); // a row present ⇒ the check ran
    expect(tc.clearedForLiveRun).toBe(true);
  });

  it("a collision report is confirmed-ran but NOT cleared (findings present, pass:false)", () => {
    const v = engine.evaluateSimulationReport([{ type: "Collision", line: 9, description: "tool vs fixture" }]);
    expect(v.collisionCheckConfirmed).toBe(true);
    expect(v.clearedForLiveRun).toBe(false);
  });

  it("a stop-event TYPE with a HAZARD in the DESCRIPTION is NOT downgraded (defense-in-depth)", () => {
    const masked = engine.evaluateSimulationReport([{ type: "Tool Change", line: 7, description: "COLLISION with fixture" }]);
    expect(masked.counts.collision).toBe(1);
    expect(masked.counts.warning).toBe(0);
    expect(masked.pass).toBe(false);
    expect(masked.clearedForLiveRun).toBe(false);
    // a genuinely benign tool change still downgrades (no false-fail)
    const benign = engine.evaluateSimulationReport([{ type: "Tool Change", line: 5, description: "T03 indexed OK" }]);
    expect(benign.counts.warning).toBe(1);
    expect(benign.pass).toBe(true);
  });

  it("PARITY (programmatic): evaluateSimulationReport (TS) === parseSimulationReport (.mjs canonical) on shared fixtures", () => {
    // The real drift-guard the header promises — not hand-mirrored assertions. Any future edit to one
    // classifier that is not mirrored in the other is caught here (PRISM N-divergent-implementations lesson).
    const fixtures: unknown[] = [
      null,
      [],
      {},
      { collisionCheckRan: true },
      [{ type: "Collision", line: 120, description: "holder vs fixture", action: "retract" }],
      [{ type: "Over-travel", line: 50 }],
      [{ type: "Warning", line: 5, description: "near limit" }],
      [{ type: "Gouge", line: 12, description: "tool into floor" }],
      [{ type: "Tool Change", line: 5, description: "T03 indexed OK" }],
      [{ type: "Tool Change", line: 7, description: "COLLISION with fixture" }],
      [{ type: "Program Stop", line: 9, description: "Y over-travel beyond limit" }],
      [{ description: "unclassified problem", line: 9 }],
      ["N120 | Collision | holder vs fixture | retract"],
      { collision: 0, collisions: [{ line: 2, description: "holder vs vise" }] },
    ];
    // controllerVerified is TS-only; compare the shared verdict surface both implementations produce.
    const pick = (v: { pass: unknown; counts: unknown; firstOffendingLine: unknown; collisionCheckConfirmed: unknown; clearedForLiveRun: unknown; summary: unknown }) => ({
      pass: v.pass,
      counts: v.counts,
      firstOffendingLine: v.firstOffendingLine,
      collisionCheckConfirmed: v.collisionCheckConfirmed,
      clearedForLiveRun: v.clearedForLiveRun,
      summary: v.summary,
    });
    for (const fx of fixtures) {
      const ts = engine.evaluateSimulationReport(fx as Parameters<typeof engine.evaluateSimulationReport>[0]);
      const mjs = parseSimulationReport(fx);
      expect(pick(ts)).toEqual(pick(mjs));
    }
  });

  it("a collision row FAILS and reports the offending line", () => {
    const v = engine.evaluateSimulationReport([
      { type: "Collision", line: 120, description: "holder vs fixture", action: "retract" },
    ]);
    expect(v.pass).toBe(false);
    expect(v.counts.collision).toBe(1);
    expect(v.firstOffendingLine).toBe(120);
    expect(v.summary).toMatch(/FAIL/);
    expect(v.collisions[0].description).toBe("holder vs fixture");
  });

  it("an over-travel / limit row FAILS (classified as limit)", () => {
    const v = engine.evaluateSimulationReport([{ type: "Over-travel", line: 50 }]);
    expect(v.pass).toBe(false);
    expect(v.counts.limit).toBe(1);
    expect(v.counts.collision).toBe(0);
  });

  it("a warning-only report PASSES (warnings do not fail the gate)", () => {
    const v = engine.evaluateSimulationReport([{ type: "Warning", line: 5, description: "near limit" }]);
    expect(v.pass).toBe(true);
    expect(v.counts.warning).toBe(1);
  });

  it("a typeless row is fail-safe → classified as error → FAILS", () => {
    const v = engine.evaluateSimulationReport([{ description: "unclassified problem", line: 9 }]);
    expect(v.pass).toBe(false);
    expect(v.counts.error).toBe(1);
  });

  it("parses delimited LINE/TYPE/DESCRIPTION/ACTION strings (N-prefixed line)", () => {
    const v = engine.evaluateSimulationReport(["N120 | Collision | holder vs fixture | retract"]);
    expect(v.pass).toBe(false);
    expect(v.counts.collision).toBe(1);
    expect(v.collisions[0].line).toBe(120);
    expect(v.collisions[0].action).toBe("retract");
  });

  it("accepts a grouped {collisions,warnings,...} object", () => {
    const v = engine.evaluateSimulationReport({
      collisions: [{ line: 7, description: "spindle vs clamp" }],
      warnings: [{ line: 1, description: "fast feed" }],
    });
    expect(v.pass).toBe(false);
    expect(v.counts.collision).toBe(1);
    expect(v.counts.warning).toBe(1);
    expect(v.firstOffendingLine).toBe(7);
  });

  it("grouped object: a falsy-but-present singular key does NOT mask a populated plural array (|| not ??, fail-open guard)", () => {
    // Regression lock for the 3-of-3 arm-B P0: `{collision: 0, collisions:[...]}` must FAIL.
    // With `??` the `0` would be kept, Array.isArray(0)=false, and the real findings silently dropped → fail-OPEN.
    const v = engine.evaluateSimulationReport({
      collision: 0,
      collisions: [{ line: 2, description: "holder vs vise" }],
      error: "",
      errors: [{ line: 11, description: "unreachable retract" }],
    } as Record<string, unknown>);
    expect(v.pass).toBe(false);
    expect(v.counts.collision).toBe(1);
    expect(v.counts.error).toBe(1);
    expect(v.firstOffendingLine).toBe(2);
  });

  it("orders multiple offenders and surfaces the earliest line first", () => {
    const v = engine.evaluateSimulationReport([
      { type: "Error", line: 300 },
      { type: "Collision", line: 80 },
      { type: "Limit", line: 150 },
    ]);
    expect(v.pass).toBe(false);
    expect(v.firstOffendingLine).toBe(80);
    expect(v.counts.error + v.counts.collision + v.counts.limit).toBe(3);
  });

  it("throws on a non-array/non-object/non-null input (contract guard)", () => {
    // @ts-expect-error — deliberately wrong type to verify the guard
    expect(() => engine.evaluateSimulationReport(42)).toThrow(/expected array/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. controlChannels — static doctrine
// ────────────────────────────────────────────────────────────────────────────
describe("controlChannels — API/CLI-before-UI doctrine", () => {
  it("returns the 5 ranked channels with FILE first and UIA last", () => {
    const c = engine.controlChannels();
    expect(c.channels.length).toBe(5);
    expect(CIMCO_CONTROL_CHANNELS[0].channel).toBe("FILE");
    expect(CIMCO_CONTROL_CHANNELS[CIMCO_CONTROL_CHANNELS.length - 1].channel).toBe("UIA");
    expect(c.doctrine).toMatch(/No screenshots/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Inventory queries — INTEGRATION against the real index corpus
// ────────────────────────────────────────────────────────────────────────────
describe("inventory queries — real CIMCO index corpus (graceful-skip if absent)", () => {
  const s = engine.summary();
  const corpusPresent = s.available.machines && s.available.posts && s.available.tools;

  it("summary surfaces counts + the units-unresolved data-quality headline", () => {
    if (!corpusPresent) return; // corpus not generated on this machine
    expect(s.machines!.count).toBeGreaterThanOrEqual(80);
    expect(s.posts!.jsPosts).toBeGreaterThanOrEqual(20);
    expect(s.tools!.cutters).toBeGreaterThanOrEqual(200);
    // UNITS-FIRST: the 44 vendor .mcfg without declared units must be surfaced, never hidden.
    expect(s.unitsUnresolvedTotal).toBeGreaterThanOrEqual(1);
  });

  it("machineQuery filters by orientation and every row carries a units-resolution flag", () => {
    if (!corpusPresent) return;
    const lathes = engine.machineQuery({ orientation: "Lathe" });
    expect(lathes.available).toBe(true);
    expect(lathes.count).toBeGreaterThanOrEqual(1);
    for (const m of lathes.machines) {
      expect(m.orientation).toBe("Lathe");
      expect(typeof m.unitsResolved).toBe("boolean"); // units-first invariant
    }
  });

  it("machineQuery unitsResolvedOnly excludes the unresolved-units machines", () => {
    if (!corpusPresent) return;
    const resolved = engine.machineQuery({ unitsResolvedOnly: true });
    expect(resolved.unitsUnresolvedInMatch).toBe(0);
    for (const m of resolved.machines) expect(m.unitsResolved).toBe(true);
  });

  it("postQuery distinguishes authorable .js from binary .eRPost controllers", () => {
    if (!corpusPresent) return;
    const posts = engine.postQuery({});
    expect(posts.available).toBe(true);
    expect(posts.jsPostCount).toBeGreaterThanOrEqual(1);
    // .eRPost are compiled — must NEVER be claimed text-authorable.
    for (const c of posts.controllers) expect(c.authorable).toBe(false);
    const turn = engine.postQuery({ kind: "js", type: "TURN" });
    for (const p of turn.jsPosts) expect((p.type ?? "").toUpperCase()).toMatch(/TURN/);
  });

  it("toolQuery filters by unit system (units-first)", () => {
    if (!corpusPresent) return;
    const metric = engine.toolQuery({ unitSystem: "Metric", limit: 5 });
    expect(metric.available).toBe(true);
    for (const t of metric.tools) expect(t.unitSystem).toBe("Metric");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3b. Blind-navigation map — INTEGRATION against the real nav-map.json
// ────────────────────────────────────────────────────────────────────────────
describe("navQuery / navReadiness — blind-nav surface map (graceful-skip if absent)", () => {
  const r = engine.navReadiness();
  const navPresent = (r as { available: boolean }).available === true;

  it("navReadiness surfaces critical-path navigability + the honest UIA-verdict gaps", () => {
    if (!navPresent) return; // nav-map.json not generated on this machine
    const rr = r as any;
    expect(rr.surfaceCount).toBeGreaterThanOrEqual(400);
    expect(rr.proofRelevant).toBeGreaterThan(0);
    // Every verified critical path is navigable; the map is honest about the UIA wall via gaps.
    expect(rr.fullyNavigable).toBe(true);
    expect(rr.blindNavGaps.length).toBeGreaterThan(0);
    expect(rr.recommendedNextUnits.length).toBeGreaterThanOrEqual(3);
    expect(typeof rr.postProvingReadiness).toBe("string");
  });

  it("navQuery channel filter returns only that channel; proof_relevant narrows to provable surfaces", () => {
    if (!navPresent) return;
    const fileSurfaces = engine.navQuery({ channel: "file" });
    expect(fileSurfaces.available).toBe(true);
    for (const s of fileSurfaces.surfaces) expect(s.channel).toBe("file");
    const proof = engine.navQuery({ proofRelevant: true, limit: 600 });
    for (const s of proof.surfaces) {
      expect(s.postProvingRelevance == null || s.postProvingRelevance === "").toBe(false);
    }
  });

  it("navQuery text search finds the simulation-report surface family", () => {
    if (!navPresent) return;
    const sim = engine.navQuery({ text: "simulation", limit: 600 });
    expect(sim.count).toBeGreaterThan(0);
  });
});

describe("launchSurface — how a blind agent starts/drives CIMCO (graceful-skip if absent)", () => {
  const ls = engine.launchSurface() as any;
  const present = ls.available === true;

  it("launchSurface catalogs the exe inventory + the blind-safe External-Commands hook", () => {
    if (!present) return; // launch-surface.json not generated on this machine
    expect(ls.exeCount).toBeGreaterThanOrEqual(4);
    expect(ls.executables.some((e: any) => /CIMCOEdit\.exe/.test(e.exe))).toBe(true);
    // The headline finding: a FILE-channel integration hook that needs no UIA.
    expect(ls.integrationHook).not.toBeNull();
    expect(ls.integrationHook.blindSafe).toBe(true);
    expect(ls.integrationHook.macros).toHaveProperty("$FILEPATH");
  });

  it("launchSurface splits verified launch patterns from needs-live-verify honestly (no over-claim)", () => {
    if (!present) return;
    // open-file is the one a blind agent relies on; it must be in the verified set.
    expect(ls.verifiedLaunchPatterns.some((p: any) => p.id === "open-file")).toBe(true);
    // the compare/sim-replay patterns are honestly NOT claimed verified.
    expect(ls.needsLiveVerify.length).toBeGreaterThan(0);
    expect(ls.verifiedLaunchPatterns.some((p: any) => p.id === "open-pair")).toBe(false);
    expect(ls.licenseGated).toBe(true);
  });
});

describe("dialectLint / dialectAllowlist — static proving vs JM goldens (graceful-skip if absent)", () => {
  const al = engine.dialectAllowlist() as any;
  const present = al.available === true;

  it("dialectAllowlist surfaces per-family observed G/M vocabularies mined from JM goldens", () => {
    if (!present) return; // dialect-allowlists.json not built on this machine
    expect(al.families["okuma-osp"].sampleCount).toBeGreaterThan(0);
    expect(al.families["okuma-osp"].gCount).toBeGreaterThan(0);
    expect(al.families["okuma-osp"].mCount).toBeGreaterThan(0);
    expect(al.filesScanned).toBeGreaterThan(0);
  });

  it("dialectLint flags a candidate emitting a code unobserved in the family goldens (REVIEW, not invalid)", () => {
    if (!present) return;
    // Okuma OSP candidate with a deliberately exotic G-code unlikely in JM goldens.
    const candidate = "$ZZTEST.MIN%\nG0 X5 Z5\nG96 S700 M3\nG137.7 X1\nG1 Z-4 F.01\nM2";
    const r = engine.dialectLint(candidate) as any;
    expect(r.available).toBe(true);
    expect(r.classified).toBe("okuma-osp");
    if (r.hasAllowlist) {
      expect(r.unobservedG).toContain("G137.7");
      expect(r.review).toBe(true);
      expect(r.note).toMatch(/REVIEW|unobserved/i); // honest framing
    }
  });

  it("dialectLint is fail-soft on an unknown family — never a silent pass", () => {
    if (!present) return;
    const r = engine.dialectLint("G0 X1\nM30", "heidenhain") as any;
    expect(r.hasAllowlist).toBe(false);
    expect(r.review).toBe(false);
    expect(r.note).toMatch(/NOT a pass/);
  });

  it("dialectLint parity: TS _detectDialect + _extractCodes match the .mjs canonical on a known input", () => {
    // Parity check independent of the shipped allowlist (uses family override).
    const nc = "$P.MIN%\nN10 G0 X1\nN20 G1 Z-2 F.01 M8\n(G99 IN COMMENT)\nN30 G2 X3\nM30";
    const r = engine.dialectLint(nc, "okuma-osp") as any;
    expect(r.classified).toBe("okuma-osp"); // $NAME.MIN% → okuma-osp (port of detectDialect)
    expect(r.observedG).toContain("G2");
    expect(r.observedG).not.toContain("G99"); // comment-only code excluded (port of extractCodes)
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Dispatcher round-trip (prism_cimco) — wiring proof through dispatchCimco
// ────────────────────────────────────────────────────────────────────────────
describe("dispatchCimco — dispatcher round-trip", () => {
  it("cimco_control_channels routes to the engine", async () => {
    const r: any = await dispatchCimco("cimco_control_channels");
    expect(Array.isArray(r.channels)).toBe(true);
    expect(r.channels.length).toBe(5);
  });

  it("cimco_sim_report_evaluate routes a clean (null) report → pass", async () => {
    const r: any = await dispatchCimco("cimco_sim_report_evaluate", { report: null });
    expect(r.pass).toBe(true);
    expect(r.controllerVerified).toBe(false);
  });

  it("cimco_sim_report_evaluate routes a collision report → fail", async () => {
    const r: any = await dispatchCimco("cimco_sim_report_evaluate", {
      report: [{ type: "Collision", line: 42, description: "tool vs clamp" }],
    });
    expect(r.pass).toBe(false);
    expect(r.firstOffendingLine).toBe(42);
  });

  it("cimco_inventory_summary routes to the engine and carries provenance", async () => {
    const r: any = await dispatchCimco("cimco_inventory_summary");
    expect(typeof r.available.machines).toBe("boolean");
    expect(r.provenance).toMatch(/CIMCO/);
  });

  it("rejects an invalid orientation enum (schema validation fires)", async () => {
    const r: any = await dispatchCimco("cimco_machine_query", { orientation: "Bogus" });
    // dispatcherError path — must NOT return a normal successful machineQuery result.
    expect(r.available).not.toBe(true);
  });

  it("cimco_nav_readiness routes to the engine (available flag present)", async () => {
    const r: any = await dispatchCimco("cimco_nav_readiness");
    expect(typeof r.available).toBe("boolean");
  });

  it("cimco_nav_query accepts a valid channel and routes to the engine", async () => {
    const r: any = await dispatchCimco("cimco_nav_query", { channel: "file", limit: 3 });
    expect(typeof r.available).toBe("boolean");
    if (r.available) {
      expect(Array.isArray(r.surfaces)).toBe(true);
      for (const s of r.surfaces) expect(s.channel).toBe("file");
    }
  });

  it("cimco_nav_query rejects an invalid channel enum (schema validation fires)", async () => {
    const r: any = await dispatchCimco("cimco_nav_query", { channel: "telepathy" });
    expect(r.available).not.toBe(true); // dispatcherError, not a successful navQuery
  });

  it("cimco_launch_surface routes to the engine and carries the integration hook when present", async () => {
    const r: any = await dispatchCimco("cimco_launch_surface");
    expect(typeof r.available).toBe("boolean");
    if (r.available) {
      expect(r.exeCount).toBeGreaterThanOrEqual(4);
      expect(r.integrationHook.blindSafe).toBe(true);
      expect(r.verifiedLaunchPatterns.some((p: any) => p.id === "open-file")).toBe(true);
    }
  });

  it("cimco_dialect_allowlist routes to the engine (available flag present)", async () => {
    const r: any = await dispatchCimco("cimco_dialect_allowlist");
    expect(typeof r.available).toBe("boolean");
    if (r.available) expect(typeof r.families).toBe("object");
  });

  it("cimco_dialect_lint routes a candidate post + auto-detects its dialect", async () => {
    const r: any = await dispatchCimco("cimco_dialect_lint", { nc_text: "$X.MIN%\nG0 X1 Z1\nG96 S800 M3\nG1 Z-2 F.01\nM2" });
    expect(typeof r.available).toBe("boolean");
    if (r.available) {
      expect(r.classified).toBe("okuma-osp");
      expect(Array.isArray(r.observedG)).toBe(true);
    }
  });

  it("cimco_dialect_lint rejects an empty nc_text (schema min(1) fires)", async () => {
    const r: any = await dispatchCimco("cimco_dialect_lint", { nc_text: "" });
    expect(r.available).not.toBe(true); // dispatcherError, not a successful lint
  });

  it("singleton export is the same engine class", () => {
    expect(cimcoVerificationBridgeEngine).toBeInstanceOf(CimcoVerificationBridgeEngine);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// assessLiveRunClearance — the operator-facing "approved for live test?" gate
// (U-CIMCO-SIM-6: was previously UNTESTED; now covers all 5 gates incl. the
// SIM-4 machine-bind gate-0 and the SIM-5 run-completeness gate, + back-compat).
// ────────────────────────────────────────────────────────────────────────────
describe("assessLiveRunClearance — 5-gate live-run clearance", () => {
  // An input where every gate passes — the ONLY shape that clears.
  const clearable = () => ({
    machine: { unitsResolved: true, unit: "mm", displayName: "Cimco Mill 3 Axis Type A" },
    simVerdict: { pass: true, clearedForLiveRun: true, collisionCheckConfirmed: true, summary: "CLEAN" },
    kinematicsVerified: true,
    bindVerdict: { bound: true, machineId: "VMC-01" },
    runComplete: { runComplete: true },
  });

  it("ALL gates pass → cleared:true with all 5 conditions ok", () => {
    const v = engine.assessLiveRunClearance(clearable());
    expect(v.cleared).toBe(true);
    expect(v.blockers).toHaveLength(0);
    expect(v.conditions.machineBound.ok).toBe(true);
    expect(v.conditions.machineUnitsKnown.ok).toBe(true);
    expect(v.conditions.kinematicsVerified.ok).toBe(true);
    expect(v.conditions.simClearedForLiveRun.ok).toBe(true);
    expect(v.conditions.runComplete.ok).toBe(true);
    expect(v.summary).toMatch(/APPROVED FOR LIVE TEST/);
  });

  it("gate-0 BIND: a NOT-bound machine vetoes clearance even when every other gate passes", () => {
    const v = engine.assessLiveRunClearance({ ...clearable(), bindVerdict: { bound: false, blocker: "bind-machine-mismatch", machineId: "VMC-01" } });
    expect(v.cleared).toBe(false);
    expect(v.conditions.machineBound.ok).toBe(false);
    expect(v.blockers.some((b) => b.includes("not bound") || b.includes("NOT bound"))).toBe(true);
  });

  it("gate-0 BIND: absent bindVerdict is NOT gated (back-compat) — clears on the other 4", () => {
    const { bindVerdict, ...rest } = clearable();
    void bindVerdict;
    const v = engine.assessLiveRunClearance(rest);
    expect(v.conditions.machineBound.ok).toBe(true); // not gated when absent
    expect(v.cleared).toBe(true);
  });

  it("units: inferred-magnitude does NOT clear (25.4× guard)", () => {
    const v = engine.assessLiveRunClearance({ ...clearable(), machine: { unitsInferred: true, unitSource: "inferred-magnitude", unit: "mm", inferenceConfidence: "medium" } });
    expect(v.cleared).toBe(false);
    expect(v.conditions.machineUnitsKnown.ok).toBe(false);
  });

  it("kinematics: not verified → blocked", () => {
    const v = engine.assessLiveRunClearance({ ...clearable(), kinematicsVerified: false });
    expect(v.cleared).toBe(false);
    expect(v.conditions.kinematicsVerified.ok).toBe(false);
  });

  it("sim: pass-but-collision-check-UNCONFIRMED does NOT clear (fail-OPEN guard)", () => {
    const v = engine.assessLiveRunClearance({ ...clearable(), simVerdict: { pass: true, clearedForLiveRun: false, collisionCheckConfirmed: false, summary: "EMPTY" } });
    expect(v.cleared).toBe(false);
    expect(v.conditions.simClearedForLiveRun.ok).toBe(false);
  });

  it("gate-4 RUN-COMPLETE: an incomplete run vetoes even a clean sim (the §E2 core)", () => {
    const v = engine.assessLiveRunClearance({ ...clearable(), runComplete: { runComplete: false, blockers: ["coverage-incomplete (simulated 2 of 4 blocks)"] } });
    expect(v.cleared).toBe(false);
    expect(v.conditions.runComplete.ok).toBe(false);
    expect(v.blockers.some((b) => b.includes("coverage-incomplete"))).toBe(true);
  });

  it("gate-4 RUN-COMPLETE: accepts the boolean form and is NOT gated when absent (back-compat)", () => {
    expect(engine.assessLiveRunClearance({ ...clearable(), runComplete: false }).cleared).toBe(false);
    const { runComplete, ...rest } = clearable();
    void runComplete;
    expect(engine.assessLiveRunClearance(rest).cleared).toBe(true); // absent ⇒ not gated
  });

  it("empty input fails CLOSED on the affirmative gates (units + kinematics + sim), bind/run not gated", () => {
    const v = engine.assessLiveRunClearance({});
    expect(v.cleared).toBe(false);
    expect(v.conditions.machineUnitsKnown.ok).toBe(false);
    expect(v.conditions.kinematicsVerified.ok).toBe(false);
    expect(v.conditions.simClearedForLiveRun.ok).toBe(false);
    expect(v.conditions.machineBound.ok).toBe(true); // absent bind ⇒ not gated
    expect(v.conditions.runComplete.ok).toBe(true); // absent run-complete ⇒ not gated
  });

  it("round-trips through the dispatcher (cimco_live_run_clearance) with the new bind/run params", async () => {
    const c = clearable();
    const r: any = await dispatchCimco("cimco_live_run_clearance", {
      machine: c.machine,
      sim_verdict: c.simVerdict,
      kinematics_verified: true,
      bind_verdict: c.bindVerdict,
      run_complete: c.runComplete,
    });
    expect(r.cleared).toBe(true);
    // and a not-bound machine is refused THROUGH the dispatcher:
    const r2: any = await dispatchCimco("cimco_live_run_clearance", {
      machine: c.machine, sim_verdict: c.simVerdict, kinematics_verified: true,
      bind_verdict: { bound: false, blocker: "bind-wrong-post-ngc-on-pre-ngc" }, run_complete: c.runComplete,
    });
    expect(r2.cleared).toBe(false);
    // and an incomplete run is refused THROUGH the dispatcher — locks the run_complete
    // pass-through (deleting it from the dispatcher would let this clear, failing here):
    const r3: any = await dispatchCimco("cimco_live_run_clearance", {
      machine: c.machine, sim_verdict: c.simVerdict, kinematics_verified: true,
      bind_verdict: c.bindVerdict, run_complete: { runComplete: false, blockers: ["coverage-incomplete"] },
    });
    expect(r3.cleared).toBe(false);
  });
});
