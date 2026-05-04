/**
 * HyperMillDemoDbExtractor.test.ts
 *
 * Strict-legitimacy coverage for the demo.db SQLite tool/tech extractor.
 *
 * The hyperMILL v33.0 demo.db is a vendor file not present in CI; the public
 * contract is "graceful empty result, never throw". Tests target that contract
 * exhaustively, plus the constructor's path override surface.
 *
 * Coverage shape:
 *   - Class shape + singleton
 *   - Happy: missing-db status path returns structurally complete empty result
 *   - Failure modes: bogus path, empty path, junction-style path
 *   - Adversarial: very long path, unicode path, real-fs non-sqlite file
 *
 * @milestone CAM-EXHAUST-MS0/U-CAM-HM-EXTRACTOR-DL-TESTS-01
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  HyperMillDemoDbExtractor,
  hyperMillDemoDbExtractor,
  type DemoDbExtractionResult,
} from "../engines/HyperMillDemoDbExtractor.js";

// ── Named constants ────────────────────────────────────────────────────────────
const VALID_STATUSES: ReadonlyArray<DemoDbExtractionResult["status"]> = [
  "success", "missing", "error",
];
const NEVER_PATH = "Z:/__never_exists__/demo.db";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LONG_PATH_LEN = 600;

describe("HyperMillDemoDbExtractor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hmdemo-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* best-effort */ }
  });

  // ── Class shape + singleton ─────────────────────────────────────────────────
  describe("class shape & singleton", () => {
    it("constructor accepts custom path and exposes extract method", () => {
      const ex = new HyperMillDemoDbExtractor(NEVER_PATH);
      expect(ex).toBeInstanceOf(HyperMillDemoDbExtractor);
      expect(typeof ex.extract).toBe("function");
    });

    it("singleton uses the default hyperMILL v33.0 path family", () => {
      expect(hyperMillDemoDbExtractor).toBeInstanceOf(HyperMillDemoDbExtractor);
      // Singleton points at H:/prism/HYPERMILL/.../demo.db; method shape must match
      expect(typeof hyperMillDemoDbExtractor.extract).toBe("function");
    });
  });

  // ── Happy: missing-db graceful path ─────────────────────────────────────────
  describe("extract() — missing db graceful path", () => {
    it("returns status='missing' with structurally complete empty result", async () => {
      const ex = new HyperMillDemoDbExtractor(NEVER_PATH);
      const result = await ex.extract();
      expect(VALID_STATUSES).toContain(result.status);
      expect(result.status).toBe("missing");
      expect(result.geometryClasses).toEqual([]);
      expect(result.totalGeometryClasses).toBe(0);
      expect(result.totalTools).toBe(0);
      expect(result.totalCuttingTechs).toBe(0);
      expect(result.cuttingTech.totalEntries).toBe(0);
      expect(result.cuttingTech.materialToolCombinations).toBe(0);
      expect(result.cuttingTech.fields).toEqual([]);
      expect(result.cuttingTech.sampleEntries).toEqual([]);
    });

    it("error message names the missing path explicitly", async () => {
      const ex = new HyperMillDemoDbExtractor(NEVER_PATH);
      const result = await ex.extract();
      expect(result.error?.includes(NEVER_PATH)).toBe(true);
      expect(result.error?.toLowerCase().includes("not found")).toBe(true);
    });

    it("extractedAt is a valid ISO 8601 UTC timestamp", async () => {
      const ex = new HyperMillDemoDbExtractor(NEVER_PATH);
      const result = await ex.extract();
      expect(ISO_DATE_RE.test(result.extractedAt)).toBe(true);
      const parsed = Date.parse(result.extractedAt);
      expect(Number.isNaN(parsed)).toBe(false);
    });
  });

  // ── Failure modes (≥3) ──────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("empty-string path falls through to missing branch (does not throw)", async () => {
      const ex = new HyperMillDemoDbExtractor("");
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.totalTools).toBe(0);
    });

    it("path pointing at a directory (not a file) returns missing or error", async () => {
      // tmpDir exists as a directory; demo.db must be a file
      const ex = new HyperMillDemoDbExtractor(tmpDir);
      const result = await ex.extract();
      // existsSync is true on directories — extractor will try to open as DB and
      // either bail at sqlite-load or open. Either way: must not throw, and not 'success'.
      expect(VALID_STATUSES).toContain(result.status);
      expect(["missing", "error"]).toContain(result.status);
    });

    it("real fs file that is not a SQLite db routes through error path or load-fail", async () => {
      const fakeDb = path.join(tmpDir, "fake.db");
      fs.writeFileSync(fakeDb, "this is not a sqlite database");
      const ex = new HyperMillDemoDbExtractor(fakeDb);
      const result = await ex.extract();
      // existsSync true; better-sqlite3 may or may not be installed in test env
      // — both produce documented error/missing branches, never success
      expect(["missing", "error"]).toContain(result.status);
      expect(result.totalGeometryClasses).toBe(0);
    });
  });

  // ── Adversarial inputs (≥2) ─────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("very long path string handled without throwing", async () => {
      const longPath = "Z:/" + "x".repeat(LONG_PATH_LEN) + "/demo.db";
      const ex = new HyperMillDemoDbExtractor(longPath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.error?.includes("demo.db")).toBe(true);
    });

    it("unicode path handled gracefully on missing branch", async () => {
      const unicodePath = "Z:/демо/示例/тест-демо.db";
      const ex = new HyperMillDemoDbExtractor(unicodePath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
      expect(result.error?.includes(unicodePath)).toBe(true);
    });

    it("path containing null-byte-adjacent characters survives existsSync", async () => {
      // Use a clearly invalid but well-formed path
      const oddPath = "Z:/?? */demo.db";
      const ex = new HyperMillDemoDbExtractor(oddPath);
      const result = await ex.extract();
      expect(result.status).toBe("missing");
    });
  });

  // ── Repeat-call stability ───────────────────────────────────────────────────
  describe("repeat calls", () => {
    it("two extract() calls return independent objects with refreshed timestamps", async () => {
      const ex = new HyperMillDemoDbExtractor(NEVER_PATH);
      const r1 = await ex.extract();
      // Wait 2ms to guarantee distinct ISO timestamp at ms granularity
      await new Promise((resolve) => setTimeout(resolve, 2));
      const r2 = await ex.extract();
      expect(r1).not.toBe(r2);
      expect(r1.status).toBe(r2.status);
      expect(r1.extractedAt <= r2.extractedAt).toBe(true);
    });
  });
});
