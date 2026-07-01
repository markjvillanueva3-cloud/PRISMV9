#!/usr/bin/env node
/**
 * pipeline-exec.mjs — PRISM Pipeline Executor
 *
 * COMMAND-KERNEL-MS0 / U-CK13 — the runtime for the U-CK12 pipeline
 * registry. Reads a pipeline entry's YAML frontmatter, builds a stage
 * graph, and executes it (or — by default — DRY-RUNS it). Per-stage
 * gating + rollback chain. Telemetry appended per ACP-MS0A P0-U04.
 *
 * ## Design contract (the unit's exit conditions)
 *  1. **stage graph + per-stage gating + rollback** — each stage in
 *     `composed_of` / `composes` / `stages` runs in order; a stage that
 *     fails triggers the rollback chain (prior stages' rollback handlers
 *     in REVERSE order). Failure semantics: stage handler returns
 *     `{ok:false}` OR throws.
 *  2. **dry-run-first** — `executePipeline({...})` defaults to
 *     `mode:"dry-run"`. To actually run stage handlers, the caller MUST
 *     pass `mode:"force-execute"` (CLI flag: `--force-execute`). This is
 *     a load-bearing safety invariant — until U-CK26 telemetry justifies
 *     auto-execution, every chain starts as a plan, never a side-effect.
 *  3. **fails soft** — a missing stage handler does NOT throw; the
 *     stage is reported as `{ok:false, reason:"no-handler"}` and the
 *     rollback chain triggers exactly as for any other failure.
 *
 * ## Architecture — pure core + injected readers (RGS-TOOL-MS1 lesson)
 *  - PURE:    `buildStageGraph(frontmatter)`, `planFor(graph, mode)`,
 *             `executePlan(plan, opts)` (deps via `opts.runStage` +
 *             `opts.runRollback` + `opts.append` injected; ZERO IO when
 *             those are functions).
 *  - WIRED:   `loadPipeline(slug)` reads disk + delegates to
 *             `validate-pipeline-registry.mjs` for schema-conformance.
 *             `appendTelemetry(record)` writes one JSONL line per fire.
 *             `runStageCli(stage)` is the default `runStage` for the CLI
 *             — execFile-spawns a stage script if it exists; otherwise
 *             returns `{ok:false, reason:"no-handler"}`.
 *
 * ## Token budget + downgrade (ACP-MS0A P0-U03 + P0-U05)
 *  Honored at the PLAN level — `planFor` annotates each stage with the
 *  per-chain budget ceiling + the downgrade mode pulled from the
 *  frontmatter. The runtime enforcement IS the operator/caller's
 *  responsibility (the executor cannot know the actual token cost of an
 *  arbitrary stage handler); the plan surfaces the contract so the
 *  caller routes correctly.
 *
 * ## CLI
 *   node .claude/kernel/pipeline-exec.mjs <slug> [--force-execute] [--json] [--telemetry <path>]
 *   node .claude/kernel/pipeline-exec.mjs --list
 *
 *  Examples:
 *   pipeline-exec.mjs loop                    # dry-run: prints plan
 *   pipeline-exec.mjs loop --force-execute    # actually run each stage
 *   pipeline-exec.mjs --list                  # registered pipelines
 *
 *  Exit codes: 0 = success (or dry-run report), 1 = pipeline failed
 *  (any stage `{ok:false}` after rollback completes), 2 = setup / IO
 *  error (slug unknown, schema invalid).
 *
 * @milestone COMMAND-KERNEL-MS0/U-CK13
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  extractFrontmatter,
  validate,
  computeAdvisoryWarnings,
  listPipelineFiles,
  STEPS_FIELDS,
} from "../../scripts/validate-pipeline-registry.mjs";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PIPELINES_DIR = path.join(REPO_ROOT, "knowledge/wiki/os/pipelines");
const SCHEMA_PATH = path.join(REPO_ROOT, ".claude/schemas/pipeline-frontmatter.schema.json");
const DEFAULT_TELEMETRY = path.join(REPO_ROOT, "state/shared/pipeline-telemetry.jsonl");

// Per-tier ceilings (ACP-MS0A P0-U05). Kept in sync with the validator's
// TIER_CEILINGS (the validator's `tier-budget-mismatch` warning is the
// drift detector). Documented in knowledge/wiki/os/pipelines/_schema.md.
const TIER_CEILINGS = { "entry-router": 500, "coding": 2000, "product-autopilot": 5000 };

// Stage-handler execution timeout (default CLI runStage). A stage that
// runs longer than this is treated as a failure → rollback chain fires.
const STAGE_HANDLER_TIMEOUT_MS = 30000;
// Snippet ceiling for handler stdout — keeps telemetry rows bounded.
const STDOUT_CAPTURE_BYTES = 2048;

// ---------- PURE: stage graph + plan -----------------------------------------

/**
 * Extract the ordered list of stage NAMES from a pipeline's frontmatter.
 * Precedence: composed_of > composes > stages (canonical first). Returns
 * `[]` for a pure-trigger pipeline (intentional per the U-CK12
 * `missing-steps-field` design choice).
 */
