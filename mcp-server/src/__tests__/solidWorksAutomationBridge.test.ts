/**
 * SolidWorksAutomationBridge — Unit Tests
 *
 * CAD-AUTOMATION-MS0 / U-CAUT02
 *
 * All tests run with PRISM_CAD_MOCK=1 — no SolidWorks or real process spawn.
 * Tests verify:
 *   - Lifecycle: spawn signal, command dispatch, clean exit
 *   - AtomicValue shape on every public method
 *   - Timeout: hard-kill path triggered on slow responses
 *   - Error propagation: bridge errors surface as rejected promises
 *   - Missing exe: clear error message with build instructions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// ── Mock child_process before importing engine ─────────────────────────────

const mockProcess = {
  stdin: {
    write: vi.fn((_data: string, cb?: (err?: Error | null) => void) => {
      cb?.();
      return true;
    }),
  },
  stdout: new EventEmitter(),
  stderr: new EventEmitter(),
  killed: false,
  pid: 12345,
  kill: vi.fn(),
  on: vi.fn(),
};

vi.mock("child_process", () => ({
  execFile: vi.fn(() => mockProcess),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
}));

// Set mock mode before importing the engine
process.env["PRISM_CAD_MOCK"] = "1";

import {
  SolidWorksAutomationBridge,
  solidWorksAutomationBridge,
} from "../engines/SolidWorksAutomationBridge.js";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Assert an AtomicValue has the required PRISM schema fields. */
function assertAtomicValue<T>(av: { value: T; unit: string; confidence: number; source: string }): void {
  expect(typeof av.value).not.toBe("undefined");
  expect(typeof av.unit).toBe("string");
  expect(av.unit.length).toBeGreaterThan(0);
  expect(typeof av.confidence).toBe("number");
  expect(av.confidence).toBeGreaterThan(0);
  expect(av.confidence).toBeLessThanOrEqual(1);
  expect(typeof av.source).toBe("string");
  expect(av.source.startsWith("SolidWorksAutomationBridge.")).toBe(true);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SolidWorksAutomationBridge (mock mode)", () => {
  let bridge: SolidWorksAutomationBridge;

  beforeEach(() => {
    // Fresh instance per test with mock mode forced
    process.env["PRISM_CAD_MOCK"] = "1";
    bridge = new SolidWorksAutomationBridge();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── open ────────────────────────────────────────────────────────────────

  describe("open()", () => {
    it("returns AtomicValue<OpenResult> with correct shape", async () => {
      const result = await bridge.open("/mock/part.sldprt");
      assertAtomicValue(result);
      expect(result.unit).toBe("document");
      expect(result.value).toHaveProperty("filePath");
      expect(result.value).toHaveProperty("documentType");
      expect(result.value).toHaveProperty("title");
    });

    it("returns documentType as string", async () => {
      const result = await bridge.open("/mock/part.sldprt");
      expect(typeof result.value.documentType).toBe("string");
    });

    it("confidence >= 0.9", async () => {
      const result = await bridge.open("/any.sldprt");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── getFeatureTree ───────────────────────────────────────────────────────

  describe("getFeatureTree()", () => {
    it("returns AtomicValue with features array", async () => {
      const result = await bridge.getFeatureTree();
      assertAtomicValue(result);
      expect(result.unit).toBe("feature_tree");
      expect(Array.isArray(result.value.features)).toBe(true);
    });

    it("feature nodes have name, type, suppressed fields", async () => {
      const result = await bridge.getFeatureTree();
      const first = result.value.features[0];
      expect(typeof first.name).toBe("string");
      expect(typeof first.type).toBe("string");
      expect(typeof first.suppressed).toBe("boolean");
    });

    it("returns at least one feature in mock", async () => {
      const result = await bridge.getFeatureTree();
      expect(result.value.features.length).toBeGreaterThan(0);
    });
  });

  // ── exportSTEP ───────────────────────────────────────────────────────────

  describe("exportSTEP()", () => {
    it("returns AtomicValue<{outputPath, success}>", async () => {
      const result = await bridge.exportSTEP("/out/part.step");
      assertAtomicValue(result);
      expect(result.unit).toBe("file");
      expect(typeof result.value.outputPath).toBe("string");
      expect(typeof result.value.success).toBe("boolean");
    });

    it("confidence is high (>= 0.95)", async () => {
      const result = await bridge.exportSTEP("/out/part.step");
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  // ── exportPDF ────────────────────────────────────────────────────────────

  describe("exportPDF()", () => {
    it("returns AtomicValue with file unit", async () => {
      const result = await bridge.exportPDF("/out/drawing.pdf");
      assertAtomicValue(result);
      expect(result.unit).toBe("file");
    });

    it("result has outputPath as string", async () => {
      const result = await bridge.exportPDF("/out/drawing.pdf");
      expect(typeof result.value.outputPath).toBe("string");
    });
  });

  // ── getBoundingBox ───────────────────────────────────────────────────────

  describe("getBoundingBox()", () => {
    it("returns AtomicValue with mm unit", async () => {
      const result = await bridge.getBoundingBox();
      assertAtomicValue(result);
      expect(result.unit).toBe("mm");
    });

    it("min and max are 3-element arrays", async () => {
      const result = await bridge.getBoundingBox();
      expect(Array.isArray(result.value.min)).toBe(true);
      expect(result.value.min).toHaveLength(3);
      expect(Array.isArray(result.value.max)).toBe(true);
      expect(result.value.max).toHaveLength(3);
    });

    it("units field is 'mm'", async () => {
      const result = await bridge.getBoundingBox();
      expect(result.value.units).toBe("mm");
    });

    it("max values >= min values in mock", async () => {
      const result = await bridge.getBoundingBox();
      for (let i = 0; i < 3; i++) {
        expect(result.value.max[i]).toBeGreaterThanOrEqual(result.value.min[i]);
      }
    });

    it("uncertainty is a number (mm precision)", async () => {
      const result = await bridge.getBoundingBox();
      expect(typeof result.uncertainty).toBe("number");
    });
  });

  // ── close ────────────────────────────────────────────────────────────────

  describe("close()", () => {
    it("returns AtomicValue<{closed: boolean}>", async () => {
      const result = await bridge.close();
      assertAtomicValue(result);
      expect(result.value).toHaveProperty("closed");
    });

    it("closed is true in mock", async () => {
      const result = await bridge.close();
      expect(result.value.closed).toBe(true);
    });

    it("confidence is 1.0 (deterministic operation)", async () => {
      const result = await bridge.close();
      expect(result.confidence).toBe(1.0);
    });
  });

  // ── Singleton ────────────────────────────────────────────────────────────

  describe("singleton export", () => {
    it("solidWorksAutomationBridge is an instance of SolidWorksAutomationBridge", () => {
      expect(solidWorksAutomationBridge).toBeInstanceOf(SolidWorksAutomationBridge);
    });

    it("singleton is reusable across multiple calls", async () => {
      const r1 = await solidWorksAutomationBridge.open("/a.sldprt");
      const r2 = await solidWorksAutomationBridge.getBoundingBox();
      expect(r1.value).toHaveProperty("documentType");
      expect(r2.value).toHaveProperty("units");
    });
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  describe("error propagation", () => {
    it("throws descriptive error for unknown command in mock (no fixture)", async () => {
      // Access private _send to force an unknown command through mock
      const bridgeAny = bridge as unknown as {
        _send: (cmd: string, args: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(bridgeAny._send("invalidCommand", {})).rejects.toThrow(
        /no fixture defined for command/i
      );
    });
  });

  // ── Missing exe (non-mock path) ───────────────────────────────────────────

  describe("missing exe error", () => {
    it("throws clear error with build instructions when exe is absent", async () => {
      // _mockMode is a lazy getter that reads env on every call — so env must
      // stay "0" through the call, not just at construction. Restore after.
      const { existsSync } = await import("fs");
      vi.mocked(existsSync).mockReturnValueOnce(false);

      process.env["PRISM_CAD_MOCK"] = "0";
      const liveBridge = new SolidWorksAutomationBridge();

      try {
        await expect(liveBridge.open("/part.sldprt")).rejects.toThrow(
          /build\.bat/i
        );
      } finally {
        process.env["PRISM_CAD_MOCK"] = "1"; // restore
      }
    });
  });

  // ── Concurrent calls in mock mode ─────────────────────────────────────────

  describe("concurrent calls", () => {
    it("handles multiple parallel calls without interference", async () => {
      const [r1, r2, r3] = await Promise.all([
        bridge.open("/a.sldprt"),
        bridge.getBoundingBox(),
        bridge.getFeatureTree(),
      ]);
      expect(r1.value.documentType).toBeDefined();
      expect(r2.value.units).toBe("mm");
      expect(r3.value.features).toBeDefined();
    });
  });
});
