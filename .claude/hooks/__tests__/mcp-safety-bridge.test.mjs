// tier: T4
// Tests for .claude/hooks/mcp-safety-bridge.mjs (U-HKA08).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/mcp-safety-bridge.test.mjs
//
// Intent: an edit to physics constants / a cutting-mechanics or safety-validator file
// surfaces a directive to run prism_safety:validate_physics (and confirm S(x) ≥ 0.70)
// BEFORE committing — but it's a soft reminder, never a block; ordinary edits and test
// files are untouched; a missing MCP server doesn't break it.

import { describe, it, expect } from "vitest";
import {
  isDisabled,
  mcpUrl,
  isPhysicsCritical,
  buildAdvisory,
  runBridge,
} from "../mcp-safety-bridge.mjs";

describe("isDisabled / mcpUrl", () => {
  it("PRISM_MCP_SAFETY_BRIDGE=0 disables", () => {
    expect(isDisabled({ PRISM_MCP_SAFETY_BRIDGE: "0" })).toBe(true);
    expect(isDisabled({})).toBe(false);
  });
  it("mcpUrl: default + override (trailing slash stripped)", () => {
    expect(mcpUrl({})).toBe("http://127.0.0.1:3100");
    expect(mcpUrl({ PRISM_MCP_URL: "http://host:9999/" })).toBe("http://host:9999");
  });
});

describe("isPhysicsCritical — what counts as a physics-critical edit (variability axis)", () => {
  it("the canonical constants file (any */physics/constants.ts)", () => {
    expect(isPhysicsCritical("mcp-server/src/physics/constants.ts")).toBe(true);
    expect(isPhysicsCritical("H:/prism/mcp-server/src/physics/constants.ts")).toBe(true);
  });
  it("anything else under src/physics/", () => {
    expect(isPhysicsCritical("mcp-server/src/physics/kienzle.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/physics/material-coefficients.ts")).toBe(true);
  });
  it("cutting-mechanics / tool-life engines + safety validators (by name, under engines|algorithms|safety)", () => {
    expect(isPhysicsCritical("mcp-server/src/engines/KienzleCuttingForceEngine.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/engines/TaylorToolLifeEngine.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/engines/SpecificCuttingEnergyEngine.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/algorithms/JohnsonCookFlowStress.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/engines/PhysicsValidationEngine.ts")).toBe(true);
    expect(isPhysicsCritical("mcp-server/src/safety/SafetyGateValidator.ts")).toBe(true);
  });
  it("ordinary files are NOT physics-critical", () => {
    expect(isPhysicsCritical("mcp-server/src/engines/CodeGeneratorEngine.ts")).toBe(false);
    expect(isPhysicsCritical("mcp-server/src/tools/dispatchers/devDispatcher.ts")).toBe(false);
    expect(isPhysicsCritical("scripts/build-state-snapshot.mjs")).toBe(false);
    expect(isPhysicsCritical("README.md")).toBe(false);
    // a Kienzle-named file NOT under engines/algorithms/safety → not critical (e.g. a doc)
    expect(isPhysicsCritical("knowledge/wiki/concepts/kienzle-force-model.md")).toBe(false);
  });
  it("test / spec / .d.ts / dist files are skipped by default, included with the env flag", () => {
    expect(isPhysicsCritical("mcp-server/src/__tests__/KienzleCuttingForceEngine.test.ts")).toBe(false);
    expect(isPhysicsCritical("mcp-server/src/physics/constants.test.ts")).toBe(false);
    expect(isPhysicsCritical("mcp-server/src/physics/constants.d.ts")).toBe(false);
    expect(isPhysicsCritical("mcp-server/dist/physics/constants.js")).toBe(false);
    // with the override:
    expect(isPhysicsCritical("mcp-server/src/__tests__/KienzleCuttingForceEngine.test.ts", { PRISM_MCP_SAFETY_BRIDGE_TESTS: "1" })).toBe(true);
  });
  it("non-string / empty → false", () => {
    expect(isPhysicsCritical("")).toBe(false);
    expect(isPhysicsCritical(undefined)).toBe(false);
    expect(isPhysicsCritical(42)).toBe(false);
  });
});

