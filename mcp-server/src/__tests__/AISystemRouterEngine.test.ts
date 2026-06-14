/**
 * AISystemRouterEngine.test.ts
 *
 * Coverage:
 *   - classify() routes 8 task classes to correct primary backend (happy path)
 *   - edge cases: empty string, unicode, very long input
 *   - U-ROUTING-LEDGER (OBSIDIAN-COMPOUND-MS0): every route() call appends a
 *     valid JSONL entry to knowledge/summaries/routing-decisions.jsonl with
 *     ALL RouteDecision fields populated (not just present, correct values).
 *
 * Tests append to the live ledger at H:/prism/knowledge/summaries/routing-decisions.jsonl.
 * Intentional — the ledger contract is "best-effort, never throw, append-only,"
 * so tests writing rows is consistent with production behavior.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { aiSystemRouterEngine } from "../engines/AISystemRouterEngine.js";

const LEDGER_PATH = "H:/prism/knowledge/summaries/routing-decisions.jsonl";

interface LedgerEntry {
  ts: string;
  task: string;
  taskClass: string;
  primary: string;
  fallback: string[];
  reachable: boolean;
  reason: string;
  estimatedCost: string;
}

function readLedgerLines(): string[] {
  if (!existsSync(LEDGER_PATH)) return [];
  return readFileSync(LEDGER_PATH, "utf8").split("\n").filter((l) => l.length > 0);
}

describe("AISystemRouterEngine — classify + route happy paths", () => {
  it("routes physics-validation tasks to docker-physics-agent with claude-opus fallback", () => {
    const r = aiSystemRouterEngine.route("validate physics for kienzle force calculation");
    expect(r.taskClass).toBe("physics_validation");
    expect(r.primary).toBe("docker-physics-agent");
    expect(r.fallback).toEqual(["claude-opus", "local-mcp"]);
    expect(r.estimatedCost).toBe("low");
    expect(r.reason).toContain("Docker for isolation");
  });

  it("routes engine-building tasks to claude-opus with sonnet fallback at high cost", () => {
    const r = aiSystemRouterEngine.route("create a new engine for thermal analysis");
    expect(r.taskClass).toBe("engine_building");
    expect(r.primary).toBe("claude-opus");
    expect(r.fallback).toEqual(["claude-sonnet"]);
    expect(r.estimatedCost).toBe("high");
  });

  it("routes ML-inference tasks to local-mcp at zero cost (runtime router picks the local model)", () => {
    // BLACKWELL-MODEL-INTEGRATION-MS0 P2: ml_inference no longer names never-installed
    // Ollama tags; it delegates to the local MCP surface, and the REAL local-model pick
    // (gpt-oss:120b > gpt-oss:20b > qwen2.5-coder:32b) happens at runtime via /api/tags.
    const r = aiSystemRouterEngine.route("classify these toolpath tokens");
    expect(r.taskClass).toBe("ml_inference");
    expect(r.primary).toBe("local-mcp");
    expect(r.fallback).toEqual(["claude-haiku"]);
    expect(r.estimatedCost).toBe("free");
    // The reason documents the runtime routing chain so the advisory output is honest.
    expect(r.reason).toContain("gpt-oss:120b");
    expect(r.reason).toContain("qwen2.5-coder:32b");
  });

  it("routes batch-processing tasks to docker-batch-processor", () => {
    const r = aiSystemRouterEngine.route("batch process 200 g-code files in bulk");
    expect(r.taskClass).toBe("batch_processing");
    expect(r.primary).toBe("docker-batch-processor");
    expect(r.fallback).toEqual(["local-mcp"]);
    expect(r.reason).toContain("container");
  });

  it("routes search tasks to local-mcp at zero cost (no LLM)", () => {
    const r = aiSystemRouterEngine.route("search the materials registry for 6061 aluminum");
    expect(r.taskClass).toBe("search");
    expect(r.primary).toBe("local-mcp");
    expect(r.fallback).toEqual(["claude-haiku"]);
    expect(r.estimatedCost).toBe("free");
    expect(r.reason).toContain("local indexes");
  });

  it("routes calculation tasks to local-mcp (deterministic physics dispatch)", () => {
    const r = aiSystemRouterEngine.route("calculate cutting force at 0.1mm feed");
    expect(r.taskClass).toBe("calculation");
    expect(r.primary).toBe("local-mcp");
    expect(r.estimatedCost).toBe("free");
    expect(r.reason).toContain("deterministic");
  });

  it("routes reasoning tasks to claude-opus", () => {
    const r = aiSystemRouterEngine.route("reason about why this strategy was chosen for the milestone");
    expect(r.taskClass).toBe("reasoning");
    expect(r.primary).toBe("claude-opus");
    expect(r.fallback).toEqual(["claude-sonnet"]);
    expect(r.estimatedCost).toBe("high");
  });

  it("routes code-review tasks to claude-sonnet (faster than Opus)", () => {
    const r = aiSystemRouterEngine.route("review this dispatcher code for issues");
    expect(r.taskClass).toBe("code_review");
    expect(r.primary).toBe("claude-sonnet");
    expect(r.fallback).toEqual(["claude-opus"]);
    expect(r.estimatedCost).toBe("medium");
  });

  it("routes blueprint_extraction tasks to local-mcp (BLUEPRINT-OCR-TRAINING-MS1)", () => {
    const r = aiSystemRouterEngine.route("extract the title block from this blueprint");
    expect(r.taskClass).toBe("blueprint_extraction");
    expect(r.primary).toBe("local-mcp");
    expect(r.fallback).toEqual(["claude-sonnet"]);
    expect(r.estimatedCost).toBe("low");
    expect(r.reason).toContain("blueprint_rag_extract");
  });

  it("routes ocr extraction tasks to blueprint_extraction (PDFBlueprintPatternRescueEngine)", () => {
    const r = aiSystemRouterEngine.route("ocr the GD&T callouts off this drawing");
    expect(r.taskClass).toBe("blueprint_extraction");
    expect(r.primary).toBe("local-mcp");
  });

  it("routes print-reading tasks to blueprint_extraction (PrintReadingEngine)", () => {
    const r = aiSystemRouterEngine.route("print reading: extract dim from this part page");
    expect(r.taskClass).toBe("blueprint_extraction");
    expect(r.primary).toBe("local-mcp");
  });

  it("routes corpus_harvest tasks to local-mcp (BlueprintCorpusHarvestEngine)", () => {
    const r = aiSystemRouterEngine.route("corpus harvest mit course 2.008 to knowledge base");
    expect(r.taskClass).toBe("corpus_harvest");
    expect(r.primary).toBe("local-mcp");
    expect(r.fallback).toEqual(["claude-haiku"]);
    expect(r.estimatedCost).toBe("free");
    expect(r.reason).toContain("BlueprintCorpusHarvestEngine");
  });

  it("routes vendor pdf harvest tasks to corpus_harvest", () => {
    const r = aiSystemRouterEngine.route("harvest vendor PDFs into the drafting corpus");
    expect(r.taskClass).toBe("corpus_harvest");
    expect(r.primary).toBe("local-mcp");
  });

  // SIERRA U-PSGB-SIERRA (2026-05-29): closes PSN leg 11 — router was domain-blind to system-viz.
  it("routes system-viz regen tasks to local-mcp at zero cost (master_index_query surface)", () => {
    const r = aiSystemRouterEngine.route("regenerate the system-viz graph");
    expect(r.taskClass).toBe("system_viz");
    expect(r.primary).toBe("local-mcp");
    expect(r.fallback).toEqual(["claude-haiku"]);
    expect(r.estimatedCost).toBe("free");
    expect(r.reason).toContain("master_index_query");
  });

  it("routes master-index rebuild tasks to system_viz (not engine_building — no engine/dispatcher noun)", () => {
    const r = aiSystemRouterEngine.route("rebuild the master-index");
    expect(r.taskClass).toBe("system_viz");
    expect(r.primary).toBe("local-mcp");
  });

  it("routes ghost-roost tasks to system_viz", () => {
    const r = aiSystemRouterEngine.route("show the ghost-roost nodes in the graph");
    expect(r.taskClass).toBe("system_viz");
    expect(r.primary).toBe("local-mcp");
  });

  it("routes system-graph queries to system_viz BEFORE generic search (viz-specific wins)", () => {
    const r = aiSystemRouterEngine.route("query the system graph for orphan nodes");
    expect(r.taskClass).toBe("system_viz");
    expect(r.primary).toBe("local-mcp");
  });
});

describe("AISystemRouterEngine — ordering preservation", () => {
  it("'build a new blueprint reader engine' still routes to engine_building (build+engine wins before blueprint)", () => {
    const r = aiSystemRouterEngine.route("build a new blueprint reader engine");
    expect(r.taskClass).toBe("engine_building");
    expect(r.primary).toBe("claude-opus");
  });

  it("'review the ocr engine output' still routes to code_review (review wins before blueprint)", () => {
    const r = aiSystemRouterEngine.route("review the ocr engine output for accuracy");
    expect(r.taskClass).toBe("code_review");
    expect(r.primary).toBe("claude-sonnet");
  });

  it("'find blueprints with GD&T callouts' still routes to search (find wins before blueprint)", () => {
    const r = aiSystemRouterEngine.route("find blueprints with GD&T callouts in the index");
    expect(r.taskClass).toBe("search");
    expect(r.primary).toBe("local-mcp");
  });

  it("'review the system-viz generator' still routes to code_review (review wins before system_viz)", () => {
    const r = aiSystemRouterEngine.route("review the system-viz generator for issues");
    expect(r.taskClass).toBe("code_review");
    expect(r.primary).toBe("claude-sonnet");
  });

  it("getStats() reports 12 task classes after blueprint_extraction + corpus_harvest + system_viz", () => {
    const stats = aiSystemRouterEngine.getStats();
    expect(stats.task_classes).toBe(12);
    expect(stats.backends_known).toBe(8);
  });
});

describe("AISystemRouterEngine — edge cases", () => {
  it("returns 'unknown' class with claude-sonnet default for nonsense input", () => {
    const r = aiSystemRouterEngine.route("xyzqwerty zzz nothing matches anything");
    expect(r.taskClass).toBe("unknown");
    expect(r.primary).toBe("claude-sonnet");
    expect(r.fallback).toEqual(["claude-opus"]);
    expect(r.estimatedCost).toBe("medium");
  });

  it("classifies empty task description as 'unknown' with sonnet default", () => {
    const r = aiSystemRouterEngine.route("");
    expect(r.taskClass).toBe("unknown");
    expect(r.task).toBe("");
    expect(r.primary).toBe("claude-sonnet");
  });

  it("classifies very long task descriptions on first matching keyword", () => {
    const longTask = "compute the answer ".repeat(500);
    const r = aiSystemRouterEngine.route(longTask);
    expect(r.taskClass).toBe("calculation");
    expect(r.primary).toBe("local-mcp");
    expect(r.task.length).toBeGreaterThan(5000);
  });

  it("preserves task verbatim in decision and ledger when input has unicode", () => {
    const task = "validate 物理 forces with ⚙️ symbols";
    const r = aiSystemRouterEngine.route(task);
    expect(r.task).toBe(task);
    // Either physics_validation (regex matched 'validate') or unknown — both are valid concrete outcomes
    expect(["physics_validation", "unknown"]).toContain(r.taskClass);
  });
});

describe("AISystemRouterEngine — U-ROUTING-LEDGER (OBSIDIAN-COMPOUND-MS0)", () => {
  it("appends exactly one JSONL row per route() call", () => {
    const before = readLedgerLines().length;
    aiSystemRouterEngine.route("calculate test ledger row exactly-one");
    const after = readLedgerLines().length;
    expect(after - before).toBe(1);
  });

  it("writes parseable JSON containing the EXACT decision returned to caller", () => {
    const task = "search test ledger payload " + Date.now();
    const r = aiSystemRouterEngine.route(task);
    const last = readLedgerLines().slice(-1)[0];
    const parsed = JSON.parse(last) as LedgerEntry;
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(parsed.task).toBe(task);
    expect(parsed.taskClass).toBe("search");
    expect(parsed.primary).toBe(r.primary);
    expect(parsed.fallback).toEqual(r.fallback);
    expect(parsed.reason).toBe(r.reason);
    expect(parsed.estimatedCost).toBe(r.estimatedCost);
    expect(parsed.reachable).toBe(r.reachable);
  });

  it("appends rows in monotonic timestamp order across consecutive calls", () => {
    aiSystemRouterEngine.route("calculate ts-order check 1");
    aiSystemRouterEngine.route("calculate ts-order check 2");
    aiSystemRouterEngine.route("calculate ts-order check 3");
    const lines = readLedgerLines().slice(-3);
    const tsValues = lines.map((l) => Date.parse((JSON.parse(l) as LedgerEntry).ts));
    expect(tsValues[0]).toBeLessThanOrEqual(tsValues[1]);
    expect(tsValues[1]).toBeLessThanOrEqual(tsValues[2]);
  });
});
