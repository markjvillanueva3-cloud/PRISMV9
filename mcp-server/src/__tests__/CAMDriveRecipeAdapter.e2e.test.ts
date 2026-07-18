import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCamDriveDeps } from "../engines/CAMDriveRecipeAdapter.js";
import { CAMDriveRecipeEngine, type LiveProbe } from "../engines/CAMDriveRecipeEngine.js";
import { OutcomeCaptureBusEngine, type RecordOutcomeInput } from "../engines/OutcomeCaptureBusEngine.js";
import type { CamDriveRecipe, CamDriveDecisionRules } from "../schemas/camDriveRecipeSchema.js";

/**
 * REAL-ADAPTER E2E — loads the REAL camDriveGateEngine + outcomeCaptureBusEngine
 * (only the network bridge to Fusion :18365 is stubbed). Proves the adapter wiring
 * against production signatures — the "hermetic fakes don't prove wiring" guard the
 * per-file scrutiny demanded.
 */

const EMPTY_RULES: CamDriveDecisionRules = {
  schemaVersion: "1.0.0", generatedAt: "2026-05-31", advisoryOnly: false, mustHumanVerify: true, rules: {},
};

const PROBE: LiveProbe = { bbox: { min: [-1, -1, 0], max: [1, 1, 4] }, fixture: { jawTopLipZ: 5.63, jawCenterXY: [0, 0] }, partBodyIndex: 0 };

function bridgeStub(record?: Array<{ path: string; body: Record<string, unknown> }>) {
  return async (path: string, _m: string, body: Record<string, unknown>) => {
    record?.push({ path, body });
    return { success: true };
  };
}

describe("CAMDriveRecipeAdapter — REAL-engine wiring E2E", () => {
  it("wires the REAL CAMDriveGateEngine: deps.gate returns a {clearedToActuate} verdict", async () => {
    const deps = buildCamDriveDeps({ runId: "e2e-gate", bridgeRequest: bridgeStub() });
    const verdict = await deps.gate({ system: "fusion360", operation: "face", params: { tool_diameter: 0.5 } });
    expect(typeof verdict.clearedToActuate).toBe("boolean"); // real engine returned the real verdict shape
  });

  it("the REAL OutcomeCaptureBus accepts the engine's emitted enum values AND routes CAM to the cam shard (P0 fail-on-revert oracle)", () => {
    // Exactly what CAMDriveRecipeEngine.execute() emits — real class + real schema.
    // Isolated to a temp root so this oracle never injects a synthetic event into the
    // production cam.jsonl training shard (U-CAM-LOOP-DOMAIN-ISOLATE — ML data hygiene:
    // the e2e used to write to the real mill.jsonl, which is exactly the pollution we fixed).
    const root = join(tmpdir(), `cam-bus-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const bus = new OutcomeCaptureBusEngine(root);
    const result = bus.record({
      domain: "cam",
      kind: "recommendation_emitted",
      source: "system",
      lineage_id: "ADAPTER-E2E-TEST:run",
      confidence: 1,
      context: { engine: "CAMDriveRecipeEngine", action: "cam_drive_recipe_execute", operation: "cam_drive_replay", cam_system: "fusion360" },
      actual: { test: true, postedOk: true },
    });
    expect(result.ok).toBe(true);
    // CAM domain → dedicated cam.jsonl shard, NOT mill.jsonl (corpus-isolation oracle)
    expect(result.path.endsWith("cam.jsonl")).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("callDispatcher maps a cam_drive_* action to the correct Fusion bridge endpoint", async () => {
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    const deps = buildCamDriveDeps({ runId: "e2e-map", bridgeRequest: bridgeStub(calls) });
    await deps.callDispatcher("cam_drive_create_operation", { operation_type: "adaptive" });
    expect(calls[0].path).toBe("/cam/operation");
    await deps.callDispatcher("cam_drive_post", { program_name: "O1" });
    expect(calls[1].path).toBe("/cam/post");
  });

  it("callDispatcher THROWS on an unmapped action (R12 — no silent mis-route)", async () => {
    const deps = buildCamDriveDeps({ runId: "e2e-bad", bridgeRequest: bridgeStub() });
    await expect(deps.callDispatcher("cam_drive_bogus", {})).rejects.toThrow(/no bridge endpoint/);
  });

  it("full compile+execute of a non-gated step runs through the REAL adapter (stubbed bridge) + writes the rich trace + emits a cam-domain outcome with context passthrough", async () => {
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    const captured: RecordOutcomeInput[] = [];
    const tracePath = join(tmpdir(), `cam-drive-e2e-${Date.now()}.jsonl`);
    if (existsSync(tracePath)) rmSync(tracePath);
    const deps = buildCamDriveDeps({ runId: "e2e-run", tracePath, bridgeRequest: bridgeStub(calls), recordOutcome: (inp) => captured.push(inp) });
    const recipe: CamDriveRecipe = {
      schemaVersion: "1.0.0", recipeId: "E2E", generatedAt: "2026-05-31", advisoryOnly: false, mustHumanVerify: true,
      units: "inch", project: { name: "E2E", machine: "Okuma M460V-5AX", material: "H13" },
      steps: [{ stepId: 1, stage: "part_insert", name: "insert", endpoint: { httpPath: "/component/insert", method: "POST" }, bodyTemplate: { file_id: "urn:test" }, decisionRuleRef: [], verify: { kind: "status_success", path: "success" }, onFail: { policy: "abort" } }],
    };
    const resolved = await CAMDriveRecipeEngine.compile(recipe, EMPTY_RULES, PROBE, [], deps);
    const run = await CAMDriveRecipeEngine.execute(resolved, deps);
    expect(run.ok).toBe(true);
    expect(calls[0].path).toBe("/component/insert");
    // the REAL adapter mapped + routed the engine's outcome: cam domain + context passthrough
    // (the production-wiring proof the hermetic engine test cannot give; captured, so no
    // synthetic event lands in the production cam.jsonl training shard)
    expect(captured.length).toBe(1);
    expect(captured[0].domain).toBe("cam");
    expect((captured[0].context as Record<string, unknown> | undefined)?.cam_system).toBe("fusion360");
    // rich trace ledger written by the real adapter
    expect(existsSync(tracePath)).toBe(true);
    const line = JSON.parse(readFileSync(tracePath, "utf8").trim().split("\n")[0]);
    expect(line.recipeId).toBe("E2E");
    expect(line.runId).toBe("e2e-run");
    rmSync(tracePath, { force: true });
  });
});
