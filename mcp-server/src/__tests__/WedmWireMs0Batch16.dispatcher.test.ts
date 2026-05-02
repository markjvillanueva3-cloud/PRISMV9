/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch16:
 *   U-WWB43: wedm_online_predict_v2     → WEDMOnlineLearningEngine.predict
 *   U-WWB44: wedm_reasoning_explain_v2  → WEDMReasoningExplainEngine.explain
 *   U-WWB45: wedm_progress_start_job    → WEDMProgressTrackerEngine.startJob
 *
 * Three previously-unwired WEDM engines:
 *   - Online learning: incremental gradient model with 4-arg predict(material, parameters, thickness, machineId)
 *   - Reasoning explainer: ReasoningQuery → ReasoningExplanation with provenance trace
 *   - Progress tracker: starts a JobProgress ledger with total_stages (default 30)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch16 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_online_predict_v2"');
    expect(src).toContain('"wedm_reasoning_explain_v2"');
    expect(src).toContain('"wedm_progress_start_job"');
  });

  it("the WEDM-WIRE-MS0/Batch16 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch16: online learning + reasoning + progress tracker");
  });
});

describe("U-WWB43 — wedm_online_predict_v2 wiring", () => {
  it("dispatcher case lazy-imports WEDMOnlineLearningEngine and calls predict with 4 args", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_online_predict_v2"');
    expect(src).toContain("WEDMOnlineLearningEngine.js");
    expect(src).toContain("wedmOnlineLearningEngine.predict");
    expect(src).toMatch(/case "wedm_online_predict_v2"[\s\S]{0,2000}wedmOnlineLearningEngine\.predict\(\s*material,\s*parameters/);
  });

  it("case validates input.material (string) and input.parameters (object) before calling engine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_online_predict_v2"[\s\S]{0,2000}input required \(OnlinePredictInput\)/);
    expect(src).toMatch(/case "wedm_online_predict_v2"[\s\S]{0,2000}input\.material \(string\) and input\.parameters \(object\) required/);
    expect(src).toMatch(/case "wedm_online_predict_v2"[\s\S]{0,2000}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_online_predict_v2 with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_online_predict_v2:");
    expect(src).toMatch(/wedm_online_predict_v2:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMOnlineLearningEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMOnlineLearningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmOnlineLearningEngine\s*=\s*new WEDMOnlineLearningEngine\(\)/);
    expect(src).toMatch(/predict\(\s*[\s\S]{0,200}material:\s*string,[\s\S]{0,200}thickness:\s*number/);
  });
});

describe("U-WWB44 — wedm_reasoning_explain_v2 wiring", () => {
  it("dispatcher case lazy-imports WEDMReasoningExplainEngine and calls explain", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_reasoning_explain_v2"');
    expect(src).toContain("WEDMReasoningExplainEngine.js");
    expect(src).toContain("wedmReasoningExplainEngine.explain");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_reasoning_explain_v2"[\s\S]{0,800}input required \(ReasoningQuery\)/);
    expect(src).toMatch(/case "wedm_reasoning_explain_v2"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_reasoning_explain_v2"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_reasoning_explain_v2 with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_reasoning_explain_v2:");
    expect(src).toMatch(/wedm_reasoning_explain_v2:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMReasoningExplainEngine exports the singleton + explain method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMReasoningExplainEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmReasoningExplainEngine\s*=\s*new WEDMReasoningExplainEngine\(\)/);
    expect(src).toMatch(/explain\(\s*q:\s*ReasoningQuery\s*\):\s*ReasoningExplanation/);
  });
});

describe("U-WWB45 — wedm_progress_start_job wiring", () => {
  it("dispatcher case lazy-imports WEDMProgressTrackerEngine and calls startJob with job_id + total_stages", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_progress_start_job"');
    expect(src).toContain("WEDMProgressTrackerEngine.js");
    expect(src).toContain("wedmProgressTrackerEngine.startJob");
    expect(src).toMatch(/case "wedm_progress_start_job"[\s\S]{0,2000}wedmProgressTrackerEngine\.startJob\(job_id,\s*total_stages\)/);
  });

  it("case generates job_id via generateJobId() when not provided AND defaults total_stages=30", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_progress_start_job"[\s\S]{0,2000}wedmProgressTrackerEngine\.generateJobId\(\)/);
    expect(src).toMatch(/case "wedm_progress_start_job"[\s\S]{0,2000}total_stages\s*=[\s\S]{0,200}30/);
  });

  it("schema map exposes wedm_progress_start_job with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_progress_start_job:");
    expect(src).toMatch(/wedm_progress_start_job:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMProgressTrackerEngine exports the singleton + startJob method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMProgressTrackerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmProgressTrackerEngine\s*=\s*new WEDMProgressTrackerEngine\(\)/);
    expect(src).toMatch(/startJob\(\s*job_id:\s*string,\s*total_stages:\s*number\s*=\s*30\s*\):\s*JobProgress/);
  });
});
