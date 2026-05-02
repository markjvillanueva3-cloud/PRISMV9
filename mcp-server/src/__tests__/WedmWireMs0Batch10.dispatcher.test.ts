/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch10:
 *   U-WWB25: wedm_learning_recommend  → WEDMLearningLoopEngine.getRecommendations (string + number)
 *   U-WWB26: wedm_batch_process       → WEDMMultiProfileBatchEngine.processBatch
 *   U-WWB27: wedm_lattice_build       → WEDMLatticeGraphEngine.build (optional opts)
 *
 * Notable shape variations:
 *   - WWB25: 2 primitive args (material:string + thickness_mm:number) — no input object wrapper
 *   - WWB27: all params optional — engine accepts BuildOptions = {}
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch10 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_learning_recommend"');
    expect(src).toContain('"wedm_batch_process"');
    expect(src).toContain('"wedm_lattice_build"');
  });

  it("the WEDM-WIRE-MS0/Batch10 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch10: learning loop recommend + batch process + lattice graph build");
  });
});

describe("U-WWB25 — wedm_learning_recommend wiring (material string + thickness number)", () => {
  it("dispatcher case lazy-imports WEDMLearningLoopEngine and calls getRecommendations", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_learning_recommend"');
    expect(src).toContain("WEDMLearningLoopEngine.js");
    expect(src).toContain("wedmLearningLoopEngine.getRecommendations");
  });

  it("case handler validates material:string + thickness_mm:number AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_learning_recommend"[\s\S]{0,1500}material non-empty string required/);
    expect(src).toMatch(/case "wedm_learning_recommend"[\s\S]{0,1500}thickness_mm finite number required/);
    expect(src).toMatch(/case "wedm_learning_recommend"[\s\S]{0,1500}Number\.isFinite\(thicknessMm\)/);
    expect(src).toMatch(/case "wedm_learning_recommend"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_learning_recommend with material:string(min 1) + thickness_mm:number", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_learning_recommend:");
    expect(src).toMatch(/wedm_learning_recommend:\s*z\.object\(\{[\s\S]{0,800}material:\s*z\.string\(\)\.min\(1\)/);
    expect(src).toMatch(/wedm_learning_recommend:\s*z\.object\(\{[\s\S]{0,800}thickness_mm:\s*z\.number\(\)/);
  });

  it("engine source: WEDMLearningLoopEngine exports the singleton + getRecommendations method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMLearningLoopEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmLearningLoopEngine\s*=\s*new WEDMLearningLoopEngine\(\)/);
    expect(src).toMatch(/getRecommendations\(\s*material:\s*string\s*,\s*thicknessMm:\s*number\s*\):\s*LearningRecommendation \| null/);
  });
});

describe("U-WWB26 — wedm_batch_process wiring", () => {
  it("dispatcher case lazy-imports WEDMMultiProfileBatchEngine and calls processBatch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_batch_process"');
    expect(src).toContain("WEDMMultiProfileBatchEngine.js");
    expect(src).toContain("wedmMultiProfileBatchEngine.processBatch");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_batch_process"[\s\S]{0,800}input required \(BatchInput\)/);
    expect(src).toMatch(/case "wedm_batch_process"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_batch_process"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_batch_process with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_batch_process:");
    expect(src).toMatch(/wedm_batch_process:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMMultiProfileBatchEngine exports the singleton + processBatch method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMMultiProfileBatchEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmMultiProfileBatchEngine\s*=\s*new WEDMMultiProfileBatchEngine\(\)/);
    expect(src).toMatch(/processBatch\(\s*input:\s*BatchInput\s*\):\s*BatchResult/);
  });
});

describe("U-WWB27 — wedm_lattice_build wiring (optional opts)", () => {
  it("dispatcher case lazy-imports WEDMLatticeGraphEngine and calls build", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_lattice_build"');
    expect(src).toContain("WEDMLatticeGraphEngine.js");
    expect(src).toContain("wedmLatticeGraphEngine.build");
  });

  it("case handler forwards optional opts AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_lattice_build"[\s\S]{0,800}opts/);
    expect(src).toMatch(/case "wedm_lattice_build"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_lattice_build"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_lattice_build with optional opts:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_lattice_build:");
    expect(src).toMatch(/wedm_lattice_build:\s*z\.object\(\{[\s\S]{0,500}opts:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: WEDMLatticeGraphEngine exports the singleton + build method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMLatticeGraphEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmLatticeGraphEngine\s*=\s*new WEDMLatticeGraphEngine\(\)/);
    expect(src).toMatch(/build\(\s*opts:\s*BuildOptions\s*=\s*\{\}\s*\):\s*BuildResult/);
  });
});
