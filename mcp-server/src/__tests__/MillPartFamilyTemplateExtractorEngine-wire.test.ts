/**
 * MillPartFamilyTemplateExtractorEngine-wire.test.ts
 *
 * Wiring coverage for TRAINING-LEARNING-MS0/U2 — verifies the dispatcher
 * action enum + lazy-import surface that camDispatcher uses. A full MCP
 * server round-trip is deferred to U5 (Domain matchers) where the matcher
 * engine adds end-to-end consumer paths; here we cover the wiring contract:
 *
 *   1. ACTIONS enum includes all 4 mill_training_* actions
 *   2. The mill engine module exposes the singleton the case-handlers expect
 *   3. Action-name spelling matches between enum + the case-handler block
 *      (asserted by reading the camDispatcher source and confirming both)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { millPartFamilyTemplateExtractorEngine } from "../engines/MillPartFamilyTemplateExtractorEngine.js";

const CAM_DISPATCHER_SRC = path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts");

const EXPECTED_MILL_ACTIONS = [
  "mill_training_corpus_status",
  "mill_training_template_match",
  "mill_training_template_list",
  "mill_training_template_extract_all",
] as const;

describe("camDispatcher ACTIONS enum — mill_training_* registered", () => {
  it.each(EXPECTED_MILL_ACTIONS)("ACTIONS includes %s", (action) => {
    expect((ACTIONS as ReadonlyArray<string>).includes(action)).toBe(true);
  });

  it("camDispatcher.ts source has a case-handler for each mill_training_* action", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    for (const action of EXPECTED_MILL_ACTIONS) {
      expect(src.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("camDispatcher.ts case-handlers all import MillPartFamilyTemplateExtractorEngine", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    // Each of the 4 case-handlers performs the lazy import — count occurrences.
    const importStmt = `await import("../../engines/MillPartFamilyTemplateExtractorEngine.js")`;
    const matches = src.split(importStmt).length - 1;
    expect(matches).toBe(4);
  });
});

describe("MillPartFamilyTemplateExtractorEngine — singleton + method surface", () => {
  it("singleton exports the 5 public methods camDispatcher case-handlers call", () => {
    const m = millPartFamilyTemplateExtractorEngine as unknown as Record<string, unknown>;
    expect(typeof m.catalogCorpus).toBe("function");
    expect(typeof m.extractTemplate).toBe("function");
    expect(typeof m.extractAllTemplates).toBe("function");
    expect(typeof m.listTemplates).toBe("function");
    expect(typeof m.getTemplate).toBe("function");
  });

  it("singleton class name is MillPartFamilyTemplateExtractorEngine", () => {
    expect(millPartFamilyTemplateExtractorEngine.constructor.name).toBe(
      "MillPartFamilyTemplateExtractorEngine"
    );
  });
});