describe("buildAdvisory", () => {
  it("names the file, the validator action, the S(x) floor, and the constants-only rule", () => {
    const m = buildAdvisory("mcp-server/src/physics/constants.ts", { mcpUp: null });
    expect(m).toMatch(/mcp-server\/src\/physics\/constants\.ts/);
    expect(m).toMatch(/validate_physics/);
    expect(m).toMatch(/S\(x\)\s*≥\s*0\.70/);
    expect(m.toLowerCase()).toMatch(/never inline|constants\.ts/);
    expect(m.toLowerCase()).toMatch(/soft reminder|does not block|does NOT block/i);
  });
  it("mentions MCP server reachability when known", () => {
    expect(buildAdvisory("x/physics/constants.ts", { mcpUp: true }).toLowerCase()).toMatch(/reachable|run the validation now/);
    expect(buildAdvisory("x/physics/constants.ts", { mcpUp: false }).toLowerCase()).toMatch(/did not respond|start it/);
  });
  it("does NOT inline numeric physics constants (only references constants.ts)", () => {
    // belt-and-suspenders: the advisory must not itself hardcode kc1.1 values
    const m = buildAdvisory("x/physics/constants.ts", {});
    expect(m).not.toMatch(/\b(1800|2100|1100|2800|3200)\b/);
  });
});

describe("runBridge — end to end (MCP probe injected)", () => {
  it("disabled → no advice", async () => {
    expect((await runBridge({ stdin: { tool_input: { file_path: "mcp-server/src/physics/constants.ts" } }, env: { PRISM_MCP_SAFETY_BRIDGE: "0" }, probeFn: async () => true })).advise).toBe(false);
  });
  it("ordinary edit → no advice", async () => {
    expect((await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "mcp-server/src/engines/CodeGeneratorEngine.ts" } }, env: {}, probeFn: async () => true })).advise).toBe(false);
  });
  it("physics constants edit + MCP up → advises, message says 'reachable'", async () => {
    const r = await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/src/physics/constants.ts" }, session_id: "s" }, env: {}, probeFn: async () => true });
    expect(r.advise).toBe(true);
    expect(r.mcpUp).toBe(true);
    expect(r.message).toMatch(/validate_physics/);
    expect(r.message.toLowerCase()).toMatch(/reachable/);
  });
  it("physics constants edit + MCP down → still advises, message says 'start it'", async () => {
    const r = await runBridge({ stdin: { tool_name: "Write", tool_input: { file_path: "mcp-server/src/physics/constants.ts" } }, env: {}, probeFn: async () => false });
    expect(r.advise).toBe(true);
    expect(r.mcpUp).toBe(false);
    expect(r.message.toLowerCase()).toMatch(/did not respond|start it/);
  });
  it("Kienzle engine edit also triggers (Write matcher / different physics target)", async () => {
    const r = await runBridge({ stdin: { tool_name: "Write", tool_input: { file_path: "mcp-server/src/engines/KienzleCuttingForceEngine.ts" } }, env: {}, probeFn: async () => true });
    expect(r.advise).toBe(true);
  });
  it("a test file is skipped by default", async () => {
    expect((await runBridge({ stdin: { tool_input: { file_path: "mcp-server/src/__tests__/SpecificCuttingEnergyEngine.test.ts" } }, env: {}, probeFn: async () => true })).advise).toBe(false);
  });
  it("the MCP probe throwing doesn't break it (mcpUp stays null, still advises)", async () => {
    const r = await runBridge({ stdin: { tool_input: { file_path: "mcp-server/src/physics/constants.ts" } }, env: {}, probeFn: async () => { throw new Error("boom"); } });
    expect(r.advise).toBe(true);
    expect(r.mcpUp).toBeNull();
  });
  it("garbled / null stdin → no advice, never throws", async () => {
    await expect(runBridge({ stdin: null, env: {}, probeFn: async () => true })).resolves.toMatchObject({ advise: false });
    await expect(runBridge({ stdin: { tool_input: { file_path: 123 } }, env: {}, probeFn: async () => true })).resolves.toMatchObject({ advise: false });
  });
  it("tool_input.path is honoured as well as .file_path", async () => {
    expect((await runBridge({ stdin: { tool_name: "NotebookEdit", tool_input: { path: "mcp-server/src/physics/notebook-physics.ts" } }, env: {}, probeFn: async () => true })).advise).toBe(true);
  });
});
