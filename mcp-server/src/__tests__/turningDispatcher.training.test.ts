/**
 * turningDispatcher.training.test.ts — round-trip integration coverage for
 * TRAINING-LEARNING-MS0/U1 dispatcher wiring.
 *
 * Drives the three new actions through the real `prism_turning` dispatcher:
 *   - lathe_training_corpus_status → LathePartFamilyTemplateExtractorEngine.catalogCorpus
 *   - lathe_training_template_match → LathePartFamilyTemplateExtractorEngine.extractTemplate
 *   - lathe_training_template_list  → LathePartFamilyTemplateExtractorEngine.listTemplates
 *
 * Closes Reviewer B P1-2 from the per-file scrutiny gate: the engine has
 * 22 it() unit tests in LathePartFamilyTemplateExtractorEngine.test.ts but
 * those don't cover the dispatcher case-block wiring. A future rename of
 * `catalogCorpus`/`extractTemplate`/`listTemplates` would silently break the
 * action enum without any failing test — this file is the wiring guard.
 *
 * Specifically asserts the dispatcher's `success` flag is bridged from the
 * engine's discriminated `{ok: true|false}` shape (the Reviewer B P0 fix):
 *   - engine ok:true  → result.success === true
 *   - engine ok:false → result.success === false (plus error/family/detail
 *     surfaced at the dispatcher level, not buried inside data).
 *
 * @milestone TRAINING-LEARNING-MS0 / U1 (dispatcher wiring + integration test)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerTurningDispatcher(
    server as unknown as Parameters<typeof registerTurningDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_turning");
  if (!tool) throw new Error("prism_turning tool not registered");
  handler = tool.handler;
});

// A minimal-but-realistic snapshot fixture matching the engine's
// CorpusSnapshot schema (schemaVersion + families map keyed by
// LatheTemplateFamily literal, each carrying count + top_customers).
function makeSnapshot(): Record<string, unknown> {
  // Per CorpusSnapshot type (engine lines 137-139), the snapshot MUST carry
  // total_lathe_entries / total_classified_entries / classification_coverage
  // at the root — catalogCorpus reads them straight through (engine line 533).
  // Family counts sum to 12+9+6+4+3+0+2+1+0+0+0+0 = 37.
  return {
    schemaVersion: 1,
    generated_at: "2026-05-13T00:00:00Z",
    root: "fixture://memory",
    total_lathe_entries: 37,
    total_classified_entries: 37,
    classification_coverage: 1.0,
    families: {
      "wafer-insert": { count: 12, top_customers: [["ITW", 8], ["ALCOA", 4]] },
      casing: { count: 9, top_customers: [["SFS", 5]] },
      "casing-counterbore": { count: 6, top_customers: [["OPTIMAS", 4]] },
      "top-hat-casing": { count: 4, top_customers: [["HOLO-KROME", 3]] },
      shaft: { count: 3, top_customers: [] },
      flange: { count: 0, top_customers: [] },
      bushing: { count: 2, top_customers: [] },
      tube: { count: 1, top_customers: [] },
      "taptite-blank": { count: 0, top_customers: [] },
      "nut-blank": { count: 0, top_customers: [] },
      "electrode-rod-blank": { count: 0, top_customers: [] },
      unknown: { count: 0, top_customers: [] },
    },
  };
}

// Per-test tmpdir + env scoping so concurrent test runs don't collide on
// the default lathe-template output dir.
let savedOutDirEnv: string | undefined;
let savedConfineEnv: string | undefined;
let tmpOutDir: string;

beforeEach(() => {
  savedOutDirEnv = process.env.PRISM_LATHE_TEMPLATE_DIR;
  savedConfineEnv = process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED;
  tmpOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-training-disp-"));
  process.env.PRISM_LATHE_TEMPLATE_DIR = tmpOutDir;
  // Confined mode — tmpdir is OUTSIDE the engine's default candidate paths,
  // so we must opt out of the path-traversal guard for the happy-path tests.
  // The "outdir_escape" test below re-enables confinement explicitly.
  process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED = "1";
});

afterEach(() => {
  if (savedOutDirEnv === undefined) delete process.env.PRISM_LATHE_TEMPLATE_DIR;
  else process.env.PRISM_LATHE_TEMPLATE_DIR = savedOutDirEnv;
  if (savedConfineEnv === undefined) delete process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED;
  else process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED = savedConfineEnv;
  try {
    fs.rmSync(tmpOutDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ───────────────────────────────────────────────────────────────────────────
// lathe_training_corpus_status

describe("lathe_training_corpus_status", () => {
  it("returns success:true and per-family rollup from an in-memory snapshot", async () => {
    const res = await invoke("lathe_training_corpus_status", { snapshot: makeSnapshot() });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    // CatalogResult.families is Array<{family, count, top_customers, seed_macros}>
    // per LathePartFamilyTemplateExtractorEngine.ts:198-211 — NOT a Record.
    const families = data.families as Array<{ family: string; count: number }>;
    const wafer = families.find((f) => f.family === "wafer-insert");
    const casing = families.find((f) => f.family === "casing");
    expect(wafer?.count).toBe(12);
    expect(casing?.count).toBe(9);
    // total_lathe_entries = 12+9+6+4+3+0+2+1+0+0+0+0 = 37.
    expect(data.total_lathe_entries).toBe(37);
  });

  it("surfaces engine ok:false as dispatcher success:false when snapshotPath is missing", async () => {
    const res = await invoke("lathe_training_corpus_status", {
      snapshotPath: path.join(tmpOutDir, "does-not-exist.json"),
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("snapshot_not_found");
    // The engine's payload is still nested under data for debugging.
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(false);
    expect(data.error).toBe("snapshot_not_found");
  });

  it("accepts snake_case snapshot_path alias as well as camelCase", async () => {
    // Write the fixture to disk so the snake_case path-string alias works
    // through both the param-normalizer and the case-block fallback.
    const snapPath = path.join(tmpOutDir, "snake-case-snap.json");
    fs.writeFileSync(snapPath, JSON.stringify(makeSnapshot()), "utf8");
    const res = await invoke("lathe_training_corpus_status", { snapshot_path: snapPath });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    const families = data.families as Array<{ family: string; count: number }>;
    const wafer = families.find((f) => f.family === "wafer-insert");
    expect(wafer?.count).toBe(12);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// lathe_training_template_match

describe("lathe_training_template_match", () => {
  it("returns success:true with a written template file for wafer-insert", async () => {
    const res = await invoke("lathe_training_template_match", {
      family: "wafer-insert",
      snapshot: makeSnapshot(),
    });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.family).toBe("wafer-insert");
    const writtenTo = data.written_to as string;
    expect(writtenTo).toContain("wafer-insert.json");
    expect(fs.existsSync(writtenTo)).toBe(true);
  });

  it("respects dryRun and does NOT write a file when dryRun:true", async () => {
    const res = await invoke("lathe_training_template_match", {
      family: "casing",
      snapshot: makeSnapshot(),
      dryRun: true,
    });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    // Engine returns written_to:null in dry-run; transport's slimResponse strips
    // null fields (responseSlimmer.ts:23), so written_to is undefined after wire.
    // The real safety invariant is "no file written" — assert that directly.
    expect(data.written_to == null).toBe(true);
    expect(fs.existsSync(path.join(tmpOutDir, "casing.json"))).toBe(false);
  });

  it("accepts snake_case dry_run alias", async () => {
    const res = await invoke("lathe_training_template_match", {
      family: "casing-counterbore",
      snapshot: makeSnapshot(),
      dry_run: true,
    });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.written_to == null).toBe(true);
    expect(fs.existsSync(path.join(tmpOutDir, "casing-counterbore.json"))).toBe(false);
  });

  it("surfaces engine ok:false (unknown_family) as dispatcher success:false", async () => {
    const res = await invoke("lathe_training_template_match", {
      family: "not-a-real-family",
      snapshot: makeSnapshot(),
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("unknown_family");
    expect(res.family).toBe("not-a-real-family");
  });

  it("surfaces engine ok:false (outdir_escape) when path-traversal guard fires", async () => {
    // Re-enable confined mode and point outDir outside the confine root —
    // engine's guard at LathePartFamilyTemplateExtractorEngine.ts:579-590 must reject.
    delete process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED;
    const escape = path.resolve(tmpOutDir, "../escape-target");
    const res = await invoke("lathe_training_template_match", {
      family: "wafer-insert",
      snapshot: makeSnapshot(),
      outDir: escape,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("outdir_escape");
    expect(fs.existsSync(escape)).toBe(false);
    // Re-mute confined mode for afterEach cleanup symmetry.
    process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED = "1";
  });
});

// ───────────────────────────────────────────────────────────────────────────
// lathe_training_template_list

describe("lathe_training_template_list", () => {
  it("returns success:true and an empty list for a fresh tmpdir", async () => {
    const res = await invoke("lathe_training_template_list", { dir: tmpOutDir });
    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.dir).toBe(tmpOutDir);
    // Engine returns templates:[] for an empty dir; transport's slimResponse
    // strips empty arrays (responseSlimmer.ts:24), so templates is undefined
    // after wire. Accept both shapes — semantic intent is "zero entries".
    const templates = (data.templates as unknown[] | undefined) ?? [];
    expect(templates.length).toBe(0);
  });

  it("lists a template that was just written through the match action", async () => {
    // Step 1: write via the match action.
    const writeRes = await invoke("lathe_training_template_match", {
      family: "wafer-insert",
      snapshot: makeSnapshot(),
      outDir: tmpOutDir,
    });
    expect(writeRes.success).toBe(true);
    // Step 2: list and confirm the entry shows up with the expected shape.
    const listRes = await invoke("lathe_training_template_list", { dir: tmpOutDir });
    expect(listRes.success).toBe(true);
    const data = listRes.data as Record<string, unknown>;
    const templates = data.templates as Array<Record<string, unknown>>;
    expect(templates.length).toBe(1);
    expect(templates[0].family).toBe("wafer-insert");
    expect(templates[0].path).toContain("wafer-insert.json");
    expect(typeof templates[0].size_bytes).toBe("number");
    expect((templates[0].size_bytes as number) > 0).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Discoverability — anti-regression on the action enum.
// If a future edit drops one of these enum entries, schema validation will
// reject the call with a Zod "invalid_enum_value" error — assert each
// action is reachable through the dispatcher.

describe("training action discoverability", () => {
  it("rejects garbage actions but routes the three new training actions", async () => {
    // Garbage action — the dispatcher's switch-default branch sets
    // `result = { error: "Unknown action: ..." }` (turningDispatcher.ts:1063),
    // NOT `success:false`. Assert the actual rejection shape.
    const bad = await invoke("lathe_training_definitely_not_an_action", {});
    expect(typeof bad.error === "string" && (bad.error as string).includes("Unknown action")).toBe(true);
    expect(bad.success).not.toBe(true);

    // Each of the three real actions must be routable (any call shape that
    // doesn't trigger Zod is sufficient; we only assert the action was NOT
    // rejected for being unknown).
    const corpus = await invoke("lathe_training_corpus_status", { snapshot: makeSnapshot() });
    expect(corpus).toHaveProperty("success");

    const matchRes = await invoke("lathe_training_template_match", {
      family: "shaft",
      snapshot: makeSnapshot(),
      dryRun: true,
    });
    expect(matchRes).toHaveProperty("success");

    const listRes = await invoke("lathe_training_template_list", { dir: tmpOutDir });
    expect(listRes).toHaveProperty("success");
  });
});
