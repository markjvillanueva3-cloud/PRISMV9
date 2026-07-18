// scripts/lib/hermes-workflow-planner.test.mjs — real-value tests for the Hermes
// Dynamic-Workflow planner. node:test. Every assertion checks a concrete plan
// decision against the 0xCodez article doctrine (Karpathy R9 — tests verify
// intent: WHY a pattern is selected, not just that a value is defined).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  PATTERNS, FAILURE_MODES, FAILURE_TO_PATTERN, MODEL, ANTI_PATTERNS,
  detectFailureModes, shouldUseWorkflow, matchUseCase, selectPatterns,
  patternToStage, planWorkflow, emitWorkflowScript,
} from "./hermes-workflow-planner.mjs";

// ── doctrine constants (article step 11 verbatim map) ────────────────────────
test("FAILURE_TO_PATTERN encodes the article's structural-fix map verbatim", () => {
  assert.equal(FAILURE_TO_PATTERN[FAILURE_MODES.GOAL_DRIFT], PATTERNS.FAN_OUT_SYNTHESIZE);
  assert.equal(FAILURE_TO_PATTERN[FAILURE_MODES.SELF_PREFERENTIAL_BIAS], PATTERNS.ADVERSARIAL_VERIFY);
  assert.equal(FAILURE_TO_PATTERN[FAILURE_MODES.OPEN_ENDED], PATTERNS.LOOP_UNTIL_DONE);
  assert.equal(FAILURE_TO_PATTERN[FAILURE_MODES.HARD_TO_SCORE], PATTERNS.TOURNAMENT);
});

// ── detectFailureModes ───────────────────────────────────────────────────────
test("detectFailureModes: empty / no signal → []", () => {
  assert.deepEqual(detectFailureModes({}), []);
  assert.deepEqual(detectFailureModes({ text: "add a button to the page" }), []);
});
test("detectFailureModes: 'review all 200 endpoints' → drift + self-preference", () => {
  const m = detectFailureModes({ text: "review all 200 endpoints for auth bugs" });
  assert.ok(m.includes(FAILURE_MODES.GOAL_DRIFT), "enumerable list → drift");
  assert.ok(m.includes(FAILURE_MODES.SELF_PREFERENTIAL_BIAS), "review → self-preference");
});
test("detectFailureModes: explicit itemCount≥10 → drift even without keywords", () => {
  assert.ok(detectFailureModes({ text: "process these", itemCount: 50 }).includes(FAILURE_MODES.GOAL_DRIFT));
});
test("detectFailureModes: 'keep finding bugs until none remain' → open-ended", () => {
  assert.ok(detectFailureModes({ text: "keep finding bugs until a full pass returns zero" }).includes(FAILURE_MODES.OPEN_ENDED));
});
test("detectFailureModes: ranking/taste → hard-to-score", () => {
  assert.ok(detectFailureModes({ text: "rank these 1000 product names by quality" }).includes(FAILURE_MODES.HARD_TO_SCORE));
  assert.ok(detectFailureModes({ needsRanking: true }).includes(FAILURE_MODES.HARD_TO_SCORE));
});
test("detectFailureModes: untrusted input → untrusted-input mode", () => {
  assert.ok(detectFailureModes({ text: "triage incoming support tickets" }).includes(FAILURE_MODES.UNTRUSTED_INPUT));
  assert.ok(detectFailureModes({ untrustedInput: true }).includes(FAILURE_MODES.UNTRUSTED_INPUT));
});
test("detectFailureModes: large multi-part task → agentic-laziness flagged", () => {
  const m = detectFailureModes({ text: "exhaustively review all 80 files until done", itemCount: 80 });
  assert.ok(m.includes(FAILURE_MODES.AGENTIC_LAZINESS), "≥30 items + open-ended → laziness risk");
});
test("detectFailureModes: explicit hints win over text", () => {
  // text looks trivial but caller knows it's heterogeneous + needs verification
  const m = detectFailureModes({ text: "do the thing", needsVerification: true });
  assert.ok(m.includes(FAILURE_MODES.SELF_PREFERENTIAL_BIAS));
});
test("detectFailureModes: output is stably doctrine-ordered", () => {
  const m = detectFailureModes({ text: "rank and verify all 50 items until done", itemCount: 50 });
  // drift before self-preference before laziness before open-ended before hard-to-score
  const idxDrift = m.indexOf(FAILURE_MODES.GOAL_DRIFT);
  const idxRank = m.indexOf(FAILURE_MODES.HARD_TO_SCORE);
  assert.ok(idxDrift >= 0 && idxRank >= 0 && idxDrift < idxRank, "stable order");
});

