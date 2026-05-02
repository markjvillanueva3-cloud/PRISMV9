/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch20:
 *   U-WWB55: wedm_blackboard_stats              → WEDMBlackboardEngine.getStats
 *   U-WWB56: wedm_continuous_learning_ingest    → WEDMContinuousLearningEngine.ingest
 *   U-WWB57: wedm_feedback_submit               → WEDMFeedbackCalibrationEngine.submit_feedback
 *
 * Three previously-unwired WEDM coordination/learning engines:
 *   - Blackboard: pub-sub coordination state with namespace partitioning
 *   - Continuous learning: per-material online model from LearningSignal stream
 *   - Feedback calibration: operator-corrective signal updates Ra + MRR coefficients
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch20 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_blackboard_stats"');
    expect(src).toContain('"wedm_continuous_learning_ingest"');
    expect(src).toContain('"wedm_feedback_submit"');
  });

  it("the WEDM-WIRE-MS0/Batch20 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch20: blackboard + continuous learning + feedback");
  });
});

describe("U-WWB55 — wedm_blackboard_stats wiring", () => {
  it("dispatcher case lazy-imports WEDMBlackboardEngine and calls getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_blackboard_stats"');
    expect(src).toContain("WEDMBlackboardEngine.js");
    expect(src).toContain("wedmBlackboardEngine.getStats");
  });

  it("case wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_blackboard_stats"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_blackboard_stats"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_blackboard_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_blackboard_stats:");
    expect(src).toMatch(/wedm_blackboard_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: WEDMBlackboardEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMBlackboardEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmBlackboardEngine\s*=\s*new WEDMBlackboardEngine\(\)/);
    expect(src).toMatch(/getStats\(\):\s*BlackboardStats/);
  });
});

describe("U-WWB56 — wedm_continuous_learning_ingest wiring", () => {
  it("dispatcher case lazy-imports WEDMContinuousLearningEngine and calls ingest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_continuous_learning_ingest"');
    expect(src).toContain("WEDMContinuousLearningEngine.js");
    expect(src).toContain("wedmContinuousLearningEngine.ingest");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_continuous_learning_ingest"[\s\S]{0,800}input required \(LearningSignal\)/);
    expect(src).toMatch(/case "wedm_continuous_learning_ingest"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_continuous_learning_ingest"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_continuous_learning_ingest with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_continuous_learning_ingest:");
    expect(src).toMatch(/wedm_continuous_learning_ingest:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMContinuousLearningEngine exports the singleton + ingest method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMContinuousLearningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmContinuousLearningEngine\s*=\s*new WEDMContinuousLearningEngine\(\)/);
    expect(src).toMatch(/ingest\(\s*signal:\s*LearningSignal\s*\):\s*LearningIngestResult/);
  });
});

describe("U-WWB57 — wedm_feedback_submit wiring", () => {
  it("dispatcher case lazy-imports WEDMFeedbackCalibrationEngine and calls submit_feedback", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_feedback_submit"');
    expect(src).toContain("WEDMFeedbackCalibrationEngine.js");
    expect(src).toContain("wedmFeedbackCalibrationEngine.submit_feedback");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_feedback_submit"[\s\S]{0,800}input required \(WEDMFeedback\)/);
    expect(src).toMatch(/case "wedm_feedback_submit"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_feedback_submit"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_feedback_submit with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_feedback_submit:");
    expect(src).toMatch(/wedm_feedback_submit:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMFeedbackCalibrationEngine exports the singleton + submit_feedback method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMFeedbackCalibrationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmFeedbackCalibrationEngine\s*=\s*new WEDMFeedbackCalibrationEngine\(\)/);
    expect(src).toMatch(/submit_feedback\(\s*feedback:\s*WEDMFeedback\s*\):\s*FeedbackResult/);
  });
});
