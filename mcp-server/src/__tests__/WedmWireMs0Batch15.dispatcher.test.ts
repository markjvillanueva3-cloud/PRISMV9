/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch15:
 *   U-WWB40: wedm_ra_predict             → WEDMRaPredictorEngine.predict
 *   U-WWB41: wedm_recast_depth_predict   → WEDMRecastDepthPredictorEngine.predict
 *   U-WWB42: wedm_pulse_limit_validate   → WEDMPulseLimitEngine.validate
 *
 * Quality + safety prediction trio:
 *   - Ra (surface roughness) prediction informs strategy/skim-pass count selection
 *   - Recast layer depth prediction informs HAZ + post-process planning
 *   - Pulse limit validation gates pulse parameters against per-machine envelope
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch15 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_ra_predict"');
    expect(src).toContain('"wedm_recast_depth_predict"');
    expect(src).toContain('"wedm_pulse_limit_validate"');
  });

  it("the WEDM-WIRE-MS0/Batch15 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch15: Ra predictor + recast depth + pulse limit");
  });
});

describe("U-WWB40 — wedm_ra_predict wiring", () => {
  it("dispatcher case lazy-imports WEDMRaPredictorEngine and calls predict", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_ra_predict"');
    expect(src).toContain("WEDMRaPredictorEngine.js");
    expect(src).toContain("wedmRaPredictorEngine.predict");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_ra_predict"[\s\S]{0,800}input required \(RaPredictionInput\)/);
    expect(src).toMatch(/case "wedm_ra_predict"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_ra_predict"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_ra_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_ra_predict:");
    expect(src).toMatch(/wedm_ra_predict:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMRaPredictorEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMRaPredictorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmRaPredictorEngine\s*=\s*new WEDMRaPredictorEngine\(\)/);
    expect(src).toMatch(/predict\(\s*input:\s*RaPredictionInput\s*\):\s*RaPredictionResult/);
  });
});

describe("U-WWB41 — wedm_recast_depth_predict wiring", () => {
  it("dispatcher case lazy-imports WEDMRecastDepthPredictorEngine and calls predict", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_recast_depth_predict"');
    expect(src).toContain("WEDMRecastDepthPredictorEngine.js");
    expect(src).toContain("wedmRecastDepthPredictorEngine.predict");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_recast_depth_predict"[\s\S]{0,800}input required \(RecastPredictionInput\)/);
    expect(src).toMatch(/case "wedm_recast_depth_predict"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_recast_depth_predict"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_recast_depth_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_recast_depth_predict:");
    expect(src).toMatch(/wedm_recast_depth_predict:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMRecastDepthPredictorEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMRecastDepthPredictorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmRecastDepthPredictorEngine\s*=\s*new WEDMRecastDepthPredictorEngine\(\)/);
    expect(src).toMatch(/predict\(\s*input:\s*RecastPredictionInput\s*\):\s*RecastPredictionResult/);
  });
});

describe("U-WWB42 — wedm_pulse_limit_validate wiring", () => {
  it("dispatcher case lazy-imports WEDMPulseLimitEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_pulse_limit_validate"');
    expect(src).toContain("WEDMPulseLimitEngine.js");
    expect(src).toContain("wedmPulseLimitEngine.validate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_pulse_limit_validate"[\s\S]{0,800}input required \(PulseLimitInput\)/);
    expect(src).toMatch(/case "wedm_pulse_limit_validate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_pulse_limit_validate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_pulse_limit_validate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_pulse_limit_validate:");
    expect(src).toMatch(/wedm_pulse_limit_validate:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPulseLimitEngine exports the singleton + validate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPulseLimitEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPulseLimitEngine\s*=\s*new WEDMPulseLimitEngine\(\)/);
    expect(src).toMatch(/validate\(\s*input:\s*PulseLimitInput\s*\):\s*PulseLimitResult/);
  });
});
