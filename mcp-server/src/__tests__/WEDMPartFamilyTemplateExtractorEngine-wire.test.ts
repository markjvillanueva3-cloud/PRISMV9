/**
 * WEDMPartFamilyTemplateExtractorEngine-wire.test.ts
 *
 * Wiring coverage for TRAINING-LEARNING-MS0/U-TL-U4 — verifies the 4 new
 * `wedm_training_*` actions register through `registerEdmDispatcher` and
 * round-trip through the captured `tool()` handler closure, not just through
 * direct engine-singleton calls.
 *
 * Coverage matrix:
 *   1. ACTIONS enum source contains all 4 wedm_training_* actions
 *   2. Dispatcher source has case-handler for each of the 4 actions
 *   3. Each case-handler performs the lazy import of the extractor engine
 *   4. Registered tool handler dispatches the 4 actions to the engine and
 *      returns the engine's discriminated result via slimResponse
 *   5. Invalid family name through the dispatcher returns ok:false /
 *      error:'unknown_family' (engine-level guard)
 *   6. Missing required 'family' in template_match returns dispatcherError
 *      shape (`success: false`) — schema-level guard
 *   7. Singleton class + 5 public methods match the case-handler expectations
 *
 * Mirrors `MillPartFamilyTemplateExtractorEngine-wire.test.ts` source-grep
 * checks AND adds true round-trip handler invocation (per comprehensive-build
 * enforcement: "A test must invoke through the dispatcher, not only the
 * engine singleton").
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";
import {
  wedmPartFamilyTemplateExtractorEngine,
  type WEDMCorpusSnapshot,
} from "../engines/WEDMPartFamilyTemplateExtractorEngine.js";

const EDM_DISPATCHER_SRC = path.resolve(__dirname, "../tools/dispatchers/edmDispatcher.ts");

const EXPECTED_WEDM_TRAINING_ACTIONS = [
  "wedm_training_corpus_status",
  "wedm_training_template_match",
  "wedm_training_template_list",
  "wedm_training_template_extract_all",
] as const;

// ─────────────────────────────────────────────────────────────────────────
// MockMCPServer — captures `tool()` registrations + lets us call the handler
// directly without needing a real MCP transport.
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

/** Invoke a registered prism_edm action through the captured handler.
 *  Returns the parsed engine result OR a dispatcherError shape — see callers
 *  for the discriminator. */
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | Record<string, unknown>;
  // dispatcherError returns the raw `{success,error,...}` shape; everything
  // else flows through slimResponse + { content: [...] } wrapping.
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

