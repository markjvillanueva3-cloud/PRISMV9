import { describe, it, expect } from "vitest";
import {
  CAMDriveRecipeEngine,
  type CamDriveDeps,
  type LiveProbe,
  type ToolCandidate,
} from "../engines/CAMDriveRecipeEngine.js";
import type { CamDriveRecipe, CamDriveDecisionRules } from "../schemas/camDriveRecipeSchema.js";
import { OutcomeDomain, OutcomeKind, OutcomeSource } from "../schemas/outcomeEventSchema.js";

// ── fixtures ────────────────────────────────────────────────────────────────

const PROBE: LiveProbe = {
  bbox: { min: [-2.358, -1.838, 0.0], max: [2.358, 1.382, 4.61] },
  faces: [
    { areaIn2: 9.0, normal: [0, 0, -1], z: 3.0 }, // big intermediate flat shelf (valid parting candidate, strictly inside the part)
    { areaIn2: 0.5, normal: [0, 0, 1], z: 2.2 },
    { areaIn2: 3.0, normal: [1, 0, 0], z: 2.0 }, // a side wall (ignored — not +/-Z)
  ],
  fixture: { jawTopLipZ: 5.63, jawCenterXY: [0, 0] },
  partBodyIndex: 0,
};

const SMALL_FACE_PROBE: LiveProbe = { ...PROBE, faces: [{ areaIn2: 0.2, normal: [0, 0, 1], z: 2.0 }] };

const TOOL_LIB: ToolCandidate[] = [
  { id: "T1_EM050", type: "endmill", geometry: { DC: 0.5, LB: 1.5, NOF: 4 }, holder: { taper: "CAT40", interface: ["BIG-PLUS"] }, toolCost: 40, toolLifeMin: 90 },
  { id: "T2_EM025", type: "endmill", geometry: { DC: 0.25, LB: 1.0, NOF: 3 }, holder: { taper: "CAT40", interface: ["BIG-PLUS"] }, toolCost: 25, toolLifeMin: 60 },
  { id: "T3_BT30", type: "endmill", geometry: { DC: 0.375, LB: 2.0, NOF: 4 }, holder: { taper: "BT30" }, toolCost: 30, toolLifeMin: 70 },
];

const GATE = { required: true, system: "fusion360" as const, catalogOperation: "adaptive" };

const RULES: CamDriveDecisionRules = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-31",
  advisoryOnly: false,
  mustHumanVerify: true,
  rules: {
    "place.center_bbox": { kind: "GEOMETRIC", output: "tx,ty" },
    "place.seat_bottom_riser": { kind: "GEOMETRIC", params: { fixtureClearance: 0.5 }, output: "tz" },
    "parting.geometry_driven": { kind: "GEOMETRIC+THRESHOLD", params: { AREA_FRAC: 0.35 }, output: "partingZ" },
    "stock.oversize": { kind: "GEOMETRIC", params: { radial: 0.04, top: 0.06, bottom: 0 }, output: "stockBox" },
    "wcs.stock_bottom_center": { kind: "SELECTION", params: { radial: 0.04, bottom: 0 }, output: "origin" },
    "strategy.by_feature": { kind: "SELECTION", table: { pocket: ["adaptive_rough", "finish"], bore_large: ["boring_bar_bore"], face: ["face"] }, output: "ops" } as CamDriveDecisionRules["rules"][string],
    "tool.spindle_match": { kind: "CATALOG_LOOKUP", output: "candidates" },
    "tool.rank_costeff_mrr": { kind: "SELECTION", params: { weights: { mrr: 0.5, cost: 0.4, defl: 0.1 } }, output: "selected" },
    "gate.catalog_validate": { kind: "THRESHOLD_GATE", delegate: "CAMDriveGateEngine.gate" },
  },
};

function recipe(steps: CamDriveRecipe["steps"], units: "inch" | "mm" = "inch"): CamDriveRecipe {
  return {
    schemaVersion: "1.0.0",
    recipeId: "TEST_OP1",
    generatedAt: "2026-05-31",
    advisoryOnly: false,
    mustHumanVerify: true,
    units,
    project: { name: "TEST", machine: "Okuma M460V-5AX CAT40", material: "H13", isoGroup: "H" },
    steps,
  };
}

