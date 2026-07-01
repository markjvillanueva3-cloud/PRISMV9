import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/materialProcessingDispatcher.ts";
const SCH = "H:/prism/mcp-server/src/schemas/materialProcessingActionSchemas.ts";

describe("WIRE-COATING-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");
  const s = readFileSync(SCH, "utf8");
  it("2 actions in enum", () => {
    assert.ok(d.includes('"coating_select"'), "missing coating_select");
    assert.ok(d.includes('"coating_select_orchestrated"'), "missing coating_select_orchestrated");
  });
  it("dispatch calls correct methods", () => {
    assert.ok(d.includes("coatingSelectionEngine.calculate("), "CoatingSelectionEngine.calculate missing");
    assert.ok(d.includes("coatingSelectionAdapter.selectCoatingOrchestrated("), "CoatingSelectionAdapter.selectCoatingOrchestrated missing");
  });
  it("2 schemas registered", () => {
    assert.ok(s.includes("coating_select:"), "schema coating_select missing");
    assert.ok(s.includes("coating_select_orchestrated:"), "schema coating_select_orchestrated missing");
  });
  it("doctrine present in both files", () => {
    assert.ok(d.includes("WIRE-COATING-DIRECT-MS0"));
    assert.ok(s.includes("WIRE-COATING-DIRECT-MS0"));
  });
});
