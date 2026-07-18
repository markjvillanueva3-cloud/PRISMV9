/**
 * SwarmGroupExecutorWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-SWARM-GROUP — verifies SwarmGroupExecutor
 * (`executeSwarmGroups`) is wired into prism_orchestrate as the
 * `swarm_group_execute` action.
 *
 * The engine was flagged in BUILD_STATE.NEEDS_WIRING (709 unwired engines):
 * a real, non-stub 365-line engine with zero dispatcher reference. This unit
 * wires it. The test pins BOTH the wiring (source-grep fail-on-revert guards —
 * an action is worthless if a refactor silently un-wires it) AND the engine's
 * own contract (a real round-trip through executeSwarmGroups).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { executeSwarmGroups } from "../engines/SwarmGroupExecutor.js";

const DISPATCHER_SRC = readFileSync(
  fileURLToPath(new URL("../tools/dispatchers/orchestrationDispatcher.ts", import.meta.url)),
  "utf8",
);
const SCHEMA_SRC = readFileSync(
  fileURLToPath(new URL("../schemas/orchestrationActionSchemas.ts", import.meta.url)),
  "utf8",
);

describe("swarm_group_execute — dispatcher wiring", () => {
  it("the action is in the prism_orchestrate ACTIONS enum", () => {
    // Must be a quoted member of the `as const` ACTIONS array — z.enum(ACTIONS)
    // rejects any action string not present, so a missing entry = dead action.
    expect(DISPATCHER_SRC).toMatch(/"swarm_group_execute"/);
  });

  it("the handler case lazy-imports SwarmGroupExecutor", () => {
    expect(DISPATCHER_SRC).toMatch(/case "swarm_group_execute":/);
    expect(DISPATCHER_SRC).toMatch(
      /import\(\s*["']\.\.\/\.\.\/engines\/SwarmGroupExecutor\.js["']\s*\)/,
    );
  });

  it("the handler actually invokes executeSwarmGroups with groups as the FIRST arg", () => {
    // A case that imports but never calls the engine is a no-op orphan — the
    // exact class WIRE-UNWIRED guards against. Pinning `groups` as arg 1 also
    // catches an argument-order swap (executeSwarmGroups(timeoutMs, groups)) —
    // the marshalling-seam bug a source-grep-only test would otherwise miss.
    expect(DISPATCHER_SRC).toMatch(/await executeSwarmGroups\(\s*\n?\s*groups\b/);
  });

  it("the handler rejects a missing/empty groups array (fail-loud, not silent)", () => {
    expect(DISPATCHER_SRC).toMatch(
      /swarm_group_execute requires a non-empty 'groups' array/,
    );
  });

  it("the action has a registered Zod schema in ACTION_ORCHESTRATION_SCHEMAS", () => {
    // Per dispatcher conventions every action group needs a schema. The const
    // is defined AND registered in the exported map.
    expect(SCHEMA_SRC).toMatch(/const swarm_group_execute = z\.object\(/);
    expect(SCHEMA_SRC).toMatch(/^\s*swarm_group_execute,\s*$/m);
  });
});

describe("executeSwarmGroups — engine contract round-trip", () => {
  it("returns a well-formed SwarmGroupResult for an empty group list", async () => {
    // Empty input is the deterministic round-trip: no live agents needed, but
    // it still exercises the real partition/settle/synthesis code path and
    // proves executeSwarmGroups produces the SwarmGroupResult shape. (Full
    // dispatcher-action E2E through the MCP server is deferred — see the
    // handoff: U-WIRE-SWARM-GROUP-E2E.)
    const result = await executeSwarmGroups([]);
    expect(result.totalGroups).toBe(0);
    expect(result.completedGroups).toBe(0);
    expect(result.failedGroups).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(Array.isArray(result.groups)).toBe(true);
    expect(result.groups.length).toBe(0);
    expect(Array.isArray(result.synthesis)).toBe(true);
    expect(result.synthesis.length).toBe(0);
    expect(typeof result.duration_ms).toBe("number");
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("honors an explicit timeout_ms argument without throwing", async () => {
    // The dispatcher passes params.timeout_ms straight through — confirm the
    // 2-arg form is callable (the dispatcher's `executeSwarmGroups(groups, t)`).
    const result = await executeSwarmGroups([], 1000);
    expect(result.totalGroups).toBe(0);
    expect(result.timedOut).toBe(false);
  });
});
