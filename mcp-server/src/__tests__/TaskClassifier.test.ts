/**
 * TaskClassifierEngine — rule-based classification tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / AUTO-CONSENSUS.
 *
 * Pure-function tests; no mocks. Asserts each task-type rule fires + the
 * trivial-vs-consensus-worthy split is sharp.
 */

import { describe, it, expect } from "vitest";
import {
  TaskClassifierEngine,
  taskClassifierEngine,
  type ClassifierInput,
} from "../engines/TaskClassifierEngine.js";

describe("TaskClassifierEngine — safety/physics (PRISM-specific)", () => {
  const c = new TaskClassifierEngine();

  it("kienzle prompt classifies as safety + consensus-worthy", () => {
    const r = c.classify({ prompt: "Validate kienzle force calculation for AISI 4340 at 200m/min" });
    expect(r.taskType).toBe("safety");
    expect(r.consensusWorthy).toBe(true);
  });

  it("Taylor tool life classifies as safety", () => {
    const r = c.classify({ prompt: "Update the Taylor tool life equation coefficients for SS316" });
    expect(r.taskType).toBe("safety");
  });

  it("S(x) safety gate classifies as safety", () => {
    const r = c.classify({ prompt: "Recompute S(x) safety gate threshold for tier-3 ops" });
    expect(r.taskType).toBe("safety");
  });

  it("cutting force classifies as safety", () => {
    const r = c.classify({ prompt: "Improve the cutting force model accuracy" });
    expect(r.taskType).toBe("safety");
  });
});

describe("TaskClassifierEngine — planning/architecture", () => {
  const c = new TaskClassifierEngine();

  it("'plan the migration' classifies as plan", () => {
    const r = c.classify({ prompt: "Plan the migration from json to jsonl format" });
    expect(r.taskType).toBe("plan");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'design the API' classifies as plan", () => {
    const r = c.classify({ prompt: "Design the API for the new caching layer" });
    expect(r.taskType).toBe("plan");
  });

  it("'best approach for X' classifies as plan", () => {
    const r = c.classify({ prompt: "What is the best approach for handling stale memory entries" });
    expect(r.taskType).toBe("plan");
  });

  it("'how should we structure' classifies as plan", () => {
    const r = c.classify({ prompt: "How should we structure the multi-tenant auth flow" });
    expect(r.taskType).toBe("plan");
  });
});

describe("TaskClassifierEngine — bug hunting", () => {
  const c = new TaskClassifierEngine();

  it("'debug why' classifies as bug", () => {
    const r = c.classify({ prompt: "Debug why the QdrantMemoryEngine fails on Windows paths" });
    expect(r.taskType).toBe("bug");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'not working' classifies as bug", () => {
    const r = c.classify({ prompt: "The auth middleware is not working after the refactor" });
    expect(r.taskType).toBe("bug");
  });

  it("'crashes on cold load' classifies as bug", () => {
    const r = c.classify({ prompt: "deepseek-r1:14b crashes on cold load when other models are running" });
    expect(r.taskType).toBe("bug");
  });

  it("'root cause' classifies as bug", () => {
    const r = c.classify({ prompt: "Find the root cause of the intermittent test failures in CI" });
    expect(r.taskType).toBe("bug");
  });
});

describe("TaskClassifierEngine — error handling", () => {
  const c = new TaskClassifierEngine();

  it("'error handling design' classifies as error or plan (both consensus-worthy)", () => {
    const r = c.classify({ prompt: "Design the error handling for the Codex subprocess timeout case" });
    expect(["error", "plan"]).toContain(r.taskType);
    expect(r.consensusWorthy).toBe(true);
  });

  it("'retry with backoff' classifies as error", () => {
    const r = c.classify({ prompt: "Add retry with backoff to the Ollama HTTP client" });
    expect(r.taskType).toBe("error");
  });
});

describe("TaskClassifierEngine — review", () => {
  const c = new TaskClassifierEngine();

  it("'review the diff' classifies as review", () => {
    const r = c.classify({ prompt: "Review the diff in mcp-server/src/engines for safety issues" });
    expect(r.taskType).toBe("review");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'audit the codebase for orphans' classifies as review or gap (both consensus-worthy)", () => {
    const r = c.classify({ prompt: "Audit the codebase for orphan engines unwired to dispatchers" });
    expect(["review", "gap"]).toContain(r.taskType);
    expect(r.consensusWorthy).toBe(true);
  });

  it("'second opinion' classifies as review", () => {
    const r = c.classify({ prompt: "Get a second opinion on this migration approach before merging" });
    expect(r.taskType).toBe("review");
  });
});

describe("TaskClassifierEngine — test", () => {
  const c = new TaskClassifierEngine();

  it("'write a test' classifies as test", () => {
    const r = c.classify({ prompt: "Write a test that exercises the failure path of the dispatcher" });
    expect(r.taskType).toBe("test");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'missing test coverage' classifies as test", () => {
    const r = c.classify({ prompt: "Identify missing test coverage in the OllamaClientEngine module" });
    expect(r.taskType).toBe("test");
  });
});

