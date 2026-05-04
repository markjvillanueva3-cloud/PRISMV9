/**
 * SolidWorksAutomationBridge — Dispatcher Wiring Tests
 *
 * CAM-EXHAUST-MS0 / U-CAM-SW-AUTOBRIDGE-WIRE-01
 *
 * Verifies that camDispatcher.ts correctly wires all 6 SolidWorks automation
 * actions to the SolidWorksAutomationBridge engine via the lazy-singleton
 * getEngine() getter. These tests inspect the dispatcher source as text and
 * assert real structural invariants (enum membership, case→engine routing,
 * await pattern per async method, snake_case/camelCase parameter fallbacks,
 * AtomicValue success-flag contract, idempotent close).
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";

const DISPATCHER_PATH = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

const SW_AUTO_ACTIONS = [
  "cam_solidworks_automation_open",
  "cam_solidworks_automation_get_feature_tree",
  "cam_solidworks_automation_export_step",
  "cam_solidworks_automation_export_pdf",
  "cam_solidworks_automation_get_bounding_box",
  "cam_solidworks_automation_close",
] as const;

const ACTION_COUNT_EXPECTED = 6;

const ASYNC_PATTERNS: Record<string, RegExp> = {
  "cam_solidworks_automation_open": /await\s+engine\.open\(/,
  "cam_solidworks_automation_get_feature_tree": /await\s+engine\.getFeatureTree\(/,
  "cam_solidworks_automation_export_step": /await\s+engine\.exportSTEP\(/,
  "cam_solidworks_automation_export_pdf": /await\s+engine\.exportPDF\(/,
  "cam_solidworks_automation_get_bounding_box": /await\s+engine\.getBoundingBox\(/,
  "cam_solidworks_automation_close": /await\s+engine\.close\(/,
};

const readDispatcher = async (): Promise<string> => readFile(DISPATCHER_PATH, "utf-8");

describe("SolidWorksAutomationBridge — dispatcher wiring (camDispatcher.ts)", () => {
  it("registers exactly 6 cam_solidworks_automation_* enum entries", async () => {
    const src = await readDispatcher();
    expect(SW_AUTO_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    const matchCount = SW_AUTO_ACTIONS.filter((action) => src.includes(`"${action}"`)).length;
    expect(matchCount).toBe(ACTION_COUNT_EXPECTED);
  });

  it("declares the _swAutoBridge lazy singleton in the let-list", async () => {
    const src = await readDispatcher();
    const matches = src.match(/_swAutoBridge\s*:\s*any/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("registers a swAutoBridge case that imports SolidWorksAutomationBridge.js", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"swAutoBridge"\s*:\s*return\s+_swAutoBridge\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/SolidWorksAutomationBridge\.js"\s*\)\)\.solidWorksAutomationBridge/;
    expect(re.test(src)).toBe(true);
  });

  it("declares one matching case statement per action (6 total)", async () => {
    const src = await readDispatcher();
    const present = SW_AUTO_ACTIONS.filter((action) =>
      new RegExp(`case\\s+"${action}"\\s*:`).test(src),
    );
    expect(present.length).toBe(ACTION_COUNT_EXPECTED);
    expect(present).toEqual([...SW_AUTO_ACTIONS]);
  });

  it("every case body resolves the engine via getEngine(\"swAutoBridge\")", async () => {
    const src = await readDispatcher();
    for (const action of SW_AUTO_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("swAutoBridge"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body awaits the correct async engine method", async () => {
    const src = await readDispatcher();
    for (const [action, pattern] of Object.entries(ASYNC_PATTERNS)) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      expect(body.length).toBeGreaterThan(0);
      expect(pattern.test(body)).toBe(true);
    }
  });

  it("open case accepts file_path|filePath fallback and assigns 'opened' result key", async () => {
    const src = await readDispatcher();
    const body = src.match(/case\s+"cam_solidworks_automation_open"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(body.length).toBeGreaterThan(0);
    expect(/params\.file_path\s*\?\?\s*params\.filePath/.test(body)).toBe(true);
    expect(/const\s+opened\s*=\s*await\s+engine\.open\(/.test(body)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*opened\s*\}/.test(body)).toBe(true);
  });

  it("export_step case accepts output_path|outputPath fallback and routes to exportSTEP", async () => {
    const src = await readDispatcher();
    const body =
      src.match(/case\s+"cam_solidworks_automation_export_step"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(body.length).toBeGreaterThan(0);
    expect(/params\.output_path\s*\?\?\s*params\.outputPath/.test(body)).toBe(true);
    expect(/const\s+exported\s*=\s*await\s+engine\.exportSTEP\(/.test(body)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*exported\s*\}/.test(body)).toBe(true);
  });

  it("export_pdf case accepts output_path|outputPath fallback and routes to exportPDF", async () => {
    const src = await readDispatcher();
    const body =
      src.match(/case\s+"cam_solidworks_automation_export_pdf"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(body.length).toBeGreaterThan(0);
    expect(/params\.output_path\s*\?\?\s*params\.outputPath/.test(body)).toBe(true);
    expect(/const\s+exported\s*=\s*await\s+engine\.exportPDF\(/.test(body)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*exported\s*\}/.test(body)).toBe(true);
  });

  it("every case sets result.success === true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    let successCount = 0;
    for (const action of SW_AUTO_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      if (re.test(src)) successCount += 1;
    }
    expect(successCount).toBe(ACTION_COUNT_EXPECTED);
  });

  it("close case is idempotent — invokes engine.close() with no args, returns 'closed'", async () => {
    const src = await readDispatcher();
    const body =
      src.match(/case\s+"cam_solidworks_automation_close"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(body.length).toBeGreaterThan(0);
    expect(/const\s+closed\s*=\s*await\s+engine\.close\(\)/.test(body)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*closed\s*\}/.test(body)).toBe(true);
    expect(/params\./.test(body)).toBe(false);
  });

  it("get_feature_tree and get_bounding_box require zero parameters", async () => {
    const src = await readDispatcher();
    const treeBody =
      src.match(/case\s+"cam_solidworks_automation_get_feature_tree"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(treeBody.length).toBeGreaterThan(0);
    expect(/const\s+tree\s*=\s*await\s+engine\.getFeatureTree\(\)/.test(treeBody)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*tree\s*\}/.test(treeBody)).toBe(true);
    expect(/params\./.test(treeBody)).toBe(false);

    const bboxBody =
      src.match(/case\s+"cam_solidworks_automation_get_bounding_box"\s*:[\s\S]*?break;/)?.[0] ?? "";
    expect(bboxBody.length).toBeGreaterThan(0);
    expect(/const\s+boundingBox\s*=\s*await\s+engine\.getBoundingBox\(\)/.test(bboxBody)).toBe(true);
    expect(/result\s*=\s*\{\s*success:\s*true,\s*boundingBox\s*\}/.test(bboxBody)).toBe(true);
    expect(/params\./.test(bboxBody)).toBe(false);
  });
});