function fixtureSnapshot(overrides: Partial<WEDMCorpusSnapshot> = {}): WEDMCorpusSnapshot {
  return {
    schemaVersion: 1,
    generated_at: "2026-05-13T19:00:00.000Z",
    corpus_root_hint: "H:/PRISM/JM DIE/WIRE EDM",
    source_index: "H:/PRISM/Docustrata/.index/jm-die-wedm-corpus-v1.json",
    total_wedm_entries: 600,
    total_classified_entries: 540,
    classification_coverage: 0.9,
    families: {
      "punch-die": {
        count: 200,
        customers: { ITW: 120, ALCOA: 60, SFS: 20 },
        ext_breakdown: { ".nc": 150, ".isa": 50 },
        kind_breakdown: { g_code: 200 },
        sample_paths: ["H:/PRISM/JM DIE/WIRE EDM/ITW/PUNCH-001.nc"],
      },
      "carbide-die-insert": {
        count: 100,
        customers: { HOLO_KROME: 70, ITW: 30 },
        ext_breakdown: { ".nc": 100 },
        kind_breakdown: { g_code: 100 },
        sample_paths: ["H:/PRISM/JM DIE/WIRE EDM/HOLO_KROME/CARBIDE-001.nc"],
      },
    },
    historical_sf_disclaimer: "",
    warnings: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Source-grep coverage (mirrors the mill wire-test contract)
// ─────────────────────────────────────────────────────────────────────────

describe("edmDispatcher source — wedm_training_* wired", () => {
  it.each(EXPECTED_WEDM_TRAINING_ACTIONS)(
    "ACTIONS enum string literal '%s' is present in dispatcher source",
    (action) => {
      const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
      expect(src.includes(`"${action}"`)).toBe(true);
    }
  );

  it("edmDispatcher.ts source has a case-handler for each wedm_training_* action", () => {
    const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
    for (const action of EXPECTED_WEDM_TRAINING_ACTIONS) {
      expect(src.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("edmDispatcher.ts case-handlers all lazy-import WEDMPartFamilyTemplateExtractorEngine", () => {
    const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
    // Regex tolerates either compact `await import("…")` or wrapped multi-line
    // form `await import(\n  "…"\n)` — counts all occurrences of the URL.
    const re = /await\s+import\s*\(\s*"\.\.\/\.\.\/engines\/WEDMPartFamilyTemplateExtractorEngine\.js"\s*\)/g;
    const matches = (src.match(re) ?? []).length;
    expect(matches).toBe(4);
  });

  it("edmDispatcher.ts imports the WEDM training-template schemas", () => {
    const src = fs.readFileSync(EDM_DISPATCHER_SRC, "utf8");
    expect(src).toContain(
      'import { WEDM_TRAINING_TEMPLATE_SCHEMAS } from "../../schemas/wedmTrainingTemplateSchemas.js";'
    );
    // Merge expression must include the new schemas
    expect(src).toContain("...WEDM_TRAINING_TEMPLATE_SCHEMAS");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Round-trip handler invocation
// ─────────────────────────────────────────────────────────────────────────

let server: MockMCPServer;
let tempDir = "";

beforeEach(() => {
  server = new MockMCPServer();
  registerEdmDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-tpl-wire-"));
});

afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("registerEdmDispatcher — tool registration shape", () => {
  it("registers exactly 1 tool named 'prism_edm'", () => {
    expect(server.tools).toHaveLength(1);
    expect(server.tools[0]!.name).toBe("prism_edm");
  });

  it("registered tool description mentions WEDM-P2P pipeline", () => {
    expect(server.tools[0]!.description).toContain("WEDM-P2P pipeline");
  });
});

describe("Round-trip: wedm_training_template_match (happy path)", () => {
  it("invokes through dispatcher → returns ok:true template with punch-die schedule", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    const r = await call(server, "wedm_training_template_match", {
      family: "punch-die",
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    expect(r.ok).toBe(true);
    const template = r.template as { family: string; material_class: string; pass_schedule_seed: unknown[] };
    expect(template.family).toBe("punch-die");
    expect(template.material_class).toBe("tool_steel");
    expect(template.pass_schedule_seed).toHaveLength(3);
    const writtenTo = r.written_to as string;
    expect(writtenTo).toBe(path.join(tempDir, "punch-die.json"));
    expect(fs.existsSync(writtenTo)).toBe(true);
  });

  it("invokes through dispatcher with dryRun=true → does NOT write file", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    const r = await call(server, "wedm_training_template_match", {
      family: "carbide-die-insert",
      snapshotPath: snapFile,
      outDir: tempDir,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(r.written_to).toBe(null);
    expect(fs.existsSync(path.join(tempDir, "carbide-die-insert.json"))).toBe(false);
  });
});

describe("Round-trip: wedm_training_corpus_status", () => {
  it("returns ok:true catalog with per-family counts", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    const r = await call(server, "wedm_training_corpus_status", {
      snapshotPath: snapFile,
    });
    expect(r.ok).toBe(true);
    expect(r.total_wedm_entries).toBe(600);
    expect(r.classification_coverage).toBeCloseTo(0.9, 3);
    const families = r.families as Array<{ family: string; count: number }>;
    expect(families).toHaveLength(2);
    const punchDie = families.find((f) => f.family === "punch-die");
    expect(punchDie?.count).toBe(200);
  });

  it("returns ok:false / error:'snapshot_not_found' when path missing", async () => {
    const r = await call(server, "wedm_training_corpus_status", {
      snapshotPath: path.join(tempDir, "nope.json"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("snapshot_not_found");
  });
});

describe("Round-trip: wedm_training_template_extract_all", () => {
  it("extracts every family in snapshot through the dispatcher", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    const r = await call(server, "wedm_training_template_extract_all", {
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    expect(r.ok).toBe(true);
    const extracted = r.extracted as Array<{ family: string; written_to: string }>;
    expect(extracted).toHaveLength(2);
    expect(extracted.map((e) => e.family).sort()).toEqual(["carbide-die-insert", "punch-die"]);
    for (const e of extracted) {
      expect(fs.existsSync(e.written_to)).toBe(true);
    }
  });
});

describe("Round-trip: wedm_training_template_list", () => {
  it("lists templates after extract_all + sorts alphabetically", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    await call(server, "wedm_training_template_extract_all", {
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    const r = await call(server, "wedm_training_template_list", { outDir: tempDir });
    expect(r.ok).toBe(true);
    const templates = r.templates as Array<{ family: string }>;
    expect(templates.map((t) => t.family)).toEqual(["carbide-die-insert", "punch-die"]);
  });

  it("returns empty templates list for absent outDir", async () => {
    const r = await call(server, "wedm_training_template_list", {
      outDir: path.join(tempDir, "absent-subdir"),
    });
    expect(r.ok).toBe(true);
    expect(r.templates).toEqual([]);
  });
});

describe("Round-trip: error propagation through dispatcher", () => {
  it("out-of-enum family → Zod schema rejects with dispatcherError shape (success:false)", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    // Reviewer-B P3 hardening: this is the Zod-layer-rejection path. The
    // family literal is NOT in `WEDM_TEMPLATE_FAMILIES`, so the schema enum
    // bounces it before the engine sees it. Earlier disjunction was too loose.
    const r = await call(server, "wedm_training_template_match", {
      family: "definitely-not-a-real-family",
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("in-enum family not in snapshot → engine returns ok:false / error:'family_not_in_snapshot'", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    // Reviewer-B P3 hardening: this is the ENGINE-layer-rejection path —
    // the family IS a valid WEDM_TEMPLATE_FAMILIES member, so it passes
    // Zod, but the fixture snapshot has no entries for it, so the engine
    // bounces it with a discriminated error. The two-test split locks in
    // BOTH layers' rejection behavior, not just "one of them caught it".
    const r = await call(server, "wedm_training_template_match", {
      family: "mold-insert",
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("family_not_in_snapshot");
    expect(r.family).toBe("mold-insert");
  });

  it("missing 'family' parameter is caught by Zod schema validation", async () => {
    const snapFile = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(snapFile, JSON.stringify(fixtureSnapshot()), "utf8");
    const r = await call(server, "wedm_training_template_match", {
      snapshotPath: snapFile,
      outDir: tempDir,
    });
    // Zod rejects missing required field → dispatcherError shape.
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Singleton + method surface (matches mill wire-test contract)
// ─────────────────────────────────────────────────────────────────────────

describe("WEDMPartFamilyTemplateExtractorEngine — singleton + method surface", () => {
  it("singleton exports the 5 public methods edmDispatcher case-handlers call", () => {
    const m = wedmPartFamilyTemplateExtractorEngine as unknown as Record<string, unknown>;
    expect(typeof m.catalogCorpus).toBe("function");
    expect(typeof m.extractTemplate).toBe("function");
    expect(typeof m.extractAllTemplates).toBe("function");
    expect(typeof m.listTemplates).toBe("function");
    expect(typeof m.getTemplate).toBe("function");
  });

  it("singleton class name is WEDMPartFamilyTemplateExtractorEngine", () => {
    expect(wedmPartFamilyTemplateExtractorEngine.constructor.name).toBe(
      "WEDMPartFamilyTemplateExtractorEngine"
    );
  });
});
