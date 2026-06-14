/**
 * HOTEL Phase 2 — dispatcher wiring verification (G3 + G4 + G6).
 *
 * Verifies the 17 new actions are in z.enum AND have matching case branches,
 * plus the engines are loadable + PSN roost manifests exposed.
 *
 * @milestone HOTEL/U-ERP-PHASE2 (2026-05-26, slot:hotel iter7 /goal)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { automatedJobSchedulerEngine } from "../engines/AutomatedJobSchedulerEngine.js";
import { automatedTaskDelegatorEngine } from "../engines/AutomatedTaskDelegatorEngine.js";
import { aiSummaryWriterEngine } from "../engines/AISummaryWriterEngine.js";

const DISPATCHER_PATH = path.resolve(
  __dirname,
  "../tools/dispatchers/businessDispatcher.ts",
);
const SRC = readFileSync(DISPATCHER_PATH, "utf-8");

const NEW_ACTIONS: ReadonlyArray<string> = Object.freeze([
  // G3
  "auto_sched_build_diff", "auto_sched_submit_proposal", "auto_sched_build_and_submit",
  "auto_sched_history", "auto_sched_system_viz_roost",
  // G4
  "auto_deleg_build_proposal", "auto_deleg_submit_proposal", "auto_deleg_build_and_submit",
  "auto_deleg_history", "auto_deleg_system_viz_roost",
  // G6
  "ai_summary_build_daily_employee", "ai_summary_build_weekly_department",
  "ai_summary_build_monthly_customer", "ai_summary_submit_draft",
  "ai_summary_classify_cpk", "ai_summary_allowed_cadences",
  "ai_summary_system_viz_roost",
]);

describe("HOTEL Phase 2 — dispatcher wiring verification", () => {
  it("all 17 new actions are in z.enum ACTIONS", () => {
    for (const action of NEW_ACTIONS) {
      expect(SRC).toMatch(new RegExp(`["']${action}["']\\s*,`));
    }
  });

  it("all 17 new actions have matching case branches", () => {
    for (const action of NEW_ACTIONS) {
      expect(SRC).toMatch(new RegExp(`case\\s+["']${action}["']\\s*:`));
    }
  });

  it("z.enum count equals case count for new actions", () => {
    let enumN = 0, caseN = 0;
    for (const a of NEW_ACTIONS) {
      if (new RegExp(`["']${a}["']\\s*,`).test(SRC)) enumN++;
      if (new RegExp(`case\\s+["']${a}["']\\s*:`).test(SRC)) caseN++;
    }
    expect(enumN).toBe(NEW_ACTIONS.length);
    expect(caseN).toBe(NEW_ACTIONS.length);
  });

  it("dispatcher source references each Phase 2 engine .js path", () => {
    expect(SRC).toContain("AutomatedJobSchedulerEngine.js");
    expect(SRC).toContain("AutomatedTaskDelegatorEngine.js");
    expect(SRC).toContain("AISummaryWriterEngine.js");
  });

  it("engine singletons + classifyCpk function are loadable", () => {
    expect(typeof automatedJobSchedulerEngine.buildSchedulerDiff).toBe("function");
    expect(typeof automatedJobSchedulerEngine.systemVizRoost).toBe("function");
    expect(typeof automatedTaskDelegatorEngine.buildProposal).toBe("function");
    expect(typeof automatedTaskDelegatorEngine.systemVizRoost).toBe("function");
    expect(typeof aiSummaryWriterEngine.buildDailyEmployeeSummary).toBe("function");
    expect(typeof aiSummaryWriterEngine.systemVizRoost).toBe("function");
  });

  it("all 3 engines emit valid system-viz roost manifests (PSN+/system-viz integration)", () => {
    const g3 = automatedJobSchedulerEngine.systemVizRoost();
    const g4 = automatedTaskDelegatorEngine.systemVizRoost();
    const g6 = aiSummaryWriterEngine.systemVizRoost();
    for (const r of [g3, g4, g6]) {
      expect(r.layer).toBe(7);
      expect(r.node_type).toBe("hub");
      expect(r.psn_legs.length).toBeGreaterThanOrEqual(2);
      expect(r.edges_out).toContain("AIProposalApprovalQueueEngine");
    }
    // G3+G4 share Engines (7) + Algorithms (8) + AI (11)
    expect(g3.psn_legs).toEqual([7, 8, 11]);
    expect(g4.psn_legs).toEqual([7, 8, 11]);
    // G6 uses Wiki (3) + Tribal (5) + AI (11) — narrative draws from corpora
    expect(g6.psn_legs).toEqual([3, 5, 11]);
  });
});
