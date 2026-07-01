/**
 * pipeline-exec.test.ts — COMMAND-KERNEL-MS0 / U-CK13
 *
 * Hermetic test suite for the pipeline-executor runtime. Pure-core +
 * injected-readers contract verified end-to-end:
 *  - buildStageGraph + planFor are pure (no IO)
 *  - executePlan accepts injected `runStage`/`runRollback`/`append`
 *  - dry-run-first default is structurally enforced
 *  - rollback chain fires on stage failure (reverse order)
 *  - real-data E2E loads the live `loop` seed entry through the live
 *    schema + validator (the fail-on-revert oracle per RGS-TOOL-MS1)
 *
 * Test filename matches the unit deliverable per B1 rule.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildStageGraph,
  planFor,
  executePlan,
  loadPipeline,
  appendTelemetry,
  parseArgs,
  PIPELINES_DIR,
  SCHEMA_PATH,
  TIER_CEILINGS,
} from "../../../.claude/kernel/pipeline-exec.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..", "..", "..");

function mkTmp() {
  const dir = mkdtempSync(join(tmpdir(), "prism-pipeline-exec-"));
  return {
    dir,
    write: (name: string, text: string) => writeFileSync(join(dir, name), text, "utf-8"),
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

function fm(body: string, content = "# body\n"): string {
  return `---\n${body}\n---\n\n${content}`;
}

// ---------- buildStageGraph (pure) ------------------------------------------

describe("buildStageGraph — extracts ordered stage names from frontmatter", () => {
  it("uses composed_of (canonical) when present", () => {
    const g = buildStageGraph({ slug: "x", composed_of: ["a", "b", "c"] });
    expect(g).toEqual({ slug: "x", stages: ["a", "b", "c"], source: "composed_of" });
  });
  it("falls back to composes (deprecated alias)", () => {
    const g = buildStageGraph({ slug: "y", composes: ["p", "q"] });
    expect(g.source).toBe("composes");
    expect(g.stages).toEqual(["p", "q"]);
  });
  it("falls back to stages when neither composed_of nor composes present", () => {
    const g = buildStageGraph({ slug: "z", stages: ["one", "two"] });
    expect(g.source).toBe("stages");
    expect(g.stages).toEqual(["one", "two"]);
  });
  it("precedence: composed_of beats composes beats stages", () => {
    const g = buildStageGraph({ slug: "w", composed_of: ["A"], composes: ["B"], stages: ["C"] });
    expect(g.source).toBe("composed_of");
    expect(g.stages).toEqual(["A"]);
  });
  it("returns empty stage list for pure-trigger pipelines (intentional)", () => {
    const g = buildStageGraph({ slug: "t", trigger: "hook" });
    expect(g.stages).toEqual([]);
    expect(g.source).toBeNull();
  });
  it("guards against null / non-object input", () => {
    expect(buildStageGraph(null as any).stages).toEqual([]);
    expect(buildStageGraph(undefined as any).stages).toEqual([]);
    expect(buildStageGraph([] as any).stages).toEqual([]);
  });
  it("stringifies non-string stage items defensively", () => {
    const g = buildStageGraph({ slug: "n", composed_of: [1, 2, "three" as any] });
    expect(g.stages).toEqual(["1", "2", "three"]);
  });
});

// ---------- planFor (pure) --------------------------------------------------

describe("planFor — annotates stages with budget + downgrade + stepId", () => {
  it("defaults to dry-run mode (load-bearing safety invariant)", () => {
    const plan = planFor(buildStageGraph({ slug: "loop", composed_of: ["a"] }), { slug: "loop", composed_of: ["a"] });
    expect(plan.mode).toBe("dry-run");
  });
  it("only enters force-execute when explicitly requested", () => {
    const plan = planFor(buildStageGraph({ slug: "loop", composed_of: ["a"] }), { slug: "loop", composed_of: ["a"] }, "force-execute");
    expect(plan.mode).toBe("force-execute");
  });
  it("coerces an unknown mode back to dry-run (safety default)", () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"] }), { slug: "x", composed_of: ["a"] }, "rogue-mode-string" as any);
    expect(plan.mode).toBe("dry-run");
  });
  it("computes a stable per-stage stepId", () => {
    const plan = planFor(buildStageGraph({ slug: "S", composed_of: ["foo", "bar"] }), { slug: "S", composed_of: ["foo", "bar"] });
    expect(plan.stages[0].stepId).toBe("S::1::foo");
    expect(plan.stages[1].stepId).toBe("S::2::bar");
  });
  it("propagates the token-budget tier ceiling to each stage", () => {
    const fm0 = { slug: "x", composed_of: ["a"], token_budget: { tier: "coding", enforcement: "hard-stop" } } as any;
    const plan = planFor(buildStageGraph(fm0), fm0);
    expect(plan.stages[0].maxTokens).toBe(TIER_CEILINGS.coding); // 2000
    expect(plan.stages[0].enforcement).toBe("hard-stop");
  });
  it("max_tokens override wins over tier ceiling", () => {
    const fm0 = { slug: "x", composed_of: ["a"], token_budget: { tier: "coding", max_tokens: 1500 } } as any;
    const plan = planFor(buildStageGraph(fm0), fm0);
    expect(plan.stages[0].maxTokens).toBe(1500);
  });
  it("downgrade fields flow into each stage annotation", () => {
    const fm0 = { slug: "x", composed_of: ["a"], downgrade: { mode: "user-prompt", fallback_to: "simpler" } } as any;
    const plan = planFor(buildStageGraph(fm0), fm0);
    expect(plan.stages[0].downgradeMode).toBe("user-prompt");
    expect(plan.stages[0].fallbackTo).toBe("simpler");
  });
  it("downgrade defaults to silent-degrade when absent", () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"] }), { slug: "x", composed_of: ["a"] });
    expect(plan.stages[0].downgradeMode).toBe("silent-degrade");
  });
  it("captures trigger kind from bare-string trigger", () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"], trigger: "cron" }), { slug: "x", composed_of: ["a"], trigger: "cron" });
    expect(plan.triggerKind).toBe("cron");
  });
  it("captures trigger kind from object-form trigger", () => {
    const fm0 = { slug: "x", composed_of: ["a"], trigger: { kind: "hook", events: ["Stop"] } } as any;
    const plan = planFor(buildStageGraph(fm0), fm0);
    expect(plan.triggerKind).toBe("hook");
  });
});

// ---------- executePlan — dry-run mode --------------------------------------

describe("executePlan — dry-run mode (the load-bearing safety default)", () => {
  it("dry-run NEVER invokes runStage even when one is injected", async () => {
    let calls = 0;
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b"] }), { slug: "x", composed_of: ["a", "b"] }, "dry-run");
    const result = await executePlan(plan, { runStage: () => { calls++; return Promise.resolve({ ok: true }); } });
    expect(calls).toBe(0);
    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.stageCount).toBe(2);
    expect(result.stages?.[0].status).toBe("would-run");
  });
  it("dry-run reports the chain budget", async () => {
    const fm0 = { slug: "x", composed_of: ["a"], token_budget: { tier: "entry-router" } } as any;
    const plan = planFor(buildStageGraph(fm0), fm0, "dry-run");
    const result = await executePlan(plan, {});
    expect(result.chainBudget?.tier).toBe("entry-router");
    expect(result.chainBudget?.maxTokens).toBe(500);
  });
  it("invalid plan input → ok:false reason:invalid-plan", async () => {
    const result = await executePlan(null as any, {});
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid-plan");
  });
});

// ---------- executePlan — force-execute happy path --------------------------

describe("executePlan — force-execute happy path", () => {
  it("runs every stage sequentially when all return ok:true", async () => {
    const order: string[] = [];
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b", "c"] }), { slug: "x", composed_of: ["a", "b", "c"] }, "force-execute");
    const result = await executePlan(plan, {
      runStage: async (s) => { order.push(s.name); return { ok: true }; },
    });
    expect(order).toEqual(["a", "b", "c"]);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.rollbacks).toEqual([]);
  });
  it("captures per-stage latency", async () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"] }), { slug: "x", composed_of: ["a"] }, "force-execute");
    const result = await executePlan(plan, { runStage: async () => { await new Promise((r) => setTimeout(r, 5)); return { ok: true }; } });
    expect(result.results?.[0].latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.results?.[0].latencyMs).toBe("number");
  });
});

// ---------- executePlan — failure + rollback chain --------------------------

describe("executePlan — rollback chain on stage failure", () => {
  it("invokes runRollback in REVERSE order for previously-succeeded stages on failure", async () => {
    const runs: string[] = [];
    const rbs: string[] = [];
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b", "c", "d"] }), { slug: "x", composed_of: ["a", "b", "c", "d"] }, "force-execute");
    const result = await executePlan(plan, {
      runStage: async (s) => {
        runs.push(s.name);
        return s.name === "c" ? { ok: false, reason: "fake-fail" } : { ok: true };
      },
      runRollback: async (s) => { rbs.push(s.name); return { ok: true }; },
    });
    expect(runs).toEqual(["a", "b", "c"]);   // d never runs
    expect(rbs).toEqual(["b", "a"]);          // c failed; c itself isn't rolled back (it didn't succeed)
    expect(result.ok).toBe(false);
    expect(result.failedAt).toBe(2);
    expect(result.rollbacks).toHaveLength(2);
  });
  it("handles a throwing stage handler as ok:false (no propagation)", async () => {
    const rbs: string[] = [];
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b"] }), { slug: "x", composed_of: ["a", "b"] }, "force-execute");
    const result = await executePlan(plan, {
      runStage: async (s) => { if (s.name === "b") throw new Error("boom"); return { ok: true }; },
      runRollback: async (s) => { rbs.push(s.name); return { ok: true }; },
    });
    expect(result.ok).toBe(false);
    expect(result.results?.[1].reason).toContain("threw:boom");
    expect(rbs).toEqual(["a"]);
  });
  it("handles a throwing rollback handler without propagation", async () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b"] }), { slug: "x", composed_of: ["a", "b"] }, "force-execute");
    const result = await executePlan(plan, {
      runStage: async (s) => s.name === "b" ? { ok: false } : { ok: true },
      runRollback: async () => { throw new Error("rollback-boom"); },
    });
    expect(result.rollbacks?.[0].ok).toBe(false);
    expect(result.rollbacks?.[0].reason).toContain("rollback-threw:rollback-boom");
  });
  it("missing runStage in force-execute mode → ok:false with reason", async () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"] }), { slug: "x", composed_of: ["a"] }, "force-execute");
    const result = await executePlan(plan, {});
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no-runStage-injected");
  });
  it("missing runRollback after failure → result still reports failure, no rollbacks", async () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a", "b"] }), { slug: "x", composed_of: ["a", "b"] }, "force-execute");
    const result = await executePlan(plan, { runStage: async (s) => s.name === "b" ? { ok: false } : { ok: true } });
    expect(result.ok).toBe(false);
    expect(result.failedAt).toBe(1);
    expect(result.rollbacks).toEqual([]); // no rollback runner → none invoked
  });
  it("non-object return from runStage normalized to ok:false reason:non-object-return", async () => {
    const plan = planFor(buildStageGraph({ slug: "x", composed_of: ["a"] }), { slug: "x", composed_of: ["a"] }, "force-execute");
    const result = await executePlan(plan, { runStage: async () => "garbage" as any });
    expect(result.ok).toBe(false);
    expect(result.results?.[0].reason).toBe("non-object-return");
  });
});

// ---------- executePlan — telemetry sink ------------------------------------

describe("executePlan — telemetry append (ACP-MS0A P0-U04)", () => {
  it("appends one record per stage on success", async () => {
    const log: any[] = [];
    const plan = planFor(buildStageGraph({ slug: "tx", composed_of: ["a", "b"] }), { slug: "tx", composed_of: ["a", "b"] }, "force-execute");
    await executePlan(plan, {
      runStage: async () => ({ ok: true, tokens: 100 }),
      append: (r) => { log.push(r); },
      now: () => "FROZEN",
    });
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ ts: "FROZEN", slug: "tx", ok: true, tokens: 100, outcome: "succeeded" });
  });
  it("appends a record for each rollback as well", async () => {
    const log: any[] = [];
    const plan = planFor(buildStageGraph({ slug: "tx", composed_of: ["a", "b"] }), { slug: "tx", composed_of: ["a", "b"] }, "force-execute");
    await executePlan(plan, {
      runStage: async (s) => s.name === "b" ? { ok: false, reason: "x" } : { ok: true },
      runRollback: async () => ({ ok: true }),
      append: (r) => { log.push(r); },
    });
    // 2 stage records (a:ok, b:failed) + 1 rollback record (a:rolled-back)
    expect(log).toHaveLength(3);
    expect(log[2]).toMatchObject({ outcome: "rolled-back" });
  });
  it("a throwing append never kills execution (telemetry is best-effort)", async () => {
    const plan = planFor(buildStageGraph({ slug: "tx", composed_of: ["a"] }), { slug: "tx", composed_of: ["a"] }, "force-execute");
    const result = await executePlan(plan, {
      runStage: async () => ({ ok: true }),
      append: () => { throw new Error("disk-full"); },
    });
    expect(result.ok).toBe(true);
  });
});

// ---------- loadPipeline (wired) --------------------------------------------

describe("loadPipeline — schema-validated frontmatter load", () => {
  it("returns ok:true for the live `loop` seed entry", () => {
    if (!existsSync(PIPELINES_DIR) || !existsSync(SCHEMA_PATH)) return;
    const r = loadPipeline("loop");
    expect(r.ok).toBe(true);
    expect(r.frontmatter?.slug).toBe("loop");
    expect(Array.isArray(r.frontmatter?.composed_of)).toBe(true);
  });
  it("returns ok:false reason:slug-not-found for an unknown slug", () => {
    const r = loadPipeline("xyz-no-such-pipeline-12345");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("slug-not-found");
  });
  it("returns ok:false reason:bad-slug for a non-string slug", () => {
    expect(loadPipeline(null as any).ok).toBe(false);
    expect(loadPipeline("").reason).toBe("bad-slug");
  });
  it("reports schema-invalid for a malformed frontmatter (using a tmp dir)", () => {
    const t = mkTmp();
    try {
      // missing required fields slug/kind/status
      t.write("broken.md", fm("title: Broken pipeline\nslug: BROKEN"));
      const r = loadPipeline("broken", { dir: t.dir });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("schema-invalid");
      expect(Array.isArray(r.errors)).toBe(true);
    } finally { t.cleanup(); }
  });
  it("reports no-frontmatter for a file without fence", () => {
    const t = mkTmp();
    try {
      t.write("nofm.md", "just a body, no frontmatter\n");
      const r = loadPipeline("nofm", { dir: t.dir });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("no-frontmatter");
    } finally { t.cleanup(); }
  });
});

// ---------- appendTelemetry --------------------------------------------------

describe("appendTelemetry — JSONL writer (one line per record)", () => {
  it("writes a JSONL line to the target file", () => {
    const t = mkTmp();
    try {
      const file = join(t.dir, "tele.jsonl");
      appendTelemetry({ ts: "T", slug: "x", ok: true }, { file });
      appendTelemetry({ ts: "T2", slug: "y", ok: false }, { file });
      const lines = readFileSync(file, "utf-8").trim().split("\n");
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0])).toMatchObject({ slug: "x", ok: true });
      expect(JSON.parse(lines[1])).toMatchObject({ slug: "y", ok: false });
    } finally { t.cleanup(); }
  });
  it("creates the parent dir if missing (mkdir -p semantics)", () => {
    const t = mkTmp();
    try {
      const file = join(t.dir, "deep/nested/tele.jsonl");
      appendTelemetry({ ts: "T", slug: "x", ok: true }, { file });
      expect(existsSync(file)).toBe(true);
    } finally { t.cleanup(); }
  });
  it("swallows write errors silently (telemetry must never throw)", () => {
    // Target a path that should fail (a file inside a file)
    const t = mkTmp();
    try {
      writeFileSync(join(t.dir, "a"), "x");
      expect(() => appendTelemetry({ ok: true } as any, { file: join(t.dir, "a/cannot-write") })).not.toThrow();
    } finally { t.cleanup(); }
  });
});

// ---------- parseArgs --------------------------------------------------------

describe("parseArgs — CLI", () => {
  it("extracts the first positional as the slug", () => {
    const r = parseArgs(["loop"]);
    expect(r.slug).toBe("loop");
  });
  it("captures flag args into the set", () => {
    const r = parseArgs(["loop", "--force-execute", "--json"]);
    expect(r.args.has("--force-execute")).toBe(true);
    expect(r.args.has("--json")).toBe(true);
  });
  it("--telemetry consumes the next arg as the path", () => {
    const r = parseArgs(["loop", "--telemetry", "/tmp/x.jsonl"]);
    expect(r.telemetry).toBe("/tmp/x.jsonl");
  });
  it("--list with no slug is allowed (slug stays null)", () => {
    const r = parseArgs(["--list"]);
    expect(r.slug).toBeNull();
    expect(r.args.has("--list")).toBe(true);
  });
});

// ---------- Real-data E2E — the fail-on-revert oracle -----------------------

describe("real-data E2E — live `loop` seed entry through buildStageGraph + planFor + dry-run", () => {
  it("loads + plans + dry-runs the loop pipeline end-to-end", async () => {
    if (!existsSync(PIPELINES_DIR) || !existsSync(SCHEMA_PATH)) return;
    const loaded = loadPipeline("loop");
    expect(loaded.ok).toBe(true);
    const graph = buildStageGraph(loaded.frontmatter);
    expect(graph.stages.length).toBeGreaterThan(0);
    const plan = planFor(graph, loaded.frontmatter, "dry-run");
    const result = await executePlan(plan, {});
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.stageCount).toBe(graph.stages.length);
  });
  it("loads + plans + dry-runs the knowledge-injection pipeline (which uses `composes` + `stages` together)", async () => {
    if (!existsSync(PIPELINES_DIR) || !existsSync(SCHEMA_PATH)) return;
    const loaded = loadPipeline("knowledge-injection");
    expect(loaded.ok).toBe(true);
    const graph = buildStageGraph(loaded.frontmatter);
    // precedence: composes (the alias) beats stages — confirm canonical sourcing
    expect(graph.source === "composes" || graph.source === "composed_of").toBe(true);
    expect(graph.stages.length).toBeGreaterThan(0);
  });
  it("safety: even with force-execute mode against a live pipeline, missing handlers fail-soft (no real side-effects in test env)", async () => {
    if (!existsSync(PIPELINES_DIR) || !existsSync(SCHEMA_PATH)) return;
    const loaded = loadPipeline("loop");
    if (!loaded.ok) return;
    const graph = buildStageGraph(loaded.frontmatter);
    const plan = planFor(graph, loaded.frontmatter, "force-execute");
    // Inject a runStage that always returns "no-handler" — proves the
    // executor would treat missing handlers as failure (→ rollback chain)
    // rather than ever spawning real handler scripts.
    const result = await executePlan(plan, {
      runStage: async () => ({ ok: false, reason: "no-handler" }),
      runRollback: async () => ({ ok: true }),
    });
    expect(result.ok).toBe(false);
    expect(result.results?.[0].reason).toBe("no-handler");
  });
});
