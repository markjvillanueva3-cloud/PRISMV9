/**
 * HOTEL Phase 1 P0 — dispatcher wiring verification.
 *
 * businessDispatcher is MCP-server-bound (`registerBusinessDispatcher(server)`)
 * so we can't directly call actions in a unit test. Instead this verifies:
 *   (1) every new action name is present in the z.enum ACTIONS array
 *   (2) every new action has a matching `case "..."` branch in the dispatcher
 *       source (catches missed wiring after adding to z.enum)
 *   (3) the engines themselves are reachable via their exported singletons
 *
 * Per comprehensive-build enforcement rule 5: this is the "wiring verification"
 * acceptance check — schema enum, action handler, lazy import all aligned.
 *
 * @milestone HOTEL/U-ERP-PHASE1-P0 (2026-05-26, slot:hotel iter6 /goal)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { departmentEngine } from "../engines/DepartmentEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";

const DISPATCHER_PATH = path.resolve(
  __dirname,
  "../tools/dispatchers/businessDispatcher.ts",
);
const SRC = readFileSync(DISPATCHER_PATH, "utf-8");

const NEW_ACTIONS: ReadonlyArray<string> = Object.freeze([
  // G1 DepartmentEngine
  "dept_create", "dept_get", "dept_list", "dept_reassign_manager",
  "dept_add_member", "dept_remove_member", "dept_rename",
  "dept_set_machine_domain", "dept_set_parent", "dept_set_kpi_rollup",
  "dept_get_rollup", "dept_ancestor_chain",
  // G2 ManagerRegistryEngine
  "mgr_register", "mgr_get", "mgr_list", "mgr_promote", "mgr_demote",
  "mgr_reassign_dept", "mgr_set_reports_to", "mgr_deactivate",
  "mgr_reactivate", "mgr_can_approve", "mgr_reports_to_chain",
  "mgr_direct_reports", "mgr_rank_order",
  // G5 AIProposalApprovalQueueEngine
  "aiprop_submit", "aiprop_begin_review", "aiprop_approve", "aiprop_reject",
  "aiprop_edit_and_approve", "aiprop_withdraw", "aiprop_expire_overdue",
  "aiprop_list_queue", "aiprop_get", "aiprop_stats",
  "aiprop_set_admin_min_rank",
]);

describe("HOTEL Phase 1 — dispatcher wiring verification", () => {
  it("all 36 new actions are listed in the z.enum ACTIONS array", () => {
    for (const action of NEW_ACTIONS) {
      // Match exact action string in the ACTIONS literal array
      expect(SRC).toMatch(new RegExp(`["']${action}["']\\s*,`));
    }
  });

  it("all 36 new actions have a matching case branch in the dispatcher", () => {
    for (const action of NEW_ACTIONS) {
      // Match `case "action":` pattern
      expect(SRC).toMatch(new RegExp(`case\\s+["']${action}["']\\s*:`));
    }
  });

  it("z.enum count matches case branch count for new actions", () => {
    let enumMatches = 0;
    let caseMatches = 0;
    for (const action of NEW_ACTIONS) {
      if (new RegExp(`["']${action}["']\\s*,`).test(SRC)) enumMatches++;
      if (new RegExp(`case\\s+["']${action}["']\\s*:`).test(SRC)) caseMatches++;
    }
    expect(enumMatches).toBe(NEW_ACTIONS.length);
    expect(caseMatches).toBe(NEW_ACTIONS.length);
    expect(enumMatches).toBe(caseMatches);
  });

  it("each engine lazy-imports referenced in the dispatcher source", () => {
    expect(SRC).toContain("DepartmentEngine.js");
    expect(SRC).toContain("ManagerRegistryEngine.js");
    expect(SRC).toContain("AIProposalApprovalQueueEngine.js");
  });

  it("engine singletons are loadable + match dispatcher-referenced names", () => {
    // Smoke-check that the singletons the dispatcher imports actually exist
    expect(typeof departmentEngine.createDepartment).toBe("function");
    expect(typeof managerRegistryEngine.register).toBe("function");
    expect(typeof aiProposalApprovalQueueEngine.submit).toBe("function");
  });

  it("dispatcher uses lazy-import pattern (existing convention)", () => {
    expect(SRC).toMatch(/await import\(".*DepartmentEngine\.js"\)/);
    expect(SRC).toMatch(/await import\(".*ManagerRegistryEngine\.js"\)/);
    expect(SRC).toMatch(/await import\(".*AIProposalApprovalQueueEngine\.js"\)/);
  });
});
