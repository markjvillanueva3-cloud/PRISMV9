/**
 * Tests for build-tribal-tip-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildTribalTipIndex,
  readTribalTipIndex,
  TribalTipIndex,
} from "../../scripts/build-tribal-tip-index.js";

describe("build-tribal-tip-index (Phase 0.7)", () => {
  let index: TribalTipIndex;

  beforeAll(async () => {
    const existing = await readTribalTipIndex();
    if (existing && existing.tipCount > 0) {
      index = existing;
    } else {
      index = await buildTribalTipIndex();
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

    it("has tipCount matching tips object keys", () => {
      expect(index.tipCount).toBe(Object.keys(index.tips).length);
    });
  });

  describe("tip entry structure", () => {
    it("every tip has required fields", () => {
      for (const [id, tip] of Object.entries(index.tips)) {
        expect(typeof tip.id, `${id}.id`).toBe("string");
        expect(typeof tip.content, `${id}.content`).toBe("string");
        expect(typeof tip.domain, `${id}.domain`).toBe("string");
        expect(typeof tip.source, `${id}.source`).toBe("string");
        expect(Array.isArray(tip.keywords), `${id}.keywords`).toBe(true);
        expect(typeof tip.confidence, `${id}.confidence`).toBe("number");
        expect(typeof tip.sha256, `${id}.sha256`).toBe("string");
      }
    });

    it("sha256 is a valid hex string", () => {
      for (const tip of Object.values(index.tips)) {
        expect(tip.sha256).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("confidence is between 0 and 1", () => {
      for (const tip of Object.values(index.tips)) {
        expect(tip.confidence).toBeGreaterThanOrEqual(0);
        expect(tip.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("content is not empty", () => {
      for (const tip of Object.values(index.tips)) {
        expect(tip.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe("byDomain reverse index", () => {
    it("byDomain is an object", () => {
      expect(typeof index.byDomain).toBe("object");
    });

    it("every byDomain entry is an array of tip ids", () => {
      for (const [domain, tips] of Object.entries(index.byDomain)) {
        expect(Array.isArray(tips), `byDomain[${domain}]`).toBe(true);
        for (const id of tips) {
          expect(typeof id).toBe("string");
        }
      }
    });
  });

  describe("byKeyword reverse index", () => {
    it("byKeyword is an object", () => {
      expect(typeof index.byKeyword).toBe("object");
    });

    it("every byKeyword entry is an array of tip ids", () => {
      for (const [kw, tips] of Object.entries(index.byKeyword)) {
        expect(Array.isArray(tips), `byKeyword[${kw}]`).toBe(true);
      }
    });
  });

  describe("coverage metrics", () => {
    it("indexes zero or more tips", () => {
      expect(index.tipCount).toBeGreaterThanOrEqual(0);
    });

    it("all tips have domains", () => {
      for (const tip of Object.values(index.tips)) {
        expect(tip.domain).toBeDefined();
        expect(tip.domain.length).toBeGreaterThan(0);
      }
    });

    it("all tips have sources", () => {
      for (const tip of Object.values(index.tips)) {
        expect(tip.source).toBeDefined();
        expect(tip.source.length).toBeGreaterThan(0);
      }
    });
  });
});
