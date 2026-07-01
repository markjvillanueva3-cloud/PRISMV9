import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/multiOpDispatcher.ts";
const SCH = "H:/prism/mcp-server/src/schemas/multiOpActionSchemas.ts";

describe("WIRE-MULTIOP-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");
  const s = readFileSync(SCH, "utf8");
  it("2 actions in enum", () => {
    assert.ok(d.includes('"swiss_part_transfer_sequence"'));
    assert.ok(d.includes('"action_sequence_extract"'));
  });
  it("dispatch calls correct methods", () => {
    assert.ok(d.includes("swissPartTransferSequenceEngine.generate("));
    assert.ok(d.includes("ActionSequenceExtractorEngine.extractFromTip("));
    assert.ok(d.includes("ActionSequenceExtractorEngine.extractBatch("));
  });
  it("2 schemas registered", () => {
    assert.ok(s.includes("swiss_part_transfer_sequence:"));
    assert.ok(s.includes("action_sequence_extract:"));
  });
  it("doctrine present in both files", () => {
    assert.ok(d.includes("WIRE-MULTIOP-DIRECT-MS0"));
    assert.ok(s.includes("WIRE-MULTIOP-DIRECT-MS0"));
  });
});
