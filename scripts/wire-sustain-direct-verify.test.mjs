/**
 * wire-sustain-direct-verify.test.mjs — anti-regression for the 3 Sustain*
 * sub-engines wired in WIRE-SUSTAIN-DIRECT-MS0/U-VICTOR-SUSTAIN-DIRECT
 * (slot:victor, 2026-05-26).
 *
 * Run: node --test H:/prism/scripts/wire-sustain-direct-verify.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISPATCHER = "H:/prism/mcp-server/src/tools/dispatchers/diagnosisDispatcher.ts";
const SCHEMA = "H:/prism/mcp-server/src/schemas/diagnosisActionSchemas.ts";

const WIRED_ACTIONS = [
  "sustain_params_optimize",
  "sustain_carbon_calculate",
  "sustain_energy_analyze",
];

const ENGINE_FILES = [
  "H:/prism/mcp-server/src/engines/SustainOptimizeEngine.ts",
  "H:/prism/mcp-server/src/engines/SustainCarbonEngine.ts",
  "H:/prism/mcp-server/src/engines/SustainEnergyEngine.ts",
];

describe("WIRE-SUSTAIN-DIRECT-MS0 anti-regression", () => {
  const dispatcherText = readFileSync(DISPATCHER, "utf8");
  const schemaText = readFileSync(SCHEMA, "utf8");

  it("dispatcher declares SUSTAIN_DIRECT_ACTIONS with all 3 action strings", () => {
    const m = /const SUSTAIN_DIRECT_ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(dispatcherText);
    assert.ok(m, "SUSTAIN_DIRECT_ACTIONS array must exist");
    for (const a of WIRED_ACTIONS) {
      assert.ok(m[1].includes('"' + a + '"'), 'SUSTAIN_DIRECT_ACTIONS missing "' + a + '"');
    }
  });

  it("SUSTAIN_DIRECT_ACTIONS is spread into the master ACTIONS list", () => {
    assert.ok(
      /const ACTIONS\s*=\s*\[[\s\S]*?\.\.\.SUSTAIN_DIRECT_ACTIONS,[\s\S]*?\]\s*as const/.test(dispatcherText),
      "...SUSTAIN_DIRECT_ACTIONS missing from ACTIONS spread",
    );
  });

  it("dispatcher has the SUSTAIN_DIRECT_ACTIONS dispatch branch", () => {
    assert.ok(
      /SUSTAIN_DIRECT_ACTIONS\.includes\s*\(\s*action/.test(dispatcherText),
      "dispatch branch for SUSTAIN_DIRECT_ACTIONS missing",
    );
  });

  it("dispatch branch routes to the correct static method per action", () => {
    assert.ok(/SustainOptimizeEngine\.optimize\(/.test(dispatcherText),
      "sustain_params_optimize must call SustainOptimizeEngine.optimize");
    assert.ok(/SustainCarbonEngine\.calculate\(/.test(dispatcherText),
      "sustain_carbon_calculate must call SustainCarbonEngine.calculate");
    assert.ok(/SustainEnergyEngine\.analyze\(/.test(dispatcherText),
      "sustain_energy_analyze must call SustainEnergyEngine.analyze");
  });

  it("every action has a schema entry in DIAGNOSIS_ACTION_SCHEMAS", () => {
    const mapStart = schemaText.indexOf("export const DIAGNOSIS_ACTION_SCHEMAS");
    const mapEnd = schemaText.indexOf("};", mapStart);
    const map = schemaText.slice(mapStart, mapEnd);
    for (const a of WIRED_ACTIONS) {
      // Regex literal (avoids heredoc escape mangling): match the action
      // name as a comma-or-colon-terminated entry inside the export map.
      const pattern = new RegExp("(^|[ \\t,\\n])" + a + "[ \\t]*[,:]", "m");
      assert.ok(pattern.test(map),
        'DIAGNOSIS_ACTION_SCHEMAS missing schema for "' + a + '"');
    }
  });

  it("WIRE-SUSTAIN-DIRECT-MS0 doctrine header is present in both files", () => {
    assert.ok(dispatcherText.includes("WIRE-SUSTAIN-DIRECT-MS0"),
      "WIRE-SUSTAIN-DIRECT-MS0 doctrine comment must remain in diagnosisDispatcher.ts");
    assert.ok(schemaText.includes("WIRE-SUSTAIN-DIRECT-MS0"),
      "WIRE-SUSTAIN-DIRECT-MS0 doctrine comment must remain in diagnosisActionSchemas.ts");
  });

  it("each engine file exists and is non-empty", () => {
    for (const f of ENGINE_FILES) {
      const txt = readFileSync(f, "utf8");
      assert.ok(txt.length > 0, "engine file " + f + " must exist and be non-empty");
    }
  });

  it("engines expose the expected static methods (R8 read-before-write check)", () => {
    const opt = readFileSync(ENGINE_FILES[0], "utf8");
    const carb = readFileSync(ENGINE_FILES[1], "utf8");
    const ener = readFileSync(ENGINE_FILES[2], "utf8");
    assert.ok(/static\s+optimize\s*\(/.test(opt),
      "SustainOptimizeEngine must declare static optimize");
    assert.ok(/static\s+calculate\s*\(/.test(carb),
      "SustainCarbonEngine must declare static calculate");
    assert.ok(/static\s+analyze\s*\(/.test(ener),
      "SustainEnergyEngine must declare static analyze");
  });
});
