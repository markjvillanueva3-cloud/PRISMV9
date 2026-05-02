/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch16:
 *   U-LWB43: lathe_agi_continuous_record → LatheAGIContinuousLearningEngine.recordFeedback
 *   U-LWB44: lathe_agi_feature_reason    → LatheAGIFeatureBridgeEngine.reason
 *   U-LWB45: lathe_agi_safety_check      → LatheAGISafetyContainmentEngine.check
 *
 * Three previously-unwired Lathe AGI engines:
 *   - Continuous learning: EWMA-based feedback slot updates with adjustment prediction
 *   - Feature bridge: AGI reasoner that routes across speed_feed/postgen/masterpost/p2p/erp
 *   - Safety containment: pre-flight safety check across speed-feed/quote/schedule candidates
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch16 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_agi_continuous_record"');
    expect(src).toContain('"lathe_agi_feature_reason"');
    expect(src).toContain('"lathe_agi_safety_check"');
  });

  it("the LATHE-WIRE-MS0/Batch16 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch16: AGI continuous learning + feature bridge + safety containment");
  });
});

describe("U-LWB43 — lathe_agi_continuous_record wiring", () => {
  it("dispatcher case lazy-imports LatheAGIContinuousLearningEngine and calls recordFeedback", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_agi_continuous_record"');
    expect(src).toContain("LatheAGIContinuousLearningEngine.js");
    expect(src).toContain("latheAGIContinuousLearningEngine.recordFeedback");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_agi_continuous_record"[\s\S]{0,800}input required \(RecordFeedbackInput\)/);
    expect(src).toMatch(/case "lathe_agi_continuous_record"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_agi_continuous_record"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_agi_continuous_record with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_agi_continuous_record:");
    expect(src).toMatch(/lathe_agi_continuous_record:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAGIContinuousLearningEngine exports the singleton + recordFeedback method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAGIContinuousLearningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAGIContinuousLearningEngine\s*=\s*new LatheAGIContinuousLearningEngine\(\)/);
    expect(src).toMatch(/recordFeedback\(\s*input:\s*RecordFeedbackInput\s*\):\s*Slot/);
  });
});

describe("U-LWB44 — lathe_agi_feature_reason wiring", () => {
  it("dispatcher case lazy-imports LatheAGIFeatureBridgeEngine and calls reason", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_agi_feature_reason"');
    expect(src).toContain("LatheAGIFeatureBridgeEngine.js");
    expect(src).toContain("latheAGIFeatureBridgeEngine.reason");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_agi_feature_reason"[\s\S]{0,800}input required \(AGIReasonInput\)/);
    expect(src).toMatch(/case "lathe_agi_feature_reason"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_agi_feature_reason"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_agi_feature_reason with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_agi_feature_reason:");
    expect(src).toMatch(/lathe_agi_feature_reason:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAGIFeatureBridgeEngine exports the singleton + reason method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAGIFeatureBridgeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAGIFeatureBridgeEngine\s*=\s*new LatheAGIFeatureBridgeEngine\(\)/);
    expect(src).toMatch(/reason\(\s*input:\s*AGIReasonInput\s*\):\s*AGIReasonResult/);
  });
});

describe("U-LWB45 — lathe_agi_safety_check wiring", () => {
  it("dispatcher case lazy-imports LatheAGISafetyContainmentEngine and calls check", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_agi_safety_check"');
    expect(src).toContain("LatheAGISafetyContainmentEngine.js");
    expect(src).toContain("latheAGISafetyContainmentEngine.check");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_agi_safety_check"[\s\S]{0,800}input required \(SafetyCheckInput\)/);
    expect(src).toMatch(/case "lathe_agi_safety_check"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_agi_safety_check"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_agi_safety_check with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_agi_safety_check:");
    expect(src).toMatch(/lathe_agi_safety_check:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAGISafetyContainmentEngine exports the singleton + check method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAGISafetyContainmentEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAGISafetyContainmentEngine\s*=\s*new LatheAGISafetyContainmentEngine\(\)/);
    expect(src).toMatch(/check\(\s*input:\s*SafetyCheckInput\s*\):\s*SafetyReport/);
  });
});
