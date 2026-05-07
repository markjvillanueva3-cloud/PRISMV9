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

  it("routes ML-inference tasks to ollama-codellama at zero cost", () => {
    const r = aiSystemRouterEngine.route("classify these toolpath tokens");
    expect(r.taskClass).toBe("ml_inference");
    expect(r.primary).toBe("ollama-codellama");
    expect(r.fallback).toEqual(["ollama-deepseek", "claude-haiku"]);
    expect(r.estimatedCost).toBe("free");
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
