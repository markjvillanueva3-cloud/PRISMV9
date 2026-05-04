/**
 * HyperMillIMDbExtractor.test.ts
 *
 * Strict-legitimacy coverage for both Intelligent Macro extractors:
 *   - IMToolDbExtractor — IM_Tool_DB_V2023.1.db (materials, formulas, MatTechs)
 *   - IMMacroDbExtractor — IM_Macro_DB.db (macros, jobs, version)
 *
 * Both contracts: never throw; return structurally-complete empty result on
 * missing db or runtime error; status field reflects branch taken.
 *
 * Coverage shape:
 *   - Class shape + singletons (2)
 *   - Happy: missing-db graceful path
 *   - Failure modes: empty path, directory-as-file, non-sqlite file
 *   - Adversarial: long path, unicode path, repeat-call independence
 *
 * @milestone CAM-EXHAUST-MS0/U-CAM-HM-EXTRACTOR-DL-TESTS-01
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  IMToolDbExtractor,
  IMMacroDbExtractor,
  imToolDbExtractor,
  imMacroDbExtractor,
  type IMToolDbResult,
  type IMMacroDbResult,
} from "../engines/HyperMillIMDbExtractor.js";

// ── Named constants ────────────────────────────────────────────────────────────
const TOOL_STATUSES: ReadonlyArray<IMToolDbResult["status"]> = ["success", "missing", "error"];
const MACRO_STATUSES: ReadonlyArray<IMMacroDbResult["status"]> = ["success", "missing", "error"];
const NEVER_TOOL_PATH = "Z:/__never__/IM_Tool_DB.db";
const NEVER_MACRO_PATH = "Z:/__never__/IM_Macro_DB.db";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LONG_PATH_LEN = 500;

// ─────────────────────────────────────────────────────────────────────────────
// IMToolDbExtractor
// ─────────────────────────────────────────────────────────────────────────────
describe("IMToolDbExtractor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hmim-tool-"));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  describe("class shape & singleton", () => {
    it("constructor accepts custom path and exposes async extract()", () => {
      const ex = new IMToolDbExtractor(NEVER_TOOL_PATH);
      expect(ex).toBeInstanceOf(IMToolDbExtractor);
      expect(typeof ex.extract).toBe("function");
    });

    it("singleton instance is an IMToolDbExtractor with extract()", () => {
      expect(imToolDbExtractor).toBeInstanceOf(IMToolDbExtractor);
      expect(typeof imToolDbExtractor.extract).toBe("function");
    });
  });

  describe("extract() — missing db graceful path", () => {
    it("returns status='missing' with structurally-complete empty result", async () => {
      const ex = new IMToolDbExtractor(NEVER_TOOL_PATH);
      const result = await ex.extract();
      expect(TOOL_STATUSES).toContain(result.status);
      expect(result.status).toBe("missing");
      expect(result.materials).toEqual([]);
      expect(result.cuttingMaterials).toEqual([]);
      expect(result.formulas).toEqual([]);
      expect(result.matTechCount).toBe(0);
      expect(result.matTechItemCount).toBe(0);
      expect(result.tables).toEqual([]);
      expect(ISO_DATE_RE.test(result.extractedAt)).toBe(true);
    });

    it("error message names the missing path explicitly", async () => {
      const ex = new IMToolDbExtractor(NEVER_TOOL_PATH);
      const result = await ex.extract();
      expect(result.error?.includes(NEVER_TOOL_PATH)).toBe(true);
      expect(result.error?.toLowerCase().includes("not found")).toBe(true);
    });
  });

  describe("failure modes", () => {
    it("empty path returns missing branch", async () => {
      const ex = new IMToolDbExtractor("");
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.matTechCount).toBe(0);
    });

    it("directory passed as db path routes through missing or error", async () => {
      const ex = new IMToolDbExtractor(tmpDir);
      const result = await ex.extract();
      expect(["missing", "error"]).toContain(result.status);
    });

    it("non-sqlite file routes through error or missing, never success", async () => {
      const fakeDb = path.join(tmpDir, "fake_tool.db");
      fs.writeFileSync(fakeDb, "junk header bytes ZZZ");
      const ex = new IMToolDbExtractor(fakeDb);
      const result = await ex.extract();
      expect(["missing", "error"]).toContain(result.status);
      expect(result.materials).toEqual([]);
    });
  });

  describe("adversarial inputs", () => {
    it("oversize path string handled without throwing", async () => {
      const longPath = "Z:/" + "a".repeat(LONG_PATH_LEN) + "/IM_Tool.db";
      const ex = new IMToolDbExtractor(longPath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
    });

    it("unicode path produces missing branch with path echoed", async () => {
      const unicodePath = "Z:/материалы/工具/IM_Tool.db";
      const ex = new IMToolDbExtractor(unicodePath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.error?.includes(unicodePath)).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IMMacroDbExtractor
// ─────────────────────────────────────────────────────────────────────────────
describe("IMMacroDbExtractor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hmim-macro-"));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  describe("class shape & singleton", () => {
    it("constructor accepts custom path and exposes async extract()", () => {
      const ex = new IMMacroDbExtractor(NEVER_MACRO_PATH);
      expect(ex).toBeInstanceOf(IMMacroDbExtractor);
      expect(typeof ex.extract).toBe("function");
    });

    it("singleton instance is an IMMacroDbExtractor with extract()", () => {
      expect(imMacroDbExtractor).toBeInstanceOf(IMMacroDbExtractor);
      expect(typeof imMacroDbExtractor.extract).toBe("function");
    });
  });

  describe("extract() — missing db graceful path", () => {
    it("returns status='missing' with structurally-complete empty result", async () => {
      const ex = new IMMacroDbExtractor(NEVER_MACRO_PATH);
      const result = await ex.extract();
      expect(MACRO_STATUSES).toContain(result.status);
      expect(result.status).toBe("missing");
      expect(result.tables).toEqual([]);
      expect(result.macroTypes).toEqual([]);
      expect(result.macros).toEqual([]);
      expect(result.jobs).toEqual([]);
      expect(result.macroCount).toBe(0);
      expect(result.version).toBe("unknown");
      expect(ISO_DATE_RE.test(result.extractedAt)).toBe(true);
    });

    it("error message names the missing path explicitly", async () => {
      const ex = new IMMacroDbExtractor(NEVER_MACRO_PATH);
      const result = await ex.extract();
      expect(result.error?.includes(NEVER_MACRO_PATH)).toBe(true);
    });
  });

  describe("failure modes", () => {
    it("empty path returns missing branch", async () => {
      const ex = new IMMacroDbExtractor("");
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.macroCount).toBe(0);
    });

    it("directory passed as db path routes through missing or error", async () => {
      const ex = new IMMacroDbExtractor(tmpDir);
      const result = await ex.extract();
      expect(["missing", "error"]).toContain(result.status);
    });

    it("non-sqlite file routes through error or missing, never success", async () => {
      const fakeDb = path.join(tmpDir, "fake_macro.db");
      fs.writeFileSync(fakeDb, "garbage payload not sqlite");
      const ex = new IMMacroDbExtractor(fakeDb);
      const result = await ex.extract();
      expect(["missing", "error"]).toContain(result.status);
      expect(result.macros).toEqual([]);
    });
  });

  describe("adversarial inputs", () => {
    it("oversize path handled without throwing", async () => {
      const longPath = "Z:/" + "b".repeat(LONG_PATH_LEN) + "/IM_Macro.db";
      const ex = new IMMacroDbExtractor(longPath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
    });

    it("unicode path echoed in error", async () => {
      const unicodePath = "Z:/макросы/宏定义/IM_Macro.db";
      const ex = new IMMacroDbExtractor(unicodePath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.error?.includes(unicodePath)).toBe(true);
    });

    it("repeat extract() calls return independent objects with sane timestamps", async () => {
      const ex = new IMMacroDbExtractor(NEVER_MACRO_PATH);
      const r1 = await ex.extract();
      await new Promise((resolve) => setTimeout(resolve, 2));
      const r2 = await ex.extract();
      expect(r1).not.toBe(r2);
      expect(r1.status).toBe(r2.status);
      expect(r1.extractedAt <= r2.extractedAt).toBe(true);
    });
  });
});