function buildStageGraph(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    return { slug: null, stages: [], source: null };
  }
  let stages = [];
  let source = null;
  for (const k of STEPS_FIELDS) {
    const v = frontmatter[k];
    if (Array.isArray(v) && v.length > 0) {
      stages = v.map((s) => (typeof s === "string" ? s : String(s)));
      source = k;
      break;
    }
  }
  return {
    slug: typeof frontmatter.slug === "string" ? frontmatter.slug : null,
    stages,
    source,
  };
}

/**
 * Build a plan from a stage graph + frontmatter — annotates each stage
 * with the per-chain token-budget ceiling + the downgrade mode + a
 * stable stepId. Pure; no IO.
 */
function planFor(graph, frontmatter, mode = "dry-run") {
  const safeMode = mode === "force-execute" ? "force-execute" : "dry-run";
  const fm = frontmatter && typeof frontmatter === "object" ? frontmatter : {};
  const tb = fm.token_budget && typeof fm.token_budget === "object" ? fm.token_budget : null;
  const ceiling = tb && typeof tb.tier === "string" ? TIER_CEILINGS[tb.tier] : null;
  const maxTokens = tb && typeof tb.max_tokens === "number" ? tb.max_tokens : ceiling;
  const enforcement = tb && typeof tb.enforcement === "string" ? tb.enforcement : "soft-warn";
  const downgrade = fm.downgrade && typeof fm.downgrade === "object" ? fm.downgrade : null;
  return {
    slug: graph.slug,
    mode: safeMode,
    stageSource: graph.source,
    stages: graph.stages.map((name, idx) => ({
      stepId: `${graph.slug || "anon"}::${idx + 1}::${name}`,
      index: idx,
      name,
      maxTokens: maxTokens,
      enforcement,
      downgradeMode: downgrade && typeof downgrade.mode === "string" ? downgrade.mode : "silent-degrade",
      fallbackTo: downgrade && typeof downgrade.fallback_to === "string" ? downgrade.fallback_to : null,
    })),
    chainBudget: { tier: tb?.tier || null, maxTokens, enforcement },
    triggerKind: typeof fm.trigger === "string" ? fm.trigger
      : (fm.trigger && typeof fm.trigger === "object" ? fm.trigger.kind : null),
    telemetryLedger: fm.telemetry && typeof fm.telemetry === "object" && typeof fm.telemetry.ledger === "string"
      ? fm.telemetry.ledger
      : null,
  };
}

/**
 * Execute a plan. PURE relative to the injected `opts` — `opts.runStage`,
 * `opts.runRollback`, and `opts.append` are dependency-injected for the
 * test harness; the CLI passes concrete impls.
 *
 *  - mode:"dry-run"        → never invokes `runStage`/`runRollback`;
 *                             returns the plan annotated with `dryRun:true`.
 *  - mode:"force-execute"  → invokes `runStage(stage, ctx)` for each
 *                             stage in order. Stage handlers return
 *                             `{ok:boolean, reason?, tokens?}` — on
 *                             `ok:false` OR throw, invokes the rollback
 *                             chain in REVERSE order via
 *                             `runRollback(stage, ctx)` for every
 *                             previously-succeeded stage. Returns
 *                             `{ok:false, failedAt:idx, results, rollbacks}`.
 *  - `opts.append`         → telemetry sink, invoked once per stage with
 *                             `{ts, slug, stepId, ok, tokens, latencyMs,
 *                              outcome}`. Optional. Errors swallowed.
 *
 * @param {object} plan   Output of planFor()
 * @param {object} opts   { runStage?, runRollback?, append?, now?, ctx? }
 * @returns {Promise<object>}
 */
