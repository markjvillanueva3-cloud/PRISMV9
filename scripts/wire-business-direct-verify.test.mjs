import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts";
const SCH = "H:/prism/mcp-server/src/schemas/businessActionSchemas.ts";
const ACTIONS = ["scenario_batch_run", "rfq_orchestrator_list_records", "monolith_roughing_machine_get"];
const METHODS = [
  ["ScenarioBatchRunnerEngine", "scenarioBatchRunnerEngine", "run"],
  ["RFQToOrderOrchestratorEngine", "rfqToOrderOrchestratorEngine", "listRecords"],
  ["MonolithRoughingMachineConfigsEngine", "monolithRoughingMachineConfigsEngine", "getConfig"],
];

describe("WIRE-BUSINESS-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");
  const s = readFileSync(SCH, "utf8");

  it("3 actions are in the ACTIONS enum", () => {
    for (const a of ACTIONS) assert.ok(d.includes('"' + a + '"'), 'ACTIONS missing "' + a + '"');
  });
  it("3 dispatch cases exist", () => {
    for (const a of ACTIONS) assert.ok(new RegExp('case "' + a + '"').test(d), 'dispatch case missing for "' + a + '"');
  });
  it("each case calls the correct engine.method", () => {
    for (const [klass, singleton, method] of METHODS) {
      assert.ok(d.includes(klass), "dispatcher must import " + klass);
      // String contains check (avoids heredoc-mangled regex escaping).
      assert.ok(d.includes(singleton + "." + method + "("), singleton + "." + method + "(...) must be called");
    }
  });
  it("3 schemas exist in ACTION_BUSINESS_SCHEMAS", () => {
    for (const a of ACTIONS) {
      const pattern = new RegExp("(^|[ \t,\n])" + a + "[ \t]*[,:]", "m");
      assert.ok(pattern.test(s), "schema missing for " + a);
    }
  });
  it("WIRE-BUSINESS-DIRECT-MS0 doctrine header in both files", () => {
    assert.ok(d.includes("WIRE-BUSINESS-DIRECT-MS0"), "doctrine comment missing in dispatcher");
    assert.ok(s.includes("WIRE-BUSINESS-DIRECT-MS0"), "doctrine comment missing in schemas");
  });
});
