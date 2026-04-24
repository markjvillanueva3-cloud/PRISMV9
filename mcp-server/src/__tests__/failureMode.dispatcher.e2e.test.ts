import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { failureModeAnticipationEngine } from "../engines/FailureModeAnticipationEngine.js";

/**
 * True dispatcher-invocation E2E for prism_dev.failure_* actions.
 * Mocks McpServer.tool() to capture the handler, then invokes with real
 * {action, params} so Zod validation + lazy import of
 * FailureModeAnticipationEngine run through production paths.
 */

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content?: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} | Record<string, unknown>>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(
      _name: string,
      _description: string,
      schema: Record<string, unknown>,
      cb: McpHandler,
    ) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(
  handler: McpHandler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>;
  return JSON.parse(content[0]?.text ?? "{}");
}

// Canonical benign conditions — used as a baseline to perturb individual fields
const BENIGN = {
  toolWearPercent: 10, toolOverhangRatio: 3, toolGradeMatch: 0.9,
  cuttingForce: 400, spindleLoad: 50, vibrationLevel: 0.3, temperature: 60,
  clampingForce: 10_000, cuttingForceRequired: 500, fixtureRigidity: 0.9,
  machineHours: 1000, spindleCondition: 95, lastMaintenance: 40,
  materialHardness: 25, materialAbrasivity: 0.3,
  engagementPercent: 30, depthOfCut: 1.5, programVerified: true,
} as const;

// Worst-case conditions across every dimension — must drive risk ↑
const SEVERE = {
  toolWearPercent: 85, toolOverhangRatio: 8, toolGradeMatch: 0.2,
  cuttingForce: 3500, spindleLoad: 95, vibrationLevel: 3.0, temperature: 280,
  clampingForce: 300, cuttingForceRequired: 2000, fixtureRigidity: 0.3,
  machineHours: 25_000, spindleCondition: 45, lastMaintenance: 2000,
  materialHardness: 58, materialAbrasivity: 0.95,
  engagementPercent: 95, depthOfCut: 6, programVerified: false,
} as const;

type Profile = {
  overallRisk: number;
  predictions: Array<{ mode: { id: string; severity: string }; probability: number; urgency: string; recommendedAction: string }>;
  immediateActions?: string[];
  monitoringPriorities?: string[];
  safeOperatingWindow?: Record<string, unknown>;
};