// ── shouldUseWorkflow (the step-12 gate) ─────────────────────────────────────
test("shouldUseWorkflow: trivial task → NO workflow (anti-pattern #1 avoided)", () => {
  const r = shouldUseWorkflow({ text: "fix a typo in the README" });
  assert.equal(r.useWorkflow, false);
  assert.match(r.reason, /trivial|quick|over-kill|single/i);
});
test("shouldUseWorkflow: no failure-mode signal → NO workflow", () => {
  assert.equal(shouldUseWorkflow({ text: "rename a single function" }).useWorkflow, false);
});
test("shouldUseWorkflow: untrusted input → YES (security, even if small)", () => {
  const r = shouldUseWorkflow({ text: "summarize this scraped public web page" });
  assert.equal(r.useWorkflow, true);
  assert.match(r.reason, /untrusted|quarantine|security/i);
});
test("shouldUseWorkflow: large enumerable task → YES", () => {
  assert.equal(shouldUseWorkflow({ text: "migrate all 120 callsites to the new API" }).useWorkflow, true);
});
test("shouldUseWorkflow: single-item verification → NO (a reviewer agent suffices)", () => {
  const r = shouldUseWorkflow({ text: "review this function", itemCount: 1 });
  assert.equal(r.useWorkflow, false);
});

// ── matchUseCase (step-11 matrix) ────────────────────────────────────────────
test("matchUseCase: maps known use cases to the right id", () => {
  assert.equal(matchUseCase("migrate the database layer to Postgres").id, "migration");
  assert.equal(matchUseCase("deep research on competitor pricing").id, "deep-research");
  assert.equal(matchUseCase("sort 1000 candidates by fit").id, "sorting");
  assert.equal(matchUseCase("triage the incoming bug reports").id, "triage");
  assert.equal(matchUseCase("root-cause this flaky test").id, "root-cause");
  assert.equal(matchUseCase("brainstorm product naming ideas").id, "exploration-taste");
});
test("matchUseCase: no match / empty → null", () => {
  assert.equal(matchUseCase("write a haiku"), null);
  assert.equal(matchUseCase(""), null);
  assert.equal(matchUseCase(undefined), null);
});

// ── selectPatterns ───────────────────────────────────────────────────────────
test("selectPatterns: migration composes fan-out → adversarial-verify → loop (Bun shape)", () => {
  const fm = detectFailureModes({ text: "migrate all 90 callsites and verify each fix until tests pass" });
  const p = selectPatterns(fm, { text: "migrate all 90 callsites and verify each fix until tests pass" });
  assert.deepEqual(p, [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY, PATTERNS.LOOP_UNTIL_DONE]);
});
test("selectPatterns: sorting → tournament only", () => {
  const p = selectPatterns([FAILURE_MODES.HARD_TO_SCORE], { text: "sort 1000 items by quality" });
  assert.ok(p.includes(PATTERNS.TOURNAMENT));
});
test("selectPatterns: heterogeneous task gets a leading classify-and-act", () => {
  const p = selectPatterns([FAILURE_MODES.GOAL_DRIFT], { text: "handle these mixed bag of different kinds of tasks", heterogeneous: true });
  assert.equal(p[0], PATTERNS.CLASSIFY_AND_ACT, "router runs first");
});
test("selectPatterns: off-matrix task falls back to failure-mode map + ordering", () => {
  const p = selectPatterns([FAILURE_MODES.SELF_PREFERENTIAL_BIAS, FAILURE_MODES.OPEN_ENDED], { text: "judge candidate answers until consensus" });
  // verify before loop in the natural data-flow order
  assert.ok(p.indexOf(PATTERNS.ADVERSARIAL_VERIFY) < p.indexOf(PATTERNS.LOOP_UNTIL_DONE));
});
test("selectPatterns: dedups when use-case + failure-map overlap", () => {
  const fm = detectFailureModes({ text: "deep research and verify every claim" });
  const p = selectPatterns(fm, { text: "deep research and verify every claim" });
  assert.equal(new Set(p).size, p.length, "no duplicate patterns");
});