async function executePlan(plan, opts = {}) {
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();
  const runStage = typeof opts.runStage === "function" ? opts.runStage : null;
  const runRollback = typeof opts.runRollback === "function" ? opts.runRollback : null;
  const append = typeof opts.append === "function" ? opts.append : null;
  const ctx = opts.ctx && typeof opts.ctx === "object" ? opts.ctx : {};
  if (!plan || !Array.isArray(plan.stages)) {
    return { ok: false, reason: "invalid-plan", results: [], rollbacks: [] };
  }
  // Dry-run: never invoke handlers; return the annotated plan.
  if (plan.mode !== "force-execute") {
    return {
      ok: true,
      dryRun: true,
      slug: plan.slug,
      stageCount: plan.stages.length,
      stages: plan.stages.map((s) => ({ ...s, status: "would-run" })),
      chainBudget: plan.chainBudget,
    };
  }
  // Force-execute: walk stages forward; on failure, walk back through
  // succeeded stages and invoke their rollbacks.
  if (!runStage) {
    return { ok: false, reason: "no-runStage-injected", results: [], rollbacks: [] };
  }
  const results = [];
  let failedAt = -1;
  for (let i = 0; i < plan.stages.length; i++) {
    const stage = plan.stages[i];
    const t0 = Date.now();
    let result;
    try {
      result = await runStage(stage, ctx);
    } catch (e) {
      result = { ok: false, reason: `threw:${e instanceof Error ? e.message : String(e)}` };
    }
    const latencyMs = Date.now() - t0;
    const normalized = (result && typeof result === "object")
      ? { ok: result.ok === true, reason: result.reason ?? null, tokens: typeof result.tokens === "number" ? result.tokens : null }
      : { ok: false, reason: "non-object-return", tokens: null };
    results.push({ ...stage, ...normalized, latencyMs });
    if (append) {
      try {
        append({
          ts: now(),
          slug: plan.slug,
          stepId: stage.stepId,
          ok: normalized.ok,
          tokens: normalized.tokens,
          latencyMs,
          outcome: normalized.ok ? "succeeded" : (normalized.reason || "failed"),
        });
      } catch { /* swallow telemetry errors — never let logging kill execution */ }
    }
    if (!normalized.ok) { failedAt = i; break; }
  }
  if (failedAt < 0) {
    return { ok: true, dryRun: false, slug: plan.slug, results, rollbacks: [] };
  }
  // Rollback chain: every PREVIOUSLY SUCCEEDED stage, in reverse order.
  const rollbacks = [];
  if (runRollback) {
    for (let i = failedAt - 1; i >= 0; i--) {
      const stage = plan.stages[i];
      let rbResult;
      try { rbResult = await runRollback(stage, ctx); }
      catch (e) { rbResult = { ok: false, reason: `rollback-threw:${e instanceof Error ? e.message : String(e)}` }; }
      const normalized = (rbResult && typeof rbResult === "object")
        ? { ok: rbResult.ok === true, reason: rbResult.reason ?? null }
        : { ok: false, reason: "non-object-return" };
      rollbacks.push({ stepId: stage.stepId, index: i, ...normalized });
      if (append) {
        try { append({ ts: now(), slug: plan.slug, stepId: stage.stepId, ok: normalized.ok, outcome: normalized.ok ? "rolled-back" : "rollback-failed" }); }
        catch { /* swallow */ }
      }
    }
  }
  return { ok: false, dryRun: false, slug: plan.slug, failedAt, results, rollbacks };
}

// ---------- WIRED: pipeline load + schema validation ------------------------

/**
 * Load a pipeline by slug. Walks PIPELINES_DIR (excluding `_*.md` /
 * dotfiles via the U-CK12 validator's exclusion rule), reads the
 * matching file, extracts frontmatter, validates against the schema.
 * Returns `{ok:true, slug, frontmatter, file}` or
 * `{ok:false, reason}` (NEVER throws).
 */
