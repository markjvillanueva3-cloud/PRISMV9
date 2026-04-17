/**
 * Tests for build-dispatcher-graph-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildDispatcherGraphIndex,
  readDispatcherGraphIndex,
  DispatcherGraphIndex,
} from "../../scripts/build-dispatcher-graph-index.js";

describe("build-dispatcher-graph-index (Phase 0.7)", () => {
  let index: DispatcherGraphIndex;

  beforeAll(async () => {
    const existing = await readDispatcherGraphIndex();
    if (existing && existing.dispatcherCount > 50) {
      index = existing;
    } else {
      index = await buildDispatcherGraphIndex();
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

    it("has dispatcherCount matching dispatchers object keys", () => {
      expect(index.dispatcherCount).toBe(Object.keys(index.dispatchers).length);
    });

    it("indexes at least 50 dispatchers", () => {
      expect(index.dispatcherCount).toBeGreaterThan(50);
    });

    it("has totalActions field", () => {
      expect(typeof index.totalActions).toBe("number");
      expect(index.totalActions).toBeGreaterThan(0);
    });
  });

  describe("dispatcher node structure", () => {
    it("every dispatcher has required fields", () => {
      for (const [name, node] of Object.entries(index.dispatchers)) {
        expect(typeof node.name, `${name}.name`).toBe("string");
        expect(typeof node.file, `${name}.file`).toBe("string");
        expect(Array.isArray(node.actions), `${name}.actions`).toBe(true);
        expect(Array.isArray(node.enginesCalled), `${name}.enginesCalled`).toBe(true);
        expect(Array.isArray(node.importsFrom), `${name}.importsFrom`).toBe(true);
        expect(typeof node.lineCount, `${name}.lineCount`).toBe("number");
        expect(typeof node.sha256, `${name}.sha256`).toBe("string");
      }
    });

    it("sha256 is a valid hex string", () => {
      for (const node of Object.values(index.dispatchers)) {
        expect(node.sha256).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("file ends with .ts", () => {
      for (const node of Object.values(index.dispatchers)) {
        expect(node.file).toMatch(/\.ts$/);
      }
    });

    it("lineCount is positive", () => {
      for (const node of Object.values(index.dispatchers)) {
        expect(node.lineCount).toBeGreaterThan(0);
      }
    });
  });

  describe("byEngine reverse index", () => {
    it("byEngine is an object", () => {
      expect(typeof index.byEngine).toBe("object");
    });

    it("every byEngine entry is an array of dispatcher names", () => {
      for (const [engine, dispatchers] of Object.entries(index.byEngine)) {
        expect(Array.isArray(dispatchers), `byEngine[${engine}]`).toBe(true);
        for (const name of dispatchers) {
          expect(typeof name).toBe("string");
          expect(index.dispatchers[name]).toBeDefined();
        }
      }
    });

    it("maps many engines to dispatchers", () => {
      expect(Object.keys(index.byEngine).length).toBeGreaterThan(100);
    });
  });

  describe("byAction reverse index", () => {
    it("byAction is an object", () => {
      expect(typeof index.byAction).toBe("object");
    });

    it("every byAction entry is a dispatcher name", () => {
      for (const [action, dispatcher] of Object.entries(index.byAction)) {
        expect(typeof dispatcher, `byAction[${action}]`).toBe("string");
      }
    });

    it("maps many actions", () => {
      expect(Object.keys(index.byAction).length).toBeGreaterThan(1000);
    });
  });

  describe("known dispatchers", () => {
    it("calcDispatcher exists and has many actions", () => {
      const calc = index.dispatchers["calcDispatcher"];
      expect(calc).toBeDefined();
      expect(calc.actions.length).toBeGreaterThan(100);
    });

    it("edmDispatcher exists and has WEDM actions", () => {
      const edm = index.dispatchers["edmDispatcher"];
      expect(edm).toBeDefined();
      expect(edm.actions.length).toBeGreaterThan(50);
    });

    it("ppDispatcher exists and has many engines", () => {
      const pp = index.dispatchers["ppDispatcher"];
      expect(pp).toBeDefined();
      expect(pp.enginesCalled.length).toBeGreaterThan(50);
    });
  });

  describe("coverage metrics", () => {
    it("total actions matches sum of dispatcher actions", () => {
      const sum = Object.values(index.dispatchers).reduce((s, d) => s + d.actions.length, 0);
      expect(index.totalActions).toBe(sum);
    });

    it("most dispatchers have some actions", () => {
      const withActions = Object.values(index.dispatchers).filter((d) => d.actions.length > 0).length;
      expect(withActions).toBeGreaterThan(index.dispatcherCount * 0.8);
    });
  });
});
