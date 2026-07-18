/**
 * camDispatcher — U-CAM-COLLISION-GATE-ENFORCE (P0 safety) wiring suite
 * =====================================================================
 *
 * slot:kilo 2026-05-29. Closes the P0 from CAM-GALAXY-COMPLETENESS-AUDIT-2026-05-29:
 * the collision/gouge gate ("no toolpath ships without a clearance number") was enforced
 * ONLY in a runbook, never in code — toolpath_generate returned collision_warnings:[]
 * (empty) and a toolpath_generate -> post_process flow shipped un-checked output.
 *
 * Three layers proved here:
 *   1. applyCollisionGate  — pure gate logic over a (fake) collision engine. cleared IFF
 *      severity==="safe" AND clearance finite > 0; collision/near_miss/clearance_violation/
 *      NaN/throw/no-geometry all => cleared:false. (Real value assertions, not shape stubs.)
 *   2. collisionGateForPost — post_process refuses an explicitly un-cleared/blocked toolpath;
 *      legacy bare-param callers pass through (back-compat).
 *   3. assertFiniteResult  — physics actions can no longer return NaN/Infinity-as-success.
 * Plus a DISPATCHER round-trip E2E (toolpath_generate -> post_process refusal) so the gate is
 * proven through prism_cam, not only via the engine singleton, + the z.enum-membership guard.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerCamDispatcher,
  ACTIONS,
  applyCollisionGate,
  collisionGateForPost,
  assertFiniteResult,
} from "../tools/dispatchers/camDispatcher.js";

// ── Fake collision engine mirroring CollisionDetectionEngine.checkFull's contract ──
function fakeCollisionEngine(severity: string, minClr: number) {
  return {
    checkFull(_bodies: unknown[], _moves: unknown[], _margin: number) {
      return { severity, minimum_clearance_mm: minClr, recommendation: severity === "safe" ? "All clear" : "Reroute" };
    },
  };
}
const GEO = { bodies: [{ id: "stock" }], moves: [{ from: { x: 0, y: 0, z: 5 }, to: { x: 0, y: 0, z: 1 } }] };

describe("applyCollisionGate (pure gate logic)", () => {
  it("clears ONLY on severity=safe with finite clearance > 0", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, fakeCollisionEngine("safe", 5.2));
    expect(out.safety_gate.cleared).toBe(true);
    expect(out.safety_gate.performed).toBe(true);
    expect(out.safety_gate.minimum_clearance_mm).toBe(5.2);
    expect(out.safety_gate.severity).toBe("safe");
    expect(out.blocked ?? false).toBe(false);
    expect(out.toolpath).toBe("tp"); // additive — original fields preserved
  });

  it("BLOCKS on a real collision (severity=collision, 0 clearance)", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, fakeCollisionEngine("collision", 0));
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.blocked).toBe(true);
    expect(out.block_reason).toMatch(/collision/i);
    expect(out.safety_gate.minimum_clearance_mm).toBe(0);
  });

  it("does NOT clear a clearance_violation even with positive clearance (the >0-alone bug)", () => {
    // 0.3mm clearance is below the safety margin -> severity clearance_violation -> NOT safe.
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, fakeCollisionEngine("clearance_violation", 0.3));
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.blocked).toBe(true);
    expect(out.safety_gate.minimum_clearance_mm).toBe(0.3);
  });

  it("does NOT clear a near_miss", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, fakeCollisionEngine("near_miss", 1.0));
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.blocked).toBe(true);
  });

  it("does NOT clear on a NaN clearance (adversarial)", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, fakeCollisionEngine("safe", NaN));
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.safety_gate.minimum_clearance_mm).toBeNull();
    expect(out.blocked).toBe(true);
  });

  it("fails loud when the collision engine throws", () => {
    const throwing = { checkFull() { throw new Error("BVH unavailable"); } };
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, throwing);
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.safety_gate.performed).toBe(true);
    expect(out.blocked).toBe(true);
    expect(out.block_reason).toMatch(/threw|BVH/i);
  });

  it("marks performed:false + cleared:false when NO geometry is provided (never silently safe)", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, {}, fakeCollisionEngine("safe", 9));
    expect(out.safety_gate.performed).toBe(false);
    expect(out.safety_gate.cleared).toBe(false);
    expect(out.requires_collision_check).toBe(true);
    expect(out.blocked ?? false).toBe(false); // generation succeeded; it's un-cleared, not blocked
  });

  it("marks cleared:false when geometry present but no collision engine resolved", () => {
    const out = applyCollisionGate({ toolpath: "tp" }, GEO, null);
    expect(out.safety_gate.performed).toBe(false);
    expect(out.safety_gate.cleared).toBe(false);
  });

  it("surfaces a non-object engine result loudly", () => {
    const out = applyCollisionGate(undefined, GEO, fakeCollisionEngine("safe", 5));
    expect(out.error).toMatch(/no result object/i);
  });
});

describe("collisionGateForPost (post-process refusal)", () => {
  it("refuses a toolpath flagged cleared:false", () => {
    const block = collisionGateForPost({ safety_gate: { cleared: false }, controller: "fanuc" });
    expect(block).not.toBeNull();
    expect(block!.error).toMatch(/BLOCKED/);
  });
  it("refuses a blocked:true toolpath", () => {
    const block = collisionGateForPost({ blocked: true });
    expect(block).not.toBeNull();
    expect(block!.error).toMatch(/not collision-cleared/i);
  });
  it("refuses an un-cleared toolpath nested under params.toolpath", () => {
    const block = collisionGateForPost({ toolpath: { safety_gate: { cleared: false } } });
    expect(block).not.toBeNull();
  });
  it("proceeds (null) for a cleared toolpath", () => {
    expect(collisionGateForPost({ safety_gate: { cleared: true, minimum_clearance_mm: 6 } })).toBeNull();
  });
  it("proceeds (null) for a legacy bare-param caller with no gate (back-compat)", () => {
    expect(collisionGateForPost({ controller: "fanuc", input: "G0" })).toBeNull();
  });
});

describe("assertFiniteResult (physics NaN guard)", () => {
  it("passes a fully-finite result through unchanged", () => {
    const r = { rpm: 3183.1, feed_mmmin: 955, strategy: "flood" };
    expect(assertFiniteResult(r, "cam_feedrate_chipload")).toBe(r);
  });
  it("converts a NaN field to a fail-loud error", () => {
    const out = assertFiniteResult({ rpm: NaN, feed_mmmin: 955 }, "cam_feedrate_chipload");
    expect(out.error).toMatch(/non-finite.*NaN/);
    expect(out.non_finite_field).toBe("rpm");
  });
  it("catches a nested ±Infinity (depth walk) with a path", () => {
    const out = assertFiniteResult({ deflection: { tip_mm: Infinity } }, "cam_tool_deflection");
    expect(out.error).toMatch(/Infinity/);
    expect(out.non_finite_field).toBe("deflection.tip_mm");
  });
  it("catches a NaN inside an array element", () => {
    const out = assertFiniteResult({ passes: [1, 2, NaN] }, "cam_omega_score");
    expect(out.non_finite_field).toBe("passes[2]");
  });
  it("passes non-object results through (null / string)", () => {
    expect(assertFiniteResult(null, "x")).toBeNull();
    expect(assertFiniteResult("ok", "x")).toBe("ok");
  });
});

// ── DISPATCHER round-trip (prove the gate through prism_cam, not only the helper) ──
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
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("collision gate — dispatcher round-trip (prism_cam)", () => {
  it("toolpath_generate with no geometry attaches an un-cleared safety_gate (fail-loud, not empty)", async () => {
    const { ok, data } = await call(server, "toolpath_generate", { feature: "pocket", dimensions: { width: 50, depth: 10 }, material: "P" });
    expect(ok).toBe(true);
    expect(typeof data.safety_gate).toBe("object");
    expect(data.safety_gate.performed).toBe(false);
    expect(data.safety_gate.cleared).toBe(false);
    expect(data.requires_collision_check).toBe(true);
  });

  it("the un-cleared toolpath_generate result is REFUSED by post_process (end-to-end gate)", async () => {
    const gen = await call(server, "toolpath_generate", { feature: "pocket", dimensions: { width: 50, depth: 10 }, material: "P" });
    // Feed the generated (un-cleared) result straight into post_process — the documented bypass.
    const post = await call(server, "post_process", { toolpath: gen.data, controller: "fanuc" });
    expect(post.ok).toBe(false);
    expect(post.data.error).toMatch(/BLOCKED|not collision-cleared/i);
  });

  it("post_process proceeds for a legacy caller with no safety_gate (back-compat)", async () => {
    const post = await call(server, "post_process", { input: "G0 X0", controller: "fanuc" });
    // Either succeeds or fails for a NON-gate reason — must NOT be the collision block.
    if (!post.ok) expect(String(post.data.error)).not.toMatch(/not collision-cleared/i);
  });

  it("post_process proceeds for an explicitly cleared toolpath", async () => {
    const post = await call(server, "post_process", { safety_gate: { cleared: true, minimum_clearance_mm: 6 }, input: "G0 X0", controller: "fanuc" });
    if (!post.ok) expect(String(post.data.error)).not.toMatch(/not collision-cleared/i);
  });

  it("cam_feedrate_chipload returns a finite result through the guard on valid input (wrap is transparent)", async () => {
    // Correct FeedrateInputs contract: cuttingSpeedMmin + toolDiameterMm + fluteCount + chiploadMmTooth.
    // rpm = 120·1000/(π·12) ≈ 3183.1 ; feed = 0.05·4·rpm ≈ 636.6 — both finite, so the guard is a pass-through.
    const { ok, data } = await call(server, "cam_feedrate_chipload", {
      cuttingSpeedMmin: 120, toolDiameterMm: 12, fluteCount: 4, chiploadMmTooth: 0.05,
    });
    expect(ok).toBe(true);
    expect(Number.isFinite(data.spindleRpm)).toBe(true);
    expect(Number.isFinite(data.feedrateMmMin)).toBe(true);
    expect(Math.round(data.spindleRpm)).toBe(3183);
    expect(JSON.stringify(data)).not.toMatch(/non-finite/);
  });

  it("cam_feedrate_chipload with a WRONG-named param yields the NaN guard error through the dispatcher (gate proven E2E)", async () => {
    // 'feedPerToothMm' is not the engine's field (it wants chiploadMmTooth) -> feed = undefined·… = NaN.
    // Pre-fix this shipped NaN-as-success; the guard now returns a fail-loud error through prism_cam.
    const { ok, data } = await call(server, "cam_feedrate_chipload", {
      cuttingSpeedMmin: 120, toolDiameterMm: 12, flutes: 4, feedPerToothMm: 0.05,
    });
    expect(ok).toBe(false);
    expect(String(data.error)).toMatch(/non-finite.*NaN/);
    expect(data.non_finite_field).toBe("feedrateMmMin");
  });
});

describe("z.enum membership guard (false-green class)", () => {
  it("the gated actions are all in the ACTIONS enum", () => {
    for (const a of ["toolpath_generate", "post_process", "collision_check_full",
      "cam_feedrate_chipload", "cam_tool_deflection", "cam_coolant_strategy", "cam_omega_score",
      "cam_kienzle_force", "cam_taylor_tool_life"]) {
      expect(ACTIONS).toContain(a);
    }
  });
});
