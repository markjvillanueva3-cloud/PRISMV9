/**
 * wire-safety-gates-verify.test.mjs — anti-regression for the 13 safety-gate
 * actions wired in WIRE-SAFETY-GATES-MS0/U-VICTOR-SAFETY-GATES (slot:victor, 2026-05-26).
 *
 * Pre-wire state: 13 actions had dispatch logic + action-sets + ALL_ACTIONS
 * enum membership but NO schemas in ACTION_SAFETY_SCHEMAS → silent
 * Zod-validation skip per H:/.claude/rules/schemas.md "schemas must match
 * dispatcher z.enum exactly".
 *
 * Post-wire: all 13 schemas registered. This test fails LOUD if any future
 * regression drops a schema, breaks the action-set <→ schema correspondence,
 * or shrinks the ALL_ACTIONS list (anti-regression rule).
 *
 * R9 (tests verify intent, not behavior): this encodes WHY each schema must
 * stay — every action shipped here is the only invocation path for one of the
 * 13 unwired-gate engines (CorrigibilityGate, MOUStallGate, PromotionGate,
 * etc.). Lose the schema, lose the engine's only callable surface.
 *
 * Run: node --test H:/prism/scripts/wire-safety-gates-verify.test.mjs
 *
 * Author: slot:victor — 2026-05-26
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SCHEMA_FILE = "H:/prism/mcp-server/src/schemas/safetyActionSchemas.ts";
const DISPATCHER_FILE = "H:/prism/mcp-server/src/tools/dispatchers/safetyDispatcher.ts";

// 13 actions wired in WIRE-SAFETY-GATES-MS0/U-VICTOR-SAFETY-GATES
const WIRED_ACTIONS = [
  "workholding_retrofit_advise",
  "swiss_collision_check",
  "corrigibility_gate_evaluate",
  "workholding_selection_select",
  "pre_wet_run_chaos_gate",
  "mou_stall_gate_compute",
  "pilot_phase_exit_evaluate",
  "inference_lora_gate_apply",
  "promotion_gate_evaluate",
  "gate_failure_history_record",
  "git_safety_check",
  "stock_boundary_gate_check",
  "archive_catalog_ingest",
];

// Action-set constant names paired 1:1 with the action strings — every action
// must have BOTH a Set (in the dispatcher) and a schema (in the schemas file).
const ACTION_SET_NAMES = [
  "WORKHOLDING_RETROFIT_ACTIONS",
  "SWISS_COLLISION_ACTIONS",
  "CORRIGIBILITY_GATE_ACTIONS",
  "WORKHOLDING_SELECTION_ACTIONS",
  "PRE_WET_RUN_CHAOS_ACTIONS",
  "MOU_STALL_GATE_ACTIONS",
  "PILOT_PHASE_EXIT_ACTIONS",
  "INFERENCE_LORA_GATE_ACTIONS",
  "PROMOTION_GATE_ACTIONS",
  "GATE_FAILURE_HISTORY_ACTIONS",
  "GIT_SAFETY_ACTIONS",
  "STOCK_BOUNDARY_GATE_ACTIONS",
  "ARCHIVE_CATALOG_INGEST_ACTIONS",
];

describe("WIRE-SAFETY-GATES-MS0 anti-regression", () => {
  const schemaText = readFileSync(SCHEMA_FILE, "utf8");
  const dispatcherText = readFileSync(DISPATCHER_FILE, "utf8");

  it("every action has a Zod schema entry in ACTION_SAFETY_SCHEMAS", () => {
    // Locate ACTION_SAFETY_SCHEMAS body
    const mapStart = schemaText.indexOf("export const ACTION_SAFETY_SCHEMAS");
    assert.ok(mapStart >= 0, "ACTION_SAFETY_SCHEMAS export must exist");
    const body = schemaText.slice(mapStart);
    for (const action of WIRED_ACTIONS) {
      // Schema entries appear as either `action_name,` (re-export from another
      // const) OR `action_name: z.object(...)` (inline definition). Both
      // patterns must match against this action.
      const reExport = new RegExp(`(^|[\\s,])${action}\\s*,`, "m");
      const inline = new RegExp(`(^|[\\s,])${action}\\s*:`, "m");
      const matched = reExport.test(body) || inline.test(body);
      assert.ok(matched, `ACTION_SAFETY_SCHEMAS is missing schema for action "${action}"`);
    }
  });

  it("every action_set is referenced in the dispatcher ALL_ACTIONS spread", () => {
    // ALL_ACTIONS = [ ...COLLISION, ...COOLANT, ... ] — each set must appear
    // in the spread. If a set is dropped, the action is unreachable from MCP.
    const allActionsStart = dispatcherText.indexOf("const ALL_ACTIONS");
    assert.ok(allActionsStart >= 0, "ALL_ACTIONS spread must exist");
    const allActionsEnd = dispatcherText.indexOf("] as const", allActionsStart);
    assert.ok(allActionsEnd > allActionsStart, "ALL_ACTIONS must terminate with `] as const`");
    const spread = dispatcherText.slice(allActionsStart, allActionsEnd);
    for (const setName of ACTION_SET_NAMES) {
      assert.ok(
        spread.includes(`...${setName}`),
        `ALL_ACTIONS spread is missing ...${setName} — action would be unreachable from MCP`,
      );
    }
  });

  it("every action_set has a corresponding dispatch handler (else-if branch)", () => {
    // Every set must have an `else if (SET.has(action))` branch downstream of
    // ALL_ACTIONS. Without this, even a valid action passes Zod and then
    // falls through to "Unknown safety action".
    for (const setName of ACTION_SET_NAMES) {
      const pattern = new RegExp(`${setName}\\.has\\s*\\(\\s*action\\s*\\)`);
      assert.ok(
        pattern.test(dispatcherText),
        `safetyDispatcher.ts is missing a dispatch branch for ${setName}`,
      );
    }
  });

  it("action_set ↔ schema correspondence is 1:1 (counts match)", () => {
    // Regression sentinel: if anyone ships an action_set without a schema or
    // vice-versa, this fires. Counts are baked in.
    assert.equal(WIRED_ACTIONS.length, 13, "exactly 13 actions in this milestone");
    assert.equal(ACTION_SET_NAMES.length, 13, "exactly 13 action_set names in this milestone");
    assert.equal(WIRED_ACTIONS.length, ACTION_SET_NAMES.length,
      "every action must map 1:1 to an action_set name");
  });

  it("schema doctrine comment is present (audit trail)", () => {
    // The WIRE-SAFETY-GATES-MS0 doctrine header explains WHY these schemas
    // exist (half-wire closure). Removing it without a replacement is a
    // doctrine-rot regression per CLAUDE.md §EXPERT ROLE.
    assert.ok(
      schemaText.includes("WIRE-SAFETY-GATES-MS0"),
      "WIRE-SAFETY-GATES-MS0 doctrine comment must remain in schema file",
    );
  });
});
