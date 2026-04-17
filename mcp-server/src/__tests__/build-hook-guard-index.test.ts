/**
 * Tests for build-hook-guard-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildHookGuardIndex,
  readHookGuardIndex,
  HookGuardIndex,
} from "../../scripts/build-hook-guard-index.js";

describe("build-hook-guard-index (Phase 0.7)", () => {
  let index: HookGuardIndex;

  beforeAll(async () => {
    const existing = await readHookGuardIndex();
    if (existing && existing.hookCount > 10) {
      index = existing;
    } else {
      index = await buildHookGuardIndex();
    }
  }, 30000);

  describe("index structure", () => {
    it("returns a valid index object", () => {
      expect(index).toBeDefined();
      expect(typeof index).toBe("object");
    });

    it("has schemaVersion field set to 1", () => {
      expect(index.schemaVersion).toBe(1);
    });

    it("has lastUpdated as a valid ISO string", () => {
      expect(typeof index.lastUpdated).toBe("string");
      const date = new Date(index.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("has hookCount matching guards array length", () => {
      expect(index.hookCount).toBe(index.guards.length);
    });

    it("indexes at least 20 hooks", () => {
      expect(index.hookCount).toBeGreaterThan(20);
    });
  });

  describe("guard structure", () => {
    it("every guard has required fields", () => {
      for (const guard of index.guards) {
        expect(typeof guard.hookFile, `${guard.hookFile}.hookFile`).toBe("string");
        expect(typeof guard.hookType, `${guard.hookFile}.hookType`).toBe("string");
        expect(Array.isArray(guard.fileGlobs), `${guard.hookFile}.fileGlobs`).toBe(true);
        expect(typeof guard.description, `${guard.hookFile}.description`).toBe("string");
      }
    });

    it("hookType is one of the allowed values", () => {
      const allowedTypes = ["PreToolUse", "PostToolUse", "PreCompact", "SessionStart", "Other"];
      for (const guard of index.guards) {
        expect(allowedTypes).toContain(guard.hookType);
      }
    });

    it("hookFile ends with .mjs or .js", () => {
      for (const guard of index.guards) {
        expect(guard.hookFile).toMatch(/\.(mjs|js)$/);
      }
    });
  });

  describe("byGlob reverse index", () => {
    it("byGlob is an object", () => {
      expect(typeof index.byGlob).toBe("object");
    });

    it("every byGlob entry is an array of hook files", () => {
      for (const [glob, hooks] of Object.entries(index.byGlob)) {
        expect(Array.isArray(hooks), `byGlob[${glob}]`).toBe(true);
        for (const hook of hooks) {
          expect(typeof hook).toBe("string");
        }
      }
    });

    it("maps at least 5 different globs", () => {
      expect(Object.keys(index.byGlob).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("known hooks", () => {
    it("ai-duplication-guard.mjs is indexed", () => {
      const guard = index.guards.find((g) => g.hookFile === "ai-duplication-guard.mjs");
      expect(guard).toBeDefined();
    });

    it("file-read-cache.mjs guards image files", () => {
      const guard = index.guards.find((g) => g.hookFile === "file-read-cache.mjs");
      expect(guard).toBeDefined();
      expect(guard?.fileGlobs.some((g) => g.includes("png") || g.includes("jpg"))).toBe(true);
    });

    it(".json glob maps to multiple hooks", () => {
      const jsonHooks = index.byGlob[".json"];
      expect(jsonHooks).toBeDefined();
      expect(jsonHooks.length).toBeGreaterThan(1);
    });
  });

  describe("coverage metrics", () => {
    it("majority of hooks have descriptions", () => {
      const withDesc = index.guards.filter((g) => g.description.length > 0).length;
      expect(withDesc).toBeGreaterThan(index.hookCount / 2);
    });

    it("some hooks guard file globs", () => {
      const withGlobs = index.guards.filter((g) => g.fileGlobs.length > 0).length;
      expect(withGlobs).toBeGreaterThan(5);
    });
  });
});
