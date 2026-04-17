/**
 * Tests for build-extraction-inverse-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildExtractionInverseIndex,
  readExtractionInverseIndex,
  ExtractionInverseIndex,
} from "../../scripts/build-extraction-inverse-index.js";

describe("build-extraction-inverse-index (Phase 0.7)", () => {
  let index: ExtractionInverseIndex;

  beforeAll(async () => {
    const existing = await readExtractionInverseIndex();
    if (existing && existing.extractionCount > 0) {
      index = existing;
    } else {
      index = await buildExtractionInverseIndex();
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

    it("has extractionCount matching extractions object keys", () => {
      expect(index.extractionCount).toBe(Object.keys(index.extractions).length);
    });

    it("has totalTipsGenerated field", () => {
      expect(typeof index.totalTipsGenerated).toBe("number");
      expect(index.totalTipsGenerated).toBeGreaterThanOrEqual(0);
    });
  });

  describe("extraction entry structure", () => {
    it("every extraction has required fields", () => {
      for (const [id, ext] of Object.entries(index.extractions)) {
        expect(typeof ext.id, `${id}.id`).toBe("string");
        expect(typeof ext.name, `${id}.name`).toBe("string");
        expect(typeof ext.source, `${id}.source`).toBe("string");
        expect(typeof ext.type, `${id}.type`).toBe("string");
        expect(typeof ext.tipsGenerated, `${id}.tipsGenerated`).toBe("number");
        expect(typeof ext.status, `${id}.status`).toBe("string");
        expect(typeof ext.sha256, `${id}.sha256`).toBe("string");
      }
    });

    it("sha256 is a valid hex string", () => {
      for (const ext of Object.values(index.extractions)) {
        expect(ext.sha256).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("tipsGenerated is non-negative", () => {
      for (const ext of Object.values(index.extractions)) {
        expect(ext.tipsGenerated).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("bySource reverse index", () => {
    it("bySource is an object", () => {
      expect(typeof index.bySource).toBe("object");
    });

    it("every bySource entry is an extraction id", () => {
      for (const [source, id] of Object.entries(index.bySource)) {
        expect(typeof id, `bySource[${source}]`).toBe("string");
      }
    });
  });

  describe("byType reverse index", () => {
    it("byType is an object", () => {
      expect(typeof index.byType).toBe("object");
    });

    it("every byType entry is an array of extraction ids", () => {
      for (const [type, ids] of Object.entries(index.byType)) {
        expect(Array.isArray(ids), `byType[${type}]`).toBe(true);
        for (const id of ids) {
          expect(typeof id).toBe("string");
          expect(index.extractions[id]).toBeDefined();
        }
      }
    });
  });

  describe("byStatus reverse index", () => {
    it("byStatus is an object", () => {
      expect(typeof index.byStatus).toBe("object");
    });

    it("every byStatus entry is an array of extraction ids", () => {
      for (const [status, ids] of Object.entries(index.byStatus)) {
        expect(Array.isArray(ids), `byStatus[${status}]`).toBe(true);
      }
    });

    it("has completed status", () => {
      expect(index.byStatus["completed"]).toBeDefined();
    });
  });

  describe("coverage metrics", () => {
    it("totalTipsGenerated matches sum of all extraction tips", () => {
      const sum = Object.values(index.extractions).reduce((s, e) => s + e.tipsGenerated, 0);
      expect(index.totalTipsGenerated).toBe(sum);
    });

    it("all extractions have sources", () => {
      for (const ext of Object.values(index.extractions)) {
        expect(ext.source.length).toBeGreaterThan(0);
      }
    });
  });
});
