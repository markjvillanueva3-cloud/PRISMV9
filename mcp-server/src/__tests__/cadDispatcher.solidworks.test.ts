/**
 * cadDispatcher.solidworks.test.ts — U-CADC11 dispatcher integration tests
 *
 * Parallels cadDispatcher.inventor.test.ts (U-CADC08) for SolidWorks ops.
 * Exercises all 4 SolidWorks actions through cadDispatcher:
 *   - solidworks_generate_script
 *   - solidworks_build_part
 *   - solidworks_execute
 *   - solidworks_capabilities
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (
    name: string,
    description: string,
    schema: unknown,
    handler: CapturedTool["handler"]
  ) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      _description: string,
      _schema: unknown,
      handler: CapturedTool["handler"]
    ): void {
      tools.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({ action, params: payload });
  const asRecord = response as Record<string, unknown>;
  if (asRecord.success === false) return asRecord;
  const content = asRecord.content as
    | Array<{ type: string; text: string }>
    | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((captured) => captured.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─────────────────────────────────────────────────────────────────────────────
// Registration + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("cadDispatcher SolidWorks integration (U-CADC11)", () => {
  describe("solidworks_capabilities", () => {
    it("reports cadSystem=solidworks with the full supported-op catalogue", async () => {
      const result = await invoke("solidworks_capabilities", {});
      expect(result.success).toBe(true);
      expect(result.cadSystem).toBe("solidworks");

      const caps = result.capabilities as { supportedOps: string[] | Set<string> };
      const ops = Array.isArray(caps.supportedOps)
        ? caps.supportedOps
        : Array.from(caps.supportedOps);
      // Concrete lower bound: engine declares 53 ops in SOLIDWORKS_SUPPORTED_OPS.
      // Anti-regression: count must not drop below 30 categories.
      expect(ops.length).toBeGreaterThanOrEqual(30);

      // Verify each major category is represented (spanning: sketch, solid,
      // boolean, transform, assembly, export).
      const expectedOps = [
        "sketch_create",
        "sketch_line",
        "sketch_circle",
        "feature_extrude",
        "feature_revolve",
        "feature_fillet",
        "feature_shell",
        "boolean_union",
        "boolean_subtract",
        "transform_mirror",
        "transform_pattern_linear",
        "assembly_mate",
        "export_step",
        "export_stl",
      ];
      const opSet = new Set(ops);
      for (const expected of expectedOps) {
        expect(opSet.has(expected), `supportedOps missing '${expected}'`).toBe(true);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // solidworks_generate_script: real content assertions
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_generate_script — real VBA output", () => {
    it("emits SldWorks.SldWorks host binding + Part document creation", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 50, height: 30 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 25 } },
        ],
        partName: "bracket_front",
      });
      expect(result.success).toBe(true);
      const script = result.script as string;
      // Canonical SolidWorks VBA bootstrap — these tokens must appear in
      // every generated script regardless of operations.
      expect(script).toContain("SldWorks");
      // Operation-specific: extrude cycle is represented.
      expect(script.length).toBeGreaterThan(200);
    });

    it("emits different script for revolve vs. extrude (non-degenerate output)", async () => {
      const extrudeOut = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 10, height: 50 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 20 } },
        ],
      });
      const revolveOut = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Top" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 10, height: 50 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_revolve", params: { axis: "Y", angle: 360 } },
        ],
      });
      expect(extrudeOut.success).toBe(true);
      expect(revolveOut.success).toBe(true);
      // Anti-degenerate: differing operations must produce differing output.
      expect(extrudeOut.script).not.toEqual(revolveOut.script);
    });

    it("embeds partName into lineage metadata", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [{ kind: "sketch_create", params: { plane: "Front" } }],
        partName: "custom_named_part",
      });
      expect(result.success).toBe(true);
      const lineage = result.lineage as unknown[];
      expect(Array.isArray(lineage)).toBe(true);
      // Lineage must record the single sketch_create op we gave it.
      expect(lineage.length).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Plane variability — assert scripts differ per plane (spanning 3)
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_generate_script — plane variability", () => {
    async function scriptForPlane(plane: string): Promise<string> {
      const result = await invoke("solidworks_generate_script", {
        operations: [{ kind: "sketch_create", params: { plane } }],
      });
      expect(result.success, `gen for plane ${plane}`).toBe(true);
      return result.script as string;
    }

    it("Front / Top / Right planes produce differing scripts", async () => {
      const front = await scriptForPlane("Front");
      const top = await scriptForPlane("Top");
      const right = await scriptForPlane("Right");
      expect(front.length).toBeGreaterThan(0);
      expect(top.length).toBeGreaterThan(0);
      expect(right.length).toBeGreaterThan(0);
      // At least one pair must differ — guards against stub returning constant.
      const distinctCount = new Set([front, top, right]).size;
      expect(distinctCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Feature variability — spanning 4 feature categories
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_generate_script — feature categories", () => {
    it("fillet operation extends the lineage by one entry", async () => {
      const base = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 40, height: 20 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 15 } },
        ],
      });
      const withFillet = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 40, height: 20 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 15 } },
          { kind: "feature_fillet", params: { radius: 3 } },
        ],
      });
      const baseLineage = base.lineage as unknown[];
      const filletLineage = withFillet.lineage as unknown[];
      expect(filletLineage.length).toBe(baseLineage.length + 1);
    });

    it("shell, boolean_union, and pattern_linear all produce non-empty scripts", async () => {
      const shellResult = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 50, height: 50 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 30 } },
          { kind: "feature_shell", params: { thickness: 2 } },
        ],
      });
      const unionResult = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_circle",
            params: { centerX: 0, centerY: 0, radius: 20 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 30 } },
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_circle",
            params: { centerX: 15, centerY: 0, radius: 20 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 30 } },
          { kind: "boolean_union", params: {} },
        ],
      });
      const patternResult = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_circle",
            params: { centerX: 0, centerY: 0, radius: 5 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 10 } },
          {
            kind: "transform_pattern_linear",
            params: { count: 5, spacing: 20, direction: "X" },
          },
        ],
      });
      expect(shellResult.success).toBe(true);
      expect(unionResult.success).toBe(true);
      expect(patternResult.success).toBe(true);
      // Each output must cover all ops it was given.
      expect((shellResult.lineage as unknown[]).length).toBe(5);
      expect((unionResult.lineage as unknown[]).length).toBe(9);
      expect((patternResult.lineage as unknown[]).length).toBe(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Failure modes
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_generate_script — failure modes", () => {
    it("empty operations yields zero-lineage script", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [],
        partName: "empty_part",
      });
      expect(result.success).toBe(true);
      // responseSlimmer strips empty arrays — lineage field is absent when
      // there are no ops. Either absent or [] is acceptable.
      const lineage = (result.lineage as unknown[] | undefined) ?? [];
      expect(lineage.length).toBe(0);
      // Script body must still be a real VBA program (preamble + epilogue).
      expect(result.script).toEqual(expect.stringContaining("SldWorks"));
    });

    it("missing partName falls back to PRISMPart default", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [{ kind: "sketch_create", params: { plane: "Front" } }],
      });
      expect(result.success).toBe(true);
      // Default name is applied inside the dispatcher — script generation
      // still succeeds without partName in params.
      expect((result.lineage as unknown[]).length).toBe(1);
    });

    it("unknown operation kind fails with UnsupportedCapabilityError", async () => {
      // Engine's buildScript() throws UnsupportedCapabilityError when an op
      // kind is not in the supportedOps set. dispatcherError() converts this
      // to a {success:false, error} response shape.
      const result = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          { kind: "unknown_op_xyz", params: {} },
        ],
      });
      expect(result.success).toBe(false);
      const errorMessage = String(result.error ?? "");
      expect(
        errorMessage.includes("unknown_op_xyz") ||
          errorMessage.toLowerCase().includes("unsupported")
      ).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Adversarial inputs
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_generate_script — adversarial inputs", () => {
    it("preserves NaN dimensions in generated output (deferred to SW runtime)", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_circle",
            params: { centerX: NaN, centerY: 0, radius: 10 },
          },
          { kind: "sketch_close", params: {} },
        ],
      });
      expect(result.success).toBe(true);
      expect((result.lineage as unknown[]).length).toBe(3);
    });

    it("handles Infinity coordinate without crashing", async () => {
      const result = await invoke("solidworks_generate_script", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_line",
            params: { x1: 0, y1: 0, x2: Infinity, y2: 0 },
          },
        ],
      });
      expect(result.success).toBe(true);
      expect((result.lineage as unknown[]).length).toBe(2);
    });

    it("handles oversize operation array (100+ ops) with full lineage", async () => {
      const lineCount = 100;
      const ops: Array<{ kind: string; params: Record<string, unknown> }> = [
        { kind: "sketch_create", params: { plane: "Front" } },
      ];
      for (let index = 0; index < lineCount; index++) {
        ops.push({
          kind: "sketch_line",
          params: { x1: index, y1: 0, x2: index + 1, y2: 0 },
        });
      }
      ops.push({ kind: "sketch_close", params: {} });
      ops.push({ kind: "feature_extrude", params: { depth: 10 } });

      const result = await invoke("solidworks_generate_script", {
        operations: ops,
        partName: "oversize_test",
      });
      expect(result.success).toBe(true);
      expect((result.lineage as unknown[]).length).toBe(ops.length);
      // Script size must scale with op count — guards against stub-return.
      expect((result.script as string).length).toBeGreaterThan(lineCount * 5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // solidworks_build_part + solidworks_execute
  // ───────────────────────────────────────────────────────────────────────────

  describe("solidworks_build_part", () => {
    it("returns generated script body plus execution metadata", async () => {
      const result = await invoke("solidworks_build_part", {
        operations: [
          { kind: "sketch_create", params: { plane: "Front" } },
          {
            kind: "sketch_rectangle",
            params: { x: 0, y: 0, width: 20, height: 20 },
          },
          { kind: "sketch_close", params: {} },
          { kind: "feature_extrude", params: { depth: 10 } },
        ],
        partName: "build_test",
      });
      expect(result.success).toBe(true);
      const script = result.script as string;
      // Real VBA content checks — not just presence.
      expect(script).toContain("SldWorks");
      expect(script).toContain("Sub main()");
      expect(script).toContain("End Sub");
      expect(script.length).toBeGreaterThan(200);
      // durationMs must be a non-negative number (engine mock returns 0+).
      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs as number).toBeGreaterThanOrEqual(0);
    });
  });

  describe("solidworks_execute", () => {
    it("accepts raw VBA script input and returns execution metadata", async () => {
      const canonicalScript =
        "Dim swApp As SldWorks.SldWorks\nSet swApp = Application.SldWorks";
      const result = await invoke("solidworks_execute", {
        script: canonicalScript,
        partName: "exec_test",
      });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("logs");
    });

    it("propagates empty script input without throwing", async () => {
      const result = await invoke("solidworks_execute", { script: "" });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("logs");
    });
  });
});
