import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/processControlDispatcher.ts";
const SCH = "H:/prism/mcp-server/src/schemas/processControlActionSchemas.ts";

describe("WIRE-PROCESS-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");
  const s = readFileSync(SCH, "utf8");
  it("2 actions in enum", () => {
    assert.ok(d.includes('"doe_taguchi_compute"'), "missing doe_taguchi_compute");
    assert.ok(d.includes('"cusum_stream_analyze"'), "missing cusum_stream_analyze");
  });
  it("2 dispatch cases call correct engines", () => {
    assert.ok(d.includes("doeTaguchEngine.compute("), "doeTaguchEngine.compute call missing");
    assert.ok(d.includes("new CUSUMEngine("), "CUSUMEngine instantiation missing");
    assert.ok(d.includes(".step("), "CUSUMEngine.step call missing");
  });
  it("2 schemas registered", () => {
    assert.ok(s.includes("doe_taguchi_compute"), "schema doe_taguchi_compute missing");
    assert.ok(s.includes("cusum_stream_analyze"), "schema cusum_stream_analyze missing");
  });
  it("doctrine header in both files", () => {
    assert.ok(d.includes("WIRE-PROCESS-DIRECT-MS0"), "doctrine in dispatcher missing");
    assert.ok(s.includes("WIRE-PROCESS-DIRECT-MS0"), "doctrine in schemas missing");
  });
});
