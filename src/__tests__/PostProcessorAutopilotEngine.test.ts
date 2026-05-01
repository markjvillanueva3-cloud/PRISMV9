/**
 * PostProcessorAutopilotEngine Tests — ACP-MS5
 *
 * Validates:
 *   1. Dialect resolution (20 controllers)
 *   2. Post config generation per dialect
 *   3. PPG Quick-Start chain execution
 *   4. Print-to-Program chain execution
 *   5. Feature extraction from descriptions
 */
import { describe, it, expect } from "vitest";
import { postProcessorAutopilotEngine } from "../engines/PostProcessorAutopilotEngine.js";

// ── Dialect Resolution ───────────────────────────────────────

describe("PostProcessorAutopilotEngine — Dialect Resolution", () => {

  it("resolves 'fanuc' directly", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("fanuc");
    expect(r.resolved_dialect).toBe("fanuc");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("resolves '840d' to siemens", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("840D");
    expect(r.resolved_dialect).toBe("siemens_840d");
  });

  it("resolves 'haas' directly", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("Haas");
    expect(r.resolved_dialect).toBe("haas");
  });

  it("resolves 'mazatrol' to mazak", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("Mazatrol");
    expect(r.resolved_dialect).toBe("mazak");
  });

  it("resolves 'heidenhain tnc640' via partial match", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("Heidenhain TNC640");
    expect(r.resolved_dialect).toBe("heidenhain");
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("resolves 'grbl' for hobby machines", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("GRBL");
    expect(r.resolved_dialect).toBe("grbl");
  });

  it("defaults to fanuc for unknown controller", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("Unknown CNC 3000");
    expect(r.resolved_dialect).toBe("fanuc");
    expect(r.confidence).toBe(0.3);
  });

  it("returns dialect features", () => {
    const r = postProcessorAutopilotEngine.resolveDialect("haas");
    expect(r.features.length).toBeGreaterThan(0);
    expect(r.features.some(f => f.includes("coolant") || f.includes("macro"))).toBe(true);
  });
});

// ── Post Config Generation ───────────────────────────────────

describe("PostProcessorAutopilotEngine — Config Generation", () => {

  it("generates Fanuc config with IJK arcs", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("fanuc", "milling");
    expect(c.dialect).toBe("fanuc");
    expect(c.arc_format).toBe("ijk");
    expect(c.feed_mode).toBe("per_minute");
    expect(c.program_start.some(l => l.includes("%"))).toBe(true);
  });

  it("generates Haas config with R arcs", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("haas", "milling");
    expect(c.arc_format).toBe("r");
    expect(c.line_number_increment).toBe(1);
  });

  it("generates turning config with per-rev feed", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("fanuc", "turning");
    expect(c.feed_mode).toBe("per_rev");
  });

  it("generates Heidenhain conversational start", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("heidenhain");
    expect(c.program_start.some(l => l.includes("BEGIN PGM"))).toBe(true);
    expect(c.program_end.some(l => l.includes("END PGM"))).toBe(true);
  });

  it("generates Siemens config with 4 decimal places", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("siemens_840d");
    expect(c.decimal_places).toBe(4);
  });

  it("includes coolant codes for all configs", () => {
    const c = postProcessorAutopilotEngine.generatePostConfig("fanuc");
    expect(c.coolant_codes.flood).toBe("M8");
    expect(c.coolant_codes.off).toBe("M9");
  });
});

// ── PPG Quick-Start Chain ────────────────────────────────────