function loadPipeline(slug, opts = {}) {
  const dir = opts.dir || PIPELINES_DIR;
  const schemaPath = opts.schemaPath || SCHEMA_PATH;
  if (typeof slug !== "string" || !slug.length) {
    return { ok: false, reason: "bad-slug" };
  }
  let schema;
  try { schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8")); }
  catch (e) { return { ok: false, reason: `schema-unreadable:${e instanceof Error ? e.message : String(e)}` }; }
  const files = listPipelineFiles(dir);
  const file = files.find((f) => path.basename(f, ".md") === slug);
  if (!file) return { ok: false, reason: "slug-not-found", scanned: files.length };
  let content;
  try { content = fs.readFileSync(file, "utf-8"); }
  catch (e) { return { ok: false, reason: `read-failed:${e instanceof Error ? e.message : String(e)}` }; }
  const fm = extractFrontmatter(content);
  if (!fm) return { ok: false, reason: "no-frontmatter", file };
  const errs = validate(fm, schema, "$");
  if (errs.length) return { ok: false, reason: "schema-invalid", errors: errs, file };
  return { ok: true, slug, frontmatter: fm, file, warnings: computeAdvisoryWarnings(fm) };
}

/** Default `runStage` for the CLI — spawns a stage handler script if
 *  one exists at `.claude/kernel/handlers/<name>.mjs`; otherwise returns
 *  `{ok:false, reason:"no-handler"}`. Pure relative to the FS view via
 *  `opts.handlersDir` (test-injectable). */
async function runStageCli(stage, ctx = {}, opts = {}) {
  const handlersDir = opts.handlersDir || path.join(REPO_ROOT, ".claude/kernel/handlers");
  const handlerPath = path.join(handlersDir, `${stage.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.mjs`);
  if (!fs.existsSync(handlerPath)) return { ok: false, reason: "no-handler", handlerPath };
  try {
    const { stdout } = await execFileAsync(process.execPath, [handlerPath], { timeout: STAGE_HANDLER_TIMEOUT_MS });
    return { ok: true, stdout: String(stdout || "").slice(0, STDOUT_CAPTURE_BYTES) };
  } catch (e) {
    return { ok: false, reason: `handler-failed:${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Telemetry append — one JSONL line per stage event. Atomic-safe: a
 *  failed append never throws past the boundary (the executor's
 *  `append` invocation is already try/catch-wrapped). */
function appendTelemetry(record, opts = {}) {
  const file = opts.file || DEFAULT_TELEMETRY;
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf-8");
  } catch { /* swallow */ }
}

// ---------- CLI -------------------------------------------------------------

function parseArgs(argv) {
  let slug = null;
  const args = new Set();
  let telemetry = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--telemetry" && argv[i + 1]) { telemetry = argv[++i]; continue; }
    if (a.startsWith("--")) { args.add(a); continue; }
    if (!slug) slug = a;
  }
  return { slug, args, telemetry };
}

async function runCli(argv) {
  const { slug, args, telemetry } = parseArgs(argv);
  if (args.has("--list")) {
    const files = listPipelineFiles(PIPELINES_DIR).map((f) => path.basename(f, ".md")).sort();
    process.stdout.write(JSON.stringify({ ok: true, pipelines: files }, null, 2) + "\n");
    process.exit(0);
  }
  if (!slug) {
    process.stderr.write(`usage: pipeline-exec <slug> [--force-execute] [--json] [--telemetry <path>] | --list\n`);
    process.exit(2);
  }
  const loaded = loadPipeline(slug);
  if (!loaded.ok) {
    process.stderr.write(JSON.stringify({ ok: false, reason: loaded.reason, errors: loaded.errors }, null, 2) + "\n");
    process.exit(2);
  }
  const graph = buildStageGraph(loaded.frontmatter);
  const mode = args.has("--force-execute") ? "force-execute" : "dry-run";
  const plan = planFor(graph, loaded.frontmatter, mode);
  const append = (rec) => appendTelemetry(rec, { file: telemetry || DEFAULT_TELEMETRY });
  const result = await executePlan(plan, { runStage: runStageCli, append });
  if (args.has("--json")) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`pipeline ${slug} ${result.dryRun ? "DRY-RUN" : "EXECUTE"}: ${result.ok ? "ok" : "failed"}\n`);
    process.stdout.write(`  stages (${plan.stages.length}, source=${plan.stageSource}):\n`);
    for (const s of (result.stages || result.results || [])) {
      const status = s.status || (s.ok ? "ok" : `failed:${s.reason}`);
      process.stdout.write(`   ${String(s.index + 1).padStart(2, " ")}. ${s.name.padEnd(40)} ${status}\n`);
    }
    if (result.rollbacks && result.rollbacks.length) {
      process.stdout.write(`  rollbacks (${result.rollbacks.length}, REVERSE order):\n`);
      for (const rb of result.rollbacks) {
        process.stdout.write(`     ← ${rb.stepId} ${rb.ok ? "ok" : `failed:${rb.reason}`}\n`);
      }
    }
  }
  process.exit(result.ok ? 0 : 1);
}

// ---------- Exports (test surface) ------------------------------------------

export {
  buildStageGraph,
  planFor,
  executePlan,
  loadPipeline,
  runStageCli,
  appendTelemetry,
  parseArgs,
  PIPELINES_DIR,
  SCHEMA_PATH,
  DEFAULT_TELEMETRY,
  TIER_CEILINGS,
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`pipeline-exec fatal: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  });
}
