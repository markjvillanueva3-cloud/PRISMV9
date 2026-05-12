/**
 * Tests for build-skill-manifest-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildSkillManifestIndex,
  readSkillManifestIndex,
  SkillManifestIndex,
} from "../../scripts/build-skill-manifest-index.js";

describe("build-skill-manifest-index (Phase 0.7)", () => {
  let index: SkillManifestIndex;

  beforeAll(async () => {
    const existing = await readSkillManifestIndex();
    if (existing && existing.skillCount > 10) {
      index = existing;
    } else {
      index = await buildSkillManifestIndex();
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

    it("has skillCount matching skills object keys", () => {
      expect(index.skillCount).toBe(Object.keys(index.skills).length);
    });

    it("indexes at least 30 skills", () => {
      expect(index.skillCount).toBeGreaterThan(30);
    });
  });

  describe("skill manifest structure", () => {
    it("every skill has required fields", () => {
      for (const [name, manifest] of Object.entries(index.skills)) {
        expect(typeof manifest.file, `${name}.file`).toBe("string");
        expect(typeof manifest.name, `${name}.name`).toBe("string");
        expect(Array.isArray(manifest.engines), `${name}.engines`).toBe(true);
        expect(Array.isArray(manifest.actions), `${name}.actions`).toBe(true);
        expect(Array.isArray(manifest.hooks), `${name}.hooks`).toBe(true);
        expect(typeof manifest.sha256, `${name}.sha256`).toBe("string");
        expect(typeof manifest.lineCount, `${name}.lineCount`).toBe("number");
      }
    });

    it("sha256 is a valid hex string", () => {
      for (const manifest of Object.values(index.skills)) {
        expect(manifest.sha256).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("lineCount is positive for all skills", () => {
      for (const manifest of Object.values(index.skills)) {
        expect(manifest.lineCount).toBeGreaterThan(0);
      }
    });
  });

  describe("known skill references", () => {
    it("lathe-studio skill references engines", () => {
      const manifest = index.skills["lathe-studio"];
      expect(manifest).toBeDefined();
      expect(manifest.engines.length).toBeGreaterThan(0);
    });

    it("pdf-learn skill references engines", () => {
      const manifest = index.skills["pdf-learn"];
      expect(manifest).toBeDefined();
      expect(manifest.engines.length).toBeGreaterThan(0);
    });
  });

  describe("coverage metrics", () => {
    it("majority of skills have some content", () => {
      const withContent = Object.values(index.skills).filter(
        (m) => m.engines.length > 0 || m.actions.length > 0
      ).length;
      expect(withContent).toBeGreaterThan(index.skillCount / 2);
    });
  });
});