const STEP_BASE = (over: Partial<CamDriveRecipe["steps"][number]> = {}): CamDriveRecipe["steps"][number] => ({
  stepId: 1, stage: "op_create", name: "step", endpoint: { dispatcherAction: "cam_drive_create_operation" },
  bodyTemplate: { operation_type: "adaptive" }, decisionRuleRef: [], gate: GATE,
  verify: { kind: "status_success", path: "success" }, onFail: { policy: "abort" }, ...over,
});

function mockDeps(over: Partial<CamDriveDeps> = {}): CamDriveDeps & {
  calls: Array<{ action: string; body: Record<string, unknown> }>;
  bridgeCalls: Array<{ path: string; body: Record<string, unknown> }>;
  order: string[];
  traces: Record<string, unknown>[];
  richTraces: Record<string, unknown>[];
  outcomes: Record<string, unknown>[];
} {
  const calls: Array<{ action: string; body: Record<string, unknown> }> = [];
  const bridgeCalls: Array<{ path: string; body: Record<string, unknown> }> = [];
  const order: string[] = [];
  const traces: Record<string, unknown>[] = [];
  const richTraces: Record<string, unknown>[] = [];
  const outcomes: Record<string, unknown>[] = [];
  let tick = 1000;
  const base: CamDriveDeps = {
    callDispatcher: async (action, body) => { order.push("actuate"); calls.push({ action, body }); return { success: true, feature_name: "Op1", echo: body }; },
    bridgeRequest: async (path, _m, body) => { order.push("actuate"); bridgeCalls.push({ path, body }); return { success: true }; },
    gate: async () => { order.push("gate"); return { clearedToActuate: true }; },
    recordTrace: (e) => traces.push(e),
    recordRichTrace: (l) => richTraces.push(l),
    recordOutcome: (o) => outcomes.push(o),
    now: () => new Date(tick += 10).toISOString(),
    runId: "run-test",
    ...over,
  };
  return Object.assign(base, { calls, bridgeCalls, order, traces, richTraces, outcomes });
}

// ── compile: pure geometric rule resolution ──────────────────────────────────

