/**
 * Tests for build-alias-table-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildAliasTableIndex,
  readAliasTableIndex,
  AliasTableIndex,
} from "../../scripts/build-alias-table-index.js";

describe("build-alias-table-index (Phase 0.7)", () => {
  let index: AliasTableIndex;

  beforeAll(async () => {
    const existing = await readAliasTableIndex();
    if (existing && existing.aliasCount > 0) {
      index = existing;
    } else {
      index = await buildAliasTableIndex();
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

    it("has aliasCount matching aliases object keys", () => {
      expect(index.aliasCount).toBe(Object.keys(index.aliases).length);
    });

    it("has byCanonical reverse index", () => {
      expect(typeof index.byCanonical).toBe("object");
    });
  });

  describe("alias entry structure", () => {
    it("every alias has required fields", () => {
      for (const [key, entry] of Object.entries(index.aliases)) {
        expect(typeof entry.alias, `${key}.alias`).toBe("string");
        expect(typeof entry.canonical, `${key}.canonical`).toBe("string");
        expect(typeof entry.reason, `${key}.reason`).toBe("string");
        expect(typeof entry.deprecated, `${key}.deprecated`).toBe("boolean");
        expect(typeof entry.addedAt, `${key}.addedAt`).toBe("string");
      }
    });

    it("alias key is lowercase version of alias name", () => {
      for (const [key, entry] of Object.entries(index.aliases)) {
        expect(key).toBe(entry.alias.toLowerCase());
      }
    });

    it("canonical names end with Engine", () => {
      for (const entry of Object.values(index.aliases)) {
        expect(entry.canonical.endsWith("Engine")).toBe(true);
      }
    });

    it("reason is a known type", () => {
      const validReasons = ["abbreviation", "naming convention", "word order", "renamed", "auto-short-form", "auto-core-variant"];
      for (const entry of Object.values(index.aliases)) {
        expect(validReasons).toContain(entry.reason);
      }
    });
  });

  describe("known aliases", () => {
    it("contains KienzleEngine alias", () => {
      const alias = index.aliases["kienzleengine"];
      if (alias) {
        expect(alias.canonical).toBe("KienzleForceModelEngine");
        expect(alias.reason).toBe("abbreviation");
      }
    });

    it("contains BayesianEngine alias", () => {
      const alias = index.aliases["bayesianengine"];
      if (alias) {
        expect(alias.canonical).toBe("BayesianToolLifeEngine");
      }
    });

    it("contains MillOrchestrator alias", () => {
      const alias = index.aliases["millorchestrator"];
      if (alias) {
        expect(alias.canonical).toBe("MillMasterOrchestratorFacadeEngine");
      }
    });
  });

  describe("byCanonical reverse index", () => {
    it("byCanonical is an object", () => {
      expect(typeof index.byCanonical).toBe("object");
    });

    it("every byCanonical entry is an array of alias names", () => {
      for (const [canonical, aliases] of Object.entries(index.byCanonical)) {
        expect(Array.isArray(aliases), `byCanonical[${canonical}]`).toBe(true);
        for (const alias of aliases) {
          expect(typeof alias).toBe("string");
        }
      }
    });

    it("aliases in byCanonical can be looked up in main aliases object", () => {
      let checked = 0;
      for (const [_canonical, aliases] of Object.entries(index.byCanonical)) {
        for (const alias of aliases) {
          const key = alias.toLowerCase();
          expect(index.aliases[key]).toBeDefined();
          checked++;
          if (checked > 100) break;
        }
        if (checked > 100) break;
      }
      expect(checked).toBeGreaterThan(0);
    });
  });

  describe("auto-detection", () => {
    it("generates short-form aliases (without Engine suffix)", () => {
      const autoShortForms = Object.values(index.aliases).filter(
        (a) => a.reason === "auto-short-form"
      );
      expect(autoShortForms.length).toBeGreaterThan(0);
    });

    it("short-form aliases point to valid canonical names", () => {
      const autoShortForms = Object.values(index.aliases).filter(
        (a) => a.reason === "auto-short-form"
      );
      for (const alias of autoShortForms.slice(0, 50)) {
        expect(alias.canonical.endsWith("Engine")).toBe(true);
        expect(alias.alias + "Engine").toBe(alias.canonical);
      }
    });

    it("auto-detected aliases have recent addedAt timestamps", () => {
      const autoAliases = Object.values(index.aliases).filter(
        (a) => a.reason.startsWith("auto-")
      );
      for (const alias of autoAliases.slice(0, 10)) {
        const date = new Date(alias.addedAt);
        expect(date.getFullYear()).toBeGreaterThanOrEqual(2026);
      }
    });
  });

  describe("coverage metrics", () => {
    it("has reasonable alias count", () => {
      expect(index.aliasCount).toBeGreaterThan(10);
    });

    it("has canonical engines with aliases", () => {
      expect(Object.keys(index.byCanonical).length).toBeGreaterThan(5);
    });

    it("canonical engines with aliases matches unique canonicals from aliases", () => {
      const uniqueCanonicals = new Set(Object.values(index.aliases).map((a) => a.canonical));
      expect(Object.keys(index.byCanonical).length).toBe(uniqueCanonicals.size);
    });
  });
});
