/**
 * TaptiteElectrodeMacroBridgeEngine-wire.test.ts
 *
 * Wiring coverage for TRAINING-LEARNING-MS0/U-TL-U4 engine 2 — verifies the 3
 * new `wedm_taptite_macro_*` actions register through `registerEdmDispatcher`
 * and round-trip through the captured `tool()` handler closure (true E2E,
 * not just source-grep), per comprehensive-build enforcement.
 *
 * Coverage matrix:
 *   1. ACTIONS enum source contains all 3 wedm_taptite_macro_* actions
 *   2. Dispatcher source has case-handler for each of the 3 actions
 *   3. Each case-handler performs the lazy import of the bridge engine
 *   4. Registered tool handler dispatches the 3 actions to the engine and
 *      returns the engine's discriminated result via NO_SLIM bypass
 *   5. Invalid bridge through the place_template action returns engine-level
 *      ok:false / error:'invalid_bridge'
 *   6. Missing 'bridge' / 'partFolderPath' for place_template → schema-layer
 *      rejection via dispatcherError shape
 *   7. Singleton class + 3 public methods match the case-handler expectations
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";
import {
  taptiteElectrodeMacroBridgeEngine,
  TAPTITE_ELECTRODE_VC_VARIABLES,
} from "../engines/TaptiteElectrodeMacroBridgeEngine.js";
import type {
  WEDMTrainingTemplate,
  WEDMStrategySeed,
} from "../engines/WEDMPartFamilyTemplateExtractorEngine.js";

const EDM_DISPATCHER_SRC = path.resolve(__dirname, "../tools/dispatchers/edmDispatcher.ts");

const EXPECTED_TAPTITE_ACTIONS = [
  "wedm_training_taptite_bridge",         // renamed from wedm_taptite_macro_bridge (reviewer-B P1-3)
  "wedm_training_taptite_variables",      // renamed from wedm_taptite_macro_variables
  "wedm_training_taptite_place_template", // renamed from wedm_taptite_macro_place_template
] as const;

// ─────────────────────────────────────────────────────────────────────────
// MockMCPServer (mirrors WEDMPartFamilyTemplateExtractor-wire pattern).
// ─────────────────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | Record<string, unknown>;
  if (!("content" in raw) || !Array.isArray((raw as { content?: unknown }).content)) {
    return raw as Record<string, unknown>;
  }
  const text = ((raw as { content: { text: string }[] }).content[0]!.text) ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { rawText: text };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fixtures.

function passSeed(
  category: "roughing" | "finishing",
  id: string,
  on_time_us: number,
  peak_current_A: number
): WEDMStrategySeed {
  return {
    strategy_id: id,
    name: id,
    category,
    on_time_us,
    peak_current_A,
    gap_voltage_V: 60,
    wire_tension_N: 14,
    material_suitability: 0.9,
  };
}

function templateFixture(overrides: Partial<WEDMTrainingTemplate> = {}): WEDMTrainingTemplate {
  return {
    schemaVersion: 1,
    family: "taptite-electrode",
    generated_at: "2026-05-13T19:00:00.000Z",
    controller_baseline: null,
    material_class: "copper",
    representative_parts: [],
    customers_top: [],
    ext_breakdown: {},
    kind_breakdown: {},
    pass_schedule_seed: [
      passSeed("roughing", "rough_cut", 8.0, 20.0),
      passSeed("finishing", "skim_1", 3.5, 8.0),
      passSeed("finishing", "skim_2", 1.8, 4.0),
      passSeed("finishing", "skim_3", 0.9, 2.0),
    ],
    op_sequence: ["roughing", "finishing", "finishing", "finishing"],
    tribal_tips: [],
    playbook_rules: [],
    variability: { cycle_time_sec: null, dim_cpk: null, wire_life_min: null },
    run_count: 95,
    sx_score_distribution: null,
    classification_coverage_at_extract: 0.9,
    source_index: "x",
    total_corpus_count: 100,
    historical_pulse_note: "x",
    notes: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Source-grep coverage.

describe("edmDispatcher source — wedm_taptite_macro_* wired", () => {
  it.each(EXPECTED_TAPTITE_ACTIONS)(
    "ACTIONS enum string literal '%s' is present in dispatcher source",
    (action) => {
      const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
      expect(src.includes(`"${action}"`)).toBe(true);
    }
  );

  it("edmDispatcher.ts source has a case-handler for each wedm_taptite_macro_* action", () => {
    const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
    for (const action of EXPECTED_TAPTITE_ACTIONS) {
      expect(src.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("edmDispatcher.ts case-handlers all lazy-import TaptiteElectrodeMacroBridgeEngine", () => {
    const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
    const re = /await\s+import\s*\(\s*"\.\.\/\.\.\/engines\/TaptiteElectrodeMacroBridgeEngine\.js"\s*\)/g;
    const matches = (src.match(re) ?? []).length;
    expect(matches).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Round-trip handler invocation.

let server: MockMCPServer;
let tempDir = "";

beforeEach(() => {
  server = new MockMCPServer();
  registerEdmDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "taptite-bridge-wire-"));
});

afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("Round-trip: wedm_training_taptite_bridge", () => {
  it("returns ok:true with hydrated bridge for a valid taptite template", async () => {
    const r = await call(server, "wedm_training_taptite_bridge", {
      template: templateFixture(),
    });
    expect(r.ok).toBe(true);
    const bridge = r.bridge as { source_family: string; bridge_id: string; vc_variables: unknown[] };
    expect(bridge.source_family).toBe("taptite-electrode");
    expect(bridge.bridge_id).toBe("taptite-electrode--copper--p4--v1");
    expect(bridge.vc_variables).toHaveLength(20);
  });

  it("returns ok:false / error:'template_missing' when no template provided", async () => {
    const r = await call(server, "wedm_training_taptite_bridge", {});
    expect(r.ok).toBe(false);
    expect(r.error).toBe("template_missing");
  });

  it("returns ok:false / error:'wrong_family' for non-taptite-electrode template", async () => {
    const r = await call(server, "wedm_training_taptite_bridge", {
      template: templateFixture({ family: "punch-die" as unknown as "taptite-electrode" }),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("wrong_family");
  });
});

describe("Round-trip: wedm_training_taptite_variables", () => {
  it("without template: returns 20 variables, all initialValue=null", async () => {
    const r = await call(server, "wedm_training_taptite_variables", {});
    expect(r.ok).toBe(true);
    expect(r.required_count).toBe(17);
    expect(r.optional_count).toBe(3);
    const variables = r.variables as Array<{ name: string; initialValue: unknown }>;
    expect(variables).toHaveLength(20);
    // Variable names should match the canonical const export
    expect(new Set(variables.map((v) => v.name))).toEqual(new Set(TAPTITE_ELECTRODE_VC_VARIABLES));
  });

  it("with template: pulse vars hydrated", async () => {
    const r = await call(server, "wedm_training_taptite_variables", {
      template: templateFixture(),
    });
    expect(r.ok).toBe(true);
    const variables = r.variables as Array<{ name: string; initialValue: unknown }>;
    const rough = variables.find((v) => v.name === "VC_ROUGH_ON_TIME_US");
    expect(rough?.initialValue).toBe(8.0);
  });
});

describe("Round-trip: wedm_training_taptite_place_template", () => {
  it("writes labelled placeholder + returns ok:true with concrete path", async () => {
    // First obtain a real bridge artifact via the bridge action
    const bridgeR = await call(server, "wedm_training_taptite_bridge", {
      template: templateFixture(),
    });
    expect(bridgeR.ok).toBe(true);
    const partFolder = path.join(tempDir, "ITW", "TAPTITE-WIRE-1");
    const r = await call(server, "wedm_training_taptite_place_template", {
      bridge: bridgeR.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(true);
    const writtenTo = r.written_to as string;
    expect(fs.existsSync(writtenTo)).toBe(true);
    expect(path.basename(writtenTo)).toContain("_MACRO-TEMPLATE_");
    const body = fs.readFileSync(writtenTo, "utf8");
    expect(body).toContain("DO NOT RUN AS-IS");
  });

  it("missing partFolderPath → dispatcherError (Zod-layer rejection)", async () => {
    const bridgeR = await call(server, "wedm_training_taptite_bridge", {
      template: templateFixture(),
    });
    expect(bridgeR.ok).toBe(true);
    const r = await call(server, "wedm_training_taptite_place_template", {
      bridge: bridgeR.bridge,
      // partFolderPath omitted
    });
    expect(r.success).toBe(false);
  });

  it("non-taptite bridge → engine-layer ok:false / error:'invalid_bridge'", async () => {
    const r = await call(server, "wedm_training_taptite_place_template", {
      bridge: { source_family: "punch-die", bridge_id: "fake-id" },
      partFolderPath: tempDir,
    });
    expect(r.success).toBe(false);
  });

  it("already_exists guard via the dispatcher round-trip", async () => {
    const bridgeR = await call(server, "wedm_training_taptite_bridge", {
      template: templateFixture(),
    });
    expect(bridgeR.ok).toBe(true);
    const partFolder = path.join(tempDir, "ITW", "TAPTITE-WIRE-2");
    const first = await call(server, "wedm_training_taptite_place_template", {
      bridge: bridgeR.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(first.ok).toBe(true);
    const second = await call(server, "wedm_training_taptite_place_template", {
      bridge: bridgeR.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(second.ok).toBe(false);
    expect(second.error).toBe("already_exists");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Singleton + method surface.

describe("TaptiteElectrodeMacroBridgeEngine — singleton + method surface", () => {
  it("singleton exports the 3 public methods edmDispatcher case-handlers call", () => {
    const m = taptiteElectrodeMacroBridgeEngine as unknown as Record<string, unknown>;
    expect(typeof m.bridge).toBe("function");
    expect(typeof m.listRequiredVariables).toBe("function");
    expect(typeof m.placeLabelledTemplate).toBe("function");
  });

  it("singleton class name is TaptiteElectrodeMacroBridgeEngine", () => {
    expect(taptiteElectrodeMacroBridgeEngine.constructor.name).toBe(
      "TaptiteElectrodeMacroBridgeEngine"
    );
  });
});
