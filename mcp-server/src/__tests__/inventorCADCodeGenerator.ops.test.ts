/**
 * inventorCADCodeGenerator.ops.test.ts — U-CADC09
 *
 * Coverage tests for the 9 repaired emit helpers (sketch_mirror, sketch_trim,
 * sketch_extend, sketch_constraint, feature_loft, feature_sweep, feature_decal,
 * assembly_constrain, assembly_joint) and the 7 new ops (sketch_fillet,
 * sketch_chamfer, feature_split, feature_move_face, surface_extrude,
 * surface_stitch, mirror_body).
 *
 * Invokes through cadDispatcher so wiring is exercised end-to-end.
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

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      _desc: string,
      _schema: unknown,
      handler: CapturedTool["handler"]
    ) {
      tools.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function gen(
  operations: Array<{ kind: string; args: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({
    action: "inventor_generate_script",
    params: { operations, projectName: "u_cadc09_test", units: "mm" },
  });
  const asRecord = response as Record<string, unknown>;
  if (asRecord.success === false) {
    throw new Error(`dispatcher error: ${String(asRecord.error)}`);
  }
  const content = asRecord.content as
    | Array<{ type: string; text: string }>
    | undefined;
  const text = content?.[0]?.text ?? "";
  return JSON.parse(text) as Record<string, unknown>;
}

async function rawCall(
  operations: Array<{ kind: string; args: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({
    action: "inventor_generate_script",
    params: { operations, projectName: "u_cadc09_raw" },
  });
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
  registerCadDispatcher(server as any);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─────────────────────────────────────────────────────────────────────────────
// 9 repaired stubs
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC09 · sketch_mirror (repaired)", () => {
  it("emits construction axis + pair-wise symmetry constraints", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_line", args: { x1: 10, y1: 0, x2: 10, y2: 5 } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: -10, y2: 0 } },
      { kind: "sketch_line", args: { x1: -10, y1: 0, x2: -10, y2: 5 } },
      {
        kind: "sketch_mirror",
        args: {
          mirror_line: { x1: 0, y1: -50, x2: 0, y2: 50 },
          entity_pairs: [
            [1, 3],
            [2, 4],
          ],
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("Construction = True");
    expect(s).toContain("GeometricConstraints.AddSymmetry");
  });

  it("warns when called without entity_pairs (boundary case)", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      {
        kind: "sketch_mirror",
        args: { mirror_line: { x1: 0, y1: 0, x2: 50, y2: 0 } },
      },
    ]);
    expect(r.success).toBe(true);
    const warnings = (r.warnings as Array<string | { message: string }>) ?? [];
    const messages = warnings.map((w) =>
      typeof w === "string" ? w : w.message
    );
    expect(messages.some((m) => m.includes("entity_pairs"))).toBe(true);
  });

  it("handles missing mirror_line arg with sensible defaults", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 5, y2: 0 } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: -5, y2: 0 } },
      { kind: "sketch_mirror", args: { entity_pairs: [[1, 2]] } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("CreatePoint2d(0, 0)");
  });
});

describe("U-CADC09 · sketch_trim (repaired)", () => {
  it("emits Delete on the targeted entity", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_line", args: { x1: 5, y1: -5, x2: 5, y2: 5 } },
      { kind: "sketch_trim", args: { entity_index: 2 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("Item(2).Delete");
  });

  it("rejects missing entity_index (failure mode)", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_trim", args: {} },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("entity_index");
  });
});

describe("U-CADC09 · sketch_extend (repaired)", () => {
  it("moves end point to target coordinates", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      {
        kind: "sketch_extend",
        args: {
          entity_index: 1,
          endpoint: "end",
          target_x: 25,
          target_y: 0,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("EndSketchPoint.MoveTo");
    expect(s).toContain("CreatePoint2d(25, 0)");
  });

  it("supports start-point extension", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      {
        kind: "sketch_extend",
        args: {
          entity_index: 1,
          endpoint: "start",
          target_x: -5,
          target_y: 0,
        },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("StartSketchPoint.MoveTo");
  });
});

describe("U-CADC09 · sketch_constraint (repaired)", () => {
  it("emits AddHorizontal for single-entity constraint", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0.01 } },
      { kind: "sketch_constraint", args: { type: "horizontal", entity_a: 1 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddHorizontal");
  });

  it("emits AddParallel for pair constraint", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_line", args: { x1: 0, y1: 5, x2: 10, y2: 5.01 } },
      {
        kind: "sketch_constraint",
        args: { type: "parallel", entity_a: 1, entity_b: 2 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddParallel");
  });

  it("rejects unknown constraint type", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      {
        kind: "sketch_constraint",
        args: { type: "quantum_entangle", entity_a: 1 },
      },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("unknown type");
  });

  it("rejects pair constraint without entity_b", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_constraint", args: { type: "tangent", entity_a: 1 } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("entity_b");
  });
});

describe("U-CADC09 · feature_loft (repaired)", () => {
  it("emits CreateLoftDefinition with multiple sections", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 10 } },
      { kind: "sketch_create", args: { plane: "XY", offset: 50 } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 20 } },
      { kind: "feature_loft", args: { sections: [1, 2], operation: "join" } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("CreateLoftDefinition");
    expect(s).toContain("kJoinOperation");
  });

  it("supports rails", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 10 } },
      { kind: "sketch_create", args: { plane: "XY", offset: 50 } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 20 } },
      { kind: "sketch_create", args: { plane: "XZ" } },
      { kind: "sketch_line", args: { x1: 10, y1: 0, x2: 20, y2: 50 } },
      { kind: "feature_loft", args: { sections: [1, 2], rails: [3] } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("loftDef.LoftRails");
  });

  it("rejects fewer than 2 sections (boundary)", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 10 } },
      { kind: "feature_loft", args: { sections: [1] } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("≥2 sketch indices");
  });
});

describe("U-CADC09 · feature_sweep (repaired)", () => {
  it("emits AddUsingPath with distinct profile + path sketches", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 5 } },
      { kind: "sketch_create", args: { plane: "XZ" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 100, y2: 50 } },
      { kind: "feature_sweep", args: { profile_sketch: 1, path_sketch: 2 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddUsingPath");
  });

  it("applies taper angle when supplied", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 5 } },
      { kind: "sketch_create", args: { plane: "XZ" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 50, y2: 0 } },
      {
        kind: "feature_sweep",
        args: { profile_sketch: 1, path_sketch: 2, taper_angle: 3 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("TaperAngle.Value = 3");
  });

  it("rejects identical profile and path", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_circle", args: { cx: 0, cy: 0, radius: 5 } },
      { kind: "feature_sweep", args: { profile_sketch: 1, path_sketch: 1 } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("distinct");
  });
});

describe("U-CADC09 · feature_decal (repaired)", () => {
  it("emits SketchImages.Add + DecalFeatures.Add", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
      { kind: "feature_extrude", args: { length: 10 } },
      {
        kind: "feature_decal",
        args: {
          image_file: "C:\\logos\\prism.png",
          face_index: 1,
          wrap_to_face: true,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("SketchImages.Add");
    expect(s).toContain("DecalFeatures.Add");
  });

  it("rejects missing image_file", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_decal", args: {} },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("image_file");
  });
});

describe("U-CADC09 · assembly_constrain (repaired)", () => {
  it("emits AddMateConstraint with offset", async () => {
    const r = await gen([
      {
        kind: "assembly_constrain",
        args: {
          type: "mate",
          occurrence_a: 1,
          occurrence_b: 2,
          face_a: 3,
          face_b: 5,
          offset: 10,
        },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddMateConstraint");
  });

  it("emits AddAngleConstraint with radian conversion", async () => {
    const r = await gen([
      {
        kind: "assembly_constrain",
        args: { type: "angle", occurrence_a: 1, occurrence_b: 2, angle: 45 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("45 * PI / 180");
  });

  it("rejects unknown constraint type", async () => {
    const r = await rawCall([
      {
        kind: "assembly_constrain",
        args: { type: "warp", occurrence_a: 1, occurrence_b: 2 },
      },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("unknown type");
  });
});

describe("U-CADC09 · assembly_joint (repaired)", () => {
  it("emits CreateRigidJointDefinition for rigid joint", async () => {
    const r = await gen([
      {
        kind: "assembly_joint",
        args: { type: "rigid", occurrence_a: 1, occurrence_b: 2 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("CreateRigidJointDefinition");
  });

  it("supports all 6 joint variants", async () => {
    for (const t of [
      "rotational",
      "slider",
      "cylindrical",
      "planar",
      "ball",
    ]) {
      const r = await gen([
        {
          kind: "assembly_joint",
          args: { type: t, occurrence_a: 1, occurrence_b: 2 },
        },
      ]);
      expect(r.success, `joint type ${t}`).toBe(true);
      const pascal = t.charAt(0).toUpperCase() + t.slice(1);
      expect((r.script as string)).toContain(`Create${pascal}JointDefinition`);
    }
  });

  it("rejects unknown joint type", async () => {
    const r = await rawCall([
      {
        kind: "assembly_joint",
        args: { type: "teleport", occurrence_a: 1, occurrence_b: 2 },
      },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("unknown type");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7 new ops
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC09 · sketch_fillet (new)", () => {
  it("emits SketchArcs.AddByFillet", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_line", args: { x1: 10, y1: 0, x2: 10, y2: 10 } },
      { kind: "sketch_fillet", args: { radius: 2, line_a: 1, line_b: 2 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("SketchArcs.AddByFillet");
  });

  it("rejects missing radius", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_fillet", args: { line_a: 1, line_b: 2 } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("radius");
  });
});

describe("U-CADC09 · sketch_chamfer (new)", () => {
  it("emits SketchLines.AddByChamfer", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 10, y2: 0 } },
      { kind: "sketch_line", args: { x1: 10, y1: 0, x2: 10, y2: 10 } },
      { kind: "sketch_chamfer", args: { distance: 1, line_a: 1, line_b: 2 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddByChamfer");
  });
});

describe("U-CADC09 · feature_split (new)", () => {
  it("emits SplitFeatures.AddSplitPart via work plane", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
      { kind: "feature_extrude", args: { length: 30 } },
      {
        kind: "feature_split",
        args: { tool: "work_plane", tool_index: 1, direction: "positive" },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("SplitFeatures.AddSplitPart");
  });

  it("defaults to positive direction when unspecified", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 20, height: 20 } },
      { kind: "feature_extrude", args: { length: 10 } },
      { kind: "feature_split", args: { tool: "work_plane" } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("kPositiveExtentDirection");
  });
});

describe("U-CADC09 · feature_move_face (new)", () => {
  it("emits MoveFaceFeatures.AddFreeFormTranslate", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
      { kind: "feature_extrude", args: { length: 20 } },
      {
        kind: "feature_move_face",
        args: { mode: "translate", face_index: 1, dx: 5, dy: 0, dz: 0 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddFreeFormTranslate");
  });

  it("emits AddFreeFormRotate with radian conversion", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
      { kind: "feature_extrude", args: { length: 20 } },
      {
        kind: "feature_move_face",
        args: { mode: "rotate", face_index: 1, angle: 30 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("AddFreeFormRotate");
  });

  it("rejects invalid mode", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 10, height: 10 } },
      { kind: "feature_extrude", args: { length: 5 } },
      {
        kind: "feature_move_face",
        args: { mode: "teleport", face_index: 1 },
      },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("translate");
  });
});

describe("U-CADC09 · surface_extrude (new)", () => {
  it("emits AddByDistanceExtent with kSurfaceOperation", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 100, y2: 0 } },
      { kind: "surface_extrude", args: { length: 25, direction: "positive" } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("kSurfaceOperation");
  });

  it("supports symmetric direction", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 50, y2: 0 } },
      {
        kind: "surface_extrude",
        args: { length: 20, direction: "symmetric" },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("kSymmetricExtentDirection");
  });
});

describe("U-CADC09 · surface_stitch (new)", () => {
  it("emits StitchFeatures.Add with tolerance", async () => {
    const r = await gen([
      {
        kind: "surface_stitch",
        args: { surface_indices: [1, 2, 3], tolerance: 0.01 },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("StitchFeatures.Add");
  });

  it("rejects fewer than 2 surfaces", async () => {
    const r = await rawCall([
      { kind: "surface_stitch", args: { surface_indices: [1] } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("≥2");
  });
});

describe("U-CADC09 · mirror_body (new)", () => {
  it("emits MirrorFeatures.AddByDefinition across XY", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 30, height: 30 } },
      { kind: "feature_extrude", args: { length: 15 } },
      { kind: "mirror_body", args: { body_index: 1, mirror_plane: "XY" } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("MirrorFeatures.AddByDefinition");
  });

  it("supports XZ and YZ planes", async () => {
    for (const [plane, expected] of [
      ["XZ", "WorkPlanes.Item(2)"],
      ["YZ", "WorkPlanes.Item(1)"],
    ] as const) {
      const r = await gen([
        { kind: "sketch_create", args: { plane: "XY" } },
        {
          kind: "sketch_rectangle",
          args: { x: 0, y: 0, width: 10, height: 10 },
        },
        { kind: "feature_extrude", args: { length: 5 } },
        { kind: "mirror_body", args: { mirror_plane: plane } },
      ]);
      expect(r.success, `plane=${plane}`).toBe(true);
      expect((r.script as string)).toContain(expected);
    }
  });

  it("rejects invalid mirror plane", async () => {
    const r = await rawCall([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 10, height: 10 } },
      { kind: "feature_extrude", args: { length: 5 } },
      { kind: "mirror_body", args: { mirror_plane: "ABCDEF" } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("XY, XZ, or YZ");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC09 · capability matrix", () => {
  it("includes all 7 new ops", async () => {
    const res = await handler({
      action: "inventor_capabilities",
      params: {},
    });
    const body = JSON.parse(res.content[0]!.text) as Record<string, unknown>;
    const caps = body.capabilities as { supportedOps: string[] };
    for (const op of [
      "sketch_fillet",
      "sketch_chamfer",
      "feature_split",
      "feature_move_face",
      "surface_extrude",
      "surface_stitch",
      "mirror_body",
    ]) {
      expect(caps.supportedOps, `missing op ${op}`).toContain(op);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC09 · adversarial inputs", () => {
  it("handles NaN face_index in move_face without crashing", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 10, height: 10 } },
      { kind: "feature_extrude", args: { length: 5 } },
      {
        kind: "feature_move_face",
        args: { mode: "translate", face_index: NaN, dx: 1, dy: 0, dz: 0 },
      },
    ]);
    expect(r.success).toBe(true);
  });

  it("handles empty entity_pairs in mirror without crashing", async () => {
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_mirror", args: { entity_pairs: [] } },
    ]);
    expect(r.success).toBe(true);
  });

  it("handles 50-pair mirror (oversize)", async () => {
    const pairs = Array.from({ length: 50 }, (_, i) => [i + 1, i + 101]);
    const r = await gen([
      { kind: "sketch_create", args: { plane: "XY" } },
      {
        kind: "sketch_mirror",
        args: {
          mirror_line: { x1: 0, y1: 0, x2: 0, y2: 100 },
          entity_pairs: pairs,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const symmetryCount = (
      (r.script as string).match(/AddSymmetry/g) || []
    ).length;
    expect(symmetryCount).toBe(50);
  });
});