describe("TaskClassifierEngine — gap", () => {
  const c = new TaskClassifierEngine();

  it("'gap analysis' classifies as gap", () => {
    const r = c.classify({ prompt: "Run a gap analysis on the WEDM engine wiring against the canonical roadmap" });
    expect(r.taskType).toBe("gap");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'whats missing' classifies as gap", () => {
    const r = c.classify({ prompt: "What's missing from the consensus pipeline?" });
    expect(r.taskType).toBe("gap");
  });

  it("'orphan engines' classifies as gap", () => {
    const r = c.classify({ prompt: "Find any orphan engines that no dispatcher references" });
    expect(r.taskType).toBe("gap");
  });
});

describe("TaskClassifierEngine — validate", () => {
  const c = new TaskClassifierEngine();

  it("'validate the build' classifies as validate", () => {
    const r = c.classify({ prompt: "Validate the build is production-ready before we ship" });
    expect(r.taskType).toBe("validate");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'pre-ship check' classifies as validate", () => {
    const r = c.classify({ prompt: "Run a pre-ship check on the milestone deliverables" });
    expect(r.taskType).toBe("validate");
  });
});

describe("TaskClassifierEngine — build/code", () => {
  const c = new TaskClassifierEngine();

  it("'implement the new feature' classifies as build", () => {
    const r = c.classify({ prompt: "Implement the new caching feature for the dispatcher response" });
    expect(r.taskType).toBe("build");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'refactor X to Y' classifies as build", () => {
    const r = c.classify({ prompt: "Refactor OllamaClientEngine to support streaming responses" });
    expect(r.taskType).toBe("build");
  });
});

describe("TaskClassifierEngine — reason (deep thinking)", () => {
  const c = new TaskClassifierEngine();

  it("'think deeply' classifies as reason", () => {
    const r = c.classify({ prompt: "Think deeply about the tradeoffs of putting consensus on every prompt versus only safety prompts" });
    expect(r.taskType).toBe("reason");
    expect(r.consensusWorthy).toBe(true);
  });

  it("'chain of thought' classifies as reason", () => {
    const r = c.classify({ prompt: "Use chain of thought to derive the correct schema migration sequence" });
    expect(r.taskType).toBe("reason");
  });
});

describe("TaskClassifierEngine — trivial (NOT consensus-worthy)", () => {
  const c = new TaskClassifierEngine();

  it("explicit [no-consensus] opt-out", () => {
    const r = c.classify({ prompt: "Refactor the auth flow [no-consensus] just do it" });
    expect(r.taskType).toBe("trivial");
    expect(r.consensusWorthy).toBe(false);
  });

  it("[skip-consensus] opt-out", () => {
    const r = c.classify({ prompt: "Plan the entire migration [skip-consensus]" });
    expect(r.consensusWorthy).toBe(false);
  });

  it("[trivial] opt-out", () => {
    const r = c.classify({ prompt: "Add a debug log [trivial]" });
    expect(r.consensusWorthy).toBe(false);
  });

  it("very short prompt (<20 chars) classifies as trivial", () => {
    const r = c.classify({ prompt: "fix typo" });
    expect(r.taskType).toBe("trivial");
    expect(r.consensusWorthy).toBe(false);
  });

  it("'fix the typo in X' classifies as trivial", () => {
    const r = c.classify({ prompt: "fix the typo in the comment of foo.ts" });
    expect(r.taskType).toBe("trivial");
    expect(r.consensusWorthy).toBe(false);
  });

  it("simple lookup question classifies as trivial", () => {
    const r = c.classify({ prompt: "What is the kc1.1 value for ISO group P?" });
    // single-sentence question pattern wins over safety/physics keyword
    expect(r.consensusWorthy).toBe(false);
  });
});

describe("TaskClassifierEngine — fallback default + validation", () => {
  const c = new TaskClassifierEngine();

  it("free-form prompt with no rule matches defaults to consensus-worthy build", () => {
    const r = c.classify({ prompt: "this prompt has no specific keyword that matches any rule pattern xyz" });
    expect(r.taskType).toBe("build");
    expect(r.consensusWorthy).toBe(true);
    expect(r.matchedRules).toContain("default-build");
  });

  it("rejects null input", () => {
    expect(() => c.classify(null as unknown as ClassifierInput)).toThrow(/ClassifierInput required/);
  });

  it("rejects non-string prompt", () => {
    expect(() => c.classify({ prompt: 123 as unknown as string })).toThrow(/prompt must be a string/);
  });

  it("singleton works identically to fresh instance", () => {
    const a = taskClassifierEngine.classify({ prompt: "Plan the migration" });
    const b = new TaskClassifierEngine().classify({ prompt: "Plan the migration" });
    expect(a).toEqual(b);
  });
});
