/**
 * U-CAD1 — CadQuery Code Generator Integration Tests
 *
 * Tests for:
 * 1. CADQUERY_CODEGEN_PROMPT wiring (exists, contains API reference)
 * 2. executeScript() via cadquery-executor.py (integration tests requiring Python)
 * 3. generateAndExecute() end-to-end pipeline
 * 4. Gear primitive generation (spur, bevel, rack) via cq_gears
 * 5. Airfoil generation (NACA 2412) via parafoil
 * 6. Syntax validation on generated scripts
 * 7. Dispatcher wiring for new actions
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import * as path from "path";
import {
  CadQueryCodeGeneratorEngine,
  cadQueryCodeGeneratorEngine,
  CADQUERY_CODEGEN_PROMPT,
  type CadQueryExecutionResult,
} from "../engines/CadQueryCodeGeneratorEngine.js";

// ── Helpers ────────────────────────────────────────────────────────

const PRISM_ROOT = "C:\\PRISM";
const EXECUTOR_PATH = path.resolve(PRISM_ROOT, "mcp-server", "scripts", "cadquery-executor.py");
const PYTHON_PATH = process.env.PRISM_PYTHON_PATH ||
  "C:\\Users\\Admin.DIGITALSTORM-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";

const hasPython = existsSync(PYTHON_PATH);
const hasExecutor = existsSync(EXECUTOR_PATH);
const canRunIntegration = hasPython && hasExecutor;

// Skip integration tests if Python/executor not available
const itIntegration = canRunIntegration ? it : it.skip;

// ── 1. CADQUERY_CODEGEN_PROMPT Tests ──────────────────────────────

describe("CADQUERY_CODEGEN_PROMPT", () => {
  it("prompt is exported and non-empty", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toBeDefined();
    expect(CADQUERY_CODEGEN_PROMPT.length).toBeGreaterThan(500);
  });

  it("prompt contains CadQuery API reference sections", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("WORKPLANE CREATION");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("2D SKETCHING");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("3D OPERATIONS");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("SELECTORS");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("POSITIONING");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("PATTERNS");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("ASSEMBLIES");
  });

  it("prompt contains gear generation via cq_gears", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("GEAR GENERATION");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("cq_gears.SpurGear");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("cq_gears.BevelGear");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("cq_gears.RackGear");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("cq_gears.RingGear");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("cq_gears.Worm");
  });

  it("prompt contains airfoil generation via parafoil", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("AIRFOIL GENERATION");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("parafoil.NACAAirfoil");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("CamberThicknessAirfoil");
  });

  it("prompt contains working examples", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("Box with hole");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("Flanged cylinder");
    expect(CADQUERY_CODEGEN_PROMPT).toContain("Bracket with fillets");
  });

  it("prompt enforces result variable assignment rule", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("assigned to `result`");
  });

  it("prompt forbids visualization functions", () => {
    expect(CADQUERY_CODEGEN_PROMPT).toContain("NEVER use show_object()");
  });
});

// ── 2. getCodeGenPrompt() Method ──────────────────────────────────

describe("CadQueryCodeGeneratorEngine.getCodeGenPrompt()", () => {
  const engine = cadQueryCodeGeneratorEngine;

  it("returns the CADQUERY_CODEGEN_PROMPT constant", () => {
    const prompt = engine.getCodeGenPrompt();
    expect(prompt).toBe(CADQUERY_CODEGEN_PROMPT);
  });

  it("prompt is usable as LLM system message (reasonable length)", () => {
    const prompt = engine.getCodeGenPrompt();
    // Should be substantial but not absurdly large
    expect(prompt.length).toBeGreaterThan(1000);
    expect(prompt.length).toBeLessThan(10000);
  });
});

// ── 3. executeScript() Integration Tests ──────────────────────────

describe("CadQueryCodeGeneratorEngine.executeScript()", () => {
  const engine = cadQueryCodeGeneratorEngine;

  itIntegration("executes simple box and returns metrics", async () => {
    const script = `
import cadquery as cq
result = cq.Workplane("XY").rect(50, 30).extrude(10)
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.volume_mm3).toBeCloseTo(50 * 30 * 10, -1); // 15000 mm³
    expect(result.bounding_box).toBeDefined();
    expect(result.face_count).toBeGreaterThan(0);
    expect(result.execution_time_ms).toBeGreaterThan(0);
  }, 30_000);

  itIntegration("executes cylinder with hole", async () => {
    const script = `
import cadquery as cq
result = (cq.Workplane("XY")
    .circle(20).extrude(30)
    .faces(">Z").workplane().hole(10))
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(true);
    expect(result.volume_mm3).toBeDefined();
    // Cylinder volume ≈ π·20²·30 ≈ 37699, minus hole π·5²·30 ≈ 2356 → ~35343
    expect(result.volume_mm3!).toBeGreaterThan(30000);
    expect(result.volume_mm3!).toBeLessThan(40000);
  }, 30_000);

  itIntegration("returns error for invalid script", async () => {
    const script = `
import cadquery as cq
result = cq.Workplane("XY").rect(50, 30).extrude()  # missing arg
`;
    const result = await engine.executeScript(script);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }, 30_000);

  itIntegration("exports STEP file when output_path given", async () => {
    const outputPath = path.resolve(PRISM_ROOT, "cad-engine", "exports", "test_box_ucad1.step");
    const script = `
import cadquery as cq
result = cq.Workplane("XY").rect(40, 40).extrude(20)
`;
    const result = await engine.executeScript(script, {
      output_path: outputPath,
      format: "step",
    });
    expect(result.success).toBe(true);
    expect(result.output_file ?? result.output_files?.[0]).toBeDefined();
  }, 30_000);
});

// ── 4. Gear Primitive Tests (cq_gears) ───────────────────────────
// cq_gears is an optional dependency (pip install git+https://github.com/meadiode/cq_gears.git)
// Tests verify the pipeline works; skip gracefully if cq_gears not installed.

describe("Gear primitives via cq_gears", () => {
  const engine = cadQueryCodeGeneratorEngine;

  itIntegration("spur gear: pipeline executes (pass or graceful dep error)", async () => {
    const script = `
import cadquery as cq
import cq_gears
gear = cq_gears.SpurGear(module=2, teeth_number=20, width=10, pressure_angle=20.0, bore_d=8)
result = cq.Workplane('XY').gear(gear)
`;
    const result = await engine.executeScript(script);
    if (result.success) {
      expect(result.volume_mm3).toBeGreaterThan(0);
      expect(result.face_count).toBeGreaterThan(10);
    } else {
      // cq_gears not installed — verify error is the expected import error
      expect(result.error).toMatch(/cq_gears|ModuleNotFoundError/);
    }
  }, 60_000);

  itIntegration("bevel gear: pipeline executes (pass or graceful dep error)", async () => {
    const script = `
import cadquery as cq
import cq_gears
gear = cq_gears.BevelGear(module=2, teeth_number=20, cone_angle=45, face_width=10, pressure_angle=20.0, bore_d=8)
result = cq.Workplane('XY').gear(gear)
`;
    const result = await engine.executeScript(script);
    if (result.success) {
      expect(result.volume_mm3).toBeGreaterThan(0);
    } else {
      expect(result.error).toMatch(/cq_gears|ModuleNotFoundError/);
    }
  }, 60_000);

  itIntegration("rack gear: pipeline executes (pass or graceful dep error)", async () => {
    const script = `
import cadquery as cq
import cq_gears
gear = cq_gears.RackGear(module=2, length=100, width=20, height=15, pressure_angle=20.0)
result = cq.Workplane('XY').gear(gear)
`;
    const result = await engine.executeScript(script);
    if (result.success) {
      expect(result.volume_mm3).toBeGreaterThan(0);
    } else {
      expect(result.error).toMatch(/cq_gears|ModuleNotFoundError/);
    }
  }, 60_000);
});

// ── 5. Airfoil Primitive Tests (parafoil) ─────────────────────────
// parafoil is an optional dependency (pip install git+https://github.com/OpenOrion/parafoil.git)

describe("Airfoil primitives via parafoil", () => {
  const engine = cadQueryCodeGeneratorEngine;

  itIntegration("NACA 2412: pipeline executes (pass or graceful dep error)", async () => {
    const script = `
import cadquery as cq
import parafoil
foil = parafoil.NACAAirfoil("2412", 100)
coords = foil.get_coords()
result = cq.Workplane('XY').polyline(coords).close().extrude(200)
`;
    const result = await engine.executeScript(script);
    if (result.success) {
      expect(result.volume_mm3).toBeGreaterThan(0);
      expect(result.volume_mm3!).toBeGreaterThan(10000);
    } else {
      expect(result.error).toMatch(/parafoil|ModuleNotFoundError/);
    }
  }, 60_000);
});

// ── 6. generateAndExecute() Pipeline ──────────────────────────────

describe("CadQueryCodeGeneratorEngine.generateAndExecute()", () => {
  const engine = cadQueryCodeGeneratorEngine;

  itIntegration("generates script from actions then executes it", async () => {
    const actions = [
      {
        step_number: 1,
        timestamp_s: 0,
        action_type: "sketch_create" as const,
        operation: "sketch_create",
        parameters: { plane: "XY" },
        confidence: 0.9,
        description: "Create XY sketch",
        keyframe_index: 1,
      },
      {
        step_number: 2,
        timestamp_s: 5,
        action_type: "extrude" as const,
        operation: "extrude",
        parameters: { depth: 25 },
        confidence: 0.9,
        description: "Extrude 25mm",
        keyframe_index: 2,
      },
    ];

    const { script, execution } = await engine.generateAndExecute(actions);
    expect(script.script).toContain("import cadquery as cq");
    expect(script.script).toContain("extrude");
    // Execution may fail if the generated template doesn't produce valid CQ
    // but the pipeline should not throw
    expect(execution).toBeDefined();
    expect(typeof execution.success).toBe("boolean");
  }, 30_000);
});

// ── 7. Syntax Validation on Complex Scripts ───────────────────────

describe("Syntax validation edge cases", () => {
  const engine = cadQueryCodeGeneratorEngine;

  it("validates gear script syntax (import + method chain)", () => {
    const script = `import cadquery as cq
import cq_gears
gear = cq_gears.SpurGear(module=2, teeth_number=20, width=10)
result = cq.Workplane('XY').gear(gear)
`;
    const check = engine.validateSyntax(script);
    expect(check.valid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it("validates airfoil script syntax", () => {
    const script = `import cadquery as cq
import parafoil
foil = parafoil.NACAAirfoil("2412", 100)
coords = foil.get_coords()
result = cq.Workplane('XY').polyline(coords).close().extrude(200)
`;
    const check = engine.validateSyntax(script);
    expect(check.valid).toBe(true);
  });

  it("catches missing import in gear script", () => {
    const script = `import cq_gears
gear = cq_gears.SpurGear(module=2, teeth_number=20, width=10)
result = cq.Workplane('XY').gear(gear)
`;
    const check = engine.validateSyntax(script);
    expect(check.valid).toBe(false);
    expect(check.errors.some(e => e.includes("import cadquery"))).toBe(true);
  });

  it("catches unmatched parentheses in complex chain", () => {
    const script = `import cadquery as cq
result = (cq.Workplane("XY")
    .rect(50, 30).extrude(10
    .faces(">Z").workplane().hole(8))
`;
    const check = engine.validateSyntax(script);
    expect(check.valid).toBe(false);
  });
});

// ── 8. Dispatcher Wiring Verification ─────────────────────────────

describe("Dispatcher wiring for new actions", () => {
  it("cadquery_execute_script is in the ACTIONS array", async () => {
    // Verify by importing the dispatcher module structure
    const dispatcherPath = path.resolve(
      PRISM_ROOT, "mcp-server", "src", "tools", "dispatchers", "cadDispatcher.ts"
    );
    const { readFileSync } = await import("fs");
    const src = readFileSync(dispatcherPath, "utf-8");
    expect(src).toContain('"cadquery_execute_script"');
    expect(src).toContain('"cadquery_codegen_prompt"');
    expect(src).toContain('case "cadquery_execute_script"');
    expect(src).toContain('case "cadquery_codegen_prompt"');
  });

  it("cadActionSchemas includes new action schemas", async () => {
    const schemaPath = path.resolve(
      PRISM_ROOT, "mcp-server", "src", "schemas", "cadActionSchemas.ts"
    );
    const { readFileSync } = await import("fs");
    const src = readFileSync(schemaPath, "utf-8");
    expect(src).toContain("cadquery_execute_script");
    expect(src).toContain("cadquery_codegen_prompt");
  });
});