describe("PostProcessorAutopilotEngine — PPG Chain", () => {

  it("runs full PPG chain for Haas", () => {
    const r = postProcessorAutopilotEngine.runPPG({
      controller: "Haas",
      operation_type: "milling",
    });
    expect(r.chain_id).toBe("pp_autopilot");
    expect(r.status).toBe("success");
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.dialect.resolved_dialect).toBe("haas");
    expect(r.config.dialect).toBe("haas");
    expect(r.program_header!.length).toBeGreaterThan(0);
    expect(r.program_footer!.length).toBeGreaterThan(0);
  });

  it("warns for unknown controller", () => {
    const r = postProcessorAutopilotEngine.runPPG({
      controller: "SuperCNC 9000",
    });
    expect(r.status).toBe("partial");
    expect(r.recommendations.some(r => r.includes("low confidence"))).toBe(true);
  });

  it("warns for EDM with non-EDM dialect", () => {
    const r = postProcessorAutopilotEngine.runPPG({
      controller: "Haas",
      operation_type: "edm",
    });
    expect(r.recommendations.some(r => r.includes("EDM") || r.includes("Sodick"))).toBe(true);
  });

  it("includes dialect feature recommendations", () => {
    const r = postProcessorAutopilotEngine.runPPG({
      controller: "fanuc",
    });
    expect(r.recommendations.some(r => r.includes("supports:"))).toBe(true);
  });

  it("tracks duration", () => {
    const r = postProcessorAutopilotEngine.runPPG({ controller: "fanuc" });
    expect(r.duration_ms).toBeGreaterThanOrEqual(0);
    expect(r.started_at).toBeTruthy();
  });
});

// ── Print-to-Program Chain ───────────────────────────────────

describe("PostProcessorAutopilotEngine — Print-to-Program", () => {

  it("extracts features from description", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Aluminum plate with 4 pockets, 8 holes, and 2 threaded holes",
      material: "aluminum",
    });
    expect(r.features_identified).toContain("pocket");
    expect(r.features_identified).toContain("hole");
    expect(r.features_identified).toContain("thread");
    expect(r.tool_count).toBeGreaterThanOrEqual(4);
  });

  it("selects appropriate strategy for 3D surface", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Freeform 3D surface with sculpted contours",
      material: "steel",
    });
    expect(r.strategy_selected).toContain("3d");
    expect(r.features_identified).toContain("3d_surface");
  });

  it("estimates higher cycle time for titanium", () => {
    const steel = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Pocket with 4 holes",
      material: "steel",
    });
    const ti = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Pocket with 4 holes",
      material: "titanium",
    });
    expect(ti.estimated_cycle_time_min).toBeGreaterThan(steel.estimated_cycle_time_min);
  });

  it("warns for tight tolerances", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Bore with tight tolerance",
      material: "steel",
      tolerances: { bore_diameter: 0.005 },
    });
    expect(r.recommendations.some(r => r.includes("tight") || r.includes("grinding"))).toBe(true);
  });

  it("recommends fixture optimization for large batches", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Simple plate with holes",
      material: "aluminum",
      batch_size: 500,
    });
    expect(r.recommendations.some(r => r.includes("batch") || r.includes("fixture"))).toBe(true);
  });

  it("warns when no features detected", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "",
      material: "steel",
    });
    expect(r.features_identified).toHaveLength(0);
    expect(r.recommendations.some(r => r.includes("No features"))).toBe(true);
  });

  it("returns success with full specification", () => {
    const r = postProcessorAutopilotEngine.runPrintToProgram({
      drawing_description: "Aluminum housing with pocket, 6 holes, chamfers, and face mill",
      material: "aluminum",
      machine_name: "Haas VF-2",
      priority: "speed",
    });
    expect(r.status).toBe("success");
    expect(r.chain_id).toBe("print_to_program");
    expect(r.estimated_cycle_time_min).toBeGreaterThan(0);
  });
});

// ── Utility ──────────────────────────────────────────────────

describe("PostProcessorAutopilotEngine — Utility", () => {

  it("lists 20 unique dialects", () => {
    const dialects = postProcessorAutopilotEngine.listDialects();
    expect(dialects.length).toBe(20);
    expect(dialects).toContain("fanuc");
    expect(dialects).toContain("haas");
    expect(dialects).toContain("siemens_840d");
  });

  it("returns features for known dialect", () => {
    const features = postProcessorAutopilotEngine.getDialectFeatures("haas");
    expect(features.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown dialect", () => {
    const features = postProcessorAutopilotEngine.getDialectFeatures("nonexistent" as any);
    expect(features).toHaveLength(0);
  });
});
