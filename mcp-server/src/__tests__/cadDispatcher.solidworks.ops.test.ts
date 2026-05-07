/**
 * cadDispatcher.solidworks.ops.test.ts — U-CADC12
 *
 * Coverage for 24 previously-stubbed SolidWorks ops now emitting real VBA.
 * Invokes through cadDispatcher for end-to-end wiring check.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _description, _schema, handler): void {
      tools.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function gen(
  operations: Array<{ kind: string; params: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({
    action: "solidworks_generate_script",
    params: { operations, partName: "u_cadc12_test" },
  });
  const asRecord = response as Record<string, unknown>;
  if (asRecord.success === false) {
    throw new Error(`dispatcher error: ${String(asRecord.error)}`);
  }
  const content = asRecord.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  return JSON.parse(text) as Record<string, unknown>;
}

function warningMessages(result: Record<string, unknown>): string[] {
  const warnings = (result.warnings as Array<string | { message: string }> | undefined) ?? [];
  return warnings.map((w) => (typeof w === "string" ? w : w.message));
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((captured) => captured.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─────────────────────────────────────────────────────────────────────────────
// Sketch additions (2)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · sketch_ellipse", () => {
  it("emits CreateEllipse with mm→m conversion on major/minor points", async () => {
    const result = await gen([
      { kind: "sketch_create", params: { plane: "Front" } },
      { kind: "sketch_ellipse", params: { centerX: 10, centerY: 5, radiusX: 20, radiusY: 8 } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("swSketchMgr.CreateEllipse");
    expect(script).toContain("30 / 1000.0"); // cx+rx = 30mm
    expect(script).toContain("13 / 1000.0"); // cy+ry = 13mm
  });

  it("applies defaults when radii omitted", async () => {
    const result = await gen([
      { kind: "sketch_create", params: { plane: "Front" } },
      { kind: "sketch_ellipse", params: {} },
    ]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("CreateEllipse");
  });
});

describe("U-CADC12 · sketch_slot", () => {
  it("emits 2 lines + 2 arcs for a horizontal slot", async () => {
    const result = await gen([
      { kind: "sketch_create", params: { plane: "Front" } },
      { kind: "sketch_slot", params: { centerX: 0, centerY: 0, length: 20, width: 5 } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    const lineCount = (script.match(/swSketchMgr\.CreateLine/g) ?? []).length;
    const arcCount = (script.match(/swSketchMgr\.CreateArc/g) ?? []).length;
    expect(lineCount).toBe(2);
    expect(arcCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature additions (2)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · feature_rib", () => {
  it("emits InsertRib with mm→m thickness", async () => {
    const result = await gen([
      { kind: "feature_rib", params: { thickness: 4, twoSided: true } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("swFeatureMgr.InsertRib");
    expect(script).toContain("0.004"); // 4mm = 0.004m
    expect(script).toContain("True");
  });

  it("default 3mm thickness when omitted", async () => {
    const result = await gen([{ kind: "feature_rib", params: {} }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("0.003");
  });
});

describe("U-CADC12 · feature_thread", () => {
  it("emits InsertThreadFeature with ISO metric defaults", async () => {
    const result = await gen([
      { kind: "feature_thread", params: { majorDiameter: 10, pitch: 1.5, length: 20 } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("InsertThreadFeature");
    expect(script).toContain('"10.0"');
    expect(script).toContain("1.5 / 1000.0");
    expect(script).toContain("20 / 1000.0");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Surface additions (6)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · surface ops", () => {
  it("surface_ruled emits InsertRuledSurface with deg→rad conversion", async () => {
    const result = await gen([{ kind: "surface_ruled", params: { distance: 10, draftAngle: 5 } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("InsertRuledSurface");
    expect(script).toContain("0.01"); // 10mm
    expect(script).toMatch(/0\.08726[0-9]+/); // 5° in radians
  });

  it("surface_loft emits InsertProtrusionBlend2", async () => {
    const result = await gen([{ kind: "surface_loft", params: {} }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("InsertProtrusionBlend2");
  });

  it("surface_sweep emits InsertProtrusionSwept4", async () => {
    const result = await gen([{ kind: "surface_sweep", params: {} }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("InsertProtrusionSwept4");
  });

  it("surface_fill emits InsertFillSurface", async () => {
    const result = await gen([{ kind: "surface_fill", params: {} }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("InsertFillSurface");
  });

  it("surface_offset emits InsertOffsetSurface with distance", async () => {
    const result = await gen([{ kind: "surface_offset", params: { distance: 2.5 } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("InsertOffsetSurface");
    expect(script).toContain("0.0025");
  });

  it("surface_trim emits InsertMutualTrimSurface", async () => {
    const result = await gen([{ kind: "surface_trim", params: {} }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("InsertMutualTrimSurface");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transform addition (1)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · transform_scale", () => {
  it("emits InsertScale with uniform XYZ factor", async () => {
    const result = await gen([{ kind: "transform_scale", params: { factor: 2.5 } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("InsertScale");
    const count = (script.match(/2\.5/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Assembly additions (3)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · assembly_insert_component", () => {
  it("emits AddComponent5 with path + position (mm→m)", async () => {
    const result = await gen([
      {
        kind: "assembly_insert_component",
        params: { path: "C:\\parts\\boss.sldprt", x: 100, y: 50, z: 0 },
      },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("AddComponent5");
    expect(script).toContain("C:\\\\parts\\\\boss.sldprt");
    expect(script).toContain("0.1"); // 100mm = 0.1m
    expect(script).toContain("0.05"); // 50mm = 0.05m
  });

  it("warns when path is missing", async () => {
    const result = await gen([{ kind: "assembly_insert_component", params: {} }]);
    expect(result.success).toBe(true);
    expect(warningMessages(result).some((m) => m.includes("path"))).toBe(true);
  });
});

describe("U-CADC12 · assembly_mate", () => {
  it("emits AddMate5 with coincident enum (0)", async () => {
    const result = await gen([{ kind: "assembly_mate", params: { type: "coincident" } }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toMatch(/AddMate5\(0,/);
  });

  it("supports concentric/tangent/distance/angle enums", async () => {
    const mateEnums: Array<[string, number]> = [
      ["concentric", 1],
      ["tangent", 4],
      ["distance", 5],
      ["angle", 6],
    ];
    for (const [mateName, mateEnum] of mateEnums) {
      const result = await gen([
        { kind: "assembly_mate", params: { type: mateName, distance: 10, angle: 45 } },
      ]);
      expect(result.success, `mate ${mateName}`).toBe(true);
      const pattern = new RegExp(`AddMate5\\(${mateEnum},`);
      expect(pattern.test(result.script as string), `mate ${mateName} → enum ${mateEnum}`).toBe(true);
    }
  });

  it("angle mate converts degrees to radians", async () => {
    const result = await gen([
      { kind: "assembly_mate", params: { type: "angle", angle: 90 } },
    ]);
    expect(result.success).toBe(true);
    expect(result.script as string).toMatch(/1\.5707[0-9]+/); // π/2
  });

  it("warns on unknown mate type", async () => {
    const result = await gen([{ kind: "assembly_mate", params: { type: "teleport" } }]);
    expect(result.success).toBe(true);
    expect(warningMessages(result).some((m) => m.includes("teleport"))).toBe(true);
  });
});

describe("U-CADC12 · assembly_pattern", () => {
  it("emits FeatureLinearPattern3 with count + spacing", async () => {
    const result = await gen([{ kind: "assembly_pattern", params: { count: 5, spacing: 30 } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("FeatureLinearPattern3");
    expect(script).toContain("(5,");
    expect(script).toContain("0.03"); // 30mm
  });

  it("clamps count below minimum 2 (boundary)", async () => {
    const result = await gen([{ kind: "assembly_pattern", params: { count: 1, spacing: 25 } }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("FeatureLinearPattern3(2,");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Drawing additions (3)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · drawing_view", () => {
  it("defaults to Front orientation", async () => {
    const result = await gen([
      { kind: "drawing_view", params: { x: 0.1, y: 0.1, sourceDoc: "C:\\bracket.sldprt" } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("CreateDrawViewFromModelView3");
    expect(script).toContain('"*Front"');
  });

  it("supports 7 non-default orientations", async () => {
    const variants = ["top", "bottom", "left", "right", "back", "isometric", "trimetric"];
    for (const orientation of variants) {
      const result = await gen([
        { kind: "drawing_view", params: { orientation, sourceDoc: "x.sldprt" } },
      ]);
      expect(result.success, `orientation ${orientation}`).toBe(true);
      const expected = `*${orientation.charAt(0).toUpperCase()}${orientation.slice(1)}`;
      expect((result.script as string).includes(`"${expected}"`), `${orientation}→${expected}`).toBe(true);
    }
  });

  it("unknown orientation falls back to Front", async () => {
    const result = await gen([
      { kind: "drawing_view", params: { orientation: "diagonal", sourceDoc: "x.sldprt" } },
    ]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain('"*Front"');
  });
});

describe("U-CADC12 · drawing_dimension", () => {
  it("emits AddDimension2 at anchor", async () => {
    const result = await gen([{ kind: "drawing_dimension", params: { x: 0.12, y: 0.08 } }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("AddDimension2(0.12, 0.08, 0)");
  });
});

describe("U-CADC12 · drawing_annotation", () => {
  it("emits InsertNote + SetPosition2 with VBA double-quote escaping", async () => {
    const result = await gen([
      { kind: "drawing_annotation", params: { text: 'ISO 9001 "certified"', x: 0.2, y: 0.15 } },
    ]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("InsertNote");
    expect(script).toContain('""certified""');
    expect(script).toContain("SetPosition2 0.2, 0.15, 0");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export + Import (4)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · export_dxf", () => {
  it("emits SaveAs3 for DXF", async () => {
    const result = await gen([{ kind: "export_dxf", params: { path: "D:\\out\\drawing.dxf" } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("swModel.SaveAs3");
    expect(script).toContain("D:\\\\out\\\\drawing.dxf");
  });
});

describe("U-CADC12 · import_step / iges / dxf", () => {
  it("import_step uses OpenDoc6 part doctype (1)", async () => {
    const result = await gen([{ kind: "import_step", params: { path: "C:\\in\\housing.step" } }]);
    expect(result.success).toBe(true);
    const script = result.script as string;
    expect(script).toContain("swApp.OpenDoc6");
    expect(script).toContain("C:\\\\in\\\\housing.step");
    expect(script).toMatch(/OpenDoc6\([^,]+, 1,/);
  });

  it("import_iges uses part doctype (1)", async () => {
    const result = await gen([{ kind: "import_iges", params: { path: "C:\\in\\part.igs" } }]);
    expect(result.success).toBe(true);
    expect((result.script as string)).toMatch(/OpenDoc6\([^,]+, 1,/);
  });

  it("import_dxf uses drawing doctype (3)", async () => {
    const result = await gen([{ kind: "import_dxf", params: { path: "C:\\in\\plan.dxf" } }]);
    expect(result.success).toBe(true);
    expect((result.script as string)).toMatch(/OpenDoc6\([^,]+, 3,/);
  });

  it("warns when import path is missing (failure mode)", async () => {
    for (const kind of ["import_step", "import_iges", "import_dxf"]) {
      const result = await gen([{ kind, params: {} }]);
      expect(result.success, `${kind} missing path`).toBe(true);
      expect(warningMessages(result).some((m) => m.includes("path"))).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · capability matrix exposes all 24 new ops", () => {
  it("all new ops are in supportedOps list", async () => {
    const response: unknown = await handler({ action: "solidworks_capabilities", params: {} });
    const asRecord = response as Record<string, unknown>;
    const content = asRecord.content as Array<{ type: string; text: string }>;
    const body = JSON.parse(content[0]!.text) as Record<string, unknown>;
    const caps = body.capabilities as { supportedOps: string[] };

    const newOps = [
      "sketch_ellipse",
      "sketch_slot",
      "feature_rib",
      "feature_thread",
      "surface_ruled",
      "surface_loft",
      "surface_sweep",
      "surface_fill",
      "surface_offset",
      "surface_trim",
      "transform_scale",
      "assembly_insert_component",
      "assembly_mate",
      "assembly_pattern",
      "drawing_view",
      "drawing_dimension",
      "drawing_annotation",
      "export_dxf",
      "import_step",
      "import_iges",
      "import_dxf",
    ];
    const opSet = new Set(caps.supportedOps);
    for (const opName of newOps) {
      expect(opSet.has(opName), `capability missing '${opName}'`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC12 · adversarial inputs", () => {
  it("tolerates NaN thickness on rib", async () => {
    const result = await gen([{ kind: "feature_rib", params: { thickness: NaN } }]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("InsertRib");
  });

  it("tolerates Infinity count on assembly_pattern", async () => {
    const result = await gen([
      { kind: "assembly_pattern", params: { count: Infinity, spacing: 10 } },
    ]);
    expect(result.success).toBe(true);
    expect(result.script as string).toContain("FeatureLinearPattern3");
  });

  it("handles 50-op batch exercising 10 different new op kinds", async () => {
    const kinds = [
      "sketch_ellipse",
      "sketch_slot",
      "feature_rib",
      "surface_offset",
      "transform_scale",
      "assembly_mate",
      "drawing_annotation",
      "export_dxf",
      "import_step",
      "feature_thread",
    ];
    const ops: Array<{ kind: string; params: Record<string, unknown> }> = [];
    for (let index = 0; index < 50; index++) {
      const kind = kinds[index % kinds.length]!;
      const params: Record<string, unknown> =
        kind.startsWith("import") || kind.startsWith("export")
          ? { path: `C:\\files\\part_${index}.dat` }
          : kind === "drawing_annotation"
            ? { text: `NOTE ${index}`, x: 0.1, y: 0.1 }
            : kind === "assembly_mate"
              ? { type: "coincident" }
              : {};
      ops.push({ kind, params });
    }
    const result = await gen(ops);
    expect(result.success).toBe(true);
    expect((result.lineage as unknown[]).length).toBe(50);
  });
});