describe("prism_dev failure_* actions — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: all 4 failure_* actions appear in the prism_dev ACTIONS enum", () => {
    expect(schemaActions).toContain("failure_risk_analyze");
    expect(schemaActions).toContain("failure_modes_list");
    expect(schemaActions).toContain("failure_mode_get");
    expect(schemaActions).toContain("failure_cascade_chain");
  });

  it("failure_modes_list returns every registered mode with id + severity", async () => {
    const data = await invoke(handler, "failure_modes_list");
    expect(data.success).toBe(true);
    const modes = data.modes as Array<{ id: string; severity: string }>;
    expect(modes.length).toBeGreaterThan(0);
    for (const m of modes) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(["negligible", "minor", "moderate", "major", "critical", "catastrophic"]).toContain(m.severity);
    }
  });

  it("failure_mode_get: known id returns the same mode that appears in the list", async () => {
    // Pull a known id from the registry via the list action, then resolve it
    const list = await invoke(handler, "failure_modes_list");
    const id = (list.modes as Array<{ id: string }>)[0].id;
    const got = await invoke(handler, "failure_mode_get", { id });
    expect(got.success).toBe(true);
    expect((got.mode as { id: string }).id).toBe(id);
  });

  it("failure_risk_analyze: benign conditions → low overall risk, benign severity distribution", async () => {
    const data = await invoke(handler, "failure_risk_analyze", { conditions: BENIGN });
    expect(data.success).toBe(true);
    const profile = data.profile as Profile;
    expect(profile.overallRisk).toBeGreaterThanOrEqual(0);
    expect(profile.overallRisk).toBeLessThanOrEqual(1);
    // Benign inputs should keep risk strictly below the ceiling
    expect(profile.overallRisk).toBeLessThan(0.5);
  });

  it("failure_risk_analyze: severe conditions drive risk strictly higher than benign baseline", async () => {
    const benignRes = await invoke(handler, "failure_risk_analyze", { conditions: BENIGN });
    const severeRes = await invoke(handler, "failure_risk_analyze", { conditions: SEVERE });
    const benignRisk = (benignRes.profile as Profile).overallRisk;
    const severeRisk = (severeRes.profile as Profile).overallRisk;
    expect(severeRisk).toBeGreaterThan(benignRisk);
    // Severe case must surface at least one prediction
    expect((severeRes.profile as Profile).predictions.length).toBeGreaterThan(0);
  });

  it("failure_risk_analyze: returns predictions sorted by probability × severity (monotone non-increasing)", async () => {
    const data = await invoke(handler, "failure_risk_analyze", { conditions: SEVERE });
    const preds = (data.profile as Profile).predictions;
    const weight: Record<string, number> = {
      negligible: 0.1, minor: 0.3, moderate: 0.5, major: 0.7, critical: 0.9, catastrophic: 1.0,
    };
    for (let i = 1; i < preds.length; i++) {
      const prev = preds[i - 1].probability * weight[preds[i - 1].mode.severity];
      const cur = preds[i].probability * weight[preds[i].mode.severity];
      expect(prev).toBeGreaterThanOrEqual(cur - 1e-9);
    }
  });

  it("failure_risk_analyze: overallRisk is clamped to [0,1] even under maximum-adversarial input", async () => {
    const data = await invoke(handler, "failure_risk_analyze", { conditions: SEVERE });
    const { overallRisk } = data.profile as Profile;
    expect(overallRisk).toBeGreaterThanOrEqual(0);
    expect(overallRisk).toBeLessThanOrEqual(1);
  });

  it("failure_cascade_chain: known root returns a non-empty chain that starts with the root id", async () => {
    const list = await invoke(handler, "failure_modes_list");
    const id = (list.modes as Array<{ id: string }>)[0].id;
    const res = await invoke(handler, "failure_cascade_chain", { failureId: id });
    const chain = (res.chain as string[] | undefined) ?? [];
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0]).toBe(id);
  });

  it("failure_cascade_chain: unknown root returns the id as a single-element chain (no throw)", async () => {
    const res = await invoke(handler, "failure_cascade_chain", { failureId: "definitely-not-a-real-mode" });
    // Implementation pushes the id then finds no successors — chain should contain exactly the requested id
    const chain = (res.chain as string[] | undefined) ?? [];
    expect(chain).toEqual(["definitely-not-a-real-mode"]);
  });

  it("FAIL: failure_risk_analyze rejects missing conditions via schema", async () => {
    const data = await invoke(handler, "failure_risk_analyze", {});
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_risk_analyze/);
  });

  it("FAIL: failure_risk_analyze rejects out-of-range toolWearPercent (>100)", async () => {
    const data = await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, toolWearPercent: 150 },
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_risk_analyze/);
  });

  it("FAIL: failure_risk_analyze rejects negative cuttingForce", async () => {
    const data = await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, cuttingForce: -10 },
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_risk_analyze/);
  });

  it("FAIL: failure_risk_analyze rejects non-boolean programVerified", async () => {
    const data = await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, programVerified: "yes" },
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_risk_analyze/);
  });

  it("FAIL: failure_mode_get on unknown id returns success=false with descriptive error", async () => {
    const data = await invoke(handler, "failure_mode_get", { id: "ghost-mode-xyz" });
    expect(data.success).toBe(false);
    expect(String(data.error ?? "")).toMatch(/unknown failure mode/);
  });

  it("FAIL: failure_mode_get rejects empty id via schema (min(1))", async () => {
    const data = await invoke(handler, "failure_mode_get", { id: "" });
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_mode_get/);
  });

  it("FAIL: failure_cascade_chain rejects empty failureId via schema", async () => {
    const data = await invoke(handler, "failure_cascade_chain", { failureId: "" });
    expect(String(data.error ?? "")).toMatch(/Invalid params for failure_cascade_chain/);
  });

  it("ADV: monotonicity on single dimension — raising toolWearPercent alone never decreases overallRisk", async () => {
    const results = await Promise.all(
      [10, 30, 60, 90].map(w =>
        invoke(handler, "failure_risk_analyze", {
          conditions: { ...BENIGN, toolWearPercent: w },
        }),
      ),
    );
    const risks = results.map(r => (r.profile as Profile).overallRisk);
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i]).toBeGreaterThanOrEqual(risks[i - 1] - 1e-9);
    }
    // And end-to-end: high wear carries strictly more risk than low wear
    expect(risks[risks.length - 1]).toBeGreaterThan(risks[0]);
  });

  it("ADV: monotonicity on vibrationLevel — raising vibration alone never decreases overallRisk", async () => {
    const results = await Promise.all(
      [0.1, 0.5, 1.5, 3.0].map(v =>
        invoke(handler, "failure_risk_analyze", {
          conditions: { ...BENIGN, vibrationLevel: v },
        }),
      ),
    );
    const risks = results.map(r => (r.profile as Profile).overallRisk);
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i]).toBeGreaterThanOrEqual(risks[i - 1] - 1e-9);
    }
    expect(risks[risks.length - 1]).toBeGreaterThan(risks[0]);
  });

  it("ADV: three disjoint scenarios (worn tool, hot/vibrating cut, insufficient clamp) all raise risk above benign", async () => {
    const benign = (await invoke(handler, "failure_risk_analyze", { conditions: BENIGN })).profile as Profile;
    const worn = (await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, toolWearPercent: 85, toolGradeMatch: 0.3 },
    })).profile as Profile;
    const hotVib = (await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, temperature: 260, vibrationLevel: 2.5 },
    })).profile as Profile;
    const underClamp = (await invoke(handler, "failure_risk_analyze", {
      conditions: { ...BENIGN, clampingForce: 200, cuttingForceRequired: 1500, fixtureRigidity: 0.3 },
    })).profile as Profile;

    expect(worn.overallRisk).toBeGreaterThan(benign.overallRisk);
    expect(hotVib.overallRisk).toBeGreaterThan(benign.overallRisk);
    expect(underClamp.overallRisk).toBeGreaterThan(benign.overallRisk);
  });

  it("ADV: engine singleton is shared — modes list count via dispatcher matches direct engine reference", async () => {
    const data = await invoke(handler, "failure_modes_list");
    const dispatched = (data.modes as unknown[]).length;
    const direct = failureModeAnticipationEngine.getFailureModes().length;
    expect(dispatched).toBe(direct);
  });
});
