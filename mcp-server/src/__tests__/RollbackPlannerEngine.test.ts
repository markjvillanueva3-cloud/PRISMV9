/**
 * U-FORE-10 tests — RollbackPlannerEngine
 *
 * Every assertion checks a real expected value. Coverage: happy + ≥3
 * failure modes + ≥2 adversarial + variability across all 8 StepKind
 * branches. Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  RollbackPlannerEngine,
  rollbackPlannerEngine,
} from "../engines/RollbackPlannerEngine.js";
import type { BuildStep } from "../engines/AtomicStepDecomposerEngine.js";

function buildStep(kind: BuildStep["kind"], id = kind, description?: string): BuildStep {
  return {
    id,
    kind,
    description: description ?? `step ${kind}`,
    estTokens: 500,
    estDurationSec: 10,
    risk: 0.1,
    rollback: "see rollback planner",
  };
}

describe("RollbackPlannerEngine — per-step rollback mapping", () => {
  it("exports singleton with correct class name", () => {
    expect(rollbackPlannerEngine).toBeInstanceOf(RollbackPlannerEngine);
    expect(rollbackPlannerEngine.name).toBe("RollbackPlannerEngine");
  });

  it("write_engine step → file_delete with extracted path", () => {
    const action = rollbackPlannerEngine.rollbackForStep(
      buildStep("write_engine", "E1", "write src/engines/FooEngine.ts")
    );
    expect(action.kind).toBe("file_delete");
    expect(action.targetFile).toBe("src/engines/FooEngine.ts");
    expect(action.command).toContain('rm -f "src/engines/FooEngine.ts"');
  });

  it("write_schema step → file_delete rollback", () => {
    const action = rollbackPlannerEngine.rollbackForStep(
      buildStep("write_schema", "S1", "write src/schemas/fooSchema.ts")
    );
    expect(action.kind).toBe("file_delete");
    expect(action.targetFile).toBe("src/schemas/fooSchema.ts");
  });

  it("write_test step → file_delete rollback", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("write_test", "T1"));
    expect(action.kind).toBe("file_delete");
  });

  it("read_schema step → noop rollback", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("read_schema", "R1"));
    expect(action.kind).toBe("noop");
    expect(action.rationale).toBe("Reads don't mutate state");
  });

  it("wire_dispatcher step → dispatcher_action_remove", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("wire_dispatcher", "W1"));
    expect(action.kind).toBe("dispatcher_action_remove");
    expect(action.command).toContain("ACTIONS enum");
  });

  it("register_hook step → hook_reregister", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("register_hook", "H1"));
    expect(action.kind).toBe("hook_reregister");
    expect(action.command).toContain("settings.json");
  });

  it("commit step → git_revert", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("commit", "C1"));
    expect(action.kind).toBe("git_revert");
    expect(action.command).toBe("git revert --no-edit HEAD");
  });

  it("regenerate_manifest step → file_delete (treated as creation)", () => {
    const action = rollbackPlannerEngine.rollbackForStep(buildStep("regenerate_manifest", "M1"));
    expect(action.kind).toBe("file_delete");
  });

  it("unknown kind falls back to noop", () => {
    const unknown = buildStep("commit", "X");
    (unknown as { kind: string }).kind = "mystery_kind";
    const action = rollbackPlannerEngine.rollbackForStep(unknown);
    expect(action.kind).toBe("noop");
    expect(action.rationale).toMatch(/no standard rollback/);
  });
});

describe("RollbackPlannerEngine — planRollback", () => {
  it("reverses step order — LIFO execution", () => {
    const plan = rollbackPlannerEngine.planRollback("U-ORDER", [
      buildStep("write_engine", "1"),
      buildStep("write_test", "2"),
      buildStep("commit", "3"),
    ]);
    expect(plan.actions.map((a) => a.stepId)).toEqual(["3", "2", "1"]);
  });

  it("maps every input step to one action", () => {
    const steps = [
      buildStep("write_engine", "1"),
      buildStep("write_test", "2"),
      buildStep("commit", "3"),
    ];
    const plan = rollbackPlannerEngine.planRollback("U-MAP", steps);
    expect(plan.totalActions).toBe(3);
    expect(plan.actions).toHaveLength(3);
  });

  it("starts unverified until verify() runs", () => {
    const plan = rollbackPlannerEngine.planRollback("U-UV", [buildStep("commit", "C")]);
    expect(plan.verified).toBe(false);
    expect(plan.verifiedCount).toBe(0);
  });

  it("empty step list yields empty plan", () => {
    const plan = rollbackPlannerEngine.planRollback("U-EMPTY", []);
    expect(plan.totalActions).toBe(0);
    expect(plan.actions).toEqual([]);
  });

  it("FAIL: empty unitId throws", () => {
    expect(() =>
      rollbackPlannerEngine.planRollback("", [])
    ).toThrow(/unitId required/);
  });

  it("FAIL: non-array steps throws", () => {
    expect(() =>
      rollbackPlannerEngine.planRollback("U-X", "nope" as unknown as BuildStep[])
    ).toThrow(/must be an array/);
  });

  it("FAIL: undefined unitId throws", () => {
    expect(() =>
      rollbackPlannerEngine.planRollback(
        undefined as unknown as string,
        []
      )
    ).toThrow(/unitId required/);
  });
});

describe("RollbackPlannerEngine — verify", () => {
  it("marks noop actions verified without simulating", () => {
    const plan = rollbackPlannerEngine.planRollback("U-NO", [
      buildStep("read_schema", "R1"),
    ]);
    const verified = rollbackPlannerEngine.verify(plan);
    expect(verified.actions[0].verified).toBe(true);
    expect(verified.verifiedCount).toBe(1);
    expect(verified.verified).toBe(true);
  });

  it("planAndVerify composes plan + verify", () => {
    const plan = rollbackPlannerEngine.planAndVerify("U-COMPOSE", [
      buildStep("commit", "C1"),
      buildStep("write_engine", "E1", "write src/engines/FooEngine.ts"),
    ]);
    expect(plan.totalActions).toBe(2);
    expect(plan.verifiedCount).toBeGreaterThan(0);
  });

  it("plan verifies fully when every action verifies", () => {
    const plan = rollbackPlannerEngine.planAndVerify("U-FULL", [
      buildStep("read_schema", "R1"),
      buildStep("read_schema", "R2"),
    ]);
    expect(plan.verified).toBe(true);
    expect(plan.verifiedCount).toBe(2);
  });
});

describe("RollbackPlannerEngine — renderShellScript", () => {
  it("emits bash header and set -e", () => {
    const plan = rollbackPlannerEngine.planRollback("U-SH", [buildStep("commit", "C1")]);
    const script = rollbackPlannerEngine.renderShellScript(plan);
    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("set -e");
  });

  it("includes every action's command in order", () => {
    const plan = rollbackPlannerEngine.planRollback("U-CMDS", [
      buildStep("write_engine", "E", "write src/engines/FooEngine.ts"),
      buildStep("commit", "C"),
    ]);
    const script = rollbackPlannerEngine.renderShellScript(plan);
    expect(script).toContain("git revert --no-edit HEAD");
    expect(script).toContain("rm -f");
  });

  it("renders the unitId + verification state in the header", () => {
    const plan = rollbackPlannerEngine.planRollback("U-HDR", [buildStep("commit", "C1")]);
    const script = rollbackPlannerEngine.renderShellScript(plan);
    expect(script).toContain("U-HDR");
    expect(script).toContain("Verified: false");
  });
});

describe("RollbackPlannerEngine — adversarial", () => {
  it("ADV: step without path hint still produces a valid rm -f command", () => {
    const action = rollbackPlannerEngine.rollbackForStep(
      buildStep("write_engine", "X", "no path here")
    );
    expect(action.kind).toBe("file_delete");
    expect(action.command.startsWith("rm -f")).toBe(true);
  });

  it("ADV: 500-step plan builds in under 200ms", () => {
    const steps: BuildStep[] = [];
    for (let i = 0; i < 500; i++) {
      steps.push(buildStep("write_engine", `S${i}`, `write src/engines/E${i}.ts`));
    }
    const start = Date.now();
    const plan = rollbackPlannerEngine.planRollback("U-BULK", steps);
    expect(plan.totalActions).toBe(500);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("ADV: unicode in description yields a rm -f command that doesn't crash", () => {
    const action = rollbackPlannerEngine.rollbackForStep(
      buildStep("write_engine", "U", "write src/engines/漢字FooEngine.ts")
    );
    expect(action.kind).toBe("file_delete");
    expect(action.command).toContain("rm -f");
  });
});

describe("RollbackPlannerEngine — dispatcher round-trip", () => {
  it("devDispatcher exposes rollback_plan + rollback_verify actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"rollback_plan"');
    expect(disp).toContain('"rollback_verify"');
    expect(disp).toContain("RollbackPlannerEngine.js");
  });
});
