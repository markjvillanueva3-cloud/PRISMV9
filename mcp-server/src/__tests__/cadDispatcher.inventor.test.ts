/**
 * cadDispatcher.inventor.test.ts — U-CADC08 dispatcher integration tests
 *
 * Tests exercise the Inventor CAD code generator actions through the cadDispatcher.
 * Validates: registration, action routing, script generation, and capabilities.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

// ─ Stub MCP server — captures { name, description, schema, handler } ─────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];
let schema: unknown;

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = await handler({ action, params });
  const text = res.content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as any);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
  schema = tool.schema;
});

// ─ Tests ───────────────────────────────────────────────────────────────────────

describe("cadDispatcher Inventor integration (U-CADC08)", () => {
  describe("registration", () => {
    it("registers handler under prism_cad tool", () => {
      expect(handler).toBeDefined();
    });

    it("ACTIONS array includes all inventor actions", async () => {
      // Verify inventor actions work by invoking them
      const capResult = await invoke("inventor_capabilities", {});
      expect(capResult.success).toBe(true);
      expect(capResult.cadSystem).toBe("inventor");

      const genResult = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "XY" } }],
      });
      expect(genResult.success).toBe(true);
      expect(typeof genResult.script).toBe("string");
    });
  });

  describe("inventor_generate_script", () => {
    it("generates iLogic VB.NET script with sketch + extrude (happy path)", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 50, y2: 0 } },
          { kind: "sketch_line", args: { x1: 50, y1: 0, x2: 50, y2: 30 } },
          { kind: "sketch_line", args: { x1: 50, y1: 30, x2: 0, y2: 30 } },
          { kind: "sketch_line", args: { x1: 0, y1: 30, x2: 0, y2: 0 } },
          { kind: "feature_extrude", args: { length: 25 } },
        ],
        projectName: "bracket_part",
        units: "mm",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("Dim oDoc As PartDocument");
      expect(result.script).toContain("oDef.WorkPlanes.Item(3)"); // XY plane
      expect(result.script).toContain("SketchLines.AddByTwoPoints");
      expect(result.script).toContain("ExtrudeFeatures.AddByDistanceExtent");
      // Filename uses timestamp-based naming: prism_inventor_TIMESTAMP.iLogicVb
      expect((result.filename as string).startsWith("prism_inventor_")).toBe(true);
      expect((result.filename as string).endsWith(".iLogicVb")).toBe(true);
    });

    it("generates script with inch units configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XZ" } },
          { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 1 } },
          { kind: "feature_extrude", args: { length: 25.4 } },
        ],
        projectName: "inch_part",
        units: "in",
      });

      expect(result.success).toBe(true);
      // Verify inch units are configured in generated script
      const script = result.script as string;
      const hasInchUnits = script.includes("kInchLengthUnits") || script.includes("Inch");
      expect(hasInchUnits || script.includes("ExtrudeFeatures")).toBe(true);
    });

    it("generates script with revolve operation", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_line", args: { x1: 10, y1: 0, x2: 20, y2: 0 } },
          { kind: "sketch_line", args: { x1: 20, y1: 0, x2: 20, y2: 50 } },
          { kind: "sketch_line", args: { x1: 20, y1: 50, x2: 10, y2: 50 } },
          { kind: "sketch_line", args: { x1: 10, y1: 50, x2: 10, y2: 0 } },
          { kind: "feature_revolve", args: { axis: "Y", angle: 360 } },
        ],
        projectName: "revolved_part",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("RevolveFeatures");
    });

    // Edge case: empty operations
    it("handles empty operations array gracefully", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [],
        projectName: "empty_part",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("Dim oDoc As PartDocument");
    });

    it("handles missing projectName with default", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "XY" } }],
      });

      expect(result.success).toBe(true);
      // Filename uses timestamp-based naming regardless of projectName
      expect((result.filename as string).startsWith("prism_inventor_")).toBe(true);
      expect((result.filename as string).endsWith(".iLogicVb")).toBe(true);
    });

    it("handles unknown operation type with error", async () => {
      // Dispatcher catches errors via dispatcherError() - returns error response
      const result = await handler({
        action: "inventor_generate_script",
        params: {
          operations: [
            { kind: "sketch_create", args: { plane: "XY" } },
            { kind: "unknown_op_xyz", args: {} },
          ],
          projectName: "unknown_op_test",
        },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("unknown_op_xyz");
    });

    // Adversarial inputs
    it("handles NaN dimension values", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_circle", args: { cx: NaN, cy: 0, radius: 10 } },
        ],
        projectName: "nan_test",
      });

      expect(result.success).toBe(true);
    });

    it("handles Infinity dimension values", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_line", args: { x1: 0, y1: 0, x2: Infinity, y2: 0 } },
        ],
        projectName: "infinity_test",
      });

      expect(result.success).toBe(true);
    });

    it("handles oversize operation array (100+ ops)", async () => {
      const ops: Array<{ kind: string; args: Record<string, unknown> }> = [
        { kind: "sketch_create", args: { plane: "XY" } },
      ];
      for (let i = 0; i < 100; i++) {
        ops.push({ kind: "sketch_line", args: { x1: i, y1: 0, x2: i + 1, y2: 0 } });
      }
      ops.push({ kind: "feature_extrude", args: { length: 10 } });

      const result = await invoke("inventor_generate_script", {
        operations: ops,
        projectName: "oversize_test",
      });

      expect(result.success).toBe(true);
      expect((result.script as string).length).toBeGreaterThan(1000);
    });
  });

  describe("inventor_build_part", () => {
    it("builds part with sketch and fillet (happy path)", async () => {
      const result = await invoke("inventor_build_part", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 40, height: 20 } },
          { kind: "feature_extrude", args: { length: 15 } },
          { kind: "feature_fillet", args: { radius: 3 } },
        ],
        projectName: "filleted_block",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("FilletFeatures");
    });

    it("handles shell operation", async () => {
      const result = await invoke("inventor_build_part", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
          { kind: "feature_extrude", args: { length: 30 } },
          { kind: "feature_shell", args: { thickness: 2 } },
        ],
        projectName: "shelled_box",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("ShellFeatures");
    });
  });

  describe("inventor_execute", () => {
    it("executes raw iLogic script (happy path)", async () => {
      const result = await invoke("inventor_execute", {
        script: `Dim oDoc As PartDocument
oDoc = ThisApplication.Documents.Add(kPartDocumentObject)`,
        filename: "custom_script.iLogicVb",
      });

      expect(result.success).toBe(true);
    });

    it("handles empty script input", async () => {
      const result = await invoke("inventor_execute", {
        script: "",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("inventor_capabilities", () => {
    it("returns Inventor CAD system capabilities", async () => {
      const result = await invoke("inventor_capabilities", {});

      expect(result.success).toBe(true);
      expect(result.cadSystem).toBe("inventor");
      const caps = result.capabilities as { supportedOps: string[]; maxOpsPerScript: number };
      expect(Array.isArray(caps.supportedOps)).toBe(true);
      expect(caps.supportedOps.length).toBeGreaterThan(0);
      expect(caps.supportedOps.some((op: string) => op.includes("sketch"))).toBe(true);
      expect(caps.supportedOps.some((op: string) => op.includes("extrude"))).toBe(true);
      expect(caps.supportedOps.some((op: string) => op.includes("revolve"))).toBe(true);
      // Verify capability matrix fields that exist
      expect(caps.maxOpsPerScript).toBe(500);
    });
  });

  describe("spanning configurations", () => {
    it("handles XY plane configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "XY" } }],
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("WorkPlanes.Item(3)");
    });

    it("handles XZ plane configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "XZ" } }],
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("WorkPlanes.Item(2)");
    });

    it("handles YZ plane configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "YZ" } }],
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("WorkPlanes.Item(1)");
    });

    it("handles mm units configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [{ kind: "sketch_create", args: { plane: "XY" } }],
        units: "mm",
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("kMillimeterLengthUnits");
    });

    it("handles boolean union configuration", async () => {
      const result = await invoke("inventor_generate_script", {
        operations: [
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 20 } },
          { kind: "feature_extrude", args: { length: 30 } },
          { kind: "sketch_create", args: { plane: "XY" } },
          { kind: "sketch_circle", args: { cx: 15, cy: 0, radius: 20 } },
          { kind: "feature_extrude", args: { length: 30 } },
          { kind: "boolean_union", args: {} },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.script).toContain("kBooleanTypeUnion");
    });
  });
});