// ── patternToStage ───────────────────────────────────────────────────────────
test("patternToStage: fan-out is a parallel barrier on cheap model", () => {
  const s = patternToStage(PATTERNS.FAN_OUT_SYNTHESIZE, {});
  assert.equal(s.kind, "parallel");
  assert.equal(s.barrier, true);
  assert.equal(s.model, MODEL.EXPLORE);
});
test("patternToStage: tournament is a streaming pipeline (no barrier)", () => {
  const s = patternToStage(PATTERNS.TOURNAMENT, {});
  assert.equal(s.kind, "pipeline");
  assert.equal(s.barrier, false);
});
test("patternToStage: adversarial-verify note enforces worker≠verifier", () => {
  const s = patternToStage(PATTERNS.ADVERSARIAL_VERIFY, {});
  assert.match(s.note, /SEPARATE|never the worker|self-preferential/i);
});
test("patternToStage: loop-until-done note pairs /goal", () => {
  assert.match(patternToStage(PATTERNS.LOOP_UNTIL_DONE, {}).note, /\/goal|stop condition/i);
});
test("patternToStage: task isolation override is honored", () => {
  assert.equal(patternToStage(PATTERNS.FAN_OUT_SYNTHESIZE, { isolation: "remote" }).isolation, "remote");
});

// ── planWorkflow (top-level integration) ─────────────────────────────────────
test("planWorkflow: trivial task → useWorkflow:false + single-session recommendation", () => {
  const plan = planWorkflow("fix a quick typo");
  assert.equal(plan.useWorkflow, false);
  assert.match(plan.recommendation, /normal Claude Code session|no workflow/i);
  assert.ok(plan.antiPatternsAvoided.includes(ANTI_PATTERNS[0]));
  assert.deepEqual(plan.stages, []);
});
test("planWorkflow: migration → fan-out→verify→loop, worktree, /goal, separate verifier", () => {
  const plan = planWorkflow("migrate all 120 callsites from Zig to Rust and verify each fix until the test suite passes");
  assert.equal(plan.useWorkflow, true);
  assert.equal(plan.useCase, "migration");
  assert.deepEqual(plan.patterns, [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY, PATTERNS.LOOP_UNTIL_DONE]);
  assert.equal(plan.verifierPairing.separate, true);
  assert.equal(plan.controls.goal.enabled, true, "loop pattern gates with /goal");
  const fanOut = plan.stages.find((s) => s.pattern === PATTERNS.FAN_OUT_SYNTHESIZE);
  assert.equal(fanOut.isolation, "worktree", "parallel file mutation needs worktree isolation");
});
test("planWorkflow: untrusted input → quarantine enabled + anti-pattern #6 avoided", () => {
  const plan = planWorkflow("triage incoming customer support tickets and either fix or escalate");
  assert.equal(plan.useWorkflow, true);
  assert.equal(plan.quarantine.enabled, true);
  assert.match(plan.quarantine.note, /read-only|never the raw|injection/i);
  assert.ok(plan.antiPatternsAvoided.includes("letting-untrusted-content-reach-the-actor"));
});
test("planWorkflow: sorting 1000 → tournament + anti-pattern #7 (no absolute scores)", () => {
  const plan = planWorkflow("sort these 1000 design candidates from best to worst");
  assert.ok(plan.patterns.includes(PATTERNS.TOURNAMENT));
  assert.ok(plan.antiPatternsAvoided.includes("sorting-with-absolute-scores"));
});
test("planWorkflow: recurring task → /loop control enabled", () => {
  const plan = planWorkflow("continuously triage incoming bug reports every night");
  assert.equal(plan.controls.loop.enabled, true);
});
test("planWorkflow: always sets an explicit token budget (anti-pattern #2 avoided)", () => {
  const plan = planWorkflow("research all competitor APIs and verify each claim");
  assert.ok(Number.isFinite(plan.controls.tokenBudget) && plan.controls.tokenBudget > 0);
  assert.ok(plan.controls.tokenBudget <= 50_000, "bounded so it can't balloon 5-10×");
  assert.ok(plan.antiPatternsAvoided.includes("no-token-budget"));
});
test("planWorkflow: caller token-budget override is honored", () => {
  const plan = planWorkflow("research all competitor APIs and verify each claim", { tokenBudget: 5_000 });
  assert.equal(plan.controls.tokenBudget, 5_000);
});
test("planWorkflow: every plan stage maps to a known Workflow-tool kind", () => {
  const plan = planWorkflow("root-cause this flaky test by generating theories and verifying each until one survives");
  const kinds = new Set(["agent", "parallel", "pipeline", "loop"]);
  for (const s of plan.stages) assert.ok(kinds.has(s.kind), `stage kind ${s.kind} is executable`);
  // root-cause composes generate-and-filter + adversarial-verify + loop
  assert.ok(plan.patterns.includes(PATTERNS.LOOP_UNTIL_DONE));
  assert.ok(plan.patterns.includes(PATTERNS.ADVERSARIAL_VERIFY));
});
test("planWorkflow: string input and object input are equivalent", () => {
  const a = planWorkflow("migrate all 50 callsites and verify each");
  const b = planWorkflow({ text: "migrate all 50 callsites and verify each" });
  assert.deepEqual(a.patterns, b.patterns);
  assert.equal(a.useWorkflow, b.useWorkflow);
});
test("planWorkflow: accepts empty/garbage without throwing (fail-soft)", () => {
  assert.doesNotThrow(() => planWorkflow(""));
  assert.doesNotThrow(() => planWorkflow({}));
  assert.equal(planWorkflow("").useWorkflow, false);
});

