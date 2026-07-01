/**
 * HOTEL Phase 3 — dispatcher wiring verification (G7+G8+G9+G10+G13+G14+G15).
 * @milestone HOTEL/U-ERP-PHASE3 (2026-05-27, slot:hotel iter9 /goal)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { departmentAuditDashboardEngine } from "../engines/DepartmentAuditDashboardEngine.js";
import { auditFindingToCAPABridgeEngine } from "../engines/AuditFindingToCAPABridgeEngine.js";
import { approvalChainEngine } from "../engines/ApprovalChainEngine.js";
import { rfqToOrderOrchestratorEngine } from "../engines/RFQToOrderOrchestratorEngine.js";
import { logisticsDashboardEngine } from "../engines/LogisticsDashboardEngine.js";
import { financialInvariantGateEngine, piiRedactionEngine } from "../engines/HotelGateEngines.js";

const SRC = readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/businessDispatcher.ts"),
  "utf-8",
);

const NEW_ACTIONS: ReadonlyArray<string> = Object.freeze([
  // G7
  "dept_audit_build_row", "dept_audit_system_viz_roost",
  // G13
  "audit_capa_create", "audit_capa_get_kaizen_for_finding",
  "audit_capa_get_finding_for_kaizen", "audit_capa_list", "audit_capa_system_viz_roost",
  // G8
  "appr_chain_open", "appr_chain_approve_step", "appr_chain_reject_step",
  "appr_chain_withdraw", "appr_chain_get", "appr_chain_list", "appr_chain_system_viz_roost",
  // G9
  "rfq_receive", "rfq_draft_quote", "rfq_mark_admin_approved",
  "rfq_mark_admin_rejected", "rfq_mark_sent_to_customer", "rfq_mark_customer_accepted",
  "rfq_mark_customer_rejected", "rfq_expire_overdue", "rfq_get", "rfq_list",
  "rfq_system_viz_roost",
  // G10
  "logistics_build_dashboard", "logistics_system_viz_roost",
  // G14
  "fin_invariant_validate_double_entry", "fin_invariant_validate_trial_balance",
  "fin_invariant_validate_no_posted_overwrite", "fin_invariant_system_viz_roost",
  // G15
  "pii_redact_ssn", "pii_redact_credit_card", "pii_scrub",
  "pii_detect_violations", "pii_system_viz_roost",
]);

describe("HOTEL Phase 3 — dispatcher wiring", () => {
  it("all new actions in z.enum + case branches", () => {
    for (const a of NEW_ACTIONS) {
      expect(SRC).toMatch(new RegExp(`["']${a}["']\\s*,`));
      expect(SRC).toMatch(new RegExp(`case\\s+["']${a}["']\\s*:`));
    }
  });

  it("dispatcher references each Phase 3 engine .js path", () => {
    expect(SRC).toContain("DepartmentAuditDashboardEngine.js");
    expect(SRC).toContain("AuditFindingToCAPABridgeEngine.js");
    expect(SRC).toContain("ApprovalChainEngine.js");
    expect(SRC).toContain("RFQToOrderOrchestratorEngine.js");
    expect(SRC).toContain("LogisticsDashboardEngine.js");
    expect(SRC).toContain("HotelGateEngines.js");
  });

  it("all 7 Phase 3 engines are loadable + emit valid PSN/system-viz roosts", () => {
    const roosts = [
      departmentAuditDashboardEngine.systemVizRoost(),
      auditFindingToCAPABridgeEngine.systemVizRoost(),
      approvalChainEngine.systemVizRoost(),
      rfqToOrderOrchestratorEngine.systemVizRoost(),
      logisticsDashboardEngine.systemVizRoost(),
      financialInvariantGateEngine.systemVizRoost(),
      piiRedactionEngine.systemVizRoost(),
    ];
    for (const r of roosts) {
      expect(r.layer).toBe(7);
      expect(r.node_type).toBe("hub");
      expect(r.psn_legs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("singleton functions are callable (smoke)", () => {
    expect(typeof departmentAuditDashboardEngine.buildRow).toBe("function");
    expect(typeof auditFindingToCAPABridgeEngine.createCapaFromFinding).toBe("function");
    expect(typeof approvalChainEngine.open).toBe("function");
    expect(typeof rfqToOrderOrchestratorEngine.receiveRfq).toBe("function");
    expect(typeof logisticsDashboardEngine.buildDashboard).toBe("function");
    expect(typeof financialInvariantGateEngine.validateDoubleEntry).toBe("function");
    expect(typeof piiRedactionEngine.redactSSN).toBe("function");
  });
});