describe("CAMDriveRecipeEngine.compile — pure geometric rule resolution", () => {
  it("place.center_bbox resolves tx=0 (X-symmetric), ty centers Y on jaw center", async () => {
    const r = recipe([STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { x_in: "${rule.place.center_bbox.tx}", y_in: "${rule.place.center_bbox.ty}" }, decisionRuleRef: ["place.center_bbox"], gate: undefined })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.x_in).toBe(0);
    expect(out.steps[0].resolvedBody.y_in).toBeCloseTo(0.228, 3);
  });

  it("place.seat_bottom_riser raises part bottom by fixtureClearance above jaw top", async () => {
    const r = recipe([STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { z_in: "${rule.place.seat_bottom_riser.tz}" }, decisionRuleRef: ["place.seat_bottom_riser"], gate: undefined })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.z_in).toBeCloseTo(6.13, 3); // 5.63 + 0.5 - 0
  });

  it("parting.geometry_driven picks the large intermediate flat (>= AREA_FRAC footprint, strictly inside)", async () => {
    const r = recipe([STEP_BASE({ bodyTemplate: { bottom_z: "${rule.parting.geometry_driven.partingZ}", operation_type: "adaptive" }, decisionRuleRef: ["parting.geometry_driven"] })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.bottom_z).toBeCloseTo(3.0, 2);
    expect((out.steps[0].ruleOutputs["parting.geometry_driven"] as Record<string, unknown>).fromFace).toBe(true);
  });

  it("parting.geometry_driven falls back to mid-height + flags needsOperatorConfirm when no face clears", async () => {
    const r = recipe([STEP_BASE({ bodyTemplate: { z: "${rule.parting.geometry_driven.partingZ}", operation_type: "adaptive" }, decisionRuleRef: ["parting.geometry_driven"] })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, SMALL_FACE_PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.z).toBeCloseTo(2.305, 3);
    expect((out.steps[0].ruleOutputs["parting.geometry_driven"] as Record<string, unknown>).needsOperatorConfirm).toBe(true);
  });

  it("stock.oversize grows the bbox by radial/top, bottom=0 at seated face", async () => {
    const r = recipe([STEP_BASE({ stage: "stock_generate", endpoint: { dispatcherAction: "cam_drive_create_setup" }, bodyTemplate: { stock: "${rule.stock.oversize}" }, decisionRuleRef: ["stock.oversize"], gate: undefined })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    const stock = out.steps[0].resolvedBody.stock as { min: number[]; max: number[] };
    expect(stock.min[0]).toBeCloseTo(-2.398, 3);
    expect(stock.max[2]).toBeCloseTo(4.67, 3);
    expect(stock.min[2]).toBeCloseTo(0.0, 3);
  });

  it("wcs.stock_bottom_center = jaw center XY, bbox-min Z", async () => {
    const r = recipe([STEP_BASE({ stage: "setup_create", endpoint: { dispatcherAction: "cam_drive_create_setup" }, bodyTemplate: { wcs: "${rule.wcs.stock_bottom_center}" }, decisionRuleRef: ["wcs.stock_bottom_center"], gate: undefined, verify: { kind: "field_truthy", path: "setup_name" } })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.wcs).toMatchObject({ x: 0, y: 0, z: 0 });
  });

  it("strategy.by_feature maps featureRef substring to the operation chain", async () => {
    const r = recipe([STEP_BASE({ featureRef: "stock_pocket_region", bodyTemplate: { ops: "${rule.strategy.by_feature.operations}", operation_type: "adaptive" }, decisionRuleRef: ["strategy.by_feature"] })]);
    const out = await CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB);
    expect(out.steps[0].resolvedBody.ops).toEqual(["adaptive_rough", "finish"]);
  });

  it("tool.spindle_match filters to CAT40/BIG-PLUS, excludes BT30", async () => {
    const out = await CAMDriveRecipeEngine.evaluateRule("tool.spindle_match", RULES.rules["tool.spindle_match"], { recipe: recipe([]), probe: PROBE, toolLib: TOOL_LIB, step: STEP_BASE() });
    expect(out.candidates).toContain("T1_EM050");
    expect(out.candidates).toContain("T2_EM025");
    expect(out.candidates).not.toContain("T3_BT30");
  });

  it("tool.spindle_match else-branch (non-CAT40 machine) returns all tools unfiltered", async () => {
    const haasRecipe = { ...recipe([]), project: { name: "x", machine: "HAAS HSK63", material: "H13" } };
    const out = await CAMDriveRecipeEngine.evaluateRule("tool.spindle_match", RULES.rules["tool.spindle_match"], { recipe: haasRecipe, probe: PROBE, toolLib: TOOL_LIB, step: STEP_BASE() });
    expect(out.count).toBe(3); // HSK63 not CAT40 -> no filter
  });

  it("tool.rank_costeff_mrr returns a deterministic argmax selection", async () => {
    const out = await CAMDriveRecipeEngine.evaluateRule("tool.rank_costeff_mrr", RULES.rules["tool.rank_costeff_mrr"], { recipe: recipe([]), probe: PROBE, toolLib: TOOL_LIB, step: STEP_BASE() });
    expect(typeof out.selected).toBe("string");
    expect(Array.isArray(out.ranked)).toBe(true);
  });

  it("tool.rank_costeff_mrr with PARTIAL weights yields a FINITE deterministic selection (no NaN)", async () => {
    const partial = { kind: "SELECTION", params: { weights: { mrr: 0.5 } }, output: "selected" } as CamDriveDecisionRules["rules"][string];
    const out = await CAMDriveRecipeEngine.evaluateRule("tool.rank_costeff_mrr", partial, { recipe: recipe([]), probe: PROBE, toolLib: TOOL_LIB, step: STEP_BASE() });
    expect(typeof out.selected).toBe("string");
    const ranked = out.ranked as Array<{ score: number }>;
    expect(ranked.every((s) => Number.isFinite(s.score))).toBe(true);
  });

  it("tool.rank_costeff_mrr with empty toolLib returns selected=null", async () => {
    const out = await CAMDriveRecipeEngine.evaluateRule("tool.rank_costeff_mrr", RULES.rules["tool.rank_costeff_mrr"], { recipe: recipe([]), probe: PROBE, toolLib: [], step: STEP_BASE() });
    expect(out.selected).toBe(null);
  });

  it("compile THROWS on an unknown rule id (R12 — never silently pass)", async () => {
    const r = recipe([STEP_BASE({ decisionRuleRef: ["rule.does_not_exist"] })]);
    await expect(CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB)).rejects.toThrow(/unknown rule/);
  });
});

// ── safety refinements + guards ───────────────────────────────────────────────

describe("CAMDriveRecipeEngine — safety refinements", () => {
  it("compile REJECTS units:'mm' (geometric defaults are inch-tuned — no silent 25.4x)", async () => {
    const r = recipe([STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/x", method: "POST" }, gate: undefined })], "mm");
    await expect(CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB)).rejects.toThrow(/not supported|inch/i);
  });

  it("compile REJECTS an actuating op_create step that lacks gate.required=true", async () => {
    const r = recipe([STEP_BASE({ gate: undefined })]); // op_create with no gate
    await expect(CAMDriveRecipeEngine.compile(r, RULES, PROBE, TOOL_LIB)).rejects.toThrow(/must declare gate\.required/i);
  });

  it("flattenRuleOutputs THROWS on a prototype-pollution rule id", () => {
    expect(() => CAMDriveRecipeEngine.flattenRuleOutputs({ "__proto__.evil": 1 })).toThrow(/forbidden/);
    expect(() => CAMDriveRecipeEngine.flattenRuleOutputs({ "constructor.x": 1 })).toThrow(/forbidden/);
  });

  it("resolveTemplate THROWS when an embedded token resolves to an object (no [object Object] in body)", () => {
    expect(() => CAMDriveRecipeEngine.resolveTemplate("v=${a}", { a: { x: 1 } })).toThrow(/embedded token/);
  });
});

// ── execute: gate + verify + onFail + retry + operator-confirm + trace + outcome ─

describe("CAMDriveRecipeEngine.execute", () => {
  it("GATE BLOCKS an out-of-range op BEFORE actuation (no dispatcher call)", async () => {
    const deps = mockDeps({ gate: async () => ({ clearedToActuate: false, violations: { outOfRange: ["fz"] } }) });
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(false);
    expect(run.steps[0].status).toBe("aborted");
    expect(deps.calls.length).toBe(0);
    expect(deps.outcomes.length).toBe(1); // outcome emitted even on an aborted run (negative signal is signal)
  });

  it("gate is checked BEFORE actuation on the CLEARED path (order = gate, actuate)", async () => {
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(deps.order).toEqual(["gate", "actuate"]);
  });

  it("an UN-gated op_create cannot bypass the fuse — stage forces the gate even if recipe data omits it", async () => {
    // bypass the compile refinement by hand-building a ResolvedRecipe with no gate on an op_create step
    const deps = mockDeps({ gate: async () => ({ clearedToActuate: false }) });
    const resolved = { recipeId: "X", units: "inch" as const, steps: [{ stepId: 1, stage: "op_create" as const, name: "x", endpoint: { dispatcherAction: "cam_drive_create_operation" }, decisionRuleRef: [], verify: { kind: "status_success" as const, path: "success" }, onFail: { policy: "abort" as const }, resolvedBody: { operation_type: "adaptive" }, ruleOutputs: {} }] };
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.steps[0].status).toBe("aborted"); // stage-derived gate fired
    expect(deps.calls.length).toBe(0);
  });

  it("needsOperatorConfirm (mid-height parting) forces a gate-to-operator BEFORE actuation", async () => {
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE({ decisionRuleRef: ["parting.geometry_driven"], bodyTemplate: { operation_type: "adaptive", z: "${rule.parting.geometry_driven.partingZ}" } })]), RULES, SMALL_FACE_PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.steps[0].status).toBe("gated");
    expect(deps.calls.length).toBe(0);
    expect(deps.order).toEqual([]); // never even reached the gate/actuate
  });

  it("happy path: gate clears -> actuates -> verify passes -> trace + outcome emitted", async () => {
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(true);
    expect(run.steps[0].status).toBe("success");
    expect(deps.calls[0].action).toBe("cam_drive_create_operation");
    expect(deps.traces.length).toBe(1);
    expect(deps.richTraces.length).toBe(1);
    expect(deps.outcomes.length).toBe(1);
    expect(deps.outcomes[0].lineage_id).toBe("TEST_OP1:run-test");
  });

  it("emitted outcome uses VALID OutcomeCaptureBus enum values (real-schema parse, not a mock)", async () => {
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    await CAMDriveRecipeEngine.execute(resolved, deps);
    const o = deps.outcomes[0];
    // these THROW if the engine emits an invalid enum (the P0 the mock can't catch)
    expect(OutcomeDomain.parse(o.domain)).toBe("cam");
    expect(OutcomeKind.parse(o.kind)).toBe("recommendation_emitted");
    expect(OutcomeSource.parse(o.source)).toBe("system");
    // U-CAM-LOOP-DOMAIN-ISOLATE: domain "cam" (NOT "mill") routes to the dedicated
    // cam.jsonl shard; context.cam_system lets the consumer resolve the producing
    // system. Fail-on-revert oracle — flips red if the domain regresses to "mill".
    expect((o.context as Record<string, unknown> | undefined)?.cam_system).toBe("fusion360");
  });

  it("verify failure marks the step failed and aborts (default abort policy)", async () => {
    const deps = mockDeps({ callDispatcher: async () => ({ success: false }) });
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(false);
    expect(run.steps[0].status).toBe("failed");
  });

  it("onFail:retry re-actuates and SUCCEEDS within maxRetries", async () => {
    let n = 0;
    const deps = mockDeps({ callDispatcher: async (a, b) => { n++; if (n === 1) throw new Error("transient"); return { success: true, echo: b, action: a }; } });
    const step = STEP_BASE({ onFail: { policy: "retry", maxRetries: 1 } });
    const resolved = await CAMDriveRecipeEngine.compile(recipe([step]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(true);
    expect(run.steps[0].status).toBe("success");
    expect(n).toBe(2); // retried once
  });

  it("onFail:retry EXHAUSTED -> failed (not silently swallowed)", async () => {
    let n = 0;
    const deps = mockDeps({ callDispatcher: async () => { n++; throw new Error("always fails"); } });
    const step = STEP_BASE({ onFail: { policy: "retry", maxRetries: 1 } });
    const resolved = await CAMDriveRecipeEngine.compile(recipe([step]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(false);
    expect(run.steps[0].status).toBe("failed");
    expect(n).toBe(2); // 1 + 1 retry
  });

  it("skip_if_optional skips a failing optional step and continues", async () => {
    const optStep = STEP_BASE({ stepId: 1, optional: true, onFail: { policy: "skip_if_optional" }, verify: { kind: "field_truthy", path: "nonexistent" } });
    const okStep = STEP_BASE({ stepId: 2 });
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([optStep, okStep]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.steps[0].status).toBe("skipped");
    expect(run.steps[1].status).toBe("success");
    expect(run.ok).toBe(true);
  });

  it("a throwing gate FAILS CLOSED (aborts, never actuates)", async () => {
    const deps = mockDeps({ gate: async () => { throw new Error("gate engine down"); } });
    const resolved = await CAMDriveRecipeEngine.compile(recipe([STEP_BASE()]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.steps[0].status).toBe("aborted");
    expect(deps.calls.length).toBe(0);
  });

  it("bridge-only step (no dispatcherAction) routes to bridgeRequest", async () => {
    const bridgeStep = STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { file_id: "urn:x" }, gate: undefined });
    const deps = mockDeps();
    const resolved = await CAMDriveRecipeEngine.compile(recipe([bridgeStep]), RULES, PROBE, TOOL_LIB, deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(true);
    expect(deps.bridgeCalls[0].path).toBe("/component/insert");
    expect(deps.calls.length).toBe(0);
  });
});

// ── replay ────────────────────────────────────────────────────────────────────

describe("CAMDriveRecipeEngine.replay", () => {
  it("reSolveRules:true re-probes live geometry then recompiles + executes", async () => {
    let probed = 0;
    const deps = mockDeps({ probe: async () => { probed++; return PROBE; } });
    const bridgeStep = STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { z: "${rule.place.seat_bottom_riser.tz}" }, decisionRuleRef: ["place.seat_bottom_riser"], gate: undefined });
    const run = await CAMDriveRecipeEngine.replay(recipe([bridgeStep]), RULES, SMALL_FACE_PROBE, TOOL_LIB, deps, { reSolveRules: true });
    expect(probed).toBe(1);
    expect(run.ok).toBe(true);
    expect(deps.bridgeCalls[0].body.z).toBeCloseTo(6.13, 3); // re-solved from the fresh probe
  });

  it("reSolveRules:false replays against the supplied probe (no re-probe)", async () => {
    let probed = 0;
    const deps = mockDeps({ probe: async () => { probed++; return PROBE; } });
    const bridgeStep = STEP_BASE({ stage: "part_insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { ok: true }, gate: undefined });
    const run = await CAMDriveRecipeEngine.replay(recipe([bridgeStep]), RULES, PROBE, TOOL_LIB, deps, { reSolveRules: false });
    expect(probed).toBe(0);
    expect(run.ok).toBe(true);
  });
});