// ── emitWorkflowScript (harness codegen — the "Claude writes the harness" half) ─
test("emitWorkflowScript: throws on a non-workflow plan (must gate first)", () => {
  const plan = planWorkflow("fix a quick typo");
  assert.equal(plan.useWorkflow, false);
  assert.throws(() => emitWorkflowScript(plan), /useWorkflow is false/);
  assert.throws(() => emitWorkflowScript(null), /plan object is required/);
});
test("emitWorkflowScript: migration plan emits meta + fan-out parallel + opus synth + verify + loop", () => {
  const src = emitWorkflowScript(planWorkflow("migrate all 120 callsites and verify each fix until tests pass"));
  assert.match(src, /export const meta = \{/);
  assert.match(src, /phases: \[/);
  assert.match(src, /phase\('Fan-out'\)/);
  assert.match(src, /await parallel\(/);
  assert.match(src, /model: 'opus'/, "synthesize stage uses opus");
  assert.match(src, /phase\('Verify'\)/);
  assert.match(src, /while \(dryRounds < 2\)/, "loop-until-done uses a dry-round stop, not a fixed count");
});
test("emitWorkflowScript: untrusted plan prepends a read-only quarantine reader", () => {
  const src = emitWorkflowScript(planWorkflow("triage incoming support tickets and fix or escalate"));
  assert.match(src, /phase\('Quarantine'\)/);
  assert.match(src, /Take no other action|read-only|sanitized/i);
});
test("emitWorkflowScript: sorting plan emits a code-owned pairwise tournament bracket", () => {
  const src = emitWorkflowScript(planWorkflow("sort these 1000 design candidates from best to worst"));
  assert.match(src, /while \(bracket\.length > 1\)/);
  assert.match(src, /winner/i);
});
test("emitWorkflowScript: emitted harness is SYNTACTICALLY VALID in the Workflow async context (node --check)", () => {
  const src = emitWorkflowScript(planWorkflow("research all competitor APIs and verify each claim, keep going until complete"));
  // The PRISM Workflow tool runs the script body in an async context (top-level
  // await + a final `return` are legal there) and treats `export const meta` as a
  // module export. Validate the harness the SAME way: drop the `export`, wrap the
  // whole thing in an async function, then node --check. (Checking the raw file as
  // a bare ESM module would wrongly reject the intentional top-level return.)
  const checkable = "async function _wf(){\n" + src.replace(/^export\s+/m, "") + "\n}\n";
  const dir = mkdtempSync(join(tmpdir(), "hwp-emit-"));
  const file = join(dir, "emitted-wrapped.mjs");
  try {
    writeFileSync(file, checkable);
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(r.status, 0, `emitted harness must parse in the async context; node --check stderr:\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("emitWorkflowScript: meta.name derives from the use case; budget comment present", () => {
  const src = emitWorkflowScript(planWorkflow("migrate all 60 callsites and verify each"));
  assert.match(src, /name: 'hermes-migration'/);
  assert.match(src, /Token budget .* tokens/);
});
